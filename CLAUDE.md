# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Guía interactiva turística del **municipio de Bareyo (Cantabria)** — cliente Ayuntamiento de Bareyo, desarrollada por Clotitec. Sigue la guía de diseño `../CLOTITEC_MAPAS_INTERACTIVOS_V2.md`.

- Repo: https://github.com/clotitec/descubre-bareyo-v2
- Producción: https://descubre-bareyo-v2.vercel.app · auto-deploy en cada push a `main`.

## Hard constraints

- **Vanilla HTML/CSS/JS**, sin build, sin framework, sin TypeScript, sin `npm install`. CDNs permitidos: unpkg, cdn.tailwindcss, fonts.googleapis, jsdelivr.
- No introducir Vite/Webpack/React/Vue/TS sin discusión — el ayuntamiento debe poder mantenerlo sin tooling.
- `data.js` es el **source of truth** de los 96 negocios y de las rutas/patrimonio/3D. La migración a Supabase está pospuesta hasta que el cliente valide el flujo de moderación.

## Common commands

No hay test runner ni linter. El CI (`.github/workflows/check.yml`) replica los checks; correr en local antes de push:

```bash
python -m http.server 8000

# Sintaxis JS (mismo que CI)
for f in app.js data.js config.js sw.js js/track.js; do node --check "$f"; done

# Validar JSON (UTF-8 sin BOM obligatorio — PowerShell escribe UTF-16 por defecto)
for f in manifest.json vercel.json assets/tracks/*.json; do
    node -e "JSON.parse(require('fs').readFileSync('$f','utf8'))" || echo "FAIL $f"
done

xmllint --noout sitemap.xml

gh run view <id> --log-failed   # logs del job que falló en CI
vercel inspect <url>            # info de un deploy concreto
```

URLs locales para probar: `/`, `/dashboard.html` (clave demo `bareyo`), `/qr-print.html` (misma clave), `/formulario-empresas.html`, `/?qr=ruta-iglesias` (simula scan QR).

## Architecture

5 páginas HTML estáticas servidas tal cual. Todo el JS expone **funciones globales** (sin export/import) porque el HTML las invoca con `onclick="…"`. Orden de carga importa:

```
data.js   → CONFIG, hikingRoutes, costaPoints, points3D, businesses,
            BUSINESS_CATEGORIES, CATEGORY_EMOJIS, BIZ_DEFAULT_IMAGES,
            WMO_CODES, TRANSLATIONS, currentLang, t(), slugify(), getBizImage()
config.js → window.BAREYO_CONFIG = { SUPABASE_URL, SUPABASE_ANON_KEY,
            DASHBOARD_PASSWORD_HASH, APP_VERSION }   ← cliente rellena en deploy
js/track.js → window.track(t,p): POST a Supabase si online, IndexedDB buffer
              offline, fallback localStorage (modo demo)
js/kiosco.js → modo kiosco (?kiosco=1, persiste en sessionStorage): fija
              window.KIOSCO + html[data-kiosco] ANTES que app.js. Attract 90s,
              QR por ficha, bloqueos táctiles. En modo normal no hace nada.
app.js    → mapa MapLibre, fichas, tides, theme, wiki, audio, route tracking,
            OG dinámico, QR entry. Funciones globales window.X.
sw.js     → Service Worker. CACHE_VERSION versionado. Estrategias:
            shell+GPX cache-first · tiles SWR · APIs network-first 3s · img CF
```

CSS en dos hojas (orden importa): `styles.css` (legacy) primero, `styles-v3.css` (design system v3 con tokens fluid + dark mode coherente) después como override. Tokens nuevos solo en v3.

**Modo demo vs producción**: `config.js` arranca con `SUPABASE_URL` / `SUPABASE_ANON_KEY` vacías → todo (analytics, formulario alta) va a `localStorage`. Al rellenar las claves, bascula a Supabase sin tocar app code. Esquema SQL en `docs/DEPLOY.md`. La anon key NO es secret estricto — la seguridad va por Row Level Security.

## Patrones específicos del proyecto

- `cachedFetch(key, url, ttlMin)` — toda llamada a API externa pasa por aquí (localStorage TTL + stale fallback).
- `track(type, payload)` — analytics. Tipos: `pageview`, `detail_open`, `gpx_download`, `phone_click`, `audio_play`, `qr_scan`, `biz_request`, `theme_toggle`. Si añades acción medible, llama.
- **i18n**: claves en `TRANSLATIONS` (data.js) para es/en/fr/de. HTML: `data-i18n="clave"`. JS: `t('clave')`. Solo en la app principal — dashboard / qr-print / formulario quedan en español (uso interno + locales).
- **Deep links**: `#ruta=slug` / `#patrimonio=slug` / `#negocio=slug` / `#3d=slug`. Mantener `#item=ID` por retrocompat.
- **Modo kiosco**: `?kiosco=1` (apagar: `?kiosco=0`) activa `js/kiosco.js` para el tótem 75″: salta landing/tutorial, ficha como panel lateral derecho (CSS `html[data-kiosco="1"]` al final de `styles-v3.css`), acciones de móvil sustituidas por QR "llévatelo en tu móvil" (`kioscoDetailQr`), attract a los 90 s de inactividad con reset completo. Todo condicionado a `window.KIOSCO` — no tocar el flujo normal.
- **QR físico**: URL `?qr=<id>` activa `handleQrEntry()` → `track('qr_scan')` → setea hash → limpia query param. `<id>` puede ser id de entidad o id propio de placa registrado en Supabase `qr_locations`.
- **OG dinámico**: `updateOpenGraph()` se llama desde `updateHash()`. Al abrir/cerrar detalle se actualiza og:title/description/image.
- **Modo oscuro**: `currentTheme` persiste en `localStorage[bareyo_theme]` y refleja en `<html data-theme>`. `toggleTheme()` cambia atributo + basemap (Voyager ↔ DarkMatter). Componentes nuevos deben usar variables semánticas de `styles-v3.css` (`--surface`, `--text`, …), no hex hardcoded.
- **Mareas**: `tideHeight(tsSec)` y `nextTideEvents(nowSec, n)` con M2+S2 (cliente). Constantes en `app.js → TIDE_CFG` calibradas para Santander 2026. Recalibrar `epoch` cada año con la primera pleamar real.
- **A11y**: skip-link en `<body>`, `aria-live` en contadores búsqueda, `role="tablist"`/`tab` en tabs, focus trap en detail modal (`_previousFocus` se restaura), `Escape` cierra modal y tutorial.
- **Moderación dashboard**: `_requestsCache` guarda pending → `approveRequest(id)` / `rejectRequest(id)` / `openRequestDetail(id)`. `buildBizJson(r)` genera snippet para pegar en `data.js → businesses[]`. Aprobar también hace PATCH a Supabase si configurado.

## CI / Deploy

`.github/workflows/check.yml` corre en cada push a `main` y PR:
- **`syntax`**: `node --check` JS, `JSON.parse` JSON, `xmllint` sitemap, grep que falla si commiteas URL/key Supabase real en `config.js`.
- **`links`** (push a main, espera 60s al deploy): `/`, `/sw.js` con `Cache-Control: no-cache`, `/robots.txt`, `/sitemap.xml`, `/manifest.json` deben dar 200.

`vercel.json` tiene regex `/((?!sw\\.js).*)\\.(html|js|css|json)` para que `/sw.js` reciba su header específico (`no-cache`) sin que la regla genérica de `*.js` lo pise.

## Decisiones a respetar

- Solo APIs gratuitas sin key salvo aprobación explícita.
- Eleven Labs descartado → Web Speech API. Eleven Labs queda como upgrade si paga.
- Audio-guías solo en patrimonio (rutas/costa/3D), no en negocios.
- Imágenes locales (`assets/biz/{id}.webp`) prioritarias sobre Unsplash. El cliente entrega fotos.
- Mareas exactas: ninguna API gratis sin key cubre España. Tabla anual offline (`assets/data/tides-YYYY.json`) cuando el cliente lo pida. Open-Meteo Marine cubre oleaje hoy.
- Modelos 3D: los 6 tours Matterport de `points3D[]` son reales y están verificados en vivo (desde 488a0c9, 2026-07-01) — ya no hay placeholders.
- No mostrar NIF/CIF de negocios (privacidad, decisión Clotitec v2 §11).
- No romper retrocompat de URLs `#item=ID`.
- El dashboard NO depende de `data.js` excepto para resolver `entity_id → name` en rankings.

## Documentación de soporte

`README.md` overview · `docs/ARCHITECTURE.md` flujos · `docs/API_KEYS.md` APIs y caché · `docs/DEPLOY.md` Vercel + esquema SQL Supabase + RLS · `docs/CONTRIBUTING.md` cómo añadir negocio/ruta/idioma/QR · `docs/PRIVACY.md` RGPD · `docs/CHANGELOG.md` estado sprints.

## Plan vigente

`~/.claude/plans/federated-giggling-riddle.md`. ✅ S1–S9 entregados (docs, APIs, PWA, slug+OG+geo, dashboard+Supabase, QRs, formulario). ✅ P11 (moderación, dark mode, CI, a11y) y P12 (design system v3) entregados. ✅ Fase 6 kiosko entregada (Iglesias, Condiciones+ICV, Tour360, efectos, Servicios). ⏳ S10 pospuesto (migrar `businesses` a Supabase cuando se valide moderación). ⏳ Cliente pendiente: fotos `assets/biz/`, repuntar 12 QR de Switchy (`docs/mejoras/qr-deeplinks.md`), clave OpenChargeMap, modelo de pantalla del kiosco (OSD-lock), opcional AEMET para mareas oficiales. Contexto portable para otras IAs: `docs/AI_CONTEXT.md`.
