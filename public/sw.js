// Spdidos Service Worker — handles push notifications and background messages
const CACHE = 'spdidos-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

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
