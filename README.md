# Descubre Bareyo

Guía interactiva del municipio de Bareyo (Cantabria): 6 rutas de senderismo con perfil altimétrico y fotos 360, puntos de patrimonio costero, 96 negocios locales y 6 tours Matterport reales de las iglesias románicas. Mapa interactivo 3D, fichas de detalle, audio-guías trilingües, integración meteorológica y de mareas, modo offline (PWA) y un kiosco táctil para la oficina de turismo.

> Sigue la guía de diseño **Clotitec Mapas Interactivos v2** ([../CLOTITEC_MAPAS_INTERACTIVOS_V2.md](../CLOTITEC_MAPAS_INTERACTIVOS_V2.md)).

---

## Stack

- **HTML/CSS/JS vanilla** — sin build, sin framework, sin TypeScript.
- **MapLibre GL JS** 4.1.2 (vía CDN unpkg).
- **Tailwind CSS** (CDN, sin postcss).
- **Tipografías**: Urbanist (headings) + DM Sans (body) — Google Fonts.
- **Datos**: `data.js` como fichero plano (96 negocios + rutas + patrimonio).
- **Despliegue**: Vercel, archivos estáticos directos.

## Estructura

```
descubre-bareyo-v2/
├── index.html          App principal (landing, mapa, fichas, tutorial)
├── app.js              Lógica (mapa, filtros, fichas, geo, clima, i18n)
├── kiosko.html/.js     App de kiosco táctil para la oficina de turismo
├── data.js             Datos: rutas, patrimonio, 3D, negocios, traducciones
├── styles.css + styles-v3.css   Estilos legacy + design system v3 (orden importa)
├── manifest.json       PWA manifest
├── sw.js               Service Worker (offline)
├── dashboard.html      Panel de analíticas + moderación de negocios
├── formulario-empresas.html   Directorio + formulario alta/edición
├── qr-print.html       Generador de QRs imprimibles
├── docs/               Documentación detallada (ver docs/AI_CONTEXT.md para contexto portable)
└── assets/
    ├── logo.png
    ├── biz/            Imágenes locales de negocios (pendientes del cliente)
    └── tracks/         6 GPX + JSON paralelos
```

## Arrancar en local

```bash
# desde la raíz del proyecto
python -m http.server 8000
# o
npx serve .
```

Abre http://localhost:8000.

## Despliegue

Vercel detecta el sitio como estático. Sin build step. Variables de entorno (cuando se introduzca Supabase): ver [docs/DEPLOY.md](docs/DEPLOY.md) y [docs/API_KEYS.md](docs/API_KEYS.md).

## Documentación

| Doc | Para qué |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Cómo está organizado el código y el flujo de datos |
| [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) | Cómo añadir un negocio, un GPX, una traducción |
| [docs/API_KEYS.md](docs/API_KEYS.md) | APIs externas usadas, qué necesita key |
| [docs/DEPLOY.md](docs/DEPLOY.md) | Configuración Vercel, headers, caché |
| [docs/PRIVACY.md](docs/PRIVACY.md) | Qué se rastrea, cómo, RGPD |
| [docs/CHANGELOG.md](docs/CHANGELOG.md) | Historial de versiones |
| [CLAUDE.md](CLAUDE.md) | Convenciones para Claude Code |

## Roadmap

Ver [docs/CHANGELOG.md](docs/CHANGELOG.md) para el plan de sprints (S1 → S10).

## Licencia y créditos

Desarrollado por **[Clotitec](https://clotitec.com)** para el municipio de Bareyo (Cantabria) — 2026.

Datos cartográficos: © OpenStreetMap, © CARTO, ArcGIS World Imagery.
