#!/usr/bin/env node
// build-fotos360.mjs — genera assets/data/fotos360.geojson desde los 3 JSON de "json de rutas".
// Solo incluye fotos con status === "PUBLISHED". No toca data.js.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SRC_DIR = join(ROOT, 'json de rutas');
const OUT = join(ROOT, 'assets', 'data', 'fotos360.geojson');

const SOURCES = ['bareyoapp.json', 'iglesias_bareyo.json', 'santa_maria_bareyo_dron.json'];

const round = (n) => (typeof n === 'number' && Number.isFinite(n) ? Math.round(n) : null);

// Miniatura ESTABLE derivada del pano ID del share_link (streetviewpixels-pa no
// caduca, a diferencia de las URLs firmadas gpms-cs-s de thumbnail_url, que
// expiran con 403 a los pocos meses — verificado 2026-07-16: 30/30 muertas).
// El endpoint solo sirve panos con ID de 22 caracteres (1.049 de 6.080 fotos);
// para el resto se OMITE thumb: la app ya degrada (popup sin foto, tira con
// icono neutro, visor 360 intacto porque usa el pano ID, no esta URL).
const PANO_RE = /!1s([^!]+)!/;
const stableThumb = (shareLink, heading) => {
  const m = PANO_RE.exec(shareLink || '');
  const pid = m && m[1];
  if (!pid || pid.length !== 22) return undefined;
  const yaw = Number.isFinite(heading) ? Math.round(heading) : 0;
  return 'https://streetviewpixels-pa.googleapis.com/v1/thumbnail?panoid=' +
    encodeURIComponent(pid) + '&cb_client=maps_sv.tactile.gps&w=512&h=256&yaw=' + yaw + '&pitch=0';
};

const features = [];
const perDataset = {};
let droneCount = 0;
const altitudes = [];

for (const file of SOURCES) {
  const raw = JSON.parse(readFileSync(join(SRC_DIR, file), 'utf8'));
  const ds = raw.place_name;
  const src = raw.photo_type || 'general';
  const photos = Array.isArray(raw.photos) ? raw.photos : [];
  let kept = 0;
  for (const p of photos) {
    if (p.status !== 'PUBLISHED') continue;
    const drone = src === 'dron';
    const alt = p.altitude == null ? null : p.altitude;
    if (alt != null) altitudes.push(alt);
    if (drone) droneCount++;
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
      properties: {
        id: p.id,
        ds,
        src,
        h: round(p.heading),
        alt,
        drone,
        thumb: stableThumb(p.share_link, p.heading),
        link: p.share_link,
      },
    });
    kept++;
  }
  perDataset[ds] = kept;
}

const fc = { type: 'FeatureCollection', features };

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(fc), 'utf8');

// --- Report ---
const median = (arr) => {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

const altStats = altitudes.length
  ? {
      count: altitudes.length,
      min: Math.min(...altitudes),
      max: Math.max(...altitudes),
      median: median(altitudes),
      gt10: altitudes.filter((a) => a > 10).length,
    }
  : { count: 0 };

const sizeKB = Buffer.byteLength(JSON.stringify(fc), 'utf8') / 1024;

console.log(JSON.stringify({
  total: features.length,
  perDataset,
  droneCount,
  withThumb: features.filter((f) => f.properties.thumb).length,
  altitude: altStats,
  sizeKB: Math.round(sizeKB * 10) / 10,
}, null, 2));
