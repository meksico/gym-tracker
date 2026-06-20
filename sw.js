const CACHE_NAME = 'gym-tracker-v6';

// Detect subpath (e.g. /gym-tracker on GitHub Pages, empty string at root)
const BASE = self.location.pathname.replace(/\/sw\.js$/, '');

const SHELL_ASSETS = [
  `${BASE}/`,
  `${BASE}/index.html`,
  `${BASE}/manifest.webmanifest`,
  `${BASE}/src/main.js`,
  `${BASE}/src/router.js`,
  `${BASE}/src/config.js`,
  `${BASE}/src/store/db.js`,
  `${BASE}/src/store/planStore.js`,
  `${BASE}/src/store/recentWeightStore.js`,
  `${BASE}/src/store/logStore.js`,
  `${BASE}/src/store/queueStore.js`,
  `${BASE}/src/api/gas.js`,
  `${BASE}/src/api/demoData.js`,
  `${BASE}/src/lib/day.js`,
  `${BASE}/src/lib/uuid.js`,
  `${BASE}/src/sync/syncEngine.js`,
  `${BASE}/src/ui/home.js`,
  `${BASE}/src/ui/loginScreen.js`,
  `${BASE}/src/ui/settings.js`,
  `${BASE}/src/ui/exerciseModal.js`,
  `${BASE}/src/ui/doneToday.js`,
  `${BASE}/src/ui/components.js`,
  `${BASE}/src/styles/app.css`,
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
