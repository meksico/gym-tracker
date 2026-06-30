# Gym Tracker — Claude Instructions

## Project Overview
Vanilla JS offline-first PWA. No build tool, no framework — browser-native ESM modules served directly to GitHub Pages. Backend is Google Sheets via REST API. IndexedDB for local storage.

## UI Element ID Convention (MANDATORY)

**Every logical DOM block must have a stable `id` attribute.** This applies to all new UI code without exception.

### Naming pattern
```
{screen}-{block}
```
- Always kebab-case
- Prefixed by screen so IDs are globally unique as the app grows
- Descriptive but concise

### Screen prefixes
| Screen | Prefix |
|---|---|
| Home | `home-` |
| Exercise modal | `modal-` |
| Login | `login-` |
| Settings | `settings-` |

### When writing new UI
- Add `id` to every top-level section, card, bar, list, and interactive control
- Dynamic/repeated rows: `{screen}-{block}-{key}` e.g. `home-exercise-row-3`, `modal-set-row-1`
- Inline elements inside a labelled block do NOT need IDs (e.g. individual `<span>` inside a named card)

### ID catalogue (current)

**Home screen** (`src/ui/home.js`)
| ID | Element |
|---|---|
| `home-appbar` | Header bar |
| `home-sync-banner` | Sync error / auth-expired banner |
| `home-day-selector` | Sticky Mon/Wed/Fri segmented control bar |
| `home-session-hero` | Dark card: tape reel + done/total + session volume |
| `home-exercise-list` | Container for all exercise rows |
| `home-exercise-row-{id}` | Each exercise row (keyed by `ex.id`) |
| `home-empty-state` | "No exercises" placeholder card |
| `home-body` | Relative wrapper around the scroll area + floating action panel |
| `home-action-panel` | Floating bottom panel, pinned over the exercise list |
| `home-action-bar` | Row of action buttons inside the panel |
| `home-bodyweight-btn` | "ВАГА ТІЛА" button — shows latest weight, toggles the input row |
| `home-bodyweight-row` | Expandable row with weight input + save button |
| `home-bodyweight-input` | Editable weight input, prefilled from latest BodyWeight sheet value |
| `home-bodyweight-save-btn` | Save button for the body-weight entry |

**Exercise modal** (`src/ui/exerciseModal.js`, `src/ui/doneToday.js`)
| ID | Element |
|---|---|
| `modal-appbar` | Header bar with back button + exercise name |
| `modal-yt-section` | YouTube technique button + expandable video panel |
| `modal-sets-header` | "ВИКОНАНО СЬОГОДНІ" label row |
| `modal-sets-list` | Wrapper div for all logged-set rows |
| `modal-set-row-{n}` | Each set row, 1-indexed |
| `modal-dock` | Pinned bottom form (weight/reps/save) |
| `modal-edit-badge` | "Editing set N" indicator strip |
| `modal-recall-row` | Row containing recall button + tape reel |
| `modal-recall-btn` | "ОСТАННІЙ: X кг" recall button |
| `modal-reel` | Tape reel wrap |
| `modal-step-row` | Weight + reps stepper row |
| `modal-weight-input` | Weight `<input>` field |
| `modal-volume-display` | "ОБʼЄМ … кг" readout |
| `modal-save-btn` | Orange "ЗАПИСАТИ СЕТ" / "ОНОВИТИ" button |
| `modal-cancel-btn` | "СКАСУВАТИ" cancel button |

**Login screen** (`src/ui/loginScreen.js`)
| ID | Element |
|---|---|
| `login-screen` | Full-screen setup wrapper |
| `login-card` | Central login card |
| `login-btn-container` | Google sign-in button slot |
| `login-error` | Error / access-denied message |

**Settings screen** (`src/ui/settings.js`)
| ID | Element |
|---|---|
| `settings-appbar` | Header bar |
| `settings-scroll` | Scrollable body |
| `settings-connection-chip` | "ПІДКЛЮЧЕНО · GOOGLE SHEETS" status chip |
| `settings-account-card` | Google account card |
| `settings-log-section` | Debug log card |
| `settings-log-list` | Scrollable log entries div |
| `settings-log-clear-btn` | "ОЧИСТИТИ" button |
| `settings-debug-toggle` | "DEBUG: ON/OFF" toggle button |
| `settings-version` | "GYM TRACKER rN" version chip |

---

## Key Architecture Notes
- **No build step** — files are served as-is; any new `.js` file must be added to `SHELL_ASSETS` in `sw.js` and the cache version bumped
- **DB version** — bump `DB_VERSION` in `src/config.js` whenever a new IndexedDB object store is added
- **Versioning** — `src/lib/version.js` exports `getAppVersion()`, which live-fetches the latest `main` commit short-SHA from the GitHub API and caches it in `localStorage` for offline use. No build/commit-time step involved.
- **Logging** — use `logger` from `src/lib/logger.js` (not `console.*`) for all app events
