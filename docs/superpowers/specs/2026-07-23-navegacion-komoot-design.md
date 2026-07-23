# Spec: Navegación estilo Komoot (rediseño de menús v3)

**Fecha:** 2026-07-23 · **Rama:** `v3` · **Deploy:** descubrebareyo.vercel.app (main/tótem intacto)
**Referencia visual:** Komoot web (Mobbin) — panel izquierdo flotante + chips de filtro sobre el mapa
con popovers de píldoras seleccionables; Komoot iOS — bottom-nav de 5 tabs con un solo color de acento.

## Objetivo

Sustituir el cajón (drawer árbol/bento) por una navegación estilo Komoot: panel izquierdo +
chips de categoría en escritorio, bottom-nav de 5 tabs con sheets en móvil. Eliminar las
categorías duplicadas (Güemes, Vistas 3D), crear "Playas y costa", sustituir los ojos 👁 por
chips seleccionables, y mejorar tonos/filtros de sector en Negocios.

**Estrategia aprobada:** evolución in-place. Se conserva toda la lógica de datos del cajón
(`_cajonBranchItems`, `_cajonWrap`, búsqueda, i18n, deep links, tracking) y se sustituye solo
la capa de presentación en `app.js` + sección nueva en `styles-v3.css`.

## Fuera de alcance (specs posteriores)

- Dashboard/editor CRUD de empresas (spec aparte; UX de referencia: `formulario-empresas.html`
  de poligonos-santander-v5 — edición campo a campo con diff, compresión de fotos en canvas —
  añadiendo persistencia real vía `buildBizJson` + Supabase).
- Fotos `assets/biz/` del cliente, carpeta `iconos reales bareyteo/` (sin commitear a propósito).
- Rediseño de fichas de detalle y landing (solo se actualiza el copy del tutorial).

## 1. Categorías y datos

Nuevas ramas (sin duplicados — cada ítem sale en UNA sola categoría):

| key | i18n | Contenido |
|---|---|---|
| `patrimonio` | `catHeritage` | `costaPoints.filter(!beach && !coast)` + `points3D`. Render con subgrupo **"Iglesias y ermitas"** (los 7 de `IGLESIA_IDS`) y **"Más patrimonio"** (molino La Venera + futuros Palacio/Convento/Boleras) |
| `rutas` | `catRoutes` | `hikingRoutes` (sin cambios) |
| `playascosta` | `catCoast` (nueva) | `costaPoints.filter(beach \|\| coast)`: playa-cuberris, playa-ajo, **ria-ajo, ojerada, faro-ajo, cabo-quintres** |
| `negocios` | `catBusiness` | los 96, con filtro por sector mejorado |
| `agenda` | `catAgenda` | eventos — NO es capa de mapa |

Cambios en `data.js` (source of truth):
- Añadir `coast: true` a `ria-ajo`, `ojerada`, `faro-ajo`, `cabo-quintres`. Nada hardcodeado en app.js.
- `TRANSLATIONS`: nueva clave `catCoast` es "Playas y costa" / en "Beaches & coast" /
  fr "Plages et littoral" / de "Strände & Küste". Claves nuevas de UI (ver §6).
- Nueva paleta `BUSINESS_CATEGORIES` (ver §4).

Cambios de estado en `app.js`:
- `CAJON_BRANCHES` → 5 entradas (fuera `guemes`, `vistas3d`, `iglesias` top-level).
- `MAP_LAYER_KEYS` → `['patrimonio', 'rutas', 'playascosta', 'negocios']`.
- Migración de `localStorage['bareyo_layers_off']`: `'playas'` → `'playascosta'`;
  `'iglesias'`/`'vistas3d'` se descartan; el resto se conserva.
- `_poiBranchFlags` / `_poiVisibilityFilter` regenerados con la nueva pertenencia
  (los flags `l_<key>` de la capa symbol deben reflejar las nuevas ramas).
- `IGLESIA_IDS` se conserva (ahora agrupa el subgrupo dentro de Patrimonio).
- Deep links intactos: `#ruta=`, `#patrimonio=`, `#negocio=`, `#3d=`, `#item=ID`.
  `#3d=` sigue resolviendo a la ficha (el tour Matterport vive en la ficha, no en el menú).

## 2. Escritorio (≥1024px): panel izquierdo + chips

**Fila de chips** flotante sobre el mapa (arriba, junto al buscador):
- Un chip por categoría: icono + label + contador. Patrón píldora Komoot con **dos zonas**:
  - Zona check `[✓]`: visible solo en categorías-capa. Estado = capa visible/oculta
    (sustituye al ojo). Click → `layerToggle(key)` sin abrir el panel. `aria-pressed`.
  - Zona label: click → abre esa categoría en el panel izquierdo; si su capa estaba
    apagada se enciende (coherente con `ensureLayerVisibleFor`).
- Chip seleccionado (categoría abierta en panel): relleno con su color de rama.
  Chip con capa oculta: estilo atenuado + check vacío.
- Agenda: chip sin check.

**Panel izquierdo** flotante (~380px, border-radius, sombra, como "Routes" de Komoot):
- Cabecera: título de categoría + contador + botón cerrar. Buscador (el global del cajón).
- Lista de tarjetas de la categoría activa (reutiliza `_cajonCardHTML` / `_cajonLeafHTML`
  y `_cajonBizSubtreeHTML` adaptados). Patrimonio con sus dos subgrupos.
- **Asa-chevron lateral** para colapsar/expandir el panel (como Komoot). Estado colapsado:
  solo chips visibles, mapa protagonista.
- Estado inicial: panel oculto (solo chips); se abre al pulsar el label de un chip.
- El DOM del cajón (`#cajon*`) se transforma en este panel: mismos ids/handlers donde sea
  posible para no romper `js/kiosco.js` y el tutorial.

**Tutorial** (`index.html`): pasos reescritos — ya no existe "panel inferior"; se explica
chips + panel + bottom-nav. Copy en es/en/fr/de.

## 3. Móvil (<1024px): bottom-nav 5 tabs + sheets

- `BOTTOMNAV_TABS` → `['casa', 'patrimonio', 'rutas', 'playascosta', 'negocios']`.
- Iconos SVG outline (stroke 2, 24px, estilo lucide): casa, iglesia/monumento, bota/sendero,
  ola, tienda. Tab activo: **acento único `--bareyo`** (icono + label + pastilla), como el
  verde único de Komoot. Los colores por categoría quedan para pins y chips, no para tabs.
- Tap en tab → **bottom sheet** (media altura, deslizable a completa, asa de arrastre) con el
  mismo contenido de lista que el panel de escritorio. Reutiliza los estados del cajón
  (`cajonSetState peek/half/full`).
- **Casa**: cierra sheet/ficha, re-encuadra el municipio (`fitBounds`), NO resetea capas.
- **Agenda en móvil**: botón flotante 📅 junto a los controles del mapa → abre sheet de Agenda.
- El toggle de visibilidad de capa en móvil: mismo patrón check en la cabecera del sheet
  ("Visible en el mapa").

## 4. Negocios: tonos y filtros por sector

**Paleta armonizada** en `BUSINESS_CATEGORIES` (data.js). Principios: saturación/luminosidad
unificadas (tono ~500-600 para pin/chip activo), contraste AA del glifo blanco sobre el color
en tema claro y oscuro, matices reconocibles por sector:

| Sector | Hoy | Dirección nueva |
|---|---|---|
| alojamiento | #8B5CF6 | violeta armonizado |
| restauracion | #EF4444 | rojo teja (menos saturado) |
| comercio | #F59E0B | ámbar |
| surf | #06B6D4 | cian océano |
| salud | #10B981 | verde esmeralda |
| servicios | #64748B | gris azulado |

Los valores finales se calibran en implementación contra los tokens de `styles-v3.css`
(claro y oscuro) y se validan con contraste AA. Pins del mapa, chips, fichas y cajón/panel
beben todos de `BUSINESS_CATEGORIES` — un solo cambio propaga todo.

**Filtro por sector** (panel/sheet de Negocios):
- Fila de chips de sector (icono + nombre + contador), **multi-selección**, chip "Todos"
  para limpiar. Seleccionar filtra la lista Y los pins del mapa.
- Nuevo filtro de mapa por sector: extender `_poiVisibilityFilter` (o filtro adicional sobre
  `POI_LAYER`) con la subcategoría de negocio. Estado en memoria (no persiste entre sesiones).
- `track('nav_filter', { meta: { sector } })` al filtrar.

## 5. Compatibilidad y migraciones

- **Kiosco** (`?kiosco=1`): no se toca `js/kiosco.js`; tras el cambio se verifica que attract,
  reset y ficha-panel siguen funcionando. Si el nuevo panel choca con el layout del tótem,
  se ajusta solo el bloque `html[data-kiosco]` al final de `styles-v3.css`.
- **`?editor=1`** (chinchetas) y **`/escaparate`**: sin cambios, smoke rápido.
- **SW**: bump `CACHE_VERSION` en el mismo commit que toque shell (guard del CI).
- **track()**: se mantienen `bottomnav_tab` y `theme_toggle`; nuevos: `nav_chip`
  (abrir categoría), `nav_layer` (toggle capa desde chip), `nav_filter` (sector).
- **A11y**: chips con `aria-pressed`, panel con foco gestionado al abrir/cerrar, sheets con
  `Escape`, tabs móvil `role="tablist"` como el actual, contadores con `aria-live` existente.

## 6. Claves i18n nuevas (es/en/fr/de)

`catCoast`, `tabCoast` (etiqueta corta "Costa" para el tab móvil), `chipLayerOn`/`chipLayerOff`
(tooltip del check), `navHome` ("Inicio"),
`panelCollapse`/`panelExpand`, `bizFilterAll` ("Todos"), subgrupos `heritageChurches`
("Iglesias y ermitas") y `heritageMore` ("Más patrimonio"), y el copy nuevo del tutorial.
Regla del proyecto: nombres de entidades vía `POI_I18N` (no se tocan).

## 7. Verificación

1. `node --check` de app.js, data.js, config.js, sw.js, js/track.js, js/kiosco.js, js/editor.js.
2. `python -m http.server 8000` y smoke en navegador (pestaña nueva, SW desregistrado):
   - Escritorio: chips visibles, check apaga/enciende pins y rutas, panel lista con fotos,
     subgrupos de Patrimonio, colapso del panel, filtro de sector filtra lista + mapa.
   - Deep links: `/?check=1#ruta=bareyo-6`, `#patrimonio=faro-ajo` (ahora en Playas y costa),
     `#3d=3d-sta-maria-bareyo`, `#item=ID` retrocompat.
   - Móvil (viewport <1024): 5 tabs, Casa re-encuadra, sheets, botón Agenda.
   - Dark mode (chips/panel con tokens semánticos), 4 idiomas, `?kiosco=1`.
3. Migración de capas: sembrar `bareyo_layers_off = ["playas","vistas3d"]` en localStorage
   y comprobar que queda `["playascosta"]`.
4. Deploy: `vercel deploy --prod` → descubrebareyo.vercel.app y re-verificar en producción.
