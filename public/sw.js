const CACHE_NAME = 'arcus-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Simple pass-through for now, required for PWA installability
  event.respondWith(fetch(event.request));
});
