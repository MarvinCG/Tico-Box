/* Tico Box · página del tutor (solo en español). Copiada y adaptada de la página de la profesora de Polski Box.
   ➕ Agregar      frases nuevas (polaco opcional), revisión con LanguageTool y la lista tica, emoji automático, foto opcional
   🎙️ Grabar      grabación en serie de lo que no tiene voz o quedó desactualizado; subida en cola, en segundo plano y con reintentos
   📚 Frases      filtros; por frase: editar, grabar, foto, ocultar y eliminar definitivamente
   💬 Preguntas   bandeja de «Pregunta al tutor»
   Todo se guarda en el repositorio privado de datos; la app de la estudiante lo recibe en la próxima sincronización. */
(function () {
'use strict';
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const KEY = 'ticobox.tutor', LTKEY = 'ticobox.ltok', API = 'https://api.github.com', CB = 5000, DEFAULT_REPO = 'MarvinCG/tico-box-data';
const REG = [['F', 'Formal'], ['N', 'Neutral'], ['I', 'Informal'], ['C', 'Coloquial']];
const regName = r => (REG.find(x => x[0] === r) || REG[1])[1];
const ERR = { token: 'GitHub rechazó el token. Revísalo o crea uno nuevo.', forbidden: 'El token no tiene permiso de escritura en el repositorio (Contents: lectura y escritura).', repo: 'No se encontró el repositorio. Revisa dueño/nombre y el acceso del token.', offline: 'Sin conexión. Inténtalo de nuevo.', conflict: 'Otro dispositivo guardó al mismo tiempo. Inténtalo de nuevo.' };
const errT = e => ERR[e.message] || ('Error: ' + e.message);

/* ---------------- conexión (separada de la app de la estudiante: tu dispositivo no se mezcla con su progreso) */
const b64e = s => btoa(unescape(encodeURIComponent(s)));
const b64d = s => decodeURIComponent(escape(atob(String(s).replace(/\s/g, ''))));
function readCode(s) {
  const m = String(s || '').match(/TBX1\.([A-Za-z0-9+/_-]+)/); if (!m) return null;
  try { let b = m[1].replace(/-/g, '+').replace(/_/g, '/'); while (b.length % 4) b += '='; const o = JSON.parse(b64d(b)); return o.r && o.t ? o : null; } catch (e) { return null; }
}
let C = (() => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } })();
function hdr() { return { Accept: 'application/vnd.github+json', Authorization: 'Bearer ' + C.t, 'X-GitHub-Api-Version': '2022-11-28' }; }
function ghErr(r) { return new Error(r.status === 401 ? 'token' : r.status === 403 ? 'forbidden' : r.status === 404 ? 'repo' : r.status === 409 || r.status === 422 ? 'conflict' : 'http' + r.status); }
const req = (path, opt) => fetch(`${API}/repos/${C.r}/contents/${path}`, Object.assign({ cache: 'no-store' }, opt)).catch(() => { throw new Error('offline'); });
const gget = path => req(`${path}?t=${Date.now()}`, { headers: hdr() });
async function getFile(path) {
  const r = await gget(path);
  if (r.status === 404) return { sha: null, data: null };
  if (!r.ok) throw ghErr(r);
  const j = await r.json(); return { sha: j.sha, data: JSON.parse(b64d(j.content)) };
}
async function putFile(path, data, sha, msg) {
  const body = { message: msg, content: b64e(JSON.stringify(data, null, 1)) }; if (sha) body.sha = sha;
  const r = await req(path, { method: 'PUT', headers: Object.assign({ 'Content-Type': 'application/json' }, hdr()), body: JSON.stringify(body) });
  if (!r.ok) throw ghErr(r);
}
async function getSha(path) { const r = await gget(path); if (r.status === 404) return null; if (!r.ok) throw ghErr(r); return (await r.json()).sha; }
async function getRaw(path) { const r = await gget(path); if (!r.ok) throw ghErr(r); return (await r.json()).content.replace(/\s/g, ''); }
async function putRaw(path, b64, sha, msg) {
  for (let k = 0; k < 2; k++) {
    const body = { message: msg, content: b64 }; if (sha) body.sha = sha;
    const r = await req(path, { method: 'PUT', headers: Object.assign({ 'Content-Type': 'application/json' }, hdr()), body: JSON.stringify(body) });
    if (r.ok) return (await r.json()).content.sha;
    if ((r.status === 409 || r.status === 422) && k === 0) { sha = await getSha(path); continue; }
    throw ghErr(r);
  }
}
async function delFile(path, sha, msg) {
  sha = sha || await getSha(path); if (!sha) return;
  const r = await req(path, { method: 'DELETE', headers: Object.assign({ 'Content-Type': 'application/json' }, hdr()), body: JSON.stringify({ message: msg, sha }) });
  if (!r.ok && r.status !== 404 && r.status !== 409) throw ghErr(r);
}
/** leer, modificar y escribir con reintentos: así la sincronización de la estudiante y el tutor nunca se pisan */
async function update(path, fn, msg, empty) {
  for (let k = 0; k < 4; k++) {
    const f = await getFile(path); const d = f.data || JSON.parse(JSON.stringify(empty));
    fn(d);
    try { await putFile(path, d, f.sha, msg); return d; } catch (e) { if (e.message !== 'conflict' || k === 3) throw e; }
  }
}

/* ---------------- datos */
const SITS = window.SITS || [], BASE = window.ENTRIES || [];
let WL = [], HID = {}, ED = {}, VI = {}, II = {}, QS = [];
async function loadAll() {
  const opt = p => getFile(p).catch(e => { if (e.message === 'repo') return { data: null }; throw e; });
  const [w, p, v, i, q] = await Promise.all([opt('words.json'), opt('progress.json'), opt('voice.json'), opt('img.json'), opt('asks.json')]);
  WL = (w.data && w.data.words) || []; HID = (p.data && p.data.hid) || {}; ED = (p.data && p.data.ed) || {};
  VI = (v.data && v.data.items) || {}; II = (i.data && i.data.items) || {}; QS = (q.data && q.data.items) || [];
}
const edOf = k => { const e = ED[k]; return e && !e.reset ? e : null; };
function overlay(x) {
  x.orig = { tx: x.tx, ne: x.ne, pl: x.pl, r: x.r, nc: x.nc, ej: x.ej };
  const e = edOf(x.key); if (!e) return x;
  ['tx', 'ne', 'pl', 'r', 'nc', 'ej'].forEach(k => { if (k in e && e[k] != null) x[k] = e[k]; });
  x.ed = e.by || 't'; if (e.plOk) x.plOk = 1;
  return x;
}
const sitName = s => s < 0 ? 'Del tutor' : (SITS[s] ? SITS[s].es : '');
/** todo lo que se puede grabar: frases publicadas, frases del tutor y líneas de diálogo */
function items() {
  const o = [];
  BASE.forEach(e => o.push({ key: e.vk, kind: 'e', tx: e.tx, ne: e.ne, pl: e.pl, r: e.r, nc: e.nc || '', ej: e.ej || '', s: e.s, p: e.p }));
  WL.forEach((w, k) => { if (!w || w.del) return; const s = SITS.findIndex(x => x.k === w.s); o.push({ key: 't' + k, kind: 't', tx: w.tx, ne: w.ne || '', pl: w.pl || '', r: w.r || 'N', nc: w.nc || '', ej: w.ej || '', s, em: w.em }); });
  SITS.forEach((s, k) => s.dl.forEach(l => o.push({ key: l.vk, kind: 'd', tx: l.tx, ne: l.ne, pl: l.pl, s: k, who: l.w })));
  return o.filter(x => !isDel(x.key)).map(overlay);
}
const isHid = k => !!(HID[k] && HID[k].h), isDel = k => !!(HID[k] && HID[k].h && HID[k].x);
const vState = x => { const v = VI[x.key]; return !v ? 'none' : v.tx === x.tx ? 'ok' : 'old'; };   // sin voz · al día · desactualizada
const plRev = x => x.kind !== 'd' && (!x.pl || !x.plOk);
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\p{L}\p{N} ]/gu, ' ').replace(/\s+/g, ' ').trim();

/* ---------------- emoji automático: palabras de las frases publicadas → su emoji */
const toEmoji = p => { try { return String.fromCodePoint(...p.split('-').map(h => parseInt(h, 16))); } catch (e) { return ''; } };
const EMAP = (() => {
  const m = {}, stop = /^(el|la|los|las|un|una|unos|unas|de|del|que|por|con|para|muy|mas|se|lo|le|me|te|su|al|es|en|y|o|a|ya)$/;
  BASE.forEach(e => { if (!e.p) return; const em = toEmoji(e.p); norm(e.tx + ' ' + e.ne).split(' ').forEach(k => { if (k.length > 2 && !stop.test(k)) (m[k] = m[k] || []).push(em); }); });
  return m;
})();
function autoEmoji(txt) {
  const score = {}; norm(txt).split(' ').forEach(k => (EMAP[k] || []).forEach((e, j) => { score[e] = (score[e] || 0) + 1 / (1 + j * 0.2); }));
  return Object.keys(score).sort((a, b) => score[b] - score[a])[0] || '📝';
}

/* ---------------- LanguageTool en español + lista tica de palabras permitidas
   https://dev.languagetool.org/public-http-api — la jerga tica sale como error; la lista local la deja pasar.
   La lista arranca con las palabras de todas las frases aprobadas y crece con cada frase que agregas o editas. */
let LTOK = new Set();
function ltInit() {
  try { JSON.parse(localStorage.getItem(LTKEY) || '[]').forEach(w => LTOK.add(w)); } catch (e) {}
  items().forEach(x => norm(x.tx).split(' ').forEach(w => w && LTOK.add(w)));
}
function ltLearn(txt) { norm(txt).split(' ').forEach(w => w && LTOK.add(w)); try { localStorage.setItem(LTKEY, JSON.stringify([...LTOK].filter(w => !BASE.some(e => norm(e.tx).split(' ').includes(w))).slice(-3000))); } catch (e) {} }
async function languageTool(text) {
  const r = await fetch('https://api.languagetool.org/v2/check', { method: 'POST', body: new URLSearchParams({ text, language: 'es' }), headers: { Accept: 'application/json' } });
  if (!r.ok) throw new Error('LanguageTool ' + r.status);
  const m = (await r.json()).matches || [];
  return m.filter(x => { const w = norm(text.slice(x.offset, x.offset + x.length)); return !(w && w.split(' ').every(p => LTOK.has(p))); });
}
function ltHTML(ms, field) {
  if (ms === null) return `<div class="issue">No se pudo revisar la ortografía ahora. Puedes guardar igual.</div>`;
  if (!ms.length) return `<div class="issue ok"><b>✓ Ortografía y gramática: sin errores.</b></div>`;
  return ms.map((m, j) => {
    const c = m.context || {}, txt = c.text || '', o = c.offset || 0, n = c.length || 0;
    return `<div class="issue"><b>${esc(m.message)}</b><div class="ctx">${esc(txt.slice(0, o))}<mark>${esc(txt.slice(o, o + n))}</mark>${esc(txt.slice(o + n))}</div>${(m.replacements || []).slice(0, 5).map((r, q) => `<button class="sug" data-a="ltfix" data-f="${field}" data-j="${j}" data-q="${q}">${esc(r.value)}</button>`).join('')}<button class="sug" data-a="ltok" data-w="${esc(txt.slice(o, o + n))}">✓ Es tico, permitir</button></div>`;
  }).join('');
}

/* ---------------- fotos: de la galería → JPEG, lado mayor 720 px, calidad 0.82 */
async function photoFromFile(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => bad(new Error('img')); i.src = url; });
    const M = 720, sc = Math.min(1, M / Math.max(img.naturalWidth, img.naturalHeight));
    const cv = document.createElement('canvas'); cv.width = Math.round(img.naturalWidth * sc); cv.height = Math.round(img.naturalHeight * sc);
    const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height); g.drawImage(img, 0, 0, cv.width, cv.height);
    const data = cv.toDataURL('image/jpeg', 0.82);
    return { b64: data.split(',')[1], url: data };
  } finally { URL.revokeObjectURL(url); }
}
/* guardar / quitar un medio y su índice (voice.json o img.json). Cada grabación guarda el texto que se grabó (tx). */
async function saveMedia(kind, k, b64, tx) {
  const idx = kind === 'voice' ? VI : II, ext = kind === 'voice' ? 'mp3' : 'jpg';
  const sha = await putRaw(`${kind}/${k}.${ext}`, b64, idx[k] && idx[k].sha, `${kind === 'voice' ? 'voz' : 'foto'}: ${k}`);
  const d = await update(kind + '.json', x => { x.items = x.items || {}; x.items[k] = kind === 'voice' ? { at: Date.now(), sha, tx } : { at: Date.now(), sha }; }, `índice ${kind}: ${k}`, { v: 1, items: {} });
  if (kind === 'voice') VI = d.items; else II = d.items;
}
async function delMedia(kind, k) {
  const idx = kind === 'voice' ? VI : II, ext = kind === 'voice' ? 'mp3' : 'jpg';
  await delFile(`${kind}/${k}.${ext}`, idx[k] && idx[k].sha, `quitar ${kind}: ${k}`);
  const d = await update(kind + '.json', x => { x.items = x.items || {}; delete x.items[k]; }, `índice ${kind}: quitar ${k}`, { v: 1, items: {} });
  if (kind === 'voice') VI = d.items; else II = d.items;
}
/* ocultos y ediciones viven en progress.json, compartidos con la app de la estudiante (gana el último cambio) */
async function setHidden(k, h, x) {
  const v = { h, t: Date.now(), by: 't' }; if (x) v.x = true;
  const d = await update('progress.json', p => { p.hid = p.hid || {}; p.hid[k] = v; }, `tutor: ${x ? 'eliminar' : h ? 'ocultar' : 'mostrar'} ${k}`, {});
  HID = d.hid || {}; ED = d.ed || ED;
}
async function setEdit(k, v) {
  v.t = Date.now(); v.by = 't';
  const d = await update('progress.json', p => { p.ed = p.ed || {}; p.ed[k] = v; }, `tutor: editar ${k}`, {});
  ED = d.ed || {}; HID = d.hid || HID;
}

/* ---------------- cola de subida de grabaciones: en segundo plano y con reintentos, para no frenar la sesión */
const UP = [];   // { key, b64, tx, tries, err }
let upBusy = false;
function upQueue(key, b64, tx) { const old = UP.findIndex(u => u.key === key); if (old >= 0) UP.splice(old, 1); UP.push({ key, b64, tx, tries: 0 }); upDraw(); upRun(); }
async function upRun() {
  if (upBusy) return; upBusy = true;
  try {
    while (UP.length) {
      const u = UP.find(x => !x.err || x.retryAt <= Date.now()); if (!u) break;
      try { await saveMedia('voice', u.key, u.b64, u.tx); UP.splice(UP.indexOf(u), 1); AUD[u.key] = 'data:audio/mpeg;base64,' + u.b64; }
      catch (e) { u.tries++; u.err = e.message; u.retryAt = Date.now() + Math.min(30000, 2000 * 2 ** u.tries); if (u.tries >= 5) { upDraw(); break; } }
      upDraw(); if (TAB !== 'serie') softRender(); else srCount();   // en la serie solo cambia el contador: no se interrumpe la grabación
    }
  } finally { upBusy = false; upDraw(); if (TAB === 'serie') srCount(); }
  const next = UP.filter(u => u.err && u.tries < 5).map(u => u.retryAt)[0]; if (next) setTimeout(upRun, Math.max(500, next - Date.now()));
}
function upDraw() {
  const b = $('#upbox'); if (!b) return;
  const bad = UP.filter(u => u.tries >= 5).length;
  b.innerHTML = !UP.length ? '' : `<div class="up ${bad ? 'err' : ''}">${bad ? `⚠️ ${bad} sin subir (${esc(ERR[UP[0].err] || UP[0].err)}) <button class="sug" data-a="upretry">Reintentar</button>` : `⬆️ Subiendo ${UP.length}…`}</div>`;
}
window.addEventListener('beforeunload', e => { if (UP.length) { e.preventDefault(); e.returnValue = ''; } });

/* ---------------- piezas comunes */
function toast(msg) { const e = document.createElement('div'); e.textContent = msg; e.style.cssText = 'position:fixed;left:50%;bottom:30px;transform:translateX(-50%);background:#14244a;color:#fff;padding:10px 18px;border-radius:99px;z-index:99;font-weight:600;max-width:90vw;text-align:center'; document.body.appendChild(e); setTimeout(() => e.remove(), 2600); }
let AUDIO = null; function playUrl(u) { try { if (AUDIO) AUDIO.pause(); AUDIO = new Audio(u); AUDIO.play().catch(() => {}); } catch (e) {} }
const AUD = {}, PHO = {};   // clave → data URL de grabaciones y fotos ya descargadas
let TAB = 'add';
const counts = () => { const it = items(); return { all: it.length, ok: it.filter(x => vState(x) === 'ok').length, q: QS.filter(q => !q.a).length }; };

/* ---------------- grabación (panel compartido por «Grabar en serie» y «Frases») */
let REC = { st: 'idle', prev: null, msg: '' };   // st: idle · rec · proc
function recPanel(x, serial) {
  const mic = !!(window.TBRec && TBRec.supported()), rn = REC.st === 'rec', vs = vState(x);
  if (!mic) return `<div class="fb bad small">Este navegador no puede grabar. Usa Chrome, Edge o Safari actualizados, con permiso de micrófono.</div>`;
  return `${vs === 'old' ? `<div class="fb warn small">⚠️ El texto cambió después de tu grabación: la app la ignora hasta que la grabes de nuevo.</div>` : ''}
    <div class="lvl mt"><i id="lvl"></i></div>
    <div class="rbtns mt">
      <button class="btn ${rn ? 'bad' : ''} recb" data-a="vrec" ${REC.st === 'proc' ? 'disabled' : ''}>${rn ? '⏹ Detener' : '🎙️ Grabar'}</button>
      ${REC.prev || VI[x.key] ? `<button class="btn s sm" data-a="vplay" ${rn ? 'disabled' : ''}>▶ Escuchar</button>` : '<span></span>'}
      ${serial ? `<button class="btn g sm" data-a="snext" ${rn ? 'disabled' : ''}>Saltar ›</button>` : '<span></span>'}
    </div>
    ${REC.msg ? `<div class="small mt" style="font-weight:700">${esc(REC.msg)}</div>` : ''}
    ${REC.prev ? `<div class="btns two mt"><button class="btn" data-a="vsave" id="vsave">✓ ${serial ? 'Guardar y siguiente' : 'Guardar'}</button><button class="btn g" data-a="vredo">↻ Repetir</button></div>` : ''}
    ${!serial && VI[x.key] && !REC.prev ? `<button class="btn g sm mt" data-a="vdel">${delQ === 'v' ? '¿Borrar tu grabación? Toca otra vez' : '🗑 Borrar grabación'}</button>` : ''}
    <div class="small mt kbh">Teclado: Espacio grabar/detener · Enter guardar · P escuchar${serial ? ' · → saltar' : ''}</div>`;
}
const lvlCb = lv => { const e = document.getElementById('lvl'); if (e) e.style.width = Math.min(100, Math.round(lv * 140)) + '%'; };

/* ================================================================ ➕ Agregar */
const F = { tx: '', ne: '', pl: '', r: 'C', s: '', nc: '', ej: '', em: '' };
let FLT = [], FPHOTO = null, lastAdded = null;
function readF() { ['tx', 'ne', 'pl', 'nc', 'ej', 'em'].forEach(k => { const e = $('#f_' + k); if (e) F[k] = e.value; }); const s = $('#f_s'); if (s) F.s = s.value; }
function addHTML() {
  const dup = F.tx.trim() && items().find(x => norm(x.tx) === norm(F.tx));
  return `${lastAdded ? `<button class="btn s" style="margin-bottom:14px" data-a="recnew">🎙️ Grabar ahora «${esc(lastAdded.tx)}»</button>` : ''}
  <div class="tgrid"><div><div class="card"><h2>Agregar una frase</h2><p class="gl" style="margin:0">Aparece en la app de ella como frase nueva en la próxima sincronización.</p>
    <label for="f_tx">Texto tico</label><input class="field big-in" id="f_tx" value="${esc(F.tx)}" autocomplete="off" spellcheck="true" placeholder="p. ej. ¿Me regala un cafecito?">
    <label for="f_ne">Equivalente neutro</label><input class="field" id="f_ne" value="${esc(F.ne)}" autocomplete="off" placeholder="p. ej. ¿Me da un café, por favor?">
    <label for="f_pl">Polaco (opcional)</label><input class="field" id="f_pl" lang="pl" value="${esc(F.pl)}" autocomplete="off">
    <div class="small">Si lo dejas vacío, queda «polaco pendiente»: Claude lo propone en la próxima actualización y ella lo revisa.</div>
    <label>Registro</label><div class="seg r">${REG.map(([v, l]) => `<button class="${F.r === v ? 'on' : ''}" data-a="freg" data-v="${v}">${l}</button>`).join('')}</div>
    <label for="f_s">Situación</label><select class="field" id="f_s"><option value="">De tu tutor (sin situación)</option>${SITS.map(s => `<option value="${esc(s.k)}" ${F.s === s.k ? 'selected' : ''}>${esc(s.es)}</option>`).join('')}</select>
    <label for="f_ej">Ejemplo en contexto (opcional)</label><input class="field" id="f_ej" value="${esc(F.ej)}" autocomplete="off">
    <label for="f_nc">Nota cultural (opcional)</label><textarea class="field" id="f_nc">${esc(F.nc)}</textarea>
    <label for="f_em">Emoji</label><div style="display:flex;gap:10px;align-items:center"><input class="field" id="f_em" value="${esc(F.em)}" maxlength="16" autocomplete="off" style="width:80px;text-align:center;font-size:26px"><span class="small">Se asigna solo al revisar; puedes cambiarlo.</span></div>
    <label>Foto (opcional, en lugar del emoji)</label>
    <div class="phrow">${FPHOTO ? `<img class="thumb" src="${FPHOTO.url}" alt=""><button class="btn g sm" style="width:auto" data-a="fphotodel">✕ Quitar</button>` : `<label class="btn s sm filebtn">📷 Elegir de la galería<input type="file" accept="image/*" id="fphoto" hidden></label>`}</div>
    <div class="btns two mt2"><button class="btn s" data-a="fcheck" id="fcheck">🔎 Revisar</button><button class="btn" data-a="fadd" id="fadd">➕ Agregar</button></div>
  </div></div>
  <div><div class="card"><h2>Revisión</h2><div id="fres">${dup ? `<div class="issue bad"><b>⚠️ Ya existe:</b>${esc(dup.tx)} — ${esc(dup.ne)}</div>` : ''}${FLT.length || FLT === null ? ltHTML(FLT, 'f_tx') : '<div class="small">Toca «Revisar» para la ortografía (LanguageTool, con la lista tica de palabras permitidas) y para ver si ya existe.</div>'}</div></div>
  <div class="card"><h2>Tus frases (${WL.filter(w => w && !w.del).length})</h2>${WL.map((w, k) => ({ w, k })).filter(o => o.w && !o.w.del && !isDel('t' + o.k)).reverse().map(({ w, k }) => `<div class="wrow"><div class="pic sm"><span class="emo">${esc(w.em || '📝')}</span></div><div class="t"><b>${esc(w.tx)}</b><span class="gl">${esc(w.ne)} · ${esc(w.pl || 'polaco pendiente')}</span></div><span class="bdg">${VI['t' + k] ? '🎙️' : ''}${II['t' + k] ? '🖼️' : ''}${isHid('t' + k) ? '🚫' : ''}</span></div>`).join('') || '<div class="empty">Todavía no agregaste frases.</div>'}</div></div></div>`;
}

/* ================================================================ 🎙️ Grabar en serie */
const SR = { sit: 'all', cur: null };
function srCountTxt() { const all = serialList(), done = all.filter(x => vState(x) === 'ok').length; return `${done} de ${all.length} grabadas${UP.length ? ` · ⬆️ ${UP.length} subiendo` : ''}`; }
function srCount() { const e = $('#srcount'); if (e) e.textContent = srCountTxt(); }
function serialList() { return items().filter(x => !isHid(x.key) && (SR.sit === 'all' || String(x.s) === SR.sit)); }
function serialHTML() {
  const all = serialList(), done = all.filter(x => vState(x) === 'ok').length, todo = all.filter(x => vState(x) !== 'ok' && !UP.some(u => u.key === x.key));
  if (SR.cur && !todo.find(x => x.key === SR.cur)) SR.cur = null;
  const x = todo.find(y => y.key === SR.cur) || todo[0]; SR.cur = x ? x.key : null;
  return `<div class="card"><h2>Grabar en serie</h2><p class="gl" style="margin:0 0 10px">Recorre lo que no tiene tu voz o quedó desactualizado: ver el texto → grabar → escuchar → guardar o repetir → siguiente. Las grabaciones suben en segundo plano.</p>
    <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><select class="field" id="srsit" style="width:auto;flex:1;min-width:200px"><option value="all">Todas las situaciones</option>${SITS.map((s, k) => `<option value="${k}" ${SR.sit === String(k) ? 'selected' : ''}>${esc(s.es)}</option>`).join('')}<option value="-1" ${SR.sit === '-1' ? 'selected' : ''}>Del tutor</option></select>
    <b id="srcount">${srCountTxt()}</b></div>
    <div class="lvl mt" style="height:6px"><i style="width:${all.length ? Math.round(100 * done / all.length) : 0}%;background:var(--co)"></i></div></div>
  ${x ? `<div class="card recc"><div class="small">${esc(sitName(x.s))}${x.who ? ' · diálogo · ' + esc(x.who) : ''}${vState(x) === 'old' ? ' · desactualizada' : ''}</div>
    <div class="serial-tx">${esc(x.tx)}</div><div class="gl">${esc(x.ne)}</div>
    ${recPanel(x, true)}</div>` : `<div class="card"><div class="empty">🎉 ¡Todo grabado en esta lista!</div></div>`}`;
}

/* ================================================================ 📚 Frases */
const WF = { kind: 'e', filter: 'all', q: '', cur: null };
let delQ = null, EDT = null, PPREV = null;
const FILTERS = [['all', 'Todas'], ['novoice', 'Sin voz'], ['old', 'Desactualizada'], ['nophoto', 'Sin foto'], ['hidden', 'Ocultas'], ['plrev', 'Polaco por revisar']];
function wList() {
  const q = norm(WF.q), f = WF.filter;
  return items().filter(x => x.kind === WF.kind || (WF.kind === 'e' && x.kind === 't')).filter(x => (!q || norm(x.tx + ' ' + x.ne + ' ' + x.pl).includes(q)) &&
    (f === 'all' ? true : f === 'novoice' ? vState(x) === 'none' : f === 'old' ? vState(x) === 'old' : f === 'nophoto' ? (x.kind !== 'd' && !II[x.key]) : f === 'hidden' ? isHid(x.key) : f === 'plrev' ? plRev(x) : true));
}
function picOf(x) {
  if (PPREV && WF.cur === x.key) return `<div class="pic md photo"><img src="${PPREV.url}" alt=""></div>`;
  if (II[x.key] && PHO[x.key]) return `<div class="pic md photo"><img src="${PHO[x.key]}" alt=""></div>`;
  if (x.em) return `<div class="pic md"><span class="emo">${esc(x.em)}</span></div>`;
  return x.p ? `<div class="pic md"><img src="e/${x.p}.svg" alt=""></div>` : '';
}
function wordsHTML() {
  const list = wList();
  let x = WF.cur && items().find(y => y.key === WF.cur); if (!x) { x = list[0] || null; WF.cur = x ? x.key : null; }
  if (x && II[x.key] && !PHO[x.key]) loadPhoto(x.key);
  let card = '';
  if (x) {
    const hid = isHid(x.key), word = x.kind !== 'd';
    card = `<div class="card recc ${hid ? 'hidc' : ''}"><div class="small">${esc(sitName(x.s))}${x.who ? ' · diálogo · ' + esc(x.who) : ''} · <code>${esc(x.key)}</code></div>
      <div class="whead" style="display:flex;gap:14px;align-items:center;margin-top:10px">${word ? picOf(x) : ''}<div style="min-width:0"><div style="font-size:clamp(22px,4vw,30px);font-weight:800">${esc(x.tx)}</div><div class="gl">${esc(x.ne)}</div><div class="gl">🇵🇱 ${esc(x.pl || 'polaco pendiente')}${plRev(x) && x.pl ? ' · <i>por revisar</i>' : ''}</div>${word ? `<div class="small">${regName(x.r)}</div>` : ''}</div></div>
      ${x.ed ? `<div class="small mt">✏️ editada ${x.ed === 's' ? 'por la estudiante' : 'por ti'} · original: <i>${esc(x.orig.tx)}</i>${x.orig.pl !== x.pl ? ` · polaco original: <i>${esc(x.orig.pl)}</i>` : ''}</div>` : ''}
      <h3 class="sec">✏️ Editar</h3>
      ${EDT ? `<label for="e_tx">Texto tico</label><input class="field" id="e_tx" value="${esc(EDT.tx)}" autocomplete="off" spellcheck="true">
        <label for="e_ne">Equivalente neutro</label><input class="field" id="e_ne" value="${esc(EDT.ne)}" autocomplete="off">
        <label for="e_pl">Polaco</label><input class="field" id="e_pl" lang="pl" value="${esc(EDT.pl)}" autocomplete="off">
        ${word ? `<label>Registro</label><div class="seg r">${REG.map(([v, l]) => `<button class="${EDT.r === v ? 'on' : ''}" data-a="ereg" data-v="${v}">${l}</button>`).join('')}</div>
        <label for="e_ej">Ejemplo</label><input class="field" id="e_ej" value="${esc(EDT.ej)}" autocomplete="off">
        <label for="e_nc">Nota cultural</label><textarea class="field" id="e_nc">${esc(EDT.nc)}</textarea>` : ''}
        <div id="eres">${EDT.res || ''}</div>
        <div class="btns two mt"><button class="btn s sm" data-a="echeck" id="echeck">🔎 Revisar</button><button class="btn sm" data-a="esave" id="esave">✓ Guardar</button></div>
        <div class="btns two mt">${x.ed ? `<button class="btn g sm" data-a="ereset">↩️ Volver al original</button>` : '<span></span>'}<button class="btn g sm" data-a="ecancel">Cancelar</button></div>
        <div class="small mt">Si cambias el texto tico, tu grabación queda desactualizada y la app la ignora hasta que la grabes de nuevo.</div>`
      : `<button class="btn s sm" data-a="eopen">✏️ Editar textos</button>`}
      <h3 class="sec">🎙️ Tu voz ${vState(x) === 'ok' ? '✓' : vState(x) === 'old' ? '⚠️' : ''}</h3>${recPanel(x, false)}
      ${word ? `<h3 class="sec">🖼️ Foto ${II[x.key] ? '✓' : ''}</h3>
      ${PPREV ? `<div class="btns two"><button class="btn" data-a="psave" id="psave">✓ Guardar foto</button><button class="btn g" data-a="pcancel">Cancelar</button></div>`
        : `<div class="btns two"><label class="btn s sm filebtn">📷 ${II[x.key] ? 'Cambiar foto' : 'Elegir de la galería'}<input type="file" accept="image/*" id="wphoto" hidden></label>${II[x.key] ? `<button class="btn g sm" data-a="pdel">${delQ === 'p' ? '¿Quitar la foto? Toca otra vez' : '🗑 Quitar foto'}</button>` : '<span></span>'}</div>`}` : ''}
      <h3 class="sec">🚫 Ocultar</h3>
      ${hid ? `<div class="fb warn small">${HID[x.key].by === 's' ? 'La estudiante la ocultó.' : 'La ocultaste.'}</div><button class="btn s sm mt" data-a="unhide">↩️ Volver a mostrar</button>`
        : `<p class="small" style="margin:0 0 8px">Deja de aparecer en la app de ella. Se puede volver a mostrar.</p><button class="btn g sm" data-a="hide">🚫 Ocultar</button>`}
      <h3 class="sec">🗑 Eliminar definitivamente</h3><p class="small" style="margin:0 0 8px">Desaparece para los dos, junto con tu voz y tu foto. No se puede recuperar. (El ID queda reservado.)</p>
      <button class="btn g sm" data-a="delx">${delQ === 'x' ? '⚠️ ¿Seguro? Toca otra vez' : '🗑 Eliminar definitivamente'}</button></div>`;
  } else card = `<div class="card"><div class="empty">No hay nada en esta lista.</div></div>`;
  const rows = list.slice(0, 500).map(y => `<button class="wrow ${y.key === WF.cur ? 'sel' : ''} ${isHid(y.key) ? 'dim' : ''}" data-a="wsel" data-k="${esc(y.key)}"><div class="t"><b>${esc(y.tx)}</b><span class="gl">${esc(y.ne)}</span></div><span class="bdg">${vState(y) === 'ok' ? '🎙️' : vState(y) === 'old' ? '⚠️' : ''}${II[y.key] ? '🖼️' : ''}${isHid(y.key) ? '🚫' : ''}${plRev(y) ? '🇵🇱' : ''}</span></button>`).join('');
  return `<div class="tgrid"><div>${card}</div><div><div class="card">
    <div class="seg">${[['e', 'Frases'], ['d', 'Diálogos']].map(([v, l]) => `<button class="${WF.kind === v ? 'on' : ''}" data-a="wkind" data-v="${v}">${l}</button>`).join('')}</div>
    <div style="display:flex;gap:10px;align-items:center;margin-top:10px;flex-wrap:wrap"><input class="field" id="wq" placeholder="Buscar…" value="${esc(WF.q)}" autocomplete="off" style="flex:1;min-width:160px">
    <select class="field" id="wfilter" style="width:auto">${FILTERS.map(([v, l]) => `<option value="${v}" ${WF.filter === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
    <div class="small mt">${list.length} en la lista · 🎙️ con voz · ⚠️ desactualizada · 🖼️ foto · 🚫 oculta · 🇵🇱 polaco por revisar</div>
    <div class="vlist mt">${rows || '<div class="empty">Nada.</div>'}</div></div></div></div>`;
}
async function loadPhoto(k) { try { const b = await getRaw('img/' + k + '.jpg'); PHO[k] = 'data:image/jpeg;base64,' + b; softRender(); } catch (e) {} }

/* ================================================================ 💬 Preguntas */
function asksHTML() {
  const it = items(), byK = k => it.find(x => x.key === k);
  const list = QS.map((q, n) => ({ q, n })).sort((a, b) => (!!a.q.a - !!b.q.a) || (b.q.at - a.q.at));
  return `<div class="card"><h2>Preguntas de la estudiante</h2><p class="gl" style="margin:0">Lo que preguntó con «Pregunta al tutor». Tu respuesta le aparece en la ficha de la frase y en Progreso.</p></div>
  <div class="card">${list.map(({ q, n }) => { const x = byK(q.k); return `<div class="q-item"><div class="small">${new Date(q.at).toLocaleString('es-CR')}${q.dev ? ' · ' + esc(q.dev) : ''}</div>
    ${x ? `<button class="linkbtn" data-a="qopen" data-k="${esc(q.k)}"><b>${esc(x.tx)}</b></button> <span class="gl">${esc(x.ne)}</span>` : `<code>${esc(q.k)}</code>`}
    <div style="margin:6px 0;font-size:17px">❓ ${esc(q.q)}</div>
    <textarea class="field" id="qa${n}" placeholder="Tu respuesta…">${esc(q.a || '')}</textarea>
    <button class="btn ${q.a ? 's' : ''} sm mt" style="width:auto" data-a="qsend" data-n="${n}" data-id="${esc(q.id)}">${q.a ? '✓ Actualizar respuesta' : '➤ Responder'}</button></div>`; }).join('') || '<div class="empty">Todavía no hay preguntas.</div>'}</div>`;
}

/* ================================================================ acciones */
const ACT = {
  async connect() {
    const code = readCode(($('#ccode') || {}).value), repo = code ? code.r : (($('#crepo') || {}).value || '').trim().replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, ''), tok = code ? code.t : (($('#ctok') || {}).value || '').trim();
    if (!repo || !tok) return;
    C = { r: repo, t: tok };
    const b = $('#cgo'); if (b) { b.disabled = true; b.textContent = 'Conectando…'; }
    try {
      const r = await fetch(`${API}/repos/${C.r}`, { headers: hdr() }).catch(() => { throw new Error('offline'); }); if (!r.ok) throw ghErr(r);
      localStorage.setItem(KEY, JSON.stringify(C)); boot();
    } catch (e) { C = null; render(); $('#cerr').innerHTML = `<div class="fb bad mt small">${esc(errT(e))}</div>`; }
  },
  out() { C = null; try { localStorage.removeItem(KEY); } catch (e) {} render(); },
  async reload() { try { await loadAll(); render(); toast('Actualizado.'); } catch (e) { toast(errT(e)); } },
  tab(d) { readF(); stopRec(); TAB = d.v; REC = { st: 'idle', prev: null, msg: '' }; delQ = null; render(); window.scrollTo(0, 0); },
  /* agregar */
  freg(d) { readF(); F.r = d.v; render(); },
  fphotodel() { readF(); FPHOTO = null; render(); },
  async fcheck() {
    readF(); if (!F.tx.trim()) return toast('Escribe primero el texto tico.');
    const b = $('#fcheck'); b.disabled = true; b.textContent = 'Revisando…';
    FLT = await languageTool(F.tx).catch(() => null);
    if (!F.em) F.em = autoEmoji(F.tx + ' ' + F.ne);
    render();
  },
  ltfix(d) {
    const fld = d.f, src = fld === 'f_tx' ? FLT : EDT && EDT.lt, m = src && src[Number(d.j)]; if (!m) return;
    const e = $('#' + (fld === 'f_tx' ? 'f_tx' : 'e_tx')); const v = e.value; e.value = v.slice(0, m.offset) + m.replacements[Number(d.q)].value + v.slice(m.offset + m.length);
    if (fld === 'f_tx') ACT.fcheck(); else ACT.echeck();
  },
  ltok(d) { ltLearn(d.w); toast(`«${d.w}» queda en la lista tica.`); if (TAB === 'add') ACT.fcheck(); else ACT.echeck(); },
  async fadd() {
    readF(); const tx = F.tx.trim().replace(/\s+/g, ' ');
    if (!tx) return toast('Escribe el texto tico.'); if (!F.ne.trim()) return toast('Falta el equivalente neutro.');
    const b = $('#fadd'); b.disabled = true; b.textContent = 'Guardando…';
    const w = { tx, ne: F.ne.trim(), pl: F.pl.trim(), r: F.r, em: F.em.trim() || autoEmoji(tx + ' ' + F.ne), at: Date.now() };
    if (F.s) w.s = F.s; if (F.nc.trim()) w.nc = F.nc.trim(); if (F.ej.trim()) w.ej = F.ej.trim();
    try {
      let k = -1;
      const d = await update('words.json', x => { x.words = x.words || []; x.words.push(w); k = x.words.length - 1; }, `tutor: ${tx}`, { v: 1, words: [] });
      WL = d.words; ltLearn(tx);
      if (FPHOTO) { try { await saveMedia('img', 't' + k, FPHOTO.b64); PHO['t' + k] = FPHOTO.url; } catch (er) { toast(errT(er)); } }
      lastAdded = { key: 't' + k, tx }; Object.assign(F, { tx: '', ne: '', pl: '', nc: '', ej: '', em: '' }); FLT = []; FPHOTO = null;
      render(); toast('¡Agregada! Ella la verá al sincronizar.');
    } catch (er) { toast(errT(er)); b.disabled = false; b.textContent = '➕ Agregar'; }
  },
  recnew() { const k = lastAdded && lastAdded.key; lastAdded = null; TAB = 'words'; WF.kind = 'e'; WF.filter = 'all'; WF.cur = k; render(); window.scrollTo(0, 0); },
  /* grabar */
  async vrec() {
    const x = curItem(); if (!x) return;
    if (REC.st === 'rec') {
      REC.st = 'proc'; REC.msg = 'Procesando…'; softRender();
      try { const blob = await TBRec.stop(); REC.prev = await TBRec.toMp3(blob); REC.prev.key = x.key; REC.prev.tx = x.tx; REC.msg = ''; REC.st = 'idle'; softRender(); playUrl(REC.prev.url); }
      catch (e) { REC = { st: 'idle', prev: null, msg: e.message === 'silence' ? 'No se oyó nada. Acércate al micrófono y vuelve a grabar.' : String(e.message || e) }; softRender(); }
      return;
    }
    if (REC.st !== 'idle') return;
    try { REC = { st: 'rec', prev: null, msg: 'Grabando… toca Detener al terminar' }; softRender(); await TBRec.start(lvlCb, () => { if (REC.st === 'rec') ACT.vrec(); }); }
    catch (e) { REC = { st: 'idle', prev: null, msg: /denied|allowed|permission/i.test(e.name + e.message) ? 'Sin permiso para el micrófono. Actívalo en el navegador y vuelve a intentar.' : 'No se pudo usar el micrófono.' }; softRender(); }
  },
  vredo() { REC.prev = null; REC.msg = ''; ACT.vrec(); },
  async vplay() {
    const x = curItem(); if (!x) return; if (REC.prev) return playUrl(REC.prev.url);
    if (AUD[x.key]) return playUrl(AUD[x.key]);
    try { AUD[x.key] = 'data:audio/mpeg;base64,' + await getRaw('voice/' + x.key + '.mp3'); playUrl(AUD[x.key]); } catch (e) { toast(errT(e)); }
  },
  vsave() {
    const P0 = REC.prev; if (!P0) return;
    upQueue(P0.key, P0.b64, P0.tx); AUD[P0.key] = P0.url; REC = { st: 'idle', prev: null, msg: '' };
    if (TAB === 'serie') { SR.cur = null; } toast('Guardada ✓ (subiendo)'); render();
  },
  async vdel() {
    const x = curItem(); if (!x) return; if (delQ !== 'v') { delQ = 'v'; return softRender(); }
    delQ = null; try { await delMedia('voice', x.key); delete AUD[x.key]; toast('Grabación borrada.'); softRender(); } catch (e) { toast(errT(e)); }
  },
  snext() { const all = serialList().filter(x => vState(x) !== 'ok' && !UP.some(u => u.key === x.key)); const i = all.findIndex(x => x.key === SR.cur); SR.cur = (all[i + 1] || all[0] || {}).key || null; REC = { st: 'idle', prev: null, msg: '' }; render(); },
  upretry() { UP.forEach(u => { u.tries = 0; u.err = ''; u.retryAt = 0; }); upRun(); upDraw(); },
  /* frases */
  wkind(d) { WF.kind = d.v; WF.cur = null; EDT = null; PPREV = null; render(); },
  wsel(d) { if (REC.st === 'rec') return; WF.cur = d.k; EDT = null; PPREV = null; delQ = null; REC = { st: 'idle', prev: null, msg: '' }; softRender(); if (window.innerWidth < 900) window.scrollTo({ top: 0, behavior: 'smooth' }); },
  eopen() { const x = curItem(); if (!x) return; EDT = { tx: x.tx, ne: x.ne || '', pl: x.pl || '', r: x.r || 'N', nc: x.nc || '', ej: x.ej || '' }; softRender(); },
  ecancel() { EDT = null; softRender(); },
  ereg(d) { eRead(); EDT.r = d.v; softRender(); },
  async echeck() {
    eRead(); const b = $('#echeck'); if (b) { b.disabled = true; b.textContent = 'Revisando…'; }
    EDT.lt = await languageTool(EDT.tx).catch(() => null); EDT.res = ltHTML(EDT.lt, 'e_tx'); softRender();
  },
  async esave() {
    const x = curItem(); if (!x || !EDT) return; eRead(); const tx = EDT.tx.trim().replace(/\s+/g, ' '); if (!tx) return toast('El texto tico no puede quedar vacío.');
    const b = $('#esave'); if (b) { b.disabled = true; b.textContent = 'Guardando…'; }
    const v = { tx, ne: EDT.ne.trim(), pl: EDT.pl.trim() }; if (x.kind !== 'd') { v.r = EDT.r; v.nc = EDT.nc.trim(); v.ej = EDT.ej.trim(); }
    if (v.pl && v.pl === x.pl && x.plOk) v.plOk = true;
    try { await setEdit(x.key, v); ltLearn(tx); EDT = null; toast('Cambios guardados.'); softRender(); } catch (e) { toast(errT(e)); if (b) { b.disabled = false; b.textContent = '✓ Guardar'; } }
  },
  async ereset() { const x = curItem(); if (!x) return; try { await setEdit(x.key, { reset: true }); EDT = null; toast('Se restauró el original.'); softRender(); } catch (e) { toast(errT(e)); } },
  pcancel() { PPREV = null; softRender(); },
  async psave() {
    const x = curItem(); if (!x || !PPREV) return; const P0 = PPREV, b = $('#psave'); if (b) { b.disabled = true; b.textContent = 'Guardando…'; }
    try { await saveMedia('img', x.key, P0.b64); PHO[x.key] = P0.url; PPREV = null; toast('Foto guardada ✓'); softRender(); } catch (e) { toast(errT(e)); if (b) b.disabled = false; }
  },
  async pdel() {
    const x = curItem(); if (!x) return; if (delQ !== 'p') { delQ = 'p'; return softRender(); }
    delQ = null; try { await delMedia('img', x.key); delete PHO[x.key]; toast('Foto quitada.'); softRender(); } catch (e) { toast(errT(e)); }
  },
  async hide() { const x = curItem(); if (!x) return; try { await setHidden(x.key, true); toast('Oculta.'); softRender(); } catch (e) { toast(errT(e)); } },
  async unhide() { const x = curItem(); if (!x) return; try { await setHidden(x.key, false); toast('Visible otra vez.'); softRender(); } catch (e) { toast(errT(e)); } },
  async delx() {
    const x = curItem(); if (!x) return; if (delQ !== 'x') { delQ = 'x'; return softRender(); }
    delQ = null; const k = x.key;
    try {
      await setHidden(k, true, true);
      if (x.kind === 't') { const n = Number(k.slice(1)); const r = await update('words.json', d => { if (d.words[n]) d.words[n].del = true; }, `tutor: eliminar ${k}`, { v: 1, words: [] }); WL = r.words; }
      if (VI[k]) await delMedia('voice', k).catch(() => {});
      if (II[k]) await delMedia('img', k).catch(() => {});
      WF.cur = null; toast('Eliminada.'); render();
    } catch (e) { toast(errT(e)); }
  },
  /* preguntas */
  qopen(d) { TAB = 'words'; const x = items().find(y => y.key === d.k); if (x) { WF.kind = x.kind === 'd' ? 'd' : 'e'; WF.filter = 'all'; WF.cur = x.key; } render(); window.scrollTo(0, 0); },
  async qsend(d) {
    const a = (($('#qa' + d.n) || {}).value || '').trim(); if (!a) return;
    try { const r = await update('asks.json', x => { const q = (x.items || []).find(y => y.id === d.id); if (q) { q.a = a; q.at2 = Date.now(); } }, 'tutor: respuesta', { v: 1, items: [] }); QS = r.items || []; toast('Respuesta enviada.'); render(); }
    catch (e) { toast(errT(e)); }
  }
};
function curItem() { const k = TAB === 'serie' ? SR.cur : WF.cur; return k ? items().find(x => x.key === k) || null : null; }
function eRead() { if (!EDT) return; ['tx', 'ne', 'pl', 'nc', 'ej'].forEach(k => { const e = $('#e_' + k); if (e) EDT[k] = e.value; }); }
function stopRec() { if (REC.st === 'rec' && window.TBRec) TBRec.stop(); }

/* ---------------- página */
function render() {
  const tw = $('#tw');
  if (!C) {
    tw.innerHTML = `<div class="card" style="max-width:560px;margin:20px auto"><h2>Conectar la página del tutor</h2>
      <p class="gl" style="margin:0 0 10px">Usa el mismo repositorio privado y un token fine-grained con <b>Contents: lectura y escritura</b> (<a href="https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens#creating-a-fine-grained-personal-access-token" target="_blank" rel="noopener">docs</a>). Este dispositivo no se conecta al progreso de la app.</p>
      <label for="crepo">Repositorio de datos</label><input class="field" id="crepo" value="${DEFAULT_REPO}" autocomplete="off" autocapitalize="off" spellcheck="false">
      <label for="ctok">Token</label><input class="field" id="ctok" type="password" placeholder="github_pat_…" autocomplete="off">
      <label for="ccode">…o pega un enlace o código TBX1.</label><input class="field" id="ccode" autocomplete="off">
      <button class="btn mt" data-a="connect" id="cgo">Conectar</button><div id="cerr"></div></div>`;
    return;
  }
  const c = counts();
  const tabs = [['add', '➕ Agregar'], ['serie', `🎙️ Grabar en serie`], ['words', '📚 Frases'], ['asks', `💬 Preguntas${c.q ? `<span class="n">${c.q}</span>` : ''}`]];
  const body = TAB === 'serie' ? serialHTML() : TAB === 'words' ? wordsHTML() : TAB === 'asks' ? asksHTML() : addHTML();
  tw.innerHTML = `<div class="tabs">${tabs.map(([v, l]) => `<button class="${TAB === v ? 'on' : ''}" data-a="tab" data-v="${v}">${l}</button>`).join('')}</div>${body}
    <div class="lt">🎙️ ${c.ok} de ${c.all} con tu voz · Revisión ortográfica por <a href="https://languagetool.org" target="_blank" rel="noopener">LanguageTool</a> · <button class="linkbtn" data-a="reload">⟳ Actualizar</button> · <a href="./">Abrir la app</a> · <button class="linkbtn" data-a="out">Desconectar</button></div>`;
  upDraw();
}
function softRender() { const y = window.scrollY, l = $('.vlist'), ly = l ? l.scrollTop : 0; render(); window.scrollTo(0, y); const l2 = $('.vlist'); if (l2 && ly) l2.scrollTop = ly; }
document.addEventListener('click', e => { const a = e.target.closest('[data-a]'); const f = a && ACT[a.dataset.a]; if (f) { e.preventDefault(); f(a.dataset, a); } });
document.addEventListener('input', e => {
  if (e.target.id === 'wq') { WF.q = e.target.value; const y = e.target.selectionStart; softRender(); const q = $('#wq'); if (q) { q.focus(); try { q.setSelectionRange(y, y); } catch (x) {} } }
});
document.addEventListener('change', async e => {
  const id = e.target.id;
  if (id === 'wfilter') { WF.filter = e.target.value; WF.cur = null; render(); }
  if (id === 'srsit') { SR.sit = e.target.value; SR.cur = null; render(); }
  if (id === 'fphoto' || id === 'wphoto') {
    const file = e.target.files && e.target.files[0]; if (!file) return;
    try { const p = await photoFromFile(file); if (id === 'fphoto') { readF(); FPHOTO = p; render(); } else { PPREV = p; softRender(); } } catch (er) { toast('No se pudo leer esa imagen.'); }
  }
});
document.addEventListener('keydown', e => {
  if (TAB !== 'serie' && TAB !== 'words') return;
  const tg = e.target; if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA' || tg.tagName === 'SELECT')) return;
  if (e.key === ' ') { e.preventDefault(); ACT.vrec(); }
  else if (e.key === 'Enter' && REC.prev) { e.preventDefault(); ACT.vsave(); }
  else if (e.key.toLowerCase() === 'p') ACT.vplay();
  else if (e.key === 'ArrowRight' && TAB === 'serie' && REC.st !== 'rec') ACT.snext();
});
async function boot() {
  const fromHash = readCode(location.hash);
  if (fromHash) { C = { r: fromHash.r, t: fromHash.t }; try { localStorage.setItem(KEY, JSON.stringify(C)); } catch (e) {} history.replaceState(null, '', location.pathname); }
  if (!C) return render();
  $('#tw').innerHTML = '<div class="empty">Cargando…</div>';
  try { await loadAll(); ltInit(); render(); }
  catch (e) { $('#tw').innerHTML = `<div class="card"><div class="fb bad">${esc(errT(e))}</div><button class="btn g sm mt" data-a="out">Desconectar</button></div>`; }
}
window.__tutor = { ACT, items, VI: () => VI, II: () => II, UP, QS: () => QS, LTOK: () => LTOK };   // para las pruebas
boot();
})();
