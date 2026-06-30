import { h, icon, ui } from './tp7-ui.js';
import { getPlan } from '../store/planStore.js';
import { getStarCounts, getTodayLogs } from '../store/logStore.js';
import { getDefaultDay } from '../lib/day.js';
import { renderExerciseModal } from './exerciseModal.js';
import { navigate } from '../router.js';
import { getSyncStatus, drainQueue } from '../sync/syncEngine.js';
import { signIn } from '../auth/auth.js';
import { getLatestBodyWeight, cacheBodyWeight } from '../store/bodyWeightStore.js';
import { enqueueBodyWeight } from '../store/queueStore.js';
import { formatBodyWeightDate } from '../api/sheets.js';

const DAY_LABELS = { Monday: "ПН", Tuesday: "ВТ", Wednesday: "СР", Thursday: "ЧТ", Friday: "ПТ", Saturday: "СБ", Sunday: "НД" };

let selectedDay = null;
let keepFlipped = false;

export async function renderHome(day) {
  if (day) selectedDay = day;

  const app = document.getElementById('app');
  app.innerHTML = '';

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

  // ── Load data ──
  const [plan, starCounts, todayLogs, latestBodyWeight] = await Promise.all([
    getPlan(),
    getStarCounts(),
    getTodayLogs(),
    getLatestBodyWeight(),
  ]);

  // Derive training days from plan in sheet (column A) order; fall back to Mon if plan is empty.
  const trainingDays = [];
  for (const ex of plan) {
    if (ex.day && !trainingDays.includes(ex.day)) trainingDays.push(ex.day);
  }
  if (!trainingDays.length) trainingDays.push('Monday');

  // If the remembered day is no longer in the plan (e.g. day was removed), reset it.
  if (!trainingDays.includes(selectedDay)) selectedDay = null;
  if (!selectedDay) selectedDay = getDefaultDay(trainingDays);

  const dayItems = trainingDays.map((d) => ({ value: d, label: DAY_LABELS[d] || d }));

  const dayExercises = plan.filter((ex) => ex.day === selectedDay);
  const done = dayExercises.filter((ex) => {
    const req = (ex.isTimeBased && !ex.sets) ? 1 : ex.sets;
    return (starCounts[ex.name] || 0) >= req;
  }).length;
  const total = dayExercises.length;
  const sessionVolume = todayLogs.reduce((sum, log) => sum + (log.weight || 0) * (log.reps || 0), 0);

  // ── Scrollable body ──
  const scroll = h('div', { class: 'home-scroll' });

  // ── Flip card: front = session stats, back = day picker ──
  //
  // Both faces share grid-area:1/1 inside a display:grid+overflow:hidden flipper.
  // Height is always max(front, back) — no jump. Animation is a horizontal slide:
  // front exits left, back enters from right (and vice-versa).

  const heroFront = h('div', {
    id: 'home-session-hero',
    class: 'tp7-card tp7-card--screen',
    style: 'grid-area:1/1;border-radius:var(--radius-lg);padding:16px;cursor:pointer',
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

  // Back face starts off-screen to the right (translateX 100%) and hidden
  const heroBack = h('div', {
    id: 'home-day-selector',
    class: 'tp7-card tp7-card--screen',
    style: 'grid-area:1/1;display:flex;align-items:center;justify-content:center;padding:16px;' +
           'transform:translateX(100%);visibility:hidden;pointer-events:none',
  },
    ui.segmented(dayItems, selectedDay, (v) => { keepFlipped = true; renderHome(v); }));

  // overflow:hidden clips the off-screen face during the slide animation
  const flipper = h('div', { id: 'home-hero-flipper', style: 'display:grid;overflow:hidden' }, heroFront, heroBack);
  const flipWrap = h('div', { id: 'home-hero-flipper-wrap' }, flipper);

  const DUR = 220;
  let isFlipped = false;

  function onDocClick(e) {
    if (!flipWrap.contains(e.target)) flipToFront();
  }

  function flipToFront() {
    if (!isFlipped) return;
    isFlipped = false;
    heroFront.style.visibility = '';
    heroFront.style.pointerEvents = '';
    heroFront.style.transition = `transform ${DUR}ms ease-in-out`;
    heroFront.style.transform = 'translateX(0)';
    heroBack.style.transition = `transform ${DUR}ms ease-in-out`;
    heroBack.style.transform = 'translateX(100%)';
    setTimeout(() => {
      heroBack.style.visibility = 'hidden';
      heroBack.style.pointerEvents = 'none';
      document.removeEventListener('click', onDocClick);
    }, DUR);
  }

  function flipToBack() {
    if (isFlipped) return;
    isFlipped = true;
    heroBack.style.visibility = '';
    heroBack.style.pointerEvents = '';
    heroFront.style.transition = `transform ${DUR}ms ease-in-out`;
    heroFront.style.transform = 'translateX(-100%)';
    heroBack.style.transition = `transform ${DUR}ms ease-in-out`;
    heroBack.style.transform = 'translateX(0)';
    setTimeout(() => {
      heroFront.style.visibility = 'hidden';
      heroFront.style.pointerEvents = 'none';
      setTimeout(() => document.addEventListener('click', onDocClick), 0);
    }, DUR);
  }

  heroFront.addEventListener('click', flipToBack);
  // Tap the dark card background on the back face to flip back
  heroBack.addEventListener('click', (e) => {
    if (e.target === heroBack) flipToFront();
  });

  // Returning from a day-change: restore back-face instantly (no animation)
  if (keepFlipped) {
    isFlipped = true;
    heroFront.style.transition = 'none';
    heroFront.style.transform = 'translateX(-100%)';
    heroFront.style.visibility = 'hidden';
    heroFront.style.pointerEvents = 'none';
    heroBack.style.transition = 'none';
    heroBack.style.transform = 'translateX(0)';
    heroBack.style.visibility = '';
    heroBack.style.pointerEvents = '';
    keepFlipped = false;
    setTimeout(() => document.addEventListener('click', onDocClick), 0);
  }

  scroll.appendChild(flipWrap);

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
      const req = (ex.isTimeBased && !ex.sets) ? 1 : ex.sets;
      const complete = logCount >= req;
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
                ex.isTimeBased
                  ? icon(complete ? 'starFill' : 'star', { size: 16 })
                  : ui.effortMeter(effort),
                !ex.isTimeBased && h('span', { class: 'tp7-mono', style: 'font-size:var(--text-xs);color:var(--text-secondary)' },
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

  // ── Floating action panel (Home only) ──
  const actionBtnTextStyle = 'font:var(--weight-semibold) var(--text-2xs)/1 var(--font-sans);letter-spacing:var(--tracking-label);' +
    'text-transform:uppercase;color:var(--text-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis';

  const bwValue = h('span', { class: 'tp7-mono', style: 'font-size:var(--text-xs);font-weight:700;color:var(--text-primary);flex:none' },
    latestBodyWeight?.weight ? ` ${latestBodyWeight.weight} КГ` : '');
  const bwBtn = h('div', { id: 'home-bodyweight-btn', class: 'home-action-btn' },
    h('span', { style: actionBtnTextStyle }, "ВАГА"), bwValue);

  const actionBar = h('div', { id: 'home-action-bar', class: 'home-action-bar' }, bwBtn);

  const bwInput = h('input', {
    id: 'home-bodyweight-input', type: 'text', inputmode: 'decimal',
    value: latestBodyWeight?.weight ? String(latestBodyWeight.weight) : '',
    placeholder: '0',
    style: 'flex:1;height:40px;background:var(--grey-50);border:1px solid var(--border-channel);' +
           'box-shadow:var(--shadow-inset);border-radius:var(--radius-sm);text-align:center;' +
           'font:700 var(--text-lg)/1 var(--font-mono);color:var(--text-primary);outline:none;' +
           '-webkit-appearance:none;appearance:none',
  });
  const bwSaveBtn = ui.iconButton('check', { variant: 'critical', label: "Зберегти вагу тіла" });
  bwSaveBtn.id = 'home-bodyweight-save-btn';
  const bwRow = h('div', { id: 'home-bodyweight-row', class: 'home-bodyweight-row', style: 'display:none' }, bwInput, bwSaveBtn);

  let bwExpanded = false;
  function toggleBwRow() {
    bwExpanded = !bwExpanded;
    bwRow.style.display = bwExpanded ? 'flex' : 'none';
    if (bwExpanded) bwInput.focus();
  }
  bwBtn.addEventListener('click', toggleBwRow);

  bwSaveBtn.addEventListener('click', async () => {
    const v = parseFloat(bwInput.value.replace(',', '.'));
    if (isNaN(v) || v <= 0) return;
    bwSaveBtn.disabled = true;
    try {
      await cacheBodyWeight([{ date: formatBodyWeightDate(new Date()), weight: v }]);
      await enqueueBodyWeight(v);
      drainQueue();
      bwValue.textContent = ` ${v} КГ`;
      toggleBwRow();
    } finally {
      bwSaveBtn.disabled = false;
    }
  });

  const actionPanel = h('div', { id: 'home-action-panel', class: 'tp7-card home-action-panel' }, actionBar, bwRow);

  const body = h('div', { id: 'home-body', class: 'home-body' }, scroll, actionPanel);
  app.appendChild(body);
}
