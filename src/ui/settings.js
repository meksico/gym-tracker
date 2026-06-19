import { getGasUrl, setGasUrl, isDemoMode, setDemoMode, isConfigured } from '../config.js';
import { cachePlan } from '../store/planStore.js';
import { cacheRecentWeights } from '../store/recentWeightStore.js';
import { getPlan as fetchPlan, getRecentWeights as fetchRecentWeights } from '../api/gas.js';
import { DEMO_PLAN, DEMO_RECENT_WEIGHTS } from '../api/demoData.js';
import { navigate } from '../router.js';

export async function renderSettings() {
  const app = document.getElementById('app');
  app.innerHTML = '';

  const configured = isConfigured();
  const demo = isDemoMode();
  const currentUrl = getGasUrl();

  // ── Header ──
  const header = document.createElement('header');
  header.className = 'app-header';

  if (configured) {
    const backBtn = document.createElement('button');
    backBtn.className = 'btn-icon';
    backBtn.setAttribute('aria-label', 'Назад');
    backBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`;
    backBtn.addEventListener('click', () => navigate('#home'));
    header.appendChild(backBtn);
  }

  const titleGroup = document.createElement('div');
  titleGroup.className = 'app-header__titles';
  const titleEl = document.createElement('h1');
  titleEl.className = 'app-header__title';
  titleEl.textContent = 'Налаштування';
  titleGroup.appendChild(titleEl);
  header.appendChild(titleGroup);
  app.appendChild(header);

  const main = document.createElement('main');
  main.className = 'main';

  // ── Status chip ──
  const statusChip = document.createElement('div');
  if (demo) {
    statusChip.className = 'status-chip status-chip--demo';
    statusChip.textContent = '🎭 Демо-режим активний';
  } else if (currentUrl) {
    statusChip.className = 'status-chip status-chip--connected';
    statusChip.textContent = '● Підключено до Google Sheets';
  } else {
    statusChip.className = 'status-chip status-chip--none';
    statusChip.textContent = '○ Додаток не налаштовано';
  }
  main.appendChild(statusChip);

  // ── GAS URL card ──
  const urlCard = document.createElement('div');
  urlCard.className = 'settings-card';

  const urlTitle = document.createElement('p');
  urlTitle.className = 'settings-card__title';
  urlTitle.textContent = 'Google Apps Script';

  const urlDesc = document.createElement('p');
  urlDesc.className = 'settings-card__desc';
  urlDesc.textContent = 'URL веб-додатку для синхронізації з Google Sheets';

  const urlInput = document.createElement('input');
  urlInput.className = 'input-text';
  urlInput.type = 'url';
  urlInput.placeholder = 'https://script.google.com/macros/s/…/exec';
  urlInput.value = currentUrl;
  urlInput.inputMode = 'url';
  urlInput.autocomplete = 'off';
  urlInput.spellcheck = false;

  const statusText = document.createElement('p');
  statusText.className = 'settings-status';

  const connectBtn = document.createElement('button');
  connectBtn.className = 'btn btn--primary';
  connectBtn.textContent = 'Зберегти та підключити';

  connectBtn.addEventListener('click', async () => {
    const url = urlInput.value.trim();
    if (!url) {
      statusText.className = 'settings-status settings-status--error';
      statusText.textContent = '⚠ Введіть URL';
      return;
    }

    // Offline: save without validation and navigate
    if (!navigator.onLine) {
      setGasUrl(url);
      setDemoMode(false);
      navigate('#home');
      return;
    }

    connectBtn.disabled = true;
    connectBtn.textContent = 'Перевірка…';
    statusText.className = 'settings-status';
    statusText.textContent = '';

    try {
      const res = await fetch(`${url}?action=getPlan`, { mode: 'cors' });
      if (!res.ok) throw new Error(`Сервер відповів ${res.status}`);
      const testData = await res.json();
      if (!Array.isArray(testData)) throw new Error('Неочікуваний формат відповіді');

      // URL is valid — save and cache
      setGasUrl(url);
      setDemoMode(false);

      statusText.className = 'settings-status settings-status--ok';
      statusText.textContent = `✓ Підключено — ${testData.length} вправ знайдено`;

      const [planRows, weightRows] = await Promise.allSettled([
        fetchPlan(),
        fetchRecentWeights(),
      ]);
      if (planRows.status === 'fulfilled') await cachePlan(planRows.value);
      if (weightRows.status === 'fulfilled') await cacheRecentWeights(weightRows.value);

      setTimeout(() => navigate('#home'), 900);
    } catch (err) {
      statusText.className = 'settings-status settings-status--error';
      statusText.textContent = `✗ ${err.message}`;
      connectBtn.disabled = false;
      connectBtn.textContent = 'Зберегти та підключити';
    }
  });

  urlCard.appendChild(urlTitle);
  urlCard.appendChild(urlDesc);
  urlCard.appendChild(urlInput);
  urlCard.appendChild(statusText);
  urlCard.appendChild(connectBtn);
  main.appendChild(urlCard);

  // ── Divider ──
  const divider = document.createElement('div');
  divider.className = 'settings-divider';
  divider.textContent = 'або';
  main.appendChild(divider);

  // ── Demo mode card ──
  const demoCard = document.createElement('div');
  demoCard.className = 'settings-card';

  const demoTitle = document.createElement('p');
  demoTitle.className = 'settings-card__title';
  demoTitle.textContent = 'Демо-режим';

  const demoDesc = document.createElement('p');
  demoDesc.className = 'settings-card__desc';
  demoDesc.textContent = 'Вбудовані тренувальні дані — підключення до Google Sheets не потрібне';

  const demoBtn = document.createElement('button');
  demoBtn.className = `btn ${demo ? 'btn--ghost' : 'btn--secondary'}`;
  demoBtn.textContent = demo ? '✓ Демо-режим активний' : 'Увімкнути демо-режим';
  demoBtn.disabled = demo;

  demoBtn.addEventListener('click', async () => {
    setDemoMode(true);
    await cachePlan(DEMO_PLAN);
    await cacheRecentWeights(DEMO_RECENT_WEIGHTS);
    navigate('#home');
  });

  demoCard.appendChild(demoTitle);
  demoCard.appendChild(demoDesc);
  demoCard.appendChild(demoBtn);
  main.appendChild(demoCard);

  app.appendChild(main);

  // Auto-focus URL input if not configured
  if (!configured) urlInput.focus();
}
