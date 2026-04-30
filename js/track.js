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
            const evts = await new Promise((resolve, reject) => {
                const tx = db.transaction(STORE, 'readonly');
                const req = tx.objectStore(STORE).getAll();
                req.onsuccess = () => resolve(req.result || []);
                req.onerror   = () => reject(req.error);
            });
            if (!evts.length) return;
            const ok = await sendBatch(evts.map(({ id, ...rest }) => rest));
            if (ok) {
                await new Promise((resolve, reject) => {
                    const tx = db.transaction(STORE, 'readwrite');
                    tx.objectStore(STORE).clear();
                    tx.oncomplete = () => resolve();
                    tx.onerror    = () => reject(tx.error);
                });
            }
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

        if (SUPA_OK && navigator.onLine) {
            sendBatch([evt]).then(ok => { if (!ok) bufferEvent(evt); });
        } else {
            bufferEvent(evt);
        }

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
