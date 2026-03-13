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

  if (!('Notification' in window) || Notification.permission !== 'granted') return null;

  try {
    // vapidKey is optional — Firebase uses its default key when omitted
    const tokenOptions: Parameters<typeof getToken>[1] = {
      serviceWorkerRegistration: swReg,
    };
    if (VAPID_KEY) tokenOptions.vapidKey = VAPID_KEY;

    const token = await getToken(getMsg(), tokenOptions);
    return token || null;
  } catch (err) {
    console.error('[FCM] Error getting token:', err);
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
