# Spec — Mejoras UX del mapa de Bareyo

**Fecha:** 2026-06-30 · **Rama:** `feat/atlas-kiosko-turismo` · **Estado:** aprobado en brainstorming, pendiente de plan de implementación.

## Objetivo

Cinco mejoras de UX sobre la **app principal** del mapa (`index.html` / `app.js`), pedidas por el cliente tras ver el localhost:

1. Agenda más clara y con lectura de noticias **dentro de la app** (sin salir a aytobareyo.org).
2. Controles superiores del mapa **unificados y minimalistas**.
3. Arrancar siempre en **Relieve 3D** con la cámara algo inclinada.
4. Mostrar **edificios en 3D** (hoy no aparecen).
5. Limpieza del botón **Instalar**.

Restricciones del proyecto que se respetan: vanilla HTML/CSS/JS sin build, funciones globales (`onclick`), solo APIs gratuitas sin key, dark-mode con tokens `styles-v3.css`, i18n es/en/fr/de, retrocompat de URLs.

## Hallazgos técnicos previos (verificados en navegador)

- **El basemap `carto.streets/v1` NO trae huellas de edificio en Bareyo** (0 features a z16–17 en Ajo/Bareyo). Por eso "no aparecen los edificios": no es activar el 3D, es que no hay datos que extruir. → Fuente alternativa: **OSM/Overpass** (~218 edificios en el bbox del municipio).
- **`map.setSky()` no existe en MapLibre 4.1.2** (llegó en v5). El cielo del relieve se pinta vía CSS (`#map`/`#kMap` background, canvas transparente sobre el horizonte) — ya implementado.
- La agenda hoy: pill `Agenda · N` (N = nº eventos) y cada noticia es `<a target="_blank">` que saca a aytobareyo.org. `events.json` lo genera `scripts/fetch-events.mjs` desde WP REST (`/wp-json/wp/v2/posts?per_page=20&_embed`), que **ya expone `content.rendered`** (artículo completo) aunque hoy solo se guarda el `excerpt` truncado.
- Controles: 8 `.floating-pill` (icono+texto) apiladas arriba-derecha (`index.html:298-328`). Las pills de **info** (Agenda/Mar/Clima) son aparte y muestran datos dinámicos.
- `isTerrain = false` (`app.js:19`) y no se aplica terreno al cargar.

---

## Bloque 1 — Agenda: pill + pop-up con artículo completo in-app

### 1.1 Pill y cabecera
- Quitar el `· N` que añade `app.js:1403` (la pill queda **"📅 Agenda"**).
- Cabecera del panel (`app.js:1449`): **"📅 Agenda · Ayuntamiento de Bareyo"** (clave i18n).

### 1.2 Datos: traer el contenido completo y sanearlo (`scripts/fetch-events.mjs`)
- Añadir a `mapPost()` un campo **`content`** = `sanitizeHtml(post.content.rendered)`.
- Nueva función `sanitizeHtml(html)` en el script (saneo en origen, en el build, no en cliente):
  - **Allowlist de tags**: `p, h2, h3, h4, ul, ol, li, a, strong, em, b, i, br, img, blockquote, figure, figcaption`. Cualquier otro tag se elimina (se conserva su texto interno).
  - Eliminar por completo `<script>`, `<style>`, `<iframe>`, `<noscript>` y su contenido.
  - Quitar **todos** los atributos salvo: `href` en `<a>` (solo `http(s):`, descartar `javascript:`), `src`/`alt` en `<img>` (solo `http(s):`). Eliminar cualquier atributo `on*`.
  - Forzar `rel="noopener"` y `target="_blank"` en los `<a>` del contenido.
  - Decodificar entidades con el helper existente.
- Tope de tamaño defensivo por noticia (p. ej. 20 KB de `content`) para que `events.json` no se dispare.
- El resto del script (tolerancia a fallos, conservar `events.json` previo) **no cambia**.

### 1.3 Pop-up in-app (`app.js` + `index.html`)
- Nuevo modal `#eventModal` en `index.html` (estructura mínima: overlay + caja + botón cerrar), oculto por defecto.
- `openEventDetail(id)` (global): busca el evento en `eventsData.events` por `id` y rellena: **imagen grande** (vía proxy wsrv.nl, igual que la lista), **título**, **fecha** (`fmtEventDate`), **categoría**, y **`content`** inyectado como `innerHTML` (es HTML ya saneado en build). Si falta `content`, cae al `summary`. Pie con botón opcional **"Ver original en aytobareyo.org →"** (`ev.link`, `target=_blank rel=noopener`) — único punto que abre externo.
- `closeEventDetail()`: oculta, restaura foco (`_previousFocus`).
- A11y: `role="dialog"`, `aria-modal="true"`, **focus-trap**, **Escape** cierra (integrar en el handler global de Escape existente, junto a detail/tutorial), click en backdrop cierra.
- `renderEventsPanel` (`app.js:1439`): cada noticia pasa de `<a href target=_blank>` a `<button class="event-item" onclick="openEventDetail(ID)">`. Se mantiene `track('event_click', {meta:{id}})` y se añade `track('event_detail_open', {meta:{id}})` al abrir el modal.
- Estilos del modal y del contenido (`.event-content p/h/ul/img…`) en `styles-v3.css`, theme-aware, imágenes responsivas (`max-width:100%`).

---

## Bloque 2 — Controles superiores: barra unificada + overflow

### 2.1 Markup (`index.html:298-328`)
Sustituir las 8 pills por **una barra** `.map-toolbar` (contenedor redondeado tipo glass):
- **Botones primarios visibles** (solo icono): 🛰️ Satélite · ⛰️ Relieve 3D · 📍 Mi ubicación · 🗺️ Vista general · 🌙 Tema.
- Botón **"⋯"** (`aria-haspopup`, `aria-expanded`) que abre un popover `.map-toolbar-more` con los **secundarios**: 🧭 Norte · ❓ Ayuda · 📲 Instalar (este último sigue con `display:none` hasta `beforeinstallprompt`).
- Cada botón conserva su `onclick` actual (`toggleSatellite`, `toggleTerrain`, `locateUser`, `resetView`, `toggleTheme`, `resetNorth`, `startTutorial`, `triggerInstallPWA`).
- Cada botón lleva `title` **y** `aria-label` con el nombre (i18n). Toggles (Satélite, Relieve, Tema) usan `aria-pressed` + clase `.active`.

### 2.2 Comportamiento e estilos (`styles-v3.css`, `app.js`)
- Estado activo resaltado en los toggles (reutilizar el patrón `.active` ya usado en `btnTerrain`/`btnTheme`).
- Popover "⋯": se cierra al pulsar fuera, al elegir una opción y con **Escape**. Función `toggleMapToolbarMore()`.
- Theme-aware con tokens v3 (`--surface`, `--text`, `--border`…). Responsive: misma barra compacta en móvil.
- **Las pills de info (Agenda/Mar/Clima) no se tocan** (muestran datos dinámicos, no son controles).
- Actualizar el texto del tutorial (`index.html:536`) que describe los controles "arriba a la derecha".

---

## Bloque 3 — Carga por defecto en Relieve 3D

- `app.js`: `isTerrain = true` (l.19).
- En el callback `map.on('load')` (app.js:96-116): tras `loadDataLayer`, llamar `applyTerrain()`, `map.easeTo({ pitch: 50, duration: 1200 })` y marcar **activo** el botón Relieve en la barra.
- El cielo CSS azul ya está, así que entra coherente. `reapplyTerrainIfOn()` ya cubre los re-styles (tema/satélite).

---

## Bloque 4 — Edificios 3D vía OSM/Overpass (gratis, sin key)

### 4.1 Datos
- `OVERPASS_BBOX = '43.455,-3.66,43.495,-3.58'` (municipio).
- Query: `[out:json][timeout:25];(way["building"](BBOX);relation["building"](BBOX););out geom;`
- Endpoint: `https://overpass-api.de/api/interpreter` (POST `data=`). Se baja vía **`cachedFetch('bareyo_osm_buildings', url, ttlMin)`** con TTL largo (p. ej. 7 días) + fallback stale.
- Conversión a GeoJSON en cliente (`buildBuildingsGeoJSON(osm)`):
  - `way` con `geometry` → `Feature` `Polygon` (cerrar anillo).
  - `relation` (multipolígono) → `MultiPolygon` best-effort con los miembros `role=outer`; si está mal formado, se descarta (solo hay ~2).
  - Propiedades por feature: `render_height` = `parseFloat(tags.height)` → `tags['building:levels']*3.2` → **6**. `render_min_height` = `tags.min_height` → `tags['building:min_level']*3.2` → 0.

### 4.2 Render
- Fuente `geojson` `osm-buildings`; capa `fill-extrusion` **`osm-buildings-3d`**:
  - `fill-extrusion-height: ['get','render_height']`, `fill-extrusion-base: ['get','render_min_height']`.
  - `fill-extrusion-color`: theme-aware (claro p. ej. `#cdbfa6`/`#d8d2c4`, oscuro p. ej. `#2a3550`), `fill-extrusion-opacity: 0.85`.
  - **`minzoom: 13`** (nivel pueblo: aparecen al mirar Ajo/Bareyo/Güemes; en la vista de todo el municipio serían sub-píxel). 218 edificios es un payload trivial, así que el límite es de legibilidad, no de rendimiento.
  - Insertar **bajo la primera capa de símbolos** (igual que el hillshade) para no tapar etiquetas.
- **Ligado al Relieve 3D**: los edificios forman parte del modo Relieve. `applyTerrain()` añade también los edificios (si ya hay GeoJSON cargado); `removeTerrain()` quita la capa. Así un único toggle gobierna terreno + edificios.
- Re-añadir tras cada `setStyle` (tema/satélite) junto al terreno (extender `reapplyTerrainIfOn` o un `reapplyOverlays`).

### 4.3 Caché / SW / fallos
- `sw.js`: añadir `overpass-api.de` a `isApiRequest` (network-first + cache).
- Overpass lento/caído → `cachedFetch` sirve stale; si nunca se trajo, simplemente no hay edificios (la app no rompe). Carga **diferida** (al primer `idle` con zoom≥13 o tras el `load`), no bloquea el arranque.

---

## Bloque 5 — Cierre

- `index.html`: botón **Instalar** movido al popover "⋯" (mantiene `display:none` hasta installable).
- `sw.js`: **bump `CACHE_VERSION`** (a `v2.2026.06.30`).
- **i18n** (`data.js → TRANSLATIONS`, es/en/fr/de): claves nuevas para la cabecera de agenda (`agendaHeader`), el botón "Ver original" (`eventReadOriginal`), y el tooltip de "más" (`moreControls`). Las claves de tooltips de controles ya existen (`satellite, terrain3d, myLocation, overview, help, north, install, darkMode`).
- `docs/CHANGELOG.md`: entrada nueva.

## Manejo de errores (resumen)

| Situación | Comportamiento |
|---|---|
| Overpass caído / sin red | `cachedFetch` stale; sin edificios si nunca se trajo; app intacta |
| Noticia sin `content` | el pop-up cae al `summary` |
| Imagen de noticia falla | se oculta (`onerror`) |
| WP REST caído (build) | `fetch-events.mjs` conserva `events.json` previo (ya implementado) |
| `setStyle` (tema/satélite) | terreno + edificios se re-añaden en el callback |

## Verificación

- `node --check` de todos los JS (incluye `fetch-events.mjs`) + `JSON.parse` de `events.json` + grep de `config.js` (gate CI).
- `node scripts/fetch-events.mjs` local → confirmar que `events.json` lleva `content` saneado (sin `<script>`/`on*`).
- Navegador real: barra primaria + overflow (toggles reflejan estado, Escape/click-fuera cierran), pop-up de noticia abre con HTML saneado + focus-trap + Escape + enlace externo opcional, arranque con Relieve 3D + pitch, edificios 3D aparecen al acercar a un pueblo (z≥13) y desaparecen al desactivar Relieve, todo coherente al togglear tema/satélite, **0 errores de consola de app**.

## Fuera de alcance (este spec)

- **Kiosko** (`kiosko.html/js`): tiene sus propios controles y ya arranca con terreno; aplicar barra/edificios al kiosko queda como follow-up.
- **Merge del PR #1** a `main` (decisión separada del usuario).
- Mejorar la cobertura de edificios de OSM (es la que hay) o alturas reales con basemap keyed.

## Archivos afectados

`index.html` (barra de controles, modal de noticia, tutorial) · `app.js` (pop-up agenda, default terreno+pitch, edificios OSM, toolbar más) · `styles-v3.css` (barra, popover, modal noticia, edificios color) · `data.js` (i18n) · `scripts/fetch-events.mjs` (content + sanitizeHtml) · `sw.js` (CACHE_VERSION + overpass) · `docs/CHANGELOG.md`.
