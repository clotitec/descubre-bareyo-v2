/* kiosko.js — Oficina de Turismo Interactiva de Bareyo (pantalla 65", landscape táctil).
 * Reutiliza data.js (POIs, t(), localizeEntity, currentLang) y geo.js. Página independiente
 * de app.js. Modo atracción (vuelos del mapa + paneles rotativos) + táctil con reset por
 * inactividad + QR para abrir la app en el móvil. Ver memoria bareyo-panel-kiosko.
 */
(function () {
'use strict';

var CFG = window.BAREYO_CONFIG || {};
var map, isSat = false, isTerrain = true, boundary = null;
var weather = null, marine = null, events = [], flags = {};
var sceneIdx = 0, panelIdx = 0, interactive = false;
var sceneTimer = null, panelTimer = null, idleTimer = null, clockTimer = null;
var poiMarkers = [];

// URL pública de la app para el QR "Llévatelo en tu móvil" (no la del kiosko).
var PUBLIC_URL = 'https://descubre-bareyo-v2.vercel.app/';

var DEM_TILES = 'https://elevation-tiles-prod.s3.amazonaws.com/terrarium/{z}/{x}/{y}.png';
var STYLE_LIGHT = 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json';
var SAT_STYLE = {
    version: 8,
    sources: { sat: { type: 'raster', tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'], tileSize: 256, attribution: 'Esri' } },
    layers: [{ id: 'sat', type: 'raster', source: 'sat' }]
};

// ── i18n del chrome del kiosko (reusa t() de data.js donde existe) ─────────────
var KI = {
    es: { sub: 'Oficina de Turismo Interactiva · Cantabria', hint: 'Toca el mapa para explorar', back: 'Volver a la presentación', qrT: 'Llévate la guía', qrS: 'Escanea para abrirla en tu móvil', wave: 'Oleaje', period: 'Periodo', seaTemp: 'Tª agua', nextTides: 'Próximas mareas', high: 'Pleamar', low: 'Bajamar', routes: 'Rutas', heritage: 'Patrimonio', overview: 'Municipio de Bareyo' },
    en: { sub: 'Interactive Tourist Office · Cantabria', hint: 'Touch the map to explore', back: 'Back to the showcase', qrT: 'Take the guide with you', qrS: 'Scan to open it on your phone', wave: 'Waves', period: 'Period', seaTemp: 'Water temp', nextTides: 'Next tides', high: 'High tide', low: 'Low tide', routes: 'Trails', heritage: 'Heritage', overview: 'Bareyo Municipality' },
    fr: { sub: 'Office de Tourisme Interactif · Cantabrie', hint: 'Touchez la carte pour explorer', back: 'Retour à la présentation', qrT: 'Emportez le guide', qrS: 'Scannez pour l’ouvrir sur votre mobile', wave: 'Houle', period: 'Période', seaTemp: 'Temp. eau', nextTides: 'Prochaines marées', high: 'Marée haute', low: 'Marée basse', routes: 'Sentiers', heritage: 'Patrimoine', overview: 'Commune de Bareyo' }
};
function ki(k) { return (KI[currentLang] || KI.es)[k] || KI.es[k] || k; }

// ── Modelo de marea (espejo de app.js TIDE_CFG · recalibrar epoch cada año) ────
var TIDE_CFG = { epoch: Date.UTC(2026, 0, 1, 4, 18) / 1000, z0: 2.40, M2_amp: 1.55, M2_per: 12.4206, S2_amp: 0.55, S2_per: 12.0, S2_lag: -0.5 };
function tideHeight(ts) {
    var tH = (ts - TIDE_CFG.epoch) / 3600;
    return TIDE_CFG.z0 + TIDE_CFG.M2_amp * Math.cos(2 * Math.PI * tH / TIDE_CFG.M2_per) + TIDE_CFG.S2_amp * Math.cos(2 * Math.PI * (tH + TIDE_CFG.S2_lag) / TIDE_CFG.S2_per);
}
function nextTideEvents(now, count) {
    var STEP = 60, HORIZON = 36 * 3600, out = [], prev = tideHeight(now - STEP), cur = tideHeight(now);
    for (var t = now; t < now + HORIZON && out.length < count; t += STEP) {
        var nxt = tideHeight(t + STEP);
        if ((cur - prev) * (nxt - cur) < 0) out.push({ ts: t, height: cur, type: cur > nxt ? 'high' : 'low' });
        prev = cur; cur = nxt;
    }
    return out;
}

// ── cachedFetch (comparte claves/TTL con la app) ──────────────────────────────
async function cachedFetch(key, url, ttlMin) {
    try {
        var raw = localStorage.getItem(key);
        if (raw) { var c = JSON.parse(raw); if (Date.now() - c.ts < ttlMin * 60000) return c.data; }
    } catch (e) {}
    try {
        var res = await fetch(url); if (!res.ok) throw new Error(res.status);
        var data = await res.json();
        try { localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data: data })); } catch (e) {}
        return data;
    } catch (e) {
        try { var c2 = JSON.parse(localStorage.getItem(key)); if (c2) return c2.data; } catch (e2) {}
        return null;
    }
}

// ── Escenas del modo atracción ────────────────────────────────────────────────
function buildScenes() {
    function rb() { return Math.round((Math.random() * 80 - 40)); }
    var s = [{ kind: 'overview', name: ki('overview'), desc: 'Ajo · Bareyo · Güemes', center: CONFIG.center, zoom: 12.4, pitch: 55, bearing: -12, entity: null }];
    costaPoints.forEach(function (p) { s.push({ kind: ki('heritage'), entity: p, type: 'costa', center: p.coords, zoom: 15.2, pitch: 62, bearing: rb() }); });
    points3D.forEach(function (p) { s.push({ kind: '3D', entity: p, type: '3d', center: p.coords, zoom: 15.6, pitch: 60, bearing: rb() }); });
    hikingRoutes.slice(0, 2).forEach(function (r) { var m = r.coords[Math.floor(r.coords.length / 2)]; s.push({ kind: ki('routes'), entity: r, type: 'hiking', center: [m[0], m[1]], zoom: 13.6, pitch: 58, bearing: rb() }); });
    return s;
}
var SCENES = [];

// ── Mapa ──────────────────────────────────────────────────────────────────────
function applyTerrain() {
    if (!map.getSource('kdem')) map.addSource('kdem', { type: 'raster-dem', tiles: [DEM_TILES], encoding: 'terrarium', tileSize: 256, maxzoom: 13 });
    map.setTerrain({ source: 'kdem', exaggeration: 1.5 });
    if (!map.getLayer('khill')) {
        var sym; var ls = (map.getStyle().layers) || [];
        for (var i = 0; i < ls.length; i++) { if (ls[i].type === 'symbol') { sym = ls[i].id; break; } }
        map.addLayer({ id: 'khill', type: 'hillshade', source: 'kdem', paint: { 'hillshade-exaggeration': 0.3 } }, sym);
    }
    // El cielo se pinta vía CSS (fondo de #kMap en kiosko.html): MapLibre 4.1.2 no tiene setSky.
}
function addBoundary() {
    if (!boundary || map.getSource('kbound')) return;
    var world = [[[-180, -85], [180, -85], [180, 85], [-180, 85], [-180, -85]]], holes = [];
    var coords = boundary.type === 'MultiPolygon' ? boundary.coordinates : [boundary.coordinates];
    coords.forEach(function (poly) { poly.forEach(function (ring) { holes.push(ring); }); });
    map.addSource('kmask', { type: 'geojson', data: { type: 'Feature', geometry: { type: 'Polygon', coordinates: world.concat(holes) } } });
    map.addLayer({ id: 'kmaskfill', type: 'fill', source: 'kmask', paint: { 'fill-color': '#0a2a2c', 'fill-opacity': 0.14 } });
    map.addSource('kbound', { type: 'geojson', data: { type: 'Feature', geometry: boundary } });
    map.addLayer({ id: 'kglow', type: 'line', source: 'kbound', paint: { 'line-color': '#1A4D2E', 'line-width': 8, 'line-blur': 6, 'line-opacity': 0.35 }, layout: { 'line-join': 'round' } });
    map.addLayer({ id: 'kline', type: 'line', source: 'kbound', paint: { 'line-color': '#1A4D2E', 'line-width': 2.5, 'line-opacity': 0.85 }, layout: { 'line-join': 'round' } });
}
function addRouteLines() {
    hikingRoutes.forEach(function (r) {
        var id = 'kr-' + r.id;
        if (map.getSource(id)) return;
        map.addSource(id, { type: 'geojson', data: { type: 'Feature', geometry: { type: 'LineString', coordinates: r.coords.map(function (c) { return [c[0], c[1]]; }) } } });
        map.addLayer({ id: id + '-g', type: 'line', source: id, paint: { 'line-color': r.color.glow, 'line-width': 7, 'line-blur': 3, 'line-opacity': 0.55 }, layout: { 'line-join': 'round', 'line-cap': 'round' } });
        map.addLayer({ id: id + '-l', type: 'line', source: id, paint: { 'line-color': r.color.main, 'line-width': 3.5 }, layout: { 'line-join': 'round', 'line-cap': 'round' } });
    });
}
function addPoiMarkers() {
    poiMarkers.forEach(function (m) { m.remove(); }); poiMarkers = [];
    function add(item, emoji, color, type) {
        var el = document.createElement('div');
        el.style.cssText = 'width:38px;height:38px;border-radius:50%;background:' + color + ';border:3px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;font-size:18px;cursor:pointer';
        el.textContent = emoji;
        el.addEventListener('click', function (e) { e.stopPropagation(); enterInteractive(); showPoi(item, type); });
        poiMarkers.push(new maplibregl.Marker({ element: el }).setLngLat(item.coords).addTo(map));
    }
    costaPoints.forEach(function (p) { add(p, p.beach ? '🏖️' : '⛪', p.beach ? '#0EA5E9' : '#0369A1', 'costa'); });
    points3D.forEach(function (p) { add(p, '🧊', '#15803D', '3d'); });
}

function initMap() {
    map = new maplibregl.Map({
        container: 'kMap', style: STYLE_LIGHT, center: CONFIG.center, zoom: 12.4,
        pitch: 55, bearing: -12, maxPitch: 80, attributionControl: { compact: true }
    });
    map.on('error', function () {});
    map.on('load', function () {
        applyTerrain(); addBoundary(); addRouteLines(); addPoiMarkers();
        hideLoader();
        SCENES = buildScenes();
        startAttract();
    });
    map.on('dragstart', enterInteractive);
    map.on('zoomstart', function (e) { if (e.originalEvent) enterInteractive(); });
}

function reAddLayers() {
    // setStyle purga DEM+hillshade+terreno: re-aplicar SOLO si el botón Relieve está activo
    // (antes volvía a forzar el terreno tras togglear satélite aunque estuviera OFF).
    if (isTerrain) applyTerrain();
    addBoundary(); addRouteLines(); addPoiMarkers();
}
function toggleSat() {
    isSat = !isSat;
    document.getElementById('kBtnSat').classList.toggle('active', isSat);
    map.setStyle(isSat ? SAT_STYLE : STYLE_LIGHT);
    map.once('style.load', reAddLayers);
}
function toggleTerrain() {
    isTerrain = !isTerrain;
    document.getElementById('kBtnTerrain').classList.toggle('active', isTerrain);
    if (isTerrain) applyTerrain();
    else { try { map.setTerrain(null); } catch (e) {} if (map.getLayer('khill')) map.removeLayer('khill'); try { map.setSky(null); } catch (e) {} }
}

// ── Modo atracción / interactivo ──────────────────────────────────────────────
function flyToScene(i) {
    var s = SCENES[i]; if (!s) return;
    map.flyTo({ center: s.center, zoom: s.zoom, pitch: s.pitch, bearing: s.bearing, duration: 5200, essential: true });
    var sc = document.getElementById('kScene');
    if (s.entity) {
        document.getElementById('kSceneKind').textContent = s.kind;
        document.getElementById('kSceneName').textContent = localizeEntity(s.entity, 'name');
        document.getElementById('kSceneDesc').textContent = localizeEntity(s.entity, 'desc');
        sc.classList.add('show');
    } else {
        document.getElementById('kSceneKind').textContent = s.kind;
        document.getElementById('kSceneName').textContent = s.name;
        document.getElementById('kSceneDesc').textContent = s.desc;
        sc.classList.add('show');
    }
}
function startAttract() {
    interactive = false; document.body.classList.remove('interactive');
    flyToScene(sceneIdx);
    clearInterval(sceneTimer);
    sceneTimer = setInterval(function () { sceneIdx = (sceneIdx + 1) % SCENES.length; flyToScene(sceneIdx); }, 16000);
}
function enterInteractive() {
    if (interactive) { resetIdle(); return; }
    interactive = true; document.body.classList.add('interactive');
    clearInterval(sceneTimer);
    document.getElementById('kScene').classList.remove('show');
    resetIdle();
}
var IDLE_MS = 90000; // ~90 s sin interacción → vuelve al atractor y resetea estado
function resetIdle() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(function () { kClosePoi(); startAttract(); }, IDLE_MS);
}

// ── Paneles rotativos ─────────────────────────────────────────────────────────
function evThumb(url) { return url ? 'https://wsrv.nl/?url=' + encodeURIComponent(url) + '&w=180&h=180&fit=cover&a=attention&output=webp' : ''; }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }
function fmtDate(iso) {
    if (!iso) return '';
    var d = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso);
    if (isNaN(d)) return iso;
    var loc = currentLang === 'fr' ? 'fr-FR' : currentLang === 'en' ? 'en-GB' : 'es-ES';
    return d.toLocaleDateString(loc, { day: 'numeric', month: 'short' });
}
function fmtTime(ts) { return new Date(ts * 1000).toLocaleTimeString(currentLang === 'en' ? 'en-GB' : currentLang === 'fr' ? 'fr-FR' : 'es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' }); }

var FLAG_COLOR = { verde: '#16a34a', amarilla: '#f59e0b', roja: '#dc2626', 'sin-dato': '#94a3b8' };
function flagOf(id) { var f = flags[id] && flags[id].flag; return FLAG_COLOR[f] ? f : 'sin-dato'; }
function flagLbl(f) { return t({ verde: 'flagGreen', amarilla: 'flagYellow', roja: 'flagRed', 'sin-dato': 'flagNone' }[f]); }

function agendaHTML() {
    var list = events.slice(0, 5).map(function (ev) {
        return '<div class="ev">' + (ev.image ? '<img src="' + evThumb(ev.image) + '" onerror="this.remove()" alt="">' : '') +
            '<div class="b"><div class="meta"><span>📅 ' + esc(fmtDate(ev.datetime || ev.date)) + '</span>' + (ev.categories && ev.categories[0] ? '<span class="tag">' + esc(ev.categories[0]) + '</span>' : '') + '</div>' +
            '<div class="tt">' + esc(ev.title) + '</div></div></div>';
    }).join('');
    if (!list) list = '<div style="color:var(--muted);padding:20px">' + esc(t('eventsEmpty')) + '</div>';
    return '<div class="panel-card" data-k="agenda"><div class="panel-head"><span class="ic">📅</span><div><div class="t">' + esc(t('agenda')) + '</div><div class="s">aytobareyo.org</div></div></div><div class="panel-scroll">' + list + '</div></div>';
}
function seaHTML() {
    var wh = marine && marine.wave_height != null ? marine.wave_height.toFixed(1) + ' m' : '— m';
    var wp = marine && marine.wave_period != null ? marine.wave_period.toFixed(0) + ' s' : '—';
    var st = marine && marine.sea_surface_temperature != null ? marine.sea_surface_temperature.toFixed(0) + '°' : '—';
    var now = Math.floor(Date.now() / 1000), tides = nextTideEvents(now, 4);
    var beaches = costaPoints.filter(function (p) { return p.beach; });
    var flagRows = beaches.map(function (b) { var f = flagOf(b.id); return '<div class="flag-row"><span class="flag-dot" style="background:' + FLAG_COLOR[f] + '"></span><span class="n">' + esc(localizeEntity(b, 'name')) + '</span><span class="val" style="color:' + FLAG_COLOR[f] + '">' + esc(flagLbl(f)) + '</span></div>'; }).join('');
    var tideRows = tides.map(function (e) { return '<div class="tide-row"><span>' + (e.type === 'high' ? '▲ ' + esc(ki('high')) : '▼ ' + esc(ki('low'))) + '</span><b>' + fmtTime(e.ts) + ' · ' + e.height.toFixed(1) + ' m</b></div>'; }).join('');
    return '<div class="panel-card" data-k="sea"><div class="panel-head"><span class="ic">🌊</span><div><div class="t">' + esc(t('beachFlag')) + ' · ' + esc(ki('wave')) + '</div><div class="s">Ajo · Open-Meteo</div></div></div>' +
        '<div class="sea-grid"><div class="sea-stat"><div class="v">' + wh + '</div><div class="l">' + esc(ki('wave')) + '</div></div>' +
        '<div class="sea-stat"><div class="v">' + wp + '</div><div class="l">' + esc(ki('period')) + '</div></div>' +
        '<div class="sea-stat"><div class="v">' + st + '</div><div class="l">' + esc(ki('seaTemp')) + '</div></div>' +
        '<div class="sea-stat"><div class="v" style="font-size:clamp(15px,1.9vh,20px)">🏖️ ' + beaches.length + '</div><div class="l">' + esc(t('beachFlag')) + '</div></div></div>' +
        '<div class="panel-scroll">' + flagRows + '<div style="font-family:Urbanist;font-weight:800;margin:8px 0 2px;font-size:clamp(14px,1.8vh,18px)">🌙 ' + esc(ki('nextTides')) + '</div>' + tideRows + '</div></div>';
}
function destacadosHTML() {
    var items = [];
    hikingRoutes.slice(0, 3).forEach(function (r) { items.push({ em: '🥾', bg: r.color.main, tt: localizeEntity(r, 'name'), mt: r.km + ' km · ' + r.time }); });
    costaPoints.slice(0, 3).forEach(function (p) { items.push({ em: p.beach ? '🏖️' : '⛪', bg: '#0369A1', tt: localizeEntity(p, 'name'), mt: p.location }); });
    var html = items.map(function (it) { return '<div class="hl"><div class="em" style="background:' + it.bg + '22;color:' + it.bg + '">' + it.em + '</div><div class="b"><div class="tt">' + esc(it.tt) + '</div><div class="mt">' + esc(it.mt) + '</div></div></div>'; }).join('');
    return '<div class="panel-card" data-k="hl"><div class="panel-head"><span class="ic">⭐</span><div><div class="t">' + esc(ki('routes')) + ' & ' + esc(ki('heritage')) + '</div><div class="s">5 ' + esc(ki('routes')).toLowerCase() + ' · ' + costaPoints.length + ' ' + esc(ki('heritage')).toLowerCase() + '</div></div></div><div class="panel-scroll">' + html + '</div></div>';
}

function renderPanels() {
    var panel = document.getElementById('kPanel');
    var dots = document.getElementById('kDots');
    panel.querySelectorAll('.panel-card').forEach(function (c) { c.remove(); });
    panel.insertAdjacentHTML('beforeend', agendaHTML() + seaHTML() + destacadosHTML());
    var cards = panel.querySelectorAll('.panel-card');
    dots.innerHTML = ''; cards.forEach(function () { dots.insertAdjacentHTML('beforeend', '<span class="d"></span>'); });
    showPanel(panelIdx % cards.length);
}
function showPanel(i) {
    var cards = document.querySelectorAll('#kPanel .panel-card'), dots = document.querySelectorAll('#kDots .d');
    panelIdx = i;
    cards.forEach(function (c, j) { c.classList.toggle('show', j === i); });
    dots.forEach(function (d, j) { d.classList.toggle('on', j === i); });
}
function startPanelRotation() {
    clearInterval(panelTimer);
    panelTimer = setInterval(function () {
        var n = document.querySelectorAll('#kPanel .panel-card').length || 1;
        showPanel((panelIdx + 1) % n);
    }, 12000);
}

// ── Ficha POI ─────────────────────────────────────────────────────────────────
function showPoi(item, type) {
    if (typeof window.track === 'function') window.track('detail_open', { entity_id: item.id, entity_type: type, meta: { src: 'kiosko' } });
    document.getElementById('kPoiName').textContent = localizeEntity(item, 'name');
    var desc = localizeEntity(item, 'desc');
    if (type === 'costa' && item.beach) { var f = flagOf(item.id); desc = '🏖️ ' + t('beachFlag') + ': ' + flagLbl(f) + '. ' + desc; }
    document.getElementById('kPoiDesc').textContent = desc;
    document.getElementById('kPoiCard').classList.add('show');
    map.flyTo({ center: item.coords, zoom: 15.6, pitch: 62, duration: 1800, essential: true });
    resetIdle();
}
function kClosePoi() { document.getElementById('kPoiCard').classList.remove('show'); }
window.kClosePoi = kClosePoi;

// ── Reloj, QR, idioma ─────────────────────────────────────────────────────────
function tickClock() {
    var d = new Date();
    document.getElementById('kClock').textContent = d.toLocaleTimeString(currentLang === 'en' ? 'en-GB' : 'es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' });
}
function buildQR() {
    // Apunta siempre a la URL pública de producción (el kiosko corre en local/OPS Windows).
    var url = PUBLIC_URL + '?src=kiosko';
    try {
        if (typeof window.qrcode === 'function') {
            var qr = window.qrcode(0, 'M'); qr.addData(url); qr.make();
            document.getElementById('kQrImg').src = qr.createDataURL(6, 8);
        }
    } catch (e) { /* sin QR si la lib no cargó */ }
}
function setLang(lang) {
    currentLang = lang;
    document.querySelectorAll('.lang-b').forEach(function (b) { b.classList.toggle('active', b.dataset.lang === lang); });
    document.documentElement.lang = lang;
    applyChrome();
    renderPanels();
    if (interactive) { /* deja la ficha como está */ } else { flyToScene(sceneIdx); }
}
function applyChrome() {
    document.getElementById('kSub').textContent = ki('sub');
    document.getElementById('kHintText').textContent = ki('hint');
    document.getElementById('kBackText').textContent = ki('back');
    document.getElementById('kQrTitle').textContent = ki('qrT');
    document.getElementById('kQrSub').textContent = ki('qrS');
}

function setWeather() {
    if (!weather) return;
    var wmo = (typeof WMO_CODES !== 'undefined' && WMO_CODES[weather.weather_code]) || { icon: '🌡️' };
    document.getElementById('kWxIcon').textContent = wmo.icon;
    document.getElementById('kWxTemp').textContent = Math.round(weather.temperature_2m) + '°';
    document.getElementById('kWeather').style.display = 'flex';
}

function hideLoader() { var l = document.getElementById('kLoader'); l.style.opacity = '0'; setTimeout(function () { l.style.display = 'none'; }, 500); }

// ── Carga de datos ────────────────────────────────────────────────────────────
async function loadData() {
    // límite municipal: reusa caché de la app o pide a Nominatim
    try {
        var b = localStorage.getItem('bareyo_boundary_v1');
        if (b) boundary = JSON.parse(b);
        else {
            var nd = await cachedFetch('bareyo_boundary_v1_k', 'https://nominatim.openstreetmap.org/search?q=Bareyo,Cantabria,Spain&format=json&polygon_geojson=1&limit=1', 1440);
            if (nd && nd[0] && nd[0].geojson) { boundary = nd[0].geojson.type === 'Polygon' ? { type: 'MultiPolygon', coordinates: [nd[0].geojson.coordinates] } : nd[0].geojson; }
        }
    } catch (e) {}
    var W = await cachedFetch('bareyo_weather_cache', 'https://api.open-meteo.com/v1/forecast?latitude=43.4735&longitude=-3.5938&current=temperature_2m,weather_code&timezone=Europe/Madrid', 30);
    if (W && W.current) { weather = W.current; setWeather(); }
    var M = await cachedFetch('bareyo_marine_cache', 'https://marine-api.open-meteo.com/v1/marine?latitude=43.4735&longitude=-3.5938&current=wave_height,wave_period,sea_surface_temperature&timezone=Europe/Madrid', 60);
    if (M && M.current) marine = M.current;
    var EV = await cachedFetch('bareyo_events_cache', 'events.json', 60);
    if (EV && EV.events) events = EV.events;
    flags = await loadFlags();
}
async function loadFlags() {
    if (CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY) {
        try {
            var res = await fetch(CFG.SUPABASE_URL + '/rest/v1/beach_flags?select=entity_id,flag,updated_at', { headers: { apikey: CFG.SUPABASE_ANON_KEY, Authorization: 'Bearer ' + CFG.SUPABASE_ANON_KEY } });
            if (res.ok) { var rows = await res.json(); var o = {}; rows.forEach(function (r) { o[r.entity_id] = { flag: r.flag }; }); return o; }
        } catch (e) {}
    }
    try { return JSON.parse(localStorage.getItem('bareyo_beach_flags') || '{}'); } catch (e) { return {}; }
}

// ── Guardas táctiles + mantenimiento del personal ─────────────────────────────
function wireKioskGuards() {
    // (b) Nada de menú contextual ni arrastre de imágenes en la pantalla táctil.
    document.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    document.addEventListener('dragstart', function (e) { e.preventDefault(); });
    // Doble-tap zoom: matado vía viewport (user-scalable=no) + touch-action:manipulation en CSS.
    // Aquí solo neutralizamos el gesto de pellizco (pinch) a nivel de página por si el WebView de OPS
    // lo permitiera; el pinch del propio mapa MapLibre no pasa por aquí (canvas con su touch-action).
    document.addEventListener('gesturestart', function (e) { e.preventDefault(); });

    // (a) Cualquier toque/click reinicia el contador de inactividad cuando estamos en modo interactivo.
    ['pointerdown', 'touchstart', 'click'].forEach(function (evt) {
        document.addEventListener(evt, function () { if (interactive) resetIdle(); }, { passive: true, capture: true });
    });

    // (d) Pulsación larga (~3,5 s) en la esquina sup. izquierda → panel de mantenimiento del personal.
    var hot = document.getElementById('kMaintHot'), ov = document.getElementById('kMaintOv'), holdT = null;
    function startHold() { clearTimeout(holdT); holdT = setTimeout(openMaint, 3500); }
    function cancelHold() { clearTimeout(holdT); }
    function openMaint() { ov.classList.add('show'); clearTimeout(idleTimer); } // congela el idle mientras el panel está abierto
    function closeMaint() { ov.classList.remove('show'); if (interactive) resetIdle(); }
    if (hot) {
        hot.addEventListener('pointerdown', startHold);
        hot.addEventListener('pointerup', cancelHold);
        hot.addEventListener('pointerleave', cancelHold);
        hot.addEventListener('pointercancel', cancelHold);
    }
    document.getElementById('kMaintClose').addEventListener('click', closeMaint);
    document.getElementById('kMaintReload').addEventListener('click', function () { location.reload(); });
    document.getElementById('kMaintFull').addEventListener('click', function () {
        try {
            if (!document.fullscreenElement) { (document.documentElement.requestFullscreen || function () {}).call(document.documentElement); }
            else if (document.exitFullscreen) { document.exitFullscreen(); }
        } catch (e) {}
        closeMaint();
    });
    // Tocar fuera de la caja cierra el panel.
    ov.addEventListener('click', function (e) { if (e.target === ov) closeMaint(); });
}

// ── Arranque ──────────────────────────────────────────────────────────────────
async function boot() {
    wireKioskGuards();
    applyChrome();
    if (typeof window.track === 'function') window.track('kiosk_view');
    buildQR();
    tickClock(); clockTimer = setInterval(tickClock, 15000);
    document.querySelectorAll('.lang-b').forEach(function (b) { b.addEventListener('click', function () { setLang(b.dataset.lang); resetIdle(); }); });
    document.getElementById('kBtnSat').addEventListener('click', function () { toggleSat(); enterInteractive(); });
    document.getElementById('kBtnTerrain').addEventListener('click', function () { toggleTerrain(); enterInteractive(); });
    document.getElementById('kBackBtn').addEventListener('click', function () { kClosePoi(); startAttract(); });
    document.getElementById('kMapWrap').addEventListener('pointerdown', function () { if (!interactive) enterInteractive(); else resetIdle(); });

    await loadData();
    renderPanels();
    startPanelRotation();
    initMap();
}

if (window.maplibregl) boot();
else window.addEventListener('load', boot);

})();
