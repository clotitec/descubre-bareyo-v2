# Mapping QR → deep-link de la app · Descubre Bareyo

**Objetivo:** repuntar cada QR dinámico de la cartelería (switchy.io, workspace `11811`) para que abra la **ficha del monumento en la app** (con su tour 360°/Matterport, texto y audio-guía) en vez de la home genérica del ayuntamiento.

## Cómo se construye el destino

Formato **estable por id** (recomendado — no se rompe aunque cambie el nombre):

```
https://descubre-bareyo-v2.vercel.app/?qr=<ID>
```

`?qr=<ID>` dispara `handleQrEntry()` → registra `qr_scan` en analítica → abre la ficha correspondiente y limpia la URL. Alternativa por hash: `/#3d=<slug>` o `/#patrimonio=<slug>` (menos estable si se renombra).

> ⚠️ **Importante:** los destinos apuntan a **producción** (`descubre-bareyo-v2.vercel.app`). Esa URL mostrará los nuevos POIs/tours **cuando se mergee la rama `feat/atlas-kiosko-turismo` a `main`** (hoy seguimos en preview por tu decisión). Repunta los QR ahora y **haz el merge a producción antes de que la cartelería salga a la calle**, o los QR llevarán a la versión antigua.

## Tabla de repunte (12 QR)

| # | Monumento / punto | ID (estable) | **Destino a poner en el QR** | Título esperado en Switchy |
|---|---|---|---|---|
| 1 | Iglesia de Santa María de Bareyo (románico, BIC) | `3d-sta-maria-bareyo` | `https://descubre-bareyo-v2.vercel.app/?qr=3d-sta-maria-bareyo` | "… Santa María de Bareyo" (ES/EN) |
| 2 | Ermita de San Pedruco | `3d-san-pedruco` | `https://descubre-bareyo-v2.vercel.app/?qr=3d-san-pedruco` | "… San Pedruco" (ES/EN) |
| 3 | Ermita de San Julián (Güemes) | `3d-san-julian` | `https://descubre-bareyo-v2.vercel.app/?qr=3d-san-julian` | "… San Julián" (ES/EN) |
| 4 | Iglesia de San Vicente Mártir (Güemes) | `3d-san-vicente-guemes` | `https://descubre-bareyo-v2.vercel.app/?qr=3d-san-vicente-guemes` | "… San Vicente / San Juan Eva…" (ES/EN) |
| 5 | Iglesia de San Martín de Tours (Ajo) | `3d-san-martin-tours` | `https://descubre-bareyo-v2.vercel.app/?qr=3d-san-martin-tours` | "… San Martín de Tours" (ES/EN) |
| 6 | Convento de San Ildefonso | `3d-san-ildefonso` | `https://descubre-bareyo-v2.vercel.app/?qr=3d-san-ildefonso` | "… 7 San Ildefonso" (ES/EN) — *hoy `s61K/s61N` → home* |
| 7 | Faro de Ajo (Okuda) | `faro-ajo` | `https://descubre-bareyo-v2.vercel.app/?qr=faro-ajo` | "… Faro Ajo" (carpeta Cartel Faro Ajo) |
| 8 | La Ojerada | `ojerada` | `https://descubre-bareyo-v2.vercel.app/?qr=ojerada` | "… Ojerada / Orejada" |
| 9 | Ermita de San Roque | `ermita-san-roque` | `https://descubre-bareyo-v2.vercel.app/?qr=ermita-san-roque` | "… 5 Ermita San Roque" (ES/EN) — *hoy `s61M/s61L` → home* |
| 10 | Playa de Ajo (Cuberris) | `playa-cuberris` | `https://descubre-bareyo-v2.vercel.app/?qr=playa-cuberris` | "… Cuberris / Playa Ajo" |
| 11 | Playa de la Antuerta | `playa-ajo` | `https://descubre-bareyo-v2.vercel.app/?qr=playa-ajo` | "… Antuerta" |
| 12 | Ría de Ajo | `ria-ajo` | `https://descubre-bareyo-v2.vercel.app/?qr=ria-ajo` | "… Ría de Ajo" |

## CSV (por si Switchy admite edición/importación masiva)

```csv
monumento,id,destino
Santa María de Bareyo,3d-sta-maria-bareyo,https://descubre-bareyo-v2.vercel.app/?qr=3d-sta-maria-bareyo
Ermita de San Pedruco,3d-san-pedruco,https://descubre-bareyo-v2.vercel.app/?qr=3d-san-pedruco
Ermita de San Julián,3d-san-julian,https://descubre-bareyo-v2.vercel.app/?qr=3d-san-julian
Iglesia de San Vicente Mártir,3d-san-vicente-guemes,https://descubre-bareyo-v2.vercel.app/?qr=3d-san-vicente-guemes
Iglesia de San Martín de Tours,3d-san-martin-tours,https://descubre-bareyo-v2.vercel.app/?qr=3d-san-martin-tours
Convento de San Ildefonso,3d-san-ildefonso,https://descubre-bareyo-v2.vercel.app/?qr=3d-san-ildefonso
Faro de Ajo,faro-ajo,https://descubre-bareyo-v2.vercel.app/?qr=faro-ajo
La Ojerada,ojerada,https://descubre-bareyo-v2.vercel.app/?qr=ojerada
Ermita de San Roque,ermita-san-roque,https://descubre-bareyo-v2.vercel.app/?qr=ermita-san-roque
Playa de Ajo (Cuberris),playa-cuberris,https://descubre-bareyo-v2.vercel.app/?qr=playa-cuberris
Playa de la Antuerta,playa-ajo,https://descubre-bareyo-v2.vercel.app/?qr=playa-ajo
Ría de Ajo,ria-ajo,https://descubre-bareyo-v2.vercel.app/?qr=ria-ajo
```

## Ventaja de mantenerlo en Switchy

Como los QR son **dinámicos**, la placa física impresa **no cambia nunca**; solo se edita el destino en Switchy. Si mañana quieres que un QR abra otra cosa (una promoción, una encuesta, otro idioma), se cambia sin reimprimir.

## Verificación (los que ya comprobé)

- `swiy.co/s61K` ("ES - 7 San Ildefonso Copia") y `swiy.co/s61M/s61L/s61N` → **hoy caen en `aytobareyo.org` (home)**, no en el monumento. Son los primeros a repuntar.
- Los **6 tours Matterport están vivos** y con el título correcto (verificados), así que el destino final (la ficha de la app que embebe el tour) funcionará.
