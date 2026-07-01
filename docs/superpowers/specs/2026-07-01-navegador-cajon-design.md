# Diseño — Navegador «cajón WOW» + menú minimalista · Descubre Bareyo

**Fecha:** 2026-07-01 · **Rama:** `feat/atlas-kiosko-turismo` · **Estado:** aprobado en brainstorming (concepto A). Chat multilingüe = fase posterior (gated por aprobación del ayuntamiento).

## Objetivo
Hacer el menú superior-izquierdo minimalista y profesional, y sustituir la navegación de contenido por un **cajón bento deslizante** que muestre TODO (patrimonio, rutas, playas, Güemes, 3D, negocios, agenda) manteniendo el **mapa 3D como protagonista**. Máximo efecto WOW y usabilidad para vecinos y turistas (móvil vía QR + kiosko táctil). Stack vanilla, sin build; tokens de `styles-v3.css`; i18n `t()`/`data-i18n`; no romper deep-links ni funcionalidad existente.

**PRIORIDAD (énfasis del cliente):** lo primero es el **CONTENIDO** y la **facilidad de encontrarlo**. El navegador debe ofrecer un **modo árbol/rama**: categorías (ramas) expandibles con **contador** que dejan ver de un vistazo **TODO lo que se ofrece**, sin nada oculto y encontrable en 1–2 toques. El WOW visual acompaña, pero manda la *findability* y la exhaustividad.

## Decisiones (micro-decisiones cerradas)
1. **Menú**: riel de iconos SVG siempre visible + `⋯` overflow.
2. **Orden de categorías**: turista-first → Patrimonio · Rutas · Playas · Güemes⭐ · 3D · Negocios · Agenda.
3. **Imágenes de tarjeta**: foto real cuando exista (localImage/Matterport thumb/biz image) + degradado por categoría de respaldo.

## Componente 1 — Menú superior-izquierdo minimalista
- Reemplazar los botones emoji de `#mapControls` (🛰️⛰️📍🗺️🌙⋯) por **iconos SVG inline** (estilo línea, `currentColor`, ~20px), estética Lucide/Feather (MIT).
- Iconos: Capas/satélite, Relieve 3D (montaña), Mi ubicación (pin), Vista general (globo/encuadre), Tema (luna/sol), `⋯` (overflow: brújula, ayuda, instalar).
- Contenedor píldora de cristal (`--surface-glass` + `--blur-md`, `--r-xl`, `--shadow-md`). Tooltip + `aria-label` (ya existe `data-i18n-title`). **Conservar ids y `onclick` actuales** (toggleSatellite/toggleTerrain/locateUser/resetView/toggleTheme/…): solo cambia el contenido visual del botón (emoji → `<svg>`).

## Componente 2 — Cajón bento deslizante
- **Estados**: `peek` (barra inferior: buscador + chips de categoría), `half`, `full`. Arrastre/tap en el asa para cambiar de estado; en móvil/kiosko `full` es casi pantalla completa; el mapa queda detrás.
- **Contenido**: rejilla **bento** con tarjetas de TODAS las entidades (points3D, costaPoints, hikingRoutes, businesses) más "Agenda". Tarjeta con: imagen (real o degradado por categoría), icono ilustrado/emoji de categoría, nombre, ubicación, chips. **Tarjeta destacada** rotativa (Güemes · Pueblo del Año).
- **Filtros**: chips de categoría (turista-first) + buscador (reutilizar la búsqueda existente). "Todos" por defecto.
- **Modo rama (árbol de contenidos)** — pieza central de findability: cada categoría es una **RAMA expandible con contador** ("Patrimonio (10)", "Rutas (6)", "Playas (2)", "Negocios (96)", "Güemes ⭐", "Agenda (N)"), que despliega TODOS sus ítems (con subcategorías donde existan, p. ej. negocios: alojamiento/restauración/comercio/…). Alterna con la vista **bento** (rejilla visual) mediante un toggle **Árbol ⇄ Rejilla**. El buscador global filtra árbol y tarjetas. Objetivo: que el visitante vea TODO lo que ofrece el municipio y lo encuentre en 1–2 toques; nada queda escondido tras scroll infinito.
- **Comportamiento**: al tocar una tarjeta → el cajón baja a `peek`, `map.flyTo/easeTo` al POI (con inclinación 3D) y se abre la **ficha** existente (`openDetail`) con su 360°/tour + audio-guía. Deep-links y `?qr=` siguen abriendo la ficha directamente.
- **Reutilización**: alimentarse de los mismos datos que `renderList`/`loadPointMarkers`; el cajón es una capa de presentación sobre la lógica actual, no un nuevo source of truth.
- **Motion/WOW**: transición con muelle (`--e-spring`), parallax sutil del mapa, acentos de color por categoría (paleta unificada), pines ilustrados.

## Responsive / kiosko
- **Móvil**: el cajón es el bottom-sheet a pantalla completa en `full`.
- **Kiosko (OPS táctil)**: cajón como "modo catálogo" con targets grandes; respeta el idle/atractor ya implementado.
- **Escritorio**: el cajón puede anclarse como panel inferior o lateral izquierdo (evolución del `#desktopSidebar`).

## Componente 3 — Chat multilingüe (FASE POSTERIOR, documentado)
- Botón flotante 💬 «Pregunta a Bareyo». Panel de chat ES/FR/EN.
- Técnico: función serverless `api/chat` (Vercel) → Claude vía AI Gateway; system prompt = todo el corpus de Bareyo (fichas ES/FR/EN, agenda, info práctica); responde en el idioma del visitante y puede deep-linkar a fichas. Texto primero; voz ElevenLabs a futuro.
- **Gate**: requiere API key (env var, no en `config.js`) + coste por mensaje + **aprobación del ayuntamiento**. Se construye detrás de un flag (oculto hasta aprobación). NO entra en esta iteración.

## No-objetivos (YAGNI)
- No auto-detección vecino/turista (se deja el orden turista-first fijo).
- No rehacer el detalle/ficha (se reutiliza `openDetail`).
- No tocar dashboard/qr-print/formulario.

## Validación
- `node --check` app.js/data.js/…; tests `tests/*.mjs` + `buildings-opacity`; JSON; sin BOM.
- Funcional: buscar → tocar tarjeta → mapa vuela + ficha abre (con 360 + audio); chips filtran; deep-links `#…` y `?qr=` siguen funcionando; i18n en las cadenas nuevas; menú SVG conserva todos los `onclick`.
- Visual (smoke en navegador con foco): menú limpio, cajón desliza, edificios 3D sólidos de fondo.
- Push a preview para revisión del usuario ("me encajará cuando vea el resultado").
