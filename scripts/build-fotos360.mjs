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
        thumb: p.thumbnail_url,
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
  altitude: altStats,
  sizeKB: Math.round(sizeKB * 10) / 10,
}, null, 2));
