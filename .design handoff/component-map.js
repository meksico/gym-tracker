/**
 * TP-7 GYM LOGS — COMPONENT MAP
 * ─────────────────────────────────────────────────────────────────────
 * For every factory function in src/ui/components.js, this file shows
 * the exact before → after replacement using tp7-ui.js.
 *
 * All examples use the same h() / icon() / ui.* API from tp7-ui.js.
 * ─────────────────────────────────────────────────────────────────────
 */

import { h, icon, ui } from './tp7-ui.js';


/* ══════════════════════════════════════════════════════════════════════
   appHeaderEl  →  TP-7 app bar
   ══════════════════════════════════════════════════════════════════════ */

// BEFORE ───────────────────────────────────────────────────────────────
function appHeaderEl_BEFORE({ title, onSettings }) {
  const el = document.createElement('header');
  el.className = 'app-header';
  el.innerHTML = `<span class="app-header__title">${title}</span>`;
  const btn = document.createElement('button');
  btn.className = 'btn btn--icon';
  btn.innerHTML = '⚙';
  btn.onclick = onSettings;
  el.appendChild(btn);
  return el;
}

// AFTER ────────────────────────────────────────────────────────────────
function appHeaderEl({ title, tagline, onSettings }) {
  return h('header', {
    style: 'display:flex;align-items:center;gap:12px;padding:14px 18px;flex:none;' +
           'background:var(--bg-primary);border-bottom:1px solid var(--border-hairline);' +
           'box-shadow:0 1px 0 rgba(255,255,255,.6)',
  },
    icon('barbell', { size: 26 }),
    h('div', { style: 'flex:1;min-width:0' },
      h('div', {
        style: 'font:var(--weight-bold) var(--text-lg)/1 var(--font-expanded);letter-spacing:.02em',
      }, title),
      tagline ? h('div', { class: 'tp7-label', style: 'margin-top:3px' }, tagline) : null),
    ui.iconButton('gear', { label: 'Settings', onClick: onSettings }));
}


/* ══════════════════════════════════════════════════════════════════════
   exerciseCardEl  →  TP-7 exercise row
   ══════════════════════════════════════════════════════════════════════ */

// BEFORE ───────────────────────────────────────────────────────────────
function exerciseCardEl_BEFORE({ name, group, stars, setsInfo, onClick }) {
  const el = document.createElement('div');
  el.className = 'setup-card';
  el.innerHTML = `
    <span class="setup-card__name">${name}</span>
    <span class="setup-card__group">${group}</span>
    <span class="setup-card__stars">${'★'.repeat(stars)}</span>
    <span class="setup-card__sets">${setsInfo}</span>`;
  el.onclick = onClick;
  return el;
}

// AFTER ────────────────────────────────────────────────────────────────
function exerciseCardEl({ index, name, group, effort, sets, repLo, repHi, logCount, onClick }) {
  const complete = logCount >= sets;
  return h('div', { class: 'tp7-row', style: 'padding:13px 14px', onclick: onClick },
    h('div', { style: 'display:flex;gap:12px' },
      /* index number */
      h('span', {
        class: 'tp7-mono',
        style: 'font-size:var(--text-sm);color:var(--text-tertiary);padding-top:1px;min-width:22px',
      }, String(index + 1).padStart(2, '0')),
      /* content */
      h('div', { style: 'flex:1;min-width:0' },
        /* title row */
        h('div', { style: 'display:flex;align-items:flex-start;justify-content:space-between;gap:10px' },
          h('div', { style: 'flex:1;min-width:0;font:var(--weight-semibold) var(--text-md)/1.2 var(--font-sans);text-wrap:pretty' }, name),
          ui.groupTag(group)),           /* replaces .setup-card__group */
        /* meta row */
        h('div', { style: 'display:flex;align-items:center;gap:14px;margin-top:11px' },
          ui.effortMeter(effort),        /* replaces ★★★ stars */
          h('span', { class: 'tp7-mono', style: 'font-size:var(--text-xs);color:var(--text-secondary)' },
            `${sets}\u00d7${repLo}\u2013${repHi}`),
          h('div', { style: 'flex:1' }),
          /* log progress badge */
          logCount > 0
            ? (complete
                ? ui.badge('ЗАПИСАНО', { variant: 'solid' })
                : h('span', { class: 'tp7-mono', style: 'font-size:var(--text-2xs);font-weight:700;color:var(--text-tertiary)' },
                    `${logCount}/${sets}`))
            : null,
          icon('chevR', { size: 16 })))));
}


/* ══════════════════════════════════════════════════════════════════════
   chipEl  →  TP-7 badge / status chip
   ══════════════════════════════════════════════════════════════════════ */

// BEFORE ───────────────────────────────────────────────────────────────
function chipEl_BEFORE(text, { active } = {}) {
  const el = document.createElement('span');
  el.className = 'chip' + (active ? ' chip--active' : '');
  el.textContent = text;
  return el;
}

// AFTER ────────────────────────────────────────────────────────────────
// Inline status text (e.g. "ЗАПИСАНО", "3/3")
function chipEl(text, { variant = 'neutral', dot = false } = {}) {
  return ui.badge(text, { variant, dot });
}
// Variant guide:
//   variant: 'neutral'  → grey chip (default)
//   variant: 'solid'    → black/white (DONE state)
//   variant: 'live'     → orange + pulsing dot (ACTIVE / CONNECTED)
//   variant: 'outline'  → ghost (secondary metadata)


/* ══════════════════════════════════════════════════════════════════════
   emptyStateEl  →  TP-7 recessed empty state
   ══════════════════════════════════════════════════════════════════════ */

// BEFORE ───────────────────────────────────────────────────────────────
function emptyStateEl_BEFORE({ message }) {
  const el = document.createElement('div');
  el.className = 'empty-state';
  el.textContent = message;
  return el;
}

// AFTER ────────────────────────────────────────────────────────────────
function emptyStateEl({ headline, body }) {
  return h('div', { class: 'tp7-card tp7-card--sunken', style: 'text-align:center;padding:22px 18px' },
    h('div', {
      class: 'tp7-mono',
      style: 'font-size:var(--text-2xs);font-weight:600;letter-spacing:var(--tracking-wide);text-transform:uppercase;color:var(--text-secondary);margin-bottom:8px',
    }, headline),
    h('div', {
      style: 'font:var(--weight-regular) var(--text-sm)/1.4 var(--font-sans);color:var(--text-tertiary);max-width:240px;margin:0 auto',
    }, body));
}


/* ══════════════════════════════════════════════════════════════════════
   setRowEl  →  TP-7 logged set row
   ══════════════════════════════════════════════════════════════════════ */

// BEFORE ───────────────────────────────────────────────────────────────
function setRowEl_BEFORE({ index, weight, reps }) {
  const el = document.createElement('div');
  el.className = 'set-row';
  el.innerHTML = `<span>Set ${index + 1}</span><span>${weight}kg × ${reps}</span>`;
  return el;
}

// AFTER ────────────────────────────────────────────────────────────────
function setRowEl({ index, weight, reps, unit = 'КГ' }) {
  return h('div', {
    style: 'display:flex;align-items:center;gap:12px;padding:11px 14px;' +
           'background:var(--bg-sunken);border:1px solid var(--border-channel);' +
           'box-shadow:var(--shadow-inset);border-radius:var(--radius-sm)',
  },
    h('span', { class: 'tp7-mono', style: 'font-size:var(--text-2xs);font-weight:700;letter-spacing:var(--tracking-wide);color:var(--text-tertiary);min-width:46px' },
      `СЕТ ${index + 1}`),
    h('span', { class: 'tp7-mono', style: 'font-size:var(--text-md);font-weight:600' },
      `${weight} ${unit} \u00d7 ${reps}`),
    h('div', { style: 'flex:1' }),
    h('span', { class: 'tp7-mono', style: 'font-size:var(--text-xs);color:var(--text-tertiary)' },
      `${Math.round(weight * reps)} ${unit}`),
    icon('pencil', { size: 15 }));
}


/* ══════════════════════════════════════════════════════════════════════
   primaryBtnEl  →  TP-7 critical button (THE orange key)
   ══════════════════════════════════════════════════════════════════════
   RULE: only ONE critical button per view.
   ══════════════════════════════════════════════════════════════════════ */

// BEFORE ───────────────────────────────────────────────────────────────
function primaryBtnEl_BEFORE(label, onClick) {
  const el = document.createElement('button');
  el.className = 'btn btn--primary btn--block';
  el.textContent = label;
  el.onclick = onClick;
  return el;
}

// AFTER ────────────────────────────────────────────────────────────────
function primaryBtnEl(label, onClick) {
  return ui.button(label, {
    variant: 'critical',
    size: 'lg',
    block: true,
    startIcon: icon('record', { size: 13 }),  // orange dot = record
    onClick,
  });
}


/* ══════════════════════════════════════════════════════════════════════
   secondaryBtnEl  →  TP-7 routine button
   ══════════════════════════════════════════════════════════════════════ */

function secondaryBtnEl(label, onClick) {
  return ui.button(label, { variant: 'routine', onClick });
}


/* ══════════════════════════════════════════════════════════════════════
   inputEl  →  TP-7 recessed data well
   ══════════════════════════════════════════════════════════════════════ */

// BEFORE ───────────────────────────────────────────────────────────────
function inputEl_BEFORE({ label, value, onChange }) {
  const el = document.createElement('input');
  el.className = 'input';
  el.value = value || '';
  el.oninput = (e) => onChange(e.target.value);
  return el;
}

// AFTER ────────────────────────────────────────────────────────────────
function inputEl({ label, value, placeholder, mono, onChange }) {
  const input = h('input', {
    value: value || '',
    placeholder: placeholder || '',
    oninput: (e) => onChange && onChange(e.target.value),
  });
  return h('div', { class: 'tp7-input' + (mono ? ' tp7-input--mono' : '') }, input);
}


/* ══════════════════════════════════════════════════════════════════════
   stepperEl  →  TP-7 telemetry stepper  (NEW — replaces manual +/- rows)
   ══════════════════════════════════════════════════════════════════════ */

function stepperEl({ label, value, step, min, unit, onChange }) {
  return ui.stepper(label, value, { step, min, unit, onChange });
}


/* ══════════════════════════════════════════════════════════════════════
   daySegmentEl  →  TP-7 segmented control
   ══════════════════════════════════════════════════════════════════════ */

// BEFORE ───────────────────────────────────────────────────────────────
function daySegmentEl_BEFORE(days, active, onSelect) {
  return h('div', { class: 'day-picker' },
    ...days.map((d) => {
      const btn = document.createElement('button');
      btn.className = 'day-picker__item' + (d.value === active ? ' is-active' : '');
      btn.textContent = d.label;
      btn.onclick = () => onSelect(d.value);
      return btn;
    }));
}

// AFTER ────────────────────────────────────────────────────────────────
function daySegmentEl(days, active, onSelect) {
  return ui.segmented(days, active, onSelect, { block: true });
}


/* ══════════════════════════════════════════════════════════════════════
   sessionDeckEl  →  TP-7 dark screen card + tape reel
   ══════════════════════════════════════════════════════════════════════
   NEW component — replaces your progress summary card.
   ══════════════════════════════════════════════════════════════════════ */

function sessionDeckEl({ dayLabel, done, total, sessionVolume, unit = 'КГ' }) {
  return h('div', { class: 'tp7-card tp7-card--screen', style: 'border-radius:var(--radius-lg);padding:16px' },
    h('div', { style: 'display:flex;align-items:center;gap:18px' },
      ui.tapeReel(total ? done / total : 0, {
        size: 96,
        label: `${done}/${total}`,
        spinning: done > 0,
      }),
      h('div', { style: 'display:flex;flex-direction:column;gap:16px;flex:1' },
        h('div', {},
          h('div', { class: 'tp7-readout__caption' }, 'СЕСІЯ · СЬОГОДНІ'),
          h('div', { style: 'font:var(--weight-bold) var(--text-lg)/1 var(--font-expanded);color:var(--grey-50)' },
            dayLabel)),
        h('div', { style: 'display:flex;gap:22px' },
          ui.litValue('ВПРАВ', `${done}/${total}`),
          ui.litValue('ОБ\u2019ЄМ СЕСІЇ',
            sessionVolume.toLocaleString('en-US').replace(/,/g, '\u202F'), unit)))));
}
