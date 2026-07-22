# Estado del proyecto — actualizado 2026-07-22 ~13:30 (cierre de media jornada; se sigue POR LA TARDE)

> RAMA DE TRABAJO: **`v3`** (no volver a main para desarrollar). `main` = tótem estable
> en descubre-bareyo-v2.vercel.app. La versión nueva vive en el proyecto Vercel
> **descubrebareyo** → https://descubrebareyo.vercel.app (deploy por CLI: `vercel deploy --prod`).

## Hecho hoy (mañana del 22-07, commits aa03a63…5f7fcfa en v3)

- **Fix X táctil**: cierre síncrono idempotente + fallback pointerup + touch-action none +
  hit-area ampliada (`app.js` dismissDetail/dismissEvent + bloque CLOSERS, `styles-v3.css`).
- **Capas auto-visibles**: abrir una ficha enciende su capa si estaba apagada
  (`ensureLayerVisibleFor`) — era la causa del "empresas/rutas salen mal" del tótem.
- **Selector de basemaps** Claro/Carto/Oscuro/Satélite (`setBasemap`, popover `#basemapMenu`)
  con límite municipal en blanco grueso + halo sobre satélite/oscuro (`addBoundaryMask`).
- **Editor de chinchetas** `?editor=1` (`js/editor.js`): interceptar openDetail → chincheta
  roja arrastrable → panel Copiar (localStorage `bareyo_editor_edits`).
- **Banderas de playa**: `api/banderas.js` (Cruz Roja Cuberris id 1014 + estimación oleaje
  Open-Meteo) + cron cada 10 min en `vercel.json`; cascada en `loadBeachFlags` (manual del
  dashboard gana). Verificado en producción.
- **Modo escaparate** `/escaparate` (escaparate.html): vídeo bucle (espera
  `assets/kiosco/escaparate.mp4`) con fallback slideshow + QR + Wake Lock + reload 6 h.
- **Bottom-nav móvil v1**: Mapa·Patrimonio·Rutas·Playas·Negocios (`renderBottomNav`).
- **Ruta 6 = Ruta del Patrimonio de Bareyo**: renombrada (data.js + POI_I18N es/en/fr),
  10 hitos del KMZ como `waypoints` con popup en el mapa, GPX regenerado con `<wpt>`.
- **Textos de patrimonio integrados**: campo `history[]` + sección "Historia y detalle" en
  12 fichas (6 costa + 6 tours 3D) desde `docs/contenido/doc-patrimonio-1/2.txt`.
- Proyecto Vercel **descubrebareyo** creado y desplegado (con `.vercelignore`: julio2026/
  pesa 7,9 GB y rompía la subida). SW en `v3.2026.07.22d`.

## Pendiente (en orden — ESTA TARDE)

1. **Rediseño visual y tipográfico** (petición del usuario: "más moderna y atractiva").
   Plan acordado en el último mensaje: investigación Mobbin → 2-3 direcciones de diseño
   sobre pantallas reales (landing, cajón/menú, fichas) → elegir → implementar.
   Relacionado: tarea 2 del backlog (simplificar cajón) y prototipos de `docs/prototipos/`.
2. **El usuario coloca chinchetas con `?editor=1`** (Ría de Ajo y Ermita de San Pedruco =
   "San Pedro de Sopoyo") y pega el bloque → fijar en `data.js`.
3. **4 POIs nuevos con texto listo y SIN coordenadas** (docs/contenido/): Palacio de Güemes
   (icono ya en `assets/icons/pin/palacio-guemes.png`), Albergue El Abuelo Peuto, Boleras de
   Pasabolo losa, Casona Camino de la Isla.
4. **Vídeo del escaparate**: guion desde docs/contenido + modelos 3D; subir como
   `assets/kiosco/escaparate.mp4`.
5. Resto del backlog: `docs/mejoras/backlog-2026-07-22.md` (kiosco integral, dashboard
   ayuntamiento Neon vs Supabase, gamificación ruta 6, animaciones, traducir history[]).

## Cómo retomar

- Carpeta: `F:\descubre-bareyo-v2` · rama `v3` (`git checkout v3`)
- Local: `python -m http.server 8000` → http://localhost:8000/
- Deploy nuevo: `vercel deploy --prod --yes` (CLI ya logueada, proyecto linkado en `.vercel/`)
  → https://descubrebareyo.vercel.app · **SIEMPRE bump de `CACHE_VERSION` en sw.js antes**
- Checks: `for f in app.js data.js config.js sw.js js/track.js js/kiosco.js js/editor.js api/banderas.js; do node --check "$f"; done`
- Verificar producción con Playwright: desregistrar SW + borrar caches + **pestaña nueva** +
  ojo: navegar de `/` a `/#ruta=x` NO recarga (usar `/?check=1#ruta=x`).

## Decisiones y avisos nuevos (2026-07-22)

- Pantalla del tótem: **Traulux TLM75S** (Android, Charmex). Trae encendido/apagado programado
  → configurar in situ para el modo escaparate del finde (manual: charmex.net, ver backlog #13).
- Banderas: la memoria antigua "no hay feed de Cruz Roja" era FALSA — hay scraping estable
  (sistema de descubrecantabria). Antuerta no está en el catálogo oficial: siempre estimada.
- El nombre visible de entidades sale de `POI_I18N` (también en ES): al renombrar algo hay
  que tocar data.js Y su entrada POI_I18N.
- Pendiente heredado sin cambios: tildes del copy, fotos assets/biz/ del cliente, miniaturas
  360 definitivas, 12 QRs de Switchy, `iconos reales bareyteo/` sin commitear a propósito.
