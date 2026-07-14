# Estado del proyecto — actualizado 2026-07-14

## Hecho hoy
- **feat(mapa): interruptores de capa por categoría** en el menú del mapa (un "ojo" por categoría). Muestran/ocultan su capa sobre el mapa: Patrimonio, Iglesias, Rutas, Playas, Vistas 3D, Negocios. Güemes y Agenda **sin** interruptor (no son capas del mapa). Filtro por pertenencia sobre la capa POI única (`setFilter`) + `visibility` en las capas de ruta y ocultado de los marcadores de inicio. Todo visible por defecto; la preferencia se persiste en `localStorage['bareyo_layers_off']`. Tocar el nombre sigue abriendo la lista. (`app.js`, `styles-v3.css`, `data.js` i18n `layerToggle` es/en/fr/de)
- **fix(logo)**: el logo apaisado (1024×456) se aplastaba en un cuadrado 84×84 sin `object-fit` → `width:auto; object-fit:contain` en `.landing-logo-app` y `.loader-logo-app` (`styles-v3.css`).
- **fix(cajón)**: el destacado Güemes se solapaba con las categorías en el vistazo (peek) del menú en móvil → oculto en peek, visible al expandir (`.cajon[data-state="peek"] .cajon-featured{display:none}`).
- **sw**: bump `CACHE_VERSION` → `v2.2026.07.14a` (obligatorio al tocar el shell).
- Commit **`0d2207a`**, pusheado a `main` → **desplegado y verificado en producción** (logo, los 6 interruptores y el efecto sobre el mapa —rutas y negocios apagados desaparecen— comprobados en el navegador).
- Verificado que la rama `feat/atlas-kiosko-turismo` está **muerta** (superada por `main`, `git log main..rama` vacío) → se puede borrar cuando se quiera.

## Pendiente (en orden)
1. **Tildes que faltan** en el copy de la app ("Guia", "Busqueda", "categoria", "romanicas", "Que vas a encontrar", "historicas"…). NO es codificación (la "ü"/"€"/"°" salen bien) → es texto escrito sin acentuar. Alto impacto para el ayuntamiento y arreglo rápido. Está en `index.html` y en `data.js` (`TRANSLATIONS` + textos de POIs).
2. **Iconos de categoría = emojis** → opción de pasarlos a un set SVG de marca coherente (ya hay iconos en `assets/icons/svg`). Afecta la home ("¿Qué vas a encontrar?") en `index.html` y el sidebar del mapa (`CAJON_BRANCHES` en `app.js`).
3. **Fotos reales de negocios**: `assets/biz/` sigue vacío (solo `README.md`) → los negocios usan imágenes por defecto por categoría (`BIZ_DEFAULT_IMAGES`). Pendiente de que el cliente entregue fotos.

## Cómo retomar
- Carpeta de trabajo: `F:\descubre-bareyo-v2`
- Arrancar en local: `python -m http.server 8000` → abrir `http://localhost:8000/` y "Explorar el mapa interactivo".
- Comprobar sintaxis antes de push (igual que el CI): `for f in app.js data.js config.js sw.js js/track.js; do node --check "$f"; done`
- Producción: https://descubre-bareyo-v2.vercel.app · **auto-deploy en cada push a `main`**
- Repo: https://github.com/clotitec/descubre-bareyo-v2

## Decisiones y avisos
- Interruptores de capa: modelo "todo visible por defecto, se apaga lo que sobra"; preferencia por navegador en `localStorage` (no afecta a otros visitantes). Decidido con el usuario el 2026-07-14.
- Al inspeccionar por consola: **`window.map` es el DIV `#map`, NO la instancia MapLibre** (acceso por nombre del DOM). Las funciones de capa (`layerToggle`, `applyLayerVisibility`, `_poiVisibilityFilter`, `_poiBranchFlags`) sí son globales.
- El renderizador del navegador MCP se **congela al capturar el canvas 3D** (screenshots del mapa dan timeout intermitente) → verificar el estado del mapa por JS (getComputedStyle / DOM) es más fiable que por captura.
- Cualquier cambio del shell (`app.js`/`css`/`html`/`sw.js`) requiere **bump de `CACHE_VERSION`** en `sw.js`, o el Service Worker sirve versiones viejas.
