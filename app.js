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
let _routeHandlers = []; // Track registered map event handlers for cleanup

const SNAP = { COLLAPSED: 140, HALF: 0, FULL: 0 };
let currentSnap = SNAP.COLLAPSED;

function updateSnapPoints() {
    const vh = window.innerHeight || document.documentElement.clientHeight;
    SNAP.HALF = Math.round(vh * 0.45);
    SNAP.FULL = vh - 60;
}
updateSnapPoints();
window.addEventListener('resize', updateSnapPoints);

// Voyager: colorful basemap showing sea, beaches, parks, terrain
const defaultStyle = 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json';
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

    initMap();

    map.on('load', async () => {
        try {
            bareyoBoundary = await loadBoundary();
            if (bareyoBoundary) addBoundaryMask(bareyoBoundary);
        } catch (e) {
            console.warn('Boundary load failed:', e);
        }

        renderTabs();
        renderFilters(activeTab);
        renderList(activeTab);
        loadDataLayer(activeTab);
        setupSearch();
        setupBottomSheet();
        fetchWeather();
        fetchMarine();
        fetchSunMoon();
        fetchAirQuality();

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

        applyTranslations();

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

function toggleSatellite() {
    isSatellite = !isSatellite;
    const btn = document.getElementById('btnSatellite');

    if (isSatellite) {
        map.setStyle(arcgisSatellite);
        if (btn) btn.classList.add('active');
    } else {
        map.setStyle(defaultStyle);
        if (btn) btn.classList.remove('active');
    }

    // Re-add layers after style change
    map.once('style.load', () => {
        if (bareyoBoundary) addBoundaryMask(bareyoBoundary);
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

// ─────────────────────────────────────────────────────────────────────────────
// 3. UI RENDERING
// ─────────────────────────────────────────────────────────────────────────────
function renderTabs() {
    const html = TABS.map(tab => {
        const active = tab.id === activeTab ? 'active' : '';
        return `<button class="tab-pill ${active}" onclick="switchTab('${tab.id}')" aria-pressed="${tab.id === activeTab}">
            <span class="tab-emoji">${tab.emoji}</span>${tab.label}
        </button>`;
    }).join('');

    const desktopEl = document.getElementById('tabsDesktop');
    const mobileEl = document.getElementById('tabsMobile');
    if (desktopEl) desktopEl.innerHTML = html;
    if (mobileEl) mobileEl.innerHTML = html;
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

    const color = type === 'hiking' ? (item.color ? item.color.main : '#EA580C')
        : type === 'biz' ? (BUSINESS_CATEGORIES[item.category] ? BUSINESS_CATEGORIES[item.category].color : '#6366F1')
        : type === 'costa' ? '#0369A1'
        : '#15803D';

    const subtitle = type === 'hiking'
        ? `${item.km} km · ${item.time}`
        : type === 'biz' ? (item.subcategory || item.category)
        : (item.location || '');

    const badge = type === 'hiking'
        ? `<span class="item-badge" style="background:${color}">${item.routeNumber || ''}</span>`
        : type === '3d' ? `<span class="item-badge" style="background:#15803D">3D</span>`
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
            <div class="company-name">${escapeHTML(item.name)}</div>
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
        if (map) map.once('style.load', () => loadDataLayer(tab));
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
                properties: { routeId: route.id, name: route.name },
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
                ? BUSINESS_CATEGORIES[item.category].color : '#6366F1';
            const emoji = CATEGORY_EMOJIS[item.subcategory] || CATEGORY_EMOJIS[item.category] || '📍';
            createMarker(item.coords, emoji, color, () => openDetail(item, 'biz'), item.name);
        } else if (type === 'costa') {
            createMarker(item.coords, '⛪', '#0369A1', () => openDetail(item, 'costa'), item.name);
        } else if (type === '3d') {
            createMarker(item.coords, '🧊', '#15803D', () => openDetail(item, '3d'), item.name);
        }
    });
}

function createMarker(coords, emoji, color, onClick, name) {
    const el = document.createElement('div');
    el.style.cssText = 'display:flex;flex-direction:column;align-items:center;cursor:pointer;';
    el.innerHTML = `
        <div class="marker-pin" style="width:44px;height:44px;display:flex;align-items:center;justify-content:center;background:white;border-radius:50%;border:3px solid ${color};font-size:18px;box-shadow:0 3px 12px rgba(0,0,0,0.15);transition:transform 0.2s">${emoji}</div>
        ${name ? `<div class="marker-label" style="display:none;margin-top:4px;background:rgba(255,255,255,0.92);backdrop-filter:blur(12px);color:#1a2332;padding:2px 8px;border-radius:8px;font-size:10px;font-weight:600;font-family:'DM Sans',system-ui;white-space:nowrap;max-width:140px;overflow:hidden;text-overflow:ellipsis;box-shadow:0 1px 6px rgba(0,0,0,0.08);border:1px solid rgba(0,0,0,0.06)">${escapeHTML(name)}</div>` : ''}`;
    const pin = el.querySelector('.marker-pin');
    el.onmouseenter = () => { if (pin) pin.style.transform = 'scale(1.15)'; };
    el.onmouseleave = () => { if (pin) pin.style.transform = 'scale(1)'; };
    el.onclick = onClick;
    const marker = new maplibregl.Marker({ element: el }).setLngLat(coords).addTo(map);
    markers.push(marker);
    return marker;
}

function createRouteMarker(coords, number, color, onClick) {
    const el = document.createElement('div');
    el.style.cssText = 'width:36px;height:36px;cursor:pointer;';
    el.innerHTML = `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:${color};border-radius:50%;color:white;font-size:14px;font-weight:800;font-family:Urbanist,system-ui;box-shadow:0 3px 12px rgba(0,0,0,0.2);border:2px solid white;transition:transform 0.2s">${number}</div>`;
    el.onmouseenter = () => { if (el.firstChild) el.firstChild.style.transform = 'scale(1.2)'; };
    el.onmouseleave = () => { if (el.firstChild) el.firstChild.style.transform = 'scale(1)'; };
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
    const color = type === 'hiking' ? (item.color ? item.color.main : '#EA580C')
        : type === 'biz' ? (BUSINESS_CATEGORIES[item.category] ? BUSINESS_CATEGORIES[item.category].color : '#6366F1')
        : type === 'costa' ? '#0369A1'
        : '#15803D';

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
    if (heroTitle) heroTitle.textContent = item.name || '';
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
    if (dtTitle) dtTitle.textContent = item.name || '';
    if (dtSector) { dtSector.textContent = `${emoji} ${sectorLabel}`; dtSector.style.color = color; }
    if (dtArea) dtArea.textContent = item.location || '';

    // Description
    const descSection = document.getElementById('detailDescSection');
    const descEl = document.getElementById('detailDesc');
    if (descEl) descEl.textContent = item.desc || '';
    if (descSection) descSection.style.display = item.desc ? 'block' : 'none';

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
    if (type === '3d' && item.url360) {
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
    initMiniMap(coords[0], coords[1], item.name);

    // Show modal
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    updateHash();

    // Analytics
    if (typeof track === 'function') {
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

    updateHash();
}

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

    miniMap.on('load', () => {
        const el = document.createElement('div');
        el.style.cssText = 'width:32px;height:32px;';
        el.innerHTML = `<div style="width:32px;height:32px;display:flex;align-items:center;justify-content:center;background:#1A4D2E;border-radius:50%;color:white;font-size:14px;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.2)">📍</div>`;
        new maplibregl.Marker({ element: el }).setLngLat([lng, lat]).addTo(miniMap);
    });
}

function destroyMiniMap() {
    if (miniMap) {
        miniMap.remove();
        miniMap = null;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. ELEVATION PROFILE
// ─────────────────────────────────────────────────────────────────────────────
function drawElevationProfile(coords, color) {
    const canvas = document.getElementById('elevationChart');
    if (!canvas) return;

    const elevations = coords.map(c => c[2]).filter(e => e !== undefined && e !== null);
    if (elevations.length < 2) return;

    const W = canvas.offsetWidth || 300;
    const H = 100;
    canvas.width = W;
    canvas.height = H;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);

    const minE = Math.min(...elevations);
    const maxE = Math.max(...elevations);
    const range = maxE - minE || 1;

    const pad = { top: 8, bottom: 16, left: 4, right: 4 };
    const drawW = W - pad.left - pad.right;
    const drawH = H - pad.top - pad.bottom;

    const xOf = (i) => pad.left + (i / (elevations.length - 1)) * drawW;
    const yOf = (e) => pad.top + drawH - ((e - minE) / range) * drawH;

    // Fill gradient
    const grad = ctx.createLinearGradient(0, pad.top, 0, H);
    grad.addColorStop(0, color + '33');
    grad.addColorStop(1, color + '05');

    ctx.beginPath();
    ctx.moveTo(xOf(0), yOf(elevations[0]));
    elevations.forEach((e, i) => { if (i > 0) ctx.lineTo(xOf(i), yOf(e)); });
    ctx.lineTo(xOf(elevations.length - 1), H - pad.bottom);
    ctx.lineTo(xOf(0), H - pad.bottom);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Stroke line
    ctx.beginPath();
    ctx.moveTo(xOf(0), yOf(elevations[0]));
    elevations.forEach((e, i) => { if (i > 0) ctx.lineTo(xOf(i), yOf(e)); });
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Elevation stats
    let gain = 0;
    for (let i = 1; i < elevations.length; i++) {
        const diff = elevations[i] - elevations[i - 1];
        if (diff > 0) gain += diff;
    }

    const statsEl = document.getElementById('elevationStats');
    if (statsEl) {
        statsEl.innerHTML = `
            <span class="elev-stat"><span style="color:${color}">↑</span> +${Math.round(gain)} m ganados</span>
            <span class="elev-stat"><span style="color:#0369A1">▲</span> Max ${Math.round(maxE)} m</span>
            <span class="elev-stat"><span style="color:#64748B">▼</span> Min ${Math.round(minE)} m</span>`;
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
                <div style="font-size:22px;font-weight:800;font-family:'Urbanist',system-ui">${temp}°C</div>
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

    panel.innerHTML = `
        <div class="weather-panel-header">
            <span style="font-size:28px">🌊</span>
            <div>
                <div style="font-size:22px;font-weight:800;font-family:'Urbanist',system-ui">${waveH} m</div>
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
        <div style="font-size:10px;color:#94a3b8;margin-top:8px;text-align:center">Open-Meteo Marine · 43.47, -3.59</div>
        <div style="font-size:9px;color:#cbd5e1;margin-top:2px;text-align:center;font-style:italic">${t('marineDisclaimer') || 'Sin datos de pleamar/bajamar (no uso náutico)'}</div>
    `;
}

function compassDirection(deg) {
    if (deg == null || isNaN(deg)) return '—';
    const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
    return dirs[Math.round(deg / 22.5) % 16] + ' (' + Math.round(deg) + '°)';
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
    const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${title}`;
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
        const link = `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(item.wikiTitle)}`;
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
    let text = (item.name || '') + '. ' + (item.desc || '');

    // Append wiki extract if cached
    if (item.wikiTitle) {
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
        title = `${item.name} · ${baseTitle}`;
        desc = (item.desc || baseDesc).slice(0, 200);
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
            <div class="route-hud-route">🥾 ${escapeHTML(route.name)}</div>
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
    const text = `${item.name} — Descubre Bareyo`;

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
