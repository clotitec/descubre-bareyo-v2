# Descubre Bareyo

Guía interactiva del municipio de Bareyo (Cantabria): 5 rutas de senderismo con perfil altimétrico, 4 puntos de patrimonio costero, 96 negocios locales y modelos 3D inmersivos de las iglesias románicas. Mapa interactivo, fichas de detalle, audio-guías, integración meteorológica y de mareas, y modo offline para senderismo.

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
├── data.js             Datos: rutas, patrimonio, 3D, negocios, traducciones
├── styles.css          Estilos (variables, responsive, glass morphism)
├── manifest.json       PWA manifest
├── sw.js               Service Worker (offline) — pendiente
├── dashboard.html      Panel de analíticas — pendiente
├── formulario-empresas.html   Directorio + formulario alta — pendiente
├── qr-print.html       Generador de QRs imprimibles — pendiente
├── docs/               Documentación detallada
└── assets/
    ├── logo.png
    ├── biz/            Imágenes locales de negocios (vacía hoy)
    └── tracks/         5 GPX + 5 JSON paralelos
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
