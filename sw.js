// Offline support: the whole app is cached on first visit.
// The deploy workflow replaces __BUILD__ with the commit id, so every release
// gets a fresh cache and old caches are deleted.
const CACHE = 'ghosted-__BUILD__';

const ASSETS = [
  './',
  'index.html',
  'styles.css',
  'manifest.webmanifest',
  'favicon.svg',
  'js/app.js',
  'js/core.js',
  'js/dates.js',
  'js/progress.js',
  'js/progress-view.js',
  'js/store.js',
  'js/templates.js',
  'js/tips.js',
  'fonts/inter-latin-wght-normal.woff2',
  'fonts/source-serif-4-latin-wght-normal.woff2',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/maskable-512.png',
  'icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then((hit) => {
      if (hit) return hit;
      return fetch(request).catch(() => (request.mode === 'navigate' ? caches.match('index.html') : Response.error()));
    }),
  );
});
