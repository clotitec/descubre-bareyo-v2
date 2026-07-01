# Guiones de audio-guía — Patrimonio de Bareyo

Guiones de narración para la app *Descubre Bareyo v2*, pensados para leerse con la **Web Speech API** (gratuito, hoy) y opcionalmente **ElevenLabs** más adelante. Solo patrimonio / costa / 3D (nunca negocios).

Cada guion dura **45–75 s (~110–170 palabras)**: gancho inicial, 2–3 datos verídicos, invitación a mirar el 360° / tour Matterport y cierre cálido.

> **Nota TTS importante:** los números y numerales romanos se escriben **en letra** en el texto de narración ("siglo doce", no "s. XII"; "mil seiscientos setenta y siete", no "1677"). La Web Speech API lee fatal "s. XII" y las abreviaturas. Los textos de abajo ya están normalizados para locución. En el `desc` visible de `data.js` se mantiene la forma corta con números; la narración es un campo aparte (ver **WIRING**).
>
> **[VERIFICAR]** marca datos que conviene confirmar con el Ayuntamiento / bibliografía antes de publicar en producción o de pagar locución profesional.

---

## points3D (tours Matterport)

### `3d-sta-maria-bareyo` — Santa María de Bareyo

**Guion ES**
> Estás ante una de las joyas del románico de Cantabria. La iglesia de Santa María de Bareyo se levantó a finales del siglo doce, y esconde una rareza que casi no verás en ningún otro templo: su cabecera es trilobulada, es decir, tres ábsides curvos dispuestos en forma de trébol. Fíjate al entrar en los capiteles esculpidos y en la pila bautismal, cubierta de una simbología medieval que todavía hoy intriga a los expertos. No es casualidad que esté declarada Bien de Interés Cultural. Desde este mismo alto, los canteros medievales dominaban el valle y la marisma de Ajo. Muévete por el tour de trescientos sesenta grados: gira hacia el ábside central y acércate a los canecillos del alero. Deja que la piedra te cuente ochocientos años de historia.

**Guion EN**
> You're standing before one of the finest Romanesque gems in Cantabria. The church of Santa María de Bareyo was raised in the late twelfth century, and it hides something you'll see almost nowhere else: a trefoil east end — three curved apses arranged in the shape of a clover leaf. As you step inside, look up at the carved capitals and down at the baptismal font, covered in medieval symbolism that still puzzles the experts. It's no accident that it's listed as a Site of Cultural Interest. From this hilltop, medieval stonemasons overlooked the whole Ajo valley and its marshes. Move around the three-hundred-and-sixty-degree tour: turn towards the central apse and lean in close to the carved corbels beneath the eaves. Let the stone tell you eight hundred years of history.

**Notas de producción** — Voz: femenina, es-ES cálida y pausada (locución "de museo"). Ritmo: `rate 0.95`. Es el POI estrella: si solo se graba una voz premium en ElevenLabs, empezar por este. Pausa marcada tras "trébol" y "Bien de Interés Cultural". **[VERIFICAR]** año exacto de la declaración BIC / Monumento (se cita 1931).

---

### `3d-san-pedruco` — Ermita de San Pedruco

**Guion ES**
> A un paso del mar, escondida entre prados, te espera la ermita de San Pedruco: pequeña, sobria y con más de ochocientos años a sus espaldas. Sus orígenes se remontan al siglo doce, y aún conserva elementos románicos que la conectan con las grandes iglesias del entorno. Restaurada hace poco, ha recuperado la serenidad de las construcciones humildes que jalonaban los caminos de la costa. Muy cerca se abre el cabo Quintres, con sus acantilados asomados al Cantábrico. Explora el tour de trescientos sesenta grados y fíjate en la sencillez de su nave única: aquí no sobra nada. A veces, los monumentos más pequeños son los que mejor guardan el silencio de los siglos. Tómate un momento antes de seguir camino.

**Guion EN**
> Just a step from the sea, tucked among green meadows, the hermitage of San Pedruco awaits: small, plain and carrying more than eight hundred years of history. Its origins reach back to the twelfth century, and it still preserves Romanesque features that link it to the great churches nearby. Recently restored, it has recovered the calm of those humble buildings that once dotted the coastal paths. Close by opens Cabo Quintres, its cliffs leaning out over the Cantabrian Sea. Explore the three-hundred-and-sixty-degree tour and notice the simplicity of its single nave: nothing here is superfluous. Sometimes it's the smallest monuments that best keep the silence of the centuries. Take a moment before you carry on your way.

**Notas de producción** — Voz: femenina/neutra es-ES, tono íntimo. Ritmo: `rate 0.95`. Guion corto y contemplativo (~120 palabras). **[VERIFICAR]** cronología exacta de la restauración si el cliente quiere fecha.

---

### `3d-san-julian` — Ermita de San Julián

**Guion ES**
> Imagina a un peregrino medieval, exhausto tras días de camino junto al mar, viendo por fin este refugio. La ermita de San Julián funcionó como hospital de peregrinos en el Camino de Santiago de la costa, entre los siglos doce y trece. Mira su fachada norte: ahí siguen las huellas románicas que delatan su edad. Durante siglos, aquí se curaban pies, se compartía pan y se recuperaban fuerzas antes de seguir hacia el oeste. Hoy la ermita ha sido rehabilitada y acoge un espacio dedicado a la memoria del Camino. Recorre el tour de trescientos sesenta grados y busca el contraste entre la piedra antigua y su nuevo uso. Un lugar pequeño que resume mil años de hospitalidad cántabra.

**Guion EN**
> Picture a medieval pilgrim, worn out after days walking beside the sea, finally spotting this shelter. The hermitage of San Julián served as a pilgrims' hospital on the coastal Camino de Santiago, between the twelfth and thirteenth centuries. Look at its north facade: the Romanesque traces that give away its age are still there. For centuries, feet were healed here, bread was shared, and strength was gathered before pressing on westward. Today the hermitage has been restored and houses a space devoted to the memory of the Camino. Walk through the three-hundred-and-sixty-degree tour and look for the contrast between the ancient stone and its new purpose. A small place that sums up a thousand years of Cantabrian hospitality.

**Notas de producción** — Voz: es-ES cálida y narrativa. Ritmo: `rate 0.97`. **[VERIFICAR]** dato sensible: tanto San Julián como el Convento de San Ildefonso figuran como "Centro de Interpretación del Camino". Confirmar cuál alberga hoy el centro para no duplicar; el guion evita afirmarlo tajantemente ("espacio dedicado a la memoria del Camino").

---

### `3d-san-vicente-guemes` — Iglesia de San Vicente Mártir (Güemes)

**Guion ES**
> En el corazón del valle de Güemes, esta iglesia es obra de canteros locales que dominaron la piedra como pocos. Pero lo que corta la respiración está dentro: un magnífico retablo barroco del año mil seiscientos setenta y siete, con columnas salomónicas —esas columnas retorcidas en espiral— que parecen desafiar la gravedad. En lo alto preside la Virgen del Carmen, tan querida en toda la costa cántabra. Levanta la vista en el tour de trescientos sesenta grados y sigue el movimiento del oro y la talla: cada rincón cuenta una escena. Templo de raíces góticas y renacentistas, San Vicente Mártir es el orgullo monumental de Güemes. Acércate al retablo y descubre los detalles que desde lejos se escapan.

**Guion EN**
> In the heart of the Güemes valley, this church was built by local stonemasons who mastered stone like few others. But what takes your breath away is inside: a magnificent Baroque altarpiece from the year sixteen seventy-seven, with Solomonic columns — those spiralling, twisted columns that seem to defy gravity. Crowning it all is the Virgen del Carmen, so beloved along the whole Cantabrian coast. Look up during the three-hundred-and-sixty-degree tour and follow the sweep of gold and carving: every corner tells a scene. A church with Gothic and Renaissance roots, San Vicente Mártir is the monumental pride of Güemes. Move in close to the altarpiece and discover the details that escape you from afar.

**Notas de producción** — Voz: es-ES, un punto más enérgica (el retablo es espectacular). Ritmo: `rate 1.0`. Explicar "columnas salomónicas" en el propio guion ayuda al oyente no experto.

---

### `3d-san-martin-tours` — Iglesia de San Martín de Tours (Ajo)

**Guion ES**
> Pocos templos de Cantabria pueden presumir de tanta historia. La iglesia de San Martín de Tours nació hace más de mil años, hacia el año ochocientos cincuenta, como el antiguo monasterio de San Juan de Asio. De aquel origen a la iglesia que ves hoy median siglos de reformas: una amplia planta de salón, cubierta por bóvedas estrelladas que dibujan estrellas de piedra sobre tu cabeza. No te pierdas su retablo barroco, tallado hacia el año mil seiscientos veintiséis, ni sus capillas laterales. Es la gran iglesia de Ajo, el templo donde se ha reunido el pueblo durante generaciones. En el tour de trescientos sesenta grados, alza la vista hacia las bóvedas y luego céntrate en el retablo. Mil años caben en una sola mirada.

**Guion EN**
> Few churches in Cantabria can boast so much history. The church of San Martín de Tours was born more than a thousand years ago, around the year eight hundred and fifty, as the old monastery of San Juan de Asio. Between that origin and the church you see today lie centuries of rebuilding: a broad hall-church plan, roofed with star vaults that trace stars of stone above your head. Don't miss its Baroque altarpiece, carved around the year sixteen twenty-six, or its side chapels. This is the great church of Ajo, the place where the village has gathered for generations. In the three-hundred-and-sixty-degree tour, look up towards the vaults and then focus on the altarpiece. A thousand years fit into a single glance.

**Notas de producción** — Voz: es-ES solemne pero cercana. Ritmo: `rate 0.95`. **[VERIFICAR]** la fecha del origen monástico (~850) y la advocación "San Juan de Asio" proceden de `data.js`; confirmar con fuente local antes de locución premium.

---

### `3d-san-ildefonso` — Convento de San Ildefonso (Ajo)

**Guion ES**
> Este convento guarda una conexión sorprendente con uno de los grandes monumentos de España. Fundado en el año mil quinientos ochenta y ocho, fue proyectado por Diego de Sisniega, un maestro cántabro vinculado a las obras de El Escorial. Por eso sus líneas sobrias y equilibradas se consideran un ejemplo temprano del clasicismo en Cantabria: nada de excesos, todo proporción. Convento dominico y también refugio de peregrinos, ha visto pasar la fe y los caminos durante más de cuatro siglos. Explora el tour de trescientos sesenta grados y fíjate en la geometría limpia de sus muros: la huella de un arquitecto que aprendió en la corte de Felipe Segundo. Un rincón de Ajo con acento monumental.

**Guion EN**
> This convent holds a surprising connection to one of Spain's great monuments. Founded in the year fifteen eighty-eight, it was designed by Diego de Sisniega, a Cantabrian master linked to the building of El Escorial. That's why its sober, balanced lines are considered an early example of Classicism in Cantabria: no excess, all proportion. A Dominican convent and also a refuge for pilgrims, it has watched faith and roads pass by for more than four centuries. Explore the three-hundred-and-sixty-degree tour and notice the clean geometry of its walls: the mark of an architect who trained at the court of Philip the Second. A corner of Ajo with a monumental accent.

**Notas de producción** — Voz: es-ES culta y pausada. Ritmo: `rate 0.95`. El gancho ("conexión con El Escorial") es el mejor dato del municipio: mantenerlo al inicio. **[VERIFICAR]** atribución a Diego de Sisniega y vínculo escurialense.

---

## costaPoints (patrimonio y naturaleza)

### `faro-ajo` — Faro de Ajo

**Guion ES**
> Bienvenido al punto más al norte de Cantabria. El Faro de Ajo se alza en el cabo del mismo nombre y tiene un honor curioso: fue el último faro construido en toda la región. Durante décadas, su luz ha sido la primera y la última que ven los barcos que navegan este tramo del Cantábrico. Pero hay algo más que lo hace único: su torre fue intervenida por el artista Okuda San Miguel, que la transformó en un lienzo de color, un estallido geométrico frente al azul del mar. Faro y obra de arte a la vez. Muévete por la vista de trescientos sesenta grados: gira hacia el horizonte, respira el viento del norte y luego admira los colores de la torre. Difícil imaginar un mirador más espectacular.

**Guion EN**
> Welcome to the northernmost point of Cantabria. The Faro de Ajo lighthouse rises on the cape of the same name and holds a curious honour: it was the last lighthouse ever built in the region. For decades its beam has been the first and last light seen by ships sailing this stretch of the Cantabrian Sea. But there's something else that makes it unique: its tower was reimagined by the artist Okuda San Miguel, who turned it into a canvas of colour, a geometric burst against the blue of the sea. A lighthouse and a work of art at once. Move around the three-hundred-and-sixty-degree view: turn towards the horizon, breathe in the north wind, then take in the colours of the tower. It's hard to imagine a more spectacular viewpoint.

**Notas de producción** — Voz: es-ES vibrante, tono "descubrimiento". Ritmo: `rate 1.0`. Es icono y postal del municipio: buena candidata para voz ElevenLabs. **[VERIFICAR]** año de la intervención de Okuda (se evita a propósito la fecha en el guion).

---

### `ojerada` — La Ojerada

**Guion ES**
> La naturaleza también esculpe monumentos, y La Ojerada es su obra maestra en esta costa. Es un gran ventanal de roca caliza con dos aberturas —dos "ojos"— que el mar ha ido horadando pacientemente, golpe a golpe, durante miles de años. A través de ellos, el Cantábrico se asoma al acantilado en un espectáculo que cambia con cada marea. Está protegida como parte del litoral del cabo de Ajo, a un paso del faro, así que puedes unir las dos visitas en un mismo paseo. Asómate en la vista de trescientos sesenta grados y busca cómo la luz atraviesa la piedra. Un consejo: con marejada, el sonido del mar entrando por los "ojos" es puro teatro. Acércate con respeto al borde: la fuerza del agua manda aquí.

**Guion EN**
> Nature carves monuments too, and La Ojerada is its masterpiece on this coast. It's a great window of limestone rock with two openings — two "eyes" — that the sea has patiently bored, wave after wave, over thousands of years. Through them, the Cantabrian Sea peers out from the cliff in a show that changes with every tide. It's protected as part of the Cabo de Ajo coastline, just a step from the lighthouse, so you can combine both visits in a single walk. Lean into the three-hundred-and-sixty-degree view and watch how the light passes through the stone. A tip: in rough seas, the sound of water rushing through the "eyes" is pure theatre. Approach the edge with respect — the power of the water rules here.

**Notas de producción** — Voz: es-ES evocadora. Ritmo: `rate 0.97`. Incluye aviso de seguridad al cierre (borde de acantilado), buena práctica. **[VERIFICAR]** figura legal exacta (se cita "Monumento Natural" en `data.js`; el guion dice "protegida" para no comprometer la categoría).

---

### `ermita-san-roque` — Ermita de San Roque

**Guion ES**
> Sube a este alto y entenderás por qué eligieron el lugar. Desde la ermita de San Roque, levantada en el año mil seiscientos dos, se divisa el mar y confluyen simbólicamente los tres pueblos del municipio: Ajo, Bareyo y Güemes. Es una ermita sencilla, de nave única, sin grandes alardes, pero cargada de devoción popular. Está dedicada a San Roque, patrón de los peregrinos e invocado durante siglos como protector frente a las epidemias: no es casual que muchas ermitas como esta se alzaran en tiempos de peste. Recorre la vista de trescientos sesenta grados y gira despacio: el mar a un lado, los valles al otro. Un mirador con alma, donde el paisaje y la fe se dan la mano.

**Guion EN**
> Climb up to this hilltop and you'll understand why they chose the spot. From the hermitage of San Roque, built in the year sixteen hundred and two, you can see the sea, and the municipality's three villages meet symbolically here: Ajo, Bareyo and Güemes. It's a simple hermitage, a single nave with no grand flourishes, yet steeped in popular devotion. It's dedicated to San Roque, patron of pilgrims and invoked for centuries as a protector against epidemics — it's no accident that many hermitages like this rose in times of plague. Take the three-hundred-and-sixty-degree view and turn slowly: the sea on one side, the valleys on the other. A viewpoint with soul, where landscape and faith join hands.

**Notas de producción** — Voz: es-ES cálida. Ritmo: `rate 0.97`. El dato "protector frente a epidemias" conecta muy bien con visitantes actuales. Fecha 1602 confirmada en `data.js`.

---

### `ria-ajo` — Ría de Ajo

**Guion ES**
> Aquí el paisaje respira al ritmo de las mareas. La Ría de Ajo es el lugar donde el río Campiazo se encuentra con el mar Cantábrico, un entorno natural privilegiado de aguas tranquilas, marismas y bancos de arena que aparecen y desaparecen dos veces al día. Es refugio de aves y zona de paseo, con esa luz cambiante tan del norte. Cuando la marea baja, el fondo se llena de reflejos; cuando sube, la ría se convierte en un espejo. Mira alrededor con calma: es uno de esos paisajes que piden ir despacio. Un remanso entre las playas de Ajo y el interior verde del municipio.

**Guion EN**
> Here the landscape breathes to the rhythm of the tides. The Ría de Ajo is where the River Campiazo meets the Cantabrian Sea — a privileged natural setting of calm waters, marshes and sandbanks that appear and vanish twice a day. It's a refuge for birds and a place to stroll, bathed in that ever-shifting northern light. When the tide drops, the bed fills with reflections; when it rises, the estuary turns into a mirror. Look around slowly: this is one of those landscapes that ask you to take your time. A haven between the beaches of Ajo and the green inland of the municipality.

**Notas de producción** — Voz: es-ES serena, casi de documental de naturaleza. Ritmo: `rate 0.95`. Guion breve (~105 palabras, ~45 s), apropiado por ser POI natural sin gran carga histórica.

---

## Playas (guiones breves de costa)

> Las playas no son patrimonio histórico, pero el disparador de audio actual (`type !== 'biz'`) también las cubre. Guiones ligeros ~90–115 palabras, tono de bienvenida más que histórico.

### `playa-cuberris` — Playa de Cuberris

**Guion ES**
> Casi un kilómetro de arena dorada abierta de par en par al Cantábrico: bienvenido a Cuberris, la gran playa de Ajo. Es un clásico del surf en la costa cántabra, con olas que atraen tanto a principiantes como a expertos, y espacio de sobra para largos paseos junto al mar. En marea baja, la arena se extiende como una avenida infinita. Consulta la bandera de baño antes de entrar al agua y disfruta del ambiente. Ya sea para remar sobre una tabla o simplemente para dejar que el viento te despeine, Cuberris es de esas playas que se quedan en la memoria.

**Guion EN**
> Almost a kilometre of golden sand thrown wide open to the Cantabrian Sea: welcome to Cuberris, the great beach of Ajo. It's a surfing classic on the Cantabrian coast, with waves that draw beginners and experts alike, and plenty of room for long walks by the sea. At low tide, the sand stretches out like an endless avenue. Check the bathing flag before you go in and soak up the atmosphere. Whether you're paddling out on a board or simply letting the wind tousle your hair, Cuberris is one of those beaches that stays with you.

**Notas de producción** — Voz: es-ES desenfadada y luminosa. Ritmo: `rate 1.0`. Recuerda al oyente consultar la bandera (coherente con el panel de banderas de baño de la app).

---

### `playa-ajo` — Playa de Ajo (Antuerta)

**Guion ES**
> Más recogida que su vecina Cuberris, la playa de Ajo —también llamada Antuerta— es un rincón de arena fina abrazado por acantilados. Ese marco de roca la protege y le da un aire íntimo, ideal tanto para coger olas como para tumbarse a desconectar. Es un buen sitio para el surf cuando entra la marejada, y un refugio tranquilo cuando el mar se calma. Consulta siempre la bandera de baño antes de entrar. Aquí el plan es sencillo: arena bajo los pies, acantilados a la espalda y el horizonte del Cantábrico delante. A veces no hace falta más.

**Guion EN**
> More sheltered than its neighbour Cuberris, the beach of Ajo — also known as Antuerta — is a nook of fine sand cradled by cliffs. That wall of rock protects it and gives it an intimate feel, perfect both for catching waves and for lying back and switching off. It's a good spot for surfing when the swell rolls in, and a quiet refuge when the sea settles. Always check the bathing flag before going in. The plan here is simple: sand underfoot, cliffs at your back and the Cantabrian horizon ahead. Sometimes that's all you need.

**Notas de producción** — Voz: es-ES cercana. Ritmo: `rate 1.0`. Guion corto (~100 palabras).

---

## WIRING — integración recomendada (plan, sin tocar código)

### Estado actual
- `data.js` ya tiene **`POI_I18N[id][lang] = { name, desc }`** (es/en/fr) y la función **`localizeEntity(entity, field)`** que resuelve el idioma activo con *fallback* a `entity[field]` (ES de origen).
- `app.js → speakDetailContent()` (líneas ~2027-2072) construye el texto hablado así:
  ```js
  let text = (localizeEntity(item,'name') || '') + '. ' + (localizeEntity(item,'desc') || '');
  // + extracto de Wikipedia cacheado si item.wikiTitle
  ```
  y lo lanza con `SpeechSynthesisUtterance`, mapeando `currentLang` → `es-ES / en-US / fr-FR / de-DE`.

### Recomendación: campo `narracion` dentro de `POI_I18N`
No crear un objeto nuevo ni tocar `costaPoints` / `points3D`. Reutilizar `POI_I18N` añadiendo una tercera clave `narracion` junto a `name`/`desc`. Encaja con `localizeEntity` sin cambios y respeta que `data.js` sea el *source of truth*.

**1) En `data.js`**, ampliar cada entrada. Ejemplo:
```js
'3d-sta-maria-bareyo': {
  es: { name: 'Santa María de Bareyo', desc: '…(texto corto visible, con números)…',
        narracion: 'Estás ante una de las joyas del románico de Cantabria. …' },
  en: { name: 'Santa María de Bareyo Church', desc: '…',
        narracion: "You're standing before one of the finest Romanesque gems…" },
  fr: { name: 'Santa María de Bareyo', desc: '…' }   // narración FR opcional (ver más abajo)
},
```
Los guiones de este documento van íntegros en `narracion` (ya normalizados para TTS: números en letra).

**2) En `app.js → speakDetailContent()`**, cambiar SOLO la construcción de `text` (una línea → tres):
```js
const narr = localizeEntity(item, 'narracion');   // '' si no existe → fallback
let text = narr
  ? (localizeEntity(item, 'name') || '') + '. ' + narr   // título + guion
  : (localizeEntity(item, 'name') || '') + '. ' + (localizeEntity(item, 'desc') || '');

// Solo anexar Wikipedia cuando NO hay narración propia (evita duplicar/alargar)
if (!narr && item.wikiTitle) { /* …bloque de extract actual… */ }
```
Ventaja: retrocompatible. Si un POI no tiene `narracion`, se comporta exactamente como hoy (name + desc + wiki).

**3) Idioma `de` (alemán):** `POI_I18N` no tiene entradas `de`, así que `localizeEntity` cae a `entity[field]` y para `narracion` devuelve `''` → se leería el `name+desc` en ES con voz alemana (ya ocurre hoy). Opciones, por orden de esfuerzo:
- **A (recomendada corto plazo):** hacer que `localizeEntity` para `narracion` caiga a `en` (o `es`) cuando no exista el idioma, en lugar de a `entity[field]`. Un pequeño ajuste de fallback dentro de `localizeEntity` o en la línea de `speakDetailContent`.
- **B:** no ofrecer audio en `de`/`fr` si no hay guion (mostrar toast "audio disponible en ES/EN").
- **C:** traducir los guiones a fr/de (los guiones FR pueden derivarse de los `desc` FR ya existentes en `POI_I18N`).

**4) ElevenLabs (futuro, opcional):** el mismo campo `narracion` sirve como *input* de texto para generar MP3 por POI+idioma (p. ej. `assets/audio/{id}.{lang}.mp3`). El disparador pasaría a: si existe el MP3 pre-generado, reproducir `<audio>`; si no, *fallback* a Web Speech con `narracion`. ElevenLabs sí soporta SSML/`<break>` para pausas más finas; para Web Speech basta la puntuación actual. `track('audio_play', …)` no cambia.

### Checklist de calidad TTS (antes de publicar)
- Números y siglos **en letra** en `narracion` (ya aplicado en este doc). No dejar "s. XII", "1677", "360°".
- Escuchar cada guion en Chrome (voz `es-ES` de Google/Microsoft) y ajustar comas para las pausas.
- `rate` recomendado global 0.95–1.0; los POIs contemplativos (San Pedruco, San Julián, Ojerada) a 0.95–0.97.
- Confirmar los datos marcados **[VERIFICAR]** antes de encargar locución profesional de pago.

---

## Índice de POIs cubiertos (13)

**points3D (6):** `3d-sta-maria-bareyo`, `3d-san-pedruco`, `3d-san-julian`, `3d-san-vicente-guemes`, `3d-san-martin-tours`, `3d-san-ildefonso`.
**costaPoints patrimonio/naturaleza (4):** `faro-ajo`, `ojerada`, `ermita-san-roque`, `ria-ajo`.
**Playas (2):** `playa-cuberris`, `playa-ajo`.
