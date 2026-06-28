# Despliegue — Descubre Bareyo

## Hosting recomendado: Vercel

Sin build step. Vercel detecta la carpeta como "Other framework / Static" y sirve los ficheros tal cual.

### Primer despliegue

```bash
# desde la raíz del repositorio
vercel
```

Selecciona:
- Framework: **Other**
- Build command: *(vacío)*
- Output directory: **`.`**

Tras desplegar, asignar dominio en `vercel.com` (p. ej. `descubre-bareyo.vercel.app` o el dominio del cliente).

### Variables de entorno (sprint S7+)

Ir a Vercel → Project → Settings → Environment Variables.

```
SUPABASE_URL          https://<proyecto>.supabase.co
SUPABASE_ANON_KEY     eyJ...
DASHBOARD_PASSWORD    <hash SHA-256 de la clave del dashboard>
```

`DASHBOARD_PASSWORD` se compara client-side contra el SHA-256 de lo que el usuario teclea — sirve para protección casual del dashboard, no para amenazas serias.

## `vercel.json` recomendado

```json
{
  "headers": [
    {
      "source": "/(.*)\\.(html|js|css|json)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=300, must-revalidate" }
      ]
    },
    {
      "source": "/assets/(.*)\\.(png|jpg|jpeg|webp|svg|gpx)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=2592000, immutable" }
      ]
    },
    {
      "source": "/sw.js",
      "headers": [
        { "key": "Cache-Control", "value": "no-cache" },
        { "key": "Service-Worker-Allowed", "value": "/" }
      ]
    },
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "SAMEORIGIN" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "X-Content-Type-Options", "value": "nosniff" }
      ]
    }
  ]
}
```

Notas:
- `sw.js` con `no-cache` para que cualquier cambio se propague al instante.
- Assets versionados (gpx/png/webp) con caché agresivo — si cambias un GPX, renómbralo o añade `?v=2`.
- Sin `Content-Security-Policy` estricto por ahora porque MapLibre/CartoDB cargan tiles cross-origin. Endurecer cuando se asiente.

## Esquema Supabase (S7)

```sql
-- Eventos analytics
create table events (
  id           bigserial primary key,
  ts           timestamptz not null default now(),
  type         text not null,
  entity_id    text,
  entity_type  text,
  qr_id        text,
  device       text,
  lang         text,
  session_id   text,
  meta         jsonb default '{}'
);
create index events_ts_idx on events (ts desc);
create index events_type_idx on events (type);
create index events_qr_idx on events (qr_id) where qr_id is not null;

-- Solicitudes de alta de empresas
create table business_requests (
  id           uuid primary key default gen_random_uuid(),
  ts           timestamptz not null default now(),
  status       text not null default 'pending',  -- pending | approved | rejected
  payload      jsonb not null,                   -- todos los campos del form
  photos       text[] default '{}',              -- URLs en Storage
  reviewer     text,                             -- email del admin que revisó
  reviewed_at  timestamptz,
  notes        text
);
create index biz_req_status_idx on business_requests (status, ts desc);

-- Ubicación física de cada QR del municipio
create table qr_locations (
  qr_id        text primary key,
  entity_id    text,                             -- a qué entidad lleva (route, costa, biz, 3d)
  label        text not null,                    -- "Inicio Cabo Quintres"
  lat          double precision,
  lon          double precision,
  installed_at timestamptz,
  notes        text
);

-- Banderas de baño (Cruz Roja) por playa — las fija un operador desde el dashboard
-- (no hay feed oficial automatizable; ver docs y memoria del proyecto)
create table beach_flags (
  entity_id   text primary key,                 -- id de la playa en data.js (p.ej. 'playa-cuberris')
  flag        text not null default 'sin-dato', -- verde | amarilla | roja | sin-dato
  updated_at  timestamptz default now()
);

-- (Opcional, S10) Negocios como source of truth en BD
create table businesses (
  id           text primary key,
  name         text not null,
  category     text,
  subcategory  text,
  pueblo       text,
  coords       double precision[],
  desc         text,
  phone        text,
  email        text,
  website      text,
  hours        text,
  tags         text[] default '{}',
  photos       text[] default '{}',
  active       boolean default true,
  updated_at   timestamptz default now()
);
```

### Row Level Security

```sql
alter table events enable row level security;
alter table business_requests enable row level security;
alter table qr_locations enable row level security;
alter table businesses enable row level security;
alter table beach_flags enable row level security;

-- Anon puede insertar eventos
create policy events_insert on events
  for insert to anon with check (true);

-- Anon NO puede leer eventos (solo dashboard con service_role en backend)
-- (no policy = denegado por defecto con RLS activo)

-- Anon puede insertar solicitudes de alta (estado=pending solo)
create policy biz_req_insert on business_requests
  for insert to anon with check (status = 'pending');

-- Anon NO puede leer ni actualizar solicitudes

-- Anon SÍ puede leer ubicaciones de QRs (público)
create policy qr_loc_select on qr_locations
  for select to anon using (true);

-- Anon SÍ puede leer negocios activos
create policy biz_select on businesses
  for select to anon using (active = true);

-- Banderas de playa: dato SENSIBLE de seguridad (verde/amarilla/roja = bañarse seguro/precaución/peligro).
-- Lectura pública; ESCRITURA solo por rol autenticado, NUNCA anon: la anon key viaja embebida en
-- config.js del sitio y la clave del dashboard es un SHA-256 verificado en cliente → no autoriza nada en BD.
-- Con anon UPDATE, cualquiera con la anon key podría voltear una playa 'roja' (peligro) a 'verde' (seguro).
create policy flags_select on beach_flags for select to anon using (true);
-- El dashboard debe escribir AUTENTICADO (Supabase Auth, rol operador) o vía la Vercel Function
-- service_role de la opción A (más abajo). No conceder insert/update a anon sobre datos de seguridad.
create policy flags_write on beach_flags for all to authenticated using (true) with check (true);
```

El **dashboard** lee con la `service_role` key — pero NO desde cliente. Hay dos opciones:
- **A**: dashboard llama a una Vercel Function `/api/dashboard?from=...&to=...` que usa `service_role` en backend.
- **B**: dashboard usa la `anon` key con políticas SELECT autenticadas por una contraseña enviada como header — más complejo.

Recomendación: **opción A** con Vercel Function (~50 líneas).

## Storage Supabase (fotos negocios)

Bucket público de solo-lectura `business-photos`:

```
business-photos/
  ├── {request_id}/
  │     ├── 1.webp
  │     ├── 2.webp
  │     └── ... (max 6)
```

Política de Storage:
- INSERT: anon puede subir a `{request_id}/*` si el `request_id` corresponde a una `business_requests` con `status=pending` recién insertada (validación vía `before_insert` trigger).
- SELECT: público.

## Pre-flight checks antes de deploy

- [ ] `python -m http.server 8000` → la app carga, los 4 tabs funcionan.
- [ ] DevTools → Application → manifest válido.
- [ ] Network → ningún 404, ninguna API key visible donde no toque.
- [ ] Lighthouse PWA score > 90.
- [ ] Probar en móvil real (instalar como app, modo avión).
- [ ] Probar deep link `?qr=ruta-iglesias` y `#item=bareyo-1`.
