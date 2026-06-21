# TP-7 × GYM LOGS — DEVELOPER HANDOFF
## Applying the design to your vanilla JS + IndexedDB app

---

## What's in this folder

| File | Purpose |
|---|---|
| `tp7.css` | Full TP-7 token set + every component class. Drop beside `app.css`. |
| `tp7-ui.js` | ES module: `h()` hyperscript, `icon()`, `ui.*` factory functions — mirrors `src/ui/components.js`. |
| `demo.html` | Working vanilla prototype. Identical visually to the React prototype; no framework. |
| `HANDOFF.md` | This document. |
| `component-map.js` | Side-by-side before → after for every component factory in your app. |

---

## Step 1 — Add the stylesheet

In your `index.html`, add **before** your existing `app.css`:

```html
<!-- TP-7 tokens + component classes -->
<link rel="stylesheet" href="src/ui/tp7.css">
<!-- your existing styles come after — they override where needed -->
<link rel="stylesheet" href="src/ui/app.css">
```

Copy `tp7.css` → `src/ui/tp7.css`.

---

## Step 2 — Add the UI factory module

Copy `tp7-ui.js` → `src/ui/tp7-ui.js`.

```js
// src/ui/components.js  — add at top
import { h, icon, ui } from './tp7-ui.js';
```

Your existing factory functions (`chipEl`, `exerciseCardEl`, …) keep working. Migrate them incrementally — one screen at a time.

---

## Step 3 — Token migration (app.css → CSS vars)

Replace your existing hardcoded values with TP-7 tokens. Nothing breaks if you do it screen by screen.

### Colors
| Old value | TP-7 token |
|---|---|
| `#FFFFFF` / `#F5F5F5` (background) | `var(--bg-primary)` |
| `#E0E0E0` (card surface) | `var(--surface-card)` |
| `#1A1A1A` (primary text) | `var(--text-primary)` |
| `#666` / `#888` (secondary text) | `var(--text-secondary)` |
| Your accent / brand color | `var(--orange-500)` `#FF4F00` |
| `#000` (icon / strong text) | `var(--grey-950)` |

### Typography
| Role | Token |
|---|---|
| Body text | `font: var(--type-body)` → Archivo 400 / 15px |
| Labels, tags, badges | `font: var(--weight-semibold) var(--text-xs)/1 var(--font-sans); text-transform: uppercase; letter-spacing: var(--tracking-label)` |
| Exercise names / headings | `font: var(--weight-semibold) var(--text-md)/1.2 var(--font-sans)` |
| Numbers / telemetry | `font-family: var(--font-mono); letter-spacing: var(--tracking-mono); font-variant-numeric: tabular-nums` |
| Screen title | `font: var(--weight-bold) var(--text-lg)/1 var(--font-expanded)` |

### Elevation — the three shadow recipes
```css
/* raised key / card — use on tappable rows, buttons, cards */
box-shadow: var(--shadow-key);
/* pressed — apply on :active */
box-shadow: var(--shadow-key-pressed);  transform: translateY(1px);
/* recessed well — use on inputs, read-only data panels, dark screen cards */
box-shadow: var(--shadow-inset);
```

### Radii
```css
--radius-sm: 2px;   /* keys, badges, chips */
--radius-md: 4px;   /* cards, panels */
--radius-lg: 8px;   /* large module cards, rounded containers */
```

---

## Step 4 — BEM class migration

`tp7.css` defines classes that map directly to your existing BEM names.

| Your class | TP-7 class | Notes |
|---|---|---|
| `.btn--primary` | `.tp7-btn.tp7-btn--critical` | Orange key; ONE per view |
| `.btn--secondary` | `.tp7-btn.tp7-btn--routine` | Dark key |
| `.btn--ghost` | `.tp7-btn.tp7-btn--ghost` | |
| `.btn--icon` | `.tp7-iconbtn` | Square transport key |
| `.card` | `.tp7-card` | Raised surface |
| `.card--dark` | `.tp7-card.tp7-card--screen` | Dark "display" surface |
| `.card--recessed` | `.tp7-card.tp7-card--sunken` | Recessed well |
| `.badge` / `.chip` | `.tp7-badge` | Mono status chip |
| `.badge--active` | `.tp7-badge.tp7-badge--live` | Orange + pulse dot |
| `.badge--done` | `.tp7-badge.tp7-badge--solid` | Black/white |
| `.seg-control` | `.tp7-seg.tp7-seg--block` | Day/mode switcher |
| `.seg-control__item.active` | `.tp7-seg__key.is-on` | |
| `.label`, `.eyebrow` | `.tp7-label` | Etched uppercase label |
| `.tag`, `.group-chip` | `.tp7-tag` | Muscle group / metadata tag |

---

## Step 5 — Component factory migration

See `component-map.js` for exact before → after for each factory.

### Quick reference

**Exercise row**
```js
// before (your components.js)
exerciseCardEl(ex)
// after
import { h, icon, ui } from './tp7-ui.js';
// build with ui.effortMeter, ui.groupTag, ui.badge — see component-map.js
```

**Primary action button**
```js
// before
h('button', { class: 'btn btn--primary' }, 'SAVE')
// after — THE orange key; only one per view
ui.button('ЗАПИСАТИ СЕТ', { variant: 'critical', size: 'lg', block: true })
```

**Input / data field**
```js
// before
h('input', { class: 'input' })
// after — add wrapper for the recessed well look
h('div', { class: 'tp7-input tp7-input--mono' }, h('input', { … }))
```

**Status / connection indicator**
```js
// before
chipEl('Connected')
// after
ui.badge('ПІДКЛЮЧЕНО', { variant: 'live', dot: true })
```

---

## Step 6 — Router integration

Your hash router maps `#home → #detail → #settings`. No changes needed to the routing logic. The TP-7 screens use the same contract:

```js
// your router.js — no changes
const ROUTES = {
  '#home':     renderHome,
  '#detail':   renderDetail,
  '#settings': renderSettings,
};
window.addEventListener('hashchange', () => {
  app.replaceChildren((ROUTES[location.hash] || renderHome)());
});
```

The only TP-7-specific addition: the back `<IconButton>` in each sub-screen calls `location.hash = '#home'`.

---

## Step 7 — IndexedDB / state wiring

`demo.html` uses a hard-coded `WORKOUT` array. Replace it with your real `store/` load:

```js
// demo line 65:
const WORKOUT = [/* hard-coded */];

// your app:
import { getExercises } from '../store/exercises.js';
const WORKOUT = await getExercises(currentDay);
```

Shape your store returns to match:
```ts
interface Exercise {
  id: string;
  name: string;           // display name (UA or EN)
  group: string;          // ГРУДИ | СПИНА | НОГИ | ПЛЕЧІ | РУКИ
  effort: 0 | 1 | 2 | 3; // replaces your star rating
  sets: number;           // target
  repLo: number;
  repHi: number;
  last: [kg: number, reps: number];
  log: Array<[kg: number, reps: number]>; // today's logged sets
}
```

---

## Step 8 — Dark mode

Add `.theme-dark` to any container (e.g. your `<main>` or the screen `<div>`) to flip it to the dark chassis. The token overrides are in `tp7.css` section 5.

```js
document.querySelector('#app').classList.toggle('theme-dark', userPrefersDark);
```

---

## The Record Principle (critical)

**Orange appears at most once per view.** It is reserved for the highest-stakes action:
- Home screen → no orange button (navigation only)
- Detail screen → `ЗАПИСАТИ СЕТ` is the one orange key
- Settings screen → no orange button

The orange live dot in the connection chip is the one permitted exception (it reads as a status indicator, not a control).

---

## File copy checklist

```
src/
  ui/
    tp7.css          ← copy from handoff/
    tp7-ui.js        ← copy from handoff/
    components.js    ← your existing file; migrate incrementally
    app.css          ← your existing file; tokens replace hardcoded values
```
