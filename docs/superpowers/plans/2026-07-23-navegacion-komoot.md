# Navegación Komoot v3 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sustituir el cajón por navegación estilo Komoot: chips de categoría + panel izquierdo en escritorio, bottom-nav de 5 tabs en móvil, 5 categorías sin duplicados, filtros de sector en Negocios.

**Architecture:** Evolución in-place. La lógica de datos del cajón (`_cajonBranchItems`, `_cajonWrap`, búsqueda, deep links) se conserva; cambia la presentación: un estado nuevo `_navActiveBranch` gobierna qué categoría muestra el panel (escritorio) o el sheet (móvil), y una fila de chips sustituye a los ojos 👁 con el patrón check-en-píldora de Komoot.

**Tech Stack:** Vanilla HTML/CSS/JS, sin build. MapLibre. i18n vía `TRANSLATIONS`/`t()`. Spec: `docs/superpowers/specs/2026-07-23-navegacion-komoot-design.md`.

## Global Constraints

- Vanilla JS, funciones globales `window.X` (el HTML usa `onclick="…"`). Sin export/import.
- `data.js` es source of truth: pertenencia a costa vía `coast: true`, paleta en `BUSINESS_CATEGORIES`.
- Deep links intactos: `#ruta=`, `#patrimonio=`, `#negocio=`, `#3d=`, `#item=ID`.
- Modo kiosco (`window.KIOSCO` / `html[data-kiosco]`) no se toca; smoke al final.
- **Cada commit que toque shell (app.js, data.js, index.html, styles-v3.css, sw.js) bumpea `CACHE_VERSION` en sw.js en ese mismo commit** (guard del CI). Sufijos: `v3.2026.07.23a`, `b`, `c`…
- No hay test runner: cada task verifica con `node --check` + smoke en navegador (`python -m http.server 8000`, pestaña nueva, SW desregistrado).
- Componentes nuevos usan tokens semánticos de `styles-v3.css` (`--surface`, `--text`, …), nunca hex hardcoded en CSS.
- i18n: toda cadena nueva de UI en es/en/fr/de vía `TRANSLATIONS` + `data-i18n` o `t()`.
- Commits con `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: data.js — flags de costa, i18n nueva, paleta de sectores

**Files:**
- Modify: `data.js` (POIs `ria-ajo`/`ojerada`/`faro-ajo`/`cabo-quintres`; `TRANSLATIONS` es/en/fr/de; `BUSINESS_CATEGORIES`)
- Modify: `sw.js` (CACHE_VERSION → `v3.2026.07.23a`)

**Interfaces:**
- Produces: propiedad `coast: true` en los 4 POIs de costa; claves i18n `catCoast`, `tabCoast`, `navHome`, `chipLayerShow`, `chipLayerHide`, `panelCollapse`, `panelExpand`, `bizFilterAll`, `heritageChurches`, `heritageMore`; nuevos colores en `BUSINESS_CATEGORIES[k].color`.

- [ ] **Step 1: Añadir `coast: true`** en los objetos de `costaPoints` con id `ria-ajo`, `ojerada`, `faro-ajo`, `cabo-quintres` (justo después de `name:`). No tocar `ermita-san-roque` ni `molino-venera`.

- [ ] **Step 2: Claves i18n nuevas** en `TRANSLATIONS` (bloques es/en/fr/de):

| clave | es | en | fr | de |
|---|---|---|---|---|
| catCoast | Playas y costa | Beaches & coast | Plages et littoral | Strände & Küste |
| tabCoast | Costa | Coast | Littoral | Küste |
| navHome | Inicio | Home | Accueil | Start |
| chipLayerShow | Mostrar en el mapa | Show on map | Afficher sur la carte | Auf der Karte zeigen |
| chipLayerHide | Ocultar del mapa | Hide from map | Masquer de la carte | Von der Karte ausblenden |
| panelCollapse | Plegar panel | Collapse panel | Replier le panneau | Panel einklappen |
| panelExpand | Desplegar panel | Expand panel | Déplier le panneau | Panel ausklappen |
| bizFilterAll | Todos | All | Tous | Alle |
| heritageChurches | Iglesias y ermitas | Churches & chapels | Églises et ermitages | Kirchen & Kapellen |
| heritageMore | Más patrimonio | More heritage | Autre patrimoine | Weiteres Erbe |

- [ ] **Step 3: Paleta armonizada** en `BUSINESS_CATEGORIES` (labels/emojis intactos):

```js
const BUSINESS_CATEGORIES = {
    all:          { label: 'Todos',        emoji: '📍', color: '#5865C0' },
    alojamiento:  { label: 'Alojamiento',  emoji: '🏨', color: '#6D5BD0' },
    restauracion: { label: 'Restaurantes', emoji: '🍽️', color: '#C0564A' },
    comercio:     { label: 'Comercio',     emoji: '🛒', color: '#B8862B' },
    surf:         { label: 'Surf & Ocio',  emoji: '🏄', color: '#0E8FA6' },
    salud:        { label: 'Salud',        emoji: '💊', color: '#178F62' },
    servicios:    { label: 'Servicios',    emoji: '🔧', color: '#5B6B7C' }
};
```

(Contraste ≥3:1 de glifo blanco sobre cada color — validar con un check rápido de luminancia; ajustar ±10% de luminosidad si alguno falla en tema oscuro.)

- [ ] **Step 4: Verificar** — `node --check data.js` OK; en navegador la app carga y los pins de negocios muestran los tonos nuevos (heredan de `BUSINESS_CATEGORIES`).

- [ ] **Step 5: Commit** — bump `CACHE_VERSION` a `v3.2026.07.23a` en sw.js, `git add data.js sw.js`, mensaje `feat(data): coast flags + i18n nav Komoot + paleta sectores armonizada`.

---

### Task 2: app.js — 5 ramas, migración de capas, subgrupos de Patrimonio

**Files:**
- Modify: `app.js` — `MAP_LAYER_KEYS`/migración (~:39-41), `_poiBranchFlags` (~:1797), `ensureLayerVisibleFor` (sin cambios, verificar), `BRANCH_ICONS` (~:4095), `CAJON_BRANCHES` (~:4107), `_cajonIsGuemes` (~:4123, eliminar), `_cajonBranchItems` (~:4162), `_cajonLeafStyle` (~:4180), `_cajonTypeLabel` (~:4202), `BOTTOMNAV_TABS` (~:4423)
- Modify: `sw.js` (CACHE_VERSION → `…23b`)

**Interfaces:**
- Consumes: `coast: true` y claves i18n de Task 1.
- Produces: claves de rama `['patrimonio','rutas','playascosta','negocios','agenda']`; `MAP_LAYER_KEYS = ['patrimonio','rutas','playascosta','negocios']`; flags de mapa `l_patrimonio|l_playascosta|l_negocios`; helper `_cajonHeritageSubtreeHTML(items, term)`; icono `BRANCH_ICONS.casa` y `BRANCH_ICONS.playascosta`.

- [ ] **Step 1: Capas + migración** (app.js:39-41):

```js
const MAP_LAYER_KEYS = ['patrimonio', 'rutas', 'playascosta', 'negocios'];
let _layersOff = new Set();
// Migración desde el esquema de 6 capas (pre-Komoot): playas→playascosta; iglesias/vistas3d desaparecen.
try {
    const _lsOff = JSON.parse(localStorage.getItem('bareyo_layers_off') || '[]');
    if (Array.isArray(_lsOff)) {
        _layersOff = new Set(_lsOff.map(k => k === 'playas' ? 'playascosta' : k).filter(k => MAP_LAYER_KEYS.indexOf(k) !== -1));
        if (_lsOff.length !== _layersOff.size) localStorage.setItem('bareyo_layers_off', JSON.stringify(Array.from(_layersOff)));
    }
} catch (e) {}
```

- [ ] **Step 2: `_poiBranchFlags`** — nueva pertenencia (cada entidad, UNA capa):

```js
function _poiBranchFlags(entity, type) {
    const f = {};
    if (type === 'biz') { f.l_negocios = 1; }
    else if (type === '3d') { f.l_patrimonio = 1; }
    else if (type === 'costa') {
        if (entity.beach || entity.coast) { f.l_playascosta = 1; }
        else { f.l_patrimonio = 1; }
    }
    return f;
}
```

- [ ] **Step 3: `CAJON_BRANCHES` a 5** (fuera `iglesias`, `guemes`, `vistas3d`; `playas`→`playascosta` con emoji 🌊 y `catCoast`; color negocios `#5865C0` = `BUSINESS_CATEGORIES.all.color`). En `BRANCH_ICONS`: renombrar la entrada `playas` a `playascosta`, borrar `guemes`/`vistas3d` (conservar `iglesias` para el subgrupo), y añadir:

```js
casa: _BI('<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'),
```

- [ ] **Step 4: `_cajonBranchItems`** — casos nuevos (borrar `iglesias`, `guemes`, `vistas3d` y la función `_cajonIsGuemes`; comprobar con grep que nadie más la usa):

```js
case 'patrimonio':  return _cajonWrap(costaPoints.filter(c => !c.beach && !c.coast), 'costa', term).concat(_cajonWrap(points3D, '3d', term));
case 'rutas':       return _cajonWrap(hikingRoutes, 'hiking', term);
case 'playascosta': return _cajonWrap(costaPoints.filter(c => c.beach || c.coast), 'costa', term);
case 'negocios':    return _cajonWrap(businesses, 'biz', term);
case 'agenda':      return _cajonAgendaItems(term);
```

- [ ] **Step 5: Subgrupos de Patrimonio** — nuevo helper espejo de `_cajonBizSubtreeHTML` y usarlo en `renderCajonTree` (~:4303) cuando `br.key === 'patrimonio'`:

```js
// Patrimonio en dos subgrupos: Iglesias y ermitas (IGLESIA_IDS) / Más patrimonio.
function _cajonHeritageSubtreeHTML(items, term) {
    const churches = items.filter(w => IGLESIA_IDS.has(w.id));
    const rest = items.filter(w => !IGLESIA_IDS.has(w.id));
    const sec = (label, arr) => arr.length
        ? `<div class="cajon-subgroup"><div class="cajon-subgroup-title">${escapeHTML(label)} <span class="cajon-branch-count">${arr.length}</span></div>${arr.map(_cajonLeafHTML).join('')}</div>`
        : '';
    return sec(t('heritageChurches'), churches) + sec(t('heritageMore'), rest);
}
```

(Si `.cajon-subgroup`/`.cajon-subgroup-title` no existen aún en `styles-v3.css`, añadirlas en la sección del cajón con tokens semánticos: título pequeño uppercase `--text-soft`, margen superior.)

- [ ] **Step 6: `_cajonLeafStyle` y `_cajonTypeLabel`** — el tipo `costa` ahora es costa si `beach||coast` (color `#0891B2`, etiqueta `t('catCoast')`) y patrimonio si no; `'3d'` pasa a etiqueta `t('catHeritage')` y color `#0369A1` (ya no existe la rama vistas3d).

- [ ] **Step 7: `BOTTOMNAV_TABS = ['casa', 'patrimonio', 'rutas', 'playascosta', 'negocios']`** — en `renderBottomNav`, el caso especial `'mapa'` pasa a `'casa'` con `BRANCH_ICONS.casa` y label `t('navHome')`; en `bottomNavGo`, el caso `'casa'` hace lo de `'mapa'` (peek) por ahora (comportamiento completo en Task 5).

- [ ] **Step 8: Verificar** — `node --check app.js`; en navegador: el drawer muestra 5 ramas, Playas y costa lista 6 ítems, Patrimonio muestra los 2 subgrupos, apagar el ojo de Playas y costa oculta faro/cabo/ría/ojerada/playas del mapa, `#patrimonio=faro-ajo` y `#3d=3d-sta-maria-bareyo` siguen abriendo ficha. Sembrar `localStorage.bareyo_layers_off = '["playas","vistas3d"]'` y recargar → queda `["playascosta"]`.

- [ ] **Step 9: Commit** — bump `…23b`, `feat(nav): 5 categorías sin duplicados + Playas y costa + migración de capas`.

---

### Task 3: Escritorio — fila de chips con check (sustituye a los ojos)

**Files:**
- Modify: `index.html` (añadir `<nav id="navChips">` tras los controles del mapa)
- Modify: `app.js` (estado `_navActiveBranch`, `renderNavChips`, `navOpenBranch`, listener delegado; llamar `renderNavChips()` en init y en `layerToggle`)
- Modify: `styles-v3.css` (sección `.nav-chips` antes del bloque kiosco)
- Modify: `sw.js` (`…23c`)

**Interfaces:**
- Consumes: ramas de Task 2, i18n de Task 1.
- Produces: `_navActiveBranch` (string|null), `navOpenBranch(key)`, `navCloseBranch()`, `renderNavChips()` — Tasks 4-6 dependen de estos nombres exactos.

- [ ] **Step 1: HTML** — en `index.html`, antes de `<section id="cajon">`:

```html
<!-- Chips de categorías estilo Komoot (escritorio; en móvil los sustituye el bottom-nav) -->
<nav id="navChips" class="nav-chips" aria-label="Categorías del mapa"></nav>
```

- [ ] **Step 2: JS** — junto al bloque del cajón en app.js:

```js
// ── Chips de categorías (Komoot): check = capa visible; label = abre el panel ──
let _navActiveBranch = null;
const _CHIP_CHECK_ON  = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
const _CHIP_CHECK_OFF = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/></svg>';

function renderNavChips() {
    const host = document.getElementById('navChips');
    if (!host || window.KIOSCO) return;
    host.innerHTML = CAJON_BRANCHES.map(br => {
        const isLayer = MAP_LAYER_KEYS.indexOf(br.key) !== -1;
        const layerOn = !_layersOff.has(br.key);
        const active = _navActiveBranch === br.key;
        const label = t(br.i18n);
        const check = isLayer
            ? `<button type="button" class="nav-chip-check" data-nact="layer" data-nkey="${br.key}" aria-pressed="${layerOn}" title="${escapeHTML((layerOn ? t('chipLayerHide') : t('chipLayerShow')) + ' — ' + label)}">${layerOn ? _CHIP_CHECK_ON : _CHIP_CHECK_OFF}</button>`
            : '';
        return `<div class="nav-chip${active ? ' is-active' : ''}${isLayer && !layerOn ? ' is-off' : ''}" style="--chip-color:${br.color}">${check}
            <button type="button" class="nav-chip-open" data-nact="open" data-nkey="${br.key}" aria-expanded="${active}">
                <span class="nav-chip-ic" aria-hidden="true">${BRANCH_ICONS[br.key] || ''}</span>
                <span class="nav-chip-label">${escapeHTML(label)}</span>
                <span class="nav-chip-count">${_cajonBranchItems(br.key, '').length}</span>
            </button></div>`;
    }).join('');
}

function navOpenBranch(key) {
    if (_navActiveBranch === key) return navCloseBranch();
    _navActiveBranch = key;
    if (MAP_LAYER_KEYS.indexOf(key) !== -1 && _layersOff.has(key)) layerToggle(key); // abrir enciende la capa
    _cajonOpenBranches.clear(); _cajonOpenBranches.add(key);
    cajonSetView('tree');
    cajonSetState('half');
    renderNavChips(); renderCajon();
    if (typeof track === 'function') track('nav_chip', { meta: { chip: key } });
}
function navCloseBranch() {
    _navActiveBranch = null;
    _cajonOpenBranches.clear();
    cajonSetState('peek');
    renderNavChips(); renderCajon();
}
```

Listener delegado (mismo patrón que el del cajón): click en `[data-nact="layer"]` → `layerToggle(key)` + `renderNavChips()` (sin abrir panel); click en `[data-nact="open"]` → `navOpenBranch(key)`. `layerToggle` añade `renderNavChips()` al final para refrescar checks desde cualquier origen.

- [ ] **Step 3: renderCajonTree filtrado** — cuando `_navActiveBranch` esté definido y no haya búsqueda activa, `renderCajonTree` pinta SOLO esa rama (expandida, sin chevron de colapso); con término de búsqueda se mantiene el comportamiento global actual (todas las ramas con resultados).

- [ ] **Step 4: CSS** — sección nueva en `styles-v3.css` (antes del bloque `html[data-kiosco]`), solo tokens semánticos:

```css
/* ── Chips de categorías (Komoot) ─────────────────────────── */
.nav-chips { position: absolute; z-index: 30; top: 12px; left: 50%; transform: translateX(-50%);
  display: flex; gap: 8px; padding: 4px; max-width: min(92vw, 900px); overflow-x: auto; }
.nav-chip { display: inline-flex; align-items: center; border-radius: 999px;
  background: var(--surface); color: var(--text); box-shadow: var(--shadow-2, 0 2px 8px rgba(0,0,0,.15));
  border: 1px solid var(--border, transparent); white-space: nowrap; }
.nav-chip-check { display: grid; place-items: center; width: 30px; height: 36px; border: 0;
  background: none; color: var(--chip-color); cursor: pointer; border-radius: 999px 0 0 999px; }
.nav-chip.is-off { opacity: .55; }
.nav-chip.is-off .nav-chip-check { color: var(--text-soft, currentColor); }
.nav-chip-open { display: inline-flex; align-items: center; gap: 6px; border: 0; background: none;
  color: inherit; font: inherit; font-weight: 600; padding: 8px 14px 8px 2px; cursor: pointer; }
.nav-chip-ic svg { width: 18px; height: 18px; display: block; }
.nav-chip-count { font-size: 12px; font-weight: 700; opacity: .6; }
.nav-chip.is-active { background: var(--chip-color); color: #fff; border-color: var(--chip-color); }
.nav-chip.is-active .nav-chip-check { color: #fff; }
@media (max-width: 1023px) { .nav-chips { display: none; } } /* móvil: bottom-nav */
html[data-kiosco="1"] .nav-chips { display: none; }
```

(Ajustar `top/left` si colisiona con el buscador/controles existentes — comprobar en navegador y alinear con la barra superior real.)

- [ ] **Step 5: Verificar** — `node --check app.js`; navegador escritorio: chips visibles con contadores (Patrimonio 8+, Rutas 6, Playas y costa 6, Negocios 96, Agenda sin check), click en check apaga pins sin abrir panel, click en label abre el drawer con solo esa rama, chip activo se rellena de su color, re-click cierra. Los ojos del drawer pueden seguir existiendo hasta Task 4 (se retiran ahí).

- [ ] **Step 6: Commit** — bump `…23c`, `feat(nav): chips de categoría con check integrado (patrón Komoot)`.

---

### Task 4: Escritorio — cajón → panel izquierdo flotante colapsable

**Files:**
- Modify: `styles-v3.css` (restyle `.cajon` en ≥1024px: panel flotante izquierdo)
- Modify: `index.html` (asa-chevron `#cajonCollapse` en el borde del panel; cabecera del panel)
- Modify: `app.js` (título del panel = categoría activa; `cajonPanelToggle()`; retirar ojos `cajon-layer-toggle` del render del árbol — los sustituyen los chips)
- Modify: `sw.js` (`…23d`)

**Interfaces:**
- Consumes: `_navActiveBranch`, `navCloseBranch()` de Task 3.
- Produces: `cajonPanelToggle()` (colapsa/expande el panel en escritorio); atributo `data-panel="open|collapsed"` en `#cajon`.

- [ ] **Step 1: HTML** — dentro de `#cajon`, tras `#cajonHandle`:

```html
<button id="cajonCollapse" class="cajon-collapse" type="button" aria-expanded="true"
        data-i18n-title="panelCollapse" aria-label="Plegar panel" onclick="cajonPanelToggle()">
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>
</button>
```

- [ ] **Step 2: CSS escritorio** — en `styles-v3.css`, en la media query ≥1024px del cajón (localizarla con grep `cajonIsDesktop\|\.cajon` y sustituir el layout fijo actual):

```css
@media (min-width: 1024px) {
  .cajon { position: absolute; z-index: 25; top: 68px; left: 16px; bottom: 16px;
    width: 380px; border-radius: var(--radius-lg, 16px); box-shadow: var(--shadow-3, 0 8px 32px rgba(0,0,0,.2));
    background: var(--surface); transition: transform .25s ease; }
  .cajon[data-panel="collapsed"] { transform: translateX(calc(-100% - 8px)); }
  .cajon-handle { display: none; }
  .cajon-collapse { position: absolute; right: -28px; top: 50%; transform: translateY(-50%);
    width: 28px; height: 56px; border: 0; border-radius: 0 12px 12px 0; cursor: pointer;
    background: var(--surface); color: var(--text); box-shadow: var(--shadow-2, 0 2px 8px rgba(0,0,0,.15)); }
  .cajon[data-panel="collapsed"] .cajon-collapse svg { transform: rotate(180deg); }
}
@media (max-width: 1023px) { .cajon-collapse { display: none; } }
```

- [ ] **Step 3: JS** —

```js
function cajonPanelToggle() {
    const c = document.getElementById('cajon');
    if (!c) return;
    const collapsed = c.dataset.panel === 'collapsed';
    c.dataset.panel = collapsed ? 'open' : 'collapsed';
    const btn = document.getElementById('cajonCollapse');
    if (btn) { btn.setAttribute('aria-expanded', String(collapsed)); btn.title = t(collapsed ? 'panelCollapse' : 'panelExpand'); }
}
```

Y en `renderCajon`/cabecera: cuando `_navActiveBranch` esté activo, `#cajonTitle` = `t(branch.i18n)` y `#cajonSubtitle` = `N ítems`; sin rama activa, títulos por defecto (`drawerTitle`/`drawerSubtitle`).

- [ ] **Step 4: Retirar los ojos del árbol** — en `renderCajonTree` eliminar `layerBtn` (el bloque `cajon-layer-toggle`, app.js:4284-4288) y los SVG `_EYE_ON_SVG`/`_EYE_OFF_SVG` si quedan sin uso (grep antes de borrar: el kiosco no debe referenciarlos).

- [ ] **Step 5: Verificar** — escritorio: panel flotante con esquinas redondeadas a la izquierda, chevron pliega/despliega, título del panel cambia con la categoría, sin ojos dentro del árbol (los checks de los chips gobiernan); móvil (<1024px): el drawer sigue funcionando como sheet con asa. Dark mode OK (tokens).

- [ ] **Step 6: Commit** — bump `…23d`, `feat(nav): panel izquierdo flotante colapsable estilo Komoot`.

---

### Task 5: Móvil — bottom-nav Casa/acento único + botón Agenda flotante

**Files:**
- Modify: `app.js` (`renderBottomNav`, `bottomNavGo('casa')`, botón flotante Agenda)
- Modify: `index.html` (botón `#agendaFab` junto a los controles del mapa)
- Modify: `styles-v3.css` (acento único en tab activo; `#agendaFab` solo <1024px)
- Modify: `sw.js` (`…23e`)

**Interfaces:**
- Consumes: `BRANCH_ICONS.casa`, `navOpenBranch`, `BOTTOMNAV_TABS` de Tasks 2-3.
- Produces: comportamiento final de `bottomNavGo('casa')`; `#agendaFab`.

- [ ] **Step 1: `renderBottomNav`** — tab `casa` con `BRANCH_ICONS.casa` + `t('navHome')`; el resto de tabs usan `t(br.i18n)` salvo `playascosta` que usa la etiqueta corta `t('tabCoast')`. Quitar `style="--tab-color:${br.color}"`: el activo usa el acento único.

- [ ] **Step 2: `bottomNavGo('casa')`** — cerrar ficha si abierta (`dismissDetail()` guard), `navCloseBranch()`, y re-encuadre del municipio reutilizando el handler existente del control "Vista general" (grep `overview\|Vista general` en app.js para el nombre exacto; fallback: `map.flyTo` con centro/zoom inicial de `CONFIG`). Sin tocar `_layersOff`.

- [ ] **Step 3: CSS acento único** — en la sección del bottom-nav de `styles-v3.css`: `.bottom-nav-tab.is-active { color: var(--bareyo); }` (+ pastilla de fondo suave `color-mix` o token `--bareyo-soft` si existe), eliminando el uso de `--tab-color`.

- [ ] **Step 4: Toggle de capa en el sheet móvil** — al retirar los ojos del árbol (Task 4) y con los chips ocultos en <1024px, el móvil se quedaría sin interruptor de capa. En la cabecera del cajón/sheet, cuando `_navActiveBranch` sea una categoría-capa, pintar el mismo check de los chips (`_CHIP_CHECK_ON/_CHIP_CHECK_OFF` + `aria-pressed`) junto al título, con click → `layerToggle(_navActiveBranch)` + re-render de la cabecera. Oculto ≥1024px por CSS (en escritorio gobiernan los chips).

- [ ] **Step 5: Botón Agenda flotante (solo móvil)** — en `index.html`, junto a los controles del mapa: `<button id="agendaFab" class="agenda-fab" type="button" aria-label="Agenda" onclick="navOpenBranch('agenda')">` con `BRANCH_ICONS.agenda` inline (SVG pegado, los onclick no acceden a JS templates). CSS: fixed, esquina superior derecha bajo los controles, oculto ≥1024px y en kiosco.

- [ ] **Step 6: Verificar** — viewport 390×844: 5 tabs (Inicio/Patrimonio/Rutas/Costa/Negocios) con iconos outline y activo en verde `--bareyo`; tap Patrimonio abre sheet con subgrupos y check de capa en cabecera; Casa cierra sheet y re-encuadra; botón 📅 abre Agenda; `track('bottomnav_tab')` sigue disparando.

- [ ] **Step 7: Commit** — bump `…23e`, `feat(nav): bottom-nav Casa + acento único + agenda flotante en móvil`.

---

### Task 6: Negocios — chips de sector multi-selección (lista + mapa)

**Files:**
- Modify: `app.js` (`_bizSectorsOff`, `_bizSectorChipsHTML`, `bizSectorToggle`, filtro en `_cajonBranchItems('negocios')`, `_poiVisibilityFilter`, propiedad `cat` en las features de biz)
- Modify: `styles-v3.css` (chips de sector en el panel)
- Modify: `sw.js` (`…23f`)

**Interfaces:**
- Consumes: paleta de Task 1, panel de Tasks 3-4.
- Produces: `_bizSectorsOff` (Set de categorías OCULTAS, vacío = todas), `bizSectorToggle(cat)` (acepta `'all'` para limpiar).

- [ ] **Step 1: Feature `cat`** — localizar dónde se construyen las features GeoJSON de la capa POI (grep `l_negocios\|_poiBranchFlags(` para el builder) y añadir `cat: b.category` a las properties de las features de negocios.

- [ ] **Step 2: Estado + UI** —

```js
let _bizSectorsOff = new Set(); // sectores OCULTOS (vacío ⇒ todos visibles); no persiste
function _bizSectorChipsHTML() {
    const cats = Object.keys(BUSINESS_CATEGORIES).filter(k => k !== 'all');
    const allOn = _bizSectorsOff.size === 0;
    const chips = cats.map(k => {
        const c = BUSINESS_CATEGORIES[k];
        const on = !_bizSectorsOff.has(k);
        const n = businesses.filter(b => b.category === k).length;
        return `<button type="button" class="biz-sector-chip${on ? ' is-on' : ''}" style="--chip-color:${c.color}"
            data-bsector="${k}" aria-pressed="${on}">${c.emoji} ${escapeHTML(_cajonBizCategoryLabel(k))} <span class="nav-chip-count">${n}</span></button>`;
    }).join('');
    return `<div class="biz-sector-chips"><button type="button" class="biz-sector-chip biz-sector-all${allOn ? ' is-on' : ''}" data-bsector="all" aria-pressed="${allOn}">${escapeHTML(t('bizFilterAll'))}</button>${chips}</div>`;
}
function bizSectorToggle(cat) {
    if (cat === 'all') _bizSectorsOff.clear();
    else if (_bizSectorsOff.has(cat)) _bizSectorsOff.delete(cat);
    else _bizSectorsOff.add(cat);
    applyLayerVisibility(); renderCajon();
    if (typeof track === 'function') track('nav_filter', { meta: { sector: cat, off: Array.from(_bizSectorsOff) } });
}
```

La fila se pinta encima de la lista de negocios (en `_cajonBizSubtreeHTML` o justo antes de llamarla) con listener delegado en `[data-bsector]`.

- [ ] **Step 3: Filtrar lista y mapa** — `case 'negocios'` → `businesses.filter(b => !_bizSectorsOff.has(b.category))`; `_poiVisibilityFilter` devuelve para `negocios` una condición compuesta cuando hay sectores ocultos:

```js
function _poiVisibilityFilter() {
    const poiKeys = MAP_LAYER_KEYS.filter(k => k !== 'rutas');
    const active = poiKeys.filter(k => !_layersOff.has(k));
    if (active.length === 0) return ['==', ['literal', 1], 0];
    if (active.length === poiKeys.length && _bizSectorsOff.size === 0) return null;
    const conds = active.map(k => (k === 'negocios' && _bizSectorsOff.size)
        ? ['all', ['==', ['get', 'l_negocios'], 1], ['!', ['in', ['get', 'cat'], ['literal', Array.from(_bizSectorsOff)]]]]
        : ['==', ['get', 'l_' + k], 1]);
    return ['any'].concat(conds);
}
```

- [ ] **Step 4: CSS** — `.biz-sector-chips` (flex wrap, gap 6px) y `.biz-sector-chip` (píldora con borde; `is-on` = fondo `--chip-color` + texto blanco; off = atenuada). Tokens semánticos + `--chip-color`.

- [ ] **Step 5: Verificar** — panel Negocios: chips con contadores; apagar Restaurantes quita sus pins del mapa y de la lista; "Todos" restaura; con la capa Negocios apagada desde el chip superior, los pins no aparecen aunque haya sectores activos; buscar sigue funcionando.

- [ ] **Step 6: Commit** — bump `…23f`, `feat(negocios): filtro por sector multi-selección en lista y mapa`.

---

### Task 7: Tutorial + smoke integral + deploy

**Files:**
- Modify: `index.html` (pasos del tutorial: copy nuevo chips/panel/bottom-nav)
- Modify: `data.js` (claves i18n del tutorial si están en `TRANSLATIONS` — inspeccionar cómo se traduce el tutorial antes de tocar)
- Modify: `sw.js` (`…23g`)

- [ ] **Step 1: Tutorial** — reescribir los pasos que citan "panel inferior"/ramas antiguas (index.html ~:534-576): explicar chips con check (escritorio), panel izquierdo, bottom-nav (móvil). Si el tutorial usa claves `TRANSLATIONS`, actualizar es/en/fr/de; si es texto inline solo-ES, actualizar inline y anotar en el backlog la traducción pendiente.

- [ ] **Step 2: Grep de huérfanos** — `grep -n "guemes\|vistas3d\|catGuemes\|cat3d\|catIglesias\|catBeaches" app.js index.html` : ninguna referencia rota (las claves i18n viejas pueden quedar en TRANSLATIONS sin uso; no borrar de data.js si otra página las usa — comprobar dashboard/qr-print).

- [ ] **Step 3: Checks CI locales** — `for f in app.js data.js config.js sw.js js/track.js js/kiosco.js js/editor.js; do node --check "$f"; done` + JSON válidos.

- [ ] **Step 4: Smoke integral** (navegador, pestaña nueva, SW desregistrado, `?check=1`):
  - Escritorio: chips + panel + colapso + dark mode + 4 idiomas (selector) + deep links (`#ruta=bareyo-6`, `#patrimonio=faro-ajo`, `#3d=3d-sta-maria-bareyo`, `#negocio=<slug>`, `#item=` retrocompat).
  - Móvil 390px: 5 tabs, Casa, sheets, Agenda FAB, filtro sectores.
  - `?kiosco=1`: attract, ficha lateral, sin chips ni bottom-nav visibles. `?editor=1` y `/escaparate` cargan.
- [ ] **Step 5: Commit final** — bump `…23g`, `feat(nav): tutorial actualizado + smoke rediseño Komoot`.
- [ ] **Step 6: Deploy** — `vercel deploy --prod --yes` → https://descubrebareyo.vercel.app y re-smoke en producción. Si la CLI no está instalada en esta máquina (G:), avisar al usuario: `npm i -g vercel` + `vercel login` o lanzar el deploy él mismo.
