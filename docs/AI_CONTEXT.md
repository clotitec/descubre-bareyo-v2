# Contexto del sistema — Descubre Bareyo v2

> **Para qué sirve este documento:** pégalo (entero o por secciones) en otra IA
> (ChatGPT, Gemini, Grok, otro agente...) para pedir una segunda opinión sobre
> arquitectura, UX, seguridad, rendimiento o roadmap. Está escrito a partir del
> **estado real del código y del CI el 2026-07-12**, no solo de los docs
> internos — donde hay diferencia entre "lo que dice la documentación" y "lo
> que hay en el repo", se marca explícitamente (sección 9).
>
> Complementa, no sustituye, a `CLAUDE.md` (reglas para Claude Code) y
> `docs/ARCHITECTURE.md`/`docs/CHANGELOG.md` (más detalle histórico).

---

## 1. Qué es el proyecto

**Descubre Bareyo** es una guía turística interactiva del municipio de Bareyo
(Cantabria, España — núcleos Ajo, Bareyo, Güemes), encargada por el
Ayuntamiento de Bareyo y desarrollada por **Clotitec**. Es una web/PWA y,
además, una **app de kiosco táctil de 65"** para la oficina de turismo.

- Producción: https://descubre-bareyo-v2.vercel.app (auto-deploy en cada push a `main`)
- Repo: https://github.com/clotitec/descubre-bareyo-v2
- Cliente final: personal municipal sin conocimientos técnicos (de ahí la
  restricción "sin build, sin tooling" — deben poder editar `data.js` a mano).

Contenido cubierto: 6 rutas de senderismo con GPX+altimetría+fotos 360, ~7
puntos de costa/patrimonio, 6 templos románicos con **tours Matterport reales
y en vivo**, 96 negocios locales, agenda de eventos municipales en vivo,
condiciones del mar/tiempo/mareas, y una capa de "servicios" tipo utilities
(luz, gasolineras, festivos, carga eléctrica).

## 2. Restricciones duras (no negociables)

- **Vanilla HTML/CSS/JS.** Sin build, sin framework (nada de React/Vue/Svelte),
  sin TypeScript, sin `npm install`. Solo CDNs (unpkg, cdn.tailwindcss,
  fonts.googleapis, jsdelivr). Motivo: el ayuntamiento debe poder mantenerlo
  sin cadena de herramientas.
- **`data.js` es el source of truth** de negocios/rutas/patrimonio/3D — un
  fichero JS plano con arrays de objetos, no una base de datos (la migración a
  Supabase para `businesses` está pospuesta, ver §7 S10).
- **Solo APIs gratuitas sin key**, salvo aprobación explícita del cliente.
- **Sin backend propio.** Supabase (BaaS) cubre analítica y formularios; el
  resto son APIs públicas llamadas directamente desde el navegador.

## 3. Arquitectura

Es una SPA estática client-side. No hay servidor de aplicación; Vercel sirve
ficheros tal cual.

```
Navegador
 ├─ index.html → app.js → MapLibre GL JS (mapa 3D) ← data.js (datos embebidos)
 ├─ kiosko.html → kiosko.js  (misma base de datos, UI adaptada a pantalla táctil 65")
 ├─ dashboard.html          (panel de analítica + moderación, login SHA-256 local)
 ├─ formulario-empresas.html (alta/edición de negocios, directorio filtrable)
 ├─ qr-print.html           (generador/impresión de QR físicos)
 ├─ sw.js                   (Service Worker — PWA offline)
 └─ APIs externas sin key: Open-Meteo (clima/marine/aire), Sunrise-Sunset,
    Wikipedia REST, Nominatim, Overpass (edificios 3D), REData/REE (PVPC),
    MITECO Geoportal (gasolineras), OpenChargeMap (EV, gated tras key propia)
 └─ Supabase (opcional, hoy en modo demo con claves vacías → localStorage):
    events · business_requests · qr_locations · beach_flags
```

Orden de carga en el HTML importa:
```
data.js   → CONFIG, hikingRoutes, costaPoints, points3D, businesses,
            BUSINESS_CATEGORIES, CATEGORY_EMOJIS, WMO_CODES, TRANSLATIONS,
            POI_I18N, currentLang, t(), slugify(), getBizImage()
config.js → window.BAREYO_CONFIG = { SUPABASE_URL, SUPABASE_ANON_KEY,
            DASHBOARD_PASSWORD_HASH, APP_VERSION, OPENCHARGEMAP_KEY }
js/geo.js   → helpers geométricos (resamplePath, bearing, buildRouteIndex…)
js/track.js → window.track(type, payload): analítica, con buffer offline
app.js    → toda la lógica de la app principal (~194 KB): mapa, fichas,
            filtros, i18n, tema, audio-guías, tracking de ruta, OG dinámico
kiosko.js → lógica específica del kiosco táctil (~48 KB)
sw.js     → Service Worker, CACHE_VERSION versionado
```

Todo el JS son **funciones globales** (sin `export`/`import`), porque el HTML
las invoca con `onclick="…"`. No hay estado compartido vía framework: todo
vive en clausuras de `app.js`.

## 4. Estructura de archivos

```
descubre-bareyo-v2/
├── index.html, kiosko.html, dashboard.html,
│   formulario-empresas.html, qr-print.html, offline.html   páginas estáticas
├── app.js (~194 KB) · kiosko.js (~48 KB)                   lógica principal
├── data.js (~160 KB)                                        source of truth
├── config.js                                                claves runtime (públicas)
├── sw.js                                                     Service Worker
├── styles.css (legacy) + styles-v3.css (design system v3)   CSS, orden importa
├── js/geo.js, js/track.js                                   helpers compartidos
├── assets/
│   ├── biz/          fotos de negocios (1 archivo real hoy: README — pendiente cliente)
│   ├── tracks/        6 GPX + JSON paralelos por ruta
│   ├── data/          edificios.geojson, festivos-2026.json, fotos360.geojson (6080 fotos), icv-bareyo.json
│   ├── icons/          SVG + PNG de POIs (pin, svg)
│   └── icon-*.png, og-cover.jpg, logo.png
├── docs/               documentación (ver tabla más abajo)
├── scripts/             fetch-events.mjs (cron agenda), gen-pwa-assets.ps1, build-*.mjs
├── tests/                tests node (fetch-events, geo-buildings, etc.)
├── events.json          agenda municipal (generada por GitHub Action diaria)
├── manifest.json, vercel.json, sitemap.xml, robots.txt
└── .github/workflows/check.yml   CI: sintaxis JS/JSON, sitemap, guard CACHE_VERSION
```

Documentación existente:

| Doc | Contenido |
|---|---|
| `CLAUDE.md` | Reglas/convenciones para Claude Code (repo root) |
| `docs/ARCHITECTURE.md` | Flujos, modelo de datos, capas del mapa |
| `docs/API_KEYS.md` | APIs externas y caché (⚠️ parcialmente desactualizado, §9) |
| `docs/DEPLOY.md` | Vercel + esquema SQL Supabase + RLS |
| `docs/CONTRIBUTING.md` | Cómo añadir negocio/ruta/idioma/QR |
| `docs/PRIVACY.md` | RGPD, qué se rastrea |
| `docs/CHANGELOG.md` | Historial de sprints S1–S9 + hardening + fase kiosko |
| `docs/CONTINUACION.md` | Traspaso de sesión (⚠️ desactualizado, describe una rama ya mergeada, §9) |
| `docs/hoja-diseno.html` | Auditoría de 39 hallazgos (2026-07-02) + design system |
| `docs/novedades-v3.html` | Notas de versión v2→v3 |
| `docs/mejoras/guia-oficina-kiosko.md` | Manual de operación del kiosco 65" (para personal no técnico) |
| `docs/mejoras/qr-deeplinks.md` | Mapping de 12 QR físicos → deep-links (pendiente de aplicar en Switchy) |
| `docs/contenido/*.md` | Guiones de audioguías y textos por localidad |

## 5. Modelo de datos (`data.js`)

| Símbolo | Contenido |
|---|---|
| `CONFIG` | centro, zoom, pitch, bearing del mapa |
| `hikingRoutes[]` (6) | rutas con `coords: [[lon,lat,alt],...]`, `gpxUrl`, dificultad, km |
| `costaPoints[]` (~7) | patrimonio/costa, algunos con `wikiTitle` (Wikipedia) y `beach`/`flag` |
| `points3D[]` (6) | templos románicos con `url360` **Matterport reales y verificados en vivo** (ver §9 — esto contradice lo que dicen `CLAUDE.md`/`README.md`, que aún hablan de placeholders) |
| `businesses[]` (96) | negocios: id, categoría/subcategoría, coords, contacto, `image`/`localImage` |
| `BUSINESS_CATEGORIES`, `CATEGORY_EMOJIS`, `BIZ_DEFAULT_IMAGES` | taxonomía de negocios |
| `WMO_CODES` | códigos meteo OMM completos, trilingües |
| `TRANSLATIONS` | claves i18n `{es,en,fr,de}` — **solo para la app principal**; dashboard/formulario/kiosko-mantenimiento quedan en español |
| `POI_I18N` | narración/audioguía y textos por POI, `{es,en,fr}` (sin `de`) |
| `festivos-2026.json`, `icv-bareyo.json`, `edificios.geojson`, `fotos360.geojson` | datasets estáticos aparte, en `assets/data/` |

Coordenadas **siempre `[lng, lat]`** (formato MapLibre) — si vienen de Google
Maps hay que voltearlas.

## 6. Patrones específicos del proyecto (para que otra IA no reinvente la rueda)

- **`cachedFetch(key, url, ttlMin)`** — toda llamada a API externa pasa por
  aquí: localStorage con TTL + fallback a caché caducada si la red falla.
- **`track(type, payload)`** — analítica hacia Supabase (o localStorage en
  modo demo), con buffer IndexedDB offline. Tipos: `pageview`, `detail_open`,
  `gpx_download`, `phone_click`, `audio_play`, `qr_scan`, `biz_request`,
  `theme_toggle`.
- **i18n**: `TRANSLATIONS` (data.js) + `data-i18n="clave"` en HTML + `t('clave')`
  en JS. Solo en la app principal.
- **Deep links**: `#ruta=slug` / `#patrimonio=slug` / `#negocio=slug` /
  `#3d=slug`, con retrocompat `#item=ID`.
- **QR físico**: `?qr=<id>` → `handleQrEntry()` → `track('qr_scan')` → hash →
  limpia el query param. `<id>` puede ser id de entidad o id propio de placa
  (tabla `qr_locations` en Supabase).
- **OG dinámico**: `updateOpenGraph()` en cada cambio de hash.
- **Modo oscuro**: `currentTheme` en localStorage + `<html data-theme>`;
  variables semánticas en `styles-v3.css` (`--surface`, `--text`…), nunca hex
  hardcoded en componentes nuevos.
- **Mareas**: cálculo cliente M2+S2 (`TIDE_CFG` en app.js, calibrado para
  Santander 2026 — recalibrar `epoch` cada año).
- **Moderación (dashboard)**: `_requestsCache` → `approveRequest`/`rejectRequest`
  → `buildBizJson()` genera el snippet a pegar en `data.js → businesses[]`
  (el alta NO es automática, es curada por el ayuntamiento).
- **A11y**: skip-link, `aria-live` en contadores, focus-trap en modales,
  `Escape` cierra modal/tutorial.

## 7. "Habilidades" / módulos funcionales — estado real (2026-07-12)

Todo lo listado aquí está **en `main`, desplegado en producción**, salvo que
se indique lo contrario.

| Módulo | Estado | Detalle |
|---|---|---|
| Mapa 3D (terreno DEM + edificios OSM + satélite drapeado) | ✅ vivo | ~218 edificios reales vía Overpass, pre-horneados en `assets/data/edificios.geojson` |
| Rutas de senderismo (6) + GPX + altimetría + **tira de fotos 360** | ✅ vivo | añadido 2026-07-09 (commit `ae8964b`), filtra `fotos360.geojson` (6080 fotos) por proximidad al track |
| Patrimonio + Wikipedia + audioguías (Web Speech API, ES/EN/FR) | ✅ vivo | 12 guiones verbatim de `docs/contenido/audioguias.md` |
| **6 tours Matterport 360° reales** de templos románicos | ✅ vivo y verificado en vivo | contradice CLAUDE.md/README (§9) |
| Directorio de 96 negocios + filtros + formulario de alta/edición | ✅ vivo | fotos reales de negocios pendientes del cliente (`assets/biz/` casi vacío) |
| Dashboard de analítica + moderación de solicitudes | ✅ vivo | login SHA-256, modo demo si Supabase no está configurado |
| QR físicos (`?qr=`) + generador imprimible | ✅ vivo en código | **pendiente operativo**: los QR ya impresos (Switchy) siguen apuntando a la home del ayuntamiento, no a las fichas — ver `docs/mejoras/qr-deeplinks.md` |
| PWA offline (Service Worker) | ✅ vivo | offline del kiosco arreglado (P0, hardening v2) |
| Kiosco táctil 65" (`kiosko.html`) | ✅ vivo | idle 90s→atractor, panel de mantenimiento, refresco periódico (ya no se congela) |
| Kiosko — módulo **Iglesias** (agrupación cajón, 7 monumentos) | ✅ vivo | |
| Kiosko/app — **Condiciones ahora** (tiempo+oleaje+mareas+aire+bandera unificados) + **ICV piloto** | ✅ vivo, ICV marcado explícitamente como piloto/en calibración | |
| **Tour 360°** embebido sin API key (Google Maps Embed) | ✅ vivo | |
| Efectos visuales (easing, fade-in POIs, pulso de selección) | ✅ vivo | |
| **Servicios** (luz PVPC, gasolinera más cercana, festivo, carga EV) | ✅ vivo salvo EV | EV gateado tras `OPENCHARGEMAP_KEY` (vacía hoy, pendiente del cliente) |
| Agenda de eventos municipales en vivo | ✅ vivo | cron diario de GitHub Actions, verde |
| i18n ES/EN/FR/DE en la app principal | ⚠️ parcial | faltan claves de dashboard/formulario/kiosko-mantenimiento (solo ES) |
| Migración `businesses` a Supabase (S10) | ⏳ pospuesto | depende de validar el flujo de moderación con el cliente |
| Tabla anual de mareas exactas offline | ⏳ no existe | pese a lo que dice `docs/API_KEYS.md` (§9); Open-Meteo Marine cubre oleaje/temp |
| Eleven Labs (TTS premium) | ⏳ descartado por ahora | Web Speech API cubre el caso; upgrade si el cliente paga |

## 8. Decisiones a respetar

- Sin NIF/CIF de negocios visible (privacidad).
- No romper retrocompat de `#item=ID`.
- El dashboard NO depende de `data.js` salvo para resolver `entity_id → name`.
- Imágenes locales de negocio priman sobre Unsplash; el cliente entrega fotos.
- Ninguna API de pago sin aprobación explícita.

## 9. Discrepancias detectadas entre documentación y estado real (⚠️ leer antes de fiarte de los docs)

1. **`CLAUDE.md` y `README.md` dicen que los modelos 3D usan "URLs
   placeholder"** — falso desde el commit `488a0c9` (2026-07-01): `points3D`
   tiene **6 tours Matterport reales y verificados en vivo por título**
   (`GX3uKCx4Y7Z`, `irtzhtLNSEY`, etc., ver `data.js` líneas ~103-108).
2. **`docs/API_KEYS.md` describe `assets/data/tides-2026.json`** como si ya
   existiera ("tabla anual precomputada… No necesita red"). **No existe en el
   repo.** El propio `docs/CHANGELOG.md` lo lista correctamente como pendiente.
3. **`docs/CONTINUACION.md`** describe la rama `feat/atlas-kiosko-turismo`
   como no mergeada, "46 commits por delante de main". Esa rama **ya se
   mergeó** (commit `41a22a4`) y desde entonces hay ~13 commits más directamente
   en `main` (módulos de kiosco Fase 6, release v3.0.0). El documento es un
   snapshot de una sesión anterior, no el estado actual.
4. **`README.md`** describe la v2.0.0 original (5 rutas, 4 puntos de
   patrimonio, "sw.js — pendiente", "dashboard.html — pendiente"): quedó
   desactualizado tras los sprints S1–S9 y la fase de kiosco. `docs/CHANGELOG.md`
   sí está al día.
5. **CI en `main` está en rojo ahora mismo** (§10) — no es una discrepancia de
   documentación, pero es el hallazgo más urgente de esta revisión.

## 10. Hallazgos resueltos el 2026-07-12

Auditoría de estado que generó este documento encontró y arregló, en 3 commits
sobre `main` (`01dbb2a`, `8b80da9`, `630467f`), todo verificado en navegador
real (Chrome) y con CI en verde tras cada push:

1. **CI roto desde el 2026-07-09**: el commit `ae8964b` tocó shell sin bumpear
   `CACHE_VERSION`. Mismo patrón que ya había pasado dos días antes (ver
   memoria `ci-cache-version-guard-omitido`). Arreglado con un bump dedicado.
2. **`#desktopSidebar`/`#bottomSheet` legacy** llevaban con
   `display:none !important` incondicional desde el rediseño v3 — el cajón
   es el único navegador real. Se retiró el markup y ~330 líneas de CSS muerto.
3. **Bug real descubierto al investigar lo anterior**: el ÚNICO botón de
   idioma (`#btnLang`) vivía dentro del sidebar oculto, así que
   `toggleLanguage()` no tenía ningún disparador visible en toda la app desde
   el rediseño v3 — los usuarios no podían cambiar de idioma manualmente. Se
   migró el botón al overflow "⋯" del toolbar del mapa (nueva clave i18n
   `changeLanguage`).
4. **Strings hardcoded en español que persistían en cualquier idioma**:
   insignia de categoría del modal de detalle (`'Patrimonio'` fijo, y el
   `subcategory` de negocio crudo en vez de la categoría traducida), las 6
   subcategorías de negocio en el cajón (Alojamiento/Restaurantes/...), y 7
   `showToast()` (fotos 360, mi ubicación, copiar enlace, descarga GPX). Todo
   ahora pasa por `TRANSLATIONS`/`t()` en es/en/fr/de.

Estado de `CACHE_VERSION` tras esta sesión: `v2.2026.07.12c`.

## 11. Cómo usar este documento con otra IA

Pega las secciones 1–8 como contexto de arquitectura/producto y pide, por
ejemplo: *"Dado este stack (vanilla JS, sin build, cliente municipal sin
tooling), ¿qué cambiarías en la arquitectura de `data.js` según crece a más
municipios/negocios?"* o *"Revisa el modelo de permisos de Supabase (RLS) de
la sección 5/`docs/DEPLOY.md` en busca de huecos de seguridad."* — el
objetivo es una segunda opinión de diseño, no una reescritura: cualquier
sugerencia que implique añadir build/framework/TypeScript choca con la
restricción dura de la sección 2 y necesita discutirse explícitamente con el
cliente antes de aplicarse.
