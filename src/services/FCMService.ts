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
  if (!('serviceWorker' in navigator)) return null;

  // Always register the SW — required for showPushNotification to work
  // (background / minimized notifications don't need VAPID key)
  const swReg = await navigator.serviceWorker.register('/sw.js').catch(() => null);
  if (!swReg) return null;

  // Wait for the SW to be active
  await navigator.serviceWorker.ready.catch(() => null);

  // Request notification permission
  if ('Notification' in window && Notification.permission === 'default') {
    await Notification.requestPermission().catch(() => {});
  }

  // FCM token (for push when browser is fully closed) requires VAPID key
  if (!VAPID_KEY) {
    console.warn('[FCM] VITE_VAPID_KEY not set — SW registered, FCM push disabled');
    return null;
  }
  if (!('Notification' in window) || Notification.permission !== 'granted') return null;

  try {
    const token = await getToken(getMsg(), {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swReg,
    });
    return token || null;
  } catch (err) {
    console.error('[FCM] Error getting token:', err);
    return null;
  }
}

// Handle foreground messages (app is open) — show browser notification manually
export function listenFCMForeground() {
  try {
    onMessage(getMsg(), (payload) => {
      const notif = payload.notification;
      if (!notif) return;
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(reg => {
          reg.active?.postMessage({
            type: 'SHOW_NOTIFICATION',
            title: notif.title || 'Spdidos',
            body:  notif.body  || '',
            tag:   (payload.data?.tag as string) || 'spdidos-fg',
          });
        });
      }
    });
  } catch { /* messaging not available in this context */ }
}
