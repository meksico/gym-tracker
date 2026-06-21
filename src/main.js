import { openDb } from './store/db.js';
import { getPlan, cachePlan } from './store/planStore.js';
import { cacheRecentWeights } from './store/recentWeightStore.js';
import { getPlan as fetchPlan, getRecentWeights as fetchRecentWeights } from './api/sheets.js';
import { renderHome } from './ui/home.js';
import { renderSettings } from './ui/settings.js';
import { ensureAuth } from './ui/loginScreen.js';
import { getCurrentDay } from './lib/day.js';
import { startSyncEngine } from './sync/syncEngine.js';
import { getCurrentRoute } from './router.js';

async function registerSW() {
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('./sw.js');
    } catch (err) {
      console.warn('SW registration failed:', err);
    }
  }
}

async function loadAndRenderHome() {
  const app = document.getElementById('app');

  if (navigator.onLine) {
    try {
      const [planRows, weightRows] = await Promise.all([fetchPlan(), fetchRecentWeights()]);
      await cachePlan(planRows);
      await cacheRecentWeights(weightRows);
    } catch (err) {
      console.warn('Online fetch failed, using cache:', err);
    }
  }

  const cached = await getPlan();
  if (cached.length > 0) {
    await renderHome(getCurrentDay());
  } else {
    app.innerHTML = `
      <div class="setup-screen">
        <div class="setup-card">
          <p>Немає кешованих даних. Підключіться до інтернету для першого завантаження.</p>
        </div>
      </div>
    `;
  }
}

async function routeContent() {
  const hash = getCurrentRoute();
  if (hash === '#settings') {
    await renderSettings();
  } else {
    await loadAndRenderHome();
  }
}

async function init() {
  await registerSW();
  await openDb();

  // Always run auth init: restores access token into memory for returning users,
  // or shows the sign-in screen for new ones. Resolves only when auth succeeds.
  await ensureAuth();

  startSyncEngine();
  window.addEventListener('hashchange', () => routeContent());
  await routeContent();
}

init().catch((err) => {
  console.error('Init failed:', err);
  document.getElementById('app').innerHTML =
    `<div class="setup-screen"><div class="setup-card"><p>Помилка запуску: ${err.message}</p></div></div>`;
});
