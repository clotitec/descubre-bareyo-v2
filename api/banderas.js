// api/banderas.js — Banderas de las playas de Bareyo (Cuberris + Antuerta).
// Réplica del sistema probado en Descubre Cantabria (F:\descubrecantabria):
//   1) OFICIAL — Cruz Roja, Plan de Vigilancia de Playas (fichaPlaya.do, POST).
//      Solo devuelve bandera en temporada vigilada. Cuberris = idPlaya 1014.
//      Antuerta NO está en el catálogo de Cruz Roja: nunca tendrá bandera oficial.
//   2) ESTIMADA (fallback) — Open-Meteo Marine por altura de ola, sin clave:
//      ≤0.6 m verde · ≤1.2 m amarilla · >1.2 m roja. Siempre marcada como estimación.
// El cron de vercel.json (cada 10 min) re-calienta la caché CDN (s-maxage=600),
// así el frontend siempre encuentra respuesta fresca sin esperar a los orígenes.

const FICHA_URL = 'https://www.cruzroja.es/appjv/consPlayas/fichaPlaya.do';

const PLAYAS = [
    { entityId: 'playa-cuberris', nombre: 'Playa de Ajo (Cuberris)', cruzRojaId: 1014, lat: 43.49894, lng: -3.61257 },
    { entityId: 'playa-ajo',      nombre: 'Playa de la Antuerta',    cruzRojaId: null, lat: 43.49817, lng: -3.62002 }
];

async function banderaOficial(idPlaya) {
    try {
        const res = await fetch(FICHA_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `action=&id=${idPlaya}&aplicacion=consultaPlayas&autonomia=&autonomia_id=`,
            signal: AbortSignal.timeout(8000)
        });
        if (!res.ok) return null;
        const html = new TextDecoder('iso-8859-1').decode(await res.arrayBuffer());
        const m = html.match(/ico_band_([a-z]+)\.gif/i);
        if (!m) return null;
        // negra (playa cerrada) se muestra como roja; blanca = sin servicio de vigilancia.
        const MAP = { verde: 'verde', amarilla: 'amarilla', roja: 'roja', negra: 'roja' };
        return MAP[m[1].toLowerCase()] || null;
    } catch (_) { return null; }
}

async function banderaEstimada(lat, lng) {
    try {
        const url = `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lng}&current=wave_height&timezone=Europe%2FMadrid`;
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) return null;
        const j = await res.json();
        const h = j && j.current && typeof j.current.wave_height === 'number' ? j.current.wave_height : null;
        if (h === null) return null;
        return { flag: h <= 0.6 ? 'verde' : h <= 1.2 ? 'amarilla' : 'roja', waveHeight: h };
    } catch (_) { return null; }
}

module.exports = async (req, res) => {
    const out = { updatedAt: new Date().toISOString(), playas: {} };

    await Promise.all(PLAYAS.map(async (p) => {
        let flag = null, origen = 'sin-datos', waveHeight = null;

        if (p.cruzRojaId) {
            flag = await banderaOficial(p.cruzRojaId);
            if (flag) origen = 'oficial';
        }
        if (!flag) {
            const est = await banderaEstimada(p.lat, p.lng);
            if (est) { flag = est.flag; origen = 'estimada'; waveHeight = est.waveHeight; }
        }

        out.playas[p.entityId] = { nombre: p.nombre, flag: flag || 'sin-dato', origen, waveHeight };
    }));

    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1200');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(200).json(out);
};
