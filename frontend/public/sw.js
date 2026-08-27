// Minimal service worker: its only real job is to exist, since browsers
// require a registered service worker before showing the "install app"
// prompt. It passes all requests straight through to the network rather
// than caching, since this app's data changes too often to serve stale.
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
