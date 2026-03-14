import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { app } from '../firebase/config';

// VAPID key from Firebase Console → Project Settings → Cloud Messaging → Web Push certificates
// Add this to your .env file as VITE_VAPID_KEY=<your_key>
const VAPID_KEY = import.meta.env.VITE_VAPID_KEY as string | undefined;

let messaging: ReturnType<typeof getMessaging> | null = null;

function getMsg() {
  if (!messaging) messaging = getMessaging(app);
  return messaging;
}

export async function initFCMToken(): Promise<string | null> {
  console.log('[FCM] Inicializando token FCM...');
  
  if (!('serviceWorker' in navigator)) {
    console.warn('[FCM] Service Worker no soportado');
    return null;
  }

  // Always register the SW — required for showPushNotification to work
  console.log('[FCM] Registrando Service Worker...');
  const swReg = await navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((err) => {
    console.error('[FCM] Error registrando SW:', err);
    return null;
  });
  if (!swReg) {
    console.error('[FCM] No se pudo registrar Service Worker');
    return null;
  }
  await swReg.update().catch(() => {});
  console.log('[FCM] Service Worker registrado correctamente');

  // Wait for the SW to be active
  await navigator.serviceWorker.ready.catch((err) => {
    console.error('[FCM] Error esperando SW ready:', err);
    return null;
  });
  console.log('[FCM] Service Worker ready');

  // Request notification permission
  if ('Notification' in window && Notification.permission === 'default') {
    console.log('[FCM] Solicitando permiso de notificaciones...');
    const permission = await Notification.requestPermission().catch((err) => {
      console.error('[FCM] Error solicitando permiso:', err);
      return 'denied';
    });
    console.log('[FCM] Permiso de notificaciones:', permission);
  }

  if (!('Notification' in window)) {
    console.error('[FCM] Notification API no soportada');
    return null;
  }
  
  if (Notification.permission !== 'granted') {
    console.warn('[FCM] Permiso de notificaciones no concedido:', Notification.permission);
    return null;
  }

  console.log('[FCM] Permiso de notificaciones concedido');

  const baseOptions: Parameters<typeof getToken>[1] = {
    serviceWorkerRegistration: swReg,
  };

  // Try without VAPID first (more reliable)
  try {
    console.log('[FCM] Intentando obtener token sin VAPID...');
    const token = await getToken(getMsg(), baseOptions);
    console.log('[FCM] Token obtenido sin VAPID:', token ? 'SUCCESS' : 'NULL');
    if (token) return token;
  } catch (err) {
    console.error('[FCM] Error getting token (fallback):', err);
  }

  // Try with VAPID if available
  if (VAPID_KEY) {
    console.log('[FCM] Usando VAPID key para token');
    try {
      const token = await getToken(getMsg(), { ...baseOptions, vapidKey: VAPID_KEY });
      console.log('[FCM] Token obtenido con VAPID:', token ? 'SUCCESS' : 'NULL');
      return token || null;
    } catch (err) {
      console.error('[FCM] Error getting token with VAPID key:', err);
    }
  } else {
    console.warn('[FCM] VITE_VAPID_KEY no está configurada. Revisa variables de entorno en Vercel/local.');
  }

  console.warn('[FCM] No se pudo obtener token FCM');
  return null;
}

// Handle foreground messages (app is open) — show browser notification manually
export function listenFCMForeground(
  onForegroundNotification?: (notification: { title: string; body: string; tag: string }) => void
) {
  try {
    return onMessage(getMsg(), (payload) => {
      const notif = payload.notification || {};
      const title = notif.title || (payload.data?.title as string) || 'Spdidos';
      const body = notif.body || (payload.data?.body as string) || '';
      const tag = (payload.data?.tag as string) || 'spdidos-fg';
      onForegroundNotification?.({ title, body, tag });
    });
  } catch {
    // messaging not available in this context
    return () => {};
  }
}
