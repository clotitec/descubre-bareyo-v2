# Continuación — Descubre Bareyo v2

> ⚠️ **Documento histórico (snapshot del 2026-07-07), no estado actual.** Describe la
> rama `feat/atlas-kiosko-turismo` como pendiente de merge — **esa rama ya se mergeó**
> (commit `41a22a4`) y desde entonces se han añadido ~13 commits más directamente en
> `main` (Fase 6 de módulos kiosko + release v3.0.0). Para el estado real hoy, ver
> `docs/CHANGELOG.md` y `docs/AI_CONTEXT.md`. Se conserva por su detalle de traspaso
> técnico (SRI, provenance de assets), no como lista de pendientes vigente.

> Documento de traspaso para retomar el trabajo en otro equipo (p. ej. PC de escritorio).
> Última actualización: **2026-07-07**. Todo lo descrito está **commiteado y pusheado**.

## Cómo retomar en el PC de escritorio

```bash
git clone https://github.com/clotitec/descubre-bareyo-v2.git   # o git fetch si ya lo tienes
cd descubre-bareyo-v2
git checkout feat/atlas-kiosko-turismo
git pull
python -m http.server 8000      # abre http://localhost:8000
```

Abre `docs/hoja-diseno.html` en el navegador: es la radiografía completa (arquitectura, design system, los 39 hallazgos de la auditoría y los briefs A–F). Este archivo (`docs/CONTINUACION.md`) resume qué se ejecutó de ese plan.

## Estado actual

- **Rama:** `feat/atlas-kiosko-turismo` · **HEAD:** `0ddb184` · **46 commits por delante de `main`**.
- **Pusheada** (el preview de Vercel se actualiza solo). **SIN merge a `main`** — el merge = deploy a producción, es tu decisión.
- Preview: https://descubre-bareyo-v2-git-feat-atlas-kio-820500-clotitecs-projects.vercel.app
- `sw.js CACHE_VERSION` = `v2.2026.07.06`.
- CI en verde en local: `node --check` de todos los JS, JSON válido, sitemap, tests 3/3.

## Qué se hizo en la tanda de endurecimiento v2 (2026-07-06, 14 commits)

Resuelve ~37 de los 39 hallazgos de la auditoría (`docs/hoja-diseno.html`). Detalle largo en `docs/CHANGELOG.md → [Unreleased] → Endurecimiento de lanzamiento v2`.

**Bloqueantes (P0):**
- `sw.js` — offline del tótem con `cleanUrls` (precache de rutas limpias + re-empaquetado de respuestas 308; `offline.html` por fin alcanzable).
- `kiosko.js` — refresco periódico (datos 45 min, mar/mareas 10 min, recarga nocturna); boot no bloqueante.

**Importantes (P1):** XSS del dashboard, QR/deep-links sin landing, focus-trap + gesto "atrás" cierra modal, rejilla de fotos, retry de edificios, guard de tracking, GPS denegado, claves `_k` del kiosko, SW+manifest del kiosko.

**Mejoras (P2):** **audioguías trilingües** (narración FR de los 14 POIs), idioma persistente + `<html lang>`, `WMO_CODES` completo + `wmoDesc()`, `bareyo-6` i18n, `defer`+SRI+JSON-LD+**portada OG 1200×630**+Fraunces 800, CSP-Report-Only, formulario accesible + anti-spam, contraste AA + `:focus-visible`, guard de CI para el bump de `CACHE_VERSION`.

**Assets nuevos** (`assets/icon-192.png`, `icon-512.png`, `icon-512-maskable.png`, `og-cover.jpg`) generados con `scripts/gen-pwa-assets.ps1` (reejecutable si cambia el logo).

## Deferido a propósito (2 P2 de baja prioridad, alto riesgo)

1. **Retirada del sidebar/bottom-sheet legacy** (`#desktopSidebar` / `#bottomSheet`): `app.js` todavía renderiza en ellos aunque estén ocultos. Quitarlos sin verificar en navegador arriesga regresiones; se dejó para cuando puedas smoke-testear. (Brief F del hoja-diseno.)
2. **Traducción de etiquetas de UI** (pestañas / stats / toasts a `TRANSLATIONS`): se hizo `<html lang>` + persistencia + `wmoDesc` + TTS, pero mover esas cadenas hardcoded a `TRANSLATIONS` quedó pendiente (parte de P2-1).

## Pendiente de tu lado (sin cambios respecto a antes)

- [ ] **Verificar visualmente** en el navegador con la pestaña en primer plano: el mapa carga, "atrás" cierra la ficha, una audioguía FR suena con voz `fr-FR`, la portada OG.
- [ ] **Merge a `main`** cuando lo confirmes (→ producción) y **repuntar los QR de switchy** a los deep-links (`docs/mejoras/qr-deeplinks.md`).
- [ ] Contenido del cliente: 360 de Ría de Ajo / Cabo Quintres / Molino de La Venera; MP3 de ElevenLabs; modelo de la TV táctil para el OSD-lock.
- [ ] (Opcional) Ejecutar `node scripts/build-edificios.mjs` desde una terminal con internet real → commitear `assets/data/edificios.geojson`.

## Notas técnicas / provenance

- **SRI de maplibre 4.1.2:** `sha384-q3AR0wM1VzQVRuZgwc2pyYPArgjMNrAXLctZcYa7rBd1y1O1UanRgDrlJN913Gt5` (del artefacto pinneado; si algún día subes de versión, recalcula el hash).
- **Narración FR de las audioguías:** los 12 guiones vienen verbatim de `docs/contenido/audioguias.md`; Cabo Quintres y Molino de La Venera se tradujeron del español (no estaban en el `.md`). Están en `data.js → POI_I18N[id].fr.narracion` (source of truth).
- **Generar iconos/portada PWA:** `pwsh scripts/gen-pwa-assets.ps1` (Windows). Usa `[char]0xXX` para los símbolos porque PowerShell 5.1 lee el `.ps1` como ANSI y produce mojibake con acentos literales.
- **Modelos:** Fable orquesta; delegar tareas mecánicas a Sonnet y medias a Opus (revisar siempre el diff antes de commitear).
