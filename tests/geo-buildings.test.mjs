import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const code = readFileSync(new URL('../js/geo.js', import.meta.url), 'utf8');
const window = {};
new Function('window', code)(window);
const Geo = window.Geo;

// altura: height > levels*3.2 > fallback 6
assert.equal(Geo.buildingHeightFromTags({ height: '12' }), 12);
assert.equal(Geo.buildingHeightFromTags({ 'building:levels': '3' }), 9.6);
assert.equal(Geo.buildingHeightFromTags({}), 6);
assert.equal(Geo.buildingMinHeightFromTags({}), 0);

// conversión: way con geometry → Polygon cerrado con altura
const osm = { elements: [
  { type: 'way', tags: { building: 'yes', 'building:levels': '2' },
    geometry: [{lon:-3.6,lat:43.4},{lon:-3.59,lat:43.4},{lon:-3.59,lat:43.41},{lon:-3.6,lat:43.41}] }
]};
const gj = Geo.osmToBuildingsGeoJSON(osm);
assert.equal(gj.type, 'FeatureCollection');
assert.equal(gj.features.length, 1);
assert.equal(gj.features[0].geometry.type, 'Polygon');
const ring = gj.features[0].geometry.coordinates[0];
assert.deepEqual(ring[0], ring[ring.length - 1]); // anillo cerrado
assert.equal(gj.features[0].properties.render_height, 6.4); // 2*3.2

console.log('OK geo-buildings: ' + gj.features.length + ' feature(s)');
