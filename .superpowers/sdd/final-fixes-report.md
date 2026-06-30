# Final Review Fixes Report

**Branch:** feat/atlas-kiosko-turismo  
**Date applied:** 2026-06-30

## BASE SHA
a7ef5fbd0b50695833ce34d16292f72fe27d74b6

## Changes Applied

### FIX 1 — addBuildings async race (app.js)
After `await loadBuildings()`, added guard `if (!isTerrain || !map || !map.isStyleLoaded()) return;` to prevent stale resolution from adding layers after the user toggled Relieve off or style changed. Wrapped `addSource`/`addLayer`/`setData` block in `try { … } catch (e) {}`.

### FIX 2 — aria-pressed sync on toggles (app.js)
`toggleTerrain()`: sets `btn.setAttribute('aria-pressed', 'true'/'false')` alongside classList changes.  
`toggleSatellite()`: same pattern.

### FIX 3 — Theme button icon-only (app.js + index.html + data.js)
Boot-sync block: removed dead `.floating-pill-icon`/`.floating-pill-label` querySelector lines; now sets `themeBtn.textContent` and `themeBtn.setAttribute('aria-pressed', …)` directly.  
`toggleTheme()`: same refactor.  
`index.html`: `#btnTheme` `data-i18n-title` changed from `"darkMode"` to `"themeToggle"`.  
`data.js`: added `themeToggle` key in all 4 languages (es/en/fr/de). Confirmed 4 occurrences.

### FIX 4 — Overflow ARIA disclosure (index.html)
Removed `role="menu"` from `#mapToolbarMore`.  
Removed `aria-haspopup="true"` from `#btnToolbarMore`.  
Added `aria-controls="mapToolbarMore"` to `#btnToolbarMore`.

### FIX 5 — Honest wording in CHANGELOG (docs/CHANGELOG.md)
Changed `Modal con focus-trap + Escape` → `Modal con foco inicial + Escape + aria-modal`.

## Verification Results
- `node --check app.js data.js`: SYNTAX OK
- `node tests/fetch-events.test.mjs`: OK sanitizeHtml: 11/11 (incl. regresión XSS)
- `node tests/geo-buildings.test.mjs`: OK geo-buildings: 1 feature(s)
- `themeToggle` in data.js: 4 occurrences (es/en/fr/de) ✓

## HEAD SHA
(see git log after commit)
