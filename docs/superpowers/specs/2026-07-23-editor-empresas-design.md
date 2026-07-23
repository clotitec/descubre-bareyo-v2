# Spec: Editor de empresas en el dashboard

**Fecha:** 2026-07-23 · **Rama:** `v3` · **Página:** `dashboard.html` (uso interno, solo ES)
**UX de referencia:** `formulario-empresas.html` de poligonos-santander-v5 (edición campo a
campo con diff antes→después, compresión de fotos en canvas) — allí sin persistencia (mailto);
aquí la persistencia es el bloque `businesses[]` para data.js.

## Objetivo

Herramienta interna (Clotitec/ayuntamiento) para **añadir, modificar y dar de baja** los 96
negocios de `data.js` sin editar el archivo a mano. `data.js` sigue siendo el source of truth
(S10/Supabase pospuesto — decisión CLAUDE.md).

## Alcance

- Nueva **vista "Empresas"** en `dashboard.html` conmutada desde la cabecera
  (Analítica | Empresas), tras la autenticación existente (`bareyo_dashboard_authed`).
- `dashboard.html` pasa a cargar `data.js` completo (`<script src="data.js">` antes del
  inline). Actualizar la nota de CLAUDE.md ("el dashboard NO depende de data.js…").
- Fuera de alcance: tocar el formulario público, la moderación (`approveRequest`/
  `buildBizJson`), el app principal, o crear tabla Supabase (S10).

## 1. Vista Empresas

- **Listado**: los negocios efectivos (data.js + cambios pendientes) con buscador por texto
  y chips de sector (paleta de `BUSINESS_CATEGORIES`). Cada fila: nombre, sector,
  ubicación, badges de estado (`✏️ editado` / `🆕 alta` / `🗑️ baja`), botones Editar / Baja
  (reversible: "Restaurar"). Botón "+ Alta" arriba.
- **Ficha de edición** (panel/modal): array declarativo `BIZ_CAMPOS` con los campos del
  esquema real: `name` (text, obligatorio), `category` (select de BUSINESS_CATEGORIES),
  `subcategory` (text), `location` (text), `desc` (textarea 240), `phone` (tel),
  `website` (url), `hours` (text), `tags` (texto separado por comas), `image` (url remota),
  `coords` (mini-mapa). Edición campo a campo con vista/editar y **diff antes→después**
  antes de confirmar. Validaciones: nombre no vacío, url con http(s), tel dígitos/espacios.
- **Coordenadas**: mini-mapa MapLibre (CDN unpkg ya permitido) con basemap Voyager,
  marcador arrastrable + inputs lat/lng manuales sincronizados. Centro inicial: coords del
  negocio o centro del municipio (CONFIG.center).
- **Altas**: id = siguiente `biz-0XX` libre; misma ficha con campos vacíos; slug
  (`slugify(name)`) validado único contra los existentes (aviso si colisiona).
- **Bajas**: marcan el id; excluido del bloque generado; reversible hasta generar.

## 2. Persistencia

- **Cambios pendientes** en `localStorage['bareyo_biz_edits']`:
  `{ edits: {id: {campo: valor}}, altas: [obj], bajas: [id] }` — sobreviven a recargas;
  badge "N cambios sin aplicar" en la cabecera; botón "Descartar todo".
- **Generar data.js**: botón que produce el array COMPLETO `const businesses = [ … ];`
  con los cambios aplicados, en **formato canónico una-propiedad-por-línea** (orden de
  claves: id, name, category, subcategory, coords, location, desc, phone, website, hours,
  image, tags). Acciones: copiar al portapapeles y descargar `businesses-YYYY-MM-DD.js`.
  ⚠️ Primer uso = reformateo one-shot de las 96 entradas (diff grande una sola vez;
  después los diffs son por campo). Instrucción visible: "pega este bloque en data.js
  sustituyendo el array businesses y haz commit".
- **Supabase**: hook preparado `syncBizToSupabase(change)` que hoy es no-op con aviso
  (no hay tabla `businesses`); se cablea al hacer S10.
- Tras pegar en data.js y recargar, el editor detecta cambios ya aplicados (campo editado
  cuyo valor en data.js ya coincide) y los limpia de `bareyo_biz_edits`.

## 3. Fotos

- Input file → `FileReader` + canvas (máx 1200px, `toBlob image/webp` q0.82, fallback
  jpeg si el navegador no soporta webp) → preview con % de compresión → **descarga como
  `{id}.webp`** con instrucción "colócala en assets/biz/" (regla del proyecto: imágenes
  locales prioritarias sobre URL; `getBizImage` ya prioriza `assets/biz/{id}.webp`).
- El campo `image` (URL remota) queda como fallback editable.

## 4. Verificación

1. `node --check` de los JS + carga de `dashboard.html` sin errores (Playwright).
2. Flujo completo Playwright: login clave `bareyo` → vista Empresas → editar un campo
   (diff visible) → alta con id correcto → baja → "Generar data.js" → evaluar el bloque
   generado con `new Function` y comprobar: 96+1-1 entradas, campos editados aplicados,
   claves en orden canónico, `node --check` del archivo descargado.
3. Persistencia: recargar y comprobar que los cambios pendientes siguen; descartar todo.
4. La vista Analítica sigue intacta (stats, solicitudes, banderas).
5. Bump `CACHE_VERSION` si se toca shell cacheado (dashboard.html no está en el shell del
   SW — verificar SHELL_ASSETS en sw.js; si no lo está, no hace falta bump).
