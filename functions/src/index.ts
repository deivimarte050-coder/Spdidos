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
  return Array.from(new Set(snap.docs
    .map(d => (d.data() as any).token as string)
    .filter(Boolean)));
}

async function sendTo(tokens: string[], title: string, body: string, tag: string) {
  if (!tokens.length) return;
  const response = await messaging.sendEachForMulticast({
    tokens,
    notification: { title, body },
    android: {
      priority: 'high',
      ttl: 2419200000,
      notification: { channelId: 'spdidos_high', sound: 'default' },
    },
    apns: {
      headers: { 'apns-priority': '10' },
      payload: { aps: { sound: 'default', badge: 1, contentAvailable: true } },
    },
    webpush: {
      headers: {
        Urgency: 'high',
        TTL: '2419200',
      },
      notification: {
        icon:              '/logo_high_resolution.png',
        badge:             '/logo_high_resolution.png',
        requireInteraction: true,
        vibrate:           [300, 100, 300, 100, 300],
        silent:            false,
        tag,
      },
      fcmOptions: { link: '/' },
    },
    data: {
      tag,
      title,
      body,
      url: '/',
      link: '/',
    },
  });

  const invalidTokens = response.responses
    .map((r, i) => ({ r, token: tokens[i] }))
    .filter(({ r }) => !r.success && (
      r.error?.code === 'messaging/registration-token-not-registered'
      || r.error?.code === 'messaging/invalid-registration-token'
    ))
    .map(({ token }) => token);

  if (!invalidTokens.length) return;

  const batch = db.batch();
  for (const token of invalidTokens) {
    const tokenSnap = await db.collection('fcm_tokens').where('token', '==', token).get();
    tokenSnap.docs.forEach((d) => batch.delete(d.ref));
  }
  await batch.commit();
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

  const status = String(after['status'] || '');
  const clientId = String(after['clientId'] || '');

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

  const clientStatusMessages: Record<string, { title: string; body: string; tag: string }> = {
    accepted: {
      title: 'Pedido aceptado ✅',
      body: `${String(after['businessName'] || 'El negocio')} aceptó tu pedido.`,
      tag: 'client-accepted',
    },
    preparing: {
      title: 'Pedido en preparación 🍳',
      body: `${String(after['businessName'] || 'El negocio')} está preparando tu pedido.`,
      tag: 'client-preparing',
    },
    picked_up: {
      title: 'Pedido en camino 🛵',
      body: 'Tu repartidor ya recogió el pedido y va hacia ti.',
      tag: 'client-on-the-way',
    },
    on_the_way: {
      title: 'Pedido en camino 🛵',
      body: 'Tu repartidor va hacia tu dirección.',
      tag: 'client-on-the-way',
    },
    arrived: {
      title: '¡Tu repartidor llegó! 🛵',
      body: 'Está en tu puerta esperando — abre la app para confirmar',
      tag: 'arrived',
    },
    delivered: {
      title: 'Pedido entregado 🎉',
      body: 'Tu pedido fue entregado. ¡Buen provecho!',
      tag: 'client-delivered',
    },
  };

  if (!clientId || !clientStatusMessages[status]) return;

  const tokens = await getTokens('client', { userId: clientId });
  const message = clientStatusMessages[status];
  await sendTo(
    tokens,
    message.title,
    message.body,
    message.tag
  );
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
