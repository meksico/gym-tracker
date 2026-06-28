/* ════════════════════════════════════════════════════════════════════
   TP-7 CORE — VANILLA UI FACTORIES
   Plain ES module. Every function returns a real DOM node (no framework).
   Mirrors the pattern of your src/ui/components.js (chipEl, exerciseCardEl…).
   Pair with tp7.css.   import { ui, icon } from './tp7-ui.js'
   ════════════════════════════════════════════════════════════════════ */

/* ── tiny hyperscript helper ─────────────────────────────────────────── */
export function h(tag, props = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else el.setAttribute(k, v);
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    el.appendChild(typeof kid === 'string' || typeof kid === 'number' ? document.createTextNode(String(kid)) : kid);
  }
  return el;
}

/* ── icons — transport + UI set, 24×24 currentColor ──────────────────── */
const ICONS = {
  barbell:'<line x1="3" y1="9" x2="3" y2="15"/><line x1="6" y1="6" x2="6" y2="18"/><line x1="18" y1="6" x2="18" y2="18"/><line x1="21" y1="9" x2="21" y2="15"/><line x1="6" y1="12" x2="18" y2="12"/>',
  gear:'<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5 5l2.1 2.1M16.9 16.9 19 19M19 5l-2.1 2.1M7.1 16.9 5 19"/>',
  chevR:'<path d="m9 5 7 7-7 7"/>',
  back:'<path d="m15 5-7 7 7 7"/>',
  play:'<path d="M7 4v16l13-8z" data-fill/>',
  stop:'<rect x="6" y="6" width="12" height="12" data-fill/>',
  record:'<circle cx="12" cy="12" r="8" data-fill/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  minus:'<path d="M5 12h14"/>',
  check:'<path d="m4 12 5 6L20 6"/>',
  pencil:'<path d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4"/>',
  ret:'<path d="M9 10 5 14l4 4"/><path d="M5 14h11a3 3 0 0 0 3-3V6"/>',
  star:    '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/>',
  starFill:'<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" data-fill/>',
};
export function icon(name, { size = 24, stroke = 2 } = {}) {
  const filled = /data-fill/.test(ICONS[name] || '');
  const svg = `<svg viewBox="0 0 24 24" width="${size}" height="${size}" ${filled ? 'fill="currentColor"' : 'fill="none" stroke="currentColor" stroke-width="' + stroke + '" stroke-linecap="square"'}>${(ICONS[name] || '').replace(/ data-fill/g, '')}</svg>`;
  return h('span', { html: svg, style: { display: 'inline-flex' } }).firstChild;
}

/* ── primitives ──────────────────────────────────────────────────────── */
export const ui = {
  button(label, { variant = 'surface', size = 'md', block, startIcon, onClick, disabled } = {}) {
    const cls = ['tp7-btn', variant !== 'surface' && `tp7-btn--${variant}`, size !== 'md' && `tp7-btn--${size}`, block && 'tp7-btn--block'].filter(Boolean).join(' ');
    return h('button', { type: 'button', class: cls, onClick, disabled }, startIcon || false, label);
  },

  iconButton(name, { variant = 'surface', size = 'md', label, onClick } = {}) {
    const cls = ['tp7-iconbtn', variant !== 'surface' && `tp7-iconbtn--${variant}`, size !== 'md' && `tp7-iconbtn--${size}`].filter(Boolean).join(' ');
    return h('button', { type: 'button', class: cls, 'aria-label': label || name, onClick }, icon(name));
  },

  badge(text, { variant = 'neutral', dot } = {}) {
    return h('span', { class: `tp7-badge${variant !== 'neutral' ? ' tp7-badge--' + variant : ''}` },
      dot ? h('span', { class: 'tp7-badge__dot' }) : false, text);
  },

  groupTag(text) {
    return h('span', {
      class: 'tp7-mono',
      style: { display: 'inline-flex', alignItems: 'center', height: '20px', padding: '0 7px',
        fontSize: 'var(--text-2xs)', fontWeight: 700, letterSpacing: 'var(--tracking-wide)', textTransform: 'uppercase',
        color: 'var(--text-tertiary)', background: 'var(--grey-150)', border: '1px solid var(--border-channel)',
        boxShadow: 'var(--shadow-inset)', borderRadius: 'var(--radius-sm)' },
    }, text);
  },

  eyebrow(text) { return h('span', { class: 'tp7-eyebrow' }, text); },

  effortMeter(level = 0, max = 3) {
    return h('span', { class: 'tp7-effort' },
      ...Array.from({ length: max }, (_, i) =>
        h('span', { class: 'tp7-effort__tick' + (i < level ? ' is-lit' : ''), style: { height: (6 + i * 4) + 'px' } })));
  },

  segmented(items, value, onChange, { block = true } = {}) {
    return h('div', { class: 'tp7-seg' + (block ? ' tp7-seg--block' : '') },
      ...items.map((it) => h('button', {
        type: 'button', class: 'tp7-seg__key' + (it.value === value ? ' is-on' : ''),
        onClick: () => onChange(it.value),
      }, it.label)));
  },

  /* lit telemetry value for a dark screen */
  litValue(caption, value, unit, { glow = true } = {}) {
    return h('div', {},
      h('div', { class: 'tp7-readout__caption' }, caption),
      h('div', { style: { display: 'flex', alignItems: 'baseline' } },
        h('span', { class: 'tp7-readout__value' + (glow ? '' : ' '), style: glow ? {} : { textShadow: 'none' } }, value),
        unit ? h('span', { class: 'tp7-readout__unit' }, unit) : false));
  },

  /* the signature tape reel (svg ring + machined disc) */
  tapeReel(progress = 0, { size = 96, label = '', spinning = false, rpm = 10 } = {}) {
    const R = size / 2, ring = R - 6, circ = 2 * Math.PI * ring;
    const wrap = h('div', { class: 'tp7-reel' + (spinning ? ' tp7-reel--spin' : ''), style: { width: size + 'px', height: size + 'px', '--reel-dur': (60 / rpm) + 's' } });
    wrap.innerHTML = `<svg width="${size}" height="${size}" style="position:absolute;inset:0;transform:rotate(-90deg)">
      <circle cx="${R}" cy="${R}" r="${ring}" fill="none" stroke="var(--grey-300)" stroke-width="3"/>
      <circle cx="${R}" cy="${R}" r="${ring}" fill="none" stroke="var(--orange-500)" stroke-width="3"
        stroke-dasharray="${circ}" stroke-dashoffset="${circ * (1 - Math.max(0, Math.min(1, progress)))}"
        style="transition:stroke-dashoffset var(--dur-base) linear"/></svg>`;
    const disc = h('div', { class: 'tp7-reel__disc' });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * 360, s = size * 0.07;
      disc.appendChild(h('span', { class: 'tp7-reel__spoke', style: {
        width: s + 'px', height: s + 'px', marginLeft: -(s / 2) + 'px', marginTop: -(s / 2) + 'px',
        transform: `rotate(${a}deg) translateY(-${size * 0.27}px)` } }));
    }
    disc.appendChild(h('div', { class: 'tp7-reel__hub' }, label));
    wrap.appendChild(disc);
    return wrap;
  },

  /* recessed weight/reps stepper:  −  [value]  + */
  stepper(label, value, { unit, step = 1, min = 0, onChange } = {}) {
    const well = h('div', { style: {
      flex: '1', minWidth: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
      height: '48px', background: 'var(--grey-50)', border: '1px solid var(--border-channel)',
      boxShadow: 'var(--shadow-inset)', borderRadius: 'var(--radius-sm)' } });
    const num = h('span', { class: 'tp7-mono', style: { fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--text-primary)' } }, String(value));
    well.append(num, unit ? h('span', { class: 'tp7-mono', style: { fontSize: 'var(--text-2xs)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 'var(--tracking-wide)', color: 'var(--text-tertiary)' } }, unit) : '');
    let cur = value;
    const set = (v) => { cur = +(Math.max(min, v)).toFixed(2); num.textContent = String(cur); onChange && onChange(cur); };
    return h('div', { style: { flex: '1', minWidth: '0' } },
      h('div', { style: { font: 'var(--weight-semibold) var(--text-2xs)/1 var(--font-sans)', letterSpacing: 'var(--tracking-label)', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '8px', textAlign: 'center' } }, label),
      h('div', { style: { display: 'flex', gap: '7px' } },
        ui.iconButton('minus', { size: 'lg', label: label + ' -', onClick: () => set(cur - step) }),
        well,
        ui.iconButton('plus', { size: 'lg', label: label + ' +', onClick: () => set(cur + step) })));
  },
};
