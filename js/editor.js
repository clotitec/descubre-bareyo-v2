/* ═══════════════════════════════════════════════════════════════════════════
   MODO EDITOR DE CHINCHETAS — recolocar POIs sobre el mapa (uso interno Clotitec).

   Activación: ?editor=1 · sin el parámetro este fichero NO hace nada.
   Cargar DESPUÉS de app.js (usa openDetail/renderPoiLayer/map).

   Flujo: tocar cualquier POI (pin del mapa o item del menú) lo SELECCIONA para
   edición en vez de abrir su ficha → aparece una chincheta roja arrastrable →
   al soltarla, la entidad se mueve en vivo (renderPoiLayer) y el cambio queda
   en el panel y en localStorage (sobrevive recargas). "Copiar" exporta un
   bloque con las coords nuevas listo para pegar a Claude/data.js.

   Solo edita entidades puntuales (patrimonio/costa, negocios, 3D). Las rutas
   (hiking, línea GPX) no se editan aquí.
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
    'use strict';

    const qs = new URLSearchParams(window.location.search);
    if (qs.get('editor') !== '1') return;

    const LS_KEY = 'bareyo_editor_edits';
    let _edits = {};   // "type:id" -> { id, type, name, lng, lat }
    let _marker = null;
    let _current = null; // { item, type }

    try { _edits = JSON.parse(localStorage.getItem(LS_KEY) || '{}') || {}; } catch (_) { _edits = {}; }

    // ── Saltar la landing (mismo patrón que el modo kiosco) ──
    const landing = document.getElementById('landingPage');
    if (landing) landing.style.display = 'none';

    // ── Re-aplicar ediciones guardadas a las entidades ANTES del primer render ──
    function applySavedEdits() {
        Object.values(_edits).forEach(ed => {
            const ent = findEntity(ed.type, ed.id);
            if (ent && Array.isArray(ent.coords)) { ent.coords[0] = ed.lng; ent.coords[1] = ed.lat; }
        });
    }
    function findEntity(type, id) {
        try {
            const items = (typeof getItemsByType === 'function') ? getItemsByType(type) : [];
            return items.find(i => i.id === id) || null;
        } catch (_) { return null; }
    }
    applySavedEdits();

    // ── Interceptar openDetail: en modo editor, tocar un POI = seleccionarlo ──
    const _origOpenDetail = window.openDetail;
    window.openDetail = function (item, type) {
        if (type === 'hiking') {
            setStatus('Las rutas (líneas GPX) no se editan aquí. Toca un punto: patrimonio, negocio o 3D.');
            return;
        }
        selectForEdit(item, type);
    };

    function selectForEdit(item, type) {
        if (!item || !Array.isArray(item.coords)) return;
        _current = { item, type };
        if (_marker) { _marker.remove(); _marker = null; }

        const el = document.createElement('div');
        el.innerHTML = `<div style="width:34px;height:34px;position:relative;">
            <span style="position:absolute;inset:0;background:#E11D48;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 2px 10px rgba(0,0,0,.45);"></span>
            <span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#fff;font-size:15px;">✥</span>
        </div>`;
        el.style.cursor = 'grab';

        _marker = new maplibregl.Marker({ element: el, draggable: true, anchor: 'bottom' })
            .setLngLat([item.coords[0], item.coords[1]])
            .addTo(map);

        _marker.on('drag', () => {
            const p = _marker.getLngLat();
            setStatus(`<b>${esc(item.name)}</b> → ${p.lat.toFixed(6)}, ${p.lng.toFixed(6)}`);
        });
        _marker.on('dragend', () => {
            const p = _marker.getLngLat();
            commitEdit(item, type, p.lng, p.lat);
        });

        try { map.easeTo({ center: [item.coords[0], item.coords[1]], zoom: Math.max(map.getZoom(), 15.5), duration: 600 }); } catch (_) {}
        setStatus(`<b>${esc(item.name)}</b> seleccionado — arrastra la chincheta roja a su sitio exacto.`);
    }

    function commitEdit(item, type, lng, lat) {
        item.coords[0] = lng;
        item.coords[1] = lat;
        _edits[type + ':' + item.id] = { id: item.id, type, name: item.name, lng: +lng.toFixed(6), lat: +lat.toFixed(6) };
        try { localStorage.setItem(LS_KEY, JSON.stringify(_edits)); } catch (_) {}
        try { if (typeof renderPoiLayer === 'function') renderPoiLayer(); } catch (_) {}
        renderPanel();
        setStatus(`<b>${esc(item.name)}</b> movido a ${lat.toFixed(6)}, ${lng.toFixed(6)} ✓ (guardado)`);
    }

    // ── Panel de cambios + exportación ──
    function exportText() {
        const rows = Object.values(_edits);
        if (!rows.length) return '(sin cambios)';
        let txt = '// Coordenadas corregidas con ?editor=1 el ' + new Date().toISOString().slice(0, 10) + '\n';
        txt += '// Formato data.js: coords: [lng, lat]\n';
        rows.forEach(ed => {
            txt += `${ed.type} · id "${ed.id}" (${ed.name}) → coords: [${ed.lng}, ${ed.lat}],\n`;
        });
        return txt;
    }

    function renderPanel() {
        const list = document.getElementById('editorList');
        if (!list) return;
        const rows = Object.values(_edits);
        list.innerHTML = rows.length
            ? rows.map(ed => `<div class="editor-row"><b>${esc(ed.name)}</b><span>${ed.lat}, ${ed.lng}</span></div>`).join('')
            : '<div class="editor-row editor-row-empty">Aún no hay cambios. Toca un POI del mapa o del menú.</div>';
        const n = document.getElementById('editorCount');
        if (n) n.textContent = rows.length;
    }

    function setStatus(html) {
        const s = document.getElementById('editorStatus');
        if (s) s.innerHTML = html;
    }

    function esc(s) { return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

    // ── UI ──
    const style = document.createElement('style');
    style.textContent = `
      .editor-bar { position: fixed; top: 0; left: 0; right: 0; z-index: 200; background: #E11D48; color: #fff;
        font: 600 13px/1.3 system-ui, sans-serif; padding: 8px 14px; display: flex; gap: 14px; align-items: center; }
      .editor-bar b { font-weight: 800; }
      .editor-panel { position: fixed; right: 12px; bottom: 12px; z-index: 200; width: min(340px, calc(100vw - 24px));
        background: #fff; color: #1a2332; border-radius: 14px; box-shadow: 0 12px 40px rgba(0,0,0,.35);
        font: 400 13px/1.4 system-ui, sans-serif; overflow: hidden; }
      .editor-panel-head { display: flex; align-items: center; gap: 8px; padding: 10px 14px; background: #1a2332; color: #fff; font-weight: 700; }
      .editor-panel-head .chip { background: #E11D48; border-radius: 99px; padding: 1px 9px; font-size: 12px; }
      .editor-list { max-height: 32vh; overflow: auto; }
      .editor-row { display: flex; justify-content: space-between; gap: 10px; padding: 8px 14px; border-bottom: 1px solid #eee; }
      .editor-row span { font-family: ui-monospace, Consolas, monospace; font-size: 12px; color: #555; }
      .editor-row-empty { color: #777; }
      .editor-actions { display: flex; gap: 8px; padding: 10px 14px; }
      .editor-actions button { flex: 1; border: 0; border-radius: 9px; padding: 9px 10px; font: 700 13px system-ui; cursor: pointer; }
      .editor-copy { background: #1A4D2E; color: #fff; }
      .editor-clear { background: #eee; color: #333; }
      .editor-status { padding: 8px 14px 12px; color: #333; min-height: 20px; }
    `;
    document.head.appendChild(style);

    const bar = document.createElement('div');
    bar.className = 'editor-bar';
    bar.innerHTML = '<b>MODO EDITOR</b> Toca un POI (mapa o menú) para seleccionarlo, arrastra la chincheta roja y pulsa Copiar al terminar. Salir: quita ?editor=1 de la URL.';
    document.body.appendChild(bar);

    const panel = document.createElement('div');
    panel.className = 'editor-panel';
    panel.innerHTML = `
      <div class="editor-panel-head">Cambios <span class="chip" id="editorCount">0</span></div>
      <div class="editor-list" id="editorList"></div>
      <div class="editor-status" id="editorStatus"></div>
      <div class="editor-actions">
        <button class="editor-copy" id="editorCopyBtn">📋 Copiar</button>
        <button class="editor-clear" id="editorClearBtn">Vaciar</button>
      </div>`;
    document.body.appendChild(panel);

    document.getElementById('editorCopyBtn').addEventListener('click', () => {
        const txt = exportText();
        const done = () => setStatus('Copiado al portapapeles ✓ — pégaselo a Claude para fijarlo en data.js.');
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(txt).then(done, () => { window.prompt('Copia manualmente:', txt); });
        } else {
            window.prompt('Copia manualmente:', txt);
        }
    });
    document.getElementById('editorClearBtn').addEventListener('click', () => {
        if (!window.confirm('¿Vaciar todos los cambios del editor? (No toca data.js: solo descarta lo movido en esta pantalla.)')) return;
        _edits = {};
        try { localStorage.removeItem(LS_KEY); } catch (_) {}
        if (_marker) { _marker.remove(); _marker = null; }
        renderPanel();
        setStatus('Cambios vaciados. Recarga la página para ver las posiciones originales de data.js.');
    });

    renderPanel();
    console.info('[editor] modo editor de chinchetas activo — openDetail interceptado (original disponible en _origOpenDetail)', !!_origOpenDetail);
})();
