import { h, icon, ui } from './tp7-ui.js';
import { getGoogleUser, STORES } from '../config.js';
import { APP_VERSION } from '../lib/version.js';
import { signOut } from '../auth/auth.js';
import { navigate } from '../router.js';
import { getAllFromStore, clearStore, deleteFromStore } from '../store/db.js';
import { getTodayLogs } from '../store/logStore.js';
import { logger } from '../lib/logger.js';

const DEBUG_KEY = 'gym_debug';

const LEVEL_COLOR = {
  ERROR: 'var(--orange-500)',
  WARN:  '#d97706',
  INFO:  '#60a5fa',
  DEBUG: 'var(--text-tertiary)',
};

function fmtTs(ts) {
  const d = new Date(ts);
  return [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map(n => String(n).padStart(2, '0')).join(':');
}

function safeJson(v) {
  try { return JSON.stringify(v); } catch { return '[?]'; }
}

async function buildClearTodaySection() {
  const logs = await getTodayLogs();
  const count = logs.length;

  const wrap = h('div', {
    id: 'settings-clear-today-section',
    class: 'tp7-card',
    style: 'border-radius:var(--radius-lg);padding:18px;margin-top:12px',
  });

  function renderDefault() {
    const btn = ui.button("ВИДАЛИТИ ЗАПИСИ СЬОГОДНІ", {
      size: 'sm',
      variant: count > 0 ? 'critical' : 'surface',
      onClick: renderConfirm,
    });
    btn.id = 'settings-clear-today-btn';
    btn.disabled = count === 0;

    wrap.replaceChildren(
      h('div', { style: 'display:flex;align-items:center;gap:8px' },
        ui.eyebrow("ДАНІ СЬОГОДНІ"),
        h('span', { class: 'tp7-mono', style: 'font-size:var(--text-2xs);color:var(--text-tertiary)' },
          `${count} записів`),
        h('div', { style: 'flex:1' }),
        btn));
  }

  function renderConfirm() {
    const confirmBtn = ui.button("ТАК, ВИДАЛИТИ", {
      size: 'sm',
      variant: 'critical',
      onClick: async () => {
        for (const log of logs) {
          await deleteFromStore(STORES.LOGS, log.uuid);
        }
        await clearStore(STORES.QUEUE);
        logger.info('settings', 'Today logs cleared', { count });
        window.location.reload();
      },
    });
    confirmBtn.id = 'settings-clear-today-confirm-btn';

    const cancelBtn = ui.button("СКАСУВАТИ", { size: 'sm', onClick: renderDefault });

    wrap.replaceChildren(
      h('div', { style: 'display:flex;align-items:center;gap:8px;flex-wrap:wrap' },
        h('span', { class: 'tp7-mono', style: 'font-size:var(--text-xs);color:var(--text-secondary)' },
          `Видалити ${count} записи та чергу?`),
        h('div', { style: 'flex:1' }),
        cancelBtn,
        confirmBtn));
  }

  renderDefault();
  return wrap;
}

async function buildLogSection() {
  const allEntries = await getAllFromStore(STORES.APP_LOG);
  allEntries.sort((a, b) => b.ts - a.ts);
  let shown = allEntries.slice(0, 50);

  const countEl = h('span', {
    class: 'tp7-mono',
    style: 'font-size:var(--text-2xs);color:var(--text-tertiary)',
  }, String(allEntries.length));

  const listEl = h('div', {
    id: 'settings-log-list',
    style: 'font:11px/1.65 var(--font-mono);overflow-y:auto;max-height:280px;' +
           'background:var(--bg-sunken);border:1px solid var(--border-channel);' +
           'border-radius:var(--radius-sm);padding:8px 10px;word-break:break-all',
  });

  function renderList() {
    listEl.replaceChildren(
      ...(shown.length === 0
        ? [h('span', { style: 'color:var(--text-tertiary)' }, "Немає записів")]
        : shown.map(e => {
            const dataStr = e.data !== undefined ? ' ' + safeJson(e.data) : '';
            return h('div', {
              style: `color:${LEVEL_COLOR[e.level] ?? 'inherit'};margin-bottom:2px`,
            }, `[${fmtTs(e.ts)}] ${e.level.padEnd(5)} [${e.context}] ${e.message}${dataStr}`);
          })
      )
    );
  }
  renderList();

  const clearBtn = ui.button("ОЧИСТИТИ", {
    size: 'sm',
    onClick: async () => {
      await clearStore(STORES.APP_LOG);
      shown = [];
      countEl.textContent = '0';
      renderList();
    },
  });

  clearBtn.id = 'settings-log-clear-btn';

  const isDebug = localStorage.getItem(DEBUG_KEY) === '1';
  const debugToggle = ui.button(isDebug ? "DEBUG: ON" : "DEBUG: OFF", {
    size: 'sm',
    variant: isDebug ? 'critical' : 'surface',
    onClick: () => {
      localStorage.setItem(DEBUG_KEY, isDebug ? '0' : '1');
      window.location.reload();
    },
  });

  debugToggle.id = 'settings-debug-toggle';

  return h('div', { id: 'settings-log-section', class: 'tp7-card', style: 'border-radius:var(--radius-lg);padding:18px;margin-top:12px' },
    h('div', { style: 'display:flex;align-items:center;gap:8px;margin-bottom:12px;flex-wrap:wrap' },
      ui.eyebrow("DEBUG LOGS"),
      countEl,
      h('div', { style: 'flex:1' }),
      debugToggle,
      clearBtn),
    listEl);
}

export async function renderSettings() {
  const app = document.getElementById('app');
  app.innerHTML = '';

  const googleUser = getGoogleUser();

  // ── App bar ──
  app.appendChild(
    h('header', { id: 'settings-appbar', class: 'appbar', style: 'padding:14px 16px' },
      ui.iconButton('back', { label: "Назад", onClick: () => navigate('#home') }),
      h('div', { style: 'font:var(--weight-bold) var(--text-lg)/1 var(--font-expanded)' },
        "НАЛАШТУВАННЯ")));

  // ── Scrollable body ──
  const scroll = h('div', { id: 'settings-scroll', class: 'screen-scroll' });

  // Connection status chip (live dot)
  scroll.appendChild(
    h('div', { style: 'margin-bottom:4px' },
      h('span', {
        id: 'settings-connection-chip',
        style: 'display:inline-flex;align-items:center;gap:8px;height:26px;padding:0 12px;' +
               'background:var(--bg-sunken);border:1px solid var(--border-channel);box-shadow:var(--shadow-inset);' +
               'border-radius:var(--radius-sm);font:var(--weight-bold) var(--text-2xs)/1 var(--font-mono);' +
               'letter-spacing:var(--tracking-wide);color:var(--text-secondary)',
      },
        h('span', { style: 'width:7px;height:7px;border-radius:50%;background:var(--orange-500);box-shadow:0 0 8px rgba(255,79,0,.6)' }),
        "ПІДКЛЮЧЕНО · GOOGLE SHEETS")));

  // Account card
  if (googleUser) {
    const initials = (googleUser.name || googleUser.email || 'G')
      .split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() || '').join('');

    scroll.appendChild(
      h('div', { id: 'settings-account-card', class: 'tp7-card', style: 'border-radius:var(--radius-lg);padding:18px' },
        h('div', { style: 'display:flex;align-items:center;gap:14px;margin-bottom:16px' },
          h('div', {
            style: 'width:48px;height:48px;border-radius:50%;flex:none;' +
                   'background:radial-gradient(circle at 50% 35%,var(--grey-800),var(--grey-950));' +
                   'border:1px solid #000;box-shadow:var(--shadow-key);' +
                   'display:flex;align-items:center;justify-content:center;' +
                   'font:var(--weight-bold) 16px/1 var(--font-mono);color:var(--grey-50)',
          }, initials),
          h('div', {},
            h('div', { class: 'tp7-label' }, "GOOGLE АКАУНТ"),
            h('div', { style: 'margin-top:5px;font:var(--weight-medium) var(--text-sm)/1.3 var(--font-sans)' },
              googleUser.name || ''),
            h('div', { class: 'tp7-mono', style: 'font-size:var(--text-xs);color:var(--text-tertiary)' },
              googleUser.email || ''))),
        ui.button("ВИЙТИ З АКАУНТУ", {
          block: true,
          onClick: () => { signOut(); window.location.reload(); },
        })));
  }

  // Clear today's logs
  const clearTodaySection = await buildClearTodaySection();
  scroll.appendChild(clearTodaySection);

  // Debug log viewer
  const logSection = await buildLogSection();
  scroll.appendChild(logSection);

  // Version label
  scroll.appendChild(
    h('div', { id: 'settings-version', style: 'margin-top:16px;text-align:center' },
      h('span', {
        style: 'display:inline-flex;align-items:center;gap:6px;height:22px;padding:0 10px;' +
               'background:var(--bg-sunken);border:1px solid var(--border-channel);' +
               'border-radius:var(--radius-sm);font:var(--weight-bold) var(--text-2xs)/1 var(--font-mono);' +
               'letter-spacing:var(--tracking-wide);color:var(--text-tertiary)',
      }, `GYM TRACKER ${APP_VERSION}`)));

  app.appendChild(scroll);
}
