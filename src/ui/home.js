import { h, icon, ui } from './tp7-ui.js';
import { getPlan } from '../store/planStore.js';
import { getStarCounts, getTodayLogs } from '../store/logStore.js';
import { getCurrentDay, getTrainingDays } from '../lib/day.js';
import { renderExerciseModal } from './exerciseModal.js';
import { navigate } from '../router.js';
import { getSyncStatus } from '../sync/syncEngine.js';
import { signIn } from '../auth/auth.js';

const DAY_LABELS = { Monday: "ПН", Wednesday: "СР", Friday: "ПТ" };

let selectedDay = null;
let keepFlipped = false;

export async function renderHome(day) {
  if (day) selectedDay = day;
  if (!selectedDay) selectedDay = getCurrentDay();

  const app = document.getElementById('app');
  app.innerHTML = '';

  if (!document.getElementById('home-flip-styles')) {
    const style = document.createElement('style');
    style.id = 'home-flip-styles';
    style.textContent = '#home-hero-flipper{transition:transform .2s ease}';
    document.head.appendChild(style);
  }

  // ── App bar ──
  app.appendChild(
    h('header', { id: 'home-appbar', class: 'appbar' },
      icon('barbell', { size: 26 }),
      h('div', { style: 'flex:1;min-width:0' },
        h('div', { style: 'font:var(--weight-bold) var(--text-lg)/1 var(--font-expanded);letter-spacing:.02em' }, "GYM_LOGS"),
        h('div', { class: 'tp7-label', style: 'margin-top:3px' }, "ЖУРНАЛ ТРЕНУВАНЬ")),
      ui.iconButton('gear', { label: "Налаштування", onClick: () => navigate('#settings') })));

  // ── Sync error banner ──
  const syncBanner = document.createElement('div');
  syncBanner.id = 'home-sync-banner';

  function showSyncError(msg) {
    syncBanner.style.display = 'block';
    syncBanner.textContent = "⚠ Помилка синхронізації: " + msg;
  }

  function showAuthExpiredBanner() {
    syncBanner.style.display = 'block';
    syncBanner.replaceChildren();
    const label = document.createTextNode("⚠ Сесія застаріла · ");
    const btn = document.createElement('button');
    btn.textContent = "Торкніться щоб поновити →";
    btn.style.cssText = 'background:none;border:none;color:inherit;font:inherit;cursor:pointer;text-decoration:underline;padding:0';
    btn.addEventListener('click', () => signIn());
    syncBanner.append(label, btn);
  }

  const { lastError, lastErrorIsAuth } = getSyncStatus();
  if (lastErrorIsAuth) showAuthExpiredBanner();
  else if (lastError) showSyncError(lastError);

  window.addEventListener('sync-error', (e) => showSyncError(e.detail), { once: false });
  window.addEventListener('sync-auth-expired', () => showAuthExpiredBanner(), { once: false });
  window.addEventListener('auth-token-refreshed', () => { syncBanner.style.display = 'none'; }, { once: false });
  app.appendChild(syncBanner);

  const dayItems = getTrainingDays().map((d) => ({ value: d, label: DAY_LABELS[d] || d }));

  // ── Load data ──
  const [plan, starCounts, todayLogs] = await Promise.all([
    getPlan(),
    getStarCounts(),
    getTodayLogs(),
  ]);

  const dayExercises = plan.filter((ex) => ex.day === selectedDay);
  const done = dayExercises.filter((ex) => (starCounts[ex.name] || 0) >= ex.sets).length;
  const total = dayExercises.length;
  const sessionVolume = todayLogs.reduce((sum, log) => sum + log.weight * log.reps, 0);

  // ── Scrollable body ──
  const scroll = h('div', { class: 'screen-scroll' });

  // Session deck — flip card (front: stats, back: day picker)
  const heroFront = h('div', {
    id: 'home-session-hero',
    class: 'tp7-card tp7-card--screen',
    style: 'border-radius:var(--radius-lg);padding:16px;cursor:pointer',
  },
    h('div', { style: 'display:flex;align-items:center;gap:18px' },
      ui.tapeReel(total ? done / total : 0, { size: 96, label: `${done}/${total}`, spinning: done > 0 }),
      h('div', { style: 'display:flex;flex-direction:column;gap:16px;flex:1' },
        h('div', {},
          h('div', { class: 'tp7-readout__caption' }, "СЕСІЯ · СЬОГОДНІ"),
          h('div', { style: 'font:var(--weight-bold) var(--text-lg)/1 var(--font-expanded);color:var(--grey-50)' },
            selectedDay.toUpperCase())),
        h('div', { style: 'display:flex;gap:22px;align-items:flex-start' },
          h('div', {},
            h('div', { class: 'tp7-readout__caption' }, "ВПРАВ"),
            h('span', { style: 'font:var(--weight-medium) var(--text-lg)/1 var(--font-mono);letter-spacing:var(--tracking-mono);font-variant-numeric:tabular-nums;color:var(--orange-500);text-shadow:0 0 12px rgba(255,79,0,.45)' },
              `${done}/${total}`)),
          h('div', {},
            h('div', { class: 'tp7-readout__caption' }, "ОБʼЄМ СЕСІЯ"),
            h('div', { style: 'display:flex;align-items:baseline' },
              h('span', { style: 'font:var(--weight-medium) var(--text-2xl)/1 var(--font-mono);letter-spacing:var(--tracking-mono);font-variant-numeric:tabular-nums;color:var(--orange-500);text-shadow:0 0 12px rgba(255,79,0,.45)' },
                Math.round(sessionVolume).toLocaleString('en-US').replace(/,/g, ' ')),
              h('span', { class: 'tp7-readout__unit' }, "КГ")))))));

  const heroBack = h('div', {
    id: 'home-day-selector',
    class: 'tp7-card tp7-card--screen',
    style: 'border-radius:var(--radius-lg);align-items:center;justify-content:center;padding:16px',
  },
    ui.segmented(dayItems, selectedDay, (v) => { keepFlipped = true; renderHome(v); }));
  heroBack.style.display = 'none';

  const flipper = h('div', { id: 'home-hero-flipper' }, heroFront, heroBack);
  const flipWrap = h('div', { id: 'home-hero-flipper-wrap', style: 'overflow:hidden' }, flipper);

  const HALF = 200;
  let isFlipped = false;

  function onDocClick(e) {
    if (!flipWrap.contains(e.target)) flipToFront();
  }

  function flipToFront() {
    if (!isFlipped) return;
    flipper.style.transition = `transform ${HALF}ms ease-in`;
    flipper.style.transform = 'scaleX(0)';
    setTimeout(() => {
      isFlipped = false;
      heroBack.style.display = 'none';
      heroFront.style.display = '';
      flipper.style.transition = `transform ${HALF}ms ease-out`;
      flipper.style.transform = '';
      document.removeEventListener('click', onDocClick);
    }, HALF);
  }

  function flipToBack() {
    if (isFlipped) return;
    flipper.style.transition = `transform ${HALF}ms ease-in`;
    flipper.style.transform = 'scaleX(0)';
    setTimeout(() => {
      isFlipped = true;
      heroFront.style.display = 'none';
      heroBack.style.display = 'flex';
      flipper.style.transition = `transform ${HALF}ms ease-out`;
      flipper.style.transform = '';
      setTimeout(() => document.addEventListener('click', onDocClick), 0);
    }, HALF);
  }

  heroFront.addEventListener('click', flipToBack);

  // Returning from a day-change: restore back-face without animation
  if (keepFlipped) {
    isFlipped = true;
    heroFront.style.display = 'none';
    heroBack.style.display = 'flex';
    keepFlipped = false;
    setTimeout(() => document.addEventListener('click', onDocClick), 0);
  }

  scroll.appendChild(flipWrap);

  // Lock wrapper height to front-face height so flipping never causes a layout jump
  requestAnimationFrame(() => {
    const frontH = heroFront.offsetHeight;
    if (frontH > 0) {
      flipWrap.style.height = frontH + 'px';
      heroBack.style.height = frontH + 'px';
    }
  });

  // Exercise list
  const list = h('div', { id: 'home-exercise-list', style: 'display:flex;flex-direction:column;gap:8px;margin-top:16px' });

  if (dayExercises.length === 0) {
    list.appendChild(
      h('div', { id: 'home-empty-state', class: 'tp7-card tp7-card--sunken', style: 'text-align:center;padding:22px 18px' },
        h('div', { class: 'tp7-mono', style: 'font-size:var(--text-2xs);font-weight:600;letter-spacing:var(--tracking-wide);text-transform:uppercase;color:var(--text-secondary);margin-bottom:8px' },
          "НЕМАЄ ВПРАВ"),
        h('div', { style: 'font:var(--weight-regular) var(--text-sm)/1.4 var(--font-sans);color:var(--text-tertiary)' },
          "Підключіться до інтернету для першого завантаження.")));
  } else {
    dayExercises.forEach((ex, i) => {
      const logCount = starCounts[ex.name] || 0;
      const complete = logCount >= ex.sets;
      const effort = Math.min(3, logCount);

      list.appendChild(
        h('div', { id: `home-exercise-row-${ex.id}`, class: 'tp7-row', style: 'padding:13px 14px', onclick: () => renderExerciseModal(ex) },
          h('div', { style: 'display:flex;gap:12px' },
            h('span', { class: 'tp7-mono', style: 'font-size:var(--text-sm);color:var(--text-tertiary);padding-top:1px;min-width:22px' },
              String(i + 1).padStart(2, '0')),
            h('div', { style: 'flex:1;min-width:0' },
              h('div', { style: 'display:flex;align-items:flex-start;justify-content:space-between;gap:10px' },
                h('div', { style: 'flex:1;min-width:0;font:var(--weight-semibold) var(--text-md)/1.2 var(--font-sans);text-wrap:pretty' }, ex.name),
                ui.groupTag(ex.group)),
              h('div', { style: 'display:flex;align-items:center;gap:14px;margin-top:11px' },
                ui.effortMeter(effort),
                h('span', { class: 'tp7-mono', style: 'font-size:var(--text-xs);color:var(--text-secondary)' },
                  `${ex.sets}×${ex.minReps}–${ex.maxReps}`),
                h('div', { style: 'flex:1' }),
                logCount > 0
                  ? (complete
                      ? ui.badge("ЗАПИСАНО", { variant: 'solid' })
                      : h('span', { class: 'tp7-mono', style: 'font-size:var(--text-2xs);font-weight:700;color:var(--text-tertiary)' },
                          `${logCount}/${ex.sets}`))
                  : null,
                icon('chevR', { size: 16 }))))));
    });
  }

  scroll.appendChild(list);
  app.appendChild(scroll);
}
