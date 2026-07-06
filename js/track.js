/* Descubre Bareyo — Analytics tracker
 *
 * track(type, payload) → registra un evento.
 * Si Supabase está configurado, hace POST a /rest/v1/events.
 * Si no, o si offline, guarda en IndexedDB y reenvía al volver red.
 * Sin cookies, sin IPs, sin user-agent identificador.
 */

(function () {
    'use strict';

    const CFG = window.BAREYO_CONFIG || {};
    const SUPA_URL = CFG.SUPABASE_URL;
    const SUPA_KEY = CFG.SUPABASE_ANON_KEY;
    const SUPA_OK = !!(SUPA_URL && SUPA_KEY);

    // ── Session ID (anónimo, persistente en localStorage) ──────────────────
    function getSessionId() {
        let sid = localStorage.getItem('bareyo_session_id');
        if (!sid) {
            sid = 'sess-' + Math.random().toString(36).slice(2, 10) + '-' + Date.now().toString(36);
            localStorage.setItem('bareyo_session_id', sid);
        }
        return sid;
    }

    function getDevice() {
        const w = window.innerWidth || 1024;
        if (w < 600) return 'mobile';
        if (w < 1024) return 'tablet';
        return 'desktop';
    }

    function getLang() {
        return (typeof currentLang !== 'undefined' && currentLang) || (navigator.language || 'es').slice(0, 2);
    }

    // ── IndexedDB buffer for offline ───────────────────────────────────────
    const DB_NAME = 'bareyo_analytics';
    const STORE = 'pending_events';

    function openDb() {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(DB_NAME, 1);
            req.onupgradeneeded = () => {
                req.result.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror   = () => reject(req.error);
        });
    }

    async function bufferEvent(evt) {
        try {
            const db = await openDb();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE, 'readwrite');
                tx.objectStore(STORE).add(evt);
                tx.oncomplete = () => resolve();
                tx.onerror    = () => reject(tx.error);
            });
        } catch (_) {
            // Fallback: localStorage append
            try {
                const list = JSON.parse(localStorage.getItem('bareyo_events_local') || '[]');
                list.push(evt);
                if (list.length > 500) list.splice(0, list.length - 500);
                localStorage.setItem('bareyo_events_local', JSON.stringify(list));
            } catch (_) {}
        }
    }

    async function flushBuffer() {
        if (!SUPA_OK || !navigator.onLine) return;
        try {
            const db = await openDb();
            // Leemos valores Y claves dentro de la MISMA transacción de lectura,
            // para poder borrar después exactamente los registros enviados
            // (nunca los que se hayan encolado mientras el POST estaba en vuelo).
            const { keys, evts } = await new Promise((resolve, reject) => {
                const tx = db.transaction(STORE, 'readonly');
                const store = tx.objectStore(STORE);
                const keysReq = store.getAllKeys();
                const valsReq = store.getAll();
                tx.oncomplete = () => resolve({ keys: keysReq.result || [], evts: valsReq.result || [] });
                tx.onerror    = () => reject(tx.error);
            });
            if (!evts.length) return;
            const ok = await sendBatch(evts.map(({ id, ...rest }) => rest));
            if (ok) {
                // Borrado por clave: si durante el POST se encoló algún evento
                // nuevo, sobrevive (ya no se hace clear() de todo el store).
                await new Promise((resolve, reject) => {
                    const tx = db.transaction(STORE, 'readwrite');
                    const store = tx.objectStore(STORE);
                    keys.forEach(k => store.delete(k));
                    tx.oncomplete = () => resolve();
                    tx.onerror    = () => reject(tx.error);
                });
            }
            // Si ok es false no se borra nada: el próximo flush reintenta estos mismos registros.
        } catch (_) {}
    }

    async function sendBatch(events) {
        if (!SUPA_OK) return false;
        try {
            const res = await fetch(`${SUPA_URL}/rest/v1/events`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': SUPA_KEY,
                    'Authorization': `Bearer ${SUPA_KEY}`,
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify(events)
            });
            return res.ok;
        } catch (_) {
            return false;
        }
    }

    // ── Public API ─────────────────────────────────────────────────────────
    window.track = function (type, payload) {
        const evt = {
            ts:           new Date().toISOString(),
            type:         type,
            entity_id:    (payload && payload.entity_id) || null,
            entity_type:  (payload && payload.entity_type) || null,
            qr_id:        (payload && payload.qr_id) || null,
            device:       getDevice(),
            lang:         getLang(),
            session_id:   getSessionId(),
            meta:         (payload && payload.meta) || {}
        };

        if (SUPA_OK) {
            if (navigator.onLine) {
                sendBatch([evt]).then(ok => { if (!ok) bufferEvent(evt); });
            } else {
                bufferEvent(evt);
            }
        }
        // Si !SUPA_OK (modo demo, sin Supabase configurado) no bufferizamos en
        // IndexedDB: nunca habría un flush que lo vaciara y crecería sin límite.
        // El fallback a localStorage de abajo ya cubre la telemetría en demo.

        // Always log to localStorage too — dashboard works in demo mode without Supabase
        try {
            const list = JSON.parse(localStorage.getItem('bareyo_events_local') || '[]');
            list.push(evt);
            if (list.length > 500) list.splice(0, list.length - 500);
            localStorage.setItem('bareyo_events_local', JSON.stringify(list));
        } catch (_) {}
    };

    window.flushAnalytics = flushBuffer;

    // Auto-flush when online
    window.addEventListener('online', flushBuffer);
    setTimeout(flushBuffer, 5000);

    // Initial pageview (after page load)
    window.addEventListener('load', () => {
        setTimeout(() => window.track('pageview', { meta: { path: location.pathname } }), 500);
    });
})();
