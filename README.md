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

### Sincronización (Fase 2)

Los datos (progreso, frases del tutor, grabaciones y fotos) se guardarán en el repositorio **privado** `MarvinCG/tico-box-data` con la [API de contenidos de GitHub](https://docs.github.com/en/rest/repos/contents) y un token *fine-grained* con acceso solo a ese repositorio y permiso **Contents: Read and write** ([docs](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens#creating-a-fine-grained-personal-access-token)).

> ⚠️ El código de vinculación y el enlace del tutor llevarán el token. Solo se comparten entre nuestros dispositivos. Nunca se sube un token a este repositorio.

---

## Contenido

La fuente es `tools/content.txt` (formato descrito al inicio del archivo). Cada entrada trae: texto tico, equivalente neutro, traducción al polaco, registro (formal · neutral · informal · coloquial), ejemplo, nota cultural, emoji y zona.

- El ID de cada entrada es su posición: **nunca se borran ni se reordenan entradas**, se reemplazan en el mismo lugar. Las entradas del tutor usan IDs desde 5000.
- Las traducciones al polaco quedan «por revisar» hasta que la estudiante las corrige.
- Lo que no esté validado como uso costarricense va marcado «dudoso».
- `tools/ids.json` guarda el texto tico de cada ID publicado: `prep.py` falla si alguna vez hay menos entradas que las publicadas y avisa de los IDs cuyo texto cambió.

Contenido en `content.txt` (F1): 15 situaciones, 391 entradas y un diálogo por situación. No se incluye contenido vulgar.

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
  data.js         generado por tools/prep.py — no editar a mano
  sw.js           caché sin conexión: red primero para la app, caché primero para emojis e íconos
  e/              emojis Twemoji locales (CC-BY 4.0) · icons/ íconos de la PWA
tools/
  content.txt     fuente del contenido
  prep.py         genera web/data.js y copia los emojis usados · ids.json: registro de IDs publicados
  icon.py         genera los íconos de la PWA (Pillow + fuente DejaVu)
  test_f0.mjs     pruebas con Playwright: carga, es/pl, sin conexión, sin voz sintética y prueba monkey
  test_f1.mjs     integridad del contenido, recorrido por todas las situaciones y fichas, sin contenido vulgar
```

```bash
cd tools && npm i            # Twemoji y Playwright
python3 prep.py              # regenerar web/data.js y web/e/
npm test                     # pruebas F0 y F1 (levantan su propio servidor local)
cd ../web && python3 -m http.server 8765   # probar en http://localhost:8765
```

Si Playwright no encuentra el navegador: `npx playwright install chromium`.
