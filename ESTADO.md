# Estado del proyecto — actualizado 2026-07-23 (cierre: rediseño Komoot + editor de empresas ENTREGADOS)

> RAMA DE TRABAJO: **`v3`** (no volver a main para desarrollar). `main` = tótem estable
> en descubre-bareyo-v2.vercel.app. La versión nueva vive en el proyecto Vercel
> **descubrebareyo** → https://descubrebareyo.vercel.app (deploy por CLI: `vercel deploy --prod --yes`).

## Hecho hoy (23-07, ~13 commits en v3) — rediseño de navegación estilo Komoot

Specs y planes en `docs/superpowers/specs|plans/2026-07-23-*`. Cada task verificada con
Playwright ANTES de su commit (ver "Cómo verificar" abajo).

- **5 categorías sin duplicados**: fuera `guemes` y `vistas3d`; **Playas y costa**
  (`playascosta`, i18n `catCoast`) = 2 playas + Ría de Ajo, La Ojerada, Faro de Ajo y
  Cabo Quintres vía `coast: true` en data.js. Patrimonio con subgrupos "Iglesias y
  ermitas" (7) / "Más patrimonio". `_poiBranchFlags` = una capa por entidad. Migración
  automática de `localStorage[bareyo_layers_off]` (playas→playascosta).
- **Escritorio**: fila de **chips** sobre el mapa (check integrado = capa on/off,
  sustituye a los ojos; label = abre categoría) + **panel izquierdo flotante** colapsable
  con asa-chevron (arranca plegado); mapa a sangre completa; rail de controles a la
  derecha. Los ojos 👁 del árbol quedan SOLO en kiosco.
- **Móvil**: bottom-nav `Inicio·Patrimonio·Rutas·Costa·Negocios` (acento único --bareyo,
  etiqueta corta `tabCoast`), Casa = dismiss+`resetView()`, check de capa en la cabecera
  del sheet, Agenda = píldora flotante existente.
- **Negocios**: paleta `BUSINESS_CATEGORIES` armonizada (contraste ≥3:1 glifo blanco) +
  chips de sector multi-selección que filtran lista Y pins (`_bizSectorsOff`,
  `_poiVisibilityFilter` por `properties.category`). track: `nav_chip`, `nav_layer`,
  `nav_filter`.
- **Editor de empresas** en dashboard (`/dashboard.html#empresas`, pestaña Empresas):
  listado 96 + buscador + chips de sector; ficha con diff antes→después, mini-mapa
  MapLibre con pin arrastrable (coords originales preservadas — sin diffs fantasma);
  altas `biz-0XX` auto + slug único; bajas reversibles; fotos canvas→`{id}.webp` para
  `assets/biz/`; **Generar data.js** = bloque `businesses[]` canónico completo
  (copiar/descargar) + limpieza de cambios ya aplicados al recargar. Estado pendiente en
  `localStorage[bareyo_biz_edits]`. Supabase = hook stub para S10. Manual en
  `docs/CONTRIBUTING.md`.
- **Tutorial** reescrito (chips/panel/bottom-nav) y kiosco verificado intacto
  (split, ojos grandes, sin chips). SW en `v3.2026.07.23g`.

## ⚠️ Avisos nuevos (23-07)

- **Modo oscuro RETIRADO en v3**: `toggleTheme()` es no-op desde que entró el selector de
  basemaps (22-07). Los componentes nuevos usan tokens semánticos por si vuelve.
- El **primer pegado** del bloque "Generar data.js" reformatea las 96 entradas (diff
  grande una sola vez; después los diffs son por campo).
- `config.js` local tiene `DASHBOARD_PASSWORD_HASH` real (la clave demo "bareyo" NO entra);
  para tests se entra sembrando `sessionStorage[bareyo_dashboard_authed]='1'`.

## Pendiente (en orden)

1. **Probar en las pantallas** (tótem Traulux TLM75S): https://descubrebareyo.vercel.app/?kiosco=1
   — al abrir, pestaña nueva y recargar una vez para que el SW coja `23g`.
2. **El usuario coloca chinchetas con `?editor=1`** (Ría de Ajo y Ermita de San Pedruco =
   "San Pedro de Sopoyo") y pega el bloque → fijar en `data.js`.
3. **4 POIs nuevos con texto listo y SIN coordenadas** (docs/contenido/): Palacio de Güemes
   (icono en `assets/icons/pin/palacio-guemes.png`), Albergue El Abuelo Peuto, Boleras de
   Pasabolo losa, Casona Camino de la Isla. → Ahora se pueden ALTA desde el editor de
   empresas si son negocios, o a mano si son patrimonio.
4. **Vídeo del escaparate**: guion desde docs/contenido + modelos 3D; subir como
   `assets/kiosco/escaparate.mp4`.
5. Traducir el tutorial nuevo (hoy solo ES inline) + tildes del copy heredadas.
6. Resto del backlog: `docs/mejoras/backlog-2026-07-22.md`.

## Cómo retomar

- Carpeta: `G:\descubre-bareyo-v2` (antes F:) · rama `v3` · GitHub sincronizado (origin/v3)
- Local: `python -m http.server 8000` → http://localhost:8000/
- Deploy: `vercel deploy --prod --yes` (CLI 54.x logueada, proyecto linkado en `.vercel/`)
  → https://descubrebareyo.vercel.app · **bump de `CACHE_VERSION` en sw.js si tocas shell**
- Checks: `for f in app.js data.js config.js sw.js js/track.js js/kiosco.js js/editor.js api/banderas.js; do node --check "$f"; done`
- **Cómo verificar (importante)**: con **Playwright global** (la pestaña de la extensión
  de Chrome queda oculta y congela MapLibre — falsos negativos):
  `$env:NODE_PATH='C:\Users\info\AppData\Roaming\npm\node_modules'; node script.js`,
  esperar `map.loaded()` y navegar SIEMPRE con hash (`#tab=hiking`) o `?kiosco=1`
  (sin hash se queda en la landing y `map` no existe). Plantillas: scratchpad de la
  sesión 23-07 (`verify-task2..7.js`, `verify-editor.js`).

## Pendiente heredado sin cambios

Fotos assets/biz/ del cliente · miniaturas 360 definitivas · 12 QRs de Switchy ·
clave OpenChargeMap · `iconos reales bareyteo/` sin commitear a propósito ·
OSD-lock de la pantalla del tótem (manual charmex.net).
