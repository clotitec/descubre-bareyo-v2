# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project identity

Guía interactiva turística del **municipio de Bareyo (Cantabria)** — cliente: **Ayuntamiento de Bareyo**, desarrollada por **Clotitec**. Sigue la guía de diseño `../CLOTITEC_MAPAS_INTERACTIVOS_V2.md` (paleta, pills, emojis 3D, tutorial spotlight, ficha modal).

## Common commands

No hay build, no hay tests automatizados, no hay linter. Verificación es manual + sintaxis.

```bash
# Servir en local (cualquiera vale)
python -m http.server 8000
# o: npx serve .

# Verificar sintaxis JS de los ficheros principales
node --check app.js
node --check data.js
node --check js/track.js
node --check sw.js
node --check config.js

# Validar JSON
node -e "JSON.parse(require('fs').readFileSync('manifest.json'))"
node -e "JSON.parse(require('fs').readFileSync('vercel.json'))"

# Despliegue (Vercel detecta como estático, sin build)
vercel
```

URLs locales clave para probar:
- `/` — app principal
- `/dashboard.html` — analíticas (clave demo: `bareyo`)
- `/qr-print.html` — generador de placas QR (misma clave)
- `/formulario-empresas.html` — directorio público + alta
- `/?qr=ruta-iglesias` — simula scan de QR físico

## Hard constraints

- **Vanilla HTML/CSS/JS**. Sin framework, sin bundler, sin TypeScript, sin `npm install` requerido para servir.
- **CDNs permitidos**: unpkg (MapLibre 4.1.2), cdn.tailwindcss.com, fonts.googleapis.com, jsdelivr (Chart.js, qrcode).
- **No introducir** Vite/Webpack/React/Vue/TS sin discusión. La mantenibilidad por terceros (ayuntamiento) depende de no tener tooling.

## High-level architecture

### Páginas y responsabilidades

| Página | Propósito | Auth |
|---|---|---|
| `index.html` + `app.js` | App principal: mapa MapLibre, fichas, tutorial, geolocalización, clima/mareas/aire/sol | Pública |
| `dashboard.html` | KPIs + gráficos Chart.js + solicitudes pendientes | Login SHA-256 |
| `qr-print.html` | Generador client-side de placas QR imprimibles A4 | Login SHA-256 |
| `formulario-empresas.html` | Directorio público + form alta/modificar/baja con MapLibre y subida de fotos | Pública |
| `offline.html` | Fallback del Service Worker | Pública |

### Carga y dependencia entre scripts (orden importa)

```
data.js   → exports CONFIG, hikingRoutes, costaPoints, points3D, businesses,
            BUSINESS_CATEGORIES, CATEGORY_EMOJIS, BIZ_DEFAULT_IMAGES,
            WMO_CODES, TRANSLATIONS, currentLang, t(), slugify(), getBizImage()
            (todos como GLOBALS — sin export/import)
config.js → window.BAREYO_CONFIG = { SUPABASE_URL, SUPABASE_ANON_KEY,
            DASHBOARD_PASSWORD_HASH, APP_VERSION }   ← cliente rellena en deploy
js/track.js → expone window.track(type, payload) y window.flushAnalytics()
              POST a Supabase cuando online, IndexedDB buffer cuando offline,
              fallback a localStorage en modo demo
app.js    → 12 secciones numeradas (mapa, UI, marcadores, detail modal, perfil
            altimétrico, búsqueda, bottom sheet, weather/marine/sun/air/wiki/audio,
            deep linking + OG + QR + tracking ruta, idiomas, utils)
sw.js     → Service Worker registrado desde index.html. Versionado por
            CACHE_VERSION; estrategias: shell+GPX cache-first, tiles SWR,
            APIs network-first con timeout 3s, imágenes cache-first
```

`data.js` es el **source of truth** de los 96 negocios y de las rutas/patrimonio/3D. Migración a Supabase pospuesta hasta que el cliente valide el flujo de moderación.

### Modo demo vs producción

`config.js` arranca con `SUPABASE_URL` y `SUPABASE_ANON_KEY` vacías → **modo demo**: eventos analytics y solicitudes de alta van a `localStorage`. El dashboard y el formulario funcionan al 100% en este modo. Cuando se rellenen las claves, todo bascula a Supabase automáticamente sin tocar código de la app. Esquema SQL en `docs/DEPLOY.md`.

La anon key de Supabase **no es secret estricto**: va al cliente y la seguridad recae en Row Level Security (RLS) — `events` solo INSERT, `business_requests` solo INSERT con `status=pending`, `qr_locations` solo SELECT.

### Patrones de código a respetar

- **Funciones globales** declaradas en `app.js` se llaman desde HTML con `onclick="..."`. Mantener este patrón hasta que justifique modularizar.
- **`cachedFetch(key, url, ttlMin)`** — toda llamada a API externa pasa por aquí. Usa `localStorage` con TTL + fallback a stale en error de red.
- **`track(type, payload)`** — instrumentación de analytics. Tipos en uso: `pageview`, `detail_open`, `gpx_download`, `phone_click`, `audio_play`, `qr_scan`, `biz_request`. Si añades una acción medible, llama a `track()`.
- **i18n**: claves en `TRANSLATIONS` (data.js) para los 4 idiomas (es/en/fr/de). En HTML usar `data-i18n="clave"`. En JS usar `t('clave')`. Cambiar idioma dispara `applyTranslations()`.
- **Deep links**: `#ruta=slug` / `#patrimonio=slug` / `#negocio=slug` / `#3d=slug`. Mantener `#item=ID` por retrocompat.
- **QRs físicos**: una URL `?qr=<id>` activa `handleQrEntry()` → registra `qr_scan` → resuelve a entidad → setea hash → limpia query param. El `<id>` puede ser un ID de entidad (`bareyo-1`, `faro-ajo`) o un id propio de placa registrado en Supabase `qr_locations`.
- **Open Graph**: `updateOpenGraph()` se llama en `updateHash()` → al abrir/cerrar detalle se actualizan og:title/description/image dinámicamente.

### Centro y zoom del mapa

`[-3.5938, 43.4735]` (lon, lat — formato MapLibre), zoom 13, pitch 35°, bearing -10°. Constantes en `data.js → CONFIG`.

## Decisiones de scope

- **i18n solo en la app principal** (`index.html` + `app.js`). El dashboard, qr-print y formulario-empresas se mantienen en español: el primero es uso interno del ayuntamiento, los otros para emprendedores locales (todos hispanohablantes). Si el cliente lo pide, ampliar usando el mismo patrón `TRANSLATIONS` + `t()` + `data-i18n`.
- **Mareas calculadas client-side** (M2+S2 con epoch Santander en `app.js → TIDE_CFG`). Aproximación turística, **no para nautica** — hay disclaimer visible. Cuando llegue 2027, recalibrar `TIDE_CFG.epoch` con la primera pleamar real del año.

## Decisiones tomadas que conviene respetar

- **Solo APIs gratuitas sin key** salvo aprobación explícita del cliente.
- **Eleven Labs descartado** — TTS con Web Speech API (gratuito). Eleven Labs queda como upgrade si el cliente paga.
- **Audio-guías** se ofrecen en rutas/costa/3D, **no** en negocios.
- **Imágenes locales** (`assets/biz/{id}.webp`) tienen prioridad sobre Unsplash. Las fotos las suministra el cliente; mientras, fallback automático funciona.
- **Mareas exactas** (pleamar/bajamar): ninguna API gratis sin key cubre España. Plan: tabla anual precomputada offline (`assets/data/tides-YYYY.json`) cuando el cliente lo pida. Open-Meteo Marine cubre oleaje.
- **Modelos 3D Matterport** actualmente con URLs placeholder (`m=placeholder_1/2`). Pedir al cliente las URLs reales antes de marketing.

## Anti-patrones

- No hardcodear strings UI sin meterlos en `TRANSLATIONS`.
- No mostrar NIF/CIF de negocios (privacidad, decisión Clotitec v2 §11).
- No romper retrocompat de URLs `#item=ID`.
- No acoplar el dashboard a `data.js` — el dashboard lee de Supabase/localStorage analytics, no de `data.js`. (Excepción: el dashboard usa `data.js` solo para resolver `entity_id → name` cuando muestra rankings.)
- No añadir dependencias por capricho. Cada CDN nuevo se justifica.

## Cómo añadir cosas

Detallado en `docs/CONTRIBUTING.md`:
- Negocio nuevo (`businesses[]` en data.js)
- Ruta GPX (`hikingRoutes[]` + archivo en `assets/tracks/`)
- Punto de patrimonio o 3D
- Idioma nuevo (`TRANSLATIONS` + bandera SVG en index.html)
- QR físico (`qr_locations` en Supabase + generar placa con `qr-print.html`)

## Documentación de soporte

- `README.md` — overview del proyecto y cómo arrancar.
- `docs/ARCHITECTURE.md` — diagramas de flujo y modelo de datos en detalle.
- `docs/API_KEYS.md` — APIs externas, caché, rate limits.
- `docs/DEPLOY.md` — Vercel, headers, esquema SQL Supabase, RLS.
- `docs/CONTRIBUTING.md` — cómo añadir cualquier tipo de entidad.
- `docs/PRIVACY.md` — qué se rastrea, RGPD.
- `docs/CHANGELOG.md` — estado de los sprints S1–S10.

## Plan vigente

Plan maestro en `~/.claude/plans/federated-giggling-riddle.md`. Sprints S1–S9 ya entregados; S10 (migrar `businesses` a Supabase) pospuesto a la espera de que el cliente valide el flujo de moderación de S9.
