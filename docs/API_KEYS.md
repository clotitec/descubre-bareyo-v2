# APIs externas y gestión de claves

## Resumen

A día de hoy (sprints S1–S6) **ninguna API requiere key**. El proyecto se mantiene 100% gratuito y sin gestión de credenciales. A partir de S7 se introduce **Supabase** (anon key, no es secret estricto) y opcionalmente **AEMET OpenData** (key gratuita pero requiere registro).

## APIs sin key (en uso o planificadas)

| API | URL base | Uso | Caché |
|---|---|---|---|
| **Open-Meteo** | `https://api.open-meteo.com/v1/forecast` | Clima current + forecast 7 días | 30 min |
| **Open-Meteo Marine** | `https://marine-api.open-meteo.com/v1/marine` | Altura ola, periodo, temperatura del mar | 1 h |
| **Open-Meteo Air Quality** | `https://air-quality-api.open-meteo.com/v1/air-quality` | AQI europeo, polen, PM2.5/PM10 | 1 h |
| **Sunrise-Sunset** | `https://api.sunrise-sunset.org/json` | Amanecer, atardecer, hora dorada | 24 h |
| **Wikipedia REST** | `https://es.wikipedia.org/api/rest_v1/page/summary/{title}` | Extractos patrimonio | 7 días |
| **Nominatim (OSM)** | `https://nominatim.openstreetmap.org/search` | Boundary del municipio | 24 h |
| **CartoDB Voyager** | `https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json` | Basemap MapLibre | (CDN) |
| **ArcGIS World Imagery** | `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/...` | Tiles satélite | (CDN) |

Todas se llaman **directamente desde el navegador**. Open-Meteo y Sunrise-Sunset permiten CORS sin restricciones.

## Tabla de mareas (sin API)

`assets/data/tides-2026.json` — tabla anual precomputada offline para Bareyo / puerto de Santander, basada en armónicas públicas. ~30 KB. No necesita red. Se regenera cada año (S2).

## APIs con key

### Supabase (a partir de S7)

- **URL**: `https://<project-ref>.supabase.co`
- **anon key**: clave pública, expone solo lo permitido por las **Row Level Security policies** definidas en la BD. **No es un secreto estricto** (Supabase la diseña para ir en cliente).
- **service_role key**: ⚠️ NUNCA en cliente. Solo para tareas administrativas en máquina del operador.

#### Variables en Vercel
```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
```

Inyección al cliente:
- **Opción A** (recomendada): página estática `config.js` que Vercel reemplaza con plantilla durante build (`vercel.json` rewrites o build hook).
- **Opción B**: hardcodear en `app.js` (válido porque la anon key no es secret). Documentar claramente qué se puede leer/escribir vía RLS.

#### Tablas y RLS (resumen)

| Tabla | Cliente puede | RLS |
|---|---|---|
| `events` | `INSERT` | sí, sin límite de inserción pero rate-limit |
| `events` | `SELECT` | NO desde cliente (solo desde dashboard con clave) |
| `business_requests` | `INSERT` (estado=pending) | sí |
| `business_requests` | `SELECT/UPDATE` | NO (solo dashboard admin) |
| `qr_locations` | `SELECT` | sí (es público para mostrar mapa) |
| `qr_locations` | `INSERT/UPDATE` | NO desde cliente |

Esquema completo en `docs/DEPLOY.md`.

### AEMET OpenData (opcional, fuente secundaria)

- **URL**: `https://opendata.aemet.es/opendata/api`
- **Key**: gratis, registro en https://opendata.aemet.es/centrodedescargas/altaUsuario
- **Uso**: complementar mareas/oleaje con datos oficiales españoles si Open-Meteo Marine no basta.
- **Estado**: no integrado por defecto (Open-Meteo cubre 90 % del caso).
- **Si se integra**: la key NO debe ir en cliente — proxy mínimo en Vercel Function `/api/aemet?endpoint=...`.

## APIs descartadas

| API | Motivo |
|---|---|
| **Stormglass** (mareas precisas) | Requiere key freemium; descartado por restricción gratis |
| **WorldTides** | Idem |
| **Eleven Labs** (TTS premium) | De pago; usamos Web Speech API |
| **Google Places** | De pago |
| **TripAdvisor** | Sin API pública |

## Caché unificada (helper `cachedFetch`)

Todas las llamadas pasan por el helper `cachedFetch(key, url, ttlMin)`:

- Lectura: `localStorage[key]` con `{ts, data}` → si `now - ts < ttlMin*60_000` → devuelve cached.
- Miss / expirado: `fetch(url)` → guarda → devuelve.
- Error de red: si hay cached aunque expirado → devuelve. Si no, propaga el error.

Definido en `app.js`. Documentar TTL elegido por API en este archivo.

## Privacidad

Ninguna API que llamamos manda datos personales. Sin cookies. Sin tracking de terceros (no Google Analytics, no Facebook Pixel). Lo único que registramos son los eventos del helper `track()` hacia Supabase, sin IP ni user-agent identificador. Ver [PRIVACY.md](PRIVACY.md).
