# CLAUDE CODE AGENT BRIEF
## Task: Apply TP-7 Design System to Gym Tracker (vanilla JS)

---

## YOUR MISSION

Migrate the visual design of an existing vanilla-JS gym tracker web app to the **TP-7 Core industrial design system**. You have a complete working reference implementation (vanilla port) and all assets. This is a **reskin + component swap** — do not change routing logic, IndexedDB store, or business logic. Only touch markup, CSS classes, shadow DOM factories, and styles.

---

## SOURCE APP ARCHITECTURE (do not change these)

```
src/
  router.js           — hash-based (#home, #detail, #settings)
  store/              — IndexedDB wrappers (exercises, sessions, sets)
  ui/
    components.js     — DOM factory functions (exerciseCardEl, chipEl, etc.)
    app.css           — existing BEM-ish styles (.setup-card, .btn--primary…)
index.html
```

- **Framework:** none — native ES Modules, no bundler
- **Rendering:** `document.createElement` / `appendChild` factory functions
- **Routing:** `hashchange` listener, `location.hash` for navigation
- **State:** module-level variables + IndexedDB via `src/store/`

---

## ASSETS TO ADD (from the handoff zip)

Copy these two files into `src/ui/`:

| File | Destination |
|---|---|
| `handoff/tp7.css` | `src/ui/tp7.css` |
| `handoff/tp7-ui.js` | `src/ui/tp7-ui.js` |

---

## STEP 1 — index.html: load tokens + fonts

Add **before** the existing `<link rel="stylesheet" href="src/ui/app.css">`:

```html
<!-- TP-7 tokens + component classes (load FIRST so app.css can override) -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="src/ui/tp7.css">
```

Add class `tp7` to `<body>` (or the root `<div id="app">`). This scopes all TP-7 base styles.

---

## STEP 2 — import the factory module

At the top of `src/ui/components.js`:

```js
import { h, icon, ui } from './tp7-ui.js';
```

`h(tag, props, ...children)` is a tiny hyperscript helper.
`icon(name)` returns an inline SVG node (names: `barbell`, `gear`, `chevR`, `back`, `play`, `stop`, `record`, `plus`, `minus`, `check`, `pencil`, `ret`).
`ui.*` are the high-level factory functions — see Step 4.

---

## STEP 3 — token migration in app.css

Replace hardcoded values with TP-7 CSS custom properties. **Do not remove app.css** — only update the values.

### Colors
| Replace | With |
|---|---|
| White / near-white backgrounds | `var(--bg-primary)` |
| Card / panel backgrounds | `var(--surface-card)` |
| Primary text color | `var(--text-primary)` |
| Secondary / muted text | `var(--text-secondary)` |
| Your accent / brand color | `var(--orange-500)` — `#FF4F00` |
| Black icons, strong text | `var(--grey-950)` |
| Borders / dividers | `var(--border-hairline)` |
| Input / recessed backgrounds | `var(--bg-sunken)` |

### Shadows — replace ALL `box-shadow` declarations with ONE of these three:
```css
/* raised tappable surface (cards, buttons, list rows) */
box-shadow: var(--shadow-key);
/* pressed state — pair with transform: translateY(1px) */
box-shadow: var(--shadow-key-pressed);
/* recessed well (inputs, read-only data panels, dark cards) */
box-shadow: var(--shadow-inset);
```

### Typography
```css
/* headings / screen titles */
font: var(--weight-bold) var(--text-lg)/1 var(--font-expanded);
/* exercise / item names */
font: var(--weight-semibold) var(--text-md)/1.2 var(--font-sans);
/* body */
font: var(--type-body);
/* labels, eyebrows, badges (UPPERCASE + tracked) */
font: var(--weight-semibold) var(--text-xs)/1 var(--font-sans);
text-transform: uppercase; letter-spacing: var(--tracking-label);
/* numbers, counters, units (monospace, tabular) */
font-family: var(--font-mono);
letter-spacing: var(--tracking-mono);
font-variant-numeric: tabular-nums;
```

### Radii
```css
--radius-sm: 2px   /* keys, badges, chips */
--radius-md: 4px   /* cards, panels */
--radius-lg: 8px   /* large module cards */
```

### Transitions (all interactive elements)
```css
transition:
  box-shadow var(--dur-press) var(--ease-mech),
  transform  var(--dur-press) var(--ease-mech);
```

---

## STEP 4 — component factory migrations

Reference `handoff/component-map.js` for the complete before/after of each factory. Quick summary:

### App header
```js
// BEFORE
appHeaderEl({ title, onSettings })
// AFTER — wrap with appbar layout, add TP-7 iconButton for gear
h('header', { class:'appbar' },
  icon('barbell', { size:26 }),
  h('div', { style:'flex:1' }, /* title + tagline */ ),
  ui.iconButton('gear', { label:'Settings', onClick:onSettings }))
```

### Exercise list row
```js
// BEFORE
exerciseCardEl({ name, group, stars, onClick })
// AFTER
// use ui.effortMeter(effort) instead of stars
// use ui.groupTag(group) for the muscle group chip
// wrap in h('div', { class:'tp7-row', onclick }) for tactile key feel
// see component-map.js → exerciseCardEl for the full 25-line factory
```

### Status / connection chip
```js
chipEl('Connected')                          // BEFORE
ui.badge('ПІДКЛЮЧЕНО', { variant:'live', dot:true })  // AFTER
```

### Primary action button (THE orange key — one per view)
```js
h('button', { class:'btn btn--primary' }, 'Save')   // BEFORE
ui.button('ЗАПИСАТИ СЕТ', {                          // AFTER
  variant: 'critical', size: 'lg', block: true,
  startIcon: icon('record', { size:13 }),
  onClick,
})
```

### Secondary / neutral button
```js
ui.button('ВИЙТИ З АКАУНТУ', { variant:'routine' })
```

### Weight/reps stepper (+/- row)
```js
// replaces any hand-rolled increment/decrement controls
ui.stepper('ВАГА (КГ)', weight, {
  step:2.5, min:0,
  onChange:(v) => { weight = v; refreshVol(); }
})
```

### Day/mode selector
```js
ui.segmented(
  [{ value:'mon', label:'ПН' }, { value:'wed', label:'СР' }, { value:'fri', label:'ПТ' }],
  activeDay,
  (v) => setDay(v),
  { block: true }
)
```

### Session progress card (dark screen + tape reel)
```js
// replaces your progress summary card entirely
h('div', { class:'tp7-card tp7-card--screen', style:'border-radius:var(--radius-lg);padding:16px' },
  h('div', { style:'display:flex;align-items:center;gap:18px' },
    ui.tapeReel(done / total, { size:96, label:`${done}/${total}`, spinning: done > 0 }),
    h('div', { style:'display:flex;flex-direction:column;gap:16px;flex:1' },
      // day name heading (white on dark)
      // ui.litValue() for "ВПРАВ" and "ОБ'ЄМ СЕСІЇ" readouts
    )))
```

### Empty state
```js
emptyStateEl({ message })                            // BEFORE
h('div', { class:'tp7-card tp7-card--sunken', style:'text-align:center;padding:22px 18px' },
  h('div', { class:'tp7-label', style:'margin-bottom:8px' }, 'ЩЕ НЕМАЄ ЗАПИСІВ'),
  h('div', { style:'font:var(--type-body);color:var(--text-tertiary)' }, message))
```

### Logged set row
```js
setRowEl({ index, weight, reps })  // BEFORE → see component-map.js → setRowEl
// key shape: recessed panel, mono font, weight×reps, volume on right, pencil icon
```

### Avatar / initials (settings screen)
```js
h('div', { style:
  'width:48px;height:48px;border-radius:50%;flex:none;' +
  'background:radial-gradient(circle at 50% 35%,var(--grey-800),var(--grey-950));' +
  'border:1px solid #000;box-shadow:var(--shadow-key);' +
  'display:flex;align-items:center;justify-content:center;' +
  'font:var(--weight-bold) 16px/1 var(--font-mono);color:var(--grey-50)' }, 'EG')
```

---

## STEP 5 — screen-level layout rules

### All screens
- `<body class="tp7">` (or root div)
- `background: var(--bg-primary)` — the warm aluminium-grey chassis
- App bar: flex row, 14px top/bottom padding, `background: var(--bg-primary)`, `border-bottom: 1px solid var(--border-hairline)`, `box-shadow: 0 1px 0 rgba(255,255,255,.6)`
- Screen body: `overflow-y: auto`, `padding: 16px 16px 28px`
- Hide scrollbars: `::-webkit-scrollbar { width:0 }`

### Home screen
1. App bar with barbell icon + GYM_LOGS wordmark + gear key
2. Dark session deck card (`tp7-card--screen`) with tape reel
3. Day segmented control
4. Exercise rows with effort meter + group tag + progress badge

### Detail screen
1. App bar with back key + exercise name + exercise number
2. Technique button (plain key, full width)
3. "Logged today" eyebrow + set count
4. Logged set rows (recessed, OR sunken empty state)
5. **Dock** pinned to bottom: recall button + small reel, steppers row, volume readout, orange record key

### Settings screen
1. App bar with back key + НАЛАШТУВАННЯ title
2. Connection chip (live orange dot)
3. Account card (avatar + name + email + sign-out button)

---

## STEP 6 — IndexedDB wiring (no changes needed)

The TP-7 factories accept the same data shape your store already returns. Only map two things:

```js
// your stars/rating (1-3) → effort (0-3)
// treat: 0 stars = 0, 1 star = 1, 2 stars = 2, 3 stars = 3
effort: exercise.rating ?? 0

// your sets log [[weight, reps], …] → same shape, unchanged
log: exercise.todaySets   // Array<[number, number]>
```

---

## STEP 7 — dark mode (optional, one line)

```js
document.getElementById('app').classList.toggle('theme-dark', prefersDark);
```

`tp7.css` section 5 has all token overrides — no other CSS needed.

---

## THE RECORD PRINCIPLE — must never be violated

> **Orange (`var(--orange-500)`) appears AT MOST ONCE per view.**

It is reserved for the highest-stakes action only:
- `variant: 'critical'` on `ui.button()` = the orange key
- One per screen maximum
- The live dot in status chips is the only exception (reads as an indicator, not a control)
- NEVER use orange for decoration, highlights, hover states, or secondary actions

---

## WORKING REFERENCE

`handoff/demo.html` is a complete, clean, working implementation of all three screens in vanilla JS using `tp7-ui.js` + `tp7.css`. **Read it first.** Every factory call, layout decision, and string is there. The JS module starts at the `<script type="module">` tag and is ~180 lines — study it before writing any code.

---

## STRINGS / i18n note

Ukrainian apostrophes (`'`) in JS template literals will **break string parsing** if you use single-quote string delimiters. Always use **double quotes** for JS strings containing Ukrainian text, or use `\u2019` for the apostrophe character.

```js
// WRONG — parser sees end-of-string at the apostrophe
const s = 'ОБ'ЄМ СЕСІЇ';
// CORRECT
const s = "ОБ\u2019ЄМ СЕСІЇ";
```

---

## SUCCESS CRITERIA

- [ ] All three screens (home, detail, settings) render with TP-7 token styles
- [ ] No hardcoded color hex values remain in component factories
- [ ] `app.css` uses `var(--*)` tokens for all colors, shadows, radii, and type
- [ ] Only one orange element per view (record button OR live dot)
- [ ] Effort meter replaces star rating
- [ ] Session deck card uses tape reel progress indicator
- [ ] Steppers replace hand-rolled +/- controls on detail screen
- [ ] All tappable rows have `var(--shadow-key)` and `:active` depression
- [ ] No library or framework added — pure ES Modules only
- [ ] No changes to `router.js`, `store/`, or any IndexedDB logic
