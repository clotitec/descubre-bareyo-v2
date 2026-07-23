/* Descubre Bareyo — Service Worker
 * Estrategias:
 *   - Shell + GPX: Cache First, precachear en install
 *   - Tiles del mapa: Stale While Revalidate, max 200 entries
 *   - APIs (Open-Meteo, Sunrise-Sunset, Wikipedia, Nominatim): Network First, timeout 3s, fallback cache
 *   - Imágenes (assets, Unsplash): Cache First, max 80 entries
 *   - Navegación HTML: Network First → cache → offline.html
 * Bumpea CACHE_VERSION para invalidar al desplegar.
 */

const CACHE_VERSION = 'v3.2026.07.23i';
const SHELL_CACHE   = `bareyo-shell-${CACHE_VERSION}`;
const TILES_CACHE   = `bareyo-tiles-${CACHE_VERSION}`;
const APIS_CACHE    = `bareyo-apis-${CACHE_VERSION}`;
const IMAGES_CACHE  = `bareyo-images-${CACHE_VERSION}`;
// Sin versión a propósito: los .geojson pesados (fotos360, edificios) sobreviven al bump
// del shell y se refrescan por SWR — evita re-descargar 3,4 MB en cada release.
const DATA_CACHE    = 'bareyo-data-v1';

const SHELL_ASSETS = [
    './',
    './index.html',
    // Rutas limpias: Vercel (cleanUrls) navega a /kiosko y /offline sin .html;
    // el precache necesita AMBAS claves para que el fallback de navegación acierte.
    './kiosko',
    './offline',
    './app.js',
    './data.js',
    './js/geo.js',
    './kiosko.html',
    './kiosko.js',
    './config.js',
    './js/track.js',
    './js/kiosco.js',
    './js/editor.js',
    './escaparate',
    './escaparate.html',
    './events.json',
    './styles.css',
    './styles-v3.css',
    './manifest.json',
    './offline.html',
    './assets/logo.png',
    './assets/tracks/san_pedruco.gpx',
    './assets/tracks/cabo_ria_ajo.gpx',
    './assets/tracks/santa_maria.gpx',
    './assets/tracks/san_vicente.gpx',
    './assets/tracks/ruta_iglesias.gpx',
    './assets/tracks/ruta-monumentos.gpx',
    'https://unpkg.com/maplibre-gl@4.1.2/dist/maplibre-gl.js',
    'https://unpkg.com/maplibre-gl@4.1.2/dist/maplibre-gl.css',
    'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js'
];

// ── Install: precache the shell ─────────────────────────────────────────────
self.addEventListener('install', event => {
    event.waitUntil((async () => {
        const cache = await caches.open(SHELL_CACHE);
        // addAll() falla si UN solo recurso falla. Cargamos uno a uno tolerando errores.
        // Vercel (cleanUrls) responde a *.html con 308 → la respuesta queda redirected:true
        // y Chrome rechaza servirla a una navegación: se re-empaqueta limpia antes de guardar.
        await Promise.allSettled(SHELL_ASSETS.map(async url => {
            try {
                const res = await fetch(new Request(url, { cache: 'reload' }));
                if (!res || !res.ok) throw new Error('HTTP ' + (res && res.status));
                const clean = res.redirected
                    ? new Response(res.body, { status: res.status, statusText: res.statusText, headers: res.headers })
                    : res;
                await cache.put(url, clean);
            } catch (err) {
                console.warn('[SW] precache miss', url, err);
            }
        }));
        await self.skipWaiting();
    })());
});

// ── Activate: clean old caches ──────────────────────────────────────────────
self.addEventListener('activate', event => {
    event.waitUntil((async () => {
        const keys = await caches.keys();
        const valid = new Set([SHELL_CACHE, TILES_CACHE, APIS_CACHE, IMAGES_CACHE]);
        await Promise.all(keys.map(k => valid.has(k) ? null : caches.delete(k)));
        await self.clients.claim();
    })());
});

// ── Fetch routing ───────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
    const req = event.request;
    if (req.method !== 'GET') return;

    const url = new URL(req.url);

    // Tiles (CartoDB / ArcGIS / OSM tiles)
    if (isTileRequest(url)) {
        event.respondWith(staleWhileRevalidate(req, TILES_CACHE, 200));
        return;
    }

    // Overpass (edificios OSM): respuesta grande y lenta, cambia poco → SWR (cache-first + refresco)
    if (/overpass-api\.de/.test(url.href)) {
        event.respondWith(staleWhileRevalidate(req, APIS_CACHE, 0));
        return;
    }

    // APIs externas (clima, mareas, aire, sol, wiki, nominatim)
    if (isApiRequest(url)) {
        event.respondWith(networkFirstWithTimeout(req, APIS_CACHE, 3000));
        return;
    }

    // Imágenes
    if (req.destination === 'image' || isImageRequest(url)) {
        event.respondWith(cacheFirst(req, IMAGES_CACHE, 80));
        return;
    }

    // events.json (agenda) → stale-while-revalidate desde SHELL_CACHE (donde se precachea en install):
    // el cron diario lo refresca y, en arranque offline en frío, sirve la copia precacheada en vez de fallar.
    if (url.origin === self.location.origin && url.pathname.endsWith('events.json')) {
        event.respondWith(staleWhileRevalidate(req, SHELL_CACHE, 0));
        return;
    }

    // GeoJSON pesados propios (fotos360, edificios) → SWR en DATA_CACHE sin versión:
    // sobreviven al bump del shell y se actualizan en segundo plano.
    if (url.origin === self.location.origin && url.pathname.endsWith('.geojson')) {
        event.respondWith(staleWhileRevalidate(req, DATA_CACHE, 0));
        return;
    }

    // Navegación HTML → red, fallback cache, fallback offline.html
    if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
        event.respondWith(networkFirstWithFallback(req));
        return;
    }

    // Shell propio (js/css/gpx…): SWR — sirve caché al instante y revalida en segundo plano,
    // así un cliente recurrente converge a la release nueva aunque un bump se olvide.
    if (url.origin === self.location.origin) {
        event.respondWith(staleWhileRevalidate(req, SHELL_CACHE, 0));
        return;
    }

    // Resto (CDNs pinneados por versión): cache first
    event.respondWith(cacheFirst(req, SHELL_CACHE, 0));
});

// ── Strategies ──────────────────────────────────────────────────────────────

async function cacheFirst(req, cacheName, maxEntries) {
    const cache = await caches.open(cacheName);
    const hit = await cache.match(req);
    if (hit) return hit;
    try {
        const res = await fetch(req);
        if (res && res.ok) {
            cache.put(req, res.clone());
            if (maxEntries > 0) trimCache(cacheName, maxEntries);
        }
        return res;
    } catch (err) {
        return hit || Response.error();
    }
}

async function staleWhileRevalidate(req, cacheName, maxEntries) {
    const cache = await caches.open(cacheName);
    const hit = await cache.match(req);
    const networkPromise = fetch(req).then(res => {
        if (res && res.ok) {
            cache.put(req, res.clone());
            if (maxEntries > 0) trimCache(cacheName, maxEntries);
        }
        return res;
    }).catch(() => null);
    return hit || (await networkPromise) || Response.error();
}

async function networkFirstWithTimeout(req, cacheName, timeoutMs) {
    const cache = await caches.open(cacheName);
    // AbortController de verdad: Promise.race dejaba el fetch vivo consumiendo red tras el timeout.
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
        const res = await fetch(req, { signal: ctrl.signal });
        clearTimeout(timer);
        if (res && res.ok) {
            cache.put(req, res.clone());
            return res;
        }
        // 4xx/5xx/429: mejor una copia buena cacheada que un error fresco.
        const hit = await cache.match(req);
        return hit || res;
    } catch (err) {
        clearTimeout(timer);
        const hit = await cache.match(req);
        if (hit) return hit;
        return Response.error();
    }
}

async function networkFirstWithFallback(req) {
    const shellCache = await caches.open(SHELL_CACHE);
    try {
        const res = await fetch(req);
        if (res && res.ok) {
            shellCache.put(req, res.clone());
        }
        return res;
    } catch (err) {
        // Sin red: página exacta (ignorando query como ?qr=…), luego el shell de su sección.
        const hit = await shellCache.match(req, { ignoreSearch: true });
        if (hit) return hit;
        const path = new URL(req.url).pathname;
        if (path.includes('kiosko')) {
            const k = (await shellCache.match('./kiosko')) || (await shellCache.match('./kiosko.html'));
            if (k) return k;
        }
        const index = (await shellCache.match('./')) || (await shellCache.match('./index.html'));
        if (index) return index;
        // El || anterior comparaba una Promise (siempre truthy): offline.html era inalcanzable.
        return (await shellCache.match('./offline.html')) || (await shellCache.match('./offline')) || Response.error();
    }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function isTileRequest(url) {
    // elevation-tiles-prod = DEM Terrarium (terreno 3D): son tiles de mapa, van al TILES_CACHE (SWR, 200),
    // no al IMAGES_CACHE (80) donde competirían con las fotos de negocios y provocarían thrash.
    return /basemaps\.cartocdn\.com|server\.arcgisonline\.com|tile\.openstreetmap\.org|elevation-tiles-prod\.s3\.amazonaws\.com|cartocdn\.com.*\/raster\//.test(url.href);
}

function isApiRequest(url) {
    return /api\.open-meteo\.com|marine-api\.open-meteo\.com|air-quality-api\.open-meteo\.com|api\.sunrise-sunset\.org|.+\.wikipedia\.org\/api|nominatim\.openstreetmap\.org/.test(url.href);
}

function isImageRequest(url) {
    return /\.(png|jpg|jpeg|webp|gif|svg)(\?|$)/i.test(url.pathname) || /images\.unsplash\.com/.test(url.href);
}

async function trimCache(cacheName, maxEntries) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    const excess = keys.length - maxEntries;
    if (excess > 0) {
        await Promise.all(keys.slice(0, excess).map(k => cache.delete(k)));
    }
}

// ── Message channel: allow page to trigger skipWaiting on update ───────────
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
