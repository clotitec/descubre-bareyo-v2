// Regresión: los edificios 3D (osm-buildings-3d) deben ser SÓLIDOS en el zoom por defecto.
// Bug histórico: fill-extrusion-opacity interpolaba a 0 en zoom 13 (= CONFIG.zoom), dejando los
// edificios invisibles en la vista inicial del mapa. Este test falla si la opacidad en z13 < 0.5.
import { readFileSync } from 'node:fs';

const appSrc = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const dataSrc = readFileSync(new URL('../data.js', import.meta.url), 'utf8');

// Zoom por defecto del mapa (CONFIG.zoom en data.js)
const zoomMatch = dataSrc.match(/zoom:\s*(\d+(?:\.\d+)?)/);
const defaultZoom = zoomMatch ? Number(zoomMatch[1]) : 13;

// Localizar la expresión de opacidad de los edificios y el primer stop de zoom (interpolate lineal).
const line = (appSrc.split('\n').find(l => l.includes("'fill-extrusion-opacity'")) || '').trim();
if (!line) {
    console.error('FAIL buildings-opacity: no se encontró fill-extrusion-opacity en app.js');
    process.exit(1);
}

// Caso 1: valor fijo -> 'fill-extrusion-opacity': 0.9
let opacityAtDefault = null;
const fixed = line.match(/'fill-extrusion-opacity':\s*([0-9.]+)\s*[,}]/);
if (fixed) {
    opacityAtDefault = Number(fixed[1]);
} else {
    // Caso 2: interpolate por zoom -> ['zoom'], z0, o0, z1, o1, ...  (evaluamos en defaultZoom)
    const inner = line.match(/\['zoom'\]\s*,\s*(.+)\]/);
    if (!inner) {
        console.error('FAIL buildings-opacity: expresión de opacidad no reconocida:', line);
        process.exit(1);
    }
    const nums = inner[1].split(',').map(s => Number(s.trim())).filter(n => !Number.isNaN(n));
    const stops = [];
    for (let i = 0; i + 1 < nums.length; i += 2) stops.push([nums[i], nums[i + 1]]);
    if (!stops.length) { console.error('FAIL buildings-opacity: sin stops'); process.exit(1); }
    const z = defaultZoom;
    if (z <= stops[0][0]) opacityAtDefault = stops[0][1];
    else if (z >= stops[stops.length - 1][0]) opacityAtDefault = stops[stops.length - 1][1];
    else {
        for (let i = 0; i < stops.length - 1; i++) {
            const [z0, o0] = stops[i], [z1, o1] = stops[i + 1];
            if (z >= z0 && z <= z1) { opacityAtDefault = o0 + (z - z0) / (z1 - z0) * (o1 - o0); break; }
        }
    }
}

if (opacityAtDefault === null || Number.isNaN(opacityAtDefault)) {
    console.error('FAIL buildings-opacity: no se pudo evaluar la opacidad en z' + defaultZoom);
    process.exit(1);
}
if (opacityAtDefault < 0.5) {
    console.error(`FAIL buildings-opacity: edificios casi invisibles en el zoom por defecto (opacidad@z${defaultZoom}=${opacityAtDefault.toFixed(2)})`);
    process.exit(1);
}
console.log(`OK buildings-opacity: opacidad@z${defaultZoom}=${opacityAtDefault.toFixed(2)} (edificios sólidos en la vista inicial)`);
process.exit(0);
