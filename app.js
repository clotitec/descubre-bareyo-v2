/* ═══════════════════════════════════════════════════════════════════════
   Descubre Bareyo v2 — app.js
   Architecture: Poligonos Industriales v3 adapted for tourism
   Brand: Clotitec / Bareyo Tourism (#1A4D2E green theme)
   MapLibre GL JS 4.1.2 | Tailwind CSS via CDN
   ═══════════════════════════════════════════════════════════════════════ */

'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// GLOBAL STATE
// ─────────────────────────────────────────────────────────────────────────────
let map, miniMap;
let activeTab = 'all';
let activeFilter = 'all';
let searchTerm = '';
let selectedItem = null;
let isSatellite = false;
let isTerrain = true;
// currentLang declared in data.js (shared global)
let markers = [];
let routeLayers = [];
let bareyoBoundary = null;
let userMarker = null;
let weatherData = null;
let weatherForecast = null;
let marineData = null;
let sunMoonData = null;
let airQualityData = null;
let _ttsSpeaking = false;
let _routePopup = null;
let _previousFocus = null;
let _routeHandlers = []; // Track registered map event handlers for cleanup
let _profileMarker = null; // marcador móvil sincronizado con el perfil de elevación

// ── Capas del mapa activables por categoría (interruptores del menú del cajón) ──
// _layersOff = claves OCULTAS (vacío ⇒ todo visible, coherente con "el mapa muestra todo").
// Persistido en localStorage para recordar la preferencia del visitante / de la pantalla.
const MAP_LAYER_KEYS = ['patrimonio', 'rutas', 'playascosta', 'negocios'];
let _layersOff = new Set();
// Migración desde el esquema de 6 capas (pre-Komoot): playas→playascosta; iglesias/vistas3d desaparecen.
try {
    const _lsOff = JSON.parse(localStorage.getItem('bareyo_layers_off') || '[]');
    if (Array.isArray(_lsOff)) {
        _layersOff = new Set(_lsOff.map(k => k === 'playas' ? 'playascosta' : k).filter(k => MAP_LAYER_KEYS.indexOf(k) !== -1));
        if (_lsOff.length !== _layersOff.size) localStorage.setItem('bareyo_layers_off', JSON.stringify(Array.from(_layersOff)));
    }
} catch (e) {}
let _routeStartMarkers = []; // marcadores de inicio de ruta (para ocultarlos al apagar la capa Rutas)

// ── POI symbol layer (colisión gestionada por MapLibre → nunca se solapan) ──
// Sustituye a los DOM markers de costa/3d/negocios: una sola capa symbol con
// icon-allow-overlap:false + symbol-sort-key por prioridad. A poco zoom el motor
// oculta los que chocarían y prioriza patrimonio; al acercar aparecen más.
const POI_SRC = 'poi-src';
const POI_LAYER = 'poi-symbols';
let _poiInputs = [];   // [{entity,type}] acumulado del render actual (reset en clearMap)
let _poiFeatures = []; // últimos features generados (debug/consulta)
let _poiLookup = {};   // "type:id" -> entidad (para resolver el click)
let _poiHandlers = []; // handlers de la capa symbol (limpieza en clearMap)
let _poiPngState = {}; // id -> 'loading'|'done' del preload de PNG ilustrados
let _poiSvgState = {}; // imgKey -> 'loading'|'done' de la rasterización pin+SVG (reset en setStyle)
let _poiSvgText = {};  // svgKey -> texto SVG crudo cacheado (persistente entre estilos)

// Config visual por POI de costa/3d: color de acento + emoji de respaldo y, si existe,
// PNG ilustrado (assets/icons/pin/*.png) que sustituye al pin de canvas. Los negocios
// se resuelven por BUSINESS_CATEGORIES/CATEGORY_EMOJIS (no van aquí).
const POI_PIN = {
    'faro-ajo':              { png: 'assets/icons/pin/faro-ajo.png',        emoji: '🗼', color: '#e8973a' },
    'ria-ajo':               { png: 'assets/icons/pin/ria-ajo.png',         emoji: '🌊', color: '#1f97a8' },
    'ojerada':               { png: 'assets/icons/pin/ojerada.png',         emoji: '🌊', color: '#1f97a8' },
    'molino-venera':         { png: 'assets/icons/pin/molino-venera.png',   emoji: '⚙️', color: '#1f97a8' },
    'cabo-quintres':         { png: 'assets/icons/pin/cabo-ajo.png',        emoji: '🌊', color: '#1f97a8' }, // icono oficial "Cabo" del set de Cordelia
    // Los 5 siguientes NO son de Cordelia: generados por IA (Nano Banana Pro, 2026-07-16)
    // imitando su estilo con los oficiales como referencia. Sustituibles si Cordelia
    // entrega los definitivos — mismo nombre de fichero y listo.
    'playa-ajo':             { png: 'assets/icons/pin/playa-antuerta.png',  emoji: '🏖️', color: '#1f97a8' },
    'playa-cuberris':        { png: 'assets/icons/pin/playa-cuberris.png',  emoji: '🏖️', color: '#1f97a8' },
    'ermita-san-roque':      { png: 'assets/icons/pin/ermita-san-roque.png', emoji: '⛪', color: '#c2703d' },
    '3d-sta-maria-bareyo':   { png: 'assets/icons/pin/sta-maria-bareyo.png',  emoji: '⛪', color: '#c2703d' },
    '3d-san-julian':         { png: 'assets/icons/pin/ermita-guemes.png',     emoji: '⛪', color: '#c2703d' },
    '3d-san-vicente-guemes': { png: 'assets/icons/pin/san-vicente-martir.png',emoji: '⛪', color: '#c2703d' },
    '3d-san-ildefonso':      { png: 'assets/icons/pin/convento-bareyo.png',   emoji: '🏛️', color: '#c2703d' },
    '3d-san-pedruco':        { png: 'assets/icons/pin/san-pedruco.png',      emoji: '⛪', color: '#c2703d' },
    '3d-san-martin-tours':   { png: 'assets/icons/pin/san-martin-tours.png', emoji: '⛪', color: '#c2703d' }
};

// POI id → clave de icono SVG (assets/icons/svg/<key>.svg). Derivado de
// assets/icons/svg/manifest.json (secciones pois + routes) más los POIs sin entrada
// explícita resueltos por tipo (cabo, molino). El SVG se rasteriza en BLANCO como glifo
// dentro del pin teardrop de color de categoría; prioridad SVG > PNG ilustrado > emoji.
const POI_SVG_DIR = 'assets/icons/svg/';
const POI_SVG = {
    'faro-ajo':              'faro',
    'ria-ajo':               'ria',
    'playa-ajo':             'playa',
    'playa-cuberris':        'playa',
    'ojerada':               'ojerada-arco',
    'ermita-san-roque':      'ermita',
    'cabo-quintres':         'cabo',
    'molino-venera':         'molino',
    '3d-san-pedruco':        'ermita',
    '3d-sta-maria-bareyo':   'iglesia-romanica',
    '3d-san-julian':         'ermita',
    '3d-san-vicente-guemes': 'iglesia',
    '3d-san-martin-tours':   'iglesia',
    '3d-san-ildefonso':      'convento'
};

// Devuelve la clave de icono SVG para una entidad/tipo, o null si no procede (p. ej.
// negocios, que mantienen su pin emoji de categoría). Prioriza el mapeo explícito por id
// y cae a reglas por tipo (rutas → 'ruta'; costa/playa → 'playa').
function poiSvgKey(entity, type) {
    if (!entity) return null;
    if (POI_SVG[entity.id]) return POI_SVG[entity.id];
    if (type === 'hiking') return 'ruta';
    if (type === 'costa' && entity.beach) return 'playa';
    return null;
}

const SNAP = { COLLAPSED: 140, HALF: 0, FULL: 0 };
let currentSnap = SNAP.COLLAPSED;

function updateSnapPoints() {
    const vh = window.innerHeight || document.documentElement.clientHeight;
    SNAP.HALF = Math.round(vh * 0.45);
    SNAP.FULL = vh - 60;
}
updateSnapPoints();
window.addEventListener('resize', updateSnapPoints);

// Voyager: basemap CARTO claro CON detalle (calles/labels) — el que ya funcionaba; Positron se
// percibía "en blanco". Modo claro por defecto (dark retirado; defaultStyleDark queda inerte).
const defaultStyleLight = 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json';
const defaultStyleDark  = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

function getInitialTheme() {
    const saved = localStorage.getItem('bareyo_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
}

// Modo oscuro retirado (decisión cliente): la app funciona SIEMPRE en claro.
// getInitialTheme/defaultStyleDark quedan sin uso pero se conservan inertes.
let currentTheme = 'light';
document.documentElement.setAttribute('data-theme', 'light');

const defaultStyle = defaultStyleLight;
const arcgisSatellite = {
    version: 8,
    // glyphs necesario para que la capa symbol de POIs pueda dibujar etiquetas de texto
    // también sobre el estilo satélite (que por defecto no trae fuentes).
    glyphs: 'https://basemaps.cartocdn.com/fonts/{fontstack}/{range}.pbf',
    sources: {
        satellite: {
            type: 'raster',
            tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
            tileSize: 256,
            attribution: 'Esri, Maxar, GeoEye, Earthstar Geographics, CNES/Airbus DS, USDA, USGS, AeroGRID, IGN'
        }
    },
    layers: [{ id: 'satellite-layer', type: 'raster', source: 'satellite' }]
};

// ── Basemaps elegibles (selector de estilo de mapa, como en Vías Verdes Murcia):
// claro (Voyager, con detalle), carto (Positron neutro), oscuro (DarkMatter) y
// satélite (Esri). El elegido persiste en localStorage. ──
const BASEMAPS = {
    claro:    { style: defaultStyleLight, i18n: 'basemapClaro' },
    carto:    { style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json', i18n: 'basemapCarto' },
    oscuro:   { style: defaultStyleDark, i18n: 'basemapOscuro' },
    satelite: { style: arcgisSatellite, i18n: 'basemapSatelite' }
};
let currentBasemap = (function () {
    try { const s = localStorage.getItem('bareyo_basemap'); if (s && BASEMAPS[s]) return s; } catch (_) {}
    return 'claro';
})();
isSatellite = currentBasemap === 'satelite';

// ─────────────────────────────────────────────────────────────────────────────
// 1. INITIALIZATION
// ─────────────────────────────────────────────────────────────────────────────
// Map init is deferred until user clicks "Explorar" on the landing page.
// If no landing page (direct load), init immediately.
let mapInitialized = false;

window.addEventListener('load', () => {
    // Restaurar el idioma elegido en una visita anterior antes de cualquier render.
    try { const sl = localStorage.getItem('bareyo_lang'); if (sl && ['es', 'en', 'fr', 'de'].includes(sl)) currentLang = sl; } catch (_) {}
    applyLangAttr();
    // Resolver ?qr= ANTES de leer el hash: traduce el escaneo a hash de deep-link, cuenta el
    // scan una sola vez y limpia la query. Así no depende de que el mapa termine de cargar.
    handleQrEntry();
    applyDeepLink();
    // Un escaneo QR o un deep-link deben abrir la ficha directamente, sin obligar a pulsar
    // "Explorar" en la landing de marketing (si no, el turista aterriza en la portada de nuevo).
    const hasDeepLink = /(?:^|[#&])(?:tab|ruta|patrimonio|negocio|3d|item)=/.test(window.location.hash);
    const landing = document.getElementById('landingPage');
    if (hasDeepLink && landing) landing.style.display = 'none';
    if (!landing || landing.style.display === 'none') {
        // Modo kiosco (js/kiosco.js oculta la landing antes de este load): sin tutorial,
        // el tótem debe aterrizar directo en el mapa limpio.
        bootApp(hasDeepLink || window.KIOSCO === true);
    }
});

function bootApp(suppressTutorial) {
    if (mapInitialized) return;
    mapInitialized = true;

    // Traducir de inmediato (incl. title/aria-label de la barra de controles icon-only) sin depender
    // de que el mapa termine de cargar: si no, los botones quedarían sin nombre accesible hasta el load.
    applyTranslations();

    initMap();

    map.on('load', async () => {
        try {
            bareyoBoundary = await loadBoundary();
            if (bareyoBoundary) addBoundaryMask(bareyoBoundary);
        } catch (e) {
            console.warn('Boundary load failed:', e);
        }

        // Sync theme button on boot (in case theme is already dark)
        syncThemeBtn();

        renderTabs();
        renderFilters(activeTab);
        renderList(activeTab);
        loadDataLayer(activeTab);
        // Arrancar en Relieve 3D (decisión de diseño): terreno (+ edificios en T5) y cámara algo inclinada.
        applyTerrain();
        map.easeTo({ pitch: 50, duration: 1200 });
        setActive(document.getElementById('btnTerrain'), true);
        setupSearch();
        setupBottomSheet();
        setupCajon();
        fetchWeather();
        fetchMarine();
        fetchSunMoon();
        fetchAirQuality();
        fetchEvents();
        loadBeachFlags();
        fetchIcvData();
        fetchLuzData();
        fetchGasolinerasData();
        fetchFestivosData();
        fetchCargaData();

        // Hide loader once map is ready
        const loader = document.getElementById('loader');
        if (loader) {
            loader.style.transition = 'opacity 0.4s ease';
            loader.style.opacity = '0';
            setTimeout(() => { loader.style.display = 'none'; }, 400);
        }

        // El ?qr= ya se resolvió en window.load; aquí solo abrimos la ficha del deep-link.
        applyItemDeepLink();

        // Auto-launch tutorial on first visit — salvo que se haya llegado por deep-link/QR
        // (en ese caso el turista quiere ver SU ficha, no el onboarding tapándola).
        if (!suppressTutorial && !localStorage.getItem('bareyo_tutorial_seen')) {
            setTimeout(() => { if (typeof startTutorial === 'function') startTutorial(); }, 800);
        }
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. MAP FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────
function initMap() {
    map = new maplibregl.Map({
        container: 'map',
        style: BASEMAPS[currentBasemap].style,
        center: CONFIG.center,
        zoom: CONFIG.zoom,
        minZoom: CONFIG.minZoom,
        maxZoom: CONFIG.maxZoom,
        pitch: CONFIG.pitch,
        bearing: CONFIG.bearing,
        maxPitch: 80,
        attributionControl: false
    });

    // Show/hide name labels based on zoom level
    map.on('zoom', () => {
        const z = map.getZoom();
        const show = z >= 15;
        document.querySelectorAll('.marker-label').forEach(el => {
            el.style.display = show ? 'block' : 'none';
        });
    });
}

async function loadBoundary() {
    // Try localStorage cache first, then fetch from Nominatim with timeout
    const cacheKey = 'bareyo_boundary_v1';
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
        try { return JSON.parse(cached); } catch(e) { localStorage.removeItem(cacheKey); }
    }

    const url = 'https://nominatim.openstreetmap.org/search?q=Bareyo,Cantabria,Spain&format=json&polygon_geojson=1&limit=1';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
        const res = await fetch(url, {
            headers: { 'User-Agent': 'DescubreBareyo2026/2.0 (clotitec.com)', 'Accept-Language': 'es' },
            signal: controller.signal
        });
        clearTimeout(timeout);
        const data = await res.json();
        if (!data || !data[0] || !data[0].geojson) return null;
        const geo = data[0].geojson;
        const normalized = geo.type === 'Polygon'
            ? { type: 'MultiPolygon', coordinates: [geo.coordinates] }
            : geo;
        // Cache for future loads
        try { localStorage.setItem(cacheKey, JSON.stringify(normalized)); } catch(e) {}
        return normalized;
    } catch(e) {
        clearTimeout(timeout);
        return null;
    }
}

function addBoundaryMask(boundary) {
    // Re-invocable: limpiar restos si ya estaba montado (p. ej. re-estilado en caliente).
    ['boundary-stroke', 'boundary-stroke-casing', 'boundary-mask-fill'].forEach(id => {
        try { if (map.getLayer(id)) map.removeLayer(id); } catch (e) {}
    });
    ['boundary-line', 'boundary-mask'].forEach(id => {
        try { if (map.getSource(id)) map.removeSource(id); } catch (e) {}
    });

    // World bounding box minus Bareyo polygon → dimming mask
    const worldCoords = [[-180, -90], [180, -90], [180, 90], [-180, 90], [-180, -90]];
    let maskCoords = [worldCoords];

    if (boundary.type === 'MultiPolygon') {
        boundary.coordinates.forEach(poly => poly.forEach(ring => maskCoords.push(ring)));
    } else if (boundary.type === 'Polygon') {
        boundary.coordinates.forEach(ring => maskCoords.push(ring));
    }

    // Mask fill (dims outside Bareyo)
    map.addSource('boundary-mask', {
        type: 'geojson',
        data: { type: 'Feature', geometry: { type: 'Polygon', coordinates: maskCoords } }
    });
    map.addLayer({
        id: 'boundary-mask-fill',
        type: 'fill',
        source: 'boundary-mask',
        paint: { 'fill-color': '#000000', 'fill-opacity': 0.22 }
    });

    // Boundary stroke
    map.addSource('boundary-line', {
        type: 'geojson',
        data: { type: 'Feature', geometry: boundary }
    });

    // Sobre satélite (y oscuro) el verde corporativo se pierde contra la imagen:
    // casing oscuro difuminado + línea BLANCA continua y más gruesa para que el
    // interior del municipio se distinga del resto (petición ayto. 2026-07-22).
    const emphasize = currentBasemap === 'satelite' || currentBasemap === 'oscuro';
    if (emphasize) {
        map.addLayer({
            id: 'boundary-stroke-casing',
            type: 'line',
            source: 'boundary-line',
            paint: {
                'line-color': 'rgba(0,0,0,0.55)',
                'line-width': currentBasemap === 'satelite' ? 9 : 7,
                'line-blur': 1.5,
                'line-opacity': 0.85
            }
        });
    }
    map.addLayer({
        id: 'boundary-stroke',
        type: 'line',
        source: 'boundary-line',
        paint: emphasize ? {
            'line-color': '#FFFFFF',
            'line-width': currentBasemap === 'satelite' ? 4 : 3,
            'line-opacity': 0.95
        } : {
            'line-color': CONFIG.boundaryColor,
            'line-width': 2.5,
            'line-opacity': 0.7,
            'line-dasharray': [4, 2]
        }
    });
}

// ─── TERRENO 3D (Atlas Map Kit · DEM Terrarium gratis, sin API keys) ─────────
const DEM_SOURCE = 'kit-dem';
const DEM_TILES  = 'https://elevation-tiles-prod.s3.amazonaws.com/terrarium/{z}/{x}/{y}.png';

function ensureDem() {
    if (map && !map.getSource(DEM_SOURCE)) {
        map.addSource(DEM_SOURCE, {
            type: 'raster-dem',
            tiles: [DEM_TILES],
            encoding: 'terrarium',
            tileSize: 256,
            maxzoom: 13 // AWS Terrarium llega a z13; pedir más da 404 en cascada
        });
    }
}

// ── Helpers compartidos de barra/mapa ───────────────────────────────────────
function firstSymbolLayer() {
    return ((map.getStyle().layers) || []).find(l => l.type === 'symbol')?.id;
}
function setActive(btn, on) {
    if (!btn) return;
    btn.classList.toggle('active', on);
    btn.setAttribute('aria-pressed', String(on));
}
// Iconos SVG de línea (Lucide, MIT) para el toggle de tema. En claro se ofrece
// pasar a oscuro (luna); en oscuro se ofrece pasar a claro (sol).
const THEME_ICON_MOON = '<svg class="map-tool-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>';
const THEME_ICON_SUN = '<svg class="map-tool-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>';
function syncThemeBtn() {
    const btn = document.getElementById('btnTheme');
    if (!btn) return;
    btn.innerHTML = (currentTheme === 'dark') ? THEME_ICON_SUN : THEME_ICON_MOON;
    btn.setAttribute('aria-pressed', String(currentTheme === 'dark'));
}

// Aplica terreno 3D + hillshade + cielo. Idempotente → re-llamable tras setStyle.
function applyTerrain() {
    if (!map) return;
    ensureDem();
    map.setTerrain({ source: DEM_SOURCE, exaggeration: 1.8 });
    if (!map.getLayer('kit-hillshade')) {
        // Insertar bajo la primera capa de símbolos para no tapar etiquetas/iconos
        const firstSymbol = firstSymbolLayer();
        map.addLayer({
            id: 'kit-hillshade',
            type: 'hillshade',
            source: DEM_SOURCE,
            paint: {
                'hillshade-exaggeration': 0.55,
                'hillshade-illumination-direction': 315,   // NO → atardecer costero
                'hillshade-shadow-color': '#3a2f26',
                'hillshade-highlight-color': '#fff6e6'
            }
        }, firstSymbol);
    }
    // El cielo del relieve 3D se pinta vía CSS (fondo de #map, ver styles-v3.css), no aquí:
    // MapLibre 4.1.2 no expone setSky (llegó en v5) y el canvas es transparente sobre el horizonte,
    // así que basta el background del contenedor — además es theme-aware sin tocar JS.
    addBuildings();
}

function removeTerrain() {
    if (!map) return;
    removeBuildings();
    try { map.setTerrain(null); } catch (e) {}
    if (map.getLayer('kit-hillshade')) map.removeLayer('kit-hillshade');
    try { map.setSky(null); } catch (e) { try { map.setSky(); } catch (e2) {} }
}

// ─── EDIFICIOS 3D (OSM/Overpass, gratis sin key) ───────────────────────────
const OSM_BBOX = '43.455,-3.66,43.495,-3.58';
let _buildingsGeo = null;
let _buildingsTries = 0;               // reintentos por sesión (B1)
const _BUILDINGS_MAX_TRIES = 3;
async function loadBuildings() {
    // Guard por features.length: un FeatureCollection vacío es truthy → habría
    // que reintentar, no darlo por bueno.
    if (_buildingsGeo && _buildingsGeo.features && _buildingsGeo.features.length) return _buildingsGeo;
    // 1) Fichero ESTÁTICO pre-horneado (robusto, sin depender de Overpass en runtime).
    //    Generado offline con `node scripts/build-edificios.mjs` y commiteado.
    //    Si existe y trae features → se usa tal cual. Si 404/vacío → fallback Overpass.
    try {
        const res = await fetch('assets/data/edificios.geojson', { cache: 'no-cache' });
        if (res.ok) {
            const geo = await res.json();
            if (geo && geo.features && geo.features.length) {
                _buildingsGeo = geo;
                return _buildingsGeo;
            }
        }
    } catch (_) { /* sin fichero estático → fallback Overpass */ }
    // 2) FALLBACK: Overpass en vivo (con purga de caché vacío + reintento por sesión).
    const q = `[out:json][timeout:25];(way["building"](${OSM_BBOX});relation["building"](${OSM_BBOX}););out geom;`;
    const url = 'https://overpass-api.de/api/interpreter?data=' + encodeURIComponent(q);
    try {
        const osm = await cachedFetch('bareyo_osm_buildings', url, 60 * 24 * 7); // 7 días
        const geo = (window.Geo && Geo.osmToBuildingsGeoJSON) ? Geo.osmToBuildingsGeoJSON(osm) : null;
        if (geo && geo.features && geo.features.length) {
            _buildingsGeo = geo;
        } else {
            // No cachear un vacío 7 días: purga para permitir reintento (B1).
            try { localStorage.removeItem('bareyo_osm_buildings'); } catch (_) {}
            _buildingsGeo = null;
        }
    } catch (e) { _buildingsGeo = null; }
    return _buildingsGeo;
}
// Color por altura (B2): rampa interpolate sobre render_height, set claro/oscuro.
function buildingColor() {
    const dark = (typeof currentTheme !== 'undefined' && currentTheme === 'dark');
    const stops = dark
        ? ['#1e2740', '#2b3757', '#3a4a72', '#4d6091']
        : ['#e7dcc6', '#d9cdb8', '#c6b393', '#b39d78'];
    return [
        'interpolate', ['linear'], ['get', 'render_height'],
        0,  stops[0],
        8,  stops[1],
        18, stops[2],
        35, stops[3]
    ];
}
async function addBuildings() {
    if (!map) return;
    const geo = await loadBuildings();
    if (!isTerrain || !map) return;
    // Estilo aún cargando (tiles DEM en vuelo): reintenta en 'idle' en vez de abandonar.
    // Con edificios.geojson estático o caché caliente, el await resuelve antes que el estilo,
    // y el return seco dejaba la vista sin edificios hasta togglear Relieve. (La capa es idempotente.)
    if (!map.isStyleLoaded()) { map.once('idle', () => { if (isTerrain) addBuildings(); }); return; }
    if (!geo || !geo.features || !geo.features.length) {
        // Reintento diferido por sesión (B1): Overpass suele fallar el 1er hit.
        if (_buildingsTries < _BUILDINGS_MAX_TRIES) {
            _buildingsTries++;
            map.once('idle', () => { if (isTerrain) addBuildings(); });
        }
        return;
    }
    try {
        if (!map.getSource('osm-buildings')) map.addSource('osm-buildings', { type: 'geojson', data: geo });
        else map.getSource('osm-buildings').setData(geo);
        if (!map.getLayer('osm-buildings-3d')) {
            const firstSymbol = firstSymbolLayer();
            map.addLayer({
                id: 'osm-buildings-3d', type: 'fill-extrusion', source: 'osm-buildings', minzoom: 12,
                paint: {
                    'fill-extrusion-color': buildingColor(),
                    'fill-extrusion-height': ['get', 'render_height'],
                    'fill-extrusion-base': ['get', 'render_min_height'],
                    // B3: sombreado de volumen + opacidad SÓLIDA desde el zoom inicial. Los edificios
                    // deben verse como bloques sólidos ya en la vista por defecto (z13, = CONFIG.zoom);
                    // sube ligeramente al acercarse. (Antes: fade-in 13→0 los dejaba invisibles a z13.)
                    'fill-extrusion-vertical-gradient': true,
                    'fill-extrusion-opacity': ['interpolate', ['linear'], ['zoom'], 13, 0.85, 16, 0.95]
                }
            }, firstSymbol);
        } else {
            map.setPaintProperty('osm-buildings-3d', 'fill-extrusion-color', buildingColor());
        }
    } catch (e) {}
}
function removeBuildings() {
    if (map && map.getLayer('osm-buildings-3d')) map.removeLayer('osm-buildings-3d');
}

// Re-aplica el terreno si está activo. Llamar en los callbacks tras cada setStyle
// (toggleSatellite / toggleTheme), porque setStyle purga DEM + hillshade + terrain.
function reapplyTerrainIfOn() {
    if (isTerrain) applyTerrain();
}

function toggleTerrain() {
    if (!map) return;
    isTerrain = !isTerrain;
    const btn = document.getElementById('btnTerrain');
    if (isTerrain) {
        applyTerrain();
        if (map.getPitch() < 45) map.easeTo({ pitch: 62, duration: 900 });
    } else {
        removeTerrain();
    }
    setActive(btn, isTerrain);
    if (typeof track === 'function') track('terrain_toggle', { meta: { on: isTerrain } });
}

// Re-monta todo lo propio tras un setStyle (que purga sources, capas e imágenes).
function _rebuildAfterStyleChange() {
    map.once('style.load', () => {
        if (bareyoBoundary) addBoundaryMask(bareyoBoundary);
        reapplyTerrainIfOn();
        // setStyle descarta todas las imágenes (pines canvas + PNG): resetear el estado
        // de preload para que los PNG ilustrados se vuelvan a cargar sobre el nuevo estilo.
        _poiPngState = {};
        _poiSvgState = {}; // setStyle descarta también las imágenes pin+SVG rasterizadas
        clearMap();
        loadDataLayer(activeTab);
        reapplyF360IfOn(); // setStyle purga source+capas de fotos 360: re-montar si estaba activo
    });
}

function setBasemap(key) {
    if (!map || !BASEMAPS[key]) return;
    closeBasemapMenu();
    if (key === currentBasemap) { syncBasemapUI(); return; }
    currentBasemap = key;
    isSatellite = key === 'satelite'; // compat: edificios 3D, tutorial, etc.
    try { localStorage.setItem('bareyo_basemap', key); } catch (_) {}
    map.setStyle(BASEMAPS[key].style);
    _rebuildAfterStyleChange();
    syncBasemapUI();
    if (typeof track === 'function') track('basemap_change', { meta: { basemap: key } });
}

// Retrocompat (tutorial / llamadas antiguas): alterna claro ↔ satélite.
function toggleSatellite() { setBasemap(isSatellite ? 'claro' : 'satelite'); }

function syncBasemapUI() {
    const btn = document.getElementById('btnSatellite');
    if (btn) setActive(btn, currentBasemap !== 'claro');
    document.querySelectorAll('#basemapMenu [data-basemap]').forEach(b => {
        const on = b.getAttribute('data-basemap') === currentBasemap;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
}

function toggleBasemapMenu() {
    const menu = document.getElementById('basemapMenu');
    const btn = document.getElementById('btnSatellite');
    if (!menu) return;
    const show = menu.hidden;
    menu.hidden = !show;
    if (btn) btn.setAttribute('aria-expanded', show ? 'true' : 'false');
    if (show) syncBasemapUI();
}

function closeBasemapMenu() {
    const menu = document.getElementById('basemapMenu');
    const btn = document.getElementById('btnSatellite');
    if (menu) menu.hidden = true;
    if (btn) btn.setAttribute('aria-expanded', 'false');
}

// Cierre del menú de basemaps al tocar fuera (mismo patrón que el menú de idiomas).
document.addEventListener('click', e => {
    const menu = document.getElementById('basemapMenu');
    if (!menu || menu.hidden) return;
    if (e.target && e.target.closest && (e.target.closest('#basemapMenu') || e.target.closest('#btnSatellite'))) return;
    closeBasemapMenu();
});

// ─── FOTOS 360° / STREET VIEW (capa clusterizada, carga diferida) ───────────
// Source cluster:true + 3 capas: círculo de cluster, conteo, y puntos sin agrupar
// (color distinto para dron). El GeoJSON (assets/data/fotos360.geojson) NO se
// descarga al inicio: fetch perezoso la 1ª vez que se activa el toggle, cacheado
// en _f360Data para reactivaciones y para re-montar tras setStyle (satélite).
const F360_SRC = 'fotos360-src';
const F360_CLUSTERS = 'fotos360-clusters';
const F360_CLUSTER_COUNT = 'fotos360-cluster-count';
const F360_POINTS = 'fotos360-points';
let _f360On = false;       // capa visible
let _f360Data = null;      // FeatureCollection cacheado tras el primer fetch
let _f360Loading = false;  // guard anti-doble-fetch
let _f360Popup = null;
let _f360Handlers = [];

function buildF360Layers() {
    if (!map || !_f360Data) return;
    if (map.getSource(F360_SRC)) return; // ya montado
    map.addSource(F360_SRC, {
        type: 'geojson',
        data: _f360Data,
        cluster: true,
        clusterRadius: 50,
        clusterMaxZoom: 16
    });
    // Clusters: círculo cuyo tamaño/color crece con la cantidad.
    map.addLayer({
        id: F360_CLUSTERS,
        type: 'circle',
        source: F360_SRC,
        filter: ['has', 'point_count'],
        paint: {
            'circle-color': ['step', ['get', 'point_count'], '#4f9cc4', 10, '#2f7fa8', 30, '#1d5f82'],
            'circle-radius': ['step', ['get', 'point_count'], 16, 10, 21, 30, 27],
            'circle-stroke-width': 2,
            'circle-stroke-color': 'rgba(255,255,255,0.9)'
        }
    });
    // Símbolo con el conteo dentro del cluster.
    map.addLayer({
        id: F360_CLUSTER_COUNT,
        type: 'symbol',
        source: F360_SRC,
        filter: ['has', 'point_count'],
        layout: {
            'text-field': ['get', 'point_count_abbreviated'],
            'text-font': ['Open Sans Regular'],
            'text-size': 13,
            'text-allow-overlap': true
        },
        paint: { 'text-color': '#ffffff' }
    });
    // Puntos sin agrupar: color distinto si es dron.
    map.addLayer({
        id: F360_POINTS,
        type: 'circle',
        source: F360_SRC,
        filter: ['!', ['has', 'point_count']],
        paint: {
            'circle-color': ['case', ['==', ['get', 'drone'], true], '#e8973a', '#2f7d48'],
            'circle-radius': 7,
            'circle-stroke-width': 2,
            'circle-stroke-color': 'rgba(255,255,255,0.95)'
        }
    });
    attachF360Handlers();
}

function attachF360Handlers() {
    // Clic en cluster → zoom de expansión estándar.
    const onCluster = (e) => {
        const feats = map.queryRenderedFeatures(e.point, { layers: [F360_CLUSTERS] });
        const clusterId = feats[0] && feats[0].properties.cluster_id;
        if (clusterId == null) return;
        const src = map.getSource(F360_SRC);
        src.getClusterExpansionZoom(clusterId, (err, zoom) => {
            if (err) return;
            map.easeTo({ center: feats[0].geometry.coordinates, zoom: zoom });
        });
    };
    // Clic en punto sin agrupar → visor 360 DIRECTO (decisión UX 2026-07-16: el popup
    // intermedio con botón "Ver" obligaba a un toque extra; openF360Popup queda para
    // usos futuros pero el flujo principal abre la imagen al primer toque).
    const onPoint = (e) => {
        const f = e.features && e.features[0];
        if (!f) return;
        openF360Viewer(f.geometry.coordinates.slice(), f.properties);
    };
    const enter = () => { map.getCanvas().style.cursor = 'pointer'; };
    const leave = () => { map.getCanvas().style.cursor = ''; };
    map.on('click', F360_CLUSTERS, onCluster);
    map.on('click', F360_POINTS, onPoint);
    map.on('mouseenter', F360_CLUSTERS, enter);
    map.on('mouseleave', F360_CLUSTERS, leave);
    map.on('mouseenter', F360_POINTS, enter);
    map.on('mouseleave', F360_POINTS, leave);
    _f360Handlers.push(
        { event: 'click', layer: F360_CLUSTERS, handler: onCluster },
        { event: 'click', layer: F360_POINTS, handler: onPoint },
        { event: 'mouseenter', layer: F360_CLUSTERS, handler: enter },
        { event: 'mouseleave', layer: F360_CLUSTERS, handler: leave },
        { event: 'mouseenter', layer: F360_POINTS, handler: enter },
        { event: 'mouseleave', layer: F360_POINTS, handler: leave }
    );
}

function openF360Popup(coords, p) {
    if (_f360Popup) { _f360Popup.remove(); _f360Popup = null; }
    const name = escapeHTML(p.ds || '');
    const thumb = p.thumb ? escapeHTML(p.thumb) : '';
    const label = escapeHTML(t('viewStreetView'));
    // onerror: las miniaturas de Google caducan (403) con el tiempo; el visor sigue
    // funcionando (usa el id del panorama), así que ocultamos solo la miniatura rota.
    const img = thumb
        ? `<img class="f360-popup-thumb" src="${thumb}" alt="" loading="lazy" decoding="async" onerror="this.remove()">`
        : '';
    const btn = p.id ? `<button type="button" class="f360-popup-btn">${label}</button>` : '';
    const html = `<div class="f360-popup">${img}<div class="f360-popup-body">${name ? `<div class="f360-popup-name">${name}</div>` : ''}${btn}</div></div>`;
    _f360Popup = new maplibregl.Popup({ offset: 14, closeButton: true, maxWidth: '250px', className: 'f360-popup-wrap' })
        .setLngLat(coords).setHTML(html).addTo(map);
    // Botón real (no href) → abre el visor embebido; el enlace externo queda de fallback dentro del visor.
    const popupEl = _f360Popup.getElement();
    const btnEl = popupEl && popupEl.querySelector('.f360-popup-btn');
    if (btnEl) btnEl.addEventListener('click', () => openF360Viewer(coords, p));
}

// Sin API key de Google: mismo patrón que bareyoapp_cinematic.html (api stret clotitec).
function embedUrl(id, lat, lng, heading) {
    if (!id) return '';
    const pid = String(id).replace(/\+/g, '%2B');
    return 'https://www.google.com/maps/embed?pb=!4v0!6m8!1m7!1s' + pid +
        '!2m2!1d' + lat + '!2d' + lng + '!3f' + (Number(heading) || 0) + '!4f0!5f0.7820865974627469';
}

function openF360Viewer(coords, p) {
    const viewer = document.getElementById('f360Viewer');
    const iframe = document.getElementById('f360ViewerIframe');
    if (!viewer || !iframe) return;
    if (_f360Popup) { _f360Popup.remove(); _f360Popup = null; }
    iframe.src = embedUrl(p.id, coords[1], coords[0], p.h);
    const caption = document.getElementById('f360ViewerCaption');
    if (caption) caption.textContent = p.ds || '';
    const fallback = document.getElementById('f360ViewerFallback');
    if (fallback) fallback.href = p.link || '#';
    viewer.classList.add('active');
    if (typeof track === 'function') track('fotos360_view', { meta: { id: p.id } });
}

function closeF360Viewer() {
    const viewer = document.getElementById('f360Viewer');
    if (!viewer) return;
    viewer.classList.remove('active');
    const iframe = document.getElementById('f360ViewerIframe');
    if (iframe) iframe.src = ''; // corta el pano en segundo plano al cerrar
}

function removeF360Layers() {
    if (!map) return;
    if (_f360Popup) { _f360Popup.remove(); _f360Popup = null; }
    _f360Handlers.forEach(({ event, layer, handler }) => {
        try { map.off(event, layer, handler); } catch (e) {}
    });
    _f360Handlers = [];
    [F360_POINTS, F360_CLUSTER_COUNT, F360_CLUSTERS].forEach(id => {
        try { if (map.getLayer(id)) map.removeLayer(id); } catch (e) {}
    });
    try { if (map.getSource(F360_SRC)) map.removeSource(F360_SRC); } catch (e) {}
}

// Re-monta la capa si estaba activa. Llamar tras setStyle (toggleSatellite), que
// purga source + capas. Usa el _f360Data ya cacheado → sin refetch.
function reapplyF360IfOn() {
    if (!(_f360On && _f360Data)) return;
    // setStyle recrea las capas con el mismo id, pero los listeners por-capa persisten
    // en el mapa → soltar los antiguos antes de re-montar evita handlers duplicados.
    _f360Handlers.forEach(({ event, layer, handler }) => {
        try { map.off(event, layer, handler); } catch (e) {}
    });
    _f360Handlers = [];
    buildF360Layers();
}

async function toggleFotos360() {
    if (!map) return;
    const btn = document.getElementById('btnFotos360');
    _f360On = !_f360On;
    setActive(btn, _f360On);
    if (!_f360On) { removeF360Layers(); return; }
    if (typeof track === 'function') track('fotos360_toggle', { meta: { on: true } });
    // Carga DIFERIDA: fetch solo la primera vez que se activa la capa.
    if (!_f360Data) {
        if (_f360Loading) return; // fetch en curso de una activación previa
        _f360Loading = true;
        // Feedback durante la descarga (~3,4 MB): sin esto el usuario cree que no pasa nada y re-pulsa.
        if (btn) btn.setAttribute('aria-busy', 'true');
        if (typeof showToast === 'function') showToast(t('loadingPhotos') || 'Cargando fotos 360…');
        try {
            // Sin force-cache: el SW cachea el .geojson en DATA_CACHE (SWR) y lo revalida solo.
            const res = await fetch('assets/data/fotos360.geojson');
            if (!res.ok) throw new Error('HTTP ' + res.status);
            _f360Data = await res.json();
        } catch (e) {
            _f360Loading = false;
            _f360On = false;
            setActive(btn, false);
            if (btn) btn.removeAttribute('aria-busy');
            if (typeof showToast === 'function') showToast(t('photos360LoadError') || 'No se pudieron cargar las fotos 360');
            return;
        }
        _f360Loading = false;
        if (btn) btn.removeAttribute('aria-busy');
    }
    // La pill muestra cuántas fotos hay una vez conocido el dato real (patrón contador Hypelist).
    const pillCount = document.getElementById('f360PillCount');
    if (pillCount && _f360Data && Array.isArray(_f360Data.features)) {
        pillCount.textContent = _f360Data.features.length.toLocaleString('es-ES');
        pillCount.hidden = false;
    }
    if (_f360On) buildF360Layers(); // el usuario puede haber desactivado durante el await
}

// ─── VISOR DE COORDENADAS DEL CURSOR (herramienta ocasional, menú «···») ─────
// Muestra lat/lng bajo el puntero en una barrita junto a la atribución; con el
// visor activo, un clic en el mapa copia "[lng, lat]" en el formato exacto de
// data.js (coords: [lng, lat]) y lo confirma con un toast. Pensado para dar de
// alta POIs/negocios sin salir de la app.
let _coordsOn = false;
function _coordsMove(e) {
    const el = document.getElementById('coordsViewer');
    if (el) el.textContent = e.lngLat.lat.toFixed(5) + ', ' + e.lngLat.lng.toFixed(5);
}
function _coordsClick(e) {
    const txt = '[' + e.lngLat.lng.toFixed(7) + ', ' + e.lngLat.lat.toFixed(7) + ']';
    const done = () => { if (typeof showToast === 'function') showToast((t('coordsCopied') || 'Coordenadas copiadas') + ' ' + txt); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt).then(done, done);
    } else { done(); }
}
function toggleCoordsViewer() {
    if (!map) return;
    _coordsOn = !_coordsOn;
    const el = document.getElementById('coordsViewer');
    const btn = document.getElementById('btnCoords');
    if (el) el.hidden = !_coordsOn;
    if (btn) { btn.setAttribute('aria-pressed', String(_coordsOn)); btn.classList.toggle('active', _coordsOn); }
    if (_coordsOn) {
        map.on('mousemove', _coordsMove);
        map.on('click', _coordsClick);
        map.getCanvas().style.cursor = 'crosshair';
    } else {
        map.off('mousemove', _coordsMove);
        map.off('click', _coordsClick);
        map.getCanvas().style.cursor = '';
    }
}

// ─── FOTOS 360 EN LA FICHA DE RUTA (mismo dataset que la capa del mapa, sin activarla) ───
// Carga silenciosa: si toggleFotos360() ya está descargando el geojson, no duplica el fetch
// (deja _f360Data vacío esta vez; la ficha simplemente no muestra tira, sin error visible).
async function loadF360DataQuiet() {
    if (_f360Data) return _f360Data;
    if (_f360Loading) return null;
    _f360Loading = true;
    try {
        const res = await fetch('assets/data/fotos360.geojson');
        if (!res.ok) throw new Error('HTTP ' + res.status);
        _f360Data = await res.json();
    } catch (e) {
        _f360Data = null;
    }
    _f360Loading = false;
    return _f360Data;
}

// Fotos a <=maxKm del track, en orden "miga de pan" (según se recorre la ruta, no por
// cercanía cruda) — remuestrea el track a paso fijo porque route.coords viene muy
// simplificado (hasta 500m entre vertices) y comparar solo contra esos vertices se dejaria
// fuera fotos que sí están pegadas al trazado real, a mitad de un tramo recto.
function getNearbyFotos360(coords, maxKm) {
    if (!_f360Data || !window.Geo || !Array.isArray(coords) || coords.length < 2) return [];
    const dense = Geo.resamplePath(coords, 0.05);
    const seen = new Set();
    const out = [];
    for (const f of _f360Data.features) {
        const p = f.geometry.coordinates; // [lng,lat]
        let best = Infinity, bestKm = 0, cum = 0;
        for (let i = 0; i < dense.length; i++) {
            if (i > 0) cum += Geo.haversineKm(dense[i - 1], dense[i]);
            const d = Geo.haversineKm(p, dense[i]);
            if (d < best) { best = d; bestKm = cum; }
        }
        if (best > maxKm) continue;
        const id = f.properties && f.properties.id;
        if (id != null) { if (seen.has(id)) continue; seen.add(id); }
        out.push({ coords: p, props: f.properties, km: bestKm, d: best });
    }
    out.sort((a, b) => a.km - b.km);
    return out;
}

// Fotos 360 propias más cercanas a UN punto (para POIs; getNearbyFotos360 es para tracks).
function getFotos360NearPoint(lngLat, maxKm) {
    if (!_f360Data || !window.Geo || !Array.isArray(lngLat)) return [];
    const out = [];
    for (const f of _f360Data.features) {
        const p = f.geometry.coordinates;
        const d = Geo.haversineKm(lngLat, p);
        if (d <= maxKm) out.push({ coords: p, props: f.properties, d });
    }
    out.sort((a, b) => a.d - b.d);
    return out;
}

// Preload con timeout: resuelve con la URL si carga, null si falla o tarda demasiado.
function _preloadImg(src, timeoutMs) {
    return new Promise(resolve => {
        const img = new Image();
        const done = ok => { img.onload = img.onerror = null; resolve(ok ? src : null); };
        img.onload = () => done(true);
        img.onerror = () => done(false);
        setTimeout(() => done(false), timeoutMs || 6000);
        img.src = src;
    });
}

// Cabecera de ficha con foto REAL para patrimonio/3D/rutas (Faro, Ría, Ojerada…).
// Cascada: fotos 360 PROPIAS cercanas (fotos360.geojson, © Clotitec — muchos thumbs
// de Google caducan con 403, por eso se prueban varias) → foto del artículo de
// Wikipedia (Commons, hotlink libre) → se conserva el degradado ya puesto.
// A prueba de carreras: compara por id (los items se reconstruyen con spread).
async function applyHero360(item, type, color) {
    const hero = document.getElementById('detailHero');
    if (!hero || !item) return;
    const lngLat = type === 'hiking'
        ? [item.coords[0][0], item.coords[0][1]]
        : item.coords;

    const apply = (src) => {
        if (!selectedItem || !selectedItem.item || selectedItem.item.id !== item.id) return false;
        hero.style.background =
            `linear-gradient(180deg, rgba(15,46,27,0.08) 0%, rgba(15,46,27,0.45) 100%), ` +
            `url("${src}") center/cover no-repeat`;
        return true;
    };

    // 0) Captura local del POI si existe (assets/poi/{id}.webp|jpg): sitio previsto
    //    para volcar stills de nuestras fotos 360 (Ojerada, playa…) sin tocar código.
    for (const ext of ['webp', 'jpg']) {
        const local = await _preloadImg(`assets/poi/${item.id}.${ext}`, 2500);
        if (local) { apply(local); return; }
    }

    // 1) Fotos 360 propias: hasta 3 candidatas (grande → tamaño original)
    const data = await loadF360DataQuiet();
    if (!selectedItem || !selectedItem.item || selectedItem.item.id !== item.id) return;
    if (data) {
        const candidates = getFotos360NearPoint(lngLat, 0.35)
            .filter(n => n.props && n.props.thumb)
            .slice(0, 3);
        for (const c of candidates) {
            const thumb = c.props.thumb;
            const big = thumb.replace(/=w\d+-h\d+/, '=w1200-h700');
            const ok = (await _preloadImg(big, 4000)) || (big !== thumb && await _preloadImg(thumb, 4000));
            if (ok) { apply(ok); return; }
        }
    }

    // 2) Wikipedia (solo patrimonio con artículo): thumbnail re-pedido a 960px
    //    (Commons rechaza algunos tamaños mayores; 960 funciona y llena el hero)
    if (item.wikiTitle) {
        const wiki = await fetchWikiSummary(item);
        if (!selectedItem || !selectedItem.item || selectedItem.item.id !== item.id) return;
        const src = wiki && wiki.thumbnail && wiki.thumbnail.source
            ? wiki.thumbnail.source.replace(/\/(\d+)px-/, '/960px-')
            : null;
        if (src) {
            const ok = (await _preloadImg(src, 6000)) || (wiki.thumbnail.source !== src && await _preloadImg(wiki.thumbnail.source, 6000));
            if (ok) apply(ok);
        }
    }
}

// Tira de miniaturas clicables en la ficha (abre el visor embebido ya existente).
// Muestra como mucho F360_STRIP_CAP fotos, muestreadas uniformemente a lo largo del track
// para representar toda la ruta (no solo el primer tramo) cuando hay muchas más disponibles.
const F360_STRIP_CAP = 24;
async function renderF360Strip(item, color) {
    const section = document.getElementById('detailF360StripSection');
    const stripEl = document.getElementById('detailF360Strip');
    if (!section || !stripEl) return;
    section.style.display = 'none';
    stripEl.innerHTML = '';
    const data = await loadF360DataQuiet();
    // El usuario puede haber cerrado/cambiado de ficha mientras se descargaba el geojson (~3,4MB).
    // Comparar por id, no por referencia: getItemsByType('all') reconstruye los items con
    // spread en cada llamada (openDetailById en el arranque por deep-link #ruta=… puede
    // invocarse más de una vez), así que `item` no siempre es el mismo objeto aunque sea la
    // misma ruta.
    if (!data || !selectedItem || !selectedItem.item || selectedItem.item.id !== item.id) return;
    const nearby = getNearbyFotos360(item.coords, 0.05);
    if (!nearby.length) return;
    let selected = nearby;
    if (nearby.length > F360_STRIP_CAP) {
        const step = nearby.length / F360_STRIP_CAP;
        selected = Array.from({ length: F360_STRIP_CAP }, (_, i) => nearby[Math.floor(i * step)]);
    }
    selected.forEach((n) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'f360-thumb';
        btn.style.borderColor = color + '55';
        btn.setAttribute('aria-label', (n.props && n.props.ds) || 'Foto 360');
        const img = document.createElement('img');
        const thumbSrc = n.props && n.props.thumb;
        // Sin thumb (el geojson omite las URLs firmadas de Google ya caducadas) → icono
        // neutro directo, sin disparar una petición con src vacío. El visor embebido
        // funciona igual en ambos casos (usa el id del panorama, no esta URL).
        if (thumbSrc) { img.src = thumbSrc; } else { btn.classList.add('f360-thumb-broken'); }
        img.loading = 'lazy';
        img.alt = '';
        img.onerror = () => btn.classList.add('f360-thumb-broken');
        btn.appendChild(img);
        btn.addEventListener('click', () => openF360Viewer(n.coords, n.props));
        stripEl.appendChild(btn);
    });
    section.style.display = 'block';
}

function locateUser() {
    if (!navigator.geolocation) {
        showToast(t('myLocationUnsupported') || 'Geolocalizacion no disponible en este dispositivo');
        return;
    }
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            const { longitude, latitude } = pos.coords;
            if (userMarker) userMarker.remove();

            const el = document.createElement('div');
            el.style.cssText = 'width:20px;height:20px;';
            el.innerHTML = `<div style="width:20px;height:20px;background:#4A90D9;border-radius:50%;border:3px solid white;box-shadow:0 0 0 4px rgba(74,144,217,0.25)"></div>`;
            userMarker = new maplibregl.Marker({ element: el }).setLngLat([longitude, latitude]).addTo(map);
            map.flyTo({ center: [longitude, latitude], zoom: 15, speed: 1.2 });
            showToast(t('myLocationFound') || 'Ubicacion encontrada');
        },
        () => { showToast(t('myLocationError') || 'No se pudo obtener tu ubicacion'); },
        { enableHighAccuracy: true, timeout: 8000 }
    );
}

function resetView() {
    map.flyTo({
        center: CONFIG.center,
        zoom: CONFIG.zoom,
        pitch: CONFIG.pitch,
        bearing: CONFIG.bearing,
        speed: 1.2,
        curve: 1.4
    });
}

function resetNorth() {
    map.easeTo({ bearing: 0, pitch: CONFIG.pitch, duration: 600 });
}

function setToolbarMore(open) {
    const pop = document.getElementById('mapToolbarMore');
    const btn = document.getElementById('btnToolbarMore');
    if (!pop) return;
    pop.hidden = !open;
    if (btn) btn.setAttribute('aria-expanded', String(open));
}
function toggleMapToolbarMore() {
    const pop = document.getElementById('mapToolbarMore');
    setToolbarMore(pop ? pop.hidden : true);
}
function _closeToolbarMore() { setToolbarMore(false); }
document.addEventListener('click', e => {
    const pop = document.getElementById('mapToolbarMore');
    if (!pop || pop.hidden) return; // nada que cerrar → evita el querySelector en cada click
    const bar = document.querySelector('.map-toolbar');
    if (bar && !bar.contains(e.target)) _closeToolbarMore();
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. UI RENDERING
// ─────────────────────────────────────────────────────────────────────────────
function renderTabs() {
    const html = TABS.map(tab => {
        const isActive = tab.id === activeTab;
        const active = isActive ? 'active' : '';
        return `<button class="tab-pill ${active}" onclick="switchTab('${tab.id}')"
            role="tab" aria-pressed="${isActive}" aria-current="${isActive ? 'page' : 'false'}">
            <span class="tab-emoji" aria-hidden="true">${tab.emoji}</span>${tab.label}
        </button>`;
    }).join('');

    const desktopEl = document.getElementById('tabsDesktop');
    const mobileEl = document.getElementById('tabsMobile');
    if (desktopEl) { desktopEl.setAttribute('role', 'tablist'); desktopEl.innerHTML = html; }
    if (mobileEl)  { mobileEl.setAttribute('role', 'tablist');  mobileEl.innerHTML = html; }
}

function renderFilters(tab) {
    let html = '';

    if (tab === 'biz') {
        html = Object.entries(BUSINESS_CATEGORIES).map(([key, cat]) => {
            const active = activeFilter === key ? 'active' : '';
            return `<button class="filter-pill ${active}" onclick="setFilter('${key}')" style="${activeFilter === key ? `background:${cat.color};color:white;border-color:${cat.color}` : ''}">
                <span style="font-size:12px">${cat.emoji}</span> ${cat.label}
            </button>`;
        }).join('');
    } else if (tab === 'hiking') {
        const diffs = [
            { key: 'all', label: 'Todas', emoji: '🥾' },
            { key: 'easy', label: 'Facil', emoji: '🟢' },
            { key: 'medium', label: 'Media', emoji: '🟡' },
            { key: 'hard', label: 'Dificil', emoji: '🔴' }
        ];
        html = diffs.map(d => {
            const active = activeFilter === d.key ? 'active' : '';
            return `<button class="filter-pill ${active}" onclick="setFilter('${d.key}')">
                <span style="font-size:12px">${d.emoji}</span> ${d.label}
            </button>`;
        }).join('');
    }

    const desktopEl = document.getElementById('filtersDesktop');
    const mobileEl = document.getElementById('filtersMobile');
    if (desktopEl) desktopEl.innerHTML = html;
    if (mobileEl) mobileEl.innerHTML = html;
}

function getItemsByType(tab) {
    if (tab === 'all') {
        // Routes + heritage + 3D (businesses excluded — they have their own tab)
        return [
            ...hikingRoutes.map(i => ({ ...i, _type: 'hiking' })),
            ...costaPoints.map(i => ({ ...i, _type: 'costa' })),
            ...points3D.map(i => ({ ...i, _type: '3d' }))
        ];
    }
    if (tab === 'hiking') return hikingRoutes;
    if (tab === 'costa') return costaPoints;
    if (tab === 'biz') return businesses;
    if (tab === '3d') return points3D;
    return [];
}

function filterItems(items, tab) {
    let filtered = items;

    // Category/difficulty filter (skip for 'all' tab)
    if (activeFilter !== 'all' && tab !== 'all') {
        if (tab === 'biz') {
            filtered = filtered.filter(i => i.category === activeFilter);
        } else if (tab === 'hiking') {
            filtered = filtered.filter(i => i.diff === activeFilter);
        }
    }

    // Search filter
    if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        filtered = filtered.filter(i => {
            const name = (i.name || '').toLowerCase();
            const desc = (i.desc || '').toLowerCase();
            const loc = (i.location || '').toLowerCase();
            const tags = (i.tags || []).join(' ').toLowerCase();
            const sub = (i.subcategory || '').toLowerCase();
            return name.includes(term) || desc.includes(term) || loc.includes(term) || tags.includes(term) || sub.includes(term);
        });
    }

    return filtered;
}

function createItemCard(item, type) {
    const emoji = type === 'biz'
        ? (CATEGORY_EMOJIS[item.subcategory] || CATEGORY_EMOJIS[item.category] || '📍')
        : type === 'hiking' ? '🥾'
        : type === 'costa' ? '⛪'
        : '🧊';

    const color = type === 'hiking' ? (item.color ? item.color.main : '#B96A3C')
        : type === 'biz' ? (BUSINESS_CATEGORIES[item.category] ? BUSINESS_CATEGORIES[item.category].color : '#8E4A63')
        : type === 'costa' ? '#0E6C86'
        : '#2F7D48';

    const subtitle = type === 'hiking'
        ? `${item.km} km · ${item.time}`
        : type === 'biz' ? (item.subcategory || item.category)
        : (item.location || '');

    const badge = type === 'hiking'
        ? `<span class="item-badge" style="background:${color}">${item.routeNumber || ''}</span>`
        : type === '3d' ? `<span class="item-badge" style="background:#2F7D48">3D</span>`
        : '';

    const safeId = escapeHTML(item.id);
    const safeType = escapeHTML(type);

    return `<div class="company-card" onclick="openDetailById('${safeId}','${safeType}')" role="button" tabindex="0"
        onkeydown="if(event.key==='Enter')openDetailById('${safeId}','${safeType}')">
        <div class="company-icon" style="background:${color}18;position:relative">
            <span class="company-emoji">${emoji}</span>
            ${badge}
        </div>
        <div class="company-info">
            <div class="company-name">${escapeHTML(localizeEntity(item, 'name'))}</div>
            <div class="company-sector-tag" style="color:${color}">${escapeHTML(subtitle)}</div>
        </div>
        <svg class="company-arrow" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path d="m9 18 6-6-6-6"/>
        </svg>
    </div>`;
}

function renderList(tab) {
    const items = getItemsByType(tab);
    const filtered = filterItems(items, tab);

    const html = filtered.length
        ? filtered.map(item => createItemCard(item, item._type || tab)).join('')
        : `<div class="empty-state">
            <div style="font-size:40px;margin-bottom:12px">🔍</div>
            <div style="font-weight:600;color:#374151;margin-bottom:4px">Sin resultados</div>
            <div style="font-size:13px;color:#9ca3af">Prueba con otros terminos</div>
          </div>`;

    const desktopEl = document.getElementById('listDesktop');
    const mobileEl = document.getElementById('listMobile');
    if (desktopEl) desktopEl.innerHTML = html;
    if (mobileEl) mobileEl.innerHTML = html;

    updateResultsCount(filtered.length);
}

function switchTab(tab) {
    activeTab = tab;
    activeFilter = 'all';
    searchTerm = '';

    // Sync search inputs
    const sd = document.getElementById('searchDesktop');
    const sm = document.getElementById('searchMobile');
    if (sd) sd.value = '';
    if (sm) sm.value = '';

    renderTabs();
    renderFilters(tab);
    renderList(tab);
    // El mapa NO se toca: muestra siempre todas las categorías. `tab` solo filtra el menú.
    updateHash();
}

function setFilter(f) {
    activeFilter = f;
    renderFilters(activeTab);
    renderList(activeTab);
    // El mapa NO se toca: el filtro solo afecta a la lista/menú.
}

function updateResultsCount(count) {
    const term = searchTerm.trim();
    const msg = term
        ? `${count} ${t('results')} para "${escapeHTML(term)}"`
        : '';

    const desktopEl = document.getElementById('searchResultsDesktop');
    const mobileEl = document.getElementById('searchResultsMobile');

    if (desktopEl) {
        desktopEl.textContent = msg;
        desktopEl.style.display = msg ? 'block' : 'none';
    }
    if (mobileEl) {
        mobileEl.textContent = msg;
        mobileEl.style.display = msg ? 'block' : 'none';
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. MAP MARKERS & LAYERS
// ─────────────────────────────────────────────────────────────────────────────
function clearMap() {
    // Remove markers
    markers.forEach(m => m.remove());
    markers = [];
    _routeStartMarkers = [];

    // Remove route popup if present
    if (_routePopup) { _routePopup.remove(); _routePopup = null; }

    // Remove registered map event handlers to prevent accumulation
    _routeHandlers.forEach(({ event, layer, handler }) => {
        try { map.off(event, layer, handler); } catch(e) {}
    });
    _routeHandlers = [];

    // Tear down POI symbol layer/source + its handlers. Las imágenes (pines canvas y
    // PNG ilustrados) se conservan para reutilizarlas en el siguiente render.
    _poiHandlers.forEach(({ event, layer, handler }) => {
        try { map.off(event, layer, handler); } catch(e) {}
    });
    _poiHandlers = [];
    try { if (map.getLayer(POI_LAYER)) map.removeLayer(POI_LAYER); } catch(e) {}
    try { if (map.getSource(POI_SRC)) map.removeSource(POI_SRC); } catch(e) {}
    _poiInputs = [];
    _poiFeatures = [];
    _poiLookup = {};

    // Remove route layers first
    routeLayers.forEach(id => {
        try { if (map.getLayer(id)) map.removeLayer(id); } catch(e) {}
    });

    // Then remove sources (deduplicate by stripping suffix)
    const removedSources = new Set();
    routeLayers.forEach(id => {
        const srcId = id.replace(/-glow$|-line$|-hit$/, '');
        if (!removedSources.has(srcId)) {
            try { if (map.getSource(srcId)) map.removeSource(srcId); } catch(e) {}
            removedSources.add(srcId);
        }
    });
    routeLayers = [];
}

function loadDataLayer(tab) {
    if (!map || !map.isStyleLoaded()) {
        // 'style.load' YA se disparó antes del evento 'load', así que once('style.load') no volvería a
        // ejecutarse (rutas/marcadores nunca cargarían tras el await de loadBoundary). 'idle' sí se
        // dispara cuando el mapa termina de asentarse → carga fiable.
        if (map) map.once('idle', () => loadDataLayer(tab));
        return;
    }

    // EL MAPA MUESTRA SIEMPRE TODO. Independientemente de `tab` (o del término de
    // búsqueda), la capa symbol se construye con TODAS las colecciones (patrimonio/costa +
    // 3D + los 96 negocios) y se dibujan TODAS las rutas. El parámetro `tab` ya NO filtra
    // el mapa: la lista y el cajón filtran el MENÚ, el mapa queda completo para no ocultar
    // categorías al llegar por deep-link/QR o al abrir un negocio.
    // Idempotente: loadPointMarkers deduplica por etype:id y renderPoiLayer hace setData
    // sobre la fuente existente (no re-crea fuente/handlers); loadHikingLayer salta rutas
    // ya dibujadas. Así se puede llamar varias veces (idle-retry, cambio de idioma) sin
    // duplicar features ni acumular listeners.
    loadHikingLayer(hikingRoutes);
    loadPointMarkers(costaPoints, 'costa');
    loadPointMarkers(points3D, '3d');
    loadPointMarkers(businesses, 'biz');
    applyLayerVisibility(); // reaplica el estado de los interruptores (POIs + rutas) tras (re)construir
}

// ── Reusable layer helpers ──

// Keep a map of route IDs to route objects for click lookup
const _routeLookup = {};

function loadHikingLayer(routes) {
    routes.forEach(route => {
        if (!route.coords || route.coords.length < 2) return;
        const sourceId = 'route-' + route.id;
        if (map.getSource(sourceId)) return;

        _routeLookup[route.id] = route;

        map.addSource(sourceId, {
            type: 'geojson',
            data: {
                type: 'Feature',
                properties: { routeId: route.id, name: localizeEntity(route, 'name') },
                geometry: {
                    type: 'LineString',
                    coordinates: route.coords.map(c => [c[0], c[1]])
                }
            }
        });

        // Invisible wide hit area for easy clicking
        map.addLayer({
            id: sourceId + '-hit', type: 'line', source: sourceId,
            paint: { 'line-color': 'transparent', 'line-width': 20 }
        });
        // Glow
        map.addLayer({
            id: sourceId + '-glow', type: 'line', source: sourceId,
            paint: { 'line-color': route.color.glow, 'line-width': 8, 'line-opacity': 0.3, 'line-blur': 4 }
        });
        // Main line
        map.addLayer({
            id: sourceId + '-line', type: 'line', source: sourceId,
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: { 'line-color': route.color.main, 'line-width': 4, 'line-opacity': 0.9 }
        });

        routeLayers.push(sourceId + '-hit', sourceId + '-glow', sourceId + '-line');

        // Named handlers for cleanup on clearMap
        const hitLayer = sourceId + '-hit';
        const handleClick = (e) => {
            const rid = e.features?.[0]?.properties?.routeId;
            if (rid && _routeLookup[rid]) openDetail(_routeLookup[rid], 'hiking');
        };
        const handleEnter = (e) => {
            map.getCanvas().style.cursor = 'pointer';
            const rName = e.features?.[0]?.properties?.name;
            if (rName && !_routePopup) {
                _routePopup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, className: 'route-popup', offset: 12 })
                    .setLngLat(e.lngLat).setHTML(`<span style="font-weight:600;font-size:12px">${escapeHTML(rName)}</span>`).addTo(map);
            }
        };
        const handleMove = (e) => { if (_routePopup) _routePopup.setLngLat(e.lngLat); };
        const handleLeave = () => {
            map.getCanvas().style.cursor = '';
            if (_routePopup) { _routePopup.remove(); _routePopup = null; }
        };

        map.on('click', hitLayer, handleClick);
        map.on('mouseenter', hitLayer, handleEnter);
        map.on('mousemove', hitLayer, handleMove);
        map.on('mouseleave', hitLayer, handleLeave);

        _routeHandlers.push(
            { event: 'click', layer: hitLayer, handler: handleClick },
            { event: 'mouseenter', layer: hitLayer, handler: handleEnter },
            { event: 'mousemove', layer: hitLayer, handler: handleMove },
            { event: 'mouseleave', layer: hitLayer, handler: handleLeave }
        );

        // Start marker (numbered)
        const startCoord = route.coords[0];
        const _startMarker = createRouteMarker(
            [startCoord[0], startCoord[1]],
            route.routeNumber,
            route.color.main,
            () => openDetail(route, 'hiking')
        );
        if (_startMarker) _routeStartMarkers.push(_startMarker);
    });
}

// _routePopup declared in global state section

// Alimenta la capa symbol de POIs (costa/3d/negocios). Ya NO crea DOM markers: acumula
// las entidades en _poiInputs y (re)construye la capa. Se llama varias veces por render
// (una por tipo); renderPoiLayer usa el acumulado, así que el último push tiene todo.
function loadPointMarkers(items, type) {
    // Dedup por etype:id: loadDataLayer puede reejecutarse (idle-retry, cambio de idioma)
    // sin pasar por clearMap; sin esto _poiInputs acumularía duplicados de la misma entidad.
    const seen = new Set(_poiInputs.map(p => p.type + ':' + p.entity.id));
    items.forEach(item => {
        if (item && Array.isArray(item.coords) && item.coords.length >= 2) {
            const key = type + ':' + item.id;
            if (seen.has(key)) return;
            seen.add(key);
            _poiInputs.push({ entity: item, type: type });
        }
    });
    renderPoiLayer();
}

// Clave única de imagen para un pin de canvas (color + emoji → id determinista).
function poiPinKey(color, emoji) {
    const c = String(color).replace(/[^a-z0-9]/gi, '');
    const g = Array.from(String(emoji)).map(ch => ch.codePointAt(0).toString(16)).join('');
    return 'pin_' + c + '_' + g;
}

// Genera por canvas (pixelRatio 2 → nitidez retina) un pin teardrop con el color de la
// categoría y el emoji/glifo dentro, y lo registra como imagen del mapa. Idempotente.
function ensurePinImage(key, color, emoji) {
    if (!map || map.hasImage(key)) return;
    const pr = 2, w = 46, h = 58;
    const cv = document.createElement('canvas');
    cv.width = w * pr; cv.height = h * pr;
    const ctx = cv.getContext('2d');
    ctx.scale(pr, pr);
    const cx = w / 2, r = w / 2 - 3, cyc = r + 3;
    // Cuerpo teardrop (círculo + punta hacia abajo), con sombra suave
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 2;
    ctx.beginPath();
    ctx.moveTo(cx, h - 2);
    ctx.quadraticCurveTo(cx - r, cyc + r * 0.9, cx - r, cyc);
    ctx.arc(cx, cyc, r, Math.PI, 0, false);
    ctx.quadraticCurveTo(cx + r, cyc + r * 0.9, cx, h - 2);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
    // Borde blanco
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.stroke();
    // Glifo/emoji centrado en el círculo (los emoji de color ignoran fillStyle)
    ctx.font = Math.round(r * 0.95) + 'px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(emoji, cx, cyc);
    try {
        const img = ctx.getImageData(0, 0, cv.width, cv.height);
        map.addImage(key, img, { pixelRatio: pr });
    } catch (e) { /* addImage puede fallar si la clave ya existe por carrera: ignorar */ }
}

// Carga perezosa del PNG ilustrado de un POI (assets/icons/pin/*.png) y refresca la capa
// para que el símbolo pase del pin de canvas al PNG cuando esté disponible.
function ensurePoiPng(id, path) {
    if (!map || map.hasImage('poi-' + id)) return true;
    if (_poiPngState[id]) return false; // ya se está cargando / ya se intentó
    _poiPngState[id] = 'loading';
    // MapLibre GL v4 devuelve una Promise ({data: img}); v3 usaba callback. Soportar ambos.
    const done = (img) => {
        _poiPngState[id] = 'done';
        if (img && !map.hasImage('poi-' + id)) {
            // Los PNG oficiales (set Cordelia) vienen a 550px: normalizar con pixelRatio
            // para que rindan ~64px CSS a icon-size 1 (algo mayores que el pin de canvas,
            // son los hitos estrella del municipio).
            const ratio = Math.max(1, (img.height || 550) / 64);
            try { map.addImage('poi-' + id, img, { pixelRatio: ratio }); } catch (e) {}
            renderPoiLayer(); // reconstruye para usar ya el PNG
        }
    };
    try {
        const ret = map.loadImage(path, (err, img) => { if (!err) done(img); else { _poiPngState[id] = 'done'; } });
        if (ret && typeof ret.then === 'function') {
            ret.then((resp) => done(resp && (resp.data || resp))).catch(() => { _poiPngState[id] = 'done'; });
        }
    } catch (e) { _poiPngState[id] = 'done'; }
    return false;
}

// Clave de imagen del pin+SVG (glifo + color → id determinista).
function poiSvgImgKey(svgKey, color) {
    return 'pinsvg-' + svgKey + '_' + String(color).replace(/[^a-z0-9]/gi, '');
}

// Rasteriza perezosamente el pin teardrop (color de categoría) con el icono SVG en BLANCO
// como glifo centrado, y lo registra como imagen del mapa. Devuelve true si ya está lista;
// si no, lanza el fetch+dibujo y refresca la capa al terminar (patrón de ensurePoiPng).
// Cachea por imgKey (estado) y por svgKey (texto del SVG).
function ensurePinSvgImage(imgKey, color, svgKey) {
    if (!map) return false;
    if (map.hasImage(imgKey)) return true;
    if (_poiSvgState[imgKey]) return false; // en curso o ya intentado (éxito o fallo)
    _poiSvgState[imgKey] = 'loading';

    const draw = (svgImg) => {
        _poiSvgState[imgKey] = 'done';
        if (!svgImg || map.hasImage(imgKey)) return;
        try {
            const pr = 2, w = 46, h = 58;
            const cv = document.createElement('canvas');
            cv.width = w * pr; cv.height = h * pr;
            const ctx = cv.getContext('2d');
            ctx.scale(pr, pr);
            const cx = w / 2, r = w / 2 - 3, cyc = r + 3;
            // Cuerpo teardrop (misma geometría que ensurePinImage), con sombra suave.
            ctx.save();
            ctx.shadowColor = 'rgba(0,0,0,0.35)';
            ctx.shadowBlur = 4;
            ctx.shadowOffsetY = 2;
            ctx.beginPath();
            ctx.moveTo(cx, h - 2);
            ctx.quadraticCurveTo(cx - r, cyc + r * 0.9, cx - r, cyc);
            ctx.arc(cx, cyc, r, Math.PI, 0, false);
            ctx.quadraticCurveTo(cx + r, cyc + r * 0.9, cx, h - 2);
            ctx.closePath();
            ctx.fillStyle = color;
            ctx.fill();
            ctx.restore();
            // Borde blanco.
            ctx.lineWidth = 2;
            ctx.strokeStyle = 'rgba(255,255,255,0.95)';
            ctx.stroke();
            // Glifo SVG (ya en blanco) centrado dentro del círculo.
            const g = r * 1.3;
            ctx.drawImage(svgImg, cx - g / 2, cyc - g / 2, g, g);
            const data = ctx.getImageData(0, 0, cv.width, cv.height);
            map.addImage(imgKey, data, { pixelRatio: pr });
            renderPoiLayer(); // reconstruye para usar ya el pin+SVG
        } catch (e) { /* getImageData/addImage pueden fallar por carrera: ignorar */ }
    };

    // Construye la imagen a partir del texto SVG: fuerza trazo/relleno a blanco (currentColor
    // y var(--poi-accent,…) → #fff) y lo pasa por un data-URL para dibujarlo en canvas.
    const build = (svgText) => {
        const white = svgText
            .replace(/currentColor/g, '#fff')
            .replace(/var\(\s*--poi-accent[^)]*\)/g, '#fff');
        const im = new Image();
        im.decoding = 'async';
        im.onload = () => draw(im);
        im.onerror = () => { _poiSvgState[imgKey] = 'done'; };
        im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(white);
    };

    if (_poiSvgText[svgKey]) { build(_poiSvgText[svgKey]); return false; }
    fetch(POI_SVG_DIR + svgKey + '.svg')
        .then(res => res.ok ? res.text() : Promise.reject(new Error('svg ' + res.status)))
        .then(txt => { _poiSvgText[svgKey] = txt; build(txt); })
        .catch(() => { _poiSvgState[imgKey] = 'done'; });
    return false;
}

// Decide icono + metadatos de una entidad. Asegura la imagen (SVG/canvas/PNG) y devuelve
// { icon, category, prio }. prio: patrimonio/3d=1, costa=2, negocio=3 (menor gana la colisión).
function poiIconFor(entity, type) {
    if (type === 'biz') {
        const color = BUSINESS_CATEGORIES[entity.category] ? BUSINESS_CATEGORIES[entity.category].color : '#8E4A63';
        const emoji = CATEGORY_EMOJIS[entity.subcategory] || CATEGORY_EMOJIS[entity.category] || '📍';
        const key = poiPinKey(color, emoji);
        ensurePinImage(key, color, emoji);
        return { icon: key, category: entity.category || 'servicios', prio: 3 };
    }
    // costa | 3d
    const cfg = POI_PIN[entity.id] || (type === '3d'
        ? { emoji: '🧊', color: '#2F7D48' }
        : { emoji: '⛪', color: '#0E6C86' });
    const category = (type === '3d') ? 'patrimonio' : 'costa';
    const prio = (type === '3d') ? 1 : 2;
    // Prioridad 1 (decisión 2026-07-16): PNG ilustrado OFICIAL del set de Cordelia si
    // existe — son la identidad visual del municipio y deben verse en el mapa.
    if (cfg.png && ensurePoiPng(entity.id, cfg.png)) {
        return { icon: 'poi-' + entity.id, category: category, prio: prio };
    }
    // Prioridad 2: glifo SVG blanco dentro del pin de color (coherente con el menú).
    // Cubre los POIs sin icono oficial y hace de puente mientras el PNG carga.
    const svgKey = poiSvgKey(entity, type);
    if (svgKey) {
        const svgImgKey = poiSvgImgKey(svgKey, cfg.color);
        if (ensurePinSvgImage(svgImgKey, cfg.color, svgKey)) {
            return { icon: svgImgKey, category: category, prio: prio };
        }
        // aún cargando/error → degradar a pin emoji hasta el refresco.
    }
    const key = poiPinKey(cfg.color, cfg.emoji);
    ensurePinImage(key, cfg.color, cfg.emoji);
    return { icon: key, category: category, prio: prio };
}

// (Re)construye la fuente GeoJSON y la capa symbol desde _poiInputs.
// Si el estilo está ocupado (setStyle/terreno en curso) NO se descarta el refresco:
// se encola al próximo 'idle' (guard anti-duplicados). Sin esto, los re-renders que
// disparan las cargas perezosas de PNG/SVG se perdían y los POIs se quedaban con el
// pin provisional de emoji.
let _poiRenderQueued = false;
function renderPoiLayer() {
    if (!map) return;
    if (!map.isStyleLoaded()) {
        if (!_poiRenderQueued) {
            _poiRenderQueued = true;
            map.once('idle', () => { _poiRenderQueued = false; renderPoiLayer(); });
        }
        return;
    }
    const feats = [];
    _poiLookup = {};
    _poiInputs.forEach(({ entity, type }) => {
        if (!entity || !Array.isArray(entity.coords)) return;
        const meta = poiIconFor(entity, type);
        _poiLookup[type + ':' + entity.id] = entity;
        feats.push({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [entity.coords[0], entity.coords[1]] },
            properties: Object.assign({
                id: entity.id,
                etype: type,
                category: meta.category,
                prio: meta.prio,
                icon: meta.icon,
                name: localizeEntity(entity, 'name')
            }, _poiBranchFlags(entity, type))
        });
    });
    _poiFeatures = feats;
    const data = { type: 'FeatureCollection', features: feats };

    const existing = map.getSource(POI_SRC);
    if (existing) {
        existing.setData(data);
        applyLayerVisibility();
        fadeInPoiLayer();
        return;
    }

    map.addSource(POI_SRC, { type: 'geojson', data: data });
    map.addLayer({
        id: POI_LAYER,
        type: 'symbol',
        source: POI_SRC,
        layout: {
            'icon-image': ['get', 'icon'],
            'icon-anchor': 'bottom',
            'icon-size': ['interpolate', ['linear'], ['zoom'], 10, 0.55, 13, 0.8, 16, 1.0],
            // COLISIÓN: nunca se solapan. symbol-sort-key por prioridad (menor gana el choque).
            'icon-allow-overlap': false,
            'icon-ignore-placement': false,
            'symbol-sort-key': ['get', 'prio'],
            // Nombre solo a zoom alto, opcional y con colisión propia.
            'text-field': ['step', ['zoom'], '', 14, ['get', 'name']],
            'text-font': ['Open Sans Regular'],
            'text-optional': true,
            'text-anchor': 'top',
            'text-offset': [0, 0.3],
            'text-size': 11,
            'text-max-width': 9,
            'text-allow-overlap': false,
            'text-ignore-placement': false
        },
        paint: {
            'text-color': '#1a2332',
            'text-halo-color': 'rgba(255,255,255,0.92)',
            'text-halo-width': 1.4
        }
    });
    attachPoiHandlers();
    applyLayerVisibility();
    fadeInPoiLayer();
}

// Aparición suave de los POIs al (re)cargar la capa (cambio de tab/filtro) — efecto
// "materialize" del catálogo efecto-ia-mapas-clotitec, adaptado a la capa symbol única
// (paint-property transition vía rAF, sin animar pin a pin).
let _poiFadeRaf = null;
function fadeInPoiLayer() {
    if (!map || !map.getLayer(POI_LAYER)) return;
    if (_poiFadeRaf) cancelAnimationFrame(_poiFadeRaf);
    const DURATION = 350;
    const start = performance.now();
    const step = (now) => {
        // Clamp inferior: el timestamp del rAF puede ser ANTERIOR al performance.now()
        // capturado (lote de frames) → t negativo rompía la validación de MapLibre y
        // abortaba el fade dejando la capa a opacidad 0.
        const t = Math.min(1, Math.max(0, (now - start) / DURATION));
        try { map.setPaintProperty(POI_LAYER, 'icon-opacity', t); } catch (e) { return; }
        if (t < 1) _poiFadeRaf = requestAnimationFrame(step);
        else _poiFadeRaf = null;
    };
    try { map.setPaintProperty(POI_LAYER, 'icon-opacity', 0); } catch (e) { return; }
    _poiFadeRaf = requestAnimationFrame(step);
}

// ── Visibilidad de capas por categoría (interruptores del menú) ──────────────
// Cada feature POI lleva flags l_<capa> (_poiBranchFlags). El filtro muestra una feature
// si pertenece a ALGUNA capa activa; las rutas (líneas + marcador de inicio) se togglean
// aparte con visibility. La pertenencia es coherente con _cajonBranchItems (misma que el menú).
function _poiBranchFlags(entity, type) {
    const f = {};
    if (type === 'biz') { f.l_negocios = 1; }
    else if (type === '3d') { f.l_patrimonio = 1; }
    else if (type === 'costa') {
        if (entity.beach || entity.coast) { f.l_playascosta = 1; }
        else { f.l_patrimonio = 1; }
    }
    return f;
}
function _poiVisibilityFilter() {
    const poiKeys = MAP_LAYER_KEYS.filter(k => k !== 'rutas');
    const active = poiKeys.filter(k => !_layersOff.has(k));
    if (active.length === poiKeys.length) return null;          // todas visibles → sin filtro
    if (active.length === 0) return ['==', ['literal', 1], 0];  // ninguna → oculta todo
    return ['any'].concat(active.map(k => ['==', ['get', 'l_' + k], 1]));
}
function applyLayerVisibility() {
    if (!map) return;
    try { if (map.getLayer(POI_LAYER)) map.setFilter(POI_LAYER, _poiVisibilityFilter()); } catch (e) {}
    const routesOn = !_layersOff.has('rutas');
    routeLayers.forEach(id => { try { if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', routesOn ? 'visible' : 'none'); } catch (e) {} });
    _routeStartMarkers.forEach(m => { try { const el = m.getElement && m.getElement(); if (el) el.style.display = routesOn ? '' : 'none'; } catch (e) {} });
}

// Click → resuelve entidad por type:id y abre la ficha. Cursor pointer en hover.
// Handlers registrados en _poiHandlers para limpiarlos en clearMap.
function attachPoiHandlers() {
    const onClick = (e) => {
        const f = e.features && e.features[0];
        if (!f) return;
        const ent = _poiLookup[f.properties.etype + ':' + f.properties.id];
        if (ent) openDetail(ent, f.properties.etype);
    };
    const onEnter = () => { map.getCanvas().style.cursor = 'pointer'; };
    const onLeave = () => { map.getCanvas().style.cursor = ''; };
    map.on('click', POI_LAYER, onClick);
    map.on('mouseenter', POI_LAYER, onEnter);
    map.on('mouseleave', POI_LAYER, onLeave);
    _poiHandlers.push(
        { event: 'click', layer: POI_LAYER, handler: onClick },
        { event: 'mouseenter', layer: POI_LAYER, handler: onEnter },
        { event: 'mouseleave', layer: POI_LAYER, handler: onLeave }
    );
}

// Pin teardrop premium (A2): fondo = color de categoría, glifo blanco dentro,
// sombra multicapa, jerarquía por tamaño, hover con transform spring.
function createMarker(coords, emoji, color, onClick, name, size) {
    size = size || 44;
    const glyph = Math.round(size * 0.42);
    const el = document.createElement('div');
    el.style.cssText = 'display:flex;flex-direction:column;align-items:center;cursor:pointer;transition:transform 0.25s cubic-bezier(0.34,1.56,0.64,1);';
    el.innerHTML = `
        <div class="marker-pin" style="position:relative;width:${size}px;height:${size}px;">
            <span style="position:absolute;inset:0;background:${color};border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid rgba(255,255,255,0.92);box-shadow:0 1px 2px rgba(0,0,0,0.25), 0 4px 12px rgba(0,0,0,0.28);"></span>
            <span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#fff;font-size:${glyph}px;line-height:1;filter:drop-shadow(0 1px 1px rgba(0,0,0,0.25));">${emoji}</span>
        </div>
        ${name ? `<div class="marker-label" style="display:none;margin-top:6px;background:var(--surface-glass,rgba(255,255,255,0.92));backdrop-filter:var(--blur-md,blur(12px));-webkit-backdrop-filter:var(--blur-md,blur(12px));color:var(--text,#1a2332);padding:2px 8px;border-radius:var(--r-sm,8px);font-size:10px;font-weight:600;font-family:'DM Sans',system-ui;white-space:nowrap;max-width:140px;overflow:hidden;text-overflow:ellipsis;box-shadow:var(--shadow-sm,0 1px 6px rgba(0,0,0,0.08));border:1px solid var(--border,rgba(0,0,0,0.06))">${escapeHTML(name)}</div>` : ''}`;
    el.onmouseenter = () => { el.style.transform = 'scale(1.12) translateY(-2px)'; };
    el.onmouseleave = () => { el.style.transform = 'scale(1) translateY(0)'; };
    el.onclick = onClick;
    const marker = new maplibregl.Marker({ element: el }).setLngLat(coords).addTo(map);
    markers.push(marker);
    return marker;
}

function createRouteMarker(coords, number, color, onClick) {
    const el = document.createElement('div');
    el.style.cssText = 'width:36px;height:36px;cursor:pointer;transition:transform 0.25s cubic-bezier(0.34,1.56,0.64,1);';
    el.innerHTML = `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:${color};border-radius:50%;color:white;font-size:14px;font-weight:800;font-family:'DM Sans',system-ui;box-shadow:0 1px 2px rgba(0,0,0,0.25), 0 4px 12px rgba(0,0,0,0.28);border:2px solid white;">${number}</div>`;
    el.onmouseenter = () => { el.style.transform = 'scale(1.12) translateY(-2px)'; };
    el.onmouseleave = () => { el.style.transform = 'scale(1) translateY(0)'; };
    el.onclick = onClick;
    const marker = new maplibregl.Marker({ element: el }).setLngLat(coords).addTo(map);
    markers.push(marker);
    return marker;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. DETAIL MODAL
// ─────────────────────────────────────────────────────────────────────────────
function openDetailById(id, type) {
    const items = getItemsByType(type);
    const item = items.find(i => i.id === id);
    if (item) openDetail(item, type);
}

// Al abrir una ficha, garantizar que su capa del mapa está visible: si el visitante
// (o el tótem) dejó la capa apagada, la ficha aparecía sin su pin/línea en el mapa y
// parecía rota (feedback pantalla táctil 2026-07-22). Enciende lo mínimo y persiste.
function ensureLayerVisibleFor(item, type) {
    if (typeof _layersOff === 'undefined' || !_layersOff.size) return;
    let need = null;
    if (type === 'hiking') {
        if (_layersOff.has('rutas')) need = 'rutas';
    } else {
        const keys = Object.keys(_poiBranchFlags(item, type)).map(k => k.replace(/^l_/, ''));
        if (keys.length && keys.every(k => _layersOff.has(k))) need = keys[0];
    }
    if (need) layerToggle(need); // enciende + persiste + refresca el ojo del cajón
}

// Hitos numerados de una ruta (waypoints del KMZ, p.ej. las 10 casonas de la Ruta del
// Patrimonio): se pintan al abrir su ficha y se retiran al cerrarla.
let _wpMarkers = [];
let _wpPopup = null;
function renderRouteWaypoints(route) {
    _wpMarkers.forEach(m => { try { m.remove(); } catch (e) {} });
    _wpMarkers = [];
    if (_wpPopup) { try { _wpPopup.remove(); } catch (e) {} _wpPopup = null; }
    if (!route || !Array.isArray(route.waypoints) || !map) return;
    const c = route.color ? route.color.main : '#0891B2';
    route.waypoints.forEach(wp => {
        const el = document.createElement('div');
        el.style.cssText = `width:26px;height:26px;display:flex;align-items:center;justify-content:center;background:#fff;border:2.5px solid ${c};border-radius:50%;color:${c};font:800 12px 'DM Sans',system-ui;box-shadow:0 2px 8px rgba(0,0,0,.3);cursor:pointer;`;
        el.textContent = wp.n;
        el.title = wp.name;
        // Tocar un hito abre un mini-popup con su historia (texto del cliente)
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            if (_wpPopup) { try { _wpPopup.remove(); } catch (err) {} }
            _wpPopup = new maplibregl.Popup({ offset: 18, maxWidth: '300px', className: 'wp-popup' })
                .setLngLat(wp.coords)
                .setHTML(
                    `<strong class="wp-popup-title">${wp.n}. ${escapeHTML(wp.name)}</strong>` +
                    (wp.desc ? `<p class="wp-popup-desc">${escapeHTML(wp.desc)}</p>` : '')
                )
                .addTo(map);
        });
        _wpMarkers.push(new maplibregl.Marker({ element: el }).setLngLat(wp.coords).addTo(map));
    });
}

function openDetail(item, type) {
    selectedItem = { item, type };
    const modal = document.getElementById('detailModal');
    if (!modal) return;
    ensureLayerVisibleFor(item, type);
    renderRouteWaypoints(type === 'hiking' ? item : null);

    // Determine color/image for this type
    const color = type === 'hiking' ? (item.color ? item.color.main : '#B96A3C')
        : type === 'biz' ? (BUSINESS_CATEGORIES[item.category] ? BUSINESS_CATEGORIES[item.category].color : '#8E4A63')
        : type === 'costa' ? '#0E6C86'
        : '#2F7D48';

    const emoji = type === 'hiking' ? '🥾'
        : type === 'costa' ? '⛪'
        : type === 'biz' ? (CATEGORY_EMOJIS[item.subcategory] || CATEGORY_EMOJIS[item.category] || '📍')
        : '🧊';

    // Hero section
    const hero = document.getElementById('detailHero');
    const heroTitle = document.getElementById('heroTitle');
    const heroLocation = document.getElementById('heroLocation');
    const heroSector = document.getElementById('heroSector');
    const detailHeaderNoHero = document.getElementById('detailHeaderNoHero');

    // Set hero bg: image for biz, gradient for others
    if (hero) {
        hero.style.display = 'block';
        if (type === 'biz') {
            // Cascade local → unsplash → category default. Preload to avoid flash.
            const primary = item.localImage || item.image;
            const fallback = getBizImage(Object.assign({}, item, { localImage: null, image: null }));
            const img = primary || fallback;
            hero.style.background = `linear-gradient(160deg, ${color}33, ${color}11)`;
            const preloader = new Image();
            preloader.onload = () => {
                if (selectedItem && selectedItem.item === item) {
                    hero.style.background = `url("${img}") center/cover no-repeat`;
                }
            };
            preloader.onerror = () => {
                if (primary && primary !== fallback && selectedItem && selectedItem.item === item) {
                    hero.style.background = `url("${fallback}") center/cover no-repeat`;
                }
            };
            preloader.src = img;
        } else {
            hero.style.background = `linear-gradient(160deg, ${color} 0%, ${color}bb 50%, ${color}66 100%)`;
            if (item.localImage || item.image) {
                // Imagen propia del POI si existe (local > remota), con preload anti-flash
                const img = item.localImage || item.image;
                const pre = new Image();
                pre.onload = () => {
                    if (selectedItem && selectedItem.item && selectedItem.item.id === item.id) {
                        hero.style.background = `linear-gradient(180deg, rgba(15,46,27,0.08) 0%, rgba(15,46,27,0.45) 100%), url("${img}") center/cover no-repeat`;
                    }
                };
                pre.src = img;
            } else {
                // Sin imagen propia → foto 360 nuestra más cercana (Faro, Ría, Ojerada…)
                applyHero360(item, type, color);
            }
        }
    }
    if (detailHeaderNoHero) detailHeaderNoHero.style.display = hero ? 'none' : 'block';

    // Populate hero overlay text
    if (heroTitle) heroTitle.textContent = localizeEntity(item, 'name') || '';
    if (heroLocation) heroLocation.textContent = item.location || '';
    // Negocios: el subcategory es texto libre solo-ES (dato de contenido, no de UI, ver
    // CLAUDE.md "negocios solo en ES") — en ES se respeta tal cual; en el resto de idiomas
    // se sustituye por la categoria general SI traducida en vez de dejar texto en espanol.
    const sectorLabel = type === 'hiking' ? `${item.km} km · ${item.time}`
        : type === 'biz' ? (currentLang === 'es' ? (item.subcategory || item.category) : _cajonBizCategoryLabel(item.category))
        : type === 'costa' ? ((item.beach || item.coast) ? t('catCoast') : t('catHeritage'))
        : '3D';
    if (heroSector) {
        heroSector.textContent = `${emoji} ${sectorLabel}`;
        heroSector.style.background = color + '22';
        heroSector.style.color = color;
    }

    // Also populate fallback header (used if hero is absent)
    const dtTitle = document.getElementById('detailTitle');
    const dtSector = document.getElementById('detailSector');
    const dtArea = document.getElementById('detailArea');
    if (dtTitle) dtTitle.textContent = localizeEntity(item, 'name') || '';
    if (dtSector) { dtSector.textContent = `${emoji} ${sectorLabel}`; dtSector.style.color = color; }
    if (dtArea) dtArea.textContent = item.location || '';

    // Description
    const descSection = document.getElementById('detailDescSection');
    const descEl = document.getElementById('detailDesc');
    const locDesc = localizeEntity(item, 'desc');
    if (descEl) {
        if (type === 'costa' && item.beach) {
            // Banner de bandera de baño (oficial Cruz Roja / estimación oleaje / manual) + descripción
            const fl = getBeachFlag(item.id);
            const info = beachFlags[item.id] || {};
            const origen = info.origen === 'oficial' ? ` · ${t('flagOfficial')}`
                : info.origen === 'estimada' ? ` · ${t('flagEstimated')}`
                : '';
            descEl.innerHTML =
                `<div class="beach-flag-banner" style="border-color:${flagColor(fl)}">` +
                `<span class="flag-dot" style="background:${flagColor(fl)}"></span>` +
                `<span class="beach-flag-label">${t('beachFlag')}: <b style="color:${flagColor(fl)}">${flagLabel(fl)}</b><small class="beach-flag-origin">${origen}</small></span>` +
                `<a class="beach-flag-cam" href="${PLAYAS_CANTABRIA_URL}" target="_blank" rel="noopener">📹 ${t('flagLiveCam')}</a>` +
                `</div>` +
                `<p style="margin:0">${escapeHTML(locDesc)}</p>`;
        } else {
            // Descripción corta (traducida) + sección "Historia" con los textos largos
            // del cliente (docs/contenido, integrados 2026-07-22; por ahora solo ES).
            const hist = Array.isArray(item.history) ? item.history : null;
            if (hist && hist.length) {
                descEl.innerHTML =
                    `<p style="margin:0">${escapeHTML(locDesc)}</p>` +
                    `<h4 class="detail-history-title">${t('historyTitle') || 'Historia'}</h4>` +
                    hist.map(p => `<p class="detail-history-p">${escapeHTML(p)}</p>`).join('');
            } else {
                descEl.textContent = locDesc || '';
            }
        }
    }
    if (descSection) descSection.style.display = locDesc ? 'block' : 'none';

    // Wikipedia summary (only patrimonio types)
    if (type === 'costa' || type === '3d' || type === 'hiking') {
        renderWikiSection(item);
    } else {
        const wikiSection = document.getElementById('detailWikiSection');
        if (wikiSection) wikiSection.style.display = 'none';
    }

    // Tags
    const tagsSection = document.getElementById('detailTagsSection');
    const tagsEl = document.getElementById('detailTags');
    if (item.tags && item.tags.length) {
        if (tagsEl) tagsEl.innerHTML = item.tags.map(tag =>
            `<span class="detail-tag" style="background:${color}15;color:${color};border:1px solid ${color}30">${escapeHTML(tag)}</span>`
        ).join('');
        if (tagsSection) tagsSection.style.display = 'block';
    } else {
        if (tagsSection) tagsSection.style.display = 'none';
    }

    // Stats (hiking only)
    const statsSection = document.getElementById('detailStatsSection');
    const statsEl = document.getElementById('detailStats');
    if (type === 'hiking') {
        if (statsEl) {
            statsEl.innerHTML = `
                <div class="stat-card" style="border-top:3px solid ${color}">
                    <div class="stat-value">${item.km} km</div>
                    <div class="stat-label">Distancia</div>
                </div>
                <div class="stat-card" style="border-top:3px solid ${color}">
                    <div class="stat-value">${item.time}</div>
                    <div class="stat-label">Duracion</div>
                </div>
                <div class="stat-card" style="border-top:3px solid ${color}">
                    <div class="stat-value">${getDiffLabel(item.diff)}</div>
                    <div class="stat-label">Dificultad</div>
                </div>`;
        }
        if (statsSection) statsSection.style.display = 'block';
    } else {
        if (statsSection) statsSection.style.display = 'none';
    }

    // Elevation profile (hiking only)
    const elevSection = document.getElementById('detailElevationSection');
    if (type === 'hiking' && item.coords && item.coords.some(c => c[2] !== undefined)) {
        if (elevSection) elevSection.style.display = 'block';
        setTimeout(() => drawElevationProfile(item.coords, color), 80);
    } else {
        if (elevSection) elevSection.style.display = 'none';
    }

    // Fotos 360 cercanas al track (hiking only) — carga diferida, no bloquea la apertura.
    if (type === 'hiking' && Array.isArray(item.coords)) {
        renderF360Strip(item, color);
    } else {
        const f360StripSection = document.getElementById('detailF360StripSection');
        if (f360StripSection) f360StripSection.style.display = 'none';
    }

    // 360/3D embed
    const section360 = document.getElementById('detail360Section');
    const iframe360 = document.getElementById('iframe360');
    if ((type === '3d' || type === 'costa') && item.url360) {
        if (iframe360) iframe360.src = item.url360;
        if (section360) section360.style.display = 'block';
    } else {
        if (iframe360) iframe360.src = '';
        if (section360) section360.style.display = 'none';
    }

    // Contact info (business only)
    const contactSection = document.getElementById('detailContactSection');
    const contactEl = document.getElementById('detailContact');
    if (type === 'biz' && (item.phone || item.website || item.hours)) {
        let contactHtml = '';
        if (item.phone) {
            contactHtml += `<div class="info-row">
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="flex-shrink:0;color:${color}">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
                <a href="tel:${escapeHTML(item.phone)}" style="color:${color};font-weight:500">${escapeHTML(item.phone)}</a>
            </div>`;
        }
        if (item.website) {
            const domain = (() => { try { return new URL(item.website).hostname.replace('www.', ''); } catch(e) { return item.website; } })();
            contactHtml += `<div class="info-row">
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="flex-shrink:0;color:${color}">
                    <circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                </svg>
                <a href="${escapeHTML(item.website)}" target="_blank" rel="noopener noreferrer" style="color:${color};font-weight:500">${escapeHTML(domain)}</a>
            </div>`;
        }
        if (item.hours) {
            contactHtml += `<div class="info-row">
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="flex-shrink:0;color:${color}">
                    <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                </svg>
                <span style="color:#374151">${escapeHTML(item.hours)}</span>
            </div>`;
        }
        if (contactEl) contactEl.innerHTML = contactHtml;
        if (contactSection) contactSection.style.display = 'block';
    } else {
        if (contactSection) contactSection.style.display = 'none';
    }

    // Action buttons
    renderDetailActions(item, type, color);

    // Modo kiosco: QR "llévatelo en tu móvil" apuntando a esta ficha en la URL pública.
    // El hook se re-ejecuta también en el reopen por cambio de idioma (re-etiqueta los textos).
    if (window.KIOSCO === true && typeof window.kioscoDetailQr === 'function') {
        window.kioscoDetailQr(item, type);
    }

    // Mini map
    const coords = type === 'hiking'
        ? [item.coords[0][0], item.coords[0][1]]
        : item.coords;
    initMiniMap(coords[0], coords[1], localizeEntity(item, 'name'));

    // Show modal + a11y focus management.
    // Guard de re-entrada: toggleLanguage() re-invoca openDetail() con el modal YA abierto solo
    // para re-etiquetar la ficha. En ese caso NO re-capturamos _previousFocus (perderíamos el
    // elemento que abrió el modal), NI robamos el foco al botón cerrar, NI duplicamos analítica.
    const _reopening = modal.classList.contains('active');
    if (!_reopening) _previousFocus = document.activeElement;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    if (!_reopening) setTimeout(() => {
        // Enfocar el botón cerrar VISIBLE (hay dos: el del hero y el del header sin-hero).
        const closeBtn = Array.from(modal.querySelectorAll('.detail-close'))
            .find(b => b.offsetParent !== null) || modal.querySelector('.detail-close');
        if (closeBtn) closeBtn.focus();
    }, 50);
    // Apertura real → empuja historial (gesto atrás cierra la ficha); refresco de idioma → reemplaza.
    updateHash(!_reopening);

    // Analytics (solo en apertura real, no en el refresco por cambio de idioma)
    if (!_reopening && typeof track === 'function') {
        track('detail_open', {
            entity_id: item.id,
            entity_type: type,
            meta: { name: item.name }
        });
    }
}

function getDiffLabel(diff) {
    if (diff === 'easy') return 'Facil';
    if (diff === 'medium') return 'Media';
    if (diff === 'hard') return 'Dificil';
    return diff || '—';
}

function renderDetailActions(item, type, color) {
    const el = document.getElementById('detailActions');
    if (!el) return;

    // Modo kiosco: las acciones de móvil (navegar GPS, llamar, GPX, compartir, empezar ruta)
    // no aplican en un tótem fijo — se sustituyen por el QR "llévatelo en tu móvil"
    // (detailKioscoQrSection, ver js/kiosco.js). Queda solo la audio-guía en patrimonio.
    if (window.KIOSCO === true) {
        el.innerHTML = (type !== 'biz')
            ? `<button class="action-btn action-btn-primary" style="background:${color}" onclick="speakDetailContent()" title="${t('listen') || 'Escuchar'}">
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5zM15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
                ${t('listen') || 'Escuchar'}
            </button>`
            : '';
        return;
    }

    let btns = '';
    const coordsArr = type === 'hiking'
        ? [item.coords[0][0], item.coords[0][1]]
        : item.coords;

    // Navigate button (always)
    btns += `<button class="action-btn action-btn-primary" style="background:${color}" onclick="navigateToItem()">
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg>
        ${t('navigate')}
    </button>`;

    // Call (biz with phone)
    if (type === 'biz' && item.phone) {
        btns += `<button class="action-btn action-btn-secondary" onclick="callItem()">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            ${t('call')}
        </button>`;
    }

    // GPX download (hiking)
    if (type === 'hiking' && item.gpxUrl) {
        btns += `<button class="action-btn action-btn-secondary" onclick="downloadGPX('${escapeHTML(item.gpxUrl)}')">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            ${t('download')}
        </button>`;
    }

    // Start tracking ruta (hiking)
    if (type === 'hiking') {
        btns += `<button class="action-btn action-btn-primary" style="background:#0F2E1B" onclick="startRouteTracking()" title="${t('startRoute') || 'Empezar ruta'}">
            <span style="font-size:15px">🥾</span>
            ${t('startRoute') || 'Empezar ruta'}
        </button>`;
    }

    // Audio guide (patrimonio: costa, 3d, hiking)
    if (type !== 'biz') {
        btns += `<button class="action-btn action-btn-ghost" onclick="speakDetailContent()" title="${t('listen') || 'Escuchar'}">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5zM15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
            ${t('listen') || 'Escuchar'}
        </button>`;
    }

    // Share button
    btns += `<button class="action-btn action-btn-ghost" onclick="shareItem()">
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
        ${t('share')}
    </button>`;

    el.innerHTML = btns;
}

function closeDetail() {
    const modal = document.getElementById('detailModal');
    if (modal) modal.classList.remove('active');
    destroyMiniMap();
    clearProfileMarker();
    hideSelectionPulse();
    renderRouteWaypoints(null);
    selectedItem = null;
    document.body.style.overflow = 'hidden';

    // Clear iframe to stop any videos
    const iframe360 = document.getElementById('iframe360');
    if (iframe360) iframe360.src = '';

    // Cancel any in-progress TTS audio guide
    if (_ttsSpeaking && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        _ttsSpeaking = false;
    }

    // Restore focus to the element that opened the modal
    if (_previousFocus && typeof _previousFocus.focus === 'function') {
        try { _previousFocus.focus(); } catch (_) {}
        _previousFocus = null;
    }

    updateHash();
}

// Cierre iniciado por el usuario (X, clic fuera, Escape, gesto atrás). Teardown SÍNCRONO
// primero (en el tótem history.back() puede tardar o no disparar popstate, y la X parecía
// muerta) y después se retrocede en el historial para que la URL no acumule entradas muertas.
// Idempotentes: el fallback táctil de pointerup y el click sintético posterior pueden llamar
// dos veces; la segunda sale por el guard de .active.
function dismissDetail() {
    const modal = document.getElementById('detailModal');
    if (!modal || !modal.classList.contains('active')) return;
    const pushed = !!(history.state && history.state.modal);
    closeDetail();
    if (pushed) history.back(); // popstate no re-cierra: el handler comprueba .active
}
function dismissEvent() {
    const modal = document.getElementById('eventModal');
    if (!modal || !modal.classList.contains('active')) return;
    const pushed = !!(history.state && history.state.modal);
    closeEventDetail();
    if (pushed) history.back();
}

// Botones de cierre en pantalla táctil: un toque con leve arrastre (habitual en el tótem 75")
// hace que el navegador lo trate como scroll y nunca sintetice el click → la X parecía muerta
// y había que tocar fuera de la ficha. Fallback: pointerup sobre el botón, con tolerancia de
// movimiento, dispara el cierre aunque el click no llegue. touch-action:none en el CSS de
// estos botones garantiza que el pointerup llega (sin él, el gesto muere en pointercancel).
(function () {
    const CLOSERS = [
        ['.detail-close',      () => dismissDetail()],
        ['.event-modal-close', () => dismissEvent()],
        ['.f360-viewer-close', () => (typeof closeF360Viewer === 'function') && closeF360Viewer()],
        ['.tutorial-skip',     () => (typeof closeTutorial === 'function') && closeTutorial()]
    ];
    const SEL = CLOSERS.map(c => c[0]).join(', ');
    let down = null;
    document.addEventListener('pointerdown', e => {
        const btn = e.target && e.target.closest ? e.target.closest(SEL) : null;
        down = btn ? { btn, x: e.clientX, y: e.clientY, id: e.pointerId, t: Date.now() } : null;
    }, true);
    document.addEventListener('pointerup', e => {
        if (!down || e.pointerId !== down.id) return;
        const { btn, x, y, t } = down;
        down = null;
        if (Date.now() - t > 900) return;                          // pulsación larga: no es un tap
        if (Math.hypot(e.clientX - x, e.clientY - y) > 48) return; // arrastre real
        const entry = CLOSERS.find(c => btn.matches(c[0]) || btn.closest(c[0]));
        if (entry) entry[1]();
    }, true);
    document.addEventListener('pointercancel', () => { down = null; }, true);
})();

// Gesto "atrás" del móvil / botón atrás del navegador → cerrar el modal abierto en vez de
// abandonar la app (openDetail/openEventDetail empujan una entrada con state {modal:1}).
window.addEventListener('popstate', () => {
    const evModal = document.getElementById('eventModal');
    if (evModal && evModal.classList.contains('active')) { closeEventDetail(); return; }
    const modal = document.getElementById('detailModal');
    if (modal && modal.classList.contains('active')) { closeDetail(); return; }
});

// Modal activo de mayor prioridad para atrapar el foco (Tab) y el Escape.
function _activeModal() {
    const ev = document.getElementById('eventModal');
    if (ev && ev.classList.contains('active')) return ev;
    const d = document.getElementById('detailModal');
    if (d && d.classList.contains('active')) return d;
    const tut = document.getElementById('tutorialOverlay');
    if (tut && tut.style.display !== 'none') return tut;
    return null;
}

function _focusables(container) {
    return Array.from(container.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter(el => el.offsetParent !== null); // descarta lo oculto (p.ej. el 2º botón cerrar)
}

// Global keydown — Escape cierra; Tab queda atrapado dentro del modal activo (focus-trap real).
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        const evModal = document.getElementById('eventModal');
        if (evModal && evModal.classList.contains('active')) { dismissEvent(); return; }
        const modal = document.getElementById('detailModal');
        if (modal && modal.classList.contains('active')) { dismissDetail(); return; }
        const tut = document.getElementById('tutorialOverlay');
        if (tut && tut.style.display !== 'none' && typeof closeTutorial === 'function') { closeTutorial(); return; }
        if (document.querySelector('.floating-expand-panel.active')) { closeFloatPanels(); return; }
        _closeToolbarMore();
        return;
    }
    if (e.key === 'Tab') {
        const modal = _activeModal();
        if (!modal) return;
        const f = _focusables(modal);
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (!modal.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
        else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
});

function initMiniMap(lng, lat, name) {
    destroyMiniMap();
    const container = document.getElementById('miniMapContainer');
    if (!container) return;

    miniMap = new maplibregl.Map({
        container: 'miniMapContainer',
        style: defaultStyle,
        center: [lng, lat],
        zoom: 14,
        interactive: false,
        attributionControl: false
    });
    // Traga errores propios del mini-mapa (p.ej. AbortError si se cierra la ficha mientras
    // el estilo aún carga). MapLibre enruta los errores a este listener en vez de a consola.
    miniMap.on('error', () => {});

    miniMap.on('load', () => {
        const el = document.createElement('div');
        el.style.cssText = 'width:32px;height:32px;';
        el.innerHTML = `<div style="width:32px;height:32px;display:flex;align-items:center;justify-content:center;background:#1A4D2E;border-radius:50%;color:white;font-size:14px;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.2)">📍</div>`;
        new maplibregl.Marker({ element: el }).setLngLat([lng, lat]).addTo(miniMap);
    });
}

function destroyMiniMap() {
    if (miniMap) {
        // remove() puede lanzar AbortError si el estilo aún se está cargando
        // (cierre rápido de la ficha). Lo tragamos: el mini-mapa se descarta igual.
        try { miniMap.remove(); } catch (e) { /* estilo en vuelo: ignorar */ }
        miniMap = null;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. ELEVATION PROFILE
// ─────────────────────────────────────────────────────────────────────────────
function clearProfileMarker() {
    if (_profileMarker) { try { _profileMarker.remove(); } catch (e) {} _profileMarker = null; }
}

// Perfil de altimetría SVG interactivo (técnica Atlas Map Kit): eje X por distancia real
// (geo.js), ejes adaptativos, y hover/touch que mueve un marcador sobre la ruta en el mapa.
function drawElevationProfile(coords, color) {
    clearProfileMarker();
    const wrap = document.getElementById('elevationChart');
    if (!wrap || !window.Geo) return;

    const idx = Geo.buildRouteIndex(coords);
    const pts = idx.points;
    if (pts.length < 2 || !idx.totalKm) { wrap.innerHTML = ''; return; }

    const eles = pts.map(p => p.ele);
    const rawMin = Math.min(...eles), rawMax = Math.max(...eles);
    const minE = Math.max(0, Math.floor((rawMin - 8) / 10) * 10);
    const maxE = Math.max(minE + 10, Math.ceil((rawMax + 8) / 10) * 10);

    const W = Math.max(260, wrap.clientWidth || 340), H = 132;
    const PAD = { l: 38, r: 12, t: 14, b: 22 };
    const plotW = W - PAD.l - PAD.r, plotH = H - PAD.t - PAD.b;
    const xAt = km => +(PAD.l + (km / idx.totalKm) * plotW).toFixed(2);
    const yAt = e => +(PAD.t + plotH - ((e - minE) / (maxE - minE)) * plotH).toFixed(2);

    let line = '';
    for (let i = 0; i < pts.length; i++) line += (i === 0 ? 'M' : 'L') + xAt(idx.cumKm[i]) + ',' + yAt(pts[i].ele);
    const area = line + 'L' + xAt(idx.totalKm) + ',' + (H - PAD.b) + 'L' + xAt(0) + ',' + (H - PAD.b) + 'Z';

    const stepKm = idx.totalKm > 60 ? 10 : idx.totalKm > 25 ? 5 : idx.totalKm > 10 ? 2 : 1;
    let grid = '';
    for (let k = 0; k <= idx.totalKm + 0.001; k += stepKm) {
        const px = xAt(k);
        grid += `<line x1="${px}" y1="${PAD.t}" x2="${px}" y2="${H - PAD.b}" stroke="currentColor" stroke-opacity="0.12" stroke-width="1"/>`;
        grid += `<text x="${px}" y="${H - 6}" text-anchor="middle" font-size="9" fill="currentColor" fill-opacity="0.55">${Math.round(k)}</text>`;
    }
    for (let f = 0; f <= 1.001; f += 0.25) {
        const e = minE + (maxE - minE) * f, py = yAt(e);
        grid += `<line x1="${PAD.l}" y1="${py}" x2="${W - PAD.r}" y2="${py}" stroke="currentColor" stroke-opacity="0.09" stroke-width="1"/>`;
        grid += `<text x="${PAD.l - 5}" y="${py + 3}" text-anchor="end" font-size="9" fill="currentColor" fill-opacity="0.55">${Math.round(e)}</text>`;
    }

    wrap.innerHTML =
        `<svg id="elevSvg" aria-hidden="true" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="display:block;max-width:100%;touch-action:none;cursor:crosshair">` +
        `<defs><linearGradient id="elevFill" x1="0" y1="0" x2="0" y2="1">` +
        `<stop offset="0%" stop-color="${color}" stop-opacity="0.32"/>` +
        `<stop offset="100%" stop-color="${color}" stop-opacity="0.02"/></linearGradient></defs>` +
        grid +
        `<path d="${area}" fill="url(#elevFill)"/>` +
        `<path d="${line}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>` +
        `<g id="elevHover"></g></svg>`;

    const svg = document.getElementById('elevSvg');
    const hover = document.getElementById('elevHover');

    const kmFromX = clientX => {
        const r = svg.getBoundingClientRect();
        const px = (clientX - r.left) / r.width * W;
        return Math.max(0, Math.min(idx.totalKm, (px - PAD.l) / plotW * idx.totalKm));
    };
    const onMove = ev => {
        const cx = ev.touches ? ev.touches[0].clientX : ev.clientX;
        if (cx == null) return;
        const km = kmFromX(cx);
        const p = Geo.pointAtKm(idx, km);
        const hx = xAt(km), hy = yAt(p.ele), lblX = Math.min(hx + 6, W - 78);
        hover.innerHTML =
            `<line x1="${hx}" y1="${PAD.t}" x2="${hx}" y2="${H - PAD.b}" stroke="${color}" stroke-width="1" stroke-dasharray="3 3"/>` +
            `<circle cx="${hx}" cy="${hy}" r="4.5" fill="#fff" stroke="${color}" stroke-width="2.5"/>` +
            `<text x="${lblX}" y="${PAD.t + 9}" font-size="11" font-weight="700" fill="currentColor">${km.toFixed(1)} km · ${Math.round(p.ele)} m</text>`;
        if (typeof map !== 'undefined' && map) {
            if (!_profileMarker) {
                const el = document.createElement('div');
                el.style.cssText = `width:16px;height:16px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 0 0 2px ${color},0 2px 6px rgba(0,0,0,.4)`;
                _profileMarker = new maplibregl.Marker({ element: el }).setLngLat([p.lng, p.lat]).addTo(map);
            } else {
                _profileMarker.setLngLat([p.lng, p.lat]);
            }
        }
    };
    const onLeave = () => { hover.innerHTML = ''; clearProfileMarker(); };
    svg.addEventListener('pointermove', onMove);
    svg.addEventListener('pointerleave', onLeave);
    svg.addEventListener('pointerup', onLeave);
    svg.addEventListener('pointercancel', onLeave);
    svg.addEventListener('touchmove', onMove, { passive: true });

    let gain = 0;
    for (let i = 1; i < pts.length; i++) { const d = pts[i].ele - pts[i - 1].ele; if (d > 0) gain += d; }
    const statsEl = document.getElementById('elevationStats');
    if (statsEl) {
        statsEl.innerHTML =
            `<span class="elev-stat"><span style="color:${color}">↑</span> +${Math.round(gain)} m</span>` +
            `<span class="elev-stat"><span style="color:#0E6C86">▲</span> ${Math.round(rawMax)} m</span>` +
            `<span class="elev-stat"><span style="color:#64748B">▼</span> ${Math.round(rawMin)} m</span>` +
            `<span class="elev-stat"><span style="color:#94a3b8">↔</span> ${idx.totalKm.toFixed(1)} km</span>`;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. SEARCH
// ─────────────────────────────────────────────────────────────────────────────
function setupSearch() {
    const desktopInput = document.getElementById('searchDesktop');
    const mobileInput = document.getElementById('searchMobile');

    if (desktopInput) {
        desktopInput.addEventListener('input', (e) => {
            searchTerm = e.target.value;
            if (mobileInput) mobileInput.value = searchTerm;
            renderList(activeTab);
            // El mapa NO se filtra por búsqueda: solo se filtra la lista.
        });
    }

    if (mobileInput) {
        mobileInput.addEventListener('input', (e) => {
            searchTerm = e.target.value;
            if (desktopInput) desktopInput.value = searchTerm;
            renderList(activeTab);
            // El mapa NO se filtra por búsqueda: solo se filtra la lista.
        });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. BOTTOM SHEET (mobile)
// ─────────────────────────────────────────────────────────────────────────────
function setupBottomSheet() {
    const sheet = document.getElementById('bottomSheet');
    const handle = document.getElementById('sheetHandle');
    if (!sheet || !handle) return;

    // Initial position
    setSheetSnap(SNAP.COLLAPSED);

    let startY = 0;
    let startTop = 0;
    let isDragging = false;

    handle.addEventListener('touchstart', (e) => {
        isDragging = true;
        startY = e.touches[0].clientY;
        startTop = parseInt(sheet.style.top) || (window.innerHeight - SNAP.COLLAPSED);
        sheet.style.transition = 'none';
        handle.style.cursor = 'grabbing';
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        const dy = e.touches[0].clientY - startY;
        let newTop = startTop + dy;
        newTop = Math.max(window.innerHeight - SNAP.FULL, Math.min(window.innerHeight - SNAP.COLLAPSED, newTop));
        sheet.style.top = newTop + 'px';
    }, { passive: true });

    document.addEventListener('touchend', () => {
        if (!isDragging) return;
        isDragging = false;
        handle.style.cursor = 'grab';
        const currentTop = parseInt(sheet.style.top) || (window.innerHeight - SNAP.COLLAPSED);
        const currentHeight = window.innerHeight - currentTop;

        // Snap to nearest point
        const snaps = [SNAP.COLLAPSED, SNAP.HALF, SNAP.FULL];
        let nearest = snaps.reduce((prev, curr) =>
            Math.abs(curr - currentHeight) < Math.abs(prev - currentHeight) ? curr : prev
        );
        setSheetSnap(nearest);
    });
}

function setSheetSnap(snapHeight) {
    const sheet = document.getElementById('bottomSheet');
    if (!sheet) return;
    currentSnap = snapHeight;
    sheet.style.transition = 'top 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    sheet.style.top = (window.innerHeight - snapHeight) + 'px';
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. WEATHER
// ─────────────────────────────────────────────────────────────────────────────
async function fetchWeather() {
    try {
        const url = 'https://api.open-meteo.com/v1/forecast?latitude=43.4735&longitude=-3.5938'
            + '&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m,uv_index'
            + '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max'
            + '&timezone=Europe%2FMadrid&forecast_days=7';
        const data = await cachedFetch('bareyo_weather_cache', url, 30);
        weatherData = data.current;
        weatherForecast = data.daily;

        const temp = Math.round(data.current.temperature_2m);
        const code = data.current.weather_code;
        const wmo = WMO_CODES[code] || { desc: 'Variable', icon: '🌡️' };

        const iconEl = document.getElementById('weatherFloatIcon');
        const labelEl = document.getElementById('weatherFloatLabel');
        if (iconEl) iconEl.textContent = wmo.icon;
        if (labelEl) labelEl.textContent = `${temp}°C`;
    } catch (e) {
        console.warn('Weather fetch failed:', e);
    }
}

// ─── BANDERAS DE PLAYA ───────────────────────────────────────────────────────
// Dos fuentes en cascada (sistema replicado de Descubre Cantabria, 2026-07-22):
//   1) BASE automática: /api/banderas (función Vercel + cron cada 10 min) →
//      bandera OFICIAL de Cruz Roja para Cuberris (id 1014) y estimación por
//      oleaje (Open-Meteo Marine) para Antuerta o fuera de temporada.
//   2) OVERRIDE manual del operador (dashboard → Supabase beach_flags o
//      localStorage en demo): GANA sobre la automática salvo que sea 'sin-dato'.
let beachFlags = {};
const FLAG_META = {
    'verde':    { key: 'flagGreen',  color: '#16a34a' },
    'amarilla': { key: 'flagYellow', color: '#f59e0b' },
    'roja':     { key: 'flagRed',    color: '#dc2626' },
    'sin-dato': { key: 'flagNone',   color: '#94a3b8' }
};

async function loadBeachFlags() {
    // 1) Feed automático. En local (http.server) no existe /api → catch y seguimos.
    const auto = {};
    try {
        const data = await cachedFetch('bareyo_banderas_auto', 'api/banderas', 10);
        if (data && data.playas) {
            Object.keys(data.playas).forEach(id => {
                const p = data.playas[id];
                if (p && p.flag && p.flag !== 'sin-dato') {
                    auto[id] = { flag: p.flag, updated: data.updatedAt, origen: p.origen, waveHeight: p.waveHeight };
                }
            });
        }
    } catch (e) { /* sin función o sin red: solo manual */ }

    // 2) Override manual del operador.
    const manual = {};
    const CFG = window.BAREYO_CONFIG || {};
    let manualRows = null;
    if (CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY) {
        try {
            const res = await fetch(`${CFG.SUPABASE_URL}/rest/v1/beach_flags?select=entity_id,flag,updated_at`, {
                headers: { apikey: CFG.SUPABASE_ANON_KEY, Authorization: 'Bearer ' + CFG.SUPABASE_ANON_KEY }
            });
            if (res.ok) {
                const rows = await res.json();
                manualRows = {};
                rows.forEach(r => { manualRows[r.entity_id] = { flag: r.flag, updated: r.updated_at }; });
            }
        } catch (e) { /* cae a localStorage */ }
    }
    if (!manualRows) {
        try { manualRows = JSON.parse(localStorage.getItem('bareyo_beach_flags') || '{}'); } catch (e) { manualRows = {}; }
    }
    Object.keys(manualRows).forEach(id => {
        const r = manualRows[id];
        // 'sin-dato' manual = "sin override": no debe tapar una bandera automática viva.
        if (r && r.flag && r.flag !== 'sin-dato') manual[id] = { flag: r.flag, updated: r.updated, origen: 'manual' };
    });

    beachFlags = Object.assign({}, auto, manual);
}

function getBeachFlag(id) {
    const f = beachFlags[id] && beachFlags[id].flag;
    return FLAG_META[f] ? f : 'sin-dato';
}
function flagColor(flag) { return (FLAG_META[flag] || FLAG_META['sin-dato']).color; }
function flagLabel(flag) { return t((FLAG_META[flag] || FLAG_META['sin-dato']).key); }
function flagDot(flag) { return `<span class="flag-dot" style="background:${flagColor(flag)}"></span>`; }

const PLAYAS_CANTABRIA_URL = 'https://www.playascantabria.es/';

// ─── AGENDA / EVENTOS ────────────────────────────────────────────────────────
// events.json lo genera GitHub Actions desde aytobareyo.org (WP REST). Ver scripts/fetch-events.mjs.
let eventsData = null;

async function fetchEvents() {
    try {
        const data = await cachedFetch('bareyo_events_cache', 'events.json', 60);
        if (data && Array.isArray(data.events)) {
            eventsData = data;
            const label = document.getElementById('eventsFloatLabel');
            if (label) label.textContent = t('agenda') || 'Agenda';
            renderCajon(); // la rama Agenda ya tiene datos → refrescar contador/lista
        }
    } catch (e) {
        console.warn('Events load failed:', e);
    }
}

function fmtEventDate(iso) {
    if (!iso) return '';
    const d = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso);
    if (isNaN(d)) return iso;
    const loc = currentLang === 'fr' ? 'fr-FR' : currentLang === 'de' ? 'de-DE' : currentLang === 'en' ? 'en-GB' : 'es-ES';
    return d.toLocaleDateString(loc, { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Paneles flotantes (agenda/condiciones/cifras/servicios): apertura EXCLUSIVA
//    (abrir uno cierra los demás — antes se superponían) + botón cerrar inyectado
//    tras cada render (los render machacan innerHTML, por eso se re-inserta aquí).
function closeFloatPanels() {
    document.querySelectorAll('.floating-expand-panel.active').forEach(p => p.classList.remove('active'));
}
function _openFloatPanel(panel) {
    document.querySelectorAll('.floating-expand-panel.active').forEach(p => { if (p !== panel) p.classList.remove('active'); });
    if (!panel.querySelector('.float-panel-close')) {
        panel.insertAdjacentHTML('afterbegin',
            `<button class="float-panel-close" type="button" onclick="closeFloatPanels()" aria-label="${escapeHTML(t('close') || 'Cerrar')}">` +
            `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg></button>`);
    }
    panel.classList.add('active');
}
// Tocar fuera de la columna de overlays cierra el panel abierto
document.addEventListener('click', e => {
    const any = document.querySelector('.floating-expand-panel.active');
    if (!any) return;
    const host = document.getElementById('floatingOverlays');
    if (host && !host.contains(e.target)) closeFloatPanels();
});

function toggleEventsOverlay() {
    const panel = document.getElementById('eventsFloatPanel');
    if (!panel) return;
    if (panel.classList.contains('active')) { panel.classList.remove('active'); return; }
    renderEventsPanel();
    _openFloatPanel(panel);
    if (typeof track === 'function') track('agenda_open');
}

function renderEventsPanel() {
    const panel = document.getElementById('eventsFloatPanel');
    if (!panel) return;
    if (!eventsData || !eventsData.events || !eventsData.events.length) {
        panel.innerHTML = `<div class="events-empty">${t('eventsEmpty') || 'Agenda no disponible ahora mismo.'}</div>`;
        return;
    }
    const items = eventsData.events.slice(0, 12).map(ev => {
        // Thumbnail vía proxy wsrv.nl: aytobareyo.org bloquea hotlink (referrer ajeno → ERR_FAILED).
        // El proxy lo sirve sin referrer y redimensionado; onerror degrada a solo-texto si fallara.
        const img = ev.image ? `<img class="event-thumb" src="https://wsrv.nl/?url=${encodeURIComponent(ev.image)}&w=110&h=110&fit=cover&a=attention&output=webp" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : '';
        const cat = (ev.categories && ev.categories[0]) ? `<span class="event-cat">${escapeHTML(ev.categories[0])}</span>` : '';
        return `<button class="event-item" type="button" onclick="openEventDetail(${ev.id})">
            ${img}
            <div class="event-body">
                <div class="event-meta"><span class="event-date">📅 ${escapeHTML(fmtEventDate(ev.datetime || ev.date))}</span>${cat}</div>
                <div class="event-title">${escapeHTML(ev.title)}</div>
                <div class="event-summary">${escapeHTML(ev.summary || '')}</div>
            </div>
        </button>`;
    }).join('');
    // Destacado del reconocimiento a Güemes (Pueblo del Año). Enlaza al detalle si la noticia sigue en la agenda.
    const AWARD_EVENT_ID = 7451;
    const hasAward = eventsData.events.some(e => e.id === AWARD_EVENT_ID);
    const awardTag = hasAward
        ? `<button class="events-featured" type="button" onclick="openEventDetail(${AWARD_EVENT_ID})">🏆 ${escapeHTML(t('guemesAward'))}</button>`
        : `<div class="events-featured events-featured--static">🏆 ${escapeHTML(t('guemesAward'))}</div>`;
    panel.innerHTML =
        `<div class="events-head">📅 ${t('agendaHeader') || 'Agenda · Ayuntamiento de Bareyo'}</div>` +
        awardTag +
        `<div class="events-list">${items}</div>` +
        `<a class="events-source" href="https://www.aytobareyo.org/noticias/" target="_blank" rel="noopener">aytobareyo.org →</a>`;
}

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
    document.getElementById('eventModalLink').href = /^https?:\/\//.test(ev.link || '') ? ev.link : '#';
    _eventPrevFocus = document.activeElement;
    modal.classList.add('active');
    // Entrada de historial para que el gesto "atrás" cierre la agenda (mismo patrón que la ficha).
    history.pushState({ modal: 1 }, '', window.location.hash || window.location.pathname);
    setTimeout(() => { const c = modal.querySelector('.event-modal-close'); if (c) c.focus(); }, 50);
    if (typeof track === 'function') track('event_detail_open', { meta: { id } });
}
function closeEventDetail() {
    const modal = document.getElementById('eventModal');
    if (!modal) return;
    modal.classList.remove('active');
    if (_eventPrevFocus && _eventPrevFocus.focus) { try { _eventPrevFocus.focus(); } catch (_) {} _eventPrevFocus = null; }
}

// Panel único "Condiciones ahora": tiempo + mar/oleaje + mareas + aire + bandera,
// unificado (antes eran dos paneles/botones separados — weather y marine).
function toggleConditionsOverlay() {
    const panel = document.getElementById('conditionsFloatPanel');
    if (!panel) return;

    if (panel.classList.contains('active')) {
        panel.classList.remove('active');
        return;
    }

    // Sin datos (sin cobertura al abrir): estado vacío en vez de un panel en blanco.
    if (weatherData || marineData) renderConditionsPanel();
    else panel.innerHTML = `<div class="float-empty" role="status">${escapeHTML(t('offlineData') || 'Datos no disponibles sin conexión')}</div>`;
    _openFloatPanel(panel);
}

function renderConditionsPanel() {
    const panel = document.getElementById('conditionsFloatPanel');
    if (!panel) return;

    const code = weatherData ? weatherData.weather_code : null;
    const wmo = code != null ? (WMO_CODES[code] || { desc: 'Variable', icon: '🌡️' }) : { desc: '', icon: '🌡️' };
    const temp = weatherData ? Math.round(weatherData.temperature_2m) : null;
    const wind = weatherData ? Math.round(weatherData.wind_speed_10m) : null;
    const hum = weatherData ? weatherData.relative_humidity_2m : null;
    const uv = weatherData && weatherData.uv_index !== undefined ? weatherData.uv_index.toFixed(1) : '—';

    const waveH = marineData && marineData.wave_height != null ? marineData.wave_height.toFixed(1) : '—';
    const wavePeriod = marineData && marineData.wave_period != null ? marineData.wave_period.toFixed(1) : '—';
    const seaTemp = marineData && marineData.sea_surface_temperature != null ? marineData.sea_surface_temperature.toFixed(1) : '—';
    const dirLabel = marineData ? compassDirection(marineData.wave_direction) : '—';

    const beaches = (typeof costaPoints !== 'undefined' ? costaPoints : []).filter(p => p.beach);
    const flagsHtml = beaches.length ? `
        <div class="marine-flags">
            <div class="marine-flags-title">🏖️ ${t('beachFlag') || 'Bandera de baño'}</div>
            ${beaches.map(b => { const fl = getBeachFlag(b.id); return `<div class="marine-flag-row">${flagDot(fl)}<span class="marine-flag-name">${escapeHTML(localizeEntity(b, 'name'))}</span><span class="marine-flag-val" style="color:${flagColor(fl)}">${flagLabel(fl)}</span></div>`; }).join('')}
            <a class="marine-flags-cam" href="${PLAYAS_CANTABRIA_URL}" target="_blank" rel="noopener">📹 ${t('flagLiveCam') || 'Cámara en vivo'} · playascantabria.es</a>
        </div>` : '';

    panel.innerHTML = `
        <div class="weather-panel-header">
            <span style="font-size:28px">${wmo.icon}</span>
            <div>
                <div style="font-size:22px;font-weight:800;font-family:'Jost', system-ui, sans-serif">${temp != null ? temp + '°C' : '—'}</div>
                <div style="font-size:11px;color:#94a3b8;font-weight:500">${escapeHTML(code != null ? (wmoDesc(code) || wmo.desc) : '')}</div>
            </div>
        </div>
        <div class="weather-panel-rows">
            <div class="weather-row">
                <span>💨 Viento</span>
                <span style="font-weight:600">${wind != null ? wind + ' km/h' : '—'}</span>
            </div>
            <div class="weather-row">
                <span>💧 Humedad</span>
                <span style="font-weight:600">${hum != null ? hum + '%' : '—'}</span>
            </div>
            <div class="weather-row">
                <span>☀️ Indice UV</span>
                <span style="font-weight:600">${uv}</span>
            </div>
        </div>
        ${renderSunSection()}
        ${renderAirSection()}
        <div class="weather-panel-rows" style="margin-top:8px">
            <div class="weather-row">
                <span>🌊 ${t('waveHeight') || 'Oleaje'}</span>
                <span style="font-weight:600">${waveH} m</span>
            </div>
            <div class="weather-row">
                <span>⏱ ${t('wavePeriod') || 'Periodo'}</span>
                <span style="font-weight:600">${wavePeriod} s</span>
            </div>
            <div class="weather-row">
                <span>🌡 ${t('seaTemp') || 'Temperatura del mar'}</span>
                <span style="font-weight:600">${seaTemp} °C</span>
            </div>
            <div class="weather-row">
                <span>🧭 ${t('waveDirection') || 'Dirección oleaje'}</span>
                <span style="font-weight:600">${dirLabel}</span>
            </div>
        </div>
        ${flagsHtml}
        ${renderTidesSection()}
        ${renderWeatherForecastStrip()}
        <div style="font-size:10px;color:#94a3b8;margin-top:8px;text-align:center">Open-Meteo · Open-Meteo Marine · Mareas calculadas (Santander)</div>
    `;
}

function renderSunSection() {
    if (!sunMoonData) return '';
    const sunrise = formatLocalTime(sunMoonData.sunrise);
    const sunset  = formatLocalTime(sunMoonData.sunset);
    const golden  = formatLocalTime(sunMoonData.civil_twilight_end || sunMoonData.sunset);
    return `
        <div class="weather-sun-row">
            <span>🌅 ${sunrise}</span>
            <span class="weather-sun-divider"></span>
            <span>🌇 ${sunset}</span>
        </div>
    `;
}

function renderAirSection() {
    if (!airQualityData) return '';
    const aqi = airQualityData.european_aqi;
    const bucket = aqiBucket(aqi);
    const grass = pollenLevelLabel(airQualityData.grass_pollen);
    const birch = pollenLevelLabel(airQualityData.birch_pollen);
    const olive = pollenLevelLabel(airQualityData.olive_pollen);
    const pollens = [grass && `${t('grass') || 'Gramíneas'}: ${grass.dot} ${grass.label}`,
                     birch && `${t('birch') || 'Abedul'}: ${birch.dot} ${birch.label}`,
                     olive && `${t('olive') || 'Olivo'}: ${olive.dot} ${olive.label}`].filter(Boolean);

    return `
        <div class="weather-air-chip">
            <span>${bucket.emoji} ${t('airQuality') || 'Aire'}: <b style="color:${bucket.color}">${bucket.label}</b>${aqi != null ? ` <span style="color:#94a3b8">(${aqi})</span>` : ''}</span>
            ${pollens.length ? `<span class="weather-pollen">${pollens.join(' · ')}</span>` : ''}
        </div>
    `;
}

function renderWeatherForecastStrip() {
    if (!weatherForecast || !Array.isArray(weatherForecast.time) || weatherForecast.time.length < 2) return '';

    const fmtDay = new Intl.DateTimeFormat(currentLang || 'es', { weekday: 'short' });
    const days = weatherForecast.time.map((iso, i) => {
        const d = new Date(iso + 'T12:00:00');
        const code = weatherForecast.weather_code[i];
        const wmo = WMO_CODES[code] || { icon: '🌡️', desc: '' };
        const tmax = Math.round(weatherForecast.temperature_2m_max[i]);
        const tmin = Math.round(weatherForecast.temperature_2m_min[i]);
        const rain = weatherForecast.precipitation_probability_max
            ? weatherForecast.precipitation_probability_max[i]
            : null;
        const isToday = i === 0;
        const label = isToday
            ? (t('today') || 'Hoy')
            : fmtDay.format(d).replace('.', '');
        return `
            <div class="weather-day${isToday ? ' is-today' : ''}" title="${escapeHTML(wmoDesc(code) || wmo.desc)}">
                <div class="weather-day-label">${escapeHTML(label)}</div>
                <div class="weather-day-icon">${wmo.icon}</div>
                <div class="weather-day-temp">
                    <span class="weather-day-tmax">${tmax}°</span>
                    <span class="weather-day-tmin">${tmin}°</span>
                </div>
                ${rain != null && rain > 0
                    ? `<div class="weather-day-rain">💧 ${rain}%</div>`
                    : `<div class="weather-day-rain">&nbsp;</div>`}
            </div>
        `;
    }).join('');

    return `
        <div class="weather-forecast-title">${t('forecast') || 'Próximos 7 días'}</div>
        <div class="weather-forecast-strip">${days}</div>
    `;
}

// ─── MARINE (Open-Meteo Marine: oleaje, mar) ─────────────────────────────────
async function fetchMarine() {
    try {
        const url = 'https://marine-api.open-meteo.com/v1/marine?latitude=43.4735&longitude=-3.5938'
            + '&current=wave_height,wave_direction,wave_period,sea_surface_temperature'
            + '&hourly=wave_height,wave_period,sea_surface_temperature,wave_direction'
            + '&timezone=Europe%2FMadrid';
        const data = await cachedFetch('bareyo_marine_cache', url, 60);

        if (data.current) {
            marineData = data.current;
        } else if (data.hourly && Array.isArray(data.hourly.time)) {
            const now = Date.now();
            let idx = 0;
            for (let i = 0; i < data.hourly.time.length; i++) {
                if (new Date(data.hourly.time[i]).getTime() > now) break;
                idx = i;
            }
            marineData = {
                wave_height: data.hourly.wave_height && data.hourly.wave_height[idx],
                wave_period: data.hourly.wave_period && data.hourly.wave_period[idx],
                sea_surface_temperature: data.hourly.sea_surface_temperature && data.hourly.sea_surface_temperature[idx],
                wave_direction: data.hourly.wave_direction && data.hourly.wave_direction[idx]
            };
        }

        const labelEl = document.getElementById('marineFloatLabel');
        if (labelEl && marineData && marineData.wave_height != null) {
            labelEl.textContent = marineData.wave_height.toFixed(1) + ' m';
        }
    } catch (e) {
        console.warn('Marine fetch failed:', e);
    }
}

// toggleMarineOverlay()/renderMarinePanel() fusionados en renderConditionsPanel().

// ─── ÍNDICE DE CALIDAD DE VIDA (ICVT, piloto/observa_clotitec) ───────────────
// Dato PRECALCULADO (motor AMPI real, ejecutado fuera de este repo — nunca TS
// aquí) a partir del mock jul-2026 de observa_clotitec. Marcado explícitamente
// como piloto/en calibración: la matriz de tiempos de origen es intramunicipal,
// no un tiempo de desplazamiento real. Ver assets/data/icv-bareyo.json.
let icvData = null;

async function fetchIcvData() {
    try {
        icvData = await cachedFetch('bareyo_icv_cache', 'assets/data/icv-bareyo.json', 24 * 60);
    } catch (e) {
        console.warn('ICV fetch failed:', e);
    }
}

const ICV_AREA_META = {
    aprender:        { emoji: '🎓', key: 'icvAreaAprender' },
    cuidarse:        { emoji: '🩺', key: 'icvAreaCuidarse' },
    aprovisionarse:  { emoji: '🛒', key: 'icvAreaAprovisionarse' },
    descansar:       { emoji: '🌳', key: 'icvAreaDescansar' },
    desplazarse:     { emoji: '🚌', key: 'icvAreaDesplazarse' },
    relacionarse:    { emoji: '🤝', key: 'icvAreaRelacionarse' },
    habitar:         { emoji: '🏠', key: 'icvAreaHabitar' }
};

function toggleIcvOverlay() {
    const panel = document.getElementById('icvFloatPanel');
    if (!panel) return;
    if (panel.classList.contains('active')) {
        panel.classList.remove('active');
        return;
    }
    if (icvData) renderIcvPanel(icvData);
    else panel.innerHTML = `<div class="float-empty" role="status">${escapeHTML(t('offlineData') || 'Datos no disponibles sin conexión')}</div>`;
    _openFloatPanel(panel);
}

function renderIcvPanel(data) {
    const panel = document.getElementById('icvFloatPanel');
    if (!panel) return;

    const global = Math.round(data.icvtGlobal_0a100);
    const rows = (data.areas || []).map(a => {
        const meta = ICV_AREA_META[a.clave] || { emoji: '•', key: null };
        const pct = Math.max(0, Math.min(100, ((a.ampi_70a130 - 70) / 60) * 100));
        const label = meta.key ? (t(meta.key) || a.clave) : a.clave;
        return `
            <div class="icv-area-row">
                <span class="icv-area-label">${meta.emoji} ${escapeHTML(label)}</span>
                <div class="icv-area-bar"><div class="icv-area-bar-fill" style="width:${pct.toFixed(0)}%"></div></div>
            </div>`;
    }).join('');

    panel.innerHTML = `
        <div class="weather-panel-header">
            <span style="font-size:28px">🏘️</span>
            <div>
                <div style="font-size:22px;font-weight:800;font-family:'Jost', system-ui, sans-serif">${global}/100</div>
                <div style="font-size:11px;color:#94a3b8;font-weight:500">${escapeHTML(t('icvLabel') || 'Bareyo en cifras')}</div>
            </div>
        </div>
        <span class="icv-pilot-badge" title="${escapeHTML(t('icvDisclaimer') || '')}">🧪 ${escapeHTML(t('icvPilotBadge') || 'Dato piloto · en calibración')}</span>
        <div class="icv-areas">${rows}</div>
        <div class="weather-row" style="margin-top:8px">
            <span>👥 ${escapeHTML(t('icvAutosuficiencia') || 'Autosuficiencia de servicios')}</span>
            <span style="font-weight:600">${data.autosuficienciaPct}%</span>
        </div>
        <div class="icv-disclaimer" role="note">${escapeHTML(t('icvDisclaimer') || '')}</div>
        <div style="font-size:10px;color:#94a3b8;margin-top:8px;text-align:center">observa_clotitec · ${escapeHTML(data.fechaDatos || '')}</div>
    `;
}

// ─── SERVICIOS: LUZ (PVPC) + GASOLINERAS + FESTIVOS + CARGA EV ───────────────
// Verticales nuevas estilo "Somos Torre": APIs publicas sin key, CORS abierto
// verificado (REData/REE, MITECO Geoportal de Carburantes). Carga EV requiere
// clave gratuita de OpenChargeMap (window.BAREYO_CONFIG.OPENCHARGEMAP_KEY,
// vacia por defecto → "proximamente", mismo patron que SUPABASE_URL vacia).
let luzData = null, gasolinerasData = null, festivosData = null, cargaData = null;

function madridHour(date) {
    return Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Madrid', hour: '2-digit', hour12: false }).format(date || new Date())) % 24;
}

async function fetchLuzData() {
    try {
        const today = new Date().toISOString().slice(0, 10);
        const url = 'https://apidatos.ree.es/es/datos/mercados/precios-mercados-tiempo-real'
            + `?start_date=${today}T00:00&end_date=${today}T23:59&time_trunc=hour`;
        const data = await cachedFetch('bareyo_luz_cache', url, 60);
        const pvpc = (data.included || []).find(x => /pvpc/i.test(x.type) || x.id === '1001');
        const values = (pvpc?.attributes?.values || []).map(v => ({ hour: madridHour(new Date(v.datetime)), price: v.value / 1000 }));
        if (!values.length) throw new Error('PVPC sin datos');
        const nowHour = madridHour();
        luzData = {
            current: values.find(v => v.hour === nowHour) || values[0],
            cheapest: values.reduce((m, v) => v.price < m.price ? v : m, values[0]),
            expensive: values.reduce((m, v) => v.price > m.price ? v : m, values[0]),
            average: values.reduce((s, v) => s + v.price, 0) / values.length
        };
    } catch (e) {
        console.warn('Luz fetch failed:', e);
    }
}

async function fetchGasolinerasData() {
    try {
        const url = 'https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/FiltroProvincia/39';
        const data = await cachedFetch('bareyo_gasolineras_cache', url, 6 * 60);
        const parseEs = s => { const n = parseFloat(String(s || '').replace(',', '.')); return isNaN(n) ? null : n; };
        const stations = (data.ListaEESSPrecio || []).map(e => {
            const lat = parseEs(e['Latitud']), lon = parseEs(e['Longitud (WGS84)']);
            return {
                rotulo: e['Rótulo'] || '',
                municipio: e['Municipio'] || '',
                distKm: (lat != null && lon != null) ? haversineDistance(CONFIG.center[1], CONFIG.center[0], lat, lon) / 1000 : Infinity,
                g95: parseEs(e['Precio Gasolina 95 E5']),
                dieselA: parseEs(e['Precio Gasoleo A'])
            };
        }).filter(s => s.distKm <= 15).sort((a, b) => a.distKm - b.distKm);
        gasolinerasData = { fecha: data.Fecha || '', stations };
    } catch (e) {
        console.warn('Gasolineras fetch failed:', e);
    }
}

async function fetchFestivosData() {
    try {
        festivosData = await cachedFetch('bareyo_festivos_cache', 'assets/data/festivos-2026.json', 24 * 60);
    } catch (e) {
        console.warn('Festivos fetch failed:', e);
    }
}

async function fetchCargaData() {
    const cfg = window.BAREYO_CONFIG || {};
    if (!cfg.OPENCHARGEMAP_KEY) return;
    try {
        const url = `https://api.openchargemap.io/v3/poi/?output=json&latitude=${CONFIG.center[1]}&longitude=${CONFIG.center[0]}`
            + `&distance=15&distanceunit=KM&maxresults=20&compact=true&verbose=false&key=${cfg.OPENCHARGEMAP_KEY}`;
        const data = await cachedFetch('bareyo_carga_cache', url, 6 * 60);
        cargaData = (data || []).map(p => ({
            nombre: p.AddressInfo?.Title || 'Punto de recarga',
            distKm: haversineDistance(CONFIG.center[1], CONFIG.center[0], p.AddressInfo?.Latitude, p.AddressInfo?.Longitude) / 1000,
            operador: p.OperatorInfo?.Title || '—'
        })).sort((a, b) => a.distKm - b.distKm);
    } catch (e) {
        console.warn('Carga EV fetch failed:', e);
    }
}

function proximoFestivo() {
    if (!festivosData || !festivosData.festivos) return null;
    const today = new Date().toISOString().slice(0, 10);
    return festivosData.festivos.find(f => f.fecha >= today) || null;
}

function toggleServiciosOverlay() {
    const panel = document.getElementById('serviciosFloatPanel');
    if (!panel) return;
    if (panel.classList.contains('active')) {
        panel.classList.remove('active');
        return;
    }
    renderServiciosPanel();
    _openFloatPanel(panel);
}

function renderServiciosPanel() {
    const panel = document.getElementById('serviciosFloatPanel');
    if (!panel) return;
    const empty = `<div class="float-empty" role="status">${escapeHTML(t('offlineData') || 'Datos no disponibles sin conexion')}</div>`;

    let luzHTML = empty;
    if (luzData) {
        const lvl = luzData.current.price <= luzData.average * 0.9 ? '🟢' : luzData.current.price >= luzData.average * 1.1 ? '🔴' : '🟡';
        luzHTML = `
            <div class="weather-row"><span>${lvl} ${escapeHTML(t('luzAhora') || 'Ahora')}</span><span style="font-weight:700">${(luzData.current.price * 1000).toFixed(0)} €/MWh</span></div>
            <div class="weather-row"><span>🔽 ${escapeHTML(t('luzMasBarata') || 'Hora mas barata')}</span><span>${luzData.cheapest.hour}h · ${(luzData.cheapest.price * 1000).toFixed(0)} €/MWh</span></div>
            <div class="weather-row"><span>🔼 ${escapeHTML(t('luzMasCara') || 'Hora mas cara')}</span><span>${luzData.expensive.hour}h · ${(luzData.expensive.price * 1000).toFixed(0)} €/MWh</span></div>`;
    }

    let gasHTML = empty;
    if (gasolinerasData && gasolinerasData.stations.length) {
        const s = gasolinerasData.stations[0];
        gasHTML = `
            <div class="weather-row"><span>⛽ ${escapeHTML(s.rotulo)}</span><span style="font-weight:700">${s.g95 != null ? s.g95.toFixed(3) + ' €/L' : '—'}</span></div>
            <div style="font-size:11px;color:#94a3b8">${escapeHTML(s.municipio)} · ${s.distKm.toFixed(1)} km · Diesel ${s.dieselA != null ? s.dieselA.toFixed(3) + ' €/L' : '—'}</div>`;
    }

    const nextFest = proximoFestivo();
    const festHTML = nextFest
        ? `<div class="weather-row"><span>📅 ${escapeHTML(nextFest.nombre)}</span><span style="font-weight:700">${escapeHTML(nextFest.fecha)}</span></div>`
        : empty;

    const cfg = window.BAREYO_CONFIG || {};
    let evHTML;
    if (!cfg.OPENCHARGEMAP_KEY) {
        evHTML = `<div class="float-empty" role="status">🔌 ${escapeHTML(t('evProximamente') || 'Puntos de carga electrica: proximamente')}</div>`;
    } else if (cargaData && cargaData.length) {
        const p = cargaData[0];
        evHTML = `<div class="weather-row"><span>🔌 ${escapeHTML(p.nombre)}</span><span>${p.distKm.toFixed(1)} km</span></div>`;
    } else {
        evHTML = empty;
    }

    panel.innerHTML = `
        <div class="weather-panel-header">
            <span style="font-size:28px">🔌</span>
            <div style="font-size:15px;font-weight:700">${escapeHTML(t('serviciosLabel') || 'Servicios')}</div>
        </div>
        <div class="services-section"><div class="services-section-title">${escapeHTML(t('luzLabel') || 'Precio de la luz')}</div>${luzHTML}</div>
        <div class="services-section"><div class="services-section-title">${escapeHTML(t('gasolinerasLabel') || 'Gasolinera mas cercana')}</div>${gasHTML}</div>
        <div class="services-section"><div class="services-section-title">${escapeHTML(t('festivosLabel') || 'Proximo festivo')}</div>${festHTML}</div>
        <div class="services-section">${evHTML}</div>
    `;
}

// ─── THEME TOGGLE (retirado) ─────────────────────────────────────────────────
// El modo oscuro se eliminó por decisión del cliente: la app queda siempre en
// claro (CARTO Positron). Se conserva como no-op seguro por si algún handler o
// deep-link antiguo lo invoca.
function toggleTheme() { /* no-op: modo oscuro retirado */ }

function compassDirection(deg) {
    if (deg == null || isNaN(deg)) return '—';
    const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
    return dirs[Math.round(deg / 22.5) % 16] + ' (' + Math.round(deg) + '°)';
}

// ─── TIDES (cálculo M2+S2 simplificado para Cantábrico) ──────────────────────
// Aproximación astronómica con dos constituents principales (M2 lunar
// semidiurno + S2 solar semidiurno). Suficiente para uso turístico — NO
// para navegación. Precisión ±20-30 min y ±0.4 m vs tablas oficiales.
// Constantes calibradas para el puerto de Santander (cerca de Bareyo).
const TIDE_CFG = {
    // Pleamar de referencia (epoch) — Santander 2026-01-01 04:18 UTC, h ≈ 4.2 m
    epoch:   Date.UTC(2026, 0, 1, 4, 18) / 1000, // segundos UNIX
    z0:      2.40,    // nivel medio sobre cero del puerto (m)
    M2_amp:  1.55,    // amplitud M2 (m)
    M2_per:  12.4206, // periodo M2 (h)
    S2_amp:  0.55,    // amplitud S2 (m)
    S2_per:  12.0000, // periodo S2 (h)
    S2_lag:  -0.5     // desfase S2 vs M2 en horas (calibrado)
};

function tideHeight(tsSec) {
    const tH = (tsSec - TIDE_CFG.epoch) / 3600; // horas desde epoch
    const m2 = TIDE_CFG.M2_amp * Math.cos(2 * Math.PI * tH / TIDE_CFG.M2_per);
    const s2 = TIDE_CFG.S2_amp * Math.cos(2 * Math.PI * (tH + TIDE_CFG.S2_lag) / TIDE_CFG.S2_per);
    return TIDE_CFG.z0 + m2 + s2;
}

// Devuelve las próximas 4 transiciones (pleamar/bajamar) a partir de `nowSec`.
function nextTideEvents(nowSec, count = 4) {
    const STEP = 60; // segundos
    const HORIZON = 36 * 3600; // 36 h
    const events = [];
    let prevH = tideHeight(nowSec - STEP);
    let curH  = tideHeight(nowSec);
    for (let dt = 0; dt < HORIZON && events.length < count; dt += STEP) {
        const ts = nowSec + dt + STEP;
        const nextH = tideHeight(ts);
        // Cambio de signo en derivada → extremo local
        if ((curH - prevH) * (nextH - curH) < 0) {
            const isHigh = curH > nextH; // si baja después → es máximo
            events.push({ ts: nowSec + dt, height: curH, type: isHigh ? 'high' : 'low' });
        }
        prevH = curH; curH = nextH;
    }
    return events;
}

function formatTideTime(tsSec) {
    const d = new Date(tsSec * 1000);
    return d.toLocaleTimeString(currentLang || 'es', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' });
}

function renderTidesSection() {
    const now = Math.floor(Date.now() / 1000);
    const events = nextTideEvents(now, 4);
    if (!events.length) return '';

    const curH = tideHeight(now).toFixed(1);
    const labelHigh = t('highTide') || 'Pleamar';
    const labelLow  = t('lowTide')  || 'Bajamar';
    const labelNow  = t('tideNow')  || 'Ahora';

    return `
        <div class="tides-block">
            <div class="tides-now">
                <span style="font-size:18px">📏</span>
                <span><b>${labelNow}:</b> ${curH} m</span>
            </div>
            <div class="tides-list">
                ${events.map(e => `
                    <div class="tide-event tide-${e.type}">
                        <span class="tide-icon">${e.type === 'high' ? '🔺' : '🔻'}</span>
                        <span class="tide-label">${e.type === 'high' ? labelHigh : labelLow}</span>
                        <span class="tide-time">${formatTideTime(e.ts)}</span>
                        <span class="tide-h">${e.height.toFixed(1)} m</span>
                    </div>
                `).join('')}
            </div>
            <div class="tides-disclaimer">${t('tidesDisclaimer') || 'Calculado (M2+S2) · No usar para nautica'}</div>
        </div>
    `;
}

// ─── SUN / MOON (Sunrise-Sunset.org) ─────────────────────────────────────────
async function fetchSunMoon() {
    try {
        const today = new Date().toISOString().slice(0, 10);
        const url = `https://api.sunrise-sunset.org/json?lat=43.4735&lng=-3.5938&formatted=0&date=${today}`;
        const data = await cachedFetch('bareyo_sunmoon_cache', url, 12 * 60);
        if (data.status === 'OK') sunMoonData = data.results;
    } catch (e) {
        console.warn('SunMoon fetch failed:', e);
    }
}

function formatLocalTime(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleTimeString(currentLang || 'es', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' });
}

// ─── AIR QUALITY (Open-Meteo Air Quality) ────────────────────────────────────
async function fetchAirQuality() {
    try {
        const url = 'https://air-quality-api.open-meteo.com/v1/air-quality?latitude=43.4735&longitude=-3.5938'
            + '&current=european_aqi,pm2_5,pm10,grass_pollen,birch_pollen,olive_pollen'
            + '&timezone=Europe%2FMadrid';
        const data = await cachedFetch('bareyo_air_cache', url, 60);
        airQualityData = data.current || null;
    } catch (e) {
        console.warn('Air quality fetch failed:', e);
    }
}

function aqiBucket(aqi) {
    if (aqi == null) return { label: '—', color: '#94a3b8', emoji: '⚪' };
    if (aqi <= 20)  return { label: t('aqiVeryGood') || 'Excelente', color: '#10b981', emoji: '🟢' };
    if (aqi <= 40)  return { label: t('aqiGood')     || 'Bueno',     color: '#22c55e', emoji: '🟢' };
    if (aqi <= 60)  return { label: t('aqiFair')     || 'Aceptable', color: '#eab308', emoji: '🟡' };
    if (aqi <= 80)  return { label: t('aqiPoor')     || 'Regular',   color: '#f97316', emoji: '🟠' };
    if (aqi <= 100) return { label: t('aqiBad')      || 'Malo',      color: '#ef4444', emoji: '🔴' };
    return                  { label: t('aqiVeryBad') || 'Muy malo',  color: '#7c2d12', emoji: '🟣' };
}

function pollenLevelLabel(v) {
    if (v == null) return null;
    if (v < 1)  return { label: t('pollenLow')  || 'Bajo',     dot: '🟢' };
    if (v < 5)  return { label: t('pollenMid')  || 'Moderado', dot: '🟡' };
    if (v < 20) return { label: t('pollenHigh') || 'Alto',     dot: '🟠' };
    return            { label: t('pollenVeryHigh') || 'Muy alto', dot: '🔴' };
}

// ─── WIKIPEDIA SUMMARY ───────────────────────────────────────────────────────
async function fetchWikiSummary(item) {
    if (!item || !item.wikiTitle) return null;
    const title = encodeURIComponent(item.wikiTitle);
    // El wikiTitle es español → siempre es.wikipedia (en/fr/de darían 404). La clave NO lleva
    // idioma: el extracto es el mismo para todos, no tiene sentido cuadruplicar la caché.
    const url = `https://es.wikipedia.org/api/rest_v1/page/summary/${title}`;
    const cacheKey = `bareyo_wiki_${item.wikiTitle}`;
    try {
        return await cachedFetch(cacheKey, url, 7 * 24 * 60);
    } catch (e) {
        console.warn('Wiki fetch failed for', item.wikiTitle, e);
        return null;
    }
}

function renderWikiSection(item) {
    const section = document.getElementById('detailWikiSection');
    const body = document.getElementById('detailWiki');
    if (!section || !body) return;

    if (!item || !item.wikiTitle) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';
    body.innerHTML = `<div class="wiki-loading">⏳ ${t('wikiLoading') || 'Cargando enciclopedia…'}</div>`;

    fetchWikiSummary(item).then(data => {
        if (!selectedItem || selectedItem.item !== item) return;
        if (!data || !data.extract) {
            body.innerHTML = `<div class="wiki-empty">${t('wikiEmpty') || 'Sin extracto disponible en Wikipedia.'}</div>`;
            return;
        }
        const lang = ['es', 'en', 'fr', 'de'].includes(currentLang) ? currentLang : 'es';
        const link = `https://es.wikipedia.org/wiki/${encodeURIComponent(item.wikiTitle)}`;
        body.innerHTML = `
            <div class="wiki-extract">${escapeHTML(data.extract)}</div>
            <a class="wiki-link" href="${link}" target="_blank" rel="noopener noreferrer">
                ${t('readMoreWiki') || 'Leer mas en Wikipedia'} →
            </a>
        `;
    });
}

// ─── AUDIO GUIDE (Web Speech API, gratuito) ──────────────────────────────────
function speakDetailContent() {
    if (!('speechSynthesis' in window)) {
        showToast(t('audioUnsupported') || 'El navegador no soporta sintesis de voz');
        return;
    }
    if (_ttsSpeaking) {
        window.speechSynthesis.cancel();
        _ttsSpeaking = false;
        showToast(t('audioStopped') || 'Audio detenido');
        return;
    }
    if (!selectedItem) return;

    const item = selectedItem.item;
    // Guion de audio-guia propio (POI_I18N[id][lang].narracion) si existe: se usa como
    // texto TTS y se OMITE el extracto de Wikipedia. Si no, comportamiento anterior.
    const narr = localizeEntity(item, 'narracion');
    let text = narr
        ? (localizeEntity(item, 'name') || '') + '. ' + narr
        : (localizeEntity(item, 'name') || '') + '. ' + (localizeEntity(item, 'desc') || '');

    // Extracto de Wikipedia SOLO en español (es es.wikipedia): leerlo con voz fr/en/de sonaría
    // ininteligible. Y solo si no hay narración propia. Clave sin idioma (igual que fetchWikiSummary).
    if (!narr && item.wikiTitle && currentLang === 'es') {
        const cacheKey = `bareyo_wiki_${item.wikiTitle}`;
        try {
            const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
            if (cached && cached.data && cached.data.extract) text += ' ' + cached.data.extract;
        } catch (_) {}
    }

    const langMap = { es: 'es-ES', en: 'en-US', fr: 'fr-FR', de: 'de-DE' };
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = langMap[currentLang] || 'es-ES';
    utt.rate = 1;
    utt.pitch = 1;
    utt.volume = 1; // volumen máximo explícito (requisito kiosko: audio-guías bien audibles)
    utt.onend = () => { _ttsSpeaking = false; };
    utt.onerror = () => { _ttsSpeaking = false; };

    _ttsSpeaking = true;
    window.speechSynthesis.speak(utt);
    showToast(t('audioPlaying') || 'Reproduciendo audio…');

    if (typeof track === 'function') {
        track('audio_play', {
            entity_id: item.id,
            entity_type: selectedItem.type,
            meta: { lang: utt.lang }
        });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. URL DEEP LINKING & SHARING
// ─────────────────────────────────────────────────────────────────────────────

// Mapping between internal type and URL slug-key (and inverse)
const TYPE_TO_SLUGKEY = { hiking: 'ruta', costa: 'patrimonio', biz: 'negocio', '3d': '3d' };
const SLUGKEY_TO_TYPE = { ruta: 'hiking', patrimonio: 'costa', negocio: 'biz', '3d': '3d' };

function applyDeepLink() {
    const hash = window.location.hash.replace('#', '');
    if (!hash) return;

    const params = {};
    hash.split('&').forEach(part => {
        const [k, v] = part.split('=');
        if (k && v) params[k] = decodeURIComponent(v);
    });

    if (params.tab && ['all', 'hiking', 'costa', 'biz', '3d'].includes(params.tab)) {
        activeTab = params.tab;
    } else {
        // If a slug-key is present, switch tab to its type
        for (const sk of Object.keys(SLUGKEY_TO_TYPE)) {
            if (params[sk]) { activeTab = SLUGKEY_TO_TYPE[sk]; break; }
        }
    }
}

// Resolve hash to entity and open it (run after data layer is ready)
function applyItemDeepLink() {
    const hash = window.location.hash.replace('#', '');
    if (!hash) return;

    const params = {};
    hash.split('&').forEach(part => {
        const [k, v] = part.split('=');
        if (k && v) params[k] = decodeURIComponent(v);
    });

    // Tipo-aware slug keys take precedence
    for (const sk of Object.keys(SLUGKEY_TO_TYPE)) {
        if (params[sk]) {
            const type = SLUGKEY_TO_TYPE[sk];
            const items = getItemsByType(type);
            const found = items.find(i => i.id === params[sk] || slugify(i.name) === params[sk]);
            if (found) { openDetail(found, type); return; }
        }
    }

    // Backwards compatible: #item=...
    if (params.item) {
        const id = params.item;
        const types = ['hiking', 'costa', 'biz', '3d'];
        for (const type of types) {
            const items = getItemsByType(type);
            const found = items.find(i => i.id === id || slugify(i.name) === id);
            if (found) { openDetail(found, type); return; }
        }
    }
}

// push=true empuja una entrada de historial (al abrir una ficha) para que el gesto "atrás"
// del móvil la cierre en vez de abandonar la app; el resto de cambios de hash reemplazan.
function updateHash(push) {
    let hash = `tab=${activeTab}`;
    if (selectedItem) {
        const sk = TYPE_TO_SLUGKEY[selectedItem.type];
        if (sk) {
            hash += `&${sk}=${encodeURIComponent(slugify(selectedItem.item.name))}`;
        } else {
            hash += `&item=${encodeURIComponent(selectedItem.item.id)}`;
        }
    }
    if (push) history.pushState({ modal: 1 }, '', `#${hash}`);
    else history.replaceState(null, '', `#${hash}`);
    updateOpenGraph();
}

// ─── OPEN GRAPH ──────────────────────────────────────────────────────────────
function setMeta(property, content, attr = 'property') {
    let el = document.querySelector(`meta[${attr}="${property}"]`);
    if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, property);
        document.head.appendChild(el);
    }
    el.setAttribute('content', content);
}

function updateOpenGraph() {
    const baseTitle = 'Descubre Bareyo';
    const baseDesc = 'Guia interactiva de Bareyo, Cantabria: rutas, patrimonio, negocios y 3D.';
    const url = window.location.href;
    const baseImage = window.location.origin + window.location.pathname.replace(/[^/]*$/, '') + 'assets/logo.png';

    let title = baseTitle;
    let desc = baseDesc;
    let image = baseImage;

    if (selectedItem) {
        const item = selectedItem.item;
        title = `${localizeEntity(item, 'name')} · ${baseTitle}`;
        desc = (localizeEntity(item, 'desc') || baseDesc).slice(0, 200);
        if (selectedItem.type === 'biz' && (item.localImage || item.image)) {
            image = item.localImage || item.image;
        }
    }

    document.title = title;
    setMeta('og:title', title);
    setMeta('og:description', desc);
    setMeta('og:url', url);
    setMeta('og:image', image);
    setMeta('twitter:title', title, 'name');
    setMeta('twitter:description', desc, 'name');
    setMeta('twitter:image', image, 'name');
}

// ─── QR SCAN ENTRY (?qr=ID) ─────────────────────────────────────────────────
function handleQrEntry() {
    const qs = new URLSearchParams(window.location.search);
    const qr = qs.get('qr');
    if (!qr) return;

    // Track the scan (placeholder until S7 ships Supabase track())
    if (typeof track === 'function') {
        track('qr_scan', { qr_id: qr });
    } else {
        try {
            const list = JSON.parse(localStorage.getItem('bareyo_qr_log') || '[]');
            list.push({ ts: new Date().toISOString(), qr_id: qr });
            if (list.length > 100) list.splice(0, list.length - 100);
            localStorage.setItem('bareyo_qr_log', JSON.stringify(list));
        } catch (_) {}
    }

    // Resolver el id/slug del QR a una entidad: componer el hash destino y fijar la pestaña
    // ANTES de renderizar la lista (si no, la pestaña activa quedaría en "all").
    let hash = '';
    const types = ['hiking', 'costa', 'biz', '3d'];
    for (const type of types) {
        const items = getItemsByType(type);
        const found = items.find(i => i.id === qr || slugify(i.name) === qr);
        if (found) {
            const sk = TYPE_TO_SLUGKEY[type];
            activeTab = type;
            hash = `tab=${type}&${sk}=${encodeURIComponent(slugify(found.name))}`;
            break;
        }
    }

    // Quitar SOLO el parámetro qr y preservar el resto (utm/src futuros). Una única entrada de
    // historial con replaceState: pulsar "atrás" no vuelve a ?qr= (evita recontar el escaneo).
    qs.delete('qr');
    const rest = qs.toString();
    const url = window.location.pathname
        + (rest ? '?' + rest : '')
        + (hash ? '#' + hash : window.location.hash);
    history.replaceState(null, '', url);
}

// ─── ROUTE TRACKING (Geo en ruta) ───────────────────────────────────────────
let _routeTracking = null;

async function startRouteTracking() {
    if (!selectedItem || selectedItem.type !== 'hiking') return;
    if (!('geolocation' in navigator)) {
        showToast(t('geoUnsupported') || 'Geolocalizacion no soportada');
        return;
    }
    // Guard de re-entrada: sin esto, iniciar una 2ª ruta filtraba el watchPosition y el wake lock
    // de la anterior (GPS+batería vivos, pantalla sin apagarse toda la sesión).
    if (_routeTracking) stopRouteTracking();
    const route = selectedItem.item;

    closeDetail();
    showRouteHud(route);

    _routeTracking = {
        route,
        watchId: null,
        startTime: Date.now(),
        lastPos: null,
        pathTraveled: 0,
        notified: {},
        wakeLock: null
    };

    // Wake Lock (mantener pantalla encendida)
    if ('wakeLock' in navigator) {
        try { _routeTracking.wakeLock = await navigator.wakeLock.request('screen'); } catch (_) {}
    }

    _routeTracking.watchId = navigator.geolocation.watchPosition(
        onRoutePositionUpdate,
        err => {
            console.warn('GPS error', err);
            // Permiso denegado: el HUD quedaría contando "—" con el wake lock retenido y el
            // usuario creyendo que funciona. Avisar y desmontar el tracking.
            if (err && err.code === 1) {
                showToast(t('geoDenied') || 'Permiso de ubicación denegado');
                stopRouteTracking();
            }
        },
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );

    showToast(t('routeStarted') || '🥾 Ruta iniciada');
}

function onRoutePositionUpdate(pos) {
    if (!_routeTracking) return;
    const lat = pos.coords.latitude;
    const lon = pos.coords.longitude;

    // Update path traveled
    if (_routeTracking.lastPos) {
        const d = haversineDistance(_routeTracking.lastPos.lat, _routeTracking.lastPos.lon, lat, lon);
        if (d < 200) _routeTracking.pathTraveled += d;
    }
    _routeTracking.lastPos = { lat, lon, ts: Date.now() };

    // Move user marker
    if (!userMarker) {
        const el = document.createElement('div');
        el.className = 'user-tracking-marker';
        userMarker = new maplibregl.Marker({ element: el }).setLngLat([lon, lat]).addTo(map);
    } else {
        userMarker.setLngLat([lon, lat]);
    }
    map.flyTo({ center: [lon, lat], zoom: Math.max(map.getZoom(), 16), essential: true });

    // Distance to next waypoint
    const route = _routeTracking.route;
    let nearestIdx = 0, nearestD = Infinity;
    for (let i = 0; i < route.coords.length; i++) {
        const d = haversineDistance(lat, lon, route.coords[i][1], route.coords[i][0]);
        if (d < nearestD) { nearestD = d; nearestIdx = i; }
    }
    const nextIdx = Math.min(nearestIdx + 1, route.coords.length - 1);
    const nextC = route.coords[nextIdx];
    const distNext = haversineDistance(lat, lon, nextC[1], nextC[0]);

    updateRouteHud(distNext);

    // Proximity alerts to POIs (50m enter, 100m reset)
    const allPois = [].concat(typeof costaPoints !== 'undefined' ? costaPoints : [],
                              typeof points3D !== 'undefined' ? points3D : []);
    allPois.forEach(p => {
        const d = haversineDistance(lat, lon, p.coords[1], p.coords[0]);
        if (d < 50 && !_routeTracking.notified[p.id]) {
            _routeTracking.notified[p.id] = true;
            showToast(`📍 ${p.name} · ${Math.round(d)} m`);
        } else if (d > 100 && _routeTracking.notified[p.id]) {
            _routeTracking.notified[p.id] = false;
        }
    });
}

function showRouteHud(route) {
    let hud = document.getElementById('routeHud');
    if (!hud) {
        hud = document.createElement('div');
        hud.id = 'routeHud';
        hud.className = 'route-hud';
        document.body.appendChild(hud);
    }
    hud.style.display = 'flex';
    hud.innerHTML = `
        <div class="route-hud-info">
            <div class="route-hud-route">🥾 ${escapeHTML(localizeEntity(route, 'name'))}</div>
            <div class="route-hud-stats">
                <span><b id="hudNext">—</b> ${t('toNextPoint') || 'al siguiente'}</span>
                <span><b id="hudPath">0.00</b> km</span>
                <span><b id="hudTime">0</b> min</span>
            </div>
        </div>
        <button class="route-hud-stop" onclick="stopRouteTracking()">🛑 ${t('finish') || 'Finalizar'}</button>
    `;

    // Tick the time counter
    if (hud._timer) clearInterval(hud._timer);
    hud._timer = setInterval(() => {
        if (!_routeTracking) return;
        const min = Math.floor((Date.now() - _routeTracking.startTime) / 60000);
        const km = (_routeTracking.pathTraveled / 1000).toFixed(2);
        const tEl = document.getElementById('hudTime');
        const pEl = document.getElementById('hudPath');
        if (tEl) tEl.textContent = min;
        if (pEl) pEl.textContent = km;
    }, 1000);
}

function updateRouteHud(distNextMeters) {
    const el = document.getElementById('hudNext');
    if (el) el.textContent = formatDistance(distNextMeters);
}

function stopRouteTracking() {
    if (!_routeTracking) return;
    if (_routeTracking.watchId !== null) navigator.geolocation.clearWatch(_routeTracking.watchId);
    if (_routeTracking.wakeLock) _routeTracking.wakeLock.release().catch(() => {});

    const elapsed = Math.round((Date.now() - _routeTracking.startTime) / 60000);
    const km = (_routeTracking.pathTraveled / 1000).toFixed(2);

    const hud = document.getElementById('routeHud');
    if (hud) {
        if (hud._timer) clearInterval(hud._timer);
        hud.style.display = 'none';
    }

    if (userMarker) { userMarker.remove(); userMarker = null; }
    _routeTracking = null;

    showToast(`🏁 ${km} km · ${elapsed} min`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 11. LANGUAGE
// ─────────────────────────────────────────────────────────────────────────────
// Refleja el idioma activo en <html lang> (lectores de pantalla) y lo persiste para la próxima visita.
function applyLangAttr() {
    document.documentElement.lang = currentLang;
    try { localStorage.setItem('bareyo_lang', currentLang); } catch (_) {}
}

// Banderas SVG inline (sin assets externos) + endónimos. Las usan el botón de la
// toolbar, el menú de idiomas y el selector del kiosco.
const FLAG_SVGS = {
    es: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 60 30'%3E%3Crect width='60' height='10' fill='%23c60b1e'/%3E%3Crect y='10' width='60' height='10' fill='%23ffc400'/%3E%3Crect y='20' width='60' height='10' fill='%23c60b1e'/%3E%3C/svg%3E",
    en: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 60 30'%3E%3CclipPath id='a'%3E%3Crect width='60' height='30'/%3E%3C/clipPath%3E%3Cg clip-path='url(%23a)'%3E%3Cpath d='M0 0v30h60V0z' fill='%23012169'/%3E%3Cpath d='M0 0l60 30m0-30L0 30' stroke='%23fff' stroke-width='6'/%3E%3Cpath d='M0 0l60 30m0-30L0 30' stroke='%23C8102E' stroke-width='4' clip-path='url(%23a)'/%3E%3Cpath d='M30 0v30M0 15h60' stroke='%23fff' stroke-width='10'/%3E%3Cpath d='M30 0v30M0 15h60' stroke='%23C8102E' stroke-width='6'/%3E%3C/g%3E%3C/svg%3E",
    fr: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 60 30'%3E%3Crect width='20' height='30' fill='%23002395'/%3E%3Crect x='20' width='20' height='30' fill='%23fff'/%3E%3Crect x='40' width='20' height='30' fill='%23ED2939'/%3E%3C/svg%3E",
    de: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 60 30'%3E%3Crect width='60' height='10' fill='%23000'/%3E%3Crect y='10' width='60' height='10' fill='%23D00'/%3E%3Crect y='20' width='60' height='10' fill='%23FFCE00'/%3E%3C/svg%3E"
};
const LANG_NAMES = { es: 'Español', en: 'English', fr: 'Français', de: 'Deutsch' };

// ── Menú de idiomas (popover con bandera + endónimo + check, patrón Memrise) ──
function renderLangMenu() {
    const menu = document.getElementById('langMenu');
    if (!menu) return;
    menu.innerHTML = Object.keys(LANG_NAMES).map(l =>
        `<button type="button" class="lang-row${l === currentLang ? ' active' : ''}" role="menuitemradio" aria-checked="${l === currentLang}" onclick="selectLanguage('${l}')">` +
        `<img class="lang-row-flag" src="${FLAG_SVGS[l]}" alt="">` +
        `<span class="lang-row-name">${LANG_NAMES[l]}</span>` +
        `<span class="lang-row-check" aria-hidden="true">✓</span></button>`
    ).join('');
}

function toggleLangMenu() {
    const menu = document.getElementById('langMenu');
    const btn = document.getElementById('btnLang');
    if (!menu) return;
    const open = menu.hidden;
    if (open) renderLangMenu();
    menu.hidden = !open;
    if (btn) btn.setAttribute('aria-expanded', String(open));
}

function closeLangMenu() {
    const menu = document.getElementById('langMenu');
    const btn = document.getElementById('btnLang');
    if (menu && !menu.hidden) {
        menu.hidden = true;
        if (btn) btn.setAttribute('aria-expanded', 'false');
    }
}

function selectLanguage(lang) {
    setLanguage(lang);
    closeLangMenu();
}

// Cerrar el menú al hacer clic fuera o con Escape (el listener de Escape del modal ya existe aparte).
document.addEventListener('click', (e) => {
    const menu = document.getElementById('langMenu');
    if (menu && !menu.hidden && !e.target.closest('#langMenu') && !e.target.closest('#btnLang')) closeLangMenu();
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLangMenu(); });

// Fija un idioma concreto y re-renderiza toda la UI. Lo usan el menú de banderas,
// toggleLanguage (ciclo legado es→en→fr→de) y el selector del kiosco (js/kiosco.js).
function setLanguage(lang) {
    if (!['es', 'en', 'fr', 'de'].includes(lang)) return;
    currentLang = lang;
    applyLangAttr();
    applyTranslations();
    renderTabs();
    renderFilters(activeTab);
    renderList(activeTab);
    if (mapInitialized && map) loadDataLayer(activeTab); // relabel map markers/popups in the new language
    renderCajon(); // re-etiqueta ramas/tarjetas del cajón en el nuevo idioma
    if (selectedItem) openDetail(selectedItem.item, selectedItem.type); // refresh open detail card
    if (typeof window.kioscoOnLangChange === 'function') window.kioscoOnLangChange(lang);
}

function toggleLanguage() {
    const langs = ['es', 'en', 'fr', 'de'];
    const idx = langs.indexOf(currentLang);
    setLanguage(langs[(idx + 1) % langs.length]);
}

function applyTranslations() {
    // Update data-i18n elements
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const val = t(key);
        if (val) el.textContent = val;
    });

    // El botón de idioma muestra la bandera del idioma ACTUAL (antes mostraba la
    // "siguiente" del ciclo, que confundía). El menú re-marca su check si está abierto.
    const flag = document.getElementById('langFlag');
    const label = document.getElementById('langLabel');
    if (flag) { flag.src = FLAG_SVGS[currentLang]; flag.alt = currentLang.toUpperCase(); }
    if (label) label.textContent = currentLang.toUpperCase();
    const langMenu = document.getElementById('langMenu');
    if (langMenu && !langMenu.hidden) renderLangMenu();

    // Update sidebar title and subtitle
    const titleEl = document.getElementById('sidebarTitle');
    const subtitleEl = document.getElementById('sidebarSubtitle');
    if (titleEl) titleEl.textContent = t('title');
    if (subtitleEl) subtitleEl.textContent = t('subtitle');

    // Update search placeholder
    const sd = document.getElementById('searchDesktop');
    const sm = document.getElementById('searchMobile');
    const ph = t('searchPlaceholder');
    if (sd) sd.placeholder = ph;
    if (sm) sm.placeholder = ph;

    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const val = t(el.getAttribute('data-i18n-title'));
        if (val) { el.title = val; el.setAttribute('aria-label', val); }
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const val = t(el.getAttribute('data-i18n-placeholder'));
        if (val) el.placeholder = val;
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// 12. UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

// Unified network cache: localStorage with TTL. On network failure returns
// stale cache if present, otherwise rethrows. Use for any read-only API.
async function cachedFetch(key, url, ttlMin = 30) {
    const ttlMs = ttlMin * 60 * 1000;
    const now = Date.now();
    let cached = null;
    try { cached = JSON.parse(localStorage.getItem(key) || 'null'); } catch (_) {}
    if (cached && (now - cached.ts) < ttlMs) return cached.data;
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        try { localStorage.setItem(key, JSON.stringify({ ts: now, data })); } catch (_) {}
        return data;
    } catch (err) {
        if (cached) {
            console.warn('cachedFetch: using stale cache for', key, err);
            return cached.data;
        }
        throw err;
    }
}

function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
}

function haversineDistance(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(meters) {
    if (meters < 1000) return Math.round(meters) + ' m';
    return (meters / 1000).toFixed(1) + ' km';
}

function navigateToItem() {
    if (!selectedItem) return;
    const item = selectedItem.item;
    const type = selectedItem.type;
    let coords;

    if (type === 'hiking') {
        coords = [item.coords[0][1], item.coords[0][0]]; // [lat, lng]
    } else {
        coords = [item.coords[1], item.coords[0]];
    }

    const url = `https://www.google.com/maps/dir/?api=1&destination=${coords[0]},${coords[1]}`;
    window.open(url, '_blank', 'noopener');
}

function callItem() {
    if (!selectedItem || !selectedItem.item.phone) return;
    if (typeof track === 'function') {
        track('phone_click', {
            entity_id: selectedItem.item.id,
            entity_type: selectedItem.type
        });
    }
    window.location.href = `tel:${selectedItem.item.phone}`;
}

function shareItem() {
    if (!selectedItem) return;
    const item = selectedItem.item;
    const url = window.location.href;
    const text = `${localizeEntity(item, 'name')} — Descubre Bareyo`;

    if (navigator.share) {
        navigator.share({ title: text, url }).catch(() => {});
    } else {
        navigator.clipboard.writeText(`${text}\n${url}`)
            .then(() => showToast(t('linkCopied') || 'Enlace copiado al portapapeles'))
            .catch(() => showToast(t('linkCopyError') || 'No se pudo copiar el enlace'));
    }
}

function downloadGPX(url) {
    if (!url) return;
    if (typeof track === 'function' && selectedItem) {
        track('gpx_download', {
            entity_id: selectedItem.item.id,
            entity_type: selectedItem.type,
            meta: { url }
        });
    }
    const a = document.createElement('a');
    a.href = url;
    a.download = url.split('/').pop() || 'ruta.gpx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast(t('downloadingGpx') || 'Descargando archivo GPX...');
}

function showToast(msg) {
    let toast = document.getElementById('appToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'appToast';
        toast.style.cssText = `
            position:fixed;bottom:120px;left:50%;transform:translateX(-50%);
            background:#1A4D2E;color:white;padding:10px 20px;border-radius:24px;
            font-size:13px;font-weight:500;font-family:'DM Sans',system-ui;
            z-index:99999;box-shadow:0 4px 20px rgba(0,0,0,0.2);
            opacity:0;transition:opacity 0.25s ease;pointer-events:none;
            white-space:nowrap;max-width:80vw;text-align:center;
        `;
        document.body.appendChild(toast);
    }

    toast.textContent = msg;
    toast.style.opacity = '1';

    if (toast._timer) clearTimeout(toast._timer);
    toast._timer = setTimeout(() => { toast.style.opacity = '0'; }, 2800);
}

// ─────────────────────────────────────────────────────────────────────────────
// 13. NAVEGADOR CAJÓN (drawer árbol/bento)
// Capa de presentación sobre los mismos datos (points3D/costaPoints/hikingRoutes/
// businesses/eventsData) y sobre openDetail(). No es un nuevo source of truth: solo
// agrupa, filtra y enlaza a la ficha existente. Estados peek/half/full con muelle.
// ─────────────────────────────────────────────────────────────────────────────
let _cajonState = 'peek';               // 'peek' | 'half' | 'full'
let _cajonView = 'tree';                // 'tree' | 'grid'
let _cajonSearch = '';
const _cajonOpenBranches = new Set();   // ramas expandidas (por key)
const _cajonOpenSubs = new Set(['patrimonio:iglesias', 'patrimonio:mas']); // subgrupos expandidos ('negocios:alojamiento'); patrimonio abre los suyos por defecto

// Iconos a medida de las ramas (línea 2px, redondeados — mismo lenguaje que la
// barra de controles del mapa). Sustituyen a los emojis (decisión 2026-07-16:
// los emojis "3D" del sistema quedaban poco cuidados). El emoji queda de fallback.
const _BI = (inner) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
const BRANCH_ICONS = {
    patrimonio: _BI('<line x1="3" x2="21" y1="22" y2="22"/><line x1="6" x2="6" y1="18" y2="11"/><line x1="10" x2="10" y1="18" y2="11"/><line x1="14" x2="14" y1="18" y2="11"/><line x1="18" x2="18" y1="18" y2="11"/><polygon points="12 2 20 7 4 7"/>'),
    iglesias:   _BI('<path d="M10 9h4"/><path d="M12 7v5"/><path d="M14 22v-4a2 2 0 0 0-4 0v4"/><path d="m18 22 4-4V9l-4-2"/><path d="m6 22-4-4V9l4-2"/><path d="M18 22V5l-6-3-6 3v17"/>'),
    rutas:      _BI('<circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/>'),
    playascosta: _BI('<path d="M22 12a10.06 10.06 0 0 0-20 0Z"/><path d="M12 12v8a2 2 0 0 0 4 0"/><path d="M12 2v1"/>'),
    casa:       _BI('<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'),
    negocios:   _BI('<path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2 2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2Z"/>'),
    agenda:     _BI('<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/>')
};

// Orden turista-first (decisión de diseño del spec)
const CAJON_BRANCHES = [
    { key: 'patrimonio',  i18n: 'catHeritage', emoji: '⛪',  color: '#0369A1' },
    { key: 'rutas',       i18n: 'catRoutes',   emoji: '🥾', color: '#EA580C' },
    { key: 'playascosta', i18n: 'catCoast',    emoji: '🌊', color: '#0891B2' },
    { key: 'negocios',    i18n: 'catBusiness', emoji: '🏪', color: '#5865C0' },
    { key: 'agenda',      i18n: 'catAgenda',   emoji: '📅', color: '#B96A3C' }
];

// Iconos del interruptor de visibilidad de capa (ojo abierto / tachado). Solo se pinta en
// las ramas que son capa del mapa (MAP_LAYER_KEYS): patrimonio, rutas, playascosta, negocios.
const _EYE_ON_SVG = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
const _EYE_OFF_SVG = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';

// ── Chips de categorías (patrón Komoot): check = capa visible · label = abre el panel ──
// Sustituyen a los ojos del árbol en escritorio; en móvil (<1024px) los cubre el bottom-nav.
let _navActiveBranch = null;
const _CHIP_CHECK_ON  = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
const _CHIP_CHECK_OFF = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/></svg>';

function renderNavChips() {
    const host = document.getElementById('navChips');
    if (!host || window.KIOSCO) return;
    host.innerHTML = CAJON_BRANCHES.map(br => {
        const isLayer = MAP_LAYER_KEYS.indexOf(br.key) !== -1;
        const layerOn = !_layersOff.has(br.key);
        const active = _navActiveBranch === br.key;
        const label = t(br.i18n);
        const check = isLayer
            ? `<button type="button" class="nav-chip-check" data-nact="layer" data-nkey="${escapeHTML(br.key)}" aria-pressed="${layerOn}" title="${escapeHTML((layerOn ? t('chipLayerHide') : t('chipLayerShow')) + ' — ' + label)}">${layerOn ? _CHIP_CHECK_ON : _CHIP_CHECK_OFF}</button>`
            : '';
        return `<div class="nav-chip${active ? ' is-active' : ''}${isLayer && !layerOn ? ' is-off' : ''}" style="--chip-color:${br.color}">${check}<button type="button" class="nav-chip-open" data-nact="open" data-nkey="${escapeHTML(br.key)}" aria-expanded="${active}"><span class="nav-chip-ic" aria-hidden="true">${BRANCH_ICONS[br.key] || ''}</span><span class="nav-chip-label">${escapeHTML(label)}</span><span class="nav-chip-count">${_cajonBranchItems(br.key, '').length}</span></button></div>`;
    }).join('');
}

// Abrir una categoría en el panel (o cerrarla si ya estaba activa). Abrirla enciende su capa.
function navOpenBranch(key) {
    if (_navActiveBranch === key) return navCloseBranch();
    _navActiveBranch = key;
    if (MAP_LAYER_KEYS.indexOf(key) !== -1 && _layersOff.has(key)) layerToggle(key);
    _cajonOpenBranches.clear();
    _cajonOpenBranches.add(key);
    cajonPanelSet(true);
    cajonSetView('tree'); // re-renderiza árbol + chips
    cajonSetState('half');
    _bottomNavSync(key);
    if (typeof track === 'function') track('nav_chip', { meta: { chip: key } });
}
function navCloseBranch() {
    _navActiveBranch = null;
    _cajonOpenBranches.clear();
    cajonPanelSet(false);
    cajonSetState('peek');
    renderCajon();
    _bottomNavSync('casa');
}

// ── Panel flotante de escritorio: abierto/plegado (data-panel + asa-chevron) ──
// En móvil y kiosco el atributo no aplica (CSS scoped a escritorio no-kiosco).
function cajonPanelSet(open) {
    const c = document.getElementById('cajon');
    if (!c) return;
    c.dataset.panel = open ? 'open' : 'collapsed';
    const btn = document.getElementById('cajonCollapse');
    if (btn) {
        btn.setAttribute('aria-expanded', String(open));
        btn.title = t(open ? 'panelCollapse' : 'panelExpand');
        btn.setAttribute('aria-label', btn.title);
    }
}
function cajonPanelToggle() {
    const c = document.getElementById('cajon');
    if (!c) return;
    cajonPanelSet(c.dataset.panel !== 'open');
}

// ── Check de capa en la cabecera del sheet (móvil): mismo patrón que el chip ──
function _cajonHeadSync() {
    const btn = document.getElementById('cajonLayerCheck');
    if (!btn) return;
    const isLayer = _navActiveBranch && MAP_LAYER_KEYS.indexOf(_navActiveBranch) !== -1;
    if (!isLayer || cajonIsDesktop() || window.KIOSCO) { btn.hidden = true; return; }
    const on = !_layersOff.has(_navActiveBranch);
    const brc = CAJON_BRANCHES.find(b => b.key === _navActiveBranch);
    btn.hidden = false;
    btn.innerHTML = on ? _CHIP_CHECK_ON : _CHIP_CHECK_OFF;
    btn.setAttribute('aria-pressed', String(on));
    btn.title = t(on ? 'chipLayerHide' : 'chipLayerShow');
    btn.setAttribute('aria-label', btn.title);
    btn.style.color = on && brc ? brc.color : '';
    btn.classList.toggle('is-off', !on);
}
function cajonHeadLayerToggle() {
    if (_navActiveBranch && MAP_LAYER_KEYS.indexOf(_navActiveBranch) !== -1) layerToggle(_navActiveBranch);
}

// Subgrupo "Iglesias y ermitas" dentro de Patrimonio: las 7 entidades religiosas
// repartidas en points3D/costaPoints (icono, SVG y narración propios).
const IGLESIA_IDS = new Set([
    '3d-sta-maria-bareyo', '3d-san-pedruco', '3d-san-julian',
    '3d-san-vicente-guemes', '3d-san-martin-tours', '3d-san-ildefonso',
    'ermita-san-roque'
]);

function _cajonMatch(item, term) {
    if (!term) return true;
    const hay = [
        localizeEntity(item, 'name'), item.name, localizeEntity(item, 'desc'), item.desc,
        item.location, (item.tags || []).join(' '), item.subcategory, item.category
    ].join(' ').toLowerCase();
    return hay.includes(term);
}

function _cajonWrap(arr, type, term) {
    return arr.filter(i => _cajonMatch(i, term)).map(i => ({
        id: i.id, type, item: i,
        name: localizeEntity(i, 'name') || i.name || '',
        loc: i.location || ''
    }));
}

function _cajonAgendaItems(term) {
    if (!eventsData || !Array.isArray(eventsData.events)) return [];
    return eventsData.events.filter(ev => {
        if (!term) return true;
        return ((ev.title || '') + ' ' + (ev.summary || '') + ' ' + ((ev.categories || []).join(' '))).toLowerCase().includes(term);
    }).map(ev => ({
        id: 'ev-' + ev.id, type: 'event', item: ev, _eventId: ev.id,
        name: ev.title || '', loc: fmtEventDate(ev.datetime || ev.date)
    }));
}

function _cajonBranchItems(key, term) {
    switch (key) {
        case 'patrimonio':  return _cajonWrap(costaPoints.filter(c => !c.beach && !c.coast), 'costa', term).concat(_cajonWrap(points3D, '3d', term));
        case 'rutas':       return _cajonWrap(hikingRoutes, 'hiking', term);
        case 'playascosta': return _cajonWrap(costaPoints.filter(c => c.beach || c.coast), 'costa', term);
        case 'negocios':    return _cajonWrap(businesses, 'biz', term);
        case 'agenda':      return _cajonAgendaItems(term);
        default:           return [];
    }
}

function _cajonLeafStyle(type, item) {
    // svg (si aplica): mismo icono que el pin del mapa → coherencia visual mapa ↔ menú.
    const svgKey = poiSvgKey(item, type);
    const svg = svgKey ? (POI_SVG_DIR + svgKey + '.svg') : null;
    if (type === 'biz') {
        const cat = BUSINESS_CATEGORIES[item.category];
        return { emoji: CATEGORY_EMOJIS[item.subcategory] || CATEGORY_EMOJIS[item.category] || '📍', color: cat ? cat.color : '#6366F1', svg: svg };
    }
    if (type === 'hiking') return { emoji: '🥾', color: (item.color && item.color.main) || '#EA580C', svg: svg };
    // costa/3d: SVG > PNG ilustrado (POI_PIN) > emoji, mismo criterio que el pin del mapa.
    if (type === 'costa')  return { emoji: item.beach ? '🏖️' : (item.coast ? '🌊' : '⛪'), color: (item.beach || item.coast) ? '#0891B2' : '#0369A1', png: (POI_PIN[item.id] && POI_PIN[item.id].png) || null, svg: svg };
    if (type === '3d')     return { emoji: '⛪', color: '#0369A1', png: (POI_PIN[item.id] && POI_PIN[item.id].png) || null, svg: svg };
    if (type === 'event')  return { emoji: '📅', color: '#B96A3C' };
    return { emoji: '📍', color: '#6366F1' };
}

function _cajonBizCategoryLabel(catKey) {
    if (!catKey) return t('catBusiness');
    const i18nKey = 'catBiz' + catKey.charAt(0).toUpperCase() + catKey.slice(1);
    return t(i18nKey) || (BUSINESS_CATEGORIES[catKey] && BUSINESS_CATEGORIES[catKey].label) || t('catBusiness');
}

function _cajonTypeLabel(type, item) {
    if (type === 'biz')    return _cajonBizCategoryLabel(item.category);
    if (type === 'hiking') return t('catRoutes');
    if (type === 'costa')  return (item.beach || item.coast) ? t('catCoast') : t('catHeritage');
    if (type === '3d')     return t('catHeritage');
    return '';
}

function _cajonDarken(hex) {
    const m = /^#?([0-9a-fA-F]{6})$/.exec(hex || '');
    if (!m) return hex;
    const n = parseInt(m[1], 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    r = Math.round(r * 0.55); g = Math.round(g * 0.55); b = Math.round(b * 0.55);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function _cajonEmptyHTML() {
    return `<div class="cajon-empty"><div class="cajon-empty-emoji" aria-hidden="true">🔍</div><div>${escapeHTML(t('drawerEmpty'))}</div></div>`;
}

function _cajonLeafHTML(it) {
    const st = _cajonLeafStyle(it.type, it.item);
    // Selección por delegación con data-* (contexto de atributo HTML → escapeHTML basta).
    // NUNCA construir onclick interpolado: el HTML-escape no protege el contexto JS.
    const act = it.type === 'event'
        ? `data-cact="event" data-eid="${escapeHTML(String(it._eventId))}"`
        : `data-cact="select" data-cid="${escapeHTML(it.id)}" data-ctype="${escapeHTML(it.type)}"`;
    // Icono en chip de color de categoría: SVG blanco (máscara) > PNG ilustrado > emoji.
    let icon, dotMod = '';
    if (st.svg) {
        icon = `<span class="cajon-leaf-svg" style="--svg:url('${escapeHTML(st.svg)}')" aria-hidden="true"></span>`;
    } else if (st.png) {
        icon = `<img class="cajon-leaf-img" src="${escapeHTML(st.png)}" alt="" loading="lazy" decoding="async">`;
        dotMod = ' has-img';
    } else {
        icon = st.emoji;
    }
    return `<button class="cajon-leaf" type="button" style="--leaf-color:${st.color}" ${act}>
        <span class="cajon-leaf-dot${dotMod}" aria-hidden="true">${icon}</span>
        <span class="cajon-leaf-info">
            <span class="cajon-leaf-name">${escapeHTML(it.name)}</span>
            ${it.loc ? `<span class="cajon-leaf-loc">${escapeHTML(it.loc)}</span>` : ''}
        </span>
        <svg class="cajon-leaf-arrow" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
    </button>`;
}

function _cajonBizSubtreeHTML(items, term) {
    const order = Object.keys(BUSINESS_CATEGORIES).filter(k => k !== 'all');
    let html = '';
    order.forEach(catKey => {
        const cat = BUSINESS_CATEGORIES[catKey];
        const subItems = items.filter(it => it.item.category === catKey);
        if (!subItems.length) return;
        const subId = 'negocios:' + catKey;
        const open = _cajonOpenSubs.has(subId) || !!term;
        html += `<div class="cajon-subbranch">
            <button class="cajon-subhead" type="button" aria-expanded="${open}" data-cact="sub" data-csub="${escapeHTML(subId)}">
                <span class="cajon-subhead-emoji" aria-hidden="true">${cat.emoji}</span>
                <span>${escapeHTML(_cajonBizCategoryLabel(catKey))}</span>
                <span class="cajon-subhead-count">${subItems.length}</span>
                <svg class="cajon-subhead-chevron" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
            </button>
            <div class="cajon-subbody${open ? ' is-open' : ''}">${subItems.map(_cajonLeafHTML).join('')}</div>
        </div>`;
    });
    const known = new Set(order);
    const other = items.filter(it => !known.has(it.item.category));
    if (other.length) html += other.map(_cajonLeafHTML).join('');
    return html;
}

// Patrimonio en dos subgrupos colapsables (mismo patrón/CSS que los sectores de negocios):
// Iglesias y ermitas (IGLESIA_IDS) / Más patrimonio. Abiertos por defecto (seed en _cajonOpenSubs).
function _cajonHeritageSubtreeHTML(items, term) {
    const groups = [
        { id: 'patrimonio:iglesias', label: t('heritageChurches'), emoji: '⛪', items: items.filter(w => IGLESIA_IDS.has(w.id)) },
        { id: 'patrimonio:mas',      label: t('heritageMore'),     emoji: '🏛️', items: items.filter(w => !IGLESIA_IDS.has(w.id)) }
    ];
    return groups.filter(g => g.items.length).map(g => {
        const open = _cajonOpenSubs.has(g.id) || !!term;
        return `<div class="cajon-subbranch">
            <button class="cajon-subhead" type="button" aria-expanded="${open}" data-cact="sub" data-csub="${escapeHTML(g.id)}">
                <span class="cajon-subhead-emoji" aria-hidden="true">${g.emoji}</span>
                <span>${escapeHTML(g.label)}</span>
                <span class="cajon-subhead-count">${g.items.length}</span>
                <svg class="cajon-subhead-chevron" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
            </button>
            <div class="cajon-subbody${open ? ' is-open' : ''}">${g.items.map(_cajonLeafHTML).join('')}</div>
        </div>`;
    }).join('');
}

function renderCajonTree(term) {
    const host = document.getElementById('cajonTree');
    if (!host) return;
    let html = '';
    // Con una categoría activa (chips/bottom-nav) y sin búsqueda, el panel muestra SOLO esa rama;
    // la búsqueda global sigue mostrando resultados de todas las ramas.
    const branches = (_navActiveBranch && !term)
        ? CAJON_BRANCHES.filter(b => b.key === _navActiveBranch)
        : CAJON_BRANCHES;
    branches.forEach(br => {
        const items = _cajonBranchItems(br.key, term);
        if (term && items.length === 0) return; // al buscar, ocultamos ramas sin resultados
        const expanded = _cajonOpenBranches.has(br.key) || (!!term && items.length > 0);
        const label = t(br.i18n);
        const isLayer = MAP_LAYER_KEYS.indexOf(br.key) !== -1;
        const layerOn = !_layersOff.has(br.key);
        // Ojos de capa: SOLO en kiosco (el tótem no tiene chips); en web los sustituye el check del chip
        const layerBtn = (window.KIOSCO && isLayer)
            ? `<button class="cajon-layer-toggle ${layerOn ? 'is-on' : 'is-off'}" type="button" data-cact="layer" data-clayer="${escapeHTML(br.key)}" aria-pressed="${layerOn}" title="${escapeHTML(t('layerToggle'))}" aria-label="${escapeHTML(t('layerToggle') + ' — ' + label)}">${layerOn ? _EYE_ON_SVG : _EYE_OFF_SVG}</button>`
            : '';
        const branchIc = BRANCH_ICONS[br.key]
            ? `<span class="cajon-branch-ic" aria-hidden="true">${BRANCH_ICONS[br.key]}</span>`
            : `<span class="cajon-branch-emoji" aria-hidden="true">${br.emoji}</span>`;
        html += `<div class="cajon-branch" id="cajonBranch-${br.key}" style="--branch-color:${br.color}">
            <div class="cajon-branch-row">
                <button class="cajon-branch-header" type="button" aria-expanded="${expanded}" data-cact="branch" data-cbranch="${escapeHTML(br.key)}">
                    ${branchIc}
                    <span class="cajon-branch-label">${escapeHTML(label)}</span>
                    <span class="cajon-branch-count">${items.length}</span>
                    <svg class="cajon-branch-chevron" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
                </button>
                ${layerBtn}
            </div>
            <div class="cajon-branch-body${expanded ? ' is-open' : ''}">
                ${br.key === 'negocios' ? _cajonBizSubtreeHTML(items, term) : br.key === 'patrimonio' ? _cajonHeritageSubtreeHTML(items, term) : items.map(_cajonLeafHTML).join('')}
            </div>
        </div>`;
    });
    host.innerHTML = html || _cajonEmptyHTML();
}

function _cajonCardHTML(item, type) {
    const st = _cajonLeafStyle(type, item);
    const name = localizeEntity(item, 'name') || item.name || '';
    const loc = item.location || '';
    let bg;
    // Comilla SIMPLE dentro de url('…'): la doble cerraba el atributo style="…" y rompía la
    // tarjeta (las 96 fotos se perdían en la vista rejilla). escapeHTML por seguridad.
    if (type === 'biz') bg = `background-image:url('${escapeHTML(getBizImage(item))}')`;
    else if (item.localImage || item.image) bg = `background-image:url('${escapeHTML(item.localImage || item.image)}')`;
    else bg = `background:linear-gradient(150deg, ${st.color}, ${_cajonDarken(st.color)})`;
    const catLabel = _cajonTypeLabel(type, item);
    // Badge de icono: SVG en color de categoría (máscara sobre badge blanco) > PNG > emoji.
    let badge, badgeMod = '';
    if (st.svg) {
        badge = `<span class="cajon-card-svg" style="--svg:url('${escapeHTML(st.svg)}')" aria-hidden="true"></span>`;
    } else if (st.png) {
        badge = `<img class="cajon-card-img" src="${escapeHTML(st.png)}" alt="" loading="lazy" decoding="async">`;
        badgeMod = ' has-img';
    } else {
        badge = st.emoji;
    }
    return `<button class="cajon-card" type="button" style="${bg}" data-cact="select" data-cid="${escapeHTML(item.id)}" data-ctype="${escapeHTML(type)}">
        <span class="cajon-card-badge${badgeMod}" aria-hidden="true" style="--badge-color:${st.color}">${badge}</span>
        ${catLabel ? `<span class="cajon-card-cat" style="--card-cat-color:${st.color}">${escapeHTML(catLabel)}</span>` : ''}
        <span class="cajon-card-name">${escapeHTML(name)}</span>
        ${loc ? `<span class="cajon-card-loc">${escapeHTML(loc)}</span>` : ''}
    </button>`;
}

function renderCajonGrid(term) {
    const host = document.getElementById('cajonGrid');
    if (!host) return;
    const cards = [];
    const push = (arr, type) => arr.filter(i => _cajonMatch(i, term)).forEach(i => cards.push(_cajonCardHTML(i, type)));
    push(costaPoints.filter(c => !c.beach), 'costa');   // patrimonio
    push(costaPoints.filter(c => c.beach), 'costa');    // playas
    push(hikingRoutes, 'hiking');
    push(points3D, '3d');
    push(businesses, 'biz');
    host.innerHTML = cards.length ? cards.join('') : _cajonEmptyHTML();
}

function renderCajon() {
    if (!document.getElementById('cajon')) return;
    const term = _cajonSearch.trim().toLowerCase();
    if (_cajonView === 'tree') renderCajonTree(term);
    else renderCajonGrid(term);
    renderNavChips(); // chips siempre coherentes (idioma, contadores, estado activo/capas)
    // Cabecera del panel: con categoría activa muestra su nombre; si no, el título por defecto
    const titleEl = document.getElementById('cajonTitle');
    const subEl = document.getElementById('cajonSubtitle');
    if (titleEl && subEl) {
        const br = _navActiveBranch ? CAJON_BRANCHES.find(b => b.key === _navActiveBranch) : null;
        titleEl.textContent = br ? t(br.i18n) : t('drawerTitle');
        subEl.textContent = br ? '' : t('drawerSubtitle');
    }
    _cajonHeadSync();
    // (El banner destacado "Güemes · Pueblo del Año" se retiró del cajón el 2026-07-16;
    //  el reconocimiento sigue visible dentro de la Agenda.)
}

// ── Estados peek/half/full ──
// En escritorio/kiosko (>=1024px) el cajón es un PANEL LATERAL FIJO siempre
// visible: los tres estados y la altura inline no aplican (los gobierna el CSS).
function cajonIsDesktop() { return window.matchMedia('(min-width: 1024px)').matches; }
function _cajonHeights() {
    const h = window.innerHeight;
    return { peek: 156, half: Math.round(h * 0.55), full: Math.round(h * 0.92) };
}
function cajonSetState(state) {
    const c = document.getElementById('cajon');
    if (!c) return;
    if (cajonIsDesktop()) {
        // Panel fijo: sin altura inline (la fija el CSS), contenido siempre visible.
        _cajonState = state;
        c.dataset.state = 'full';
        c.style.height = '';
        return;
    }
    _cajonState = state;
    c.dataset.state = state;
    c.style.height = _cajonHeights()[state] + 'px';
    const handle = document.getElementById('cajonHandle');
    if (handle) handle.setAttribute('aria-expanded', String(state !== 'peek'));
}
function cajonCycleState() {
    const order = ['peek', 'half', 'full'];
    cajonSetState(order[(order.indexOf(_cajonState) + 1) % order.length]);
}

// ── Toggle vista árbol/rejilla ──
function cajonSetView(view) {
    _cajonView = view;
    const tree = document.getElementById('cajonTree');
    const grid = document.getElementById('cajonGrid');
    const bt = document.getElementById('cajonBtnTree');
    const bg = document.getElementById('cajonBtnGrid');
    if (tree) tree.hidden = view !== 'tree';
    if (grid) grid.hidden = view !== 'grid';
    if (bt) { bt.classList.toggle('is-active', view === 'tree'); bt.setAttribute('aria-pressed', String(view === 'tree')); }
    if (bg) { bg.classList.toggle('is-active', view === 'grid'); bg.setAttribute('aria-pressed', String(view === 'grid')); }
    if (_cajonState === 'peek') cajonSetState('half');
    renderCajon();
}

// ── Expandir/colapsar ramas y subgrupos ──
function cajonToggleBranch(key) {
    if (_cajonOpenBranches.has(key)) _cajonOpenBranches.delete(key);
    else _cajonOpenBranches.add(key);
    if (_cajonState === 'peek') cajonSetState('half');
    renderCajonTree(_cajonSearch.trim().toLowerCase());
}
function cajonToggleSub(id) {
    if (_cajonOpenSubs.has(id)) _cajonOpenSubs.delete(id);
    else _cajonOpenSubs.add(id);
    renderCajonTree(_cajonSearch.trim().toLowerCase());
}

// ── BOTTOM-NAV MÓVIL (v1, 2026-07-22) ───────────────────────────────────────
// 5 selectores estilo app nativa bajo el mapa: Mapa · Patrimonio · Rutas ·
// Playas · Empresas. Solo visible en móvil (<1024px, CSS) y nunca en kiosco.
// "Mapa" recoge el cajón a peek; las ramas abren el cajón a media altura con
// solo esa rama expandida (mismo flujo que los tiles del atractor del kiosco).
const BOTTOMNAV_TABS = ['casa', 'patrimonio', 'rutas', 'playascosta', 'negocios'];

function renderBottomNav() {
    const nav = document.getElementById('bottomNav');
    if (!nav || window.KIOSCO) return;
    nav.innerHTML = BOTTOMNAV_TABS.map(key => {
        // Acento único --bareyo para el tab activo (patrón Komoot): sin color por categoría
        if (key === 'casa') {
            return `<button type="button" class="bottom-nav-tab is-active" data-bnav="casa">
                <span class="bottom-nav-ic" aria-hidden="true">${BRANCH_ICONS.casa}</span>
                <span class="bottom-nav-label" data-i18n="navHome">${t('navHome') || 'Inicio'}</span></button>`;
        }
        const br = CAJON_BRANCHES.find(b => b.key === key);
        if (!br) return '';
        const ic = (typeof BRANCH_ICONS !== 'undefined' && BRANCH_ICONS[key])
            ? BRANCH_ICONS[key]
            : `<span style="font-size:20px">${br.emoji}</span>`;
        const labelKey = key === 'playascosta' ? 'tabCoast' : br.i18n; // etiqueta corta bajo el icono
        return `<button type="button" class="bottom-nav-tab" data-bnav="${key}">
            <span class="bottom-nav-ic" aria-hidden="true">${ic}</span>
            <span class="bottom-nav-label" data-i18n="${labelKey}">${t(labelKey) || key}</span></button>`;
    }).join('');
    nav.addEventListener('click', e => {
        const btn = e.target && e.target.closest ? e.target.closest('[data-bnav]') : null;
        if (btn) bottomNavGo(btn.getAttribute('data-bnav'));
    });
    document.body.classList.add('has-bottomnav'); // activa los ajustes de layout en CSS
}

function _bottomNavSync(key) {
    document.querySelectorAll('#bottomNav [data-bnav]').forEach(b =>
        b.classList.toggle('is-active', b.getAttribute('data-bnav') === key));
}

function bottomNavGo(key) {
    if (key === 'casa') {
        // Casa = mapa limpio: cierra ficha y panel, re-encuadra el municipio. NO toca capas.
        try { if (typeof dismissDetail === 'function') dismissDetail(); } catch (e) {}
        navCloseBranch();
        if (typeof resetView === 'function' && map) resetView();
        if (typeof track === 'function') track('bottomnav_tab', { meta: { tab: 'casa' } });
        return;
    }
    navOpenBranch(key); // abre el sheet a media altura con esa rama (toggle si repites tab)
    if (typeof track === 'function') track('bottomnav_tab', { meta: { tab: key } });
}

// Interruptor de visibilidad de una capa desde el menú (ojo). NO expande la rama (acción
// 'layer' aparte de 'branch' en el dispatcher). Persiste la preferencia y reaplica el mapa.
function layerToggle(key) {
    if (MAP_LAYER_KEYS.indexOf(key) === -1) return;
    if (_layersOff.has(key)) _layersOff.delete(key); else _layersOff.add(key);
    try { localStorage.setItem('bareyo_layers_off', JSON.stringify(Array.from(_layersOff))); } catch (e) {}
    applyLayerVisibility();
    renderCajonTree(_cajonSearch.trim().toLowerCase()); // refresca el icono del interruptor (ojo on/off)
    renderNavChips();  // refresca el check del chip
    _cajonHeadSync();  // refresca el check de la cabecera del sheet (móvil)
}

// ── Buscador ──
// Región viva (solo lectores) para anunciar el nº de resultados al filtrar.
function _cajonAnnounce(n) {
    let live = document.getElementById('cajonLive');
    if (!live) {
        const host = document.getElementById('cajon');
        if (!host) return;
        live = document.createElement('div');
        live.id = 'cajonLive';
        live.setAttribute('aria-live', 'polite');
        live.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0';
        host.appendChild(live);
    }
    live.textContent = `${n} ${t('resultsCount') || 'resultados'}`;
}
function cajonOnSearch(val) {
    _cajonSearch = val || '';
    const clear = document.getElementById('cajonSearchClear');
    if (clear) clear.hidden = !_cajonSearch;
    if (_cajonSearch && _cajonState === 'peek') cajonSetState('half');
    renderCajon();
    if (_cajonSearch) {
        const term = _cajonSearch.trim().toLowerCase();
        const n = [costaPoints, hikingRoutes, points3D, businesses]
            .reduce((s, arr) => s + arr.filter(i => _cajonMatch(i, term)).length, 0);
        _cajonAnnounce(n);
    }
}
function cajonClearSearch() {
    const input = document.getElementById('cajonSearch');
    if (input) input.value = '';
    cajonOnSearch('');
    if (input) input.focus();
}

// ── Selección: cierra a peek, vuela al POI (con inclinación 3D) y abre la ficha ──
// Frenado suave al final del vuelo (80% del recorrido en el primer tercio, luego
// una deriva larga casi imperceptible) — efecto "zoom cinematográfico" del catálogo
// efecto-ia-mapas-clotitec, adaptado al flyTo ya existente (mismo patrón, solo easing).
function easeOutExpoFly(t) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); }

function focusEntityOnMap(item, type) {
    if (!map || !item || !item.coords) return;
    let lng, lat;
    if (type === 'hiking') { lng = item.coords[0][0]; lat = item.coords[0][1]; }
    else { lng = item.coords[0]; lat = item.coords[1]; }
    if (typeof lng !== 'number' || typeof lat !== 'number') return;
    map.flyTo({
        center: [lng, lat],
        zoom: Math.max(map.getZoom(), 16.5),
        pitch: Math.max(map.getPitch(), 55),
        speed: 1.2, curve: 1.5, easing: easeOutExpoFly, essential: true
    });
    showSelectionPulse(lng, lat);
}

// Anillo de pulso bajo el POI seleccionado — un único marker temporal (no uno por cada
// POI de la capa, que ya son ~100+ en una sola capa symbol). Efecto del catálogo
// efecto-ia-mapas-clotitec (chinchetas-pois/pulso-anillo.js), adaptado a un solo pin.
let _pulseMarker = null;
function showSelectionPulse(lng, lat) {
    hideSelectionPulse();
    if (!map) return;
    const el = document.createElement('div');
    el.className = 'fx-pulse-marker';
    el.innerHTML = '<div class="fx-pulse-ring"></div>';
    _pulseMarker = new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat([lng, lat]).addTo(map);
}
function hideSelectionPulse() {
    if (_pulseMarker) { _pulseMarker.remove(); _pulseMarker = null; }
}
function cajonSelect(id, type) {
    const items = getItemsByType(type);
    const item = items.find(i => i.id === id);
    if (!item) return;
    cajonSetState('peek');
    focusEntityOnMap(item, type);
    openDetail(item, type);
}
function cajonSelectEvent(id) {
    cajonSetState('peek');
    if (typeof openEventDetail === 'function') openEventDetail(id);
}

// ── Setup: arrastre + tap del asa, buscador, revelado ──
function setupCajon() {
    const c = document.getElementById('cajon');
    const handle = document.getElementById('cajonHandle');
    if (!c || !handle) return;

    c.classList.add('is-ready');
    // Web escritorio: panel plegado de inicio (solo chips, patrón Komoot); kiosco/móvil: abierto
    cajonPanelSet(!!window.KIOSCO || !cajonIsDesktop());
    cajonSetState('peek');
    renderCajon();
    renderBottomNav();

    const input = document.getElementById('cajonSearch');
    if (input) input.addEventListener('input', e => cajonOnSearch(e.target.value));

    // Delegación de clics del cajón: leemos data-* (jamás onclick interpolado). Sobrevive a los re-render.
    c.addEventListener('click', e => {
        const el = e.target.closest('[data-cact]');
        if (!el || !c.contains(el)) return;
        const act = el.dataset.cact;
        if (act === 'select') cajonSelect(el.dataset.cid, el.dataset.ctype);
        else if (act === 'event') { const eid = Number(el.dataset.eid); if (Number.isFinite(eid)) cajonSelectEvent(eid); }
        else if (act === 'sub') cajonToggleSub(el.dataset.csub);
        else if (act === 'branch') cajonToggleBranch(el.dataset.cbranch);
        else if (act === 'layer') layerToggle(el.dataset.clayer);
    });

    let dragging = false, startY = 0, startH = 0, moved = false;
    const onDown = (clientY) => {
        if (cajonIsDesktop()) return;   // en panel fijo no hay arrastre de altura
        dragging = true; moved = false;
        startY = clientY; startH = c.getBoundingClientRect().height;
        c.classList.add('is-dragging');
    };
    const onMove = (clientY) => {
        if (!dragging) return;
        const dy = startY - clientY;        // arrastrar hacia arriba aumenta la altura
        if (Math.abs(dy) > 6) moved = true;
        let nh = startH + dy;
        nh = Math.max(96, Math.min(window.innerHeight * 0.96, nh));
        c.style.height = nh + 'px';
        // Revelar contenido en vivo: por encima del peek mostramos cabecera/cuerpo
        c.dataset.state = nh > 200 ? 'half' : 'peek';
    };
    const onUp = () => {
        if (!dragging) return;
        dragging = false;
        c.classList.remove('is-dragging');
        if (!moved) { cajonCycleState(); return; }   // tap → cicla estado
        const cur = c.getBoundingClientRect().height;
        const hs = _cajonHeights();
        const entries = [['peek', hs.peek], ['half', hs.half], ['full', hs.full]];
        let best = entries[0];
        entries.forEach(e => { if (Math.abs(e[1] - cur) < Math.abs(best[1] - cur)) best = e; });
        cajonSetState(best[0]);
    };

    handle.addEventListener('touchstart', e => onDown(e.touches[0].clientY), { passive: true });
    handle.addEventListener('touchmove', e => onMove(e.touches[0].clientY), { passive: true });
    handle.addEventListener('touchend', onUp);
    handle.addEventListener('mousedown', e => { e.preventDefault(); onDown(e.clientY); });
    window.addEventListener('mousemove', e => onMove(e.clientY));
    window.addEventListener('mouseup', onUp);

    handle.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); cajonCycleState(); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); cajonSetState(_cajonState === 'peek' ? 'half' : 'full'); }
        else if (e.key === 'ArrowDown') { e.preventDefault(); cajonSetState(_cajonState === 'full' ? 'half' : 'peek'); }
    });

    // La altura depende de innerHeight: re-aplica el estado actual al redimensionar
    window.addEventListener('resize', () => cajonSetState(_cajonState));

    // Al conmutar entre bottom-sheet (móvil/tablet) y panel lateral (desktop) cambia
    // el ancho útil del mapa → re-aplicar estado y avisar a MapLibre para que se
    // redimensione al nuevo área (evita canvas estirado/mal centrado).
    const mq = window.matchMedia('(min-width: 1024px)');
    const onLayoutSwitch = () => {
        cajonSetState(_cajonState);
        if (map) requestAnimationFrame(() => map.resize());
    };
    if (mq.addEventListener) mq.addEventListener('change', onLayoutSwitch);
    else if (mq.addListener) mq.addListener(onLayoutSwitch);   // Safari < 14

    // Al cargar ya en escritorio, el panel reduce el área del mapa: resize inicial.
    if (cajonIsDesktop() && map) requestAnimationFrame(() => map.resize());

    // Chips de categorías (Komoot): listener delegado — check = capa · label = abre panel
    const chipsHost = document.getElementById('navChips');
    if (chipsHost && !window.KIOSCO) {
        chipsHost.addEventListener('click', e => {
            const btn = e.target && e.target.closest ? e.target.closest('[data-nact]') : null;
            if (!btn) return;
            const key = btn.getAttribute('data-nkey');
            if (btn.getAttribute('data-nact') === 'layer') {
                layerToggle(key);
                if (typeof track === 'function') track('nav_layer', { meta: { layer: key, on: !_layersOff.has(key) } });
            } else {
                navOpenBranch(key);
            }
        });
    }
}
