# Estado del proyecto — actualizado 2026-07-16 (cierre de jornada, sesión de fotos+diseño)

> Nota: hoy trabajaron DOS sesiones de Claude en paralelo sobre este mismo clon.
> Este cierre cubre la sesión de fotos de negocios / fotos 360 / diseño Mobbin /
> iconos Cordelia / tipografía. La otra sesión (kiosco, agenda, sidebar) tiene sus
> propios commits de hoy.

## Hecho hoy (esta sesión)

- **Fotos de negocios** (`06c5759`): imagen real para El Estanco, Masstige, Antigüedades
  Gargollo y Ajo Natura (+ ~50 negocios más que la sesión paralela había investigado y
  entraron en el mismo commit). Sin foto fiable: biz-069 Semilac y biz-073 Ajo Surf Cantabria.
- **Fotos 360 / drone**: diagnóstico completo. Las 6.080 fotos (466 de dron) están publicadas
  en Google Street View bajo la cuenta "José Manuel Clotitec" y el visor embebido funciona
  SIEMPRE (usa el pano ID). Las miniaturas: las firmadas de Google caducaron (403) y el intento
  de derivarlas de streetviewpixels devuelve **JPEG NEGRO** para fotos de usuario → el geojson
  va sin thumbs a propósito (`1550e35`, nota completa en `scripts/build-fotos360.mjs`).
- **Rediseño de menús con investigación Mobbin** (`5f09636` + prototipos en `docs/prototipos/`):
  menú de idiomas con banderas SVG + endónimo + check (patrón Memrise) siempre visible;
  pill protagonista «📷 Fotos 360 · 6.080» (patrón Hypelist); toolbar más limpia.
- **Iconos oficiales de Cordelia en el mapa** (`ba645b6`): los PNG ilustrados pasan a prioridad 1
  (los tapaba el sistema de glifos SVG), normalizados con pixelRatio; cabo cableado a Cabo
  Quintres. 2 fixes de carrera: re-render encolado a 'idle' y clamp del fade (opacidad negativa).
- **5 iconos nuevos al estilo Cordelia** (`c4312c4`): playas de Cuberris y Antuerta, San Roque,
  San Pedruco y San Martín de Tours — generados con Nano Banana Pro (Magnific/Freepik) con 2
  oficiales de referencia + recorte de fondo. **Sustituibles**: mismo nombre de fichero en
  `assets/icons/pin/` si Cordelia entrega los definitivos. Con esto, 14/14 POIs con pin ilustrado.
- **Limpieza de menús** (`ba645b6`): banner «Güemes Pueblo del Año» fuera del cajón (sigue en
  Agenda); QR «llévatelo en tu móvil» fuera de las fichas de NEGOCIO del kiosco.
- **Visor de coordenadas del cursor** (`ba645b6`): botón en el menú «···» → barrita lat/lng en
  vivo; clic en el mapa copia `[lng, lat]` en formato data.js con toast. Para dar de alta POIs.
- **Tipografía de identidad Clotitec 2026** (`b621365`): Jost (equivalente libre de la
  BauhausSansGeoNeuVF 600 del manual `Identidad de marca Clotitec.pdf`) sustituye a Fraunces
  en display; DM Sans se queda de cuerpo. Manual en
  `C:\Users\Usuario\Desktop\RRSS CLOTITEC 2026\CLOTITEC LOGO\`.
- SW: bumps encadenados hasta `v2.2026.07.16g`. Todo desplegado y verificado en producción, CI verde.

## PLAN PARA MAÑANA (pedido explícito del usuario, en este orden)

1. **Fondo de carga con texto sobre el mapa**: cuando el mapa/las capas están cargando, meter
   un overlay de marca (fondo + texto tipo «Cargando el mapa de Bareyo…») en vez del vacío
   actual. Puntos de enganche: init del mapa en `app.js` (evento `load`/`idle` de MapLibre),
   descarga del geojson de fotos 360 (ya hay toast, subir a overlay), y `loadDataLayer`.
   Usar tokens de `styles-v3.css` + la nueva tipografía Jost. Idealmente reutilizar el
   `.loader-logo-app` de la landing.
2. **Componentes que no lanzan / no cargan bien** (queja del usuario, coincide con lo visto hoy):
   - Síntoma reproducido: los POIs no se renderizan hasta que algo dispara `loadDataLayer`
     (en las pruebas de hoy hubo que forzarlo a mano); investigar el orden de arranque
     landing → explorar → initMap → loadDataLayer y el papel del tutorial de primera visita.
   - El SW **congela el shell hasta 5 min tras cada deploy** (el precache de `sw.js` usa la
     caché HTTP con `max-age=300`): aplicar el fix ya documentado en `docs/hoja-diseno.html`
     (P2-12): `cache: 'reload'` en el precache del install + revisar el flujo SKIP_WAITING.
   - Revisar los `_poiFadeRaf`/renders con estilo ocupado tras los fixes de hoy (regresiones).
   - Herramienta útil nueva: el visor de coordenadas y `map.listImages()` para diagnóstico.
3. Si sobra tiempo: portar el panel de lentes (prototipo C) al kiosco.

## Pendiente heredado (sin cambios)
- Tildes que faltan en el copy ("Guia", "Busqueda"…) — `index.html` + `data.js`.
- Fotos reales de negocios del cliente (`assets/biz/` vacío) — hoy ya hay ~55 con foto de internet.
- POI del **Palacio/Casona de Güemes**: icono oficial listo (`assets/icons/pin/palacio-guemes.png`),
  falta que el usuario pase nombre+coordenadas (puede sacarlas con el visor de coordenadas).
- Miniaturas 360 definitivas: re-exportar los JSON con la cuenta Google propietaria o volcar
  stills en `assets/poi/{id}.webp` (la cascada de cabeceras ya lo soporta).
- `iconos reales bareyteo/` (24 MB, originales de Cordelia + logos) sin commitear a propósito.

## Cómo retomar
- Carpeta: `F:\descubre-bareyo-v2` · Local: `python -m http.server 8000` → `http://localhost:8000/`
- Checks pre-push (como el CI): `for f in app.js data.js config.js sw.js js/track.js js/kiosco.js kiosko.js; do node --check "$f"; done`
- Producción: https://descubre-bareyo-v2.vercel.app · auto-deploy en push a `main`
- Prototipos de diseño: `docs/prototipos/index.html` (servir desde la raíz)

## Decisiones y avisos nuevos (2026-07-16)
- **Identidad Clotitec 2026**: primario `#ff5722`, secundario `#d4ede5`, terciario `#1a1a1a`,
  tipografía primaria BauhausSansGeoNeuVF 600 (→ Jost como equivalente libre en la app).
- Los pins de POI eligen icono en este orden: **PNG ilustrado (Cordelia) → glifo SVG → pin emoji**.
- Las miniaturas de streetviewpixels NO sirven para fotos 360 de usuario (JPEG negro) — no reintentar.
- Al verificar en local con Playwright: el SW se re-registra en cada carga y sirve shell viejo;
  desregistrar SW + borrar caches + pestaña nueva antes de cada verificación.
- Cualquier cambio del shell requiere bump de `CACHE_VERSION` (el guard del CI lo impone).
