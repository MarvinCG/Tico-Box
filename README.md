# Tico Box 🇨🇷

App para que una hablante de polaco con nivel avanzado de español aprenda **el español de Costa Rica tal como lo hablamos**: ustedeo y voseo, costarriqueñismos con su registro, dichos, cortesía tica, direcciones sin números y vida diaria.

- **Estudiante:** la app está en español (inmersión), con polaco como opción en Progreso › Ajustes.
- **Tutor nativo:** agrega frases, graba su voz y valida el contenido (página del tutor, Fase 3).
- **La única voz de la app es la del tutor.** No hay voz sintética de ningún tipo. Las frases que todavía no grabó se muestran con la etiqueta «sin voz todavía» y se estudian por texto.

Es una **web app (PWA)** y se actualiza sola: cada push a `main` se publica en GitHub Pages y los dispositivos reciben la versión nueva la próxima vez que la abren. Arquitectura copiada y adaptada de [Polski Box](https://github.com/MarvinCG/Polski-Box).

Web: **https://marvincg.github.io/Tico-Box/**

| Dispositivo | Cómo se instala |
|---|---|
| Android (teléfono, tablet, **Samsung DeX**) | Chrome → menú ⋮ → **Instalar app** |
| iPad / iPhone | Safari → Compartir → **Añadir a pantalla de inicio** |
| Windows / Mac | Edge o Chrome → **Instalar Tico Box** (ícono en la barra de direcciones) |

Funciona sin internet después de abrirla una vez.

---

## Configuración (una sola vez)

### Publicar la web (GitHub Pages)

1. El repositorio debe ser **público** ([docs](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/managing-repository-settings/setting-repository-visibility)). Queda público el código; el progreso, las grabaciones y el token viven en el repositorio privado de datos.
2. **Settings → Pages → Build and deployment → Source: GitHub Actions** ([docs](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site#publishing-with-a-custom-github-actions-workflow)).
3. **Actions → «Publicar web (GitHub Pages)» → Run workflow**. Después se publica sola en cada push a `main`.

El workflow no genera audio: solo estampa la versión de la caché sin conexión con el SHA del commit y publica la carpeta `web/`.

### Sincronización y enlace de la estudiante

El progreso se guarda en el repositorio **privado** `MarvinCG/tico-box-data` con la [API de contenidos de GitHub](https://docs.github.com/en/rest/repos/contents), en `progress.json`.

1. Crea un token *fine-grained* ([docs](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens#creating-a-fine-grained-personal-access-token)):
   - **Repository access:** *Only select repositories* → `tico-box-data`
   - **Permissions → Repository → Contents:** *Read and write*
   - **Expiration:** la más larga que te permita
2. En la app: **Progreso → Sincronización → Configurar**, deja `MarvinCG/tico-box-data`, pega el token y toca **Crear enlace para la estudiante**. Tu dispositivo **no** se conecta a su progreso.
3. **Copiar enlace** y mándaselo. Ella lo abre una vez y su app queda conectada en *modo estudiante*: sin opciones de configuración, solo el estado de la sincronización.
   - En Android, PC y DeX la app instalada comparte los datos del navegador.
   - En iPad / iPhone la app instalada en la pantalla de inicio guarda sus datos aparte: allí debe pegar el mismo enlace en **Progreso → Sincronización → Configurar**.
4. Para conectar otro dispositivo propio: **Conectar este dispositivo** (con el token o pegando un enlace/código).

La app sincroniza al abrir, al cambiar de app, cada 4 minutos, unos segundos después de cada cambio y con el botón ⟳ de arriba.

**Reglas de fusión** (`web/sync.js`, función `merge`):

| Dato | Regla |
|---|---|
| Tarjetas (`cards`: «La sé») | por frase, gana el cambio más nuevo |
| Registro (`logs`: fichas vistas por día) | uno por dispositivo |
| Ajustes sincronizados | gana el último que escribió (el idioma de la interfaz es de cada dispositivo) |
| Ocultos y ediciones (`hid`, `ed`) | por clave, gana el último cambio |
| Borrar el progreso (`resetAt`) | descarta las tarjetas anteriores en todos los dispositivos |

> ⚠️ El enlace y el código llevan el token. Compártelos solo con la estudiante y con tus dispositivos. El código va en el `#` de la dirección (el navegador nunca lo envía al servidor) y la app lo borra de la barra de direcciones al leerlo. Si se filtra, revoca el token en GitHub y crea otro.

### Página del tutor

**https://marvincg.github.io/Tico-Box/tutor.html** — solo en español. Se conecta con el mismo repositorio y un token (o pegando el enlace `TBX1.`); **no** se conecta al progreso de la app.

| Pestaña | Qué hace |
|---|---|
| ➕ Agregar | texto tico, neutro, polaco (opcional), registro, situación, ejemplo, nota y foto de la galería. El emoji se asigna solo. «Revisar» usa [LanguageTool](https://dev.languagetool.org/public-http-api) en español y oculta las alertas de las palabras de la **lista tica** (todas las frases aprobadas + las que agregas o marcas con «Es tico, permitir»). |
| 🎙️ Grabar en serie | recorre lo que no tiene tu voz o quedó desactualizado, filtrado por situación: ver → grabar → escuchar → guardar o repetir → siguiente. Contador «X de Y grabadas». La subida va en cola, en segundo plano y con reintentos. Teclado: Espacio, Enter, P, →. |
| 📚 Frases | filtros *sin voz · desactualizada · sin foto · ocultas · polaco por revisar*; por frase o línea de diálogo: editar, grabar, foto, ocultar y eliminar definitivamente. |
| 💬 Preguntas | la bandeja de «Pregunta al tutor»; tu respuesta le aparece a ella en la ficha y en Progreso. |

Grabación: [MediaRecorder](https://developer.mozilla.org/es/docs/Web/API/MediaRecorder) → recorte de silencios y normalización → MP3 de 24 kHz y 48 kbps con [lamejs](https://github.com/zhuker/lamejs) (LGPL). Fotos: JPEG, lado mayor 720 px, calidad 0.82. Cada grabación guarda el texto que se grabó: si el texto cambia, la app la ignora y la frase queda «desactualizada» hasta que la grabes de nuevo.

Si agregas una frase sin polaco queda «polaco pendiente»: Claude lo propone en la próxima actualización y queda «por revisar» para ella.

**En la app de ella:** tu voz en velocidad normal y lenta (`playbackRate` 0.75 con [`preservesPitch`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/preservesPitch)), diálogos con «Escuchar el diálogo» (solo las líneas grabadas), tus fotos en lugar del emoji, tus frases nuevas, y en cada ficha: editar (sobre todo el polaco), ocultar, eliminar y **Pregunta al tutor**. En Progreso puede descargar todas las grabaciones para usarlas sin internet.

| Archivo del repo de datos | Contenido |
|---|---|
| `progress.json` | progreso, ocultos (`hid`) y ediciones (`ed`) de los dos |
| `words.json` | frases del tutor (IDs desde 5000; solo se agregan, las borradas se marcan) |
| `voice.json`, `voice/*.mp3` | tus grabaciones, con el texto grabado |
| `img.json`, `img/*.jpg` | tus fotos |
| `asks.json` | preguntas y respuestas |

---

## Contenido

La fuente es `tools/content.txt` (formato descrito al inicio del archivo). Cada entrada trae: texto tico, equivalente neutro, traducción al polaco, registro (formal · neutral · informal · coloquial), ejemplo, nota cultural, emoji y zona.

- El ID de cada entrada es su posición: **nunca se borran ni se reordenan entradas**, se reemplazan en el mismo lugar. Las entradas del tutor usan IDs desde 5000.
- Las traducciones al polaco quedan «por revisar» hasta que la estudiante las corrige.
- Lo que no esté validado como uso costarricense va marcado «dudoso».
- `tools/ids.json` guarda el texto tico de cada ID publicado: `prep.py` falla si alguna vez hay menos entradas que las publicadas y avisa de los IDs cuyo texto cambió.

Contenido en `content.txt`: 11 situaciones y 246 entradas aprobadas por Aaron, con un diálogo por situación (391 IDs; 145 eliminados: 106 con las situaciones amigos, fútbol, el brete y trámites, y 39 marcadas «dudoso» en la revisión). No se incluye contenido vulgar.

Una entrada eliminada deja la línea `~ eliminada (…)` en su lugar: su ID queda reservado y `prep.py` falla si se intenta reutilizar.

**Qué se publica:** solo las entradas que Aaron marca **«ok»** en la hoja de revisión (columna *estado* de `content.txt`). Las demás se quedan en `content.txt` sin publicarse, para no mover los IDs. De los diálogos se publican solo las líneas que usan alguna entrada «ok» (`prep.py` lo detecta en el texto tico), y en la app solo aparecen las situaciones con algo publicado.

## Samsung DeX, tablets y PC

Con pantalla ancha o en horizontal, la navegación pasa a un riel lateral y el contenido se reparte en columnas.

| Tecla | Acción |
|---|---|
| 1–4 | Cambiar de pestaña |
| Esc | Volver / cerrar |

---

## Desarrollo

```
web/              la app (HTML/CSS/JS sin frameworks)
  app.js          app de la estudiante · textos en T.es y T.pl (nada en inglés)
  sync.js         sincronización con el repo privado, reglas de fusión y medios del tutor (IndexedDB)
  tutor.html/js   página del tutor · recorder.js grabador · vendor/lame.min.js codificador MP3
  data.js         generado por tools/prep.py — no editar a mano
  sw.js           caché sin conexión: red primero para la app, caché primero para emojis e íconos
  e/              emojis Twemoji locales (CC-BY 4.0) · icons/ íconos de la PWA
tools/
  content.txt     fuente del contenido
  prep.py         genera web/data.js y copia los emojis usados · ids.json: registro de IDs publicados
  icon.py         genera los íconos de la PWA (Pillow + fuente DejaVu)
  test_f0.mjs     pruebas con Playwright: carga, es/pl, sin conexión, sin voz sintética y prueba monkey
  test_f1.mjs     integridad del contenido, recorrido por todas las situaciones y fichas, sin contenido vulgar
  test_f2.mjs     sincronización con GitHub simulado: enlace de la estudiante, 3 dispositivos, fusión, 409, sin conexión
  test_f3.mjs     página del tutor y lado de la estudiante (micrófono falso, GitHub y LanguageTool simulados)
```

```bash
cd tools && npm i            # Twemoji y Playwright
python3 prep.py              # regenerar web/data.js y web/e/
npm test                     # pruebas F0 a F3 (levantan su propio servidor local)
cd ../web && python3 -m http.server 8765   # probar en http://localhost:8765
```

Si Playwright no encuentra el navegador: `npx playwright install chromium`.
