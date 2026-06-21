import { h, icon } from './tp7-ui.js';

export function doneTodayEl(logs, { selectedUuid, onSetClick } = {}) {
  if (logs.length === 0) {
    return h('div', { class: 'tp7-card tp7-card--sunken', style: 'text-align:center;padding:22px 18px' },
      h('div', { class: 'tp7-mono', style: 'font-size:var(--text-2xs);font-weight:600;letter-spacing:var(--tracking-wide);text-transform:uppercase;color:var(--text-secondary);margin-bottom:8px' },
        "ЩЕ НЕМАЄ ЗАПИСІВ"),
      h('div', { style: 'font:var(--weight-regular) var(--text-sm)/1.4 var(--font-sans);color:var(--text-tertiary)' },
        "Озбройте лічильник і натисніть оранжеву клавішу."));
  }

  return h('div', { style: 'display:flex;flex-direction:column;gap:7px' },
    ...logs.map((log, i) => {
      const isSelected = log.uuid === selectedUuid;
      const vol = Math.round(log.weight * log.reps);
      const row = h('div', {
        style: [
          'display:flex;align-items:center;gap:12px;padding:11px 14px;',
          'background:var(--bg-sunken);border:1px solid var(--border-channel);',
          'box-shadow:var(--shadow-inset);border-radius:var(--radius-sm);',
          onSetClick ? 'cursor:pointer;' : '',
          isSelected ? 'border-color:var(--orange-500);outline:1.5px solid var(--orange-500);' : '',
        ].join(''),
      },
        h('span', { class: 'tp7-mono', style: 'font-size:var(--text-2xs);font-weight:700;letter-spacing:var(--tracking-wide);color:var(--text-tertiary);min-width:46px' },
          `СЕТ ${i + 1}`),
        h('span', { class: 'tp7-mono', style: 'font-size:var(--text-md);font-weight:600;flex:1' },
          `${log.weight} кг × ${log.reps}`),
        h('span', { class: 'tp7-mono', style: 'font-size:var(--text-xs);color:var(--text-tertiary)' },
          `${vol} кг`),
        icon(isSelected ? 'check' : 'pencil', { size: 15 }));

      if (onSetClick) {
        row.addEventListener('click', () => onSetClick(log, i));
      }
      return row;
    }));
}
