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

export async function renderHome(day) {
  if (day) selectedDay = day;
  if (!selectedDay) selectedDay = getCurrentDay();

  const app = document.getElementById('app');
  app.innerHTML = '';

  // ── App bar ──
  app.appendChild(
    h('header', { class: 'appbar' },
      icon('barbell', { size: 26 }),
      h('div', { style: 'flex:1;min-width:0' },
        h('div', { style: 'font:var(--weight-bold) var(--text-lg)/1 var(--font-expanded);letter-spacing:.02em' }, "GYM_LOGS"),
        h('div', { class: 'tp7-label', style: 'margin-top:3px' }, "ЖУРНАЛ ТРЕНУВАНЬ")),
      ui.iconButton('gear', { label: "Налаштування", onClick: () => navigate('#settings') })));

  // ── Sync error banner ──
  const syncBanner = document.createElement('div');
  syncBanner.id = 'sync-error-banner';

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
  app.appendChild(syncBanner);

  // ── Day selector — sticky bar below header ──
  const dayItems = getTrainingDays().map((d) => ({ value: d, label: DAY_LABELS[d] || d }));
  app.appendChild(
    h('div', {
      style: 'flex:none;padding:10px 16px;background:var(--bg-primary);' +
             'border-bottom:1px solid var(--border-hairline);box-shadow:0 1px 0 rgba(255,255,255,.6)',
    },
      ui.segmented(dayItems, selectedDay, (v) => renderHome(v))));

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

  // Session deck (dark card + tape reel)
  scroll.appendChild(
    h('div', { class: 'tp7-card tp7-card--screen', style: 'border-radius:var(--radius-lg);padding:16px' },
      h('div', { style: 'display:flex;align-items:center;gap:18px' },
        ui.tapeReel(total ? done / total : 0, { size: 96, label: `${done}/${total}`, spinning: done > 0 }),
        h('div', { style: 'display:flex;flex-direction:column;gap:16px;flex:1' },
          h('div', {},
            h('div', { class: 'tp7-readout__caption' }, "СЕСІЯ · СЬОГОДНІ"),
            h('div', { style: 'font:var(--weight-bold) var(--text-lg)/1 var(--font-expanded);color:var(--grey-50)' },
              selectedDay.toUpperCase())),
          h('div', { style: 'display:flex;gap:22px' },
            ui.litValue("ВПРАВ", `${done}/${total}`),
            ui.litValue("ОБʼЄМ СЕСІЯ",
              sessionVolume.toLocaleString('en-US').replace(/,/g, ' '), "КГ"))))));

  // Exercise list
  const list = h('div', { style: 'display:flex;flex-direction:column;gap:8px;margin-top:16px' });

  if (dayExercises.length === 0) {
    list.appendChild(
      h('div', { class: 'tp7-card tp7-card--sunken', style: 'text-align:center;padding:22px 18px' },
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
        h('div', { class: 'tp7-row', style: 'padding:13px 14px', onclick: () => renderExerciseModal(ex) },
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
