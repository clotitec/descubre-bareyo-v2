#!/usr/bin/env node
// build-edificios.mjs — pre-hornea assets/data/edificios.geojson desde OSM/Overpass.
//
// Por qué: en runtime Overpass falla con frecuencia (rate-limit, timeout, 504) y deja
// el mapa sin edificios 3D. Este script consulta Overpass UNA VEZ desde una máquina con
// internet, cachea el resultado como GeoJSON estático y lo commitea. La app carga ese
// fichero primero (loadBuildings en app.js) y solo cae a Overpass en vivo si no existe.
//
// USO (ejecutar desde una máquina CON internet, una sola vez):
//     node scripts/build-edificios.mjs
//   Luego commitear el fichero generado:
//     git add assets/data/edificios.geojson && git commit -m "chore: pre-hornea edificios 3D"
//
// NO ejecutar en CI ni en entornos con proxy que bloquee Overpass (devuelven HTML → JSON.parse
// falla). El script sale con código ≠ 0 si la respuesta no es JSON válido.
//
// Replica la lógica de js/geo.js → Geo.osmToBuildingsGeoJSON:
//   render_height     = tags.height | tags["building:levels"]*3.2 | 6
//   render_min_height = tags.min_height | tags["building:min_level"]*3.2 | 0
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OUT = join(ROOT, 'assets', 'data', 'edificios.geojson');

// Overpass bbox = "south,west,north,east".
// OSM_BBOX es el mismo que usa app.js (loadBuildings). Añadimos bboxes finas para
// los núcleos del municipio de Bareyo por si el bbox global no los cubre bien.
const OSM_BBOX = '43.455,-3.66,43.495,-3.58'; // mismo que app.js
const BBOXES = [
    OSM_BBOX,
    '43.485,-3.610,43.520,-3.560', // Ajo
    '43.455,-3.640,43.478,-3.605', // Bareyo (núcleo)
    '43.440,-3.640,43.470,-3.600', // Güemes
];

const ENDPOINTS = [
    'https://z.overpass-api.de/api/interpreter',
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
];

// ── Helpers portados 1:1 de js/geo.js ───────────────────────────────────────
function buildingHeightFromTags(tags) {
    tags = tags || {};
    const h = parseFloat(tags.height);
    if (!isNaN(h) && h > 0) return h;
    const lv = parseFloat(tags['building:levels']);
    if (!isNaN(lv) && lv > 0) return parseFloat((lv * 3.2).toFixed(2));
    return 6;
}
function buildingMinHeightFromTags(tags) {
    tags = tags || {};
    const mh = parseFloat(tags.min_height);
    if (!isNaN(mh) && mh > 0) return mh;
    const ml = parseFloat(tags['building:min_level']);
    if (!isNaN(ml) && ml > 0) return parseFloat((ml * 3.2).toFixed(2));
    return 0;
}
function ring(geometry) {
    const r = geometry.map((p) => [p.lon, p.lat]);
    const a = r[0], b = r[r.length - 1];
    if (a[0] !== b[0] || a[1] !== b[1]) r.push([a[0], a[1]]);
    return r;
}
function osmToBuildingsGeoJSON(osm) {
    const feats = [], els = (osm && osm.elements) || [];
    for (const el of els) {
        const props = {
            render_height: buildingHeightFromTags(el.tags),
            render_min_height: buildingMinHeightFromTags(el.tags),
        };
        if (el.type === 'way' && Array.isArray(el.geometry) && el.geometry.length >= 4) {
            feats.push({ type: 'Feature', properties: props, geometry: { type: 'Polygon', coordinates: [ring(el.geometry)] } });
        } else if (el.type === 'relation' && Array.isArray(el.members)) {
            const polys = el.members
                .filter((m) => m.role === 'outer' && Array.isArray(m.geometry) && m.geometry.length >= 4)
                .map((m) => [ring(m.geometry)]);
            if (polys.length) feats.push({ type: 'Feature', properties: props, geometry: { type: 'MultiPolygon', coordinates: polys } });
        }
    }
    return { type: 'FeatureCollection', features: feats };
}

// ── Fetch Overpass con failover de endpoint ──────────────────────────────────
async function overpassOnce(query) {
    let lastErr;
    for (const ep of ENDPOINTS) {
        try {
            const res = await fetch(ep, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    // Overpass (Apache) devuelve 406 a peticiones fetch/undici sin Accept/UA explícitos.
                    'Accept': '*/*',
                    'User-Agent': 'descubre-bareyo-build-edificios/1.0 (+https://descubre-bareyo-v2.vercel.app)',
                },
                body: 'data=' + encodeURIComponent(query),
            });
            const text = await res.text();
            if (!res.ok) throw new Error(`HTTP ${res.status} en ${ep}`);
            // Un proxy que bloquea Overpass devuelve HTML → esto revienta a propósito.
            let json;
            try { json = JSON.parse(text); }
            catch (_) { throw new Error(`Respuesta no-JSON de ${ep} (¿proxy/captcha?): ${text.slice(0, 120)}`); }
            return json;
        } catch (e) {
            lastErr = e;
            console.error(`  aviso: ${e.message}`);
        }
    }
    throw lastErr || new Error('Sin endpoints Overpass disponibles');
}

// Los mirrors públicos son inestables bajo carga (429/502/504 transitorios) — 3 intentos con
// backoff antes de rendirse, recorriendo ENDPOINTS en cada intento.
async function overpass(query, attempts = 3) {
    let lastErr;
    for (let a = 0; a < attempts; a++) {
        try {
            return await overpassOnce(query);
        } catch (e) {
            lastErr = e;
            if (a < attempts - 1) {
                const wait = 5000 * (a + 1);
                console.error(`  reintentando en ${wait / 1000}s…`);
                await new Promise((r) => setTimeout(r, wait));
            }
        }
    }
    throw lastErr;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
    const seen = new Set();      // dedup por id OSM entre bboxes solapadas
    const merged = [];
    for (let i = 0; i < BBOXES.length; i++) {
        const bbox = BBOXES[i];
        if (i > 0) await sleep(4000); // cortesía con el servicio público — evita 429 en bboxes consecutivas
        const q = `[out:json][timeout:60];(way["building"](${bbox});relation["building"](${bbox}););out geom;`;
        console.error(`Consultando bbox ${bbox} …`);
        const osm = await overpass(q);
        const els = (osm && osm.elements) || [];
        for (const el of els) {
            const key = `${el.type}/${el.id}`;
            if (seen.has(key)) continue;
            seen.add(key);
            merged.push(el);
        }
    }

    const fc = osmToBuildingsGeoJSON({ elements: merged });

    mkdirSync(dirname(OUT), { recursive: true });
    writeFileSync(OUT, JSON.stringify(fc), 'utf8');

    const sizeKB = Buffer.byteLength(JSON.stringify(fc), 'utf8') / 1024;
    console.error(JSON.stringify({
        elements: merged.length,
        features: fc.features.length,
        out: OUT,
        sizeKB: Math.round(sizeKB * 10) / 10,
    }, null, 2));
}

main().catch((e) => {
    console.error('ERROR:', e.message);
    process.exit(1);
});
