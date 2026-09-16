// The Villa service worker: cache the app shell so the game opens instantly and works offline
// once it has loaded once. Network first so updates show up; cache fallback so it works on a beach.
const VERSION = 'villa-v1';
const SHELL = ['./', './index.html', './styles.css', './manifest.webmanifest',
  './src/main.js', './src/league-config.js', './src/league.js', './src/analytics.js',
  './src/villa/rng.js', './src/villa/cast.js', './src/villa/portrait.js', './src/villa/model.js', './src/villa/text.js', './src/villa/challenges.js', './src/villa/engine.js',
  './src/producer/ui.js', './src/islander/actions.js', './src/islander/ui.js', './src/ui.js',
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png', './icons/favicon.ico'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || !e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(
    fetch(e.request).then((res) => {
      const copy = res.clone();
      caches.open(VERSION).then((c) => c.put(e.request, copy));
      return res;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
