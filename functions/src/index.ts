import * as admin from 'firebase-admin';
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';

admin.initializeApp();

const db        = admin.firestore();
const messaging = admin.messaging();

// ─── helpers ──────────────────────────────────────────────────────────────────

async function getTokens(
  role: string,
  filters: Record<string, string> = {}
): Promise<string[]> {
  let q = db.collection('fcm_tokens').where('role', '==', role);
  for (const [k, v] of Object.entries(filters)) {
    q = q.where(k, '==', v) as any;
  }
  const snap = await q.get();
  return snap.docs
    .map(d => (d.data() as any).token as string)
    .filter(Boolean);
}

async function sendTo(tokens: string[], title: string, body: string, tag: string) {
  if (!tokens.length) return;
  await messaging.sendEachForMulticast({
    tokens,
    notification: { title, body },
    android: {
      priority: 'high',
      notification: { channelId: 'spdidos_high', sound: 'default' },
    },
    apns: {
      payload: { aps: { sound: 'default', badge: 1, contentAvailable: true } },
    },
    webpush: {
      notification: {
        icon:              '/logo_high_resolution.png',
        badge:             '/logo_high_resolution.png',
        requireInteraction: true,
        vibrate:           [300, 100, 300, 100, 300],
        tag,
      },
      fcmOptions: { link: '/' },
    },
    data: { tag },
  });
}

// ─── Trigger 1: new order → notify business ───────────────────────────────────
export const onNewOrder = onDocumentCreated('orders/{orderId}', async (event) => {
  const order = event.data?.data() as Record<string, any> | undefined;
  if (!order || order['status'] !== 'pending') return;

  const tokens = await getTokens('business', { businessId: order['businessId'] });
  await sendTo(
    tokens,
    '¡Nuevo Pedido! 🔔',
    `${order['clientName']} — RD$ ${Number(order['total'] ?? 0).toFixed(0)}`,
    'new-order'
  );
});

// ─── Trigger 2: status changes → notify relevant users ───────────────────────
export const onOrderUpdate = onDocumentUpdated('orders/{orderId}', async (event) => {
  const before = event.data?.before.data() as Record<string, any> | undefined;
  const after  = event.data?.after.data()  as Record<string, any> | undefined;
  if (!before || !after) return;
  if (before['status'] === after['status']) return;

  // Pedido listo → avisar a todos los repartidores disponibles
  if (after['status'] === 'ready') {
    const tokens = await getTokens('delivery');
    await sendTo(
      tokens,
      '¡Pedido disponible! 📦',
      'Hay un nuevo pedido listo para recoger',
      'ready-order'
    );
    return;
  }

  // Repartidor llegó → avisar al cliente
  if (after['status'] === 'arrived') {
    const tokens = await getTokens('client', { userId: after['clientId'] });
    await sendTo(
      tokens,
      '¡Tu repartidor llegó! 🛵',
      'Está en tu puerta esperando — abre la app para confirmar',
      'arrived'
    );
    return;
  }
});

// ─── Trigger 3: admin broadcast notifications ───────────────────────────────
export const onAdminNotificationCreated = onDocumentCreated('admin_notifications/{notificationId}', async (event) => {
  const payload = event.data?.data() as Record<string, any> | undefined;
  if (!payload) return;

  const title = String(payload['title'] || 'Spdidos');
  const body = String(payload['body'] || '').trim();
  const target = String(payload['target'] || 'both');
  if (!body) return;

  const tokenGroups: string[][] = [];
  if (target === 'clients' || target === 'both' || target === 'all') {
    tokenGroups.push(await getTokens('client'));
  }
  if (target === 'businesses' || target === 'both' || target === 'all') {
    tokenGroups.push(await getTokens('business'));
  }
  if (target === 'delivery' || target === 'all') {
    tokenGroups.push(await getTokens('delivery'));
  }

  const tokens = Array.from(new Set(tokenGroups.flat().filter(Boolean)));
  const statusRef = event.data?.ref;

  if (!tokens.length) {
    if (statusRef) {
      await statusRef.set({
        status: 'no_tokens',
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        sentCount: 0,
      }, { merge: true });
    }
    return;
  }

  try {
    await sendTo(tokens, title, body, `admin-${target}`);
    if (statusRef) {
      await statusRef.set({
        status: 'sent',
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        sentCount: tokens.length,
      }, { merge: true });
    }
  } catch (error: any) {
    if (statusRef) {
      await statusRef.set({
        status: 'error',
        errorMessage: error?.message || 'unknown_error',
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    }
    throw error;
  }
});
