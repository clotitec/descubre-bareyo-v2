// ==================== geo.js ====================
// Helpers de geometría de ruta portados del Atlas Map Kit (Clotitec) a vanilla JS.
// Origen: atlas-map-kit/core/geo.ts (lógica plana, sin React). Ver memoria bareyo-atlas-vanilla.
//
// Aceptan AMBOS formatos de punto:
//   - array  [lng, lat, ele?]  (formato de data.js → route.coords)
//   - objeto { lng, lat, ele? }
// pointAtKm() siempre devuelve un objeto { lng, lat, ele }.
//
// Se expone como namespace global window.Geo para no colisionar con las
// funciones globales de app.js (el HTML llama por onclick a otras funciones).
(function () {
  'use strict';

  var R = 6371; // radio terrestre (km)

  function LNG(p) { return Array.isArray(p) ? p[0] : p.lng; }
  function LAT(p) { return Array.isArray(p) ? p[1] : p.lat; }
  function ELE(p) { return Array.isArray(p) ? (p[2] || 0) : (p.ele || 0); }

  // Distancia haversine en km entre dos puntos.
  function haversineKm(a, b) {
    var dLat = ((LAT(b) - LAT(a)) * Math.PI) / 180;
    var dLng = ((LNG(b) - LNG(a)) * Math.PI) / 180;
    var la1 = (LAT(a) * Math.PI) / 180;
    var la2 = (LAT(b) * Math.PI) / 180;
    var h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  // Índice de ruta: distancia acumulada por punto + total. Es lo que consume todo lo demás.
  // Devuelve { points:[{lng,lat,ele}], cumKm:[], totalKm }
  function buildRouteIndex(points) {
    var pts = points.map(function (p) { return { lng: LNG(p), lat: LAT(p), ele: ELE(p) }; });
    var cumKm = [0];
    for (var i = 1; i < pts.length; i++) {
      cumKm.push(cumKm[i - 1] + haversineKm(pts[i - 1], pts[i]));
    }
    return { points: pts, cumKm: cumKm, totalKm: cumKm[cumKm.length - 1] || 0 };
  }

  // Punto interpolado a una distancia km del inicio (con elevación).
  function pointAtKm(idx, km) {
    var k = Math.max(0, Math.min(km, idx.totalKm));
    var i = idx.cumKm.findIndex(function (c) { return c >= k; });
    if (i <= 0) return idx.points[0];
    var k0 = idx.cumKm[i - 1];
    var k1 = idx.cumKm[i];
    var t = k1 === k0 ? 0 : (k - k0) / (k1 - k0);
    var a = idx.points[i - 1];
    var b = idx.points[i];
    return {
      lng: a.lng + (b.lng - a.lng) * t,
      lat: a.lat + (b.lat - a.lat) * t,
      ele: a.ele + (b.ele - a.ele) * t,
    };
  }

  // Interpolación angular por el camino corto (grados 0-360). Suaviza el bearing de cámara.
  function lerpAngle(a, b, t) {
    var d = ((b - a + 540) % 360) - 180;
    return (a + d * t + 360) % 360;
  }

  // Diferencia angular con signo (-180..180).
  function angleDelta(from, to) {
    return ((to - from + 540) % 360) - 180;
  }

  // Rumbo en grados entre dos puntos.
  function bearing(a, b) {
    var la1 = (LAT(a) * Math.PI) / 180, la2 = (LAT(b) * Math.PI) / 180;
    var dLng = ((LNG(b) - LNG(a)) * Math.PI) / 180;
    var y = Math.sin(dLng) * Math.cos(la2);
    var x = Math.cos(la1) * Math.sin(la2) - Math.sin(la1) * Math.cos(la2) * Math.cos(dLng);
    return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  }

  // Remuestrea una polilínea a paso fijo en km (puntos equiespaciados por distancia).
  function resamplePath(points, stepKm) {
    stepKm = stepKm || 0.025;
    if (points.length < 2) return buildRouteIndex(points).points;
    var idx = buildRouteIndex(points);
    if (idx.totalKm <= stepKm * 2) return idx.points;
    var out = [];
    for (var k = 0; k < idx.totalKm; k += stepKm) out.push(pointAtKm(idx, k));
    out.push(idx.points[idx.points.length - 1]);
    return out;
  }

  // Suaviza una polilínea con media móvil por ventana de DISTANCIA real (remuestrea primero).
  // Pensada para la TRAYECTORIA DE CÁMARA del vuelo, no para la línea dibujada. windowKm=0 → original.
  function smoothPath(points, windowKm, passes, stepKm) {
    windowKm = windowKm == null ? 0.4 : windowKm;
    passes = passes || 2;
    stepKm = stepKm || 0.025;
    var base = buildRouteIndex(points).points;
    if (base.length < 5 || windowKm <= 0) return base;
    var pts = resamplePath(points, stepKm);
    var half = Math.max(2, Math.round(windowKm / stepKm / 2));
    for (var p = 0; p < passes; p++) {
      var out = pts.map(function (_, i) {
        var a = Math.max(0, i - half), b = Math.min(pts.length - 1, i + half);
        var lng = 0, lat = 0, ele = 0, n = 0;
        for (var j = a; j <= b; j++) { lng += pts[j].lng; lat += pts[j].lat; ele += pts[j].ele; n++; }
        return { lng: lng / n, lat: lat / n, ele: ele / n };
      });
      out[0] = pts[0];
      out[out.length - 1] = pts[pts.length - 1];
      pts = out;
    }
    return pts;
  }

  // km sobre la trayectoria del punto más cercano a una posición dada.
  function nearestKmOnPath(idx, p) {
    var best = 0, bestD = Infinity;
    for (var i = 0; i < idx.points.length; i++) {
      var d = haversineKm(idx.points[i], p);
      if (d < bestD) { bestD = d; best = i; }
    }
    return idx.cumKm[best];
  }

  // ── Helpers de edificios 3D (OSM/Overpass) ──────────────────────────────────
  function buildingHeightFromTags(tags) {
    tags = tags || {};
    var h = parseFloat(tags.height);
    if (!isNaN(h) && h > 0) return h;
    var lv = parseFloat(tags['building:levels']);
    if (!isNaN(lv) && lv > 0) return parseFloat((lv * 3.2).toFixed(2));
    return 6;
  }
  function buildingMinHeightFromTags(tags) {
    tags = tags || {};
    var mh = parseFloat(tags.min_height);
    if (!isNaN(mh) && mh > 0) return mh;
    var ml = parseFloat(tags['building:min_level']);
    if (!isNaN(ml) && ml > 0) return parseFloat((ml * 3.2).toFixed(2));
    return 0;
  }
  function _ring(geometry) {
    var r = geometry.map(function (p) { return [p.lon, p.lat]; });
    var a = r[0], b = r[r.length - 1];
    if (a[0] !== b[0] || a[1] !== b[1]) r.push([a[0], a[1]]);
    return r;
  }
  function osmToBuildingsGeoJSON(osm) {
    var feats = [], els = (osm && osm.elements) || [];
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      var props = { render_height: buildingHeightFromTags(el.tags), render_min_height: buildingMinHeightFromTags(el.tags) };
      if (el.type === 'way' && Array.isArray(el.geometry) && el.geometry.length >= 4) {
        feats.push({ type: 'Feature', properties: props, geometry: { type: 'Polygon', coordinates: [_ring(el.geometry)] } });
      } else if (el.type === 'relation' && Array.isArray(el.members)) {
        var polys = el.members
          .filter(function (m) { return m.role === 'outer' && Array.isArray(m.geometry) && m.geometry.length >= 4; })
          .map(function (m) { return [_ring(m.geometry)]; });
        if (polys.length) feats.push({ type: 'Feature', properties: props, geometry: { type: 'MultiPolygon', coordinates: polys } });
      }
    }
    return { type: 'FeatureCollection', features: feats };
  }

  window.Geo = {
    haversineKm: haversineKm,
    buildRouteIndex: buildRouteIndex,
    pointAtKm: pointAtKm,
    lerpAngle: lerpAngle,
    angleDelta: angleDelta,
    bearing: bearing,
    resamplePath: resamplePath,
    smoothPath: smoothPath,
    nearestKmOnPath: nearestKmOnPath,
    buildingHeightFromTags: buildingHeightFromTags,
    buildingMinHeightFromTags: buildingMinHeightFromTags,
    osmToBuildingsGeoJSON: osmToBuildingsGeoJSON,
  };
})();
