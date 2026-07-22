/* ═══════════════════════════════════════════════════════════════════════════
   MODO KIOSCO — Descubre Bareyo en pantalla táctil grande (75" landscape).

   Activación: ?kiosco=1 (persiste en sessionStorage para sobrevivir a reloads
   del propio tótem) · desactivación: ?kiosco=0. En modo normal este fichero
   NO hace nada (sale en la primera comprobación): móvil/desktop intactos.

   Qué añade cuando está activo:
   - Salta la landing y entra directo al mapa, sin tutorial (bootApp lo lee).
   - La ficha de detalle pasa a panel lateral derecho fijo (~420px) — eso es
     CSS puro gateado por html[data-kiosco="1"] en styles-v3.css.
   - QR "llévatelo en tu móvil" en cada ficha (qrcode-generator vía CDN, que
     expone window.qrcode; el build de node-qrcode no existe en el CDN).
   - Modo atracción: 90 s sin tocar → reset de la app (cierra fichas/overlays,
     para audio, re-encuadra el mapa) + overlay a pantalla completa con
     slideshow y "Toca para explorar Bareyo". Cualquier toque lo cierra.
   - Restricciones: sin pinch-zoom del navegador (viewport + touch-action; los
     gestos del MAPA no se tocan), sin menú contextual, sin selección de texto,
     cursor oculto (CSS) y enlaces externos/tel:/mailto: bloqueados.

   DEBE cargarse ANTES que app.js: window.KIOSCO se consulta en el boot y en
   renderDetailActions/openDetail.
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
    'use strict';

    // ── Activación: ?kiosco=1 enciende · ?kiosco=0 apaga · sessionStorage persiste ──
    let kioscoOn = false;
    try {
        const qs = new URLSearchParams(window.location.search);
        const param = qs.get('kiosco');
        if (param === '0') sessionStorage.removeItem('bareyo_kiosco');
        kioscoOn = param === '1' || (param !== '0' && sessionStorage.getItem('bareyo_kiosco') === '1');
        if (kioscoOn) sessionStorage.setItem('bareyo_kiosco', '1');
    } catch (_) {
        // sessionStorage bloqueado (privacidad): sin persistencia, solo query param
        kioscoOn = /[?&]kiosco=1(?:&|$)/.test(window.location.search);
    }
    if (!kioscoOn) return;

    window.KIOSCO = true;
    document.documentElement.setAttribute('data-kiosco', '1');

    const IDLE_MS = 90000;   // inactividad hasta el modo atracción
    const SLIDE_MS = 9000;   // rotación del slideshow del atractor
    // URL pública para los QR "llévatelo en tu móvil": el propio origen si es web
    // (sobrevive al cambio de dominio a descubrebareyo.vercel.app); fallback al
    // dominio v2 solo si el tótem corriera en local.
    const PUBLIC_URL = (/^https?:$/.test(window.location.protocol) && !/^(localhost|127\.0\.0\.1)$/.test(window.location.hostname))
        ? window.location.origin + '/'
        : 'https://descubre-bareyo-v2.vercel.app/';
    // Fotos del atractor. Con una sola imagen hace Ken Burns continuo; al añadir
    // más (p. ej. assets/kiosco/*.webp cuando el cliente entregue fotos) rota solas.
    const SLIDES = ['assets/og-cover.jpg'];

    // ── Saltar la landing: el load de app.js ve display:none y arranca el mapa ──
    const landing = document.getElementById('landingPage');
    if (landing) landing.style.display = 'none';

    // ── Sin pinch-zoom/doble-tap zoom DEL NAVEGADOR. MapLibre pone su propio
    //    touch-action en el canvas, así que los gestos del mapa siguen vivos. ──
    const vp = document.querySelector('meta[name="viewport"]');
    if (vp) vp.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');

    // ── Bloqueos: menú contextual (long-press) y navegación fuera de la app ──
    document.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('click', e => {
        const a = e.target && e.target.closest ? e.target.closest('a') : null;
        if (!a) return;
        const href = a.getAttribute('href') || '';
        const external = a.target === '_blank'
            || /^(tel|mailto|sms):/i.test(href)
            || (a.origin && a.origin !== window.location.origin);
        if (external) { e.preventDefault(); e.stopPropagation(); }
    }, true);

    // ── QR por ficha: cargar qrcode-generator solo en modo kiosco ──
    let _qrPending = null; // ficha abierta antes de que cargue la librería
    const qrLib = document.createElement('script');
    qrLib.src = 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js';
    qrLib.onload = () => { if (_qrPending) window.kioscoDetailQr(_qrPending.item, _qrPending.type); };
    document.head.appendChild(qrLib);

    // Hook llamado desde openDetail() (app.js) cada vez que se abre/re-etiqueta una ficha.
    window.kioscoDetailQr = function (item, type) {
        const section = document.getElementById('detailKioscoQrSection');
        const img = document.getElementById('detailKioscoQrImg');
        if (!section || !img || !item) return;
        // Los NEGOCIOS no llevan QR "llévatelo en tu móvil" (decisión 2026-07-16):
        // tiene sentido para patrimonio/rutas/3D; en la ficha de un comercio sobra.
        if (type === 'biz') { section.style.display = 'none'; return; }
        if (typeof window.qrcode !== 'function') { _qrPending = { item, type }; return; }
        _qrPending = null;

        const SK = { hiking: 'ruta', costa: 'patrimonio', biz: 'negocio', '3d': '3d' };
        const sk = SK[type];
        const ref = (typeof slugify === 'function') ? slugify(item.name) : item.id;
        const url = PUBLIC_URL + '#' + (sk
            ? sk + '=' + encodeURIComponent(ref)
            : 'item=' + encodeURIComponent(item.id));
        try {
            const qr = window.qrcode(0, 'M');
            qr.addData(url);
            qr.make();
            img.src = qr.createDataURL(8, 8);
        } catch (err) {
            console.warn('[kiosco] QR no generado:', err);
            section.style.display = 'none';
            return;
        }
        // Textos localizados: el hook se re-ejecuta al cambiar de idioma (reopen de la ficha)
        if (typeof t === 'function') {
            const title = document.getElementById('detailKioscoQrTitle');
            const sub = document.getElementById('detailKioscoQrSub');
            if (title && t('kioscoQrTitle')) title.textContent = t('kioscoQrTitle');
            if (sub && t('kioscoQrSub')) sub.textContent = t('kioscoQrSub');
        }
        section.style.display = 'block';
    };

    // ── Selector de idioma con banderas (ES / EN / FR), siempre visible ──────
    // El botón de ciclo de la toolbar sigue existiendo; esto es el acceso directo
    // táctil para visitantes (decisión 2026-07-16). Llama a setLanguage() de app.js.
    const KIOSCO_FLAGS = {
        es: '<svg viewBox="0 0 60 40" aria-hidden="true"><rect width="60" height="40" fill="#AA151B"/><rect y="10" width="60" height="20" fill="#F1BF00"/></svg>',
        en: '<svg viewBox="0 0 60 40" aria-hidden="true"><rect width="60" height="40" fill="#012169"/><path d="M0 0l60 40M60 0L0 40" stroke="#fff" stroke-width="8"/><path d="M0 0l60 40M60 0L0 40" stroke="#C8102E" stroke-width="5"/><path d="M30 0v40M0 20h60" stroke="#fff" stroke-width="13"/><path d="M30 0v40M0 20h60" stroke="#C8102E" stroke-width="8"/></svg>',
        fr: '<svg viewBox="0 0 60 40" aria-hidden="true"><rect width="20" height="40" fill="#002395"/><rect x="20" width="20" height="40" fill="#fff"/><rect x="40" width="20" height="40" fill="#ED2939"/></svg>'
    };

    function syncLangBar() {
        const lang = (typeof currentLang === 'string') ? currentLang : 'es';
        document.querySelectorAll('.kiosco-lang-btn').forEach(b =>
            b.classList.toggle('is-active', b.getAttribute('data-klang') === lang));
    }
    // setLanguage() (app.js) avisa por este hook tras cada cambio de idioma
    window.kioscoOnLangChange = syncLangBar;

    (function buildLangBar() {
        if (document.getElementById('kioscoLangBar')) return;
        const bar = document.createElement('div');
        bar.id = 'kioscoLangBar';
        bar.setAttribute('role', 'group');
        bar.setAttribute('aria-label', 'Idioma / Language / Langue');
        bar.innerHTML = ['es', 'en', 'fr'].map(l =>
            `<button type="button" class="kiosco-lang-btn" data-klang="${l}">${KIOSCO_FLAGS[l]}<span>${l.toUpperCase()}</span></button>`
        ).join('');
        bar.addEventListener('click', e => {
            const b = e.target && e.target.closest ? e.target.closest('[data-klang]') : null;
            if (b && typeof setLanguage === 'function') setLanguage(b.getAttribute('data-klang'));
        });
        document.body.appendChild(bar);
        syncLangBar();
    })();

    // ── Modo atracción (idle 90 s) ──────────────────────────────────────────
    let idleTimer = null;
    let slideTimer = null;
    let attractOn = false;

    function resetIdle() {
        clearTimeout(idleTimer);
        idleTimer = setTimeout(showAttract, IDLE_MS);
    }

    ['pointerdown', 'pointermove', 'touchstart', 'keydown', 'wheel'].forEach(ev =>
        document.addEventListener(ev, () => { if (!attractOn) resetIdle(); }, { passive: true, capture: true })
    );

    // Reset de la app al estado inicial: se hace al ENTRAR en atracción para que
    // el siguiente visitante encuentre el mapa recién puesto.
    function kioscoResetApp() {
        try { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); } catch (_) {}
        try {
            const dm = document.getElementById('detailModal');
            if (dm && dm.classList.contains('active') && typeof closeDetail === 'function') closeDetail();
            const em = document.getElementById('eventModal');
            if (em && em.classList.contains('active') && typeof closeEventDetail === 'function') closeEventDetail();
            if (typeof closeF360Viewer === 'function') closeF360Viewer();
            const tut = document.getElementById('tutorialOverlay');
            if (tut && tut.style.display !== 'none' && typeof closeTutorial === 'function') closeTutorial();
            document.querySelectorAll('.floating-expand-panel.active').forEach(p => p.classList.remove('active'));
            if (typeof setToolbarMore === 'function') setToolbarMore(false);
            const inp = document.getElementById('cajonSearch');
            if (inp && inp.value && typeof cajonClearSearch === 'function') cajonClearSearch();
            // Re-encuadre a la vista inicial (centro/zoom/pitch de CONFIG)
            if (typeof resetView === 'function' && typeof mapInitialized !== 'undefined' && mapInitialized) resetView();
        } catch (err) {
            console.warn('[kiosco] reset parcial:', err);
        }
    }

    function showAttract() {
        const ov = document.getElementById('kioscoAttract');
        if (!ov || attractOn) return;
        attractOn = true;
        kioscoResetApp();
        const cta = document.getElementById('kioscoAttractCta');
        if (cta && typeof t === 'function' && t('kioscoTouch')) cta.textContent = t('kioscoTouch');
        buildAttractMenu();
        ov.hidden = false;
        requestAnimationFrame(() => ov.classList.add('is-on'));
        startSlides();
    }

    // Menú de CTAs del atractor: un tile por rama del navegador (CAJON_BRANCHES),
    // con su color de marca, emoji y contador. Se reconstruye en cada entrada al
    // atractor para recoger idioma y contadores actualizados.
    function buildAttractMenu() {
        const menu = document.getElementById('kioscoAttractMenu');
        if (!menu || typeof CAJON_BRANCHES === 'undefined') return;
        try {
            const esc = (typeof escapeHTML === 'function') ? escapeHTML : (s => String(s));
            menu.innerHTML = CAJON_BRANCHES.map(br => {
                let count = '';
                try {
                    const n = (typeof _cajonBranchItems === 'function') ? _cajonBranchItems(br.key, '').length : 0;
                    if (n) count = `<span class="kiosco-attract-tile-count">${n}</span>`;
                } catch (_) {}
                const label = (typeof t === 'function' && t(br.i18n)) ? t(br.i18n) : br.key;
                // Icono a medida de la rama (BRANCH_ICONS, app.js); emoji solo de fallback
                const ic = (typeof BRANCH_ICONS !== 'undefined' && BRANCH_ICONS[br.key])
                    ? `<span class="kiosco-attract-tile-ic" aria-hidden="true">${BRANCH_ICONS[br.key]}</span>`
                    : `<span class="kiosco-attract-tile-emoji" aria-hidden="true">${br.emoji}</span>`;
                return `<button type="button" class="kiosco-attract-tile" data-kbranch="${esc(br.key)}" style="--tile-color:${br.color}">
                    ${ic}
                    <span class="kiosco-attract-tile-label">${esc(label)}${count}</span>
                </button>`;
            }).join('');
        } catch (err) {
            console.warn('[kiosco] menú del atractor no construido:', err);
        }
    }

    // Abrir una rama del cajón (tocada en un tile del atractor): vista árbol,
    // solo esa rama expandida y llevada a la vista.
    function kioscoOpenBranch(key) {
        try {
            if (typeof cajonSetView === 'function') cajonSetView('tree');
            if (typeof _cajonOpenBranches !== 'undefined' && typeof cajonToggleBranch === 'function') {
                _cajonOpenBranches.clear();
                cajonToggleBranch(key); // set vacío → toggle = expandir + re-render
            }
            setTimeout(() => {
                const el = document.getElementById('cajonBranch-' + key);
                if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 150);
        } catch (err) {
            console.warn('[kiosco] rama no abierta:', key, err);
        }
    }

    function hideAttract() {
        const ov = document.getElementById('kioscoAttract');
        if (!ov || !attractOn) return;
        attractOn = false;
        ov.classList.remove('is-on');
        stopSlides();
        setTimeout(() => { if (!attractOn) ov.hidden = true; }, 500);
        resetIdle();
    }

    // Cualquier toque sobre el overlay lo cierra SIN dejar pasar el gesto al mapa
    // (se consume el gesto completo; el preventDefault de touchend suprime también el
    // click sintético → el handler no se ejecuta dos veces en pantalla táctil).
    // Si el toque cae sobre un tile del menú de CTAs, además abre esa rama del cajón.
    function onAttractTap(e) {
        e.preventDefault();
        e.stopPropagation();
        const tile = e.target && e.target.closest ? e.target.closest('[data-kbranch]') : null;
        hideAttract();
        if (tile) kioscoOpenBranch(tile.getAttribute('data-kbranch'));
    }
    const attractOv = document.getElementById('kioscoAttract');
    if (attractOv) {
        attractOv.addEventListener('click', onAttractTap);
        attractOv.addEventListener('touchend', onAttractTap, { passive: false });
    }

    // ── Slideshow del atractor (cross-fade A/B + Ken Burns por CSS) ──────────
    function startSlides() {
        const a = document.getElementById('kioscoAttractBgA');
        const b = document.getElementById('kioscoAttractBgB');
        if (!a || !b || !SLIDES.length) return;
        let idx = 0;
        let showingA = true;
        a.style.backgroundImage = 'url("' + SLIDES[0] + '")';
        a.classList.add('is-visible');
        b.classList.remove('is-visible');
        if (SLIDES.length < 2) return;
        slideTimer = setInterval(() => {
            idx = (idx + 1) % SLIDES.length;
            const incoming = showingA ? b : a;
            const outgoing = showingA ? a : b;
            incoming.style.backgroundImage = 'url("' + SLIDES[idx] + '")';
            incoming.classList.add('is-visible');
            outgoing.classList.remove('is-visible');
            showingA = !showingA;
        }, SLIDE_MS);
    }

    function stopSlides() {
        clearInterval(slideTimer);
        slideTimer = null;
    }

    // ── SW: adoptar versiones nuevas sin intervención, solo con el atractor en
    //    pantalla (nunca recargar mientras un visitante está usando el kiosco). ──
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (attractOn) window.location.reload();
        });
    }

    // Arrancar el contador de inactividad desde ya
    resetIdle();

    // Hook de depuración/mantenimiento (consola): forzar attract sin esperar 90 s
    window._kioscoDebug = { showAttract, hideAttract, reset: kioscoResetApp };
})();
