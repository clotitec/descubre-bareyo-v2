# Arquitectura — Descubre Bareyo

## Visión general

App SPA estática sin backend en su forma básica. La capa cliente lee `data.js` (incrustado vía `<script>`), inicializa MapLibre, y delega a Open-Meteo (clima/mareas/aire) y Wikipedia (patrimonio) para datos en vivo. A partir del sprint S7 se añade Supabase para analytics y formulario de empresas — sigue siendo cliente-only en cuanto a hosting, Supabase actúa como backend gestionado.

```
┌────────────────────────────────────────────────────────────┐
│                     Navegador del usuario                   │
│                                                             │
│  ┌───────────┐   ┌──────────┐   ┌──────────┐   ┌─────────┐ │
│  │ index.html│──▶│  app.js  │──▶│ MapLibre │   │ data.js │ │
│  └───────────┘   └──────────┘   └──────────┘   └─────────┘ │
│        │              │                              ▲      │
│        │              ▼                              │      │
│        │         ┌──────────┐                        │      │
│        │         │   sw.js  │  (PWA offline)         │      │
│        │         └──────────┘                        │      │
│        ▼              │                              │      │
│  ┌──────────────────────────────────────┐            │      │
│  │  CDNs: CartoDB · ArcGIS · Unpkg      │            │      │
│  │  · fonts.gstatic · cdn.tailwindcss   │            │      │
│  └──────────────────────────────────────┘            │      │
│                                                       │      │
│  ┌────────────────────────────────────┐              │      │
│  │  APIs cliente: Open-Meteo · Marine │──────────────┤      │
│  │  · Air · Sunrise-Sunset · Wikipedia│              │      │
│  │  · Nominatim                       │              │      │
│  └────────────────────────────────────┘              │      │
│                                                       │      │
│  ┌────────────────────────────────────┐              │      │
│  │  Supabase (S7+):                   │              │      │
│  │  · events  · business_requests     │──────────────┘      │
│  │  · qr_locations  · Storage         │                     │
│  └────────────────────────────────────┘                     │
└────────────────────────────────────────────────────────────┘
```

## Lifecycle del mapa

1. `index.html` carga → muestra **landing page**.
2. Usuario pulsa "Explorar" → fade-out → `enterApp()` → `bootApp()`.
3. `bootApp()` (app.js):
   - Llama a `loadBoundary()` (Nominatim, con caché localStorage 24 h)
   - Inicializa MapLibre con `CONFIG` (centro, zoom, pitch, bearing)
   - Renderiza tabs, filtros, listas (desktop + mobile)
   - Carga capas según `activeTab`
   - Llama a `fetchWeather()`
   - Si hay `#item=...` o `#ruta=...` en hash → abre detail modal
   - Si es primera visita (`localStorage.bareyo_tutorial_seen`) → arranca `startTutorial()`

## Modelo de datos

`data.js` exporta como globals:

| Símbolo | Tipo | Contenido |
|---|---|---|
| `CONFIG` | object | center, zoom, pitch, bearing, boundaryColor |
| `TABS` | array | 5 tabs: all/hiking/costa/biz/3d |
| `ROUTE_COLORS` | object | mapping ID → {main, glow, name} |
| `hikingRoutes` | array | 5 rutas con `coords: [[lon, lat, alt], ...]` y `gpxUrl` |
| `costaPoints` | array | 4 POIs costa/patrimonio |
| `points3D` | array | 2 puntos con `url360` Matterport |
| `BUSINESS_CATEGORIES` | object | 6 categorías (alojamiento, restauración, comercio, surf, salud, servicios) |
| `CATEGORY_EMOJIS` | object | mapping subcategoría → emoji |
| `BIZ_DEFAULT_IMAGES` | object | URLs Unsplash fallback por categoría |
| `businesses` | array | 96 negocios (id, name, category, subcategory, coords, location, desc, phone, website, hours, image, tags) |
| `WMO_CODES` | object | 19 códigos meteorológicos OMM con emoji + label |
| `TRANSLATIONS` | object | `{es, en, fr, de}` con ~16 claves cada uno (faltan más por completar) |

## Flujo del detail modal

```
Click en lista o pin del mapa
  └─▶ openDetail(id, type)
        ├─▶ resuelve entidad por id en hikingRoutes/costaPoints/points3D/businesses
        ├─▶ rellena hero, tags, descripción
        ├─▶ si type=hiking → drawElevationProfile(coords)
        ├─▶ si type=costa|3d → si hay wikiTitle, fetchWiki() (S3+)
        ├─▶ si type=3d → embedeIframe(url360)
        ├─▶ siempre → renderMiniMap(coords)
        └─▶ pinta acciones (Navegar, Llamar, GPX, Compartir)
```

## Estado global (app.js)

```javascript
// Mapa
let map, miniMap, satelliteOn, currentTab, activeFilter, searchTerm
// Datos cargados
let bareyoBoundary, weatherData, weatherForecast
// Renderizado
let markers[], routeLayers[], _routePopup, _routeHandlers, _routeLookup
// i18n
let currentLang
```

Sin estado global compartido en frameworks — todo en clausuras y módulo `app.js` global.

## Capas del mapa (MapLibre)

| Capa | Tipo | Datos |
|---|---|---|
| Boundary mask | `fill` (exterior) + `line` (perímetro) | Nominatim polígono Bareyo |
| Hiking routes | 3 capas: hit invisible (24 px) + glow + main line | `coords` de cada ruta |
| Markers (rutas) | `marker` MapLibre con div emoji | Inicio de cada ruta |
| Markers (costa/biz/3d) | `marker` con div emoji + label flotante zoom > 15 | Cada POI/negocio |
| Tiles base | raster | CartoDB Voyager o ArcGIS World Imagery |

## Caché y red (a partir de S1.6)

```
fetch ──┬─▶ cachedFetch(key, url, ttlMin)
        │     ├─ localStorage hit + no expirado → devuelve cached
        │     ├─ network OK → guarda con timestamp + devuelve
        │     └─ network fail → si hay cached aunque expirado → devuelve
        │                       si no hay nada → throw
        │
        └─ Service Worker (S4)
              ├─ shell + GPX → Cache First
              ├─ tiles → Stale While Revalidate
              ├─ APIs → Network First con timeout 3 s
              └─ imágenes → Cache First
```

## Eventos analytics (a partir de S7)

`track(eventType, payload)` envía POST a Supabase:

```javascript
{
  ts: ISO8601,
  type: 'pageview' | 'detail_open' | 'gpx_download' | 'phone_click'
       | 'web_click' | 'audio_play' | '3d_open' | 'qr_scan' | 'search',
  entity_id: 'bareyo-1' | 'faro-ajo' | …,
  entity_type: 'route' | 'costa' | '3d' | 'biz',
  qr_id?: 'qr-cabo-quintres',
  device: 'mobile' | 'tablet' | 'desktop',
  lang: 'es' | 'en' | 'fr' | 'de',
  session_id: <uuid in localStorage>,
  meta: { /* libre */ }
}
```

Sin IPs, sin cookies. Buffer en IndexedDB cuando offline → flush al recuperar red.

## QRs físicos (S8)

Cada QR físico codifica una URL del tipo:

```
https://descubre-bareyo.vercel.app/?qr=<qr_id>
```

Donde `qr_id` puede coincidir con la entidad (`bareyo-1`, `faro-ajo`) o ser un identificador específico de la placa física (`qr-aparcamiento-faro`). Al cargar:

1. `app.js` detecta `?qr=` en `URLSearchParams`.
2. `track('qr_scan', { qr_id, ts })`.
3. Resuelve si el `qr_id` mapea a una entidad → setea hash `#item=<entity_id>`.
4. Reemplaza la URL con `history.replaceState` para limpiar el query param.

## Decisiones arquitectónicas

| Decisión | Motivo |
|---|---|
| Vanilla JS sin build | Mantenibilidad por terceros (ayuntamiento) sin tooling |
| `data.js` plano vs JSON | Source of truth ergonómico, comentarios, evolutivo a Supabase |
| Globals en app.js (no módulos ES) | Compatibilidad con `onclick="..."` desde HTML, evita complicación |
| Supabase en vez de backend custom | Auth + DB + Storage + Realtime gratis; escalable |
| Web Speech API en vez de Eleven Labs | Restricción "solo gratis" |
| QR id en query (?qr=) en vez de hash | Permite logging server-side futuro y limpieza de URL |
