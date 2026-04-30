# assets/biz/

Imágenes locales de los 96 negocios de Bareyo. Las fotos las suministra el cliente.

## Convención de nombres

```
assets/biz/{biz-id}.webp
```

Ejemplo: para el negocio con `id: 'biz-001'`, el archivo sería `biz-001.webp`.

## Cómo activarlas en `data.js`

En cada entrada de `businesses[]`, añadir el campo `localImage`:

```js
{
    id: 'biz-001',
    name: 'Hotel La Casona',
    // ... otros campos
    localImage: 'assets/biz/biz-001.webp'
}
```

La cascada de prioridad es: **`localImage` > `image` (Unsplash) > categoría default**.

Si la foto local falla al cargar (404, error de red), el frontend usa la URL Unsplash como fallback automático.

## Recomendaciones

- **Formato**: WebP (mejor compresión que JPEG/PNG manteniendo calidad).
- **Tamaño**: ~1200 × 800 px máximo (suficiente para hero del detail modal).
- **Peso**: < 150 KB por imagen tras compresión.
- **Compresor recomendado**: [Squoosh](https://squoosh.app) (Calidad 75-80, mozJPEG o WebP).

## ¿Por qué local en vez de Unsplash?

1. **PWA offline**: el Service Worker cachea estas imágenes y la app sigue mostrando fotos sin red.
2. **Control de marca**: fotos reales del negocio en lugar de stock genérico.
3. **Sin dependencia**: si Unsplash cambia política o URLs, la app no se rompe.
4. **GDPR**: las URLs Unsplash incluyen tracking de imagen — local elimina esa exposición.
