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
import { logger } from './lib/logger.js';

async function registerSW() {
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('./sw.js');
    } catch (err) {
      logger.warn('main', 'SW registration failed', { error: err.message });
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
      logger.warn('main', 'Online fetch failed, using cache', { error: err.message });
    }
  }

  const cached = await getPlan();
  if (cached.length > 0) {
    await renderHome(getCurrentDay());
  } else {
    app.innerHTML = `
      <div class="setup-screen">
        <div class="tp7-card" style="text-align:center;padding:32px 24px;width:100%">
          <p style="font:var(--type-body);color:var(--text-secondary)">Немає кешованих даних. Підключіться до інтернету для першого завантаження.</p>
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
  logger.error('main', 'Init failed', { error: err.message });
  document.getElementById('app').innerHTML =
    `<div class="setup-screen"><div class="tp7-card" style="text-align:center;padding:32px 24px;width:100%"><p style="font:var(--type-body);color:var(--orange-500)">Помилка запуску: ${err.message}</p></div></div>`;
});
