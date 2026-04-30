# Política de privacidad — Descubre Bareyo

Documento técnico del tratamiento de datos. Para el aviso legal público de cara al usuario, generar página HTML basada en este contenido en una versión adaptada por la asesoría legal del Ayuntamiento.

## Principios

1. **Sin cookies** propias ni de terceros para tracking.
2. **Sin direcciones IP** almacenadas.
3. **Sin user-agent identificador** completo (solo se deriva el tipo de dispositivo: mobile/tablet/desktop).
4. **Sin datos personales** salvo los que el propio usuario introduce voluntariamente en el formulario de alta de negocio.
5. **Almacenamiento local** (`localStorage`, `sessionStorage`, `IndexedDB`): solo para el funcionamiento del propio dispositivo (caché de APIs, idioma, tutorial visto, sesión analytics), nunca enviado a terceros.

## Datos que SÍ se recopilan

### Eventos analíticos (a partir de S7)

Cada evento envía a Supabase:

| Campo | Contenido | Justificación |
|---|---|---|
| `ts` | timestamp UTC | medir actividad temporal |
| `type` | `pageview`, `detail_open`, `qr_scan`, `gpx_download`, `phone_click`, `audio_play`, etc. | medir conversiones |
| `entity_id` | id del item (`bareyo-1`, `faro-ajo`...) | saber qué se consulta |
| `entity_type` | `route`, `costa`, `biz`, `3d` | agregaciones |
| `qr_id` | id del QR físico (si entró por QR) | medir efectividad de placas |
| `device` | `mobile`, `tablet`, `desktop` | dimensionar UX |
| `lang` | `es`, `en`, `fr`, `de` | dimensionar idiomas |
| `session_id` | UUIDv4 generado en cliente, vive en `localStorage` | distinguir sesiones SIN identificar persona |
| `meta` | `{ duration?, query?, ... }` | ampliable según evento |

**No se recopila**: IP, user-agent completo, geolocalización GPS exacta (salvo que el usuario active "Empezar ruta" — y solo se usa en su dispositivo, no se sube), email, nombre, ningún dato del navegador identificador.

El `session_id` es **anónimo**: un UUID al azar guardado en `localStorage`. Si el usuario borra el almacenamiento del navegador, se rota. No permite identificar a la persona.

### Formulario de alta de negocios (S9)

El usuario introduce **voluntariamente**:

- Datos del negocio (nombre, dirección, teléfono, email, web, descripción, fotos, horarios).
- Datos del solicitante (nombre, cargo, teléfono, email).

Estos datos se almacenan en `business_requests` (Supabase) hasta su revisión por el Ayuntamiento. Tras aprobación, los datos del negocio pasan a publicarse en el mapa; los datos del solicitante se conservan internamente por trazabilidad y luego se anonimizan.

**Base legal** (RGPD): cumplimiento de una obligación de servicio público + interés legítimo del Ayuntamiento en mantener actualizado el directorio comercial.

**Plazo de conservación**: solicitudes pendientes hasta resolución; aprobadas/rechazadas, máximo 2 años desde la decisión, después se anonimiza el solicitante.

### Almacenamiento local (no se envía a nadie)

| Clave `localStorage` | Contenido |
|---|---|
| `bareyo_lang` | idioma elegido |
| `bareyo_tutorial_seen` | `1` si ya vio el tutorial |
| `bareyo_session_id` | UUID anónimo |
| `bareyo_boundary_cache` | polígono Bareyo de Nominatim (24 h) |
| `bareyo_weather_cache` | clima Open-Meteo (30 min) |
| `bareyo_*_cache` | cualquier otra API |

Caché de Service Worker: shell de la app, GPX, tiles del mapa visitados.

## Datos que NO se recopilan ni transmiten

- IP del visitante.
- User-agent identificador.
- Cookies de Google / Meta / Facebook.
- Posición GPS continua (solo durante la función opcional "Empezar ruta", y nunca sale del dispositivo).
- Historial de navegación.
- Identificadores publicitarios.

## Terceros con los que se comparte

Servicios técnicos invocados por el navegador del usuario:

| Servicio | Por qué se llama |
|---|---|
| **Open-Meteo** | clima, mareas, aire (no log de IP según ToS) |
| **Sunrise-Sunset.org** | amanecer/atardecer |
| **Wikipedia** | extractos de patrimonio |
| **OpenStreetMap (Nominatim, tiles vía CARTO)** | mapa base |
| **ArcGIS** (Esri) | tiles de satélite |
| **CartoDB** | basemap |
| **Google Maps** (solo enlace de "Cómo llegar") | navegación |
| **Supabase** | almacenamiento de eventos y formularios |

Cada uno tiene su propia política. La invocación se hace desde el navegador del usuario directamente — Descubre Bareyo no actúa como intermediario.

## Derechos del usuario (RGPD)

- **Acceso, rectificación, supresión, oposición**: contactar con el Ayuntamiento de Bareyo (a definir email DPD).
- **Datos analíticos**: al ser anónimos no son revertibles a una persona específica; el usuario puede borrar `localStorage` para rotar su `session_id`.
- **Borrado de solicitud de alta no resuelta**: contactar al Ayuntamiento adjuntando el id de la solicitud (devuelto al usuario al enviar el form).

## Cookie banner

**No se necesita cookie banner** mientras se mantenga la política descrita (sin cookies de tracking, sin terceros publicitarios). Si en el futuro se introduce Google Analytics o similar, sería obligatorio.

## Contacto

- Responsable: Ayuntamiento de Bareyo.
- Encargado del tratamiento (analytics): Clotitec — https://clotitec.com.
- Delegado de Protección de Datos: a definir por el Ayuntamiento.
