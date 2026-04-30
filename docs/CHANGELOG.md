# Changelog — Descubre Bareyo

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).

## [Unreleased]

### Roadmap por sprints

Plan completo en `~/.claude/plans/federated-giggling-riddle.md`.

#### S1 — Documentación + caché unificado + clima 7 días — ✅ ENTREGADO
- ✅ Pack completo de documentación (README, CLAUDE.md, docs/)
- ✅ Helper `cachedFetch()` unificado para todas las APIs (TTL + stale fallback)
- ✅ Pronóstico extendido a 7 días en panel de clima (strip horizontal)

#### S2 — APIs costeras y ambientales — ✅ ENTREGADO
- ✅ Open-Meteo Marine (altura ola, periodo, dirección, temp mar) con pill flotante 🌊
- ⏳ Tabla de mareas precomputada `assets/data/tides-2026.json` (pendiente de fuente fiable sin key)
- ✅ Sunrise-Sunset (amanecer/atardecer) integrado en panel clima
- ✅ Open-Meteo Air Quality (AQI europeo + polen gramíneas/abedul/olivo) chip en panel clima

#### S3 — Patrimonio enriquecido — ✅ ENTREGADO
- ✅ Wikipedia REST en fichas de patrimonio (campo `wikiTitle`, idioma según `currentLang`)
- ✅ Audio-guías Web Speech API (botón 🔊 en rutas, costa, 3D)

#### S4 — PWA offline real — ✅ ENTREGADO
- ✅ Service Worker (`sw.js`) con estrategias por tipo: shell+GPX cache-first, tiles SWR, APIs network-first con timeout, imágenes cache-first
- ✅ Botón "📲 Instalar app" con `beforeinstallprompt`
- ✅ Página `offline.html` de fallback con auto-retry on online
- ✅ `vercel.json` con headers SW y caché

#### S5 — UX y compartir — ✅ ENTREGADO
- ✅ URLs slug por tipo (`#ruta=`, `#patrimonio=`, `#negocio=`, `#3d=`) con retrocompat `#item=`
- ✅ Open Graph dinámico (og:title, og:description, og:image, twitter:*) al abrir detalle
- ✅ Geolocalización avanzada en ruta: HUD, tracking GPS, Wake Lock, alertas POI a <50m, resumen al finalizar

#### S6 — Imágenes locales — ✅ ENTREGADO
- ✅ Cascada `localImage || image || categoría default` en `getBizImage`
- ✅ Preload con fallback graceful en hero del modal
- ✅ `assets/biz/README.md` con convención de nombres y guía de aporte

#### S7 — Dashboard + analytics — ✅ ENTREGADO
- ✅ `dashboard.html` con login SHA-256 + clave demo "bareyo"
- ✅ Backend Supabase preparado (tabla `events`) + modo demo con localStorage
- ✅ Helper `track()` con buffer IndexedDB para offline + flush en `online`
- ✅ Instrumentación: pageview, detail_open, gpx_download, phone_click, audio_play, qr_scan, biz_request
- ✅ KPIs (10 cards) + Chart.js: línea visitas/día, donut dispositivo, heatmap hora×día, barras categorías
- ✅ Tablas: top 20 entidades, scans QR, solicitudes pendientes
- ✅ Filtros: 7d/30d/90d/Todo + botón refresh

#### S8 — QRs físicos del municipio — ✅ ENTREGADO
- ✅ Detector `?qr=...` en `app.js` con tracking automático y limpieza de URL
- ✅ Página `qr-print.html` con login + selección por tipo + búsqueda
- ✅ Generador client-side con `qrcode` lib (corrección H, color marca)
- ✅ Layout imprimible 4 placas por A4 con CSS @media print
- ✅ Sección dedicada en dashboard (tabla con scans totales y últimos 7d)

#### S9 — Directorio + formulario empresas — ✅ ENTREGADO
- ✅ `formulario-empresas.html` con cabecera + listado filtrable + form
- ✅ Listado filtrable de los 96 negocios (búsqueda, categoría, pueblo, web sí/no)
- ✅ Form de alta/modificación/baja con 3 modos
- ✅ Selector de coordenadas con MapLibre clicable + drag
- ✅ Subida de hasta 6 fotos con compresión client-side a WebP (1200px max, q=0.82)
- ✅ Backend Supabase (tabla `business_requests` + Storage `business-photos`) + modo demo localStorage
- ✅ Pestaña "Solicitudes pendientes" en dashboard que lee de ambos orígenes
- ✅ Validación client-side, mensaje de éxito 48–72h
- ✅ Enlace al directorio desde el sidebar de la app principal

#### S10 — Migración businesses a Supabase (pospuesto)
- ⏳ Pendiente: depende de que el cliente valide el flujo de moderación de S9 antes de migrar el source of truth.
- Cuando se active: tabla `businesses` como source of truth, fetch al cargar mapa con caché y fallback a `data.js` si Supabase falla.

#### Pendientes para fases futuras
- ⏳ URLs reales de Matterport para los 2 modelos 3D (placeholder actual: `m=placeholder_1/2`).
- ⏳ Fotos reales en `assets/biz/` (96 negocios). Mientras, fallback a Unsplash funciona.
- ⏳ Tabla anual de mareas exactas (pleamar/bajamar). Open-Meteo Marine cubre oleaje y temperatura.
- ⏳ Eleven Labs (TTS premium) si el cliente paga — sustituir Web Speech sin tocar el resto.
- ⏳ i18n completar: faltan claves dashboard/formulario en EN/FR/DE (ahora solo ES).

---

## [2.0.0] — 2026-04-10

Versión inicial v2 (reescritura de la v1 con sistema de diseño Clotitec Mapas v2).

### Added
- Landing page de bienvenida con hero, estadísticas, features y CTA.
- Tutorial guiado de 8 pasos con spotlight pulsante y mock cards.
- Mapa MapLibre con vista isométrica (pitch 35°, bearing -10°).
- 5 rutas de senderismo con perfil altimétrico y descarga GPX.
- 4 puntos de patrimonio (Faro de Ajo, Ría, Playa Antuerta, La Ojerada).
- 96 negocios con filtros por categoría y subcategoría.
- 2 modelos 3D Matterport (URLs placeholder por confirmar).
- Búsqueda full-text en tiempo real.
- Toggle satélite / vista normal.
- Geolocalización del usuario.
- Mini-mapa en cada ficha.
- i18n ES / EN / FR / DE (parcial, ~16 claves).
- PWA manifest correcto (instalable como app).
- Clima Open-Meteo current con panel desplegable.
- Boundary OSM con caché localStorage (Nominatim).
- Botón Norte (reset bearing).
- Bottom sheet móvil con snap points.

### Known Issues
- Modelos 3D usan URLs placeholder Matterport (no funcionan hasta que el cliente entregue las reales).
- `assets/biz/` está vacío — todas las fotos vienen de Unsplash.
- No hay Service Worker (la app no funciona offline pese al `manifest.json`).
- Clima se refetch en cada carga (sin caché).
- i18n incompleto: solo 16 claves traducidas, hay strings hardcodeados en español en `app.js`.
