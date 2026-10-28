// public/sw.js - Thin Service Worker for YHD PWA POC
const OFFLINE_CACHE_NAME = 'yhd-offline-v1';
const OFFLINE_URL = '/offline.html';

// 1. Install Phase: Cache ONLY the static offline fallback shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(OFFLINE_CACHE_NAME).then((cache) => {
      return cache.addAll([
        OFFLINE_URL,
        '/icons/icon-192.png'
      ]);
    })
  );
  self.skipWaiting();
});

// 2. Activate Phase: Clean obsolete caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== OFFLINE_CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch Phase: Strictly Network-Only with Hard Navigation Fallback
// Soft navigations (client transitions) bypass and are caught by app/error.tsx
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const cache = await caches.open(OFFLINE_CACHE_NAME);
        const cached = await cache.match(OFFLINE_URL);
        return cached || new Response('You are offline. Please reconnect.', {
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      })
    );
    return;
  }

  // All other requests (API, JS/CSS chunks) pass directly to the network
  return;
});

// 4. Notification Click Phase: Focus or open the PWA when notification is tapped
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
