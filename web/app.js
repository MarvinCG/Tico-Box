(function () {
'use strict';
/* Tico Box — app de la estudiante. Arquitectura copiada y adaptada de Polski Box.
   Sin voz sintética: la única voz es la grabación del tutor; lo que no grabó se estudia por texto. */
const CB = 5000, SITE = 'https://marvincg.github.io/Tico-Box/';
const SITS = (window.SITS || []).slice();
/* situación para las frases que el tutor agrega sin situación */
const TSIT = SITS.push({ k: 'tutor', es: 'De tu tutor', pl: 'Od nauczyciela', ic: '1f9d1-200d-1f3eb', ds: 'Frases que tu tutor agregó para ti.', dp: 'Zwroty, które nauczyciel dodał specjalnie dla ciebie.', dl: [] }) - 1;
const BASE = [];   // BASE[id] -> entrada publicada («ok»); hay huecos porque los IDs son estables
(window.ENTRIES || []).forEach(e => { BASE[e.i] = e; });
let CUSTOM = [], ASKS = [], E = [];   // E[id] -> entrada con las ediciones aplicadas (las del tutor desde CB)
const $ = (s, r) => (r || document).querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const today = () => { const d = new Date(); return Math.floor((d.getTime() - d.getTimezoneOffset() * 6e4) / 864e5) + (window.__shift || 0); };

/* ------------------------------------------------------------ textos (nada en inglés) */
const T = {
es: {
 today: 'Hoy', sit: 'Situaciones', words: 'Frases', me: 'Progreso',
 hello: '¡Pura vida!', heroSub: 'El español de Costa Rica tal como se habla: en la casa, con los amigos, en la calle y en el brete.',
 heroStat: '{n} frases · {s} situaciones', emptyT: 'Todavía no hay frases', emptySub: 'Muy pronto vas a encontrar aquí las frases ticas, con mi voz y ejemplos reales.',
 sitIntro: 'Momentos reales de la vida en Costa Rica. Cada frase trae su equivalente neutro, la traducción al polaco y el registro.',
 noSit: 'Todavía no hay situaciones.', phrases: 'Frases', dialogues: 'Diálogo', back: '‹ Volver', close: 'Cerrar',
 search: 'Busca una frase, su equivalente o la traducción…', noResults: 'No se encontró nada.',
 r_F: 'formal', r_N: 'neutral', r_I: 'informal', r_C: 'coloquial',
 fTico: 'Tico', fNeu: 'Español neutro', fPl: 'Polaco', fEj: 'Ejemplo', fNote: 'Nota cultural', fZone: 'Zona', fReg: 'Registro',
 noVoice: 'sin voz todavía', plRev: 'polaco por revisar', dudoso: 'dudoso',
 settings: 'Ajustes', ui: 'Idioma de la app', sitToday: 'Situación del día', fDay: 'Frase del día', open: 'Abrir',
 inst: 'Instalar la app', instSub: 'Tico Box es una web app: la instalas una vez y se actualiza sola. Funciona sin internet.', instBtn: 'Instalar Tico Box',
 instIOS: 'En iPad / iPhone: en Safari toca Compartir ⬆️ y luego «Añadir a pantalla de inicio».', instOther: 'En Chrome o Edge: abre el menú ⋮ y elige «Instalar app» (o «Agregar a la pantalla principal»).',
 backup: 'Copia de seguridad', export: 'Exportar progreso', import: 'Importar progreso', importPh: 'Pega aquí tu copia de seguridad', importGo: 'Importar', importBad: 'No se pudo leer esa copia.', importOk: 'Progreso restaurado.',
 reset: 'Borrar todo el progreso', resetQ: '¿Borrar todo tu progreso?', resetSub: 'Se eliminan tu progreso y tus ajustes en este dispositivo. No se puede deshacer.', resetYes: 'Borrar',
 copied: 'Copiado', about: 'Acerca de',
 aboutTxt: 'Tico Box: el español de Costa Rica para hablantes de polaco. La única voz de la app es la del tutor, grabada por él; no hay voz sintética. Imágenes: Twemoji, © Twitter, Inc. y colaboradores, CC-BY 4.0. Contenido: {s} situaciones, {n} frases. Funciona sin internet.',
 welcome: 'Bienvenida a Tico Box', wTxt: 'Elige el idioma de la app. Puedes cambiarlo después.',
 keys: 'Teclado: 1–4 cambiar de pestaña · Esc volver',
 instIOS2: 'En iPad / iPhone, la app instalada guarda sus datos aparte: ábrela, ve a Progreso › Sincronización › Configurar y pega el mismo enlace que te mandaron.',
 known: 'La sé', knownOn: 'Ya la sé', knownHint: 'Márcala cuando la entiendas y la puedas usar.', knownTag: 'la sé',
 stats: 'Tu avance', sKnown: 'Frases aprendidas', sToday: 'Fichas vistas hoy', sDays: 'Días con práctica (7 d)',
 sync: 'Sincronización', syncSub: 'Guarda tu avance en un repositorio privado de GitHub y lo comparte entre tu teléfono, tu tablet y tu PC.',
 syncStud: 'Tu avance se guarda solo y se comparte entre tus dispositivos.', syncOff: 'Sin conectar', syncOn: 'Conectado a {r}',
 syncLast: 'Última sincronización: {t}', syncNever: 'nunca', syncNow: 'Sincronizar ahora', syncing: 'Sincronizando…',
 syncSetup: 'Configurar', syncRepo: 'Repositorio de datos (dueño/nombre)', syncToken: 'Token de GitHub (fine-grained, Contents: lectura y escritura)',
 syncCode: '…o pega aquí el enlace o el código que te mandaron', syncGo: 'Conectar este dispositivo', syncDone: 'Conectado y sincronizado',
 syncStudBtn: 'Crear enlace para la estudiante', syncStudT: 'Enlace para la estudiante', syncStudSub: 'Ella lo abre una vez y su app queda conectada, sin configurar nada. Este dispositivo no se conecta.',
 syncCopyLink: 'Copiar enlace', syncCopy: 'Copiar código para otro dispositivo', syncOut: 'Desconectar este dispositivo',
 syncWarn: 'El enlace y el código llevan el token de acceso: compártelos solo con la estudiante y con tus dispositivos. Si se filtran, revoca el token en GitHub.',
 syncPublic: 'Ojo: ese repositorio es público. El progreso debe ir en un repositorio privado.', linked: '¡Listo! Tu app quedó conectada.',
 e_token: 'GitHub rechazó el token. Revísalo o crea uno nuevo.', e_forbidden: 'El token no tiene acceso a este repositorio (Contents: lectura y escritura).', e_repo: 'No se encontró el repositorio. Revisa dueño/nombre y el acceso del token.', e_offline: 'Sin conexión. Se sincronizará después.', e_conflict: 'Otro dispositivo sincronizó al mismo tiempo. Inténtalo de nuevo.',
 ago_now: 'ahora mismo', ago_m: 'hace {n} min', ago_h: 'hace {n} h', ago_d: 'hace {n} d',
 say: 'Escuchar', slow: 'Lento', playAll: 'Escuchar el diálogo', noVoiceDl: 'Este diálogo todavía no tiene voz: léelo en voz alta.',
 plPend: 'polaco pendiente', edited: 'editada', fromTutor: 'de tu tutor', hidTag: 'oculta',
 hide: 'Ocultar', unhide: 'Volver a mostrar', hidden: 'Ocultas', hiddenSub: 'No aparecen en la app. Tu tutor también puede ocultar frases.',
 hidToast: 'Oculta. La encuentras en Frases › Ocultas.', unhidToast: 'Visible otra vez.',
 del: 'Eliminar', delQ: '¿Eliminar para siempre? Toca otra vez', delSub: 'Desaparece de tu app en todos tus dispositivos. No se puede recuperar.', delToast: 'Eliminada.',
 edit: 'Editar', editT: 'Editar', editSub: 'Corrige sobre todo la traducción al polaco. Tu tutor ve el cambio al sincronizar.',
 eSave: 'Guardar', eSaved: 'Cambios guardados.', eRestore: 'Volver al original', eRestored: 'Se restauró el original.', cancel: 'Cancelar',
 askBtn: 'Pregunta al tutor', askSub: '¿No entiendes este uso? Escríbele a tu tutor; la respuesta aparece aquí y en Progreso.',
 askPh: 'Por ejemplo: ¿cuándo se usa esto? ¿Lo puedo decir en el trabajo?', askSend: 'Enviar pregunta', askSent: 'Pregunta enviada.',
 askNoSync: 'Para preguntar, la app tiene que estar conectada (Progreso › Sincronización).', askWait: 'Esperando respuesta…', myAsks: 'Tus preguntas',
 vTitle: 'Grabaciones del tutor', vAll: 'Descargar todas las grabaciones', vAllSub: 'Para escucharlas sin internet. En este dispositivo: {n} de {t}.',
 e_nosync: 'La app no está conectada.', tutorLink: 'Página del tutor (agregar frases y grabar tu voz):'
},
pl: {
 today: 'Dziś', sit: 'Sytuacje', words: 'Zwroty', me: 'Postępy',
 hello: '¡Pura vida!', heroSub: 'Hiszpański z Kostaryki taki, jakim się mówi: w domu, z przyjaciółmi, na ulicy i w pracy.',
 heroStat: '{n} zwrotów · {s} sytuacji', emptyT: 'Na razie nie ma zwrotów', emptySub: 'Wkrótce znajdziesz tu zwroty z Kostaryki, nagrane moim głosem, z prawdziwymi przykładami.',
 sitIntro: 'Prawdziwe chwile z życia w Kostaryce. Każdy zwrot ma neutralny odpowiednik, tłumaczenie na polski i rejestr.',
 noSit: 'Na razie nie ma sytuacji.', phrases: 'Zwroty', dialogues: 'Dialog', back: '‹ Wstecz', close: 'Zamknij',
 search: 'Szukaj zwrotu, odpowiednika lub tłumaczenia…', noResults: 'Nic nie znaleziono.',
 r_F: 'formalny', r_N: 'neutralny', r_I: 'nieformalny', r_C: 'potoczny',
 fTico: 'Po kostarykańsku', fNeu: 'Neutralny hiszpański', fPl: 'Po polsku', fEj: 'Przykład', fNote: 'Uwaga kulturowa', fZone: 'Region', fReg: 'Rejestr',
 noVoice: 'jeszcze bez nagrania', plRev: 'polski do sprawdzenia', dudoso: 'niepewne',
 settings: 'Ustawienia', ui: 'Język aplikacji', sitToday: 'Sytuacja dnia', fDay: 'Zwrot dnia', open: 'Otwórz',
 inst: 'Zainstaluj aplikację', instSub: 'Tico Box to aplikacja webowa: instalujesz ją raz, a aktualizuje się sama. Działa bez internetu.', instBtn: 'Zainstaluj Tico Box',
 instIOS: 'Na iPadzie / iPhonie: w Safari dotknij Udostępnij ⬆️, a potem „Do ekranu początkowego”.', instOther: 'W Chrome lub Edge: otwórz menu ⋮ i wybierz „Zainstaluj aplikację” (lub „Dodaj do ekranu głównego”).',
 backup: 'Kopia zapasowa', export: 'Eksportuj postępy', import: 'Importuj postępy', importPh: 'Wklej tu kopię zapasową', importGo: 'Importuj', importBad: 'Nie udało się odczytać kopii.', importOk: 'Postępy przywrócone.',
 reset: 'Usuń wszystkie postępy', resetQ: 'Usunąć wszystkie postępy?', resetSub: 'Postępy i ustawienia na tym urządzeniu zostaną usunięte. Tego nie da się cofnąć.', resetYes: 'Usuń',
 copied: 'Skopiowano', about: 'O aplikacji',
 aboutTxt: 'Tico Box: hiszpański z Kostaryki dla osób mówiących po polsku. Jedyny głos w aplikacji to głos nauczyciela, nagrany przez niego; nie ma głosu syntetycznego. Obrazki: Twemoji, © Twitter, Inc. i współtwórcy, CC-BY 4.0. Treść: {s} sytuacji, {n} zwrotów. Działa bez internetu.',
 welcome: 'Witaj w Tico Box', wTxt: 'Wybierz język aplikacji. Możesz go później zmienić.',
 keys: 'Klawiatura: 1–4 zmiana zakładki · Esc wstecz',
 instIOS2: 'Na iPadzie / iPhonie zainstalowana aplikacja ma osobne dane: otwórz ją, przejdź do Postępy › Synchronizacja › Skonfiguruj i wklej ten sam link, który dostałaś.',
 known: 'Umiem', knownOn: 'Już umiem', knownHint: 'Zaznacz, kiedy rozumiesz zwrot i umiesz go użyć.', knownTag: 'umiem',
 stats: 'Twoje postępy', sKnown: 'Opanowane zwroty', sToday: 'Fiszki obejrzane dziś', sDays: 'Dni nauki (7 dni)',
 sync: 'Synchronizacja', syncSub: 'Zapisuje postępy w prywatnym repozytorium GitHub i udostępnia je między telefonem, tabletem i komputerem.',
 syncStud: 'Twoje postępy zapisują się same i są wspólne dla wszystkich twoich urządzeń.', syncOff: 'Nie połączono', syncOn: 'Połączono z {r}',
 syncLast: 'Ostatnia synchronizacja: {t}', syncNever: 'nigdy', syncNow: 'Synchronizuj teraz', syncing: 'Synchronizuję…',
 syncSetup: 'Skonfiguruj', syncRepo: 'Repozytorium danych (właściciel/nazwa)', syncToken: 'Token GitHub (fine-grained, Contents: odczyt i zapis)',
 syncCode: '…albo wklej tu link lub kod, który dostałaś', syncGo: 'Połącz to urządzenie', syncDone: 'Połączono i zsynchronizowano',
 syncStudBtn: 'Utwórz link dla uczennicy', syncStudT: 'Link dla uczennicy', syncStudSub: 'Uczennica otwiera go raz i jej aplikacja jest połączona, bez żadnej konfiguracji. To urządzenie się nie łączy.',
 syncCopyLink: 'Kopiuj link', syncCopy: 'Kopiuj kod dla innego urządzenia', syncOut: 'Rozłącz to urządzenie',
 syncWarn: 'Link i kod zawierają token dostępu: udostępniaj je tylko uczennicy i swoim urządzeniom. Jeśli wyciekną, unieważnij token w GitHub.',
 syncPublic: 'Uwaga: to repozytorium jest publiczne. Postępy muszą być w repozytorium prywatnym.', linked: 'Gotowe! Twoja aplikacja jest połączona.',
 e_token: 'GitHub odrzucił token. Sprawdź go albo utwórz nowy.', e_forbidden: 'Token nie ma dostępu do tego repozytorium (Contents: odczyt i zapis).', e_repo: 'Nie znaleziono repozytorium. Sprawdź właściciela/nazwę i dostęp tokenu.', e_offline: 'Brak połączenia. Zsynchronizuję później.', e_conflict: 'Inne urządzenie synchronizowało w tym samym czasie. Spróbuj ponownie.',
 ago_now: 'przed chwilą', ago_m: '{n} min temu', ago_h: '{n} godz. temu', ago_d: '{n} dni temu',
 say: 'Posłuchaj', slow: 'Wolno', playAll: 'Posłuchaj dialogu', noVoiceDl: 'Ten dialog nie ma jeszcze nagrania: przeczytaj go na głos.',
 plPend: 'polski w przygotowaniu', edited: 'zmienione', fromTutor: 'od nauczyciela', hidTag: 'ukryte',
 hide: 'Ukryj', unhide: 'Pokaż znowu', hidden: 'Ukryte', hiddenSub: 'Nie pojawiają się w aplikacji. Nauczyciel też może ukrywać zwroty.',
 hidToast: 'Ukryto. Znajdziesz je w Zwroty › Ukryte.', unhidToast: 'Znowu widoczne.',
 del: 'Usuń', delQ: 'Usunąć na zawsze? Dotknij jeszcze raz', delSub: 'Zniknie z aplikacji na wszystkich twoich urządzeniach. Nie da się go odzyskać.', delToast: 'Usunięto.',
 edit: 'Edytuj', editT: 'Edytuj', editSub: 'Popraw przede wszystkim tłumaczenie na polski. Nauczyciel zobaczy zmianę po synchronizacji.',
 eSave: 'Zapisz', eSaved: 'Zmiany zapisane.', eRestore: 'Przywróć oryginał', eRestored: 'Przywrócono oryginał.', cancel: 'Anuluj',
 askBtn: 'Zapytaj nauczyciela', askSub: 'Nie rozumiesz tego użycia? Napisz do nauczyciela; odpowiedź pojawi się tutaj i w Postępach.',
 askPh: 'Na przykład: kiedy się tego używa? Czy mogę tak powiedzieć w pracy?', askSend: 'Wyślij pytanie', askSent: 'Pytanie wysłane.',
 askNoSync: 'Żeby zapytać, aplikacja musi być połączona (Postępy › Synchronizacja).', askWait: 'Czekam na odpowiedź…', myAsks: 'Twoje pytania',
 vTitle: 'Nagrania nauczyciela', vAll: 'Pobierz wszystkie nagrania', vAllSub: 'Żeby słuchać ich bez internetu. Na tym urządzeniu: {n} z {t}.',
 e_nosync: 'Aplikacja nie jest połączona.', tutorLink: 'Strona nauczyciela (dodawanie zwrotów i nagrań):'
}
};
const t = (k, v) => { let s = (T[S.cfg.ui] || T.es)[k]; if (s == null) s = T.es[k] || k; if (v) for (const x in v) s = s.replace('{' + x + '}', v[x]); return s; };

/* ------------------------------------------------------------ estado */
const KEY = 'ticobox.v1';
const newDev = () => 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const blank = () => ({ v: 1, dev: newDev(), cards: {}, log: {}, ol: {}, hid: {}, ed: {}, devs: {}, cfgT: 0, resetAt: 0, cfg: { ui: 'es', ok: false } });
const store = {
  get() { try { const s = localStorage.getItem(KEY); if (s) return JSON.parse(s); } catch (e) {} return null; },
  set(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} }
};
function norm(o) {
  const b = blank(); if (!o || typeof o !== 'object') return b;
  const r = Object.assign(b, o); r.cfg = Object.assign(blank().cfg, o.cfg || {}); if (r.cfg.ui !== 'pl') r.cfg.ui = 'es'; delete r.cfg.hideV;
  ['cards', 'log', 'ol', 'hid', 'ed', 'devs'].forEach(k => { r[k] = (o[k] && typeof o[k] === 'object') ? o[k] : {}; });
  if (!r.dev) r.dev = newDev();
  return r;
}
let S = norm(store.get());
/* ediciones (progress.json → ed, compartidas con el tutor): se parte del original y se aplica la última */
const EDF = ['tx', 'ne', 'pl', 'nc', 'ej', 'r'];
function overlay(o) {
  const e = S.ed[o.vk]; if (!e || e.reset) return o;
  const x = Object.assign({}, o, { _o: o, edd: 1 });
  EDF.forEach(k => { if (k in e && e[k] != null) x[k] = e[k]; });
  if (e.plOk) x.plOk = 1;
  if (x.pl) x.plp = 0;
  return x;
}
function refresh() {
  E = [];
  BASE.forEach(e => { if (e) E[e.i] = overlay(e); });
  CUSTOM.forEach((w, k) => {
    if (!w || w.del || !w.tx) return;
    const si = SITS.findIndex(x => x.k === w.s), i = CB + k;
    E[i] = overlay({ i, vk: 't' + k, s: si >= 0 ? si : TSIT, tx: w.tx, ne: w.ne || '', pl: w.pl || '', r: w.r || 'N', ej: w.ej || '', nc: w.nc || '', em: w.em || '📝', tch: 1, plp: w.pl ? 0 : 1, at: w.at || 0 });
  });
}
const lines = k => (SITS[k] ? SITS[k].dl : []).map(overlay).filter(l => !isHid(l));
const save = () => { store.set(S); refresh(); if (window.TBSync) TBSync.soon(4000); };
const V = { tab: 'today', sit: null, sheet: null, q: '' };
const views = {};   // scroll guardado por vista

/* ------------------------------------------------------------ ayudas */
const sTitle = s => S.cfg.ui === 'pl' ? (s.pl || s.es) : s.es;
const sOther = s => S.cfg.ui === 'pl' ? s.es : (s.pl || '');
const sDesc = s => S.cfg.ui === 'pl' ? (s.dp || s.ds) : s.ds;
const regChip = e => e.r ? `<em class="rg ${e.r}">${t('r_' + e.r)}</em>` : '';
function isHid(e) { const h = S.hid[e.vk]; return !!(h && h.h); }
function isDel(e) { const h = S.hid[e.vk]; return !!(h && h.h && h.x); }
const live = () => E.filter(e => e && !isHid(e));
/* situaciones con algo publicado: frases «ok» o líneas de diálogo que las usan */
const sitHas = k => !!SITS[k] && (lines(k).length > 0 || live().some(e => e.s === k));
const sitList = () => SITS.map((s, k) => k).filter(sitHas);
const known = i => !!(S.cards[i] && S.cards[i].k);
/* registro por día: este dispositivo (log) + los demás (ol) */
function LG(d) { const o = { v: 0 }; const add = l => { if (l) o.v += l.v || 0; }; add(S.log[d]); for (const k in (S.ol || {})) add(S.ol[k][d]); return o; }
const ago = ms => { const m = Math.round((Date.now() - ms) / 6e4); return m < 1 ? t('ago_now') : m < 60 ? t('ago_m', { n: m }) : m < 1440 ? t('ago_h', { n: Math.round(m / 60) }) : t('ago_d', { n: Math.round(m / 1440) }); };
const syncErr = e => esc(T.es['e_' + e] ? t('e_' + e) : e);
const ICO = {
  today: '<svg viewBox="0 0 24 24"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
  sit: '<svg viewBox="0 0 24 24"><path d="M4 5h16v11H9l-5 4zM8 9h8M8 12h5"/></svg>',
  words: '<svg viewBox="0 0 24 24"><path d="M4 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4zM20 4h-6M20 4v14h-6"/></svg>',
  me: '<svg viewBox="0 0 24 24"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>'
};
const TABS = ['today', 'sit', 'words', 'me'];
function picHTML(e, cls) {
  cls = cls || '';
  const ph = window.TBSync && TBSync.img.url(e.vk); if (ph) return `<div class="pic photo ${cls}"><img src="${ph}" alt=""></div>`;
  if (e.em) return `<div class="pic ${cls}"><span class="emo">${esc(e.em)}</span></div>`;
  const f = e.p || (SITS[e.s] && SITS[e.s].ic) || '1f4dd';
  return `<div class="pic ${cls}"><img src="e/${f}.svg" alt=""></div>`;
}
/* ---- voz: solo la grabación del tutor, y solo si se grabó el texto actual (si el texto cambió, se ignora) */
const hasVoice = x => !!(x && window.TBSync && TBSync.voice.has(x.vk) && (TBSync.voice.meta(x.vk) || {}).tx === x.tx);
const Voice = (() => {
  let au = null, res = null, seq = 0;
  const fin = () => { if (res) { const r = res; res = null; r(); } };
  function stop() { seq++; try { if (au) { au.onended = au.onerror = null; au.pause(); } } catch (e) {} au = null; fin(); }
  function say(x, slow) {
    stop(); const my = seq;
    return new Promise(done => {
      res = done;
      if (!hasVoice(x)) return fin();
      TBSync.voice.get(x.vk).then(b64 => {
        if (my !== seq) return;
        if (!b64) return fin();
        try {
          au = new Audio('data:audio/mpeg;base64,' + b64);
          /* lenta: 0.75 sin cambiar el tono — https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/preservesPitch */
          au.preservesPitch = true; au.mozPreservesPitch = true; au.webkitPreservesPitch = true;
          au.playbackRate = slow ? 0.75 : 1;
          au.onended = au.onerror = fin; const p = au.play(); if (p && p.catch) p.catch(fin);
        } catch (e) { fin(); }
      });
    });
  }
  return { say, stop };
})();
const speakerSvg = '<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 4V5L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z"/></svg>';
/* Sin grabación del tutor no hay botón de reproducir: la entrada se estudia por texto (sección 6). */
const voiceTag = () => `<span class="tag nv">🔇 ${t('noVoice')}</span>`;
const playBtns = (x, big, line) => hasVoice(x) ? `<span class="pbtns"><button class="say${big ? ' big' : ''}" data-a="play" data-k="${esc(x.vk)}"${line ? ` data-l="${line}"` : ''} aria-label="${esc(t('say'))}">${speakerSvg}</button><button class="say slow" data-a="play" data-k="${esc(x.vk)}" data-s="1"${line ? ` data-l="${line}"` : ''} aria-label="${esc(t('slow'))}" title="${esc(t('slow'))}">🐢</button></span>` : '';
const stateTags = e => `${e.du ? `<span class="tag du">❓ ${t('dudoso')}</span> ` : ''}${e.plp ? `<span class="tag rv">⏳ ${t('plPend')}</span>` : e.pl && !e.plOk ? `<span class="tag rv">✏️ ${t('plRev')}</span>` : ''}${e.edd ? ` <span class="tag d">✏️ ${t('edited')}</span>` : ''}${e.tch ? ` <span class="tag">🧑‍🏫 ${t('fromTutor')}</span>` : ''}`;
const byKey = vk => { for (const e of E) if (e && e.vk === vk) return e; for (let k = 0; k < SITS.length; k++) { const l = SITS[k].dl.find(x => x.vk === vk); if (l) return overlay(l); } return null; };
function toast(msg) { const d = document.createElement('div'); d.textContent = msg; d.style.cssText = 'position:fixed;left:50%;bottom:90px;transform:translateX(-50%);background:#14244a;color:#fff;padding:10px 18px;border-radius:99px;z-index:99;font-weight:600'; document.body.appendChild(d); setTimeout(() => d.remove(), 1700); }
function copyText(txt) {
  const done = () => toast(t('copied'));
  const fb = () => { const ta = document.createElement('textarea'); ta.value = txt; ta.style.cssText = 'position:fixed;opacity:0;top:0'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) {} ta.remove(); done(); };
  try { if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(txt).then(done, fb); return; } } catch (e) {}
  fb();
}

/* ------------------------------------------------------------ pintado */
/* Volver a pintar reemplaza la página: se conserva el scroll de cada vista.
   Las actualizaciones en segundo plano esperan a que la persona deje de tocar o hacer scroll. */
let lastTouch = 0, bgT = 0;
['touchstart', 'touchmove', 'wheel', 'scroll', 'pointerdown', 'keydown', 'input'].forEach(ev => document.addEventListener(ev, () => { lastTouch = Date.now(); }, { capture: true, passive: true }));
function bgRender() {
  clearTimeout(bgT);
  bgT = setTimeout(() => { if (Date.now() - lastTouch < 1300) return bgRender(); render(); }, Math.max(150, 1400 - (Date.now() - lastTouch)));
}
const vkey = () => V.tab + '|' + V.sit;
function render() {
  const a = $('#base'); if (!a) return;
  const m0 = $('#main'); if (m0) views[m0.dataset.vk] = m0.scrollTop;
  const sh0 = $('#ov .sheet'), shy = sh0 && V.sheet ? sh0.scrollTop : 0;
  document.documentElement.lang = S.cfg.ui;
  const view = V.tab === 'today' ? vToday() : V.tab === 'sit' ? (V.sit != null ? vSitOne(V.sit) : vSits()) : V.tab === 'words' ? vWords() : vMe();
  const nav = TABS.map(k => `<button class="${V.tab === k ? 'on' : ''}" data-a="tab" data-k="${k}">${ICO[k]}<span>${t(k)}</span></button>`).join('');
  const sc = window.TBSync && TBSync.conf(), ss = window.TBSync ? TBSync.state : {};
  const chip = sc ? `<button class="chip sy ${ss.running ? 'spin' : ss.err && ss.err !== 'offline' ? 'err' : ''}" data-a="syncnow" title="${esc(t('syncNow'))}" aria-label="${esc(t('syncNow'))}"><svg viewBox="0 0 24 24"><path d="M20 12a8 8 0 0 1-14 5.3M4 12a8 8 0 0 1 14-5.3M18 3v4h-4M6 21v-4h4"/></svg></button>` : '';
  a.innerHTML = `<div class="top"><h1>Tico Box<small>🇨🇷</small></h1>${chip}</div>
  <nav>${nav}</nav><main id="main" class="v-${V.tab}" data-vk="${esc(vkey())}"><div class="mw">${view}</div></main>${sheetHTML()}`;
  const y = views[vkey()]; if (y) { const m1 = $('#main'); if (m1) m1.scrollTop = y; }
  if (shy) { const s1 = $('#ov .sheet'); if (s1) s1.scrollTop = shy; }
}
function vToday() {
  const L = live();
  const hero = `<div class="card hero"><h2>${t('today')}</h2><div class="big">${t('hello')}</div><p>${t('heroSub')}</p>${L.length ? `<p style="margin:0"><b>${t('heroStat', { n: L.length, s: sitList().length })}</b></p>` : ''}</div>`;
  if (!L.length) return hero + `<div class="card"><div class="empty"><div style="font-size:42px">📦</div><b>${t('emptyT')}</b><p class="small">${t('emptySub')}</p></div></div>`;
  const d = today(), e = L[(d * 37) % L.length], sl = sitList(), sk = sl.length ? sl[d % sl.length] : -1, s = SITS[sk];
  const sit = s ? `<div class="card"><h2>${t('sitToday')}</h2><button class="wrow" style="border:0;padding:0" data-a="sitopen" data-s="${sk}"><img src="e/${s.ic}.svg" width="44" height="44" alt=""><div class="t"><b style="font-size:18px">${esc(sTitle(s))}</b><span class="gl">${esc(sOther(s))}</span></div><span class="tag">${t('open')}</span></button></div>` : '';
  return hero + `<div class="card"><h2>${t('fDay')}</h2>${erow(e)}</div>` + sit;
}
const erow = e => `<button class="wrow" data-a="entry" data-i="${e.i}">${picHTML(e, 'sm')}<div class="t"><b class="tico">${esc(e.tx)}</b><span class="gl neu">${esc(S.cfg.ui === 'pl' && e.pl ? e.pl : e.ne)}${regChip(e)}</span></div>${hasVoice(e) ? '<span class="bdg">🎙️</span>' : ''}${known(e.i) ? `<span class="tag m">✓ ${t('knownTag')}</span>` : e.du ? '<span class="tag du">❓</span>' : ''}</button>`;
function vSits() {
  const sl = sitList();
  if (!sl.length) return `<div class="card"><h2>${t('sit')}</h2><div class="empty">${t('noSit')}</div></div>`;
  const L = live();
  return `<div class="card"><h2>${t('sit')}</h2><p style="margin:0">${t('sitIntro')}</p></div>` + sl.map(k => {
    const s = SITS[k], n = L.filter(e => e.s === k).length;
    return `<button class="ucard" data-a="sit" data-s="${k}"><img src="e/${s.ic}.svg" alt=""><div class="t"><b>${esc(sTitle(s))}</b><small>${esc(sOther(s))} · ${n}</small></div></button>`;
  }).join('');
}
function vSitOne(k) {
  const s = SITS[k]; if (!s || !sitHas(k)) { V.sit = null; return vSits(); }
  const es = live().filter(e => e.s === k), ls = lines(k), nv = ls.filter(hasVoice).length;
  const dl = ls.length ? `<div class="card"><h2>${t('dialogues')}</h2>${ls.map((l, j) => `<div class="dl" id="dl${j}"><div style="display:flex;gap:8px;align-items:flex-start"><div style="flex:1"><small>${esc(l.w)}</small><b>${esc(l.tx)}</b><span>${esc(S.cfg.ui === 'pl' && l.pl ? l.pl : l.ne)}</span></div>${playBtns(l, false, 1)}</div></div>`).join('')}
    ${nv ? `<button class="btn s sm mt" data-a="dial" data-s="${k}">▶ ${t('playAll')}</button>` : `<div class="small mt">🔇 ${t('noVoiceDl')}</div>`}</div>` : '';
  return `<button class="back" data-a="sitback">${t('back')}</button><div class="card"><div class="wrow" style="border:0;padding:0"><img src="e/${s.ic}.svg" width="46" height="46" alt=""><div class="t"><b style="font-size:20px">${esc(sTitle(s))}</b><span class="gl">${esc(sOther(s))}</span></div></div>${sDesc(s) ? `<p class="desc">${esc(sDesc(s))}</p>` : ''}</div>
  ${dl}${es.length ? `<div class="card"><h2>${t('phrases')} (${es.length})</h2>${es.map(erow).join('')}</div>` : ''}`;
}
function vWords() {
  return `<input class="field" id="q" placeholder="${esc(t('search'))}" value="${esc(V.q)}" autocomplete="off" autocapitalize="off" spellcheck="false"><div id="wres">${wresHTML()}</div>`;
}
const fold = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l').toLowerCase();
function wresHTML() {
  const L = live(); if (!L.length) return `<div class="card mt"><div class="empty">${t('emptyT')}</div></div>`;
  const q = fold(V.q.trim());
  const r = q ? L.filter(e => [e.tx, e.ne, e.pl, e.ej].some(x => fold(x).includes(q))) : L;
  const hw = E.filter(e => e && isHid(e) && !isDel(e));
  return `<div class="card mt">${r.length ? r.slice(0, 120).map(erow).join('') : `<div class="empty">${t('noResults')}</div>`}</div>` +
    (hw.length && !q ? `<div class="card"><h2>🚫 ${t('hidden')} (${hw.length})</h2><p class="small" style="margin:0 0 6px">${t('hiddenSub')}</p>${hw.map(e => `<div class="wrow">${picHTML(e, 'sm')}<div class="t"><b class="tico">${esc(e.tx)}</b><span class="gl">${esc(e.ne)}</span></div><button class="btn s sm" style="width:auto" data-a="hide" data-i="${e.i}">↩️ ${t('unhide')}</button></div>`).join('')}</div>` : '');
}
function vMe() {
  const seg = (key, opts) => `<div class="seg">${opts.map(([v, l]) => `<button class="${String(S.cfg[key]) === String(v) ? 'on' : ''}" data-a="cfg" data-k="${key}" data-v="${v}">${l}</button>`).join('')}</div>`;
  const L = live(), nk = L.filter(e => known(e.i)).length, d = today();
  let days = 0; for (let k = 0; k < 7; k++) if (LG(d - k).v) days++;
  return `<div class="card"><h2>${t('stats')}</h2><div class="stats"><div class="stat"><b>${nk}<small style="font-size:14px;font-weight:600">/${L.length}</small></b><span>${t('sKnown')}</span></div><div class="stat"><b>${LG(d).v}</b><span>${t('sToday')}</span></div><div class="stat"><b>${days}</b><span>${t('sDays')}</span></div></div></div>
  ${syncCard()}
  ${asksCard()}
  ${voiceCard()}
  <div class="card"><h2>${t('settings')}</h2>
   <div class="srow"><div class="l">${t('ui')}</div>${seg('ui', [['es', 'Español'], ['pl', 'Polski']])}</div>
   <div class="srow"><div class="l small">${t('keys')}</div></div></div>
  ${installCard()}
  <div class="card"><h2>${t('backup')}</h2><div class="btns two"><button class="btn s sm" data-a="export">${t('export')}</button><button class="btn s sm" data-a="import">${t('import')}</button></div>
   <button class="btn bad sm mt" data-a="reset">${t('reset')}</button></div>
  <div class="card"><h2>${t('about')}</h2><p class="small" style="margin:0">${t('aboutTxt', { n: live().length, s: sitList().length })}</p></div>`;
}
function asksCard() {
  if (!ASKS.length) return '';
  return `<div class="card"><h2>💬 ${t('myAsks')}</h2>${ASKS.slice().reverse().slice(0, 30).map(askHTML).join('')}</div>`;
}
function askHTML(q) {
  const e = byKey(q.k);
  return `<div class="ask">${e ? `<button class="linkbtn" data-a="askopen" data-k="${esc(q.k)}"><b class="tico">${esc(e.tx)}</b></button>` : ''}<div class="q">❓ ${esc(q.q)}</div>${q.a ? `<div class="a">🧑‍🏫 ${esc(q.a)}</div>` : `<div class="small">${t('askWait')}</div>`}</div>`;
}
function voiceCard() {
  if (!window.TBSync || !TBSync.conf() || !TBSync.voice.count()) return '';
  const on = TBSync.allVoice();
  return `<div class="card"><h2>🎙️ ${t('vTitle')}</h2><div class="srow"><div class="l">${t('vAll')}<small>${t('vAllSub', { n: TBSync.voice.localCount(), t: TBSync.voice.count() })}</small></div><button class="sw ${on ? 'on' : ''}" data-a="dlall" aria-label="${esc(t('vAll'))}"></button></div></div>`;
}
function syncCard() {
  if (!window.TBSync) return '';
  const c = TBSync.conf(), st = TBSync.state;
  const status = `<div class="small">${st.running ? t('syncing') : t('syncLast', { t: st.last ? ago(st.last) : t('syncNever') })}</div>${st.err ? `<div class="fb bad mt small">${syncErr(st.err)}</div>` : ''}`;
  if (c && c.n === 'est') return `<div class="card" id="synccard"><h2>🔄 ${t('sync')}</h2><p class="small" style="margin:0 0 6px">${t('syncStud')}</p>${status}<button class="btn s sm mt" data-a="syncnow">${t('syncNow')}</button></div>`;
  if (!c) return `<div class="card" id="synccard"><h2>🔄 ${t('sync')}</h2><p class="small" style="margin:0 0 10px">${t('syncSub')}</p><div class="kv"><span>${t('syncOff')}</span></div><button class="btn sm mt" data-a="syncsetup">${t('syncSetup')}</button></div>`;
  return `<div class="card" id="synccard"><h2>🔄 ${t('sync')}</h2><div class="kv"><span>${t('syncOn', { r: esc(c.repo) })}</span></div>${status}
   <div class="btns mt"><button class="btn sm" data-a="syncnow">${t('syncNow')}</button><div class="btns two"><button class="btn s sm" data-a="synccode">${t('syncCopy')}</button><button class="btn s sm" data-a="syncsetup">${t('syncStudBtn')}</button></div></div>
   <div class="small mt">${t('syncWarn')}</div><button class="btn g sm mt" data-a="syncout">${t('syncOut')}</button></div>`;
}
/* instalar como app (Android/Windows: aviso del navegador; iPad/iPhone: Compartir › Añadir a pantalla de inicio) */
let instEv = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); instEv = e; if (V.tab === 'me') bgRender(); });
const standalone = () => (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
function installCard() {
  if (standalone() || location.protocol !== 'https:') return '';
  const how = isIOS() ? t('instIOS') : instEv ? '' : t('instOther');
  const ios2 = isIOS() && window.TBSync && TBSync.conf() ? `<div class="fb warn small mt">${t('instIOS2')}</div>` : '';
  return `<div class="card"><h2>📲 ${t('inst')}</h2><p class="small" style="margin:0 0 10px">${t('instSub')}</p>${instEv ? `<button class="btn sm" data-a="install">${t('instBtn')}</button>` : `<div class="fb warn small">${how}</div>`}${ios2}</div>`;
}

/* ------------------------------------------------------------ diálogo: solo las líneas grabadas, una tras otra */
let dRun = 0;
async function playDial(k) {
  const id = ++dRun, ls = lines(k);
  for (let j = 0; j < ls.length; j++) {
    if (id !== dRun) return; if (!hasVoice(ls[j])) continue;
    const el = document.getElementById('dl' + j); if (el) { el.classList.add('cur'); try { el.scrollIntoView({ block: 'nearest' }); } catch (x) {} }
    await Voice.say(ls[j]);
    if (el) el.classList.remove('cur');
    await new Promise(r => setTimeout(r, 250));
  }
}
function stopDial() { dRun++; Voice.stop(); document.querySelectorAll('.dl.cur').forEach(e => e.classList.remove('cur')); }

/* ------------------------------------------------------------ hojas */
function sheetHTML() {
  const s = V.sheet; if (!s) return '';
  let b = '';
  if (s.k === 'entry') {
    const e = E[s.i]; if (!e) { V.sheet = null; return ''; }
    const fld = (k, v) => v ? `<div class="fld"><small>${t(k)}</small><div>${esc(v)}</div></div>` : '';
    const qs = ASKS.filter(q => q.k === e.vk);
    b = `<div class="center">${picHTML(e, 'lg')}<div class="tico mt" style="font-size:28px">${esc(e.tx)}</div><div class="mt">${regChip(e)}</div>
    <div class="mt" style="display:flex;gap:12px;justify-content:center;align-items:center;flex-wrap:wrap">${hasVoice(e) ? playBtns(e, true) : voiceTag()}</div>
    <div class="mt">${stateTags(e)}${isHid(e) ? ` <span class="tag">🚫 ${t('hidTag')}</span>` : ''}</div>
    <button class="btn ${known(e.i) ? '' : 's'} sm mt" data-a="known" data-i="${e.i}" style="max-width:260px;margin-left:auto;margin-right:auto">${known(e.i) ? '✓ ' + t('knownOn') : t('known')}</button><div class="small mt">${t('knownHint')}</div></div>
    ${fld('fNeu', e.ne)}${fld('fPl', e.pl)}${fld('fEj', e.ej)}${fld('fNote', e.nc)}${fld('fZone', e.z)}
    ${qs.length ? `<div class="fld"><small>💬 ${t('myAsks')}</small>${qs.map(askHTML).join('')}</div>` : ''}
    <div class="btns two mt2"><button class="btn s sm" data-a="ask" data-i="${e.i}">💬 ${t('askBtn')}</button><button class="btn s sm" data-a="edit" data-i="${e.i}">✏️ ${t('edit')}</button></div>
    <div class="btns two mt"><button class="btn g sm" data-a="hide" data-i="${e.i}">${isHid(e) ? '↩️ ' + t('unhide') : '🚫 ' + t('hide')}</button><button class="btn g sm" data-a="delw" data-i="${e.i}">${s.dq ? '⚠️ ' + t('delQ') : '🗑 ' + t('del')}</button></div>
    ${s.dq ? `<div class="small center mt">${t('delSub')}</div>` : ''}`;
  } else if (s.k === 'edit') {
    const e = E[s.i]; if (!e) { V.sheet = null; return ''; }
    const f = s.f || (s.f = { pl: e.pl || '', ne: e.ne || '', nc: e.nc || '' });
    b = `<h3>✏️ ${t('editT')}</h3><div class="tico" style="font-size:20px">${esc(e.tx)}</div><p class="gl small">${t('editSub')}</p>
    <label class="small" for="e_pl">${t('fPl')}</label><input class="field" id="e_pl" lang="pl" value="${esc(f.pl)}" autocomplete="off" spellcheck="true">
    <label class="small mt" style="display:block" for="e_ne">${t('fNeu')}</label><input class="field" id="e_ne" value="${esc(f.ne)}" autocomplete="off">
    <label class="small mt" style="display:block" for="e_nc">${t('fNote')}</label><textarea class="field" id="e_nc" rows="3">${esc(f.nc)}</textarea>
    <div class="btns two mt"><button class="btn sm" data-a="edsave">✓ ${t('eSave')}</button><button class="btn g sm" data-a="entry" data-i="${e.i}">${t('cancel')}</button></div>
    ${e.edd ? `<button class="btn g sm mt" data-a="edreset">↩️ ${t('eRestore')}</button>` : ''}`;
  } else if (s.k === 'ask') {
    const e = E[s.i]; if (!e) { V.sheet = null; return ''; }
    const on = window.TBSync && TBSync.conf();
    b = `<h3>💬 ${t('askBtn')}</h3><div class="tico" style="font-size:20px">${esc(e.tx)}</div><p class="gl small">${t('askSub')}</p>
    ${on ? `<textarea class="field" id="askq" rows="4" placeholder="${esc(t('askPh'))}">${esc(s.q || '')}</textarea>${s.err ? `<div class="fb bad mt small">${syncErr(s.err)}</div>` : ''}
    <div class="btns two mt"><button class="btn sm" data-a="asksend" id="asksend">${t('askSend')}</button><button class="btn g sm" data-a="entry" data-i="${e.i}">${t('cancel')}</button></div>` : `<div class="fb warn small">${t('askNoSync')}</div><button class="btn g sm mt" data-a="entry" data-i="${e.i}">${t('cancel')}</button>`}`;
  } else if (s.k === 'welcome') {
    b = `<div class="center"><div style="font-size:46px">🇨🇷</div><h3>Tico Box</h3><p class="gl">${T.es.wTxt}<br>${T.pl.wTxt}</p></div>
    <div class="btns two"><button class="btn" data-a="lang" data-v="es">Español</button><button class="btn" data-a="lang" data-v="pl">Polski</button></div>`;
  } else if (s.k === 'reset') {
    b = `<h3>${t('resetQ')}</h3><p class="gl">${t('resetSub')}</p><div class="btns two"><button class="btn g" data-a="close">${t('close')}</button><button class="btn bad" data-a="resetgo">${t('resetYes')}</button></div>`;
  } else if (s.k === 'sync') {
    const c = window.TBSync && TBSync.conf();
    b = `<h3>🔄 ${t('sync')}</h3><p class="gl small">${t('syncSub')}</p>
    <label class="small" for="srepo">${t('syncRepo')}</label><input class="field" id="srepo" value="${esc(s.repo || (c && c.repo) || TBSync.DEFAULT_REPO)}" autocomplete="off" autocapitalize="off" spellcheck="false">
    <label class="small mt" style="display:block" for="stok">${t('syncToken')}</label><input class="field" id="stok" type="password" placeholder="github_pat_…" autocomplete="off" autocapitalize="off" spellcheck="false">
    <label class="small mt" style="display:block" for="scode">${t('syncCode')}</label><input class="field" id="scode" placeholder="https://…#TBX1.…" autocomplete="off" autocapitalize="off" spellcheck="false">
    <div id="serr">${s.err ? `<div class="fb bad mt small">${syncErr(s.err)}</div>` : ''}</div>
    <div class="btns mt"><button class="btn" data-a="syncgo" id="sgo">${t('syncGo')}</button><button class="btn s" data-a="syncstud" id="sstud">${t('syncStudBtn')}</button></div>
    ${s.link ? `<div class="card mt" style="margin-bottom:0"><h2>${t('syncStudT')}</h2><p class="small" style="margin:0 0 8px">${t('syncStudSub')}</p><textarea class="field" id="slink" readonly rows="3" style="font-size:13px">${esc(s.link)}</textarea>${s.pub ? `<div class="fb warn mt small">${t('syncPublic')}</div>` : ''}<button class="btn sm mt" data-a="copylink">${t('syncCopyLink')}</button><div class="small mt">${t('syncWarn')}</div></div>` : ''}
    <div class="small mt">🧑‍🏫 ${t('tutorLink')} <a href="tutor.html">tutor.html</a></div>
    <button class="btn g sm mt" data-a="close">${t('close')}</button>`;
  } else if (s.k === 'import') {
    b = `<h3>${t('import')}</h3><textarea class="field mt" id="imp" placeholder="${esc(t('importPh'))}"></textarea><button class="btn mt" data-a="importgo">${t('importGo')}</button>`;
  }
  const dismiss = s.k === 'welcome' ? '' : 'data-a="close"';
  return `<div class="ov" ${dismiss} id="ov"><div class="sheet" data-stop="1"><div class="grab"></div>${b}${s.k === 'entry' || s.k === 'import' ? `<button class="btn g sm mt2" data-a="close">${t('close')}</button>` : ''}</div></div>`;
}

/* ------------------------------------------------------------ acciones */
const A = {
  tab: d => { if (TABS.indexOf(d.k) < 0) return; stopDial(); V.tab = d.k; V.sit = null; V.sheet = null; views[vkey()] = 0; render(); },
  sit: d => { V.sit = Number(d.s); views[vkey()] = 0; render(); },
  sitback: () => { stopDial(); V.sit = null; render(); },
  entry: d => { const i = Number(d.i); if (!V.sheet || V.sheet.k !== 'entry' || V.sheet.i !== i) Voice.stop(); V.sheet = { k: 'entry', i }; const day = today(), l = S.log[day] || (S.log[day] = { v: 0 }); l.v = (l.v || 0) + 1; save(); render(); },
  known: d => { const i = Number(d.i); S.cards[i] = { k: known(i) ? 0 : 1, t: Date.now() }; save(); render(); },
  close: () => { Voice.stop(); V.sheet = null; render(); },
  cfg: d => { if (d.k !== 'ui') return; S.cfg.ui = d.v === 'pl' ? 'pl' : 'es'; S.cfgT = Date.now(); save(); render(); },
  sitopen: d => { V.tab = 'sit'; V.sit = Number(d.s); V.sheet = null; views[vkey()] = 0; render(); },
  lang: d => { S.cfg.ui = d.v === 'pl' ? 'pl' : 'es'; S.cfg.ok = true; S.cfgT = Date.now(); save(); V.sheet = null; render(); },
  export: () => copyText(JSON.stringify(S)),
  import: () => { V.sheet = { k: 'import' }; render(); },
  importgo: () => {
    try { const o = JSON.parse(((($('#imp') || {}).value) || '').trim()); if (!o || typeof o !== 'object' || !o.cfg) throw 0; const dev = S.dev; S = norm(o); S.dev = dev; S.cfg.ok = true; save(); V.sheet = null; render(); toast(t('importOk')); }
    catch (e) { toast(t('importBad')); }
  },
  reset: () => { V.sheet = { k: 'reset' }; render(); },
  resetgo: () => { const ui = S.cfg.ui, dev = S.dev; S = blank(); S.cfg.ui = ui; S.cfg.ok = true; S.dev = dev; S.resetAt = Date.now(); save(); V.sheet = null; render(); },
  play: d => { const x = byKey(d.k); if (x) Voice.say(x, !!d.s); },
  dial: d => { playDial(Number(d.s)); },
  edit: d => { V.sheet = { k: 'edit', i: Number(d.i) }; render(); },
  edsave: () => {
    const s = V.sheet, e = s && E[s.i]; if (!e) return;
    const v = { pl: ($('#e_pl') || {}).value || '', ne: ($('#e_ne') || {}).value || '', nc: ($('#e_nc') || {}).value || '' };
    const prev = S.ed[e.vk] && !S.ed[e.vk].reset ? S.ed[e.vk] : {};
    S.ed[e.vk] = Object.assign({}, prev, { pl: v.pl.trim(), ne: v.ne.trim(), nc: v.nc.trim(), plOk: true, t: Date.now(), by: 's' });
    save(); V.sheet = { k: 'entry', i: e.i }; render(); toast(t('eSaved'));
  },
  edreset: () => { const s = V.sheet, e = s && E[s.i]; if (!e) return; S.ed[e.vk] = { reset: true, t: Date.now(), by: 's' }; save(); V.sheet = { k: 'entry', i: e.i }; render(); toast(t('eRestored')); },
  hide: d => {
    const e = E[Number(d.i)]; if (!e) return; const was = isHid(e);
    S.hid[e.vk] = { h: !was, t: Date.now(), by: 's' }; save();
    if (!was && V.sheet && V.sheet.k === 'entry') V.sheet = null;
    render(); toast(was ? t('unhidToast') : t('hidToast'));
  },
  delw: d => {
    const e = E[Number(d.i)]; if (!e) return; const s = V.sheet;
    if (s && s.k === 'entry' && !s.dq) { s.dq = 1; render(); return; }
    S.hid[e.vk] = { h: true, x: true, t: Date.now(), by: 's' }; delete S.cards[e.i];
    V.sheet = null; save(); render(); toast(t('delToast'));
  },
  ask: d => { V.sheet = { k: 'ask', i: Number(d.i) }; render(); const q = $('#askq'); if (q) q.focus(); },
  askopen: d => { const e = byKey(d.k); if (e && e.i != null) { V.sheet = { k: 'entry', i: e.i }; render(); } },
  asksend: async () => {
    const s = V.sheet, e = s && E[s.i]; if (!e) return; const q = (($('#askq') || {}).value || '').trim(); if (!q) return;
    const b = $('#asksend'); if (b) { b.disabled = true; b.textContent = t('syncing'); }
    try { await TBSync.ask(e.vk, q, deviceName()); V.sheet = { k: 'entry', i: e.i }; render(); toast(t('askSent')); }
    catch (er) { s.err = er.message; s.q = q; render(); }
  },
  dlall: async () => { const on = !TBSync.allVoice(); const p = TBSync.downloadAll(on); render(); await p; render(); },
  syncsetup: () => { V.sheet = { k: 'sync' }; render(); },
  syncnow: () => { if (window.TBSync) TBSync.run('manual'); },
  synccode: () => copyText(TBSync.makeCode(TBSync.conf())),
  syncout: () => { TBSync.disconnect(); render(); },
  copylink: () => { if (V.sheet && V.sheet.link) copyText(V.sheet.link); },
  syncgo: async () => {
    const s = V.sheet, code = TBSync.readCode(($('#scode') || {}).value);
    const repo = code ? code.r : ($('#srepo') || {}).value || '', tok = code ? code.t : ($('#stok') || {}).value || '';
    if (!repo || !tok) return; const btn = $('#sgo'); if (btn) { btn.disabled = true; btn.textContent = t('syncing'); }
    try { await TBSync.connect(repo, tok, code && code.n); V.sheet = null; render(); toast(t('syncDone')); }
    catch (e) { s.err = e.message; s.repo = repo; render(); }
  },
  syncstud: async () => {
    const s = V.sheet, repo = ($('#srepo') || {}).value || '', tok = ($('#stok') || {}).value || '', c = TBSync.conf();
    const r = repo || (c && c.repo), k = tok || (c && c.token); if (!r || !k) return;
    const btn = $('#sstud'); if (btn) { btn.disabled = true; btn.textContent = t('syncing'); }
    try { const o = await TBSync.studentCode(r, k); s.link = SITE + '#' + o.code; s.pub = !o.private; s.err = ''; s.repo = r; render(); }
    catch (e) { s.err = e.message; s.repo = r; render(); }
  },
  install: async () => { if (!instEv) return; instEv.prompt(); try { await instEv.userChoice; } catch (e) {} instEv = null; render(); }
};

/* ------------------------------------------------------------ arranque */
function back() {
  if (V.sheet && V.sheet.k !== 'welcome') { V.sheet = null; render(); return true; }
  if (V.sit != null) { V.sit = null; render(); return true; }
  if (V.tab !== 'today') { A.tab({ k: 'today' }); return true; }
  return false;
}
function boot() {
  refresh();
  const app = $('#app'); app.innerHTML = '<div id="base" style="display:contents"></div>';
  app.addEventListener('click', ev => {
    const a = ev.target.closest('[data-a]'); if (!a) return;
    if (a.classList.contains('ov') && ev.target.closest('[data-stop]')) return;
    const f = A[a.dataset.a]; if (f) f(a.dataset, a);
  });
  app.addEventListener('input', ev => { if (ev.target.id === 'q') { V.q = ev.target.value; const r = $('#wres'); if (r) r.innerHTML = wresHTML(); } });
  /* teclado y mouse (Samsung DeX, tablets con teclado, PC) */
  document.addEventListener('keydown', ev => {
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
    const tg = ev.target, typing = tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA' || tg.tagName === 'SELECT');
    if (ev.key === 'Escape') { back(); ev.preventDefault(); return; }
    if (typing) return;
    if (!V.sheet && /^[1-4]$/.test(ev.key)) { A.tab({ k: TABS[Number(ev.key) - 1] }); ev.preventDefault(); }
  });
  if (!S.cfg.ok) V.sheet = { k: 'welcome' };
  const hs = (location.hash || '').slice(1); if (TABS.indexOf(hs) >= 0) V.tab = hs;
  render();
  S.devs[S.dev] = { n: deviceName(), t: Date.now() }; store.set(S);
  if (!window.TBSync) return;
  TBSync.attach({
    get: () => S,
    set: n => { const before = JSON.stringify(S), ui = S.cfg.ui, ok = S.cfg.ok; S = norm(n); S.cfg.ui = ui; S.cfg.ok = ok || S.cfg.ok; if (JSON.stringify(S) === before) return; store.set(S); refresh(); bgRender(); },
    custom: list => { const k = JSON.stringify(list); if (k === lastCustom) return; lastCustom = k; CUSTOM = list || []; refresh(); bgRender(); },
    asks: list => { const k = JSON.stringify(list); if (k === lastAsks) return; lastAsks = k; ASKS = list || []; bgRender(); },
    media: () => bgRender(),
    device: () => deviceName(),
    status: () => {   // solo cambian el indicador y la tarjeta de sincronización: no se repinta la vista, así nunca se interrumpe el scroll
      const st = TBSync.state, sy = $('.chip.sy'); if (sy) { sy.classList.toggle('spin', !!st.running); sy.classList.toggle('err', !st.running && !!st.err && st.err !== 'offline'); }
      const sc = $('#synccard'); if (sc) { const d = document.createElement('div'); d.innerHTML = syncCard(); if (d.firstElementChild) sc.replaceWith(d.firstElementChild); }
      if (!$('.chip.sy') && TBSync.conf()) bgRender();
    }
  });
  /* enlace del tutor: https://…/Tico-Box/#TBX1.… conecta este dispositivo en un paso; el código se borra de la barra de direcciones */
  const code = TBSync.readCode(location.hash);
  if (code) {
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
    TBSync.connect(code.r, code.t, code.n).then(() => { render(); toast(S.cfg.ok ? t('linked') : T.es.linked + ' · ' + T.pl.linked); }, e => { V.sheet = { k: 'sync', err: e.message, repo: code.r }; render(); });
  }
}
let lastCustom = '', lastAsks = '';
function deviceName() { const u = navigator.userAgent; return /iPad/.test(u) || (/Macintosh/.test(u) && navigator.maxTouchPoints > 1) ? 'iPad' : /Android/.test(u) ? 'Android' : /Windows/.test(u) ? 'Windows' : /Mac/.test(u) ? 'Mac' : 'web'; }
window.__tb = { S: () => S, LG, V, A, E: () => E, SITS, byKey, hasVoice, ASKS: () => ASKS, render, T, bgRender };   // para las pruebas
boot();
})();
