# Guía del kiosco táctil "Descubre Bareyo" — Oficina de Turismo

Esta guía está pensada para el personal de la oficina de turismo. La primera parte
(secciones 1 a 5) es para el día a día y no requiere conocimientos técnicos. El
**Anexo técnico** al final es para quien instale o configure el equipo (informático
del ayuntamiento o proveedor).

Nombre de la app: **Descubre Bareyo** · URL pública (la que se abre desde el QR "llévatelo al móvil"): **https://descubre-bareyo-v2.vercel.app**

---

## 1) Puesta en marcha diaria

Al abrir la oficina:

1. **Encender la pantalla.** Pulsa el botón de encendido de la pantalla/TV (o del módulo
   OPS Windows si tiene botón propio). Espera 1–2 minutos: el equipo arranca y la app
   debe aparecer sola en pantalla completa (así queda configurado, ver Anexo A).
2. **Comprobar que está en pantalla completa.** No debe verse ninguna barra de tareas
   de Windows, ni bordes del navegador, ni reloj de Windows abajo. Solo la guía.
   - Si NO está en pantalla completa: haz una **pulsación larga (~4 segundos) en la
     esquina superior izquierda** de la pantalla (encima del logo) hasta que aparezca el
     panel **Mantenimiento**, y pulsa **"🖥️ Pantalla completa"**. Cierra el panel con
     **"✕ Volver al modo visitante"**.
3. **Prueba rápida (30 segundos).** Toca el mapa: debe reaccionar. Toca un punto de
   interés: debe abrir su ficha. Deja de tocar y, tras un rato, la pantalla vuelve sola
   a la animación de bienvenida (el "atractor").

### Comportamiento normal que NO es una avería

- **Vuelve solo a la pantalla de bienvenida** tras **90 segundos** sin que nadie toque.
  Es a propósito: así queda lista para el siguiente visitante.
- **No se puede hacer zoom con los dedos, ni seleccionar texto, ni sale el menú del
  botón derecho.** Es a propósito, para que el visitante no "rompa" la vista.
- **El QR de abajo ("Llévate la guía")** es fijo: al escanearlo con el móvil se abre la
  guía pública en el teléfono del visitante. No hay que tocar nada.

### Si el kiosco se queda congelado (no responde al tocar)

1. Haz una **pulsación larga de ~4 segundos en la esquina superior izquierda**.
2. Cuando aparezca el panel **Mantenimiento**, pulsa **"🔄 Reiniciar kiosco"**.
3. Espera unos segundos: la app se recarga sola y vuelve a la bienvenida.
4. Si ni siquiera aparece el panel de mantenimiento, apaga y enciende la pantalla/OPS
   con el botón físico (ver sección 5) o avisa al soporte técnico.

### Al cerrar la oficina

- Puedes **dejar el equipo encendido** (está pensado para funcionar todo el día) o
  **apagar la pantalla** con su botón. Si lo apagas, al día siguiente vuelve a arrancar
  solo con la app.

---

## 2) Cómo debe quedar configurado el OPS Windows (robusto)

> Esta sección la hace **una vez** el informático al instalar. El personal de la oficina
> no necesita repetirla. Se resume aquí para saber "cómo debería estar" y los pasos
> concretos están en el **Anexo A**.

El módulo OPS Windows debe quedar así:

- **Arranca solo con la app en pantalla completa** (navegador en modo kiosco apuntando a
  la guía). El visitante nunca ve el escritorio de Windows.
- **No se suspende, no se apaga la pantalla y no entra salvapantallas** durante el
  horario de apertura.
- **No instala actualizaciones de Windows en horario de apertura** (se programan para la
  noche).
- **Barra de tareas oculta** y **teclas de Windows / gestos desactivados**, para que
  nadie salga de la app.

Pasos concretos de Windows: **Anexo A**.

---

## 3) Bloquear los BOTONES FÍSICOS de la pantalla/TV

Muchas pantallas y televisores tienen botones físicos (o un mando) con los que un
visitante podría cambiar la entrada de vídeo, el brillo, el idioma del menú, o apagarla.
Casi todas las pantallas comerciales / profesionales tienen una función para
**bloquear esos botones**. Se llama de formas distintas según la marca:

- **"Bloqueo de teclas" / "Key Lock" / "Button Lock"**
- **"OSD Lock" / "Bloqueo del menú en pantalla"**
- **"Modo hotel" / "Hotel Mode" / "Modo instalación / comercial"**

### Método genérico (sirve como orientación)

1. Abre el menú de la pantalla con el botón **MENU** (o el mando).
2. Entra en **Ajustes / Configuración / Setup** (a veces dentro de **Sistema** o
   **Opciones avanzadas**).
3. Busca **"Bloqueo de teclas" / "Key Lock" / "OSD Lock"** y actívalo.
4. En muchas pantallas el bloqueo se activa **manteniendo pulsado el botón MENU (o una
   combinación de teclas) durante ~5 a 10 segundos** hasta que aparece "Bloqueado" /
   "Locked" en pantalla. Para desbloquear se repite la misma pulsación larga.
5. Si la pantalla tiene **"Modo hotel"**, actívalo: además de bloquear botones, suele fijar
   la entrada de vídeo y el volumen, ideal para kiosco.

> **[MODELO / MARCA DE LA PANTALLA: pendiente]**
>
> Los pasos exactos dependen del modelo concreto. **En cuanto nos indiquéis marca y
> modelo exacto de la pantalla** (suele estar en una etiqueta detrás del equipo)
> **os damos los pasos precisos** de esa pantalla.
>
> Mientras tanto: en el manual del modelo, buscad los términos **"modo hotel"**,
> **"key lock"**, **"OSD lock"** o **"bloqueo de botones"**. Casi siempre está en el
> apartado de Ajustes/Sistema del menú.

---

## 4) Mantenimiento de contenido

### 4.1 Bandera de baño del día (estado del mar)

La bandera (verde / amarilla / roja) se cambia desde el **dashboard**, no desde el kiosco:

1. En un ordenador o tablet de la oficina, abre **`/dashboard.html`** de la web.
2. Introduce la **clave** de la oficina.
3. Localiza el control de **bandera / estado del mar** y selecciona la del día.
4. Guarda. El kiosco recoge el cambio (si no aparece al momento, usa
   **Mantenimiento → 🔄 Reiniciar kiosco** para forzar la recarga).

> Recomendación: actualizar la bandera **cada mañana** al abrir, según el parte de la
> playa/socorrismo.

### 4.2 QR dinámicos (Switchy)

Los QR impresos en cartelería (placas, folletos) que sean **dinámicos** apuntan a un
enlace de **Switchy** que se puede **redirigir sin reimprimir el QR**:

- Para cambiar a dónde lleva un QR ya impreso: entra en la cuenta de **Switchy**, localiza
  el enlace corto y **cambia su destino**. El QR físico sigue igual, pero ahora abre la
  nueva URL.
- El QR fijo del propio kiosco ("Llévate la guía") apunta a la URL pública y normalmente
  **no hay que tocarlo**.

### 4.3 Antes de imprimir cartelería: mergear a producción

⚠️ **Recordatorio importante para el técnico.** Antes de **imprimir QR o cartelería**
que apunte a rutas/fichas concretas, hay que **mergear los cambios a producción**
(rama `main` → deploy en Vercel) y **comprobar que las URLs y deep links funcionan en
la web pública**. Si se imprime antes de mergear, los QR pueden llevar a páginas que
todavía no existen en producción.

---

## 5) Solución de problemas rápida

| Síntoma | Qué hacer |
|---|---|
| **El mapa no carga / se queda gris** | Suele ser problema de **red/Internet** o del servicio de mapas (Overpass/tiles). Comprueba que hay conexión (otras webs cargan). Espera un minuto y usa **Mantenimiento → 🔄 Reiniciar kiosco**. Si persiste, revisa el router/WiFi. |
| **No suena el audio (audioguías)** | Sube el **volumen del OPS Windows** (icono de altavoz en Windows, ver Anexo A) y comprueba que la pantalla/altavoces no están en silencio ni con el volumen físico a cero. |
| **No vuelve a la pantalla de inicio** | Es automático a los **90 segundos** sin tocar. Para forzarlo antes: pulsación larga en la esquina superior izquierda → **🔄 Reiniciar kiosco**. |
| **Se ve el escritorio de Windows / barra de tareas** | No está en pantalla completa. Pulsación larga esquina superior izquierda → **🖥️ Pantalla completa**. Si se repite a diario, avisa al técnico (Anexo A, arranque automático). |
| **Congelado total, no responde a nada** | Apaga y enciende la pantalla/OPS con el botón físico. Espera a que arranque solo la app. |
| **Alguien cambió la entrada de vídeo / brillo con los botones de la pantalla** | Restaura la entrada correcta en el menú de la pantalla y activa el **bloqueo de botones** (sección 3). |

**Contacto de soporte técnico (Clotitec):** [pendiente de rellenar por la oficina].

---

---

# Anexo técnico (para el instalador / informático)

Objetivo: OPS Windows que arranca desatendido en modo kiosco, sin que el público pueda
salir de la app.

## Anexo A — Configuración de Windows para kiosco

### A.1 Elegir la URL de arranque

Dos opciones equivalentes:

- **URL pública:** `https://descubre-bareyo-v2.vercel.app` (o mejor, la variante de
  kiosco si se publica: `.../kiosko.html`).
- **Local:** servir el proyecto en el propio equipo y abrir `http://localhost:PORT/kiosko.html`.

La app de kiosco (`kiosko.html` + `kiosko.js`) ya trae: idle de **90 s** → atractor,
bloqueo de zoom/selección/menú contextual, QR a la URL pública, y salida al panel de
mantenimiento por **pulsación larga de ~3,5 s** en la esquina superior izquierda
(`#kMaintHot`, 90×90 px). El panel ofrece **Pantalla completa**, **Reiniciar kiosco**
(`location.reload()`) y **Volver al modo visitante**.

### A.2 Arranque automático del navegador en modo kiosco

**Chrome:**
```
chrome.exe --kiosk --incognito --noerrdialogs --disable-pinch ^
  --overscroll-history-navigation=0 --disable-features=TranslateUI ^
  --disable-session-crashed-bubble --check-for-update-interval=31536000 ^
  "https://descubre-bareyo-v2.vercel.app/kiosko.html"
```

**Edge:**
```
msedge.exe --kiosk "https://descubre-bareyo-v2.vercel.app/kiosko.html" ^
  --edge-kiosk-type=fullscreen --no-first-run --kiosk-idle-timeout-minutes=0
```

Colocar el navegador con estos parámetros en el **arranque**:

- Opción rápida: crear un acceso directo con los parámetros y ponerlo en
  `shell:startup` (Win+R → `shell:startup`), o
- Mejor para desatendido: **Programador de tareas** → tarea "al iniciar sesión", con
  reinicio automático si la app se cierra, y **inicio de sesión automático** del usuario
  kiosco (`netplwiz` → desmarcar "Los usuarios deben escribir nombre y contraseña", o
  configurar `autologon`).

### A.3 (Recomendado) Assigned Access / Acceso Asignado de Windows

Para blindaje real usar el **modo kiosco integrado de Windows** (Assigned Access), que
lanza un único navegador a pantalla completa y bloquea el resto del sistema:

- **Configuración → Cuentas → Otros usuarios → Configurar un quiosco** (o
  `Configuración → Sistema → Kiosco` según versión).
- Crear cuenta local dedicada (p. ej. `kiosco`).
- Elegir **Microsoft Edge** como app de quiosco → modo **"Pantalla completa / signage"**
  → URL de arranque = la del kiosco.
- Assigned Access oculta la barra de tareas, bloquea Ctrl+Alt+Supr para salir sin
  credenciales, y reinicia la sesión al cerrarla.

Edición Pro/Enterprise permite también configurarlo por **PowerShell**
(`Set-AssignedAccess`) o MDM/Intune si el ayuntamiento lo gestiona centralmente.

### A.4 Desactivar suspensión, apagado de pantalla y salvapantallas

- **Configuración → Sistema → Inicio/apagado y suspensión:** pantalla y suspensión en
  **"Nunca"** (con corriente).
- Plan de energía **"Alto rendimiento"**; o por CLI:
  ```
  powercfg /change monitor-timeout-ac 0
  powercfg /change standby-timeout-ac 0
  powercfg /change disk-timeout-ac 0
  ```
- **Salvapantallas:** clic derecho escritorio → Personalizar → Pantalla de bloqueo →
  Protector de pantalla → **"(Ninguno)"**.
- Desactivar la **pantalla de bloqueo por inactividad** (que no pida contraseña).

### A.5 Actualizaciones de Windows fuera del horario de apertura

- **Configuración → Windows Update → Horas de actividad:** marcar el horario de la
  oficina como activo (Windows no reinicia en esas horas).
- **Windows Update → Opciones avanzadas → Pausar** durante campañas, o programar
  reinicios de madrugada. En Pro, usar **directivas de grupo** (`gpedit.msc`) para
  controlar reinicios automáticos.

### A.6 Ocultar barra de tareas y bloquear teclas/gestos

- Modo kiosco/pantalla completa del navegador ya oculta su UI; **Assigned Access** oculta
  la barra de tareas del sistema. Si se usa solo `--kiosk` sin Assigned Access:
  clic derecho barra de tareas → **"Ocultar automáticamente"**.
- **Bloquear teclas de Windows / combinaciones de escape:** con Assigned Access ya queda
  restringido. Si no, usar una utilidad de bloqueo de teclado de kiosco o directiva que
  deshabilite la tecla Windows, Alt+Tab, Ctrl+Esc, etc. En pantallas táctiles, desactivar
  gestos de borde de Windows (`Configuración → Bluetooth y dispositivos → Toque` /
  directivas de "Edge swipe").
- Desactivar **teclado en pantalla** emergente si no se usa entrada de texto.

### A.7 Volumen (para audioguías)

- Subir el **volumen maestro de Windows** (icono de altavoz) a un nivel audible y
  comprobar que no está silenciado. Fijarlo si la pantalla lo permite (modo hotel).
- Verificar el dispositivo de salida correcto (altavoces de la pantalla vs. OPS).

## Anexo B — Comprobación tras instalar

1. Reiniciar el equipo y confirmar que **arranca solo** en la app a pantalla completa,
   sin ver escritorio.
2. Dejar 2 minutos sin tocar: debe aparecer el **atractor** (idle 90 s).
3. Probar **pulsación larga esquina superior izquierda (~4 s)** → panel Mantenimiento →
   **Reiniciar** y **Pantalla completa** funcionan.
4. Escanear el **QR** con un móvil: abre la URL pública.
5. Intentar **salir** con teclas típicas (Alt+Tab, tecla Windows, Ctrl+W): no debe salir.
6. Confirmar que **no entra suspensión/salvapantallas** tras el tiempo configurado.
7. Activar y verificar el **bloqueo de botones físicos** de la pantalla (sección 3).

## Anexo C — Antes de imprimir cartelería (checklist técnico)

- [ ] Cambios **mergeados a `main`** y **deploy en Vercel** correcto.
- [ ] URLs y **deep links** (`#ruta=`, `#patrimonio=`, `#negocio=`, `#3d=`, `?qr=`)
      verificados en **producción** (no solo en local).
- [ ] QR **dinámicos (Switchy)** apuntando al destino correcto.
- [ ] Solo entonces, **imprimir** placas/folletos.
