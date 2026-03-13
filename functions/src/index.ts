import * as admin from 'firebase-admin';
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { onRequest } from 'firebase-functions/v2/https';

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
        title,
        body,
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

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const resolveValidUrl = (value: string, fallback: string) => {
  try {
    const parsed = new URL(value);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return parsed.toString();
  } catch {
    // ignore malformed URLs
  }
  return fallback;
};

// ─── Share preview (OG/Twitter cards) ────────────────────────────────────────
export const sharePreview = onRequest(async (req, res) => {
  const safeFallbackUrl = 'https://spdidos.vercel.app/';
  const appBase = process.env['SHARE_APP_BASE_URL'] || safeFallbackUrl;
  const shortType = String(req.query.t || '').toLowerCase();
  const shortBusinessId = String(req.query.b || '').trim();
  const shortItemId = String(req.query.m || '').trim();
  const shortAppBase = String(req.query.u || '').trim();

  const inferredType = shortType === 'r'
    ? 'restaurant'
    : shortType === 'i'
      ? 'item'
      : String(req.query.type || 'app').toLowerCase();

  const inferredBusinessId = shortBusinessId || String(req.query.business || '').trim();
  const inferredItemId = shortItemId || String(req.query.item || '').trim();
  const rawUrl = String(req.query.url || '').trim();
  const resolvedAppBase = resolveValidUrl(shortAppBase || appBase, safeFallbackUrl);

  const defaultAppUrl = (() => {
    const params = new URLSearchParams();
    if (inferredType === 'restaurant' && inferredBusinessId) {
      params.set('share', 'restaurant');
      params.set('business', inferredBusinessId);
    } else if (inferredType === 'item' && inferredBusinessId && inferredItemId) {
      params.set('share', 'item');
      params.set('business', inferredBusinessId);
      params.set('item', inferredItemId);
    }
    return params.toString() ? `${resolvedAppBase}?${params.toString()}` : resolvedAppBase;
  })();

  const targetUrl = resolveValidUrl(rawUrl || defaultAppUrl, safeFallbackUrl);
  const appOrigin = (() => {
    try {
      return new URL(targetUrl).origin;
    } catch {
      return safeFallbackUrl;
    }
  })();
  const appImage = `${appOrigin}/logo_high_resolution.png`;

  const type = inferredType;
  const businessId = inferredBusinessId;
  const itemId = inferredItemId;
  const queryImage = String(req.query.img || '').trim();

  let title = 'Spdidos - Delivery & Mandados';
  let description = 'Pide comida y mandados en minutos con Spdidos.';
  let image = queryImage || appImage;

  if ((type === 'restaurant' || type === 'item') && businessId) {
    try {
      const businessSnap = await db.collection('businesses').doc(businessId).get();
      const business = businessSnap.exists ? businessSnap.data() as Record<string, any> : null;

      if (business) {
        const businessName = String(business.name || 'Negocio');
        const businessImage = String(business.image || '').trim();
        if (!image && businessImage) image = businessImage;

        if (type === 'restaurant') {
          title = `${businessName} en Spdidos`;
          description = `Mira el menú de ${businessName} y ordena en Spdidos.`;
          image = queryImage || businessImage || appImage;
        }

        if (type === 'item') {
          const menu = Array.isArray(business.menu) ? business.menu : [];
          const item = menu.find((menuItem: any) => String(menuItem?.id || '') === itemId);
          const itemName = String(item?.name || 'Artículo del menú');
          const itemDescription = String(item?.description || '').trim();
          const itemImage = String(item?.image || '').trim();
          title = `${itemName} · ${businessName}`;
          description = itemDescription || `Mira ${itemName} en el menú de ${businessName}.`;
          image = queryImage || itemImage || businessImage || appImage;
        }
      }
    } catch {
      image = queryImage || appImage;
    }
  }

  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description);
  const safeImage = escapeHtml(resolveValidUrl(image, appImage));
  const safeTargetUrl = escapeHtml(targetUrl);

  res.set('Content-Type', 'text/html; charset=utf-8');
  res.set('Cache-Control', 'public, max-age=300, s-maxage=600');
  res.status(200).send(`<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${safeTitle}</title>
    <meta name="description" content="${safeDescription}" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${safeTitle}" />
    <meta property="og:description" content="${safeDescription}" />
    <meta property="og:image" content="${safeImage}" />
    <meta property="og:url" content="${safeTargetUrl}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${safeTitle}" />
    <meta name="twitter:description" content="${safeDescription}" />
    <meta name="twitter:image" content="${safeImage}" />
    <meta http-equiv="refresh" content="0;url=${safeTargetUrl}" />
    <script>window.location.replace(${JSON.stringify(targetUrl)});</script>
  </head>
  <body></body>
</html>`);
});

// ─── Trigger 1: new order → notify business + delivery ───────────────────────
export const onNewOrder = onDocumentCreated('orders/{orderId}', async (event) => {
  const order = event.data?.data() as Record<string, any> | undefined;
  if (!order || order['status'] !== 'pending') return;

  const clientId = String(order['clientId'] || '');
  const [businessTokens, deliveryTokens, clientTokens] = await Promise.all([
    getTokens('business', { businessId: order['businessId'] }),
    getTokens('delivery'),
    clientId ? getTokens('client', { userId: clientId }) : Promise.resolve([]),
  ]);

  await sendTo(
    businessTokens,
    '¡Nuevo Pedido! 🔔',
    `${order['clientName']} — RD$ ${Number(order['total'] ?? 0).toFixed(0)}`,
    'new-order'
  );

  await sendTo(
    deliveryTokens,
    '¡Nuevo Pedido Disponible! 🛵',
    `${String(order['businessName'] || 'Negocio')} · RD$ ${Number(order['total'] ?? 0).toFixed(0)}`,
    'new-order-delivery'
  );

  await sendTo(
    clientTokens,
    'Pedido recibido ✅',
    `${String(order['businessName'] || 'El negocio')} recibió tu pedido.`,
    'client-order-received'
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
