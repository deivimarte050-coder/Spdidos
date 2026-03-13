import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin once
if (!admin.apps.length) {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (serviceAccount) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(serviceAccount)),
      });
    } catch {
      admin.initializeApp();
    }
  } else {
    admin.initializeApp();
  }
}

const db = admin.firestore();
const messaging = admin.messaging();

// ─── helpers ────────────────────────────────────────────────────────────────

async function getTokens(
  role: string,
  filters: Record<string, string> = {}
): Promise<string[]> {
  let q: admin.firestore.Query = db.collection('fcm_tokens').where('role', '==', role);
  for (const [k, v] of Object.entries(filters)) {
    q = q.where(k, '==', v);
  }
  const snap = await q.get();
  return Array.from(
    new Set(
      snap.docs
        .map((d) => (d.data() as any).token as string)
        .filter(Boolean)
    )
  );
}

async function sendTo(tokens: string[], title: string, body: string, tag: string) {
  if (!tokens.length) return;
  const response = await messaging.sendEachForMulticast({
    tokens,
    notification: { title, body },
    android: {
      priority: 'high' as const,
      ttl: 2419200000,
      notification: { channelId: 'spdidos_high', sound: 'default' },
    },
    apns: {
      headers: { 'apns-priority': '10' },
      payload: { aps: { sound: 'default', badge: 1, contentAvailable: true } },
    },
    webpush: {
      headers: { Urgency: 'high', TTL: '2419200' },
      notification: {
        title,
        body,
        icon: '/logo_high_resolution.png',
        badge: '/logo_high_resolution.png',
        requireInteraction: true,
        vibrate: [300, 100, 300, 100, 300],
        silent: false,
        tag,
      } as any,
      fcmOptions: { link: '/' },
    },
    data: { tag, title, body, url: '/', link: '/' },
  });

  // Clean up invalid tokens
  const invalidTokens = response.responses
    .map((r, i) => ({ r, token: tokens[i] }))
    .filter(
      ({ r }) =>
        !r.success &&
        (r.error?.code === 'messaging/registration-token-not-registered' ||
          r.error?.code === 'messaging/invalid-registration-token')
    )
    .map(({ token }) => token);

  if (!invalidTokens.length) return;

  const batch = db.batch();
  const tokenSnapshots = await Promise.all(
    invalidTokens.map((token) =>
      db.collection('fcm_tokens').where('token', '==', token).get()
    )
  );
  tokenSnapshots.forEach((tokenSnap) => {
    tokenSnap.docs.forEach((d) => batch.delete(d.ref));
  });
  await batch.commit();
}

// ─── status → notification mapping ──────────────────────────────────────────

const clientStatusMessages: Record<string, { title: string; body: (bName: string) => string; tag: string }> = {
  pending: {
    title: 'Pedido recibido ✅',
    body: (bName) => `${bName} recibió tu pedido.`,
    tag: 'client-order-received',
  },
  accepted: {
    title: 'Pedido aceptado ✅',
    body: (bName) => `${bName} aceptó tu pedido.`,
    tag: 'client-accepted',
  },
  preparing: {
    title: 'Pedido en preparación 🍳',
    body: (bName) => `${bName} está preparando tu pedido.`,
    tag: 'client-preparing',
  },
  picked_up: {
    title: 'Pedido en camino 🛵',
    body: () => 'Tu repartidor ya recogió el pedido y va hacia ti.',
    tag: 'client-on-the-way',
  },
  on_the_way: {
    title: 'Pedido en camino 🛵',
    body: () => 'Tu repartidor va hacia tu dirección.',
    tag: 'client-on-the-way',
  },
  arrived: {
    title: '¡Tu repartidor llegó! 🛵',
    body: () => 'Está en tu puerta esperando — abre la app para confirmar',
    tag: 'arrived',
  },
  delivered: {
    title: 'Pedido entregado 🎉',
    body: () => 'Tu pedido fue entregado. ¡Buen provecho!',
    tag: 'client-delivered',
  },
};

// ─── main handler ───────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      type,
      orderId,
      status,
      clientId,
      clientName,
      businessId,
      businessName,
      total,
    } = req.body || {};

    if (!type) {
      return res.status(400).json({ error: 'Missing type' });
    }

    const bName = String(businessName || 'El negocio');
    const cName = String(clientName || 'Cliente');
    const orderTotal = `RD$ ${Number(total ?? 0).toFixed(0)}`;

    // ── NEW ORDER: notify business + delivery + client simultaneously ──
    if (type === 'new_order') {
      const [businessTokens, deliveryTokens, clientTokens] = await Promise.all([
        businessId ? getTokens('business', { businessId }) : Promise.resolve([]),
        getTokens('delivery'),
        clientId ? getTokens('client', { userId: clientId }) : Promise.resolve([]),
      ]);

      await Promise.all([
        sendTo(businessTokens, '¡Nuevo Pedido! 🔔', `${cName} — ${orderTotal}`, 'new-order'),
        sendTo(deliveryTokens, '¡Nuevo Pedido Disponible! 🛵', `${bName} · ${orderTotal}`, 'new-order-delivery'),
        sendTo(clientTokens, 'Pedido recibido ✅', `${bName} recibió tu pedido.`, 'client-order-received'),
      ]);

      return res.status(200).json({ ok: true, sent: 'new_order' });
    }

    // ── STATUS UPDATE: notify client (+ delivery if ready) ──
    if (type === 'status_update') {
      const s = String(status || '');

      // Pedido listo → avisar repartidores
      if (s === 'ready') {
        const tokens = await getTokens('delivery');
        await sendTo(tokens, '¡Pedido disponible! 📦', 'Hay un nuevo pedido listo para recoger', 'ready-order');
        return res.status(200).json({ ok: true, sent: 'ready' });
      }

      // Notify client about status change
      const msg = clientStatusMessages[s];
      if (msg && clientId) {
        const tokens = await getTokens('client', { userId: clientId });
        await sendTo(tokens, msg.title, msg.body(bName), msg.tag);
        return res.status(200).json({ ok: true, sent: s });
      }

      return res.status(200).json({ ok: true, sent: 'no_match' });
    }

    return res.status(400).json({ error: 'Unknown type' });
  } catch (error: any) {
    console.error('[api/notify] Error:', error);
    return res.status(500).json({ error: error?.message || 'Internal error' });
  }
}
