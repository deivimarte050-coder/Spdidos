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
  if (!('Notification' in window)) return null;
  if (!('serviceWorker' in navigator)) return null;
  if (!VAPID_KEY) {
    console.warn('[FCM] VITE_VAPID_KEY not set — push notifications disabled');
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    // Reuse the existing sw.js registration (already handles FCM compat)
    const swReg = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;

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
