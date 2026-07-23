# Editor de empresas (dashboard) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vista "Empresas" en dashboard.html para añadir/modificar/dar de baja los 96 negocios y generar el bloque `businesses[]` de data.js.

**Architecture:** Todo dentro de `dashboard.html` (inline, como el resto del dashboard, solo ES). `data.js` se carga como script para leer `businesses`/`BUSINESS_CATEGORIES`/`slugify`. Cambios pendientes en `localStorage['bareyo_biz_edits']`; salida = array completo en formato canónico. Spec: `docs/superpowers/specs/2026-07-23-editor-empresas-design.md`.

**Tech Stack:** Vanilla JS inline, MapLibre CDN (mini-mapa), canvas para fotos webp.

## Global Constraints

- Solo español (dashboard interno). Sin frameworks. CDNs permitidos: unpkg.
- No tocar: vista Analítica existente, moderación (`approveRequest`, `buildBizJson`), formulario público, app principal, data.js.
- `dashboard.html` NO está en el shell del SW → sin bump de CACHE_VERSION salvo que se toque otro archivo del shell.
- Todo listado que pinte datos de negocio escapa con la función `escapeRq` ya existente en dashboard.html (o equivalente).
- Verificación por task: `node --check` no aplica al HTML → Playwright headless (patrón NODE_PATH global, navegar y `page.evaluate`), login con clave `bareyo`.
- Commits con `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: Infraestructura de la vista Empresas

**Files:** Modify: `dashboard.html` (head: script data.js + maplibre CDN; cabecera: conmutador; body: contenedor `#empresasView`; CSS inline)

**Interfaces:**
- Produces: `showView('analitica'|'empresas')` (persiste en `location.hash`), contenedor `#empresasView`, acceso a globals de data.js (`businesses`, `BUSINESS_CATEGORIES`, `slugify`, `CONFIG`).

- [ ] Cargar `data.js` con `<script src="data.js"></script>` ANTES del script inline del dashboard; y MapLibre (css+js unpkg maplibre-gl@4.1.2) en el head.
- [ ] Conmutador en la cabecera del dashboard: dos botones `Analítica` / `Empresas` (clase `.view-tab`, activo con fondo `--bareyo`); `showView()` alterna `#dashboard .grid` (analítica) vs `#empresasView`, sincroniza `location.hash = '#empresas'` y lee el hash al autenticar.
- [ ] `#empresasView` oculto por defecto con cabecera propia: contador de negocios, badge `#bizPendingBadge` ("N cambios sin aplicar"), botones `+ Alta`, `Generar data.js`, `Descartar cambios`.
- [ ] Verificar (Playwright): login → conmutador visible → `#empresas` en hash abre la vista directa → Analítica intacta. Commit `feat(dashboard): vista Empresas conmutable (infra)`.

### Task 2: Estado de cambios + listado con buscador y chips de sector

**Files:** Modify: `dashboard.html`

**Interfaces:**
- Produces: `_bizEdits = {edits:{}, altas:[], bajas:[]}` + `saveBizEdits()` + `effectiveBusinesses()` (aplica edits/altas/bajas sobre `businesses`) + `renderBizList()`.

- [ ] Estado:

```js
let _bizEdits = { edits: {}, altas: [], bajas: [] };
try { const s = JSON.parse(localStorage.getItem('bareyo_biz_edits') || 'null'); if (s && s.edits) _bizEdits = s; } catch (e) {}
function saveBizEdits() {
    localStorage.setItem('bareyo_biz_edits', JSON.stringify(_bizEdits));
    renderBizPending();
}
function effectiveBusinesses() {
    const base = businesses.map(b => _bizEdits.edits[b.id] ? Object.assign({}, b, _bizEdits.edits[b.id]) : b);
    return base.concat(_bizEdits.altas);
}
```

- [ ] `renderBizList()`: filtro por texto (nombre+location+subcategory) y por sector (chips con color de `BUSINESS_CATEGORIES`, single-select + "Todos"); filas con badges de estado (`🆕` si id en altas, `✏️` si en edits, `🗑️` + fila atenuada si en bajas) y acciones Editar / Baja↔Restaurar.
- [ ] `renderBizPending()`: badge con `Object.keys(edits).length + altas.length + bajas.length`; "Descartar cambios" con `confirm()` → resetea estado y re-render.
- [ ] Verificar: 96 filas, filtros funcionan, baja marca y restaura, badge cuenta. Commit `feat(dashboard): listado de empresas con filtros y estado de cambios`.

### Task 3: Ficha de edición con diff + mini-mapa de coordenadas

**Files:** Modify: `dashboard.html`

**Interfaces:**
- Consumes: `effectiveBusinesses()`, `_bizEdits`, `saveBizEdits()`.
- Produces: `openBizEditor(id|null)` (null = alta), `BIZ_CAMPOS` (array declarativo), `closeBizEditor()`.

- [ ] `BIZ_CAMPOS` declarativo: name(text,req), category(select), subcategory(text), location(text), desc(textarea,240), phone(tel), website(url), hours(text), tags(text CSV), image(url). Render vista/editar por campo (patrón Santander): valor actual + botón Modificar → input + Guardar/Cancelar.
- [ ] Diff: sección "Cambios" con `antes → después` por campo modificado; botón "Confirmar cambios" escribe en `_bizEdits.edits[id]` (o completa el alta) + `saveBizEdits()` + vuelve al listado. Validaciones: name no vacío; website empieza por http(s); phone solo dígitos/espacios/+; slug de alta único (`slugify(name)` contra todos).
- [ ] Alta: `openBizEditor(null)` → id = primer `biz-0XX` libre (max numérico + 1, pad 3), todos los campos en modo edición.
- [ ] Mini-mapa: contenedor 100%×260px, `new maplibregl.Map` (voyager style URL igual que app), marcador draggable sincronizado con inputs `lat`/`lng` (6 decimales); `map.resize()` al abrir la ficha (estaba display:none).
- [ ] Verificar: editar teléfono muestra diff y persiste tras recarga; alta crea `biz-097`; mini-mapa arrastra y actualiza inputs. Commit `feat(dashboard): ficha de edición con diff y mini-mapa`.

### Task 4: Fotos — compresión canvas → webp descargable

**Files:** Modify: `dashboard.html`

**Interfaces:** Produces: `bizPhotoInput(id)` (input file + preview + descarga `{id}.webp`).

- [ ] En la ficha: input file accept image/* → `FileReader` → `<canvas>` redimensión máx 1200px → `canvas.toBlob('image/webp', 0.82)` (fallback `'image/jpeg'` si blob null) → preview con tamaño original→comprimido → botón "Descargar {id}.webp" (`URL.createObjectURL` + `<a download>`), con la instrucción "colócala en assets/biz/".
- [ ] Verificar: subir una imagen de prueba (Playwright `setInputFiles` con PNG generado) → preview y descarga con nombre correcto. Commit `feat(dashboard): fotos comprimidas a webp con nombre assets/biz`.

### Task 5: Generar data.js + limpieza de aplicados + hook Supabase

**Files:** Modify: `dashboard.html`

**Interfaces:** Produces: `generateBizBlock()` (string), `bizSerialize(b)` (una entrada canónica), `syncBizToSupabase(change)` (stub).

- [ ] Serializador canónico (orden fijo de claves, una propiedad por línea, comillas simples con escape `\'`):

```js
const BIZ_KEY_ORDER = ['id','name','category','subcategory','coords','location','desc','phone','website','hours','image','tags'];
function bizVal(v) {
    if (Array.isArray(v)) return '[' + v.map(bizVal).join(', ') + ']';
    if (typeof v === 'number') return String(v);
    return "'" + String(v).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
}
function bizSerialize(b) {
    const lines = BIZ_KEY_ORDER.filter(k => b[k] !== undefined && b[k] !== '').map(k => `        ${k}: ${bizVal(b[k])}`);
    return '    {\n' + lines.join(',\n') + '\n    }';
}
function generateBizBlock() {
    const list = effectiveBusinesses().filter(b => _bizEdits.bajas.indexOf(b.id) === -1);
    return 'const businesses = [\n' + list.map(bizSerialize).join(',\n') + '\n];';
}
```

- [ ] Modal de salida: `<textarea readonly>` con el bloque + botones Copiar (clipboard API con fallback `select()`) y Descargar `businesses-YYYY-MM-DD.js` + instrucción de pegado.
- [ ] Al cargar la vista, limpieza de aplicados: por cada `edits[id][campo]`, si `businesses` (data.js recién cargado) ya tiene ese valor → borrar del estado; altas cuyo id ya existe en data.js → borrar; bajas cuyo id ya no existe → borrar. `saveBizEdits()`.
- [ ] `syncBizToSupabase(change)`: si `!CFG.SUPABASE_URL` → return; si no, `console.info('S10 pendiente: tabla businesses no existe aún')` (stub documentado).
- [ ] Verificar (Playwright): editar+alta+baja → generar → evaluar bloque con `new Function(code+';return businesses')`: longitud 96 (=96+1-1), campo editado aplicado, orden de claves canónico; guardar a archivo temporal y `node --check`. Commit `feat(dashboard): generador del bloque businesses[] para data.js`.

### Task 6: Verificación integral + docs

**Files:** Modify: `CLAUDE.md` (nota dashboard-data.js), `docs/CONTRIBUTING.md` (cómo usar el editor)

- [ ] Smoke integral Playwright: login → Analítica intacta (stats render) → Empresas: flujo completo del spec §4 → recarga persiste → descartar limpia.
- [ ] CLAUDE.md: sustituir "El dashboard NO depende de data.js excepto…" por la nueva realidad (carga data.js completo; el editor de empresas vive allí). CONTRIBUTING: sección "Editar negocios desde el dashboard".
- [ ] Commit `docs: editor de empresas documentado` + deploy `vercel deploy --prod --yes` + smoke en producción.
