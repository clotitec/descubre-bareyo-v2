# Cómo contribuir a Descubre Bareyo

## Añadir un negocio nuevo

1. Abre `data.js` y localiza la sección `// ==================== BUSINESSES ====================` (alrededor de la línea 202).
2. Añade un objeto al array `businesses` siguiendo el esquema:

```js
{
    id: 'biz-097',                    // único, secuencial recomendado
    name: 'Hotel La Casona',
    category: 'alojamiento',          // alojamiento|restauracion|comercio|surf|salud|servicios
    subcategory: 'hotel',             // libre, debería existir en CATEGORY_EMOJIS
    coords: [-3.6012, 43.4793],       // [lon, lat] WGS84 — usa Google Maps clic derecho "qué hay aquí"
    location: 'Ajo, Bareyo',
    desc: 'Casona del s. XVIII rehabilitada con 12 habitaciones.',
    phone: '+34 942 67 12 34',        // formato internacional preferido
    website: 'https://lacasona-bareyo.es',
    hours: 'Lun-Dom 8:00-22:00',
    image: '',                        // dejar vacío para usar default por categoría
    localImage: 'assets/biz/biz-097.webp',  // si ya tienes foto local
    tags: ['Romántico', 'Familiar', 'Vistas']
}
```

3. Si aportas foto: guárdala en `assets/biz/biz-097.webp` (formato WebP, ~1200px de ancho, comprimida con [Squoosh](https://squoosh.app)).
4. Verifica visualmente: `python -m http.server 8000` → busca el negocio por nombre → comprueba que aparece en mapa, lista y ficha.

## Añadir una ruta de senderismo nueva

1. Genera el GPX con tu app habitual (Wikiloc, Strava, OutDoor Active export, etc.).
2. Convierte a array de coordenadas con altitud `[lon, lat, alt]`. Tooling sugerido:
   - `gpxpy` (Python, ~10 líneas) o
   - https://www.gpsvisualizer.com/convert
3. Coloca el GPX en `assets/tracks/<slug>.gpx` y el JSON paralelo en `assets/tracks/<slug>.json`.
4. Añade la ruta a `hikingRoutes` en `data.js`:

```js
{
    id: 'bareyo-6',
    name: 'Costa de la Ojerada',
    km: '5.4',
    time: '1h 30m',
    diff: 'easy',                  // easy|medium|hard
    type: 'circular',              // circular|lineal
    color: { main: '#0EA5E9', glow: '#38BDF8', name: 'Cian' },
    routeNumber: 6,
    desc: 'Ruta corta y panorámica por la costa de la Ojerada hasta el mirador del arco natural.',
    location: 'Costa de Ajo',
    coords: [[-3.5934, 43.4900, 50], [-3.5912, 43.4915, 65], /* … */],
    tags: ['Costa', 'Vistas', 'Familia'],
    gpxUrl: 'assets/tracks/ojerada.gpx'
}
```

5. Actualiza `ROUTE_COLORS` con la nueva entrada.

## Añadir un punto de patrimonio o costa

```js
// en data.js → costaPoints
{
    id: 'molino-venera',
    name: 'Molino de la Venera',
    coords: [-3.5950, 43.4710],
    desc: 'Antiguo molino harinero del s. XVIII restaurado.',
    location: 'Bareyo',
    tags: ['Molino', 'Patrimonio', 'Industrial'],
    wikiTitle: 'Molino_de_la_Venera_(Bareyo)'   // opcional, S3+
}
```

## Añadir un modelo 3D

```js
// en data.js → points3D
{
    id: '3d-san-vicente',
    name: 'Iglesia de San Vicente',
    coords: [-3.6361, 43.4555],
    desc: 'Tour 3D inmersivo del interior románico.',
    url360: 'https://my.matterport.com/show/?m=ABC123XYZ',  // URL real de Matterport
    location: 'Bareyo',
    tags: ['3D', 'Románico'],
    wikiTitle: 'Iglesia_de_San_Vicente_(Bareyo)'
}
```

## Añadir o actualizar una traducción

`TRANSLATIONS` en `data.js` (~línea 350) tiene 4 idiomas: `es`, `en`, `fr`, `de`. **Toda clave debe existir en los 4** (deja la string vacía solo como último recurso).

```js
// Para añadir un nuevo string:
TRANSLATIONS.es.tides = 'Mareas';
TRANSLATIONS.en.tides = 'Tides';
TRANSLATIONS.fr.tides = 'Marées';
TRANSLATIONS.de.tides = 'Gezeiten';
```

En el HTML, marca el elemento con `data-i18n="tides"`. En JS, usa `t('tides')`.

## Añadir un QR físico nuevo (S8+)

1. Decide el `qr_id` (slug minúsculas, sin espacios). Si es para una entidad existente, usa su id (`bareyo-1`, `faro-ajo`); si es independiente, prefijo `qr-`: `qr-aparcamiento-faro`.
2. Si es nuevo (no mapea a entidad), añade en Supabase:
   ```sql
   insert into qr_locations (qr_id, label, lat, lon, installed_at, notes)
   values ('qr-aparcamiento-faro', 'Aparcamiento del Faro de Ajo', 43.4835, -3.5855, now(), 'Placa metálica 20x20cm');
   ```
3. Genera la placa imprimible desde `qr-print.html` (acceso con clave de admin).

## Pull requests / cambios

- Una rama por funcionalidad.
- Mensaje de commit en imperativo: `add ruta-6 costa ojerada`, `fix iframe matterport sandbox`.
- Test manual mínimo:
  - El elemento aparece en lista, mapa y búsqueda.
  - Detail modal abre y muestra todos los campos.
  - i18n: cambiar idioma no rompe.
  - Mobile: bottom sheet sigue funcional.

## Anti-patrones

- **No** guardar URLs Unsplash con tracking (sin `utm_*`).
- **No** poner NIF/CIF en `desc` o `tags`.
- **No** introducir dependencias npm sin discutirlo (mantener vanilla).
- **No** romper retrocompat de URLs `#item=...`.
- **No** hardcodear strings en `app.js` que serían traducibles — meterlos en `TRANSLATIONS`.
