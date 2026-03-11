// Spdidos Service Worker — handles push notifications and background messages
// Must be at root scope so Firebase Messaging can use it

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

const messaging = firebase.messaging();

// FCM background messages (received when browser is in background / phone locked)
messaging.onBackgroundMessage((payload) => {
  const notif = payload.notification || {};
  self.registration.showNotification(notif.title || 'Spdidos', {
    body:    notif.body  || '',
    icon:    notif.icon  || '/logo_high_resolution.png',
    badge:                  '/logo_high_resolution.png',
    vibrate: [300, 100, 300, 100, 300],
    requireInteraction: true,
    tag: payload.data?.tag || 'spdidos-fcm',
  });
});

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
  const { title, body, tag, icon } = event.data;
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag:  tag  || 'spdidos',
      icon: icon || '/logo_high_resolution.png',
      badge:       '/logo_high_resolution.png',
      vibrate: [300, 100, 300, 100, 300],
      requireInteraction: true,
      silent: false,
    })
  );
});

// Handle incoming FCM push messages (future support)
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let data = {};
  try { data = event.data.json(); } catch { data = { title: 'Spdidos', body: event.data.text() }; }
  event.waitUntil(
    self.registration.showNotification(data.title || 'Spdidos', {
      body:    data.body    || '',
      icon:    data.icon    || '/logo_high_resolution.png',
      badge:                  '/logo_high_resolution.png',
      tag:     data.tag     || 'spdidos-push',
      vibrate: [300, 100, 300, 100, 300],
      requireInteraction: true,
    })
  );
});

// Clicking the notification opens / focuses the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      const existing = clients.find(c => c.url.includes(self.location.origin) && 'focus' in c);
      if (existing) return existing.focus();
      return self.clients.openWindow(self.location.origin);
    })
  );
});
