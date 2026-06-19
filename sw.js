const CACHE_NAME = 'gym-tracker-v4';

const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/src/main.js',
  '/src/router.js',
  '/src/config.js',
  '/src/store/db.js',
  '/src/store/planStore.js',
  '/src/store/recentWeightStore.js',
  '/src/store/logStore.js',
  '/src/store/queueStore.js',
  '/src/api/gas.js',
  '/src/api/demoData.js',
  '/src/lib/day.js',
  '/src/lib/uuid.js',
  '/src/sync/syncEngine.js',
  '/src/ui/home.js',
  '/src/ui/settings.js',
  '/src/ui/exerciseModal.js',
  '/src/ui/doneToday.js',
  '/src/ui/components.js',
  '/src/styles/app.css',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Pass GAS API calls and cross-origin requests through to network
  if (url.hostname === 'script.google.com' || url.origin !== self.location.origin) {
    return;
  }

  // Cache-first for all same-origin requests
  event.respondWith(
    caches.match(event.request).then(
      (cached) => cached || fetch(event.request)
    )
  );
});
