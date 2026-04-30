/* Descubre Bareyo — Service Worker
 * Estrategias:
 *   - Shell + GPX: Cache First, precachear en install
 *   - Tiles del mapa: Stale While Revalidate, max 200 entries
 *   - APIs (Open-Meteo, Sunrise-Sunset, Wikipedia, Nominatim): Network First, timeout 3s, fallback cache
 *   - Imágenes (assets, Unsplash): Cache First, max 80 entries
 *   - Navegación HTML: Network First → cache → offline.html
 * Bumpea CACHE_VERSION para invalidar al desplegar.
 */

const CACHE_VERSION = 'v1.2026.04.30';
const SHELL_CACHE   = `bareyo-shell-${CACHE_VERSION}`;
const TILES_CACHE   = `bareyo-tiles-${CACHE_VERSION}`;
const APIS_CACHE    = `bareyo-apis-${CACHE_VERSION}`;
const IMAGES_CACHE  = `bareyo-images-${CACHE_VERSION}`;

const SHELL_ASSETS = [
    './',
    './index.html',
    './app.js',
    './data.js',
    './styles.css',
    './manifest.json',
    './offline.html',
    './assets/logo.png',
    './assets/tracks/san_pedruco.gpx',
    './assets/tracks/cabo_ria_ajo.gpx',
    './assets/tracks/santa_maria.gpx',
    './assets/tracks/san_vicente.gpx',
    './assets/tracks/ruta_iglesias.gpx',
    'https://unpkg.com/maplibre-gl@4.1.2/dist/maplibre-gl.js',
    'https://unpkg.com/maplibre-gl@4.1.2/dist/maplibre-gl.css'
];

// ── Install: precache the shell ─────────────────────────────────────────────
self.addEventListener('install', event => {
    event.waitUntil((async () => {
        const cache = await caches.open(SHELL_CACHE);
        // addAll() falla si UN solo recurso falla. Cargamos uno a uno tolerando errores.
        await Promise.allSettled(SHELL_ASSETS.map(url =>
            cache.add(new Request(url, { cache: 'reload' })).catch(err =>
                console.warn('[SW] precache miss', url, err)
            )
        ));
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

    // Navegación HTML → red, fallback cache, fallback offline.html
    if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
        event.respondWith(networkFirstWithFallback(req));
        return;
    }

    // Shell por defecto: cache first
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
    try {
        const res = await Promise.race([
            fetch(req),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs))
        ]);
        if (res && res.ok) cache.put(req, res.clone());
        return res;
    } catch (err) {
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
        const hit = await shellCache.match(req);
        if (hit) return hit;
        const indexHit = await shellCache.match('./index.html');
        if (indexHit) return indexHit;
        return shellCache.match('./offline.html') || Response.error();
    }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function isTileRequest(url) {
    return /basemaps\.cartocdn\.com|server\.arcgisonline\.com|tile\.openstreetmap\.org|cartocdn\.com.*\/raster\//.test(url.href);
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
