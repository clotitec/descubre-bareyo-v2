# Mejoras UX del mapa de Bareyo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mejorar la UX del mapa principal: agenda con pop-up in-app, controles unificados, arranque en Relieve 3D y edificios 3D desde OSM.

**Architecture:** App estática vanilla. La lógica pura nueva va a `js/geo.js` (namespace `Geo`, testeable en Node) y al build `scripts/fetch-events.mjs` (ESM, testeable en Node). La integración con mapa/DOM va a `app.js` (funciones globales). Estilos a `styles-v3.css`. El cielo del relieve ya se pinta vía CSS.

**Tech Stack:** HTML/CSS/JS vanilla, MapLibre GL 4.1.2 (CDN), Node ≥18 (solo `node --check` y tests puntuales `.mjs`), Overpass API + WordPress REST (gratis, sin key).

## Global Constraints

- Vanilla HTML/CSS/JS. SIN build, framework, TypeScript ni `npm install`. CDNs solo: unpkg, cdn.tailwindcss, fonts.googleapis, jsdelivr.
- JS expone **funciones globales** (`window.X`) porque el HTML usa `onclick="…"`.
- Solo **APIs gratuitas sin key**. Overpass (`overpass-api.de`) y WP REST (`aytobareyo.org`) cumplen.
- `config.js` arranca con claves Supabase vacías (modo demo) — NO commitear claves reales (el CI hace grep).
- Dark mode: componentes nuevos usan **tokens semánticos v3** (`--surface`, `--text`, `--border`…), no hex hardcoded en CSS de chrome (los colores de extrusión 3D del mapa son la excepción: van en paint de MapLibre, elegidos por `currentTheme`).
- i18n en **es/en/fr/de** vía `TRANSLATIONS`/`t()`/`data-i18n`. Toda cadena visible nueva lleva sus 4 idiomas.
- NO romper retrocompat de URLs (`#item=`, `#ruta=`, `?qr=`).
- No hay test runner. Verificación = `node --check` (gate CI), tests `.mjs` puntuales con `node`, validación JSON, y comprobación en navegador real (servidor `python -m http.server 8000`).
- `node --check` del CI cubre: `app.js data.js config.js sw.js js/track.js js/geo.js kiosko.js scripts/fetch-events.mjs`.

---

### Task 1: Saneo de HTML + contenido completo en `fetch-events.mjs`

**Files:**
- Modify: `scripts/fetch-events.mjs` (añadir `sanitizeHtml` exportado + campo `content` en `mapPost`)
- Create: `tests/fetch-events.test.mjs` (test Node de `sanitizeHtml`)

**Interfaces:**
- Produces: `export function sanitizeHtml(html: string): string` — HTML con allowlist de tags y atributos seguros. Campo `content` en cada evento de `events.json`.

- [ ] **Step 1: Escribir el test que falla** — `tests/fetch-events.test.mjs`:

```js
import assert from 'node:assert/strict';
import { sanitizeHtml } from '../scripts/fetch-events.mjs';

// 1) elimina <script> y su contenido
assert.equal(sanitizeHtml('<p>Hola<script>alert(1)</script> mundo</p>'), '<p>Hola mundo</p>');
// 2) elimina atributos on* y desconocidos, conserva el tag permitido
assert.equal(sanitizeHtml('<p onclick="x()" style="color:red">Hola</p>'), '<p>Hola</p>');
// 3) href javascript: se descarta; el <a> queda sin href
assert.equal(sanitizeHtml('<a href="javascript:alert(1)">x</a>'), '<a>x</a>');
// 4) href https se conserva con target/rel forzados
assert.equal(sanitizeHtml('<a href="https://x.com/y">x</a>'),
  '<a href="https://x.com/y" target="_blank" rel="noopener">x</a>');
// 5) img https se conserva normalizada; sin src http(s) se elimina
assert.equal(sanitizeHtml('<img src="https://x/y.jpg" onerror="x">'),
  '<img src="https://x/y.jpg" alt="" loading="lazy">');
assert.equal(sanitizeHtml('<img src="data:image/png;base64,AAAA">'), '');
// 6) tag no permitido se elimina pero conserva el texto
assert.equal(sanitizeHtml('<div>hola</div>'), 'hola');
// 7) null/undefined → ''
assert.equal(sanitizeHtml(null), '');

console.log('OK sanitizeHtml: 7/7');
```

- [ ] **Step 2: Ejecutar el test y verificar que falla**

Run: `node tests/fetch-events.test.mjs`
Expected: FAIL — `SyntaxError: The requested module does not provide an export named 'sanitizeHtml'`.

- [ ] **Step 3: Implementar `sanitizeHtml` y exportarla** — en `scripts/fetch-events.mjs`, tras la función `stripHtml` (l.46), añadir:

```js
const ALLOWED_TAGS = new Set(['p','h2','h3','h4','ul','ol','li','a','strong','em','b','i','br','img','blockquote','figure','figcaption']);

function attrUrl(attrs, name) {
  const m = attrs.match(new RegExp('\\b' + name + '\\s*=\\s*("([^"]*)"|\'([^\']*)\')', 'i'));
  return m ? (m[2] ?? m[3] ?? '') : '';
}

export function sanitizeHtml(html) {
  if (!html) return '';
  let s = String(html);
  // 1) eliminar bloques peligrosos completos (tag + contenido)
  s = s.replace(/<(script|style|noscript|iframe|object|embed|svg|math)\b[\s\S]*?<\/\1>/gi, '');
  s = s.replace(/<!--[\s\S]*?-->/g, '');
  // 2) reescribir cada tag: solo allowlist, atributos descartados salvo href/src/alt validados
  s = s.replace(/<(\/?)([a-zA-Z0-9]+)([^>]*?)\/?>/g, (m, slash, tag, attrs) => {
    tag = tag.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) return '';
    if (slash) return `</${tag}>`;
    if (tag === 'br') return '<br>';
    if (tag === 'a') {
      const href = attrUrl(attrs, 'href');
      return /^https?:\/\//i.test(href)
        ? `<a href="${href}" target="_blank" rel="noopener">` : '<a>';
    }
    if (tag === 'img') {
      const src = attrUrl(attrs, 'src');
      return /^https?:\/\//i.test(src) ? `<img src="${src}" alt="" loading="lazy">` : '';
    }
    return `<${tag}>`;
  });
  // 3) limpiar espacios sobrantes
  return decodeEntities(s).replace(/[ \t]{2,}/g, ' ').replace(/(\s*\n\s*){3,}/g, '\n\n').trim();
}
```

- [ ] **Step 4: Ejecutar el test y verificar que pasa**

Run: `node tests/fetch-events.test.mjs`
Expected: `OK sanitizeHtml: 7/7`

- [ ] **Step 5: Añadir `content` al objeto de evento** — en `mapPost` (l.74-85), añadir el campo (con tope de tamaño defensivo):

```js
    categories: categoryNames(post),
    content: sanitizeHtml(post?.content?.rendered || '').slice(0, 20000)
```
(añadir coma tras `categories: categoryNames(post)` y la línea `content:`).

- [ ] **Step 6: Verificar sintaxis y regenerar `events.json`**

Run: `node --check scripts/fetch-events.mjs && node scripts/fetch-events.mjs`
Expected: `OK · N eventos…`. Comprobar que `events.json` ahora tiene `content` saneado:
Run: `node -e "const e=require('./events.json'); const c=e.events[0].content||''; console.log('len', c.length, 'script?', /<script/i.test(c), 'on=?', /\son\w+=/i.test(c))"`
Expected: `len >0 · script? false · on=? false`. Validar JSON: `node -e "JSON.parse(require('fs').readFileSync('events.json','utf8'))"` (sin error).

- [ ] **Step 7: Commit**

```bash
git add scripts/fetch-events.mjs tests/fetch-events.test.mjs events.json
git commit -m "feat(agenda): contenido completo saneado en events.json (sanitizeHtml + content)"
```

---

### Task 2: Agenda — pill/cabecera + pop-up in-app

**Files:**
- Modify: `index.html` (markup del modal de noticia; ~tras los otros modales)
- Modify: `app.js` (pill sin contador l.1403, cabecera l.1449, `renderEventsPanel` l.1439, nuevas `openEventDetail`/`closeEventDetail`, Escape global l.1098)
- Modify: `styles-v3.css` (estilos del modal + contenido)
- Modify: `data.js` (claves i18n `agendaHeader`, `eventReadOriginal`)

**Interfaces:**
- Consumes: campo `content` de cada evento (Task 1).
- Produces: `window.openEventDetail(id)`, `window.closeEventDetail()`.

- [ ] **Step 1: Añadir el markup del modal** — en `index.html`, justo antes del cierre `</body>` (o junto al modal de detalle existente), insertar:

```html
<div class="event-overlay" id="eventModal" role="dialog" aria-modal="true" aria-labelledby="eventModalTitle" hidden>
  <div class="event-modal">
    <button class="event-modal-close" onclick="closeEventDetail()" aria-label="Cerrar">✕</button>
    <img class="event-modal-img" id="eventModalImg" alt="" hidden>
    <div class="event-modal-body">
      <div class="event-modal-meta"><span id="eventModalDate"></span><span id="eventModalCat" class="event-cat"></span></div>
      <h2 class="event-modal-title" id="eventModalTitle"></h2>
      <div class="event-modal-content" id="eventModalContent"></div>
      <a class="event-modal-original" id="eventModalLink" href="#" target="_blank" rel="noopener" data-i18n="eventReadOriginal">Ver original en aytobareyo.org →</a>
    </div>
  </div>
</div>
```

- [ ] **Step 2: Quitar el contador de la pill y cambiar la cabecera** — en `app.js`:

L.1403, cambiar:
```js
            if (label && data.events.length) label.textContent = (t('agenda') || 'Agenda') + ' · ' + data.events.length;
```
por:
```js
            if (label) label.textContent = t('agenda') || 'Agenda';
```
L.1449, cambiar:
```js
        `<div class="events-head">📅 ${t('agenda') || 'Agenda'} · Bareyo</div>` +
```
por:
```js
        `<div class="events-head">📅 ${t('agendaHeader') || 'Agenda · Ayuntamiento de Bareyo'}</div>` +
```

- [ ] **Step 3: Convertir cada noticia en botón que abre el modal** — en `app.js` `renderEventsPanel` (l.1439), reemplazar el `<a class="event-item" …>…</a>` por:

```js
        return `<button class="event-item" type="button" onclick="openEventDetail(${ev.id})">
            ${img}
            <div class="event-body">
                <div class="event-meta"><span class="event-date">📅 ${escapeHTML(fmtEventDate(ev.datetime || ev.date))}</span>${cat}</div>
                <div class="event-title">${escapeHTML(ev.title)}</div>
                <div class="event-summary">${escapeHTML(ev.summary || '')}</div>
            </div>
        </button>`;
```

- [ ] **Step 4: Implementar `openEventDetail`/`closeEventDetail`** — en `app.js`, tras `renderEventsPanel` (l.1452):

```js
let _eventPrevFocus = null;
function openEventDetail(id) {
    const ev = eventsData && eventsData.events && eventsData.events.find(e => e.id === id);
    if (!ev) return;
    const modal = document.getElementById('eventModal');
    if (!modal) return;
    const img = document.getElementById('eventModalImg');
    if (ev.image) { img.src = `https://wsrv.nl/?url=${encodeURIComponent(ev.image)}&w=900&h=420&fit=cover&a=attention&output=webp`; img.hidden = false; img.onerror = () => { img.hidden = true; }; }
    else { img.hidden = true; }
    document.getElementById('eventModalDate').textContent = '📅 ' + fmtEventDate(ev.datetime || ev.date);
    const catEl = document.getElementById('eventModalCat');
    catEl.textContent = (ev.categories && ev.categories[0]) || '';
    catEl.style.display = catEl.textContent ? '' : 'none';
    document.getElementById('eventModalTitle').textContent = ev.title;
    // content YA viene saneado del build (events.json); si falta, caer al summary (texto plano escapado)
    document.getElementById('eventModalContent').innerHTML = ev.content || `<p>${escapeHTML(ev.summary || '')}</p>`;
    document.getElementById('eventModalLink').href = ev.link || '#';
    _eventPrevFocus = document.activeElement;
    modal.hidden = false;
    modal.classList.add('active');
    setTimeout(() => { const c = modal.querySelector('.event-modal-close'); if (c) c.focus(); }, 50);
    if (typeof track === 'function') track('event_detail_open', { meta: { id } });
}
function closeEventDetail() {
    const modal = document.getElementById('eventModal');
    if (!modal) return;
    modal.classList.remove('active');
    modal.hidden = true;
    if (_eventPrevFocus && _eventPrevFocus.focus) { try { _eventPrevFocus.focus(); } catch (_) {} _eventPrevFocus = null; }
}
```

- [ ] **Step 5: Cerrar con Escape y con click en el backdrop** — en `app.js`, en el handler global de Escape (l.1098-…), añadir al principio del bloque:

```js
        const evModal = document.getElementById('eventModal');
        if (evModal && evModal.classList.contains('active')) { closeEventDetail(); return; }
```
Y en el markup del Step 1, el cierre por backdrop ya lo da el botón; añadir además `onclick="if(event.target===this)closeEventDetail()"` al `<div class="event-overlay" id="eventModal" …>`.

- [ ] **Step 6: Añadir claves i18n** — en `data.js → TRANSLATIONS`, en cada idioma añadir:
```
es: agendaHeader: 'Agenda · Ayuntamiento de Bareyo', eventReadOriginal: 'Ver original en aytobareyo.org →',
en: agendaHeader: 'Events · Bareyo Town Hall',        eventReadOriginal: 'Read original on aytobareyo.org →',
fr: agendaHeader: 'Agenda · Mairie de Bareyo',         eventReadOriginal: 'Voir l’original sur aytobareyo.org →',
de: agendaHeader: 'Termine · Rathaus Bareyo',          eventReadOriginal: 'Original auf aytobareyo.org ansehen →',
```

- [ ] **Step 7: Estilos del modal** — en `styles-v3.css`, añadir (theme-aware con tokens v3):

```css
/* ── Modal de noticia (agenda) ── */
.event-overlay { position: fixed; inset: 0; z-index: 60; display: none; align-items: center; justify-content: center; padding: 16px; background: rgba(0,0,0,.55); }
.event-overlay.active { display: flex; }
.event-modal { position: relative; width: min(680px, 96vw); max-height: 90vh; overflow: auto; background: var(--surface); color: var(--text); border-radius: 18px; box-shadow: 0 18px 60px rgba(0,0,0,.4); }
.event-modal-close { position: absolute; top: 10px; right: 10px; width: 34px; height: 34px; border: none; border-radius: 50%; background: var(--surface-muted); color: var(--text); font-size: 16px; cursor: pointer; }
.event-modal-img { width: 100%; height: 220px; object-fit: cover; border-radius: 18px 18px 0 0; display: block; }
.event-modal-body { padding: 18px 20px 22px; }
.event-modal-meta { display: flex; gap: 10px; align-items: center; font: 600 12px/1.2 system-ui, sans-serif; color: var(--text-muted); margin-bottom: 6px; }
.event-modal-title { font: 800 22px/1.25 'Urbanist', system-ui, sans-serif; margin: 0 0 12px; }
.event-modal-content { font: 400 15px/1.6 system-ui, sans-serif; color: var(--text); }
.event-modal-content p { margin: 0 0 12px; }
.event-modal-content h2, .event-modal-content h3, .event-modal-content h4 { font-family: 'Urbanist', system-ui, sans-serif; margin: 16px 0 8px; }
.event-modal-content ul, .event-modal-content ol { padding-left: 20px; margin: 0 0 12px; }
.event-modal-content img { max-width: 100%; height: auto; border-radius: 10px; margin: 8px 0; }
.event-modal-content a { color: var(--bareyo); }
.event-modal-original { display: inline-block; margin-top: 12px; font: 600 13px/1 system-ui, sans-serif; color: var(--bareyo); text-decoration: none; }
```

- [ ] **Step 8: Verificar en navegador**

Run: `python -m http.server 8000` (en background) y abrir `http://localhost:8000/`.
Comprobaciones (consola del navegador o inspección): la pill dice **"Agenda"** (sin "· N"); abrir el panel Agenda → la cabecera dice **"Agenda · Ayuntamiento de Bareyo"**; pulsar una noticia → se abre `#eventModal` con imagen, título, fecha y **contenido**; `document.getElementById('eventModalContent').querySelector('script')` es `null`; **Escape** cierra y el foco vuelve al botón; el enlace "Ver original" apunta a `ev.link`. `node --check app.js data.js` sin errores.

- [ ] **Step 9: Commit**

```bash
git add index.html app.js styles-v3.css data.js
git commit -m "feat(agenda): pop-up in-app con artículo completo + cabecera Ayuntamiento (sin contador)"
```

---

### Task 3: Controles superiores — barra unificada + overflow

**Files:**
- Modify: `index.html` (reemplazar pills de control l.298-328; texto tutorial l.536)
- Modify: `app.js` (`toggleMapToolbarMore`, cierre por Escape/click-fuera, extensión i18n de atributos en `applyTranslations`)
- Modify: `styles-v3.css` (estilos barra + popover)
- Modify: `data.js` (clave `moreControls`)

**Interfaces:**
- Consumes: handlers existentes (`toggleSatellite`, `toggleTerrain`, `locateUser`, `resetView`, `toggleTheme`, `resetNorth`, `startTutorial`, `triggerInstallPWA`).
- Produces: `window.toggleMapToolbarMore()`; `applyTranslations` ahora también traduce `title`/`aria-label` vía `data-i18n-title`.

- [ ] **Step 1: Reemplazar el bloque de pills de control** — en `index.html`, sustituir el bloque `l.298-328` (los 8 `.floating-pill` de control; **NO** las pills de info Agenda/Mar/Clima de l.334+) por:

```html
                <div class="map-toolbar" role="toolbar" aria-label="Controles del mapa">
                    <button class="map-tool" id="btnSatellite" onclick="toggleSatellite()" data-i18n-title="satellite" aria-pressed="false">🛰️</button>
                    <button class="map-tool" id="btnTerrain" onclick="toggleTerrain()" data-i18n-title="terrain3d" aria-pressed="false">⛰️</button>
                    <button class="map-tool" onclick="locateUser()" data-i18n-title="myLocation">📍</button>
                    <button class="map-tool" onclick="resetView()" data-i18n-title="overview">🗺️</button>
                    <button class="map-tool" id="btnTheme" onclick="toggleTheme()" data-i18n-title="darkMode" aria-pressed="false">🌙</button>
                    <button class="map-tool map-tool-more" id="btnToolbarMore" onclick="toggleMapToolbarMore()" data-i18n-title="moreControls" aria-haspopup="true" aria-expanded="false">⋯</button>
                    <div class="map-toolbar-more" id="mapToolbarMore" role="menu" hidden>
                        <button class="map-tool" id="btnCompass" onclick="resetNorth()" data-i18n-title="north">🧭</button>
                        <button class="map-tool" id="btnTutorialMap" onclick="startTutorial()" data-i18n-title="help" style="font-weight:800">?</button>
                        <button class="map-tool" id="btnInstallPWA" onclick="triggerInstallPWA()" data-i18n-title="install" style="display:none">📲</button>
                    </div>
                </div>
```

- [ ] **Step 2: Extender `applyTranslations` para títulos/aria** — en `app.js` `applyTranslations` (l.2239-…), tras el bucle de `[data-i18n]`, añadir:

```js
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const val = t(el.getAttribute('data-i18n-title'));
        if (val) { el.title = val; el.setAttribute('aria-label', val); }
    });
```

- [ ] **Step 3: Implementar el popover "⋯"** — en `app.js` (junto a las funciones de mapa):

```js
function toggleMapToolbarMore() {
    const pop = document.getElementById('mapToolbarMore');
    const btn = document.getElementById('btnToolbarMore');
    if (!pop) return;
    const open = pop.hidden;
    pop.hidden = !open;
    if (btn) btn.setAttribute('aria-expanded', String(open));
}
function _closeToolbarMore() {
    const pop = document.getElementById('mapToolbarMore');
    const btn = document.getElementById('btnToolbarMore');
    if (pop && !pop.hidden) { pop.hidden = true; if (btn) btn.setAttribute('aria-expanded', 'false'); }
}
document.addEventListener('click', e => {
    const bar = document.querySelector('.map-toolbar');
    if (bar && !bar.contains(e.target)) _closeToolbarMore();
});
```
Y en el handler global de Escape (l.1098), añadir: `_closeToolbarMore();` (antes de los returns de otros modales no — ponerlo al final del handler para que Escape también cierre el popover).

- [ ] **Step 4: Clave i18n `moreControls`** — en `data.js → TRANSLATIONS`:
```
es: moreControls: 'Más',  en: moreControls: 'More',  fr: moreControls: 'Plus',  de: moreControls: 'Mehr',
```

- [ ] **Step 5: Estilos de la barra** — en `styles-v3.css`:

```css
/* ── Barra de controles del mapa (unificada) ── */
.map-toolbar { position: absolute; top: 12px; right: 12px; z-index: 20; display: flex; flex-direction: column; gap: 6px; padding: 6px; background: var(--surface); border: 1px solid var(--border); border-radius: 16px; box-shadow: 0 6px 20px rgba(0,0,0,.18); }
.map-tool { width: 42px; height: 42px; border: none; border-radius: 11px; background: transparent; color: var(--text); font-size: 19px; cursor: pointer; display: grid; place-items: center; transition: background .15s; }
.map-tool:hover { background: var(--surface-muted); }
.map-tool.active { background: var(--bareyo); color: #fff; }
.map-tool-more { font-size: 22px; line-height: 1; }
.map-toolbar-more { display: flex; flex-direction: column; gap: 6px; margin-top: 4px; padding-top: 6px; border-top: 1px solid var(--border); }
.map-toolbar-more[hidden] { display: none; }
```

- [ ] **Step 6: Actualizar el texto del tutorial** — en `index.html` l.536, cambiar la descripción de los controles a algo coherente con la barra, p. ej.:
```
text: 'Arriba a la derecha tienes la barra de controles: Satélite, Relieve 3D, Tu ubicación, Vista general y modo claro/oscuro. El botón ⋯ despliega Norte, Ayuda e Instalar.',
```

- [ ] **Step 7: Verificar en navegador**

Abrir `http://localhost:8000/`. Comprobar: la barra muestra 5 iconos + "⋯"; pasar el ratón muestra el tooltip (title) con el nombre traducido; pulsar "⋯" despliega Norte/Ayuda/Instalar y `aria-expanded` pasa a `true`; pulsar fuera o Escape lo cierra; activar Satélite/Relieve/Tema añade `.active` al botón. `triggerInstallPWA`/`btnInstallPWA` sigue oculto salvo `beforeinstallprompt`. `node --check app.js data.js`.

- [ ] **Step 8: Commit**

```bash
git add index.html app.js styles-v3.css data.js
git commit -m "feat(mapa): barra de controles unificada con overflow + i18n de tooltips"
```

---

### Task 4: Arranque por defecto en Relieve 3D + inclinación

**Files:**
- Modify: `app.js` (l.19 `isTerrain`; callback `map.on('load')` l.96-116)

**Interfaces:**
- Consumes: `applyTerrain()`, botón `#btnTerrain` (Task 3), `map`.

- [ ] **Step 1: Activar terreno por defecto** — en `app.js` l.19:
```js
let isTerrain = true;
```

- [ ] **Step 2: Aplicar terreno + inclinación al cargar** — en `app.js`, dentro de `map.on('load', …)` (tras `loadDataLayer(activeTab)`, l.116), añadir:
```js
        // Arrancar en Relieve 3D (decisión de diseño): terreno + edificios + cámara algo inclinada.
        applyTerrain();
        map.easeTo({ pitch: 50, duration: 1200 });
        const tBtn = document.getElementById('btnTerrain');
        if (tBtn) { tBtn.classList.add('active'); tBtn.setAttribute('aria-pressed', 'true'); }
```

- [ ] **Step 3: Verificar en navegador**

Abrir `http://localhost:8000/` y entrar al mapa. Comprobar (consola): `isTerrain === true`; `Math.round(map.getPitch())` ≈ 50; el botón Relieve tiene clase `active`; el relieve se aprecia. `node --check app.js`.

- [ ] **Step 4: Commit**
```bash
git add app.js
git commit -m "feat(mapa): arranque por defecto en Relieve 3D con inclinación de cámara"
```

---

### Task 5: Edificios 3D desde OSM/Overpass

**Files:**
- Modify: `js/geo.js` (helpers puros `osmToBuildingsGeoJSON`, `buildingHeightFromTags`, `buildingMinHeightFromTags` en `Geo`)
- Create: `tests/geo-buildings.test.mjs` (test Node de los helpers)
- Modify: `app.js` (`loadBuildings`, `addBuildings`, `removeBuildings`, `buildingColor`; engancharlos en `applyTerrain`/`removeTerrain`)
- Modify: `sw.js` (`overpass-api.de` en `isApiRequest`)

**Interfaces:**
- Consumes: `cachedFetch(key, url, ttlMin)` → JSON parseado; `currentTheme`; `applyTerrain`/`removeTerrain` (l.265-296).
- Produces: `Geo.osmToBuildingsGeoJSON(osm)` → `{type:'FeatureCollection', features:[…]}` con `properties.render_height`/`render_min_height`; `window.addBuildings()`, `window.removeBuildings()`.

- [ ] **Step 1: Escribir el test que falla** — `tests/geo-buildings.test.mjs`:

```js
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const code = readFileSync(new URL('../js/geo.js', import.meta.url), 'utf8');
const window = {};
new Function('window', code)(window);
const Geo = window.Geo;

// altura: height > levels*3.2 > fallback 6
assert.equal(Geo.buildingHeightFromTags({ height: '12' }), 12);
assert.equal(Geo.buildingHeightFromTags({ 'building:levels': '3' }), 9.6);
assert.equal(Geo.buildingHeightFromTags({}), 6);
assert.equal(Geo.buildingMinHeightFromTags({}), 0);

// conversión: way con geometry → Polygon cerrado con altura
const osm = { elements: [
  { type: 'way', tags: { building: 'yes', 'building:levels': '2' },
    geometry: [{lon:-3.6,lat:43.4},{lon:-3.59,lat:43.4},{lon:-3.59,lat:43.41},{lon:-3.6,lat:43.41}] }
]};
const gj = Geo.osmToBuildingsGeoJSON(osm);
assert.equal(gj.type, 'FeatureCollection');
assert.equal(gj.features.length, 1);
assert.equal(gj.features[0].geometry.type, 'Polygon');
const ring = gj.features[0].geometry.coordinates[0];
assert.deepEqual(ring[0], ring[ring.length - 1]); // anillo cerrado
assert.equal(gj.features[0].properties.render_height, 6.4); // 2*3.2

console.log('OK geo-buildings: ' + gj.features.length + ' feature(s)');
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `node tests/geo-buildings.test.mjs`
Expected: FAIL — `TypeError: Geo.buildingHeightFromTags is not a function`.

- [ ] **Step 3: Implementar los helpers en `js/geo.js`** — dentro del IIFE, junto a los demás helpers (antes de la asignación `window.Geo = {…}`):

```js
  function buildingHeightFromTags(tags) {
    tags = tags || {};
    var h = parseFloat(tags.height);
    if (!isNaN(h) && h > 0) return h;
    var lv = parseFloat(tags['building:levels']);
    if (!isNaN(lv) && lv > 0) return lv * 3.2;
    return 6;
  }
  function buildingMinHeightFromTags(tags) {
    tags = tags || {};
    var mh = parseFloat(tags.min_height);
    if (!isNaN(mh) && mh > 0) return mh;
    var ml = parseFloat(tags['building:min_level']);
    if (!isNaN(ml) && ml > 0) return ml * 3.2;
    return 0;
  }
  function _ring(geometry) {
    var r = geometry.map(function (p) { return [p.lon, p.lat]; });
    var a = r[0], b = r[r.length - 1];
    if (a[0] !== b[0] || a[1] !== b[1]) r.push([a[0], a[1]]);
    return r;
  }
  function osmToBuildingsGeoJSON(osm) {
    var feats = [], els = (osm && osm.elements) || [];
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      var props = { render_height: buildingHeightFromTags(el.tags), render_min_height: buildingMinHeightFromTags(el.tags) };
      if (el.type === 'way' && Array.isArray(el.geometry) && el.geometry.length >= 4) {
        feats.push({ type: 'Feature', properties: props, geometry: { type: 'Polygon', coordinates: [_ring(el.geometry)] } });
      } else if (el.type === 'relation' && Array.isArray(el.members)) {
        var polys = el.members
          .filter(function (m) { return m.role === 'outer' && Array.isArray(m.geometry) && m.geometry.length >= 4; })
          .map(function (m) { return [_ring(m.geometry)]; });
        if (polys.length) feats.push({ type: 'Feature', properties: props, geometry: { type: 'MultiPolygon', coordinates: polys } });
      }
    }
    return { type: 'FeatureCollection', features: feats };
  }
```
Y añadir las tres funciones públicas al objeto `window.Geo = { … }`:
```js
    buildingHeightFromTags: buildingHeightFromTags,
    buildingMinHeightFromTags: buildingMinHeightFromTags,
    osmToBuildingsGeoJSON: osmToBuildingsGeoJSON,
```

- [ ] **Step 4: Ejecutar y verificar que pasa**

Run: `node tests/geo-buildings.test.mjs`
Expected: `OK geo-buildings: 1 feature(s)`. Y `node --check js/geo.js`.

- [ ] **Step 5: Pipeline de edificios en `app.js`** — añadir tras `removeTerrain` (l.296):

```js
// ─── EDIFICIOS 3D (OSM/Overpass, gratis sin key) ───────────────────────────
const OSM_BBOX = '43.455,-3.66,43.495,-3.58';
let _buildingsGeo = null;
async function loadBuildings() {
    if (_buildingsGeo) return _buildingsGeo;
    const q = `[out:json][timeout:25];(way["building"](${OSM_BBOX});relation["building"](${OSM_BBOX}););out geom;`;
    const url = 'https://overpass-api.de/api/interpreter?data=' + encodeURIComponent(q);
    try {
        const osm = await cachedFetch('bareyo_osm_buildings', url, 60 * 24 * 7); // 7 días
        _buildingsGeo = (window.Geo && Geo.osmToBuildingsGeoJSON) ? Geo.osmToBuildingsGeoJSON(osm) : null;
    } catch (e) { _buildingsGeo = null; }
    return _buildingsGeo;
}
function buildingColor() { return (typeof currentTheme !== 'undefined' && currentTheme === 'dark') ? '#26314d' : '#d9cdb8'; }
async function addBuildings() {
    if (!map) return;
    const geo = await loadBuildings();
    if (!geo || !geo.features.length) return;
    if (!map.getSource('osm-buildings')) map.addSource('osm-buildings', { type: 'geojson', data: geo });
    else map.getSource('osm-buildings').setData(geo);
    if (!map.getLayer('osm-buildings-3d')) {
        let firstSymbol; const layers = (map.getStyle().layers) || [];
        for (let i = 0; i < layers.length; i++) { if (layers[i].type === 'symbol') { firstSymbol = layers[i].id; break; } }
        map.addLayer({
            id: 'osm-buildings-3d', type: 'fill-extrusion', source: 'osm-buildings', minzoom: 13,
            paint: {
                'fill-extrusion-color': buildingColor(),
                'fill-extrusion-height': ['get', 'render_height'],
                'fill-extrusion-base': ['get', 'render_min_height'],
                'fill-extrusion-opacity': 0.85
            }
        }, firstSymbol);
    } else {
        map.setPaintProperty('osm-buildings-3d', 'fill-extrusion-color', buildingColor());
    }
}
function removeBuildings() {
    if (map && map.getLayer('osm-buildings-3d')) map.removeLayer('osm-buildings-3d');
}
```

- [ ] **Step 6: Engancharlos al toggle de Relieve** — en `app.js`:
- Al final de `applyTerrain()` (tras el comentario del cielo, ~l.289), añadir: `addBuildings();`
- En `removeTerrain()` (l.291-296), añadir al principio: `removeBuildings();`
(Así `reapplyTerrainIfOn()` ya los re-añade tras cada `setStyle`, y el botón Relieve gobierna terreno + edificios juntos.)

- [ ] **Step 7: Cachear Overpass en el SW (rama propia, sin timeout agresivo)** — Overpass es lento (2-10s) y cambia poco: NO debe ir por `networkFirstWithTimeout(3s)` o abortaría siempre. En `sw.js`, en el handler `fetch` (antes del check `isApiRequest`, ~l.78), añadir una rama dedicada con stale-while-revalidate:
```js
    // Overpass (edificios OSM): respuesta grande y lenta, cambia poco → SWR (cache-first + refresco)
    if (/overpass-api\.de/.test(url.href)) {
        event.respondWith(staleWhileRevalidate(req, APIS_CACHE, 0));
        return;
    }
```
(`staleWhileRevalidate` espera la red completa solo si no hay cache; en cargas siguientes sirve al instante. No tocar `isApiRequest`.)

- [ ] **Step 8: Verificar en navegador**

Abrir `http://localhost:8000/`, entrar al mapa (arranca con Relieve), y en consola:
```js
await new Promise(r=>setTimeout(r,3000));
map.jumpTo({center:[-3.6147,43.4787], zoom:15, pitch:60});
await new Promise(r=>setTimeout(r,3500));
({ source: !!map.getSource('osm-buildings'), layer: !!map.getLayer('osm-buildings-3d'),
   feats: map.querySourceFeatures('osm-buildings').length,
   h: (map.querySourceFeatures('osm-buildings')[0]||{properties:{}}).properties.render_height })
```
Expected: `source:true, layer:true, feats>0, h` numérico. Captura: edificios extruidos visibles en Ajo. Desactivar Relieve (botón) → `map.getLayer('osm-buildings-3d')` es `undefined`. Togglear tema → siguen visibles con color del tema. `node --check app.js sw.js js/geo.js`.

- [ ] **Step 9: Commit**
```bash
git add js/geo.js tests/geo-buildings.test.mjs app.js sw.js
git commit -m "feat(mapa): edificios 3D desde OSM/Overpass (fill-extrusion ligado al Relieve 3D)"
```

---

### Task 6: Cierre — CACHE_VERSION, i18n, CHANGELOG y gate completo

**Files:**
- Modify: `sw.js` (`CACHE_VERSION`)
- Modify: `data.js` (barrido de completitud i18n es/en/fr/de)
- Modify: `docs/CHANGELOG.md`

- [ ] **Step 1: Bump de caché** — en `sw.js` l.11: `const CACHE_VERSION = 'v2.2026.06.30';`

- [ ] **Step 2: Verificar completitud i18n** — confirmar que `agendaHeader`, `eventReadOriginal`, `moreControls` existen en **es/en/fr/de**:
Run: `node -e "const s=require('fs').readFileSync('data.js','utf8'); ['agendaHeader','eventReadOriginal','moreControls'].forEach(k=>{const n=(s.match(new RegExp(k+':','g'))||[]).length; console.log(k, n, n===4?'OK':'FALTAN');})"`
Expected: cada clave con `4 OK`.

- [ ] **Step 3: Entrada en el CHANGELOG** — en `docs/CHANGELOG.md`, bajo `## [Unreleased]`, añadir un bloque "Mejoras UX del mapa (2026-06-30)" describiendo: agenda con pop-up in-app de artículo completo saneado, barra de controles unificada + overflow, arranque en Relieve 3D, edificios 3D OSM/Overpass.

- [ ] **Step 4: Gate completo (réplica del CI)**
```bash
for f in app.js data.js config.js sw.js js/track.js js/geo.js kiosko.js scripts/fetch-events.mjs; do node --check "$f" && echo "ok $f" || echo "FAIL $f"; done
for f in manifest.json vercel.json events.json assets/tracks/*.json; do node -e "JSON.parse(require('fs').readFileSync('$f','utf8'))" && echo "ok $f" || echo "FAIL $f"; done
node tests/fetch-events.test.mjs && node tests/geo-buildings.test.mjs
grep -E "(SUPABASE_(URL|ANON_KEY).*=.*['\"]http|SUPABASE_(URL|ANON_KEY).*=.*['\"]eyJ)" config.js && echo "FAIL claves" || echo "ok config limpio"
```
Expected: todo `ok`, ambos tests OK, config limpio.

- [ ] **Step 5: Smoke final en navegador**

Abrir `/` y recorrer: arranque en Relieve 3D con inclinación; barra unificada + "⋯"; abrir agenda → pop-up de noticia con contenido saneado, Escape cierra; acercar a Ajo → edificios 3D; togglear tema y satélite sin romper terreno/edificios/cielo. **0 errores de consola de app** (los de extensión `:0:0` se ignoran).

- [ ] **Step 6: Commit**
```bash
git add sw.js data.js docs/CHANGELOG.md
git commit -m "chore: bump CACHE_VERSION, i18n completo y CHANGELOG de mejoras UX del mapa"
```

---

## Notas de ejecución

- **Orden**: T1→T6. T1 desbloquea el contenido de la agenda; T2 lo consume. T3 (barra) y T4 (default terreno) son independientes entre sí pero T4 usa el `#btnTerrain` de la barra (T3) — ejecutar T3 antes de T4. T5 engancha en `applyTerrain` (existe ya).
- **Verificación sin framework**: `node --check` + tests `.mjs` con `node` + comprobación en navegador real. No introducir runner.
- **Tras todo**: la rama `feat/atlas-kiosko-turismo` queda lista; el PR #1 recoge estos commits. El **merge a `main`** sigue siendo decisión del usuario.
