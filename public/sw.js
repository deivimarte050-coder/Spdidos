// Spdidos Service Worker — handles push notifications and background messages
// Must be at root scope so Firebase Messaging can use it

let messaging = null;
const DEFAULT_ICON = '/logo_high_resolution.png';
const DEFAULT_URL = '/';

try {
  importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js');

  firebase.initializeApp({
    apiKey: "AIzaSyA0d21nelkgyJ0DGtlEdmzLG6AgMgD8GmE",
    authDomain: "spdidos-8edda.firebaseapp.com",
    projectId: "spdidos-8edda",
    storageBucket: "spdidos-8edda.appspot.com",
    messagingSenderId: "573150906777",
    appId: "1:573150906777:web:0ac9b6294842a031736b08"
  });

  messaging = firebase.messaging();
} catch (error) {
  // Keep SW functional for PWA installability even if Firebase scripts fail.
  messaging = null;
}

function showNotificationFromPayload(input = {}) {
  const notif = input.notification || input;
  const data = input.data || {};
  const title = notif.title || data.title || 'Spdidos';
  const body = notif.body || data.body || '';
  const icon = notif.icon || data.icon || DEFAULT_ICON;
  const tag = data.tag || notif.tag || 'spdidos-fcm';
  const url = data.link || data.url || DEFAULT_URL;

  return self.registration.showNotification(title, {
    body,
    icon,
    badge: DEFAULT_ICON,
    vibrate: [300, 100, 300, 100, 300],
    requireInteraction: true,
    silent: false,
    tag,
    data: { url },
  });
}

// FCM background messages (received when browser is in background / phone locked)
if (messaging) {
  messaging.onBackgroundMessage((payload) => {
    showNotificationFromPayload(payload);
  });
}

const CACHE = 'spdidos-v2';
const PRECACHE_URLS = ['/', '/manifest.json', '/logo_high_resolution.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE_URLS)).catch(() => undefined)
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

// Basic fetch handling improves installability signals and gives offline fallback for app shell.
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put('/', copy)).catch(() => undefined);
          return response;
        })
        .catch(() => caches.match('/') || caches.match(request))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (!response || response.status !== 200) return response;
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => undefined);
          return response;
        })
        .catch(() => cached);
    })
  );
});

// Receive notification requests from the main thread
self.addEventListener('message', (event) => {
  if (!event.data || event.data.type !== 'SHOW_NOTIFICATION') return;
  const { title, body, tag, icon, url } = event.data;
  event.waitUntil(
    showNotificationFromPayload({
      title,
      body,
      tag,
      icon,
      data: { url },
    })
  );
});

// Clicking the notification opens / focuses the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url || self.location.origin || DEFAULT_URL;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      const existing = clients.find(c => c.url.includes(self.location.origin) && 'focus' in c);
      if (existing) {
        existing.focus();
        if ('navigate' in existing) return existing.navigate(targetUrl);
        return existing;
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});
