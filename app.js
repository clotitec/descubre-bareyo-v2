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

const SNAP = { COLLAPSED: 140, HALF: 0, FULL: 0 };
let currentSnap = SNAP.COLLAPSED;

function updateSnapPoints() {
    const vh = window.innerHeight || document.documentElement.clientHeight;
    SNAP.HALF = Math.round(vh * 0.45);
    SNAP.FULL = vh - 60;
}
updateSnapPoints();
window.addEventListener('resize', updateSnapPoints);

// Positron: lienzo neutro gris (CARTO) → rutas y pins de color saltan.
// DarkMatter: misma familia CARTO en modo oscuro → toggle coherente.
const defaultStyleLight = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
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

// ─────────────────────────────────────────────────────────────────────────────
// 1. INITIALIZATION
// ─────────────────────────────────────────────────────────────────────────────
// Map init is deferred until user clicks "Explorar" on the landing page.
// If no landing page (direct load), init immediately.
let mapInitialized = false;

window.addEventListener('load', () => {
    applyDeepLink();
    // If landing page is hidden or absent, init map now
    const landing = document.getElementById('landingPage');
    if (!landing || landing.style.display === 'none') {
        bootApp();
    }
});

function bootApp() {
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

        // Hide loader once map is ready
        const loader = document.getElementById('loader');
        if (loader) {
            loader.style.transition = 'opacity 0.4s ease';
            loader.style.opacity = '0';
            setTimeout(() => { loader.style.display = 'none'; }, 400);
        }

        // Apply ?qr= scan tracking + deep link, then clean URL
        handleQrEntry();
        applyItemDeepLink();

        // Auto-launch tutorial on first visit
        if (!localStorage.getItem('bareyo_tutorial_seen')) {
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
        style: defaultStyle,
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
    map.addLayer({
        id: 'boundary-stroke',
        type: 'line',
        source: 'boundary-line',
        paint: {
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
    if (!isTerrain || !map || !map.isStyleLoaded()) return;
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

function toggleSatellite() {
    isSatellite = !isSatellite;
    const btn = document.getElementById('btnSatellite');

    if (isSatellite) {
        map.setStyle(arcgisSatellite);
    } else {
        map.setStyle(defaultStyle);
    }
    setActive(btn, isSatellite);

    // Re-add layers after style change
    map.once('style.load', () => {
        if (bareyoBoundary) addBoundaryMask(bareyoBoundary);
        reapplyTerrainIfOn();
        clearMap();
        loadDataLayer(activeTab);
    });
}

function locateUser() {
    if (!navigator.geolocation) {
        showToast('Geolocalizacion no disponible en este dispositivo');
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
            showToast('Ubicacion encontrada');
        },
        () => { showToast('No se pudo obtener tu ubicacion'); },
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
    clearMap();
    loadDataLayer(tab);
    updateHash();
}

function setFilter(f) {
    activeFilter = f;
    renderFilters(activeTab);
    renderList(activeTab);
    clearMap();
    loadDataLayer(activeTab);
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

    // Remove route popup if present
    if (_routePopup) { _routePopup.remove(); _routePopup = null; }

    // Remove registered map event handlers to prevent accumulation
    _routeHandlers.forEach(({ event, layer, handler }) => {
        try { map.off(event, layer, handler); } catch(e) {}
    });
    _routeHandlers = [];

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

    // "All" tab: routes + heritage + 3D (no businesses — too saturated)
    if (tab === 'all') {
        const term = searchTerm.trim().toLowerCase();
        const matchSearch = (i) => {
            if (!term) return true;
            return (i.name||'').toLowerCase().includes(term) || (i.desc||'').toLowerCase().includes(term) ||
                   (i.location||'').toLowerCase().includes(term) || (i.tags||[]).join(' ').toLowerCase().includes(term) ||
                   (i.subcategory||'').toLowerCase().includes(term);
        };
        loadHikingLayer(hikingRoutes.filter(matchSearch));
        loadPointMarkers(costaPoints.filter(matchSearch), 'costa');
        loadPointMarkers(points3D.filter(matchSearch), '3d');
        return;
    }

    const items = getItemsByType(tab);
    const filtered = filterItems(items, tab);

    if (tab === 'hiking') {
        loadHikingLayer(filtered);
    } else if (tab === 'costa') {
        loadPointMarkers(filtered, 'costa');
    } else if (tab === 'biz') {
        loadPointMarkers(filtered, 'biz');
    } else if (tab === '3d') {
        loadPointMarkers(filtered, '3d');
    }
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
        createRouteMarker(
            [startCoord[0], startCoord[1]],
            route.routeNumber,
            route.color.main,
            () => openDetail(route, 'hiking')
        );
    });
}

// _routePopup declared in global state section

function loadPointMarkers(items, type) {
    items.forEach(item => {
        if (type === 'biz') {
            const color = BUSINESS_CATEGORIES[item.category]
                ? BUSINESS_CATEGORIES[item.category].color : '#8E4A63';
            const emoji = CATEGORY_EMOJIS[item.subcategory] || CATEGORY_EMOJIS[item.category] || '📍';
            // Jerarquía A2: negocio 40px (secundario) vs patrimonio/3D 48px
            createMarker(item.coords, emoji, color, () => openDetail(item, 'biz'), localizeEntity(item, 'name'), 40);
        } else if (type === 'costa') {
            createMarker(item.coords, '⛪', '#0E6C86', () => openDetail(item, 'costa'), localizeEntity(item, 'name'), 48);
        } else if (type === '3d') {
            createMarker(item.coords, '🧊', '#2F7D48', () => openDetail(item, '3d'), localizeEntity(item, 'name'), 48);
        }
    });
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

function openDetail(item, type) {
    selectedItem = { item, type };
    const modal = document.getElementById('detailModal');
    if (!modal) return;

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
        }
    }
    if (detailHeaderNoHero) detailHeaderNoHero.style.display = hero ? 'none' : 'block';

    // Populate hero overlay text
    if (heroTitle) heroTitle.textContent = localizeEntity(item, 'name') || '';
    if (heroLocation) heroLocation.textContent = item.location || '';
    const sectorLabel = type === 'hiking' ? `${item.km} km · ${item.time}`
        : type === 'biz' ? (item.subcategory || item.category)
        : type === 'costa' ? 'Patrimonio'
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
            // Banner de bandera de baño (Cruz Roja) + descripción
            const fl = getBeachFlag(item.id);
            descEl.innerHTML =
                `<div class="beach-flag-banner" style="border-color:${flagColor(fl)}">` +
                `<span class="flag-dot" style="background:${flagColor(fl)}"></span>` +
                `<span class="beach-flag-label">${t('beachFlag')}: <b style="color:${flagColor(fl)}">${flagLabel(fl)}</b></span>` +
                `<a class="beach-flag-cam" href="${PLAYAS_CANTABRIA_URL}" target="_blank" rel="noopener">📹 ${t('flagLiveCam')}</a>` +
                `</div>` +
                `<p style="margin:0">${escapeHTML(locDesc)}</p>`;
        } else {
            descEl.textContent = locDesc || '';
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
        const closeBtn = modal.querySelector('.detail-close');
        if (closeBtn) closeBtn.focus();
    }, 50);
    updateHash();

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

// Global ESC handler — closes detail modal or tutorial overlay
document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    const evModal = document.getElementById('eventModal');
    if (evModal && evModal.classList.contains('active')) { closeEventDetail(); return; }
    const modal = document.getElementById('detailModal');
    if (modal && modal.classList.contains('active')) { closeDetail(); return; }
    const tut = document.getElementById('tutorialOverlay');
    if (tut && tut.style.display !== 'none' && typeof closeTutorial === 'function') { closeTutorial(); return; }
    _closeToolbarMore();
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
            clearMap();
            loadDataLayer(activeTab);
        });
    }

    if (mobileInput) {
        mobileInput.addEventListener('input', (e) => {
            searchTerm = e.target.value;
            if (desktopInput) desktopInput.value = searchTerm;
            renderList(activeTab);
            clearMap();
            loadDataLayer(activeTab);
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

// ─── BANDERAS DE PLAYA (Cruz Roja) ───────────────────────────────────────────
// No hay feed público (ver memoria bareyo-banderas-playa). El estado lo fija un operador
// desde el dashboard → Supabase (tabla beach_flags) si está configurado, o localStorage en demo.
let beachFlags = {};
const FLAG_META = {
    'verde':    { key: 'flagGreen',  color: '#16a34a' },
    'amarilla': { key: 'flagYellow', color: '#f59e0b' },
    'roja':     { key: 'flagRed',    color: '#dc2626' },
    'sin-dato': { key: 'flagNone',   color: '#94a3b8' }
};

async function loadBeachFlags() {
    const CFG = window.BAREYO_CONFIG || {};
    if (CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY) {
        try {
            const res = await fetch(`${CFG.SUPABASE_URL}/rest/v1/beach_flags?select=entity_id,flag,updated_at`, {
                headers: { apikey: CFG.SUPABASE_ANON_KEY, Authorization: 'Bearer ' + CFG.SUPABASE_ANON_KEY }
            });
            if (res.ok) {
                const rows = await res.json();
                beachFlags = {};
                rows.forEach(r => { beachFlags[r.entity_id] = { flag: r.flag, updated: r.updated_at }; });
                return;
            }
        } catch (e) { /* cae a localStorage */ }
    }
    try { beachFlags = JSON.parse(localStorage.getItem('bareyo_beach_flags') || '{}'); } catch (e) { beachFlags = {}; }
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

function toggleEventsOverlay() {
    const panel = document.getElementById('eventsFloatPanel');
    if (!panel) return;
    if (panel.classList.contains('active')) { panel.classList.remove('active'); return; }
    renderEventsPanel();
    panel.classList.add('active');
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
    setTimeout(() => { const c = modal.querySelector('.event-modal-close'); if (c) c.focus(); }, 50);
    if (typeof track === 'function') track('event_detail_open', { meta: { id } });
}
function closeEventDetail() {
    const modal = document.getElementById('eventModal');
    if (!modal) return;
    modal.classList.remove('active');
    if (_eventPrevFocus && _eventPrevFocus.focus) { try { _eventPrevFocus.focus(); } catch (_) {} _eventPrevFocus = null; }
}

function toggleWeatherOverlay() {
    const panel = document.getElementById('weatherFloatPanel');
    if (!panel) return;

    if (panel.classList.contains('active')) {
        panel.classList.remove('active');
        return;
    }

    if (weatherData) renderWeatherPanel(weatherData);
    panel.classList.add('active');
}

function renderWeatherPanel(data) {
    const panel = document.getElementById('weatherFloatPanel');
    if (!panel) return;

    const code = data.weather_code;
    const wmo = WMO_CODES[code] || { desc: 'Variable', icon: '🌡️' };
    const temp = Math.round(data.temperature_2m);
    const wind = Math.round(data.wind_speed_10m);
    const hum = data.relative_humidity_2m;
    const uv = data.uv_index !== undefined ? data.uv_index.toFixed(1) : '—';

    panel.innerHTML = `
        <div class="weather-panel-header">
            <span style="font-size:28px">${wmo.icon}</span>
            <div>
                <div style="font-size:22px;font-weight:800;font-family:'Fraunces',Georgia,serif">${temp}°C</div>
                <div style="font-size:11px;color:#94a3b8;font-weight:500">${escapeHTML(wmo.desc)}</div>
            </div>
        </div>
        <div class="weather-panel-rows">
            <div class="weather-row">
                <span>💨 Viento</span>
                <span style="font-weight:600">${wind} km/h</span>
            </div>
            <div class="weather-row">
                <span>💧 Humedad</span>
                <span style="font-weight:600">${hum}%</span>
            </div>
            <div class="weather-row">
                <span>☀️ Indice UV</span>
                <span style="font-weight:600">${uv}</span>
            </div>
        </div>
        ${renderSunSection()}
        ${renderAirSection()}
        ${renderWeatherForecastStrip()}
        <div style="font-size:10px;color:#94a3b8;margin-top:8px;text-align:center">Open-Meteo · Bareyo, Cantabria</div>
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
            <div class="weather-day${isToday ? ' is-today' : ''}" title="${escapeHTML(wmo.desc)}">
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

function toggleMarineOverlay() {
    const panel = document.getElementById('marineFloatPanel');
    if (!panel) return;
    if (panel.classList.contains('active')) {
        panel.classList.remove('active');
        return;
    }
    if (marineData) renderMarinePanel(marineData);
    panel.classList.add('active');
}

function renderMarinePanel(data) {
    const panel = document.getElementById('marineFloatPanel');
    if (!panel) return;

    const waveH = data.wave_height != null ? data.wave_height.toFixed(1) : '—';
    const wavePeriod = data.wave_period != null ? data.wave_period.toFixed(1) : '—';
    const seaTemp = data.sea_surface_temperature != null ? data.sea_surface_temperature.toFixed(1) : '—';
    const dir = data.wave_direction;
    const dirLabel = compassDirection(dir);

    const beaches = (typeof costaPoints !== 'undefined' ? costaPoints : []).filter(p => p.beach);
    const flagsHtml = beaches.length ? `
        <div class="marine-flags">
            <div class="marine-flags-title">🏖️ ${t('beachFlag') || 'Bandera de baño'}</div>
            ${beaches.map(b => { const fl = getBeachFlag(b.id); return `<div class="marine-flag-row">${flagDot(fl)}<span class="marine-flag-name">${escapeHTML(localizeEntity(b, 'name'))}</span><span class="marine-flag-val" style="color:${flagColor(fl)}">${flagLabel(fl)}</span></div>`; }).join('')}
            <a class="marine-flags-cam" href="${PLAYAS_CANTABRIA_URL}" target="_blank" rel="noopener">📹 ${t('flagLiveCam') || 'Cámara en vivo'} · playascantabria.es</a>
        </div>` : '';

    panel.innerHTML = `
        <div class="weather-panel-header">
            <span style="font-size:28px">🌊</span>
            <div>
                <div style="font-size:22px;font-weight:800;font-family:'Fraunces',Georgia,serif">${waveH} m</div>
                <div style="font-size:11px;color:#94a3b8;font-weight:500">${t('marineHeading') || 'Mar y oleaje · Ajo'}</div>
            </div>
        </div>
        <div class="weather-panel-rows">
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
        <div style="font-size:10px;color:#94a3b8;margin-top:8px;text-align:center">Open-Meteo Marine · Mareas calculadas (Santander)</div>
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
    const lang = ['es', 'en', 'fr', 'de'].includes(currentLang) ? currentLang : 'es';
    const title = encodeURIComponent(item.wikiTitle);
    const url = `https://es.wikipedia.org/api/rest_v1/page/summary/${title}`;
    const cacheKey = `bareyo_wiki_${lang}_${item.wikiTitle}`;
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

    // Append wiki extract if cached (solo cuando no hay narracion propia)
    if (!narr && item.wikiTitle) {
        const lang = ['es', 'en', 'fr', 'de'].includes(currentLang) ? currentLang : 'es';
        const cacheKey = `bareyo_wiki_${lang}_${item.wikiTitle}`;
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

function updateHash() {
    let hash = `tab=${activeTab}`;
    if (selectedItem) {
        const sk = TYPE_TO_SLUGKEY[selectedItem.type];
        if (sk) {
            hash += `&${sk}=${encodeURIComponent(slugify(selectedItem.item.name))}`;
        } else {
            hash += `&item=${encodeURIComponent(selectedItem.item.id)}`;
        }
    }
    history.replaceState(null, '', `#${hash}`);
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

    // Map QR id to entity (try direct id, then slug)
    const types = ['hiking', 'costa', 'biz', '3d'];
    for (const type of types) {
        const items = getItemsByType(type);
        const found = items.find(i => i.id === qr || slugify(i.name) === qr);
        if (found) {
            const sk = TYPE_TO_SLUGKEY[type];
            window.location.hash = `tab=${type}&${sk}=${encodeURIComponent(slugify(found.name))}`;
            break;
        }
    }

    // Clean ?qr= from URL (keep hash)
    const cleanUrl = window.location.pathname + window.location.hash;
    history.replaceState(null, '', cleanUrl);
}

// ─── ROUTE TRACKING (Geo en ruta) ───────────────────────────────────────────
let _routeTracking = null;

async function startRouteTracking() {
    if (!selectedItem || selectedItem.type !== 'hiking') return;
    if (!('geolocation' in navigator)) {
        showToast(t('geoUnsupported') || 'Geolocalizacion no soportada');
        return;
    }
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
        err => console.warn('GPS error', err),
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
function toggleLanguage() {
    const langs = ['es', 'en', 'fr', 'de'];
    const idx = langs.indexOf(currentLang);
    currentLang = langs[(idx + 1) % langs.length];
    applyTranslations();
    renderTabs();
    renderFilters(activeTab);
    renderList(activeTab);
    if (mapInitialized && map) loadDataLayer(activeTab); // relabel map markers/popups in the new language
    renderCajon(); // re-etiqueta ramas/tarjetas del cajón en el nuevo idioma
    if (selectedItem) openDetail(selectedItem.item, selectedItem.type); // refresh open detail card
}

function applyTranslations() {
    // Update data-i18n elements
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const val = t(key);
        if (val) el.textContent = val;
    });

    // Language cycle: show NEXT language flag/label
    const langs = ['es', 'en', 'fr', 'de'];
    const nextIdx = (langs.indexOf(currentLang) + 1) % langs.length;
    const nextLang = langs[nextIdx];

    const flagSvgs = {
        es: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 60 30'%3E%3Crect width='60' height='10' fill='%23c60b1e'/%3E%3Crect y='10' width='60' height='10' fill='%23ffc400'/%3E%3Crect y='20' width='60' height='10' fill='%23c60b1e'/%3E%3C/svg%3E",
        en: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 60 30'%3E%3CclipPath id='a'%3E%3Crect width='60' height='30'/%3E%3C/clipPath%3E%3Cg clip-path='url(%23a)'%3E%3Cpath d='M0 0v30h60V0z' fill='%23012169'/%3E%3Cpath d='M0 0l60 30m0-30L0 30' stroke='%23fff' stroke-width='6'/%3E%3Cpath d='M0 0l60 30m0-30L0 30' stroke='%23C8102E' stroke-width='4' clip-path='url(%23a)'/%3E%3Cpath d='M30 0v30M0 15h60' stroke='%23fff' stroke-width='10'/%3E%3Cpath d='M30 0v30M0 15h60' stroke='%23C8102E' stroke-width='6'/%3E%3C/g%3E%3C/svg%3E",
        fr: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 60 30'%3E%3Crect width='20' height='30' fill='%23002395'/%3E%3Crect x='20' width='20' height='30' fill='%23fff'/%3E%3Crect x='40' width='20' height='30' fill='%23ED2939'/%3E%3C/svg%3E",
        de: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 60 30'%3E%3Crect width='60' height='10' fill='%23000'/%3E%3Crect y='10' width='60' height='10' fill='%23D00'/%3E%3Crect y='20' width='60' height='10' fill='%23FFCE00'/%3E%3C/svg%3E"
    };

    const flag = document.getElementById('langFlag');
    const label = document.getElementById('langLabel');
    if (flag) { flag.src = flagSvgs[nextLang]; flag.alt = nextLang.toUpperCase(); }
    if (label) label.textContent = nextLang.toUpperCase();

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
            .then(() => showToast('Enlace copiado al portapapeles'))
            .catch(() => showToast('No se pudo copiar el enlace'));
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
    showToast('Descargando archivo GPX...');
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
const _cajonOpenSubs = new Set();       // subgrupos negocios expandidos ('negocios:alojamiento')

// Orden turista-first (decisión de diseño del spec)
const CAJON_BRANCHES = [
    { key: 'patrimonio', i18n: 'catHeritage', emoji: '⛪',  color: '#0369A1' },
    { key: 'rutas',      i18n: 'catRoutes',   emoji: '🥾', color: '#EA580C' },
    { key: 'playas',     i18n: 'catBeaches',  emoji: '🏖️', color: '#0891B2' },
    { key: 'guemes',     i18n: 'catGuemes',   emoji: '🏆', color: '#C9962B' },
    { key: 'vistas3d',   i18n: 'cat3d',       emoji: '🧊', color: '#15803D' },
    { key: 'negocios',   i18n: 'catBusiness', emoji: '🏪', color: '#6366F1' },
    { key: 'agenda',     i18n: 'catAgenda',   emoji: '📅', color: '#B96A3C' }
];

function _cajonIsGuemes(item) { return /gu[eé]mes/i.test(item.location || ''); }

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
        case 'patrimonio': return _cajonWrap(costaPoints.filter(c => !c.beach), 'costa', term).concat(_cajonWrap(points3D, '3d', term));
        case 'rutas':      return _cajonWrap(hikingRoutes, 'hiking', term);
        case 'playas':     return _cajonWrap(costaPoints.filter(c => c.beach), 'costa', term);
        case 'guemes':     return [].concat(
                                _cajonWrap(costaPoints.filter(_cajonIsGuemes), 'costa', term),
                                _cajonWrap(points3D.filter(_cajonIsGuemes), '3d', term),
                                _cajonWrap(hikingRoutes.filter(_cajonIsGuemes), 'hiking', term),
                                _cajonWrap(businesses.filter(_cajonIsGuemes), 'biz', term));
        case 'vistas3d':   return _cajonWrap(points3D, '3d', term);
        case 'negocios':   return _cajonWrap(businesses, 'biz', term);
        case 'agenda':     return _cajonAgendaItems(term);
        default:           return [];
    }
}

function _cajonLeafStyle(type, item) {
    if (type === 'biz') {
        const cat = BUSINESS_CATEGORIES[item.category];
        return { emoji: CATEGORY_EMOJIS[item.subcategory] || CATEGORY_EMOJIS[item.category] || '📍', color: cat ? cat.color : '#6366F1' };
    }
    if (type === 'hiking') return { emoji: '🥾', color: (item.color && item.color.main) || '#EA580C' };
    if (type === 'costa')  return { emoji: item.beach ? '🏖️' : '⛪', color: item.beach ? '#0891B2' : '#0369A1' };
    if (type === '3d')     return { emoji: '🧊', color: '#15803D' };
    if (type === 'event')  return { emoji: '📅', color: '#B96A3C' };
    return { emoji: '📍', color: '#6366F1' };
}

function _cajonTypeLabel(type, item) {
    if (type === 'biz')    return (BUSINESS_CATEGORIES[item.category] && BUSINESS_CATEGORIES[item.category].label) || t('catBusiness');
    if (type === 'hiking') return t('catRoutes');
    if (type === 'costa')  return item.beach ? t('catBeaches') : t('catHeritage');
    if (type === '3d')     return t('cat3d');
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
    return `<button class="cajon-leaf" type="button" style="--leaf-color:${st.color}" ${act}>
        <span class="cajon-leaf-dot" aria-hidden="true">${st.emoji}</span>
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
                <span>${escapeHTML(cat.label)}</span>
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

function renderCajonTree(term) {
    const host = document.getElementById('cajonTree');
    if (!host) return;
    let html = '';
    CAJON_BRANCHES.forEach(br => {
        const items = _cajonBranchItems(br.key, term);
        if (term && items.length === 0) return; // al buscar, ocultamos ramas sin resultados
        const expanded = _cajonOpenBranches.has(br.key) || (!!term && items.length > 0);
        const label = t(br.i18n) + (br.key === 'guemes' ? ' ⭐' : '');
        html += `<div class="cajon-branch" id="cajonBranch-${br.key}" style="--branch-color:${br.color}">
            <button class="cajon-branch-header" type="button" aria-expanded="${expanded}" data-cact="branch" data-cbranch="${escapeHTML(br.key)}">
                <span class="cajon-branch-emoji" aria-hidden="true">${br.emoji}</span>
                <span class="cajon-branch-label">${escapeHTML(label)}</span>
                <span class="cajon-branch-count">${items.length}</span>
                <svg class="cajon-branch-chevron" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
            </button>
            <div class="cajon-branch-body${expanded ? ' is-open' : ''}">
                ${br.key === 'negocios' ? _cajonBizSubtreeHTML(items, term) : items.map(_cajonLeafHTML).join('')}
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
    if (type === 'biz') bg = `background-image:url("${getBizImage(item)}")`;
    else if (item.localImage || item.image) bg = `background-image:url("${item.localImage || item.image}")`;
    else bg = `background:linear-gradient(150deg, ${st.color}, ${_cajonDarken(st.color)})`;
    const catLabel = _cajonTypeLabel(type, item);
    return `<button class="cajon-card" type="button" style="${bg}" data-cact="select" data-cid="${escapeHTML(item.id)}" data-ctype="${escapeHTML(type)}">
        <span class="cajon-card-badge" aria-hidden="true">${st.emoji}</span>
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
    const ft = document.getElementById('cajonFeaturedText');
    if (ft) ft.textContent = t('guemesAward');
}

// ── Estados peek/half/full ──
function _cajonHeights() {
    const h = window.innerHeight;
    return { peek: 156, half: Math.round(h * 0.55), full: Math.round(h * 0.92) };
}
function cajonSetState(state) {
    const c = document.getElementById('cajon');
    if (!c) return;
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

// ── Buscador ──
function cajonOnSearch(val) {
    _cajonSearch = val || '';
    const clear = document.getElementById('cajonSearchClear');
    if (clear) clear.hidden = !_cajonSearch;
    if (_cajonSearch && _cajonState === 'peek') cajonSetState('half');
    renderCajon();
}
function cajonClearSearch() {
    const input = document.getElementById('cajonSearch');
    if (input) input.value = '';
    cajonOnSearch('');
    if (input) input.focus();
}

// ── Destacado Güemes · Pueblo del Año ──
function cajonOpenGuemes() {
    if (_cajonView !== 'tree') cajonSetView('tree');
    _cajonOpenBranches.add('guemes');
    cajonSetState('full');
    renderCajonTree(_cajonSearch.trim().toLowerCase());
    setTimeout(() => {
        const el = document.getElementById('cajonBranch-guemes');
        if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 90);
}

// ── Selección: cierra a peek, vuela al POI (con inclinación 3D) y abre la ficha ──
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
        speed: 1.2, curve: 1.5, essential: true
    });
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
    cajonSetState('peek');
    renderCajon();

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
    });

    let dragging = false, startY = 0, startH = 0, moved = false;
    const onDown = (clientY) => {
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
}
