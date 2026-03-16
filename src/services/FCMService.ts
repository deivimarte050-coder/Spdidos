import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { app } from '../firebase/config';

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
  let swReg: ServiceWorkerRegistration | null = null;
  try {
    swReg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    await swReg.update().catch(() => {});
    console.log('[FCM] Service Worker registrado correctamente');
  } catch (err) {
    console.error('[FCM] Error registrando SW:', err);
    return null;
  }

  // Wait for SW to be ready
  try {
    await navigator.serviceWorker.ready;
    console.log('[FCM] Service Worker ready');
  } catch (err) {
    console.error('[FCM] Error esperando SW ready:', err);
    return null;
  }

  // Check notification permission — but don't fail if denied
  if (!('Notification' in window)) {
    console.error('[FCM] Notification API no soportada');
    return null;
  }

  // If permission is default, ask for it (but don't fail if denied)
  if (Notification.permission === 'default') {
    console.log('[FCM] Solicitando permiso de notificaciones...');
    try {
      const permission = await Notification.requestPermission();
      console.log('[FCM] Permiso de notificaciones:', permission);
      // Continue even if denied - FCM still works with foreground messages
    } catch (err) {
      console.warn('[FCM] Error solicitando permiso:', err);
    }
  }

  // Try to get token regardless of permission status
  // Some browsers allow token generation without full notification permission
  if (Notification.permission === 'denied') {
    console.warn('[FCM] ⚠️ Notificaciones denegadas por el usuario. La app funcionará sin notificaciones push.');
    // Still try to get token for foreground notifications
  }

  if (!swReg) return null;

  try {
    console.log('[FCM] Intentando obtener token FCM...');
    const baseOptions: Parameters<typeof getToken>[1] = {
      serviceWorkerRegistration: swReg,
    };

    // Try without VAPID (works in most modern browsers for foreground messages)
    try {
      const token = await getToken(getMsg(), baseOptions);
      if (token) {
        console.log('[FCM] ✅ Token FCM obtenido exitosamente');
        return token;
      }
    } catch (errNoVapid) {
      console.log('[FCM] Token sin VAPID no disponible, intentando con VAPID...');
    }

    // Try with VAPID if available
    if (VAPID_KEY) {
      try {
        const token = await getToken(getMsg(), { ...baseOptions, vapidKey: VAPID_KEY });
        if (token) {
          console.log('[FCM] ✅ Token FCM obtenido con VAPID');
          return token;
        }
      } catch (errVapid) {
        console.warn('[FCM] No se pudo obtener token con VAPID:', errVapid);
      }
    } else {
      console.warn('[FCM] ⚠️ VITE_VAPID_KEY no configurada. Las notificaciones en background no funcionarán.');
      console.warn('[FCM] Para configurarla: Firebase Console → Configuración → Cloud Messaging → Web Push');
    }

    console.warn('[FCM] No se pudo obtener token FCM, pero la app funcionará con notificaciones en foreground');
    return null;
  } catch (err) {
    console.error('[FCM] Error inesperado obteniendo token:', err);
    return null;
  }
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
