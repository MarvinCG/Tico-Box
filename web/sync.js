/* Tico Box — sincronización: guarda el progreso en un repositorio privado de GitHub
   (por defecto MarvinCG/tico-box-data) con la API de contenidos de GitHub.
   https://docs.github.com/en/rest/repos/contents
   No se envía nada a ningún otro lado. El token solo se guarda en este dispositivo.
   Copiado y adaptado de Polski Box (sync.js).
   Archivos del repo de datos:
     progress.json          progreso (tarjetas, registros, ocultos y ediciones) — se fusiona
     words.json             frases que agrega el tutor (IDs desde 5000; solo se agregan, las borradas se marcan)
     voice.json, voice/*.mp3  grabaciones del tutor (cada una guarda el texto que se grabó)
     img.json, img/*.jpg    fotos del tutor
     asks.json              preguntas de la estudiante («Pregunta al tutor») y respuestas */
(function () {
'use strict';
const KEY = 'ticobox.sync', LAST = 'ticobox.synclast', API = 'https://api.github.com';
const DEFAULT_REPO = 'MarvinCG/tico-box-data';

function sget(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function sset(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }

/* base64 para texto UTF-8 */
const b64e = s => btoa(unescape(encodeURIComponent(s)));
const b64d = s => decodeURIComponent(escape(atob(String(s).replace(/\s/g, ''))));

function http(method, url, headers, body) {
  return fetch(url, { method, headers, body: body || undefined, cache: 'no-store' })
    .then(r => r.text().then(text => ({ status: r.status, text })))
    .catch(e => ({ status: 0, text: String(e) }));
}

/* ---------------- configuración
   c = { repo, token, n }  — n: 'est' cuando este dispositivo es de la estudiante (enlace del tutor) */
function conf() { try { const c = JSON.parse(sget(KEY) || 'null'); return c && c.repo && c.token ? c : null; } catch (e) { return null; } }
function setConf(c) { sset(KEY, c ? JSON.stringify(c) : null); }
const cleanRepo = r => String(r || '').trim().replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '').replace(/\/$/, '');

/* Código de vinculación: lleva repo + token (y el rol) para conectar otro dispositivo en un paso.
   Va en el #hash del enlace, que el navegador nunca envía al servidor. */
const CODE = 'TBX1.';
function makeCode(c, extra) { return CODE + b64e(JSON.stringify(Object.assign({ r: c.repo, t: c.token }, extra || {}))).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_'); }
function readCode(s) {
  s = String(s || '').trim(); const m = s.match(/TBX1\.([A-Za-z0-9+/_-]+)/); if (!m) return null;
  try { let b = m[1].replace(/-/g, '+').replace(/_/g, '/'); while (b.length % 4) b += '='; const o = JSON.parse(b64d(b)); return o.r && o.t ? o : null; } catch (e) { return null; }
}

/* ---------------- API de contenidos de GitHub */
function gh(c, method, path, body) {
  const h = { Accept: 'application/vnd.github+json', Authorization: 'Bearer ' + c.token, 'X-GitHub-Api-Version': '2022-11-28' };
  if (body) h['Content-Type'] = 'application/json';
  return http(method, `${API}/repos/${c.repo}/contents/${path}`, h, body ? JSON.stringify(body) : '');
}
async function getFile(c, path) {
  const r = await gh(c, 'GET', path + '?t=' + Date.now());
  if (r.status === 404) return { sha: null, data: null };
  if (r.status !== 200) throw httpErr(r);
  const j = JSON.parse(r.text); return { sha: j.sha, data: JSON.parse(b64d(j.content)) };
}
async function putFile(c, path, data, sha, msg) {
  const body = { message: msg, content: b64e(JSON.stringify(data, null, 1)) }; if (sha) body.sha = sha;
  const r = await gh(c, 'PUT', path, body);
  if (r.status === 200 || r.status === 201) return JSON.parse(r.text).content.sha;
  throw httpErr(r);
}
function httpErr(r) {
  const e = new Error(r.status === 401 ? 'token' : r.status === 403 ? 'forbidden' : r.status === 404 ? 'repo' : r.status === 409 || r.status === 422 ? 'conflict' : r.status === 0 ? 'offline' : 'http' + r.status);
  e.status = r.status; return e;
}
/** Revisa que el token llegue al repositorio. Devuelve { private }. */
async function check(c) {
  const r = await http('GET', `${API}/repos/${c.repo}`, { Accept: 'application/vnd.github+json', Authorization: 'Bearer ' + c.token, 'X-GitHub-Api-Version': '2022-11-28' }, '');
  if (r.status !== 200) throw httpErr(r);
  return { private: !!JSON.parse(r.text).private };
}

/* ---------------- reglas de fusión (funciones puras; las prueba tools/test_f2.mjs)
   - Tarjetas: por entrada, gana la más nueva por timestamp (t).
   - Registros (logs): uno por dispositivo; el de cada dispositivo solo lo escribe ese dispositivo.
   - Ajustes sincronizados: gana el último que escribió (cfgT). El idioma de la interfaz es de cada dispositivo.
   - Ocultos y ediciones: por clave, gana el último cambio.
   - Borrar el progreso (resetAt) descarta las tarjetas anteriores en todos los dispositivos. */
const SYNC_CFG = [];   // ajustes que viajan entre dispositivos (ninguno por ahora; ui es por dispositivo)
const tOf = x => (x && x.t) || 0;
function mergeDay(x, y) { if (!x) return y; if (!y) return x; const o = Object.assign({}, x); for (const k in y) o[k] = Math.max(o[k] || 0, y[k] || 0); return o; }
function mergeLog(a, b) { const o = Object.assign({}, a || {}); for (const d in (b || {})) o[d] = mergeDay(o[d], b[d]); return o; }
function lastWins(a, b) { const o = Object.assign({}, a || {}); for (const k in (b || {})) if (!o[k] || tOf(b[k]) > tOf(o[k])) o[k] = b[k]; return o; }
/** local: estado S de la app. remote: contenido de progress.json (o null). Devuelve el nuevo estado local. */
function merge(local, remote) {
  const S = JSON.parse(JSON.stringify(local));
  if (!remote) return S;
  const ra = Math.max(S.resetAt || 0, remote.resetAt || 0);
  if (ra > (S.resetAt || 0)) { S.resetAt = ra; for (const id in S.cards) if (tOf(S.cards[id]) < ra) delete S.cards[id]; }
  const rc = remote.cards || {};
  for (const id in rc) { const a = S.cards[id], b = rc[id]; if (tOf(b) < ra) continue; if (!a || tOf(b) > tOf(a)) S.cards[id] = b; }
  if ((remote.cfgT || 0) > (S.cfgT || 0)) { SYNC_CFG.forEach(k => { if (remote.cfg && k in remote.cfg) S.cfg[k] = remote.cfg[k]; }); S.cfgT = remote.cfgT; }
  const logs = remote.logs || {}; S.ol = S.ol || {};
  for (const dev in logs) { if (dev === S.dev) S.log = mergeLog(S.log, logs[dev]); else S.ol[dev] = mergeLog(S.ol[dev], logs[dev]); }
  S.hid = lastWins(S.hid, remote.hid);
  S.ed = lastWins(S.ed, remote.ed);
  S.devs = Object.assign({}, remote.devs || {}, S.devs || {});
  return S;
}
function toRemote(S) {
  const cfg = {}; SYNC_CFG.forEach(k => { cfg[k] = S.cfg[k]; });
  const logs = Object.assign({}, S.ol || {}); logs[S.dev] = S.log || {};
  return { v: 1, cards: S.cards || {}, cfg, cfgT: S.cfgT || 0, logs, devs: S.devs || {}, resetAt: S.resetAt || 0, hid: S.hid || {}, ed: S.ed || {} };
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/* ---------------- medios del tutor, guardados en el dispositivo (IndexedDB) para usarlos sin conexión */
const okKey = k => /^[A-Za-z0-9_-]{1,40}$/.test(k);
let idb = null;
function db() {
  if (idb) return idb;
  idb = new Promise((res, rej) => {
    try {
      const r = indexedDB.open('ticobox', 1);
      r.onupgradeneeded = () => { const d = r.result; ['voice', 'img'].forEach(n => { if (!d.objectStoreNames.contains(n)) d.createObjectStore(n); }); };
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    } catch (e) { rej(e); }
  });
  return idb;
}
function store(name) {
  const mem = {};
  return {
    async get(k) {
      if (mem[k]) return mem[k];
      try { const d = await db(); return await new Promise(r => { const q = d.transaction(name).objectStore(name).get(k); q.onsuccess = () => r(q.result || null); q.onerror = () => r(null); }); } catch (e) { return null; }
    },
    async put(k, b64) { try { const d = await db(); await new Promise(r => { const tx = d.transaction(name, 'readwrite'); tx.objectStore(name).put(b64, k); tx.oncomplete = tx.onerror = r; }); } catch (e) { mem[k] = b64; } },
    async del(k) { delete mem[k]; try { const d = await db(); d.transaction(name, 'readwrite').objectStore(name).delete(k); } catch (e) {} }
  };
}
function media(kind, ext, onNew) {
  const IK = 'ticobox.' + kind + 'idx', MK = 'ticobox.' + kind + 'meta', S = store(kind);
  let idx = {}, loc = {}, pref = false;
  try { idx = JSON.parse(sget(IK) || '{}'); loc = JSON.parse(sget(MK) || '{}'); } catch (e) {}
  async function fetchOne(c, k) {
    const r = await gh(c, 'GET', kind + '/' + k + '.' + ext + '?t=' + Date.now());
    if (r.status !== 200) throw httpErr(r);
    const b64 = JSON.parse(r.text).content.replace(/\s/g, '');
    await S.put(k, b64); loc[k] = (idx[k] && idx[k].at) || Date.now(); sset(MK, JSON.stringify(loc));
    if (onNew) onNew(k, b64);
    return b64;
  }
  return {
    setIndex(items, c, all) { idx = items || {}; sset(IK, JSON.stringify(idx)); return this.prefetch(c, all); },
    /** baja lo nuevo o reemplazado (las fotos siempre; las voces, solo las que ya estaban o si all) y borra lo que se quitó */
    async prefetch(c, all) {
      if (pref) return; pref = true;
      try {
        for (const k in loc) if (!idx[k]) { await S.del(k); delete loc[k]; if (onNew) onNew(k, null); }
        sset(MK, JSON.stringify(loc));
        for (const k in idx) {
          if (!okKey(k) || (loc[k] || 0) >= (idx[k].at || 0)) continue;
          if (!all && !(k in loc)) continue;
          try { await fetchOne(c, k); } catch (e) { if (e.message === 'offline') break; }
        }
      } finally { pref = false; }
    },
    has: k => !!(k && idx[k]),
    meta: k => idx[k] || null,
    keys: () => Object.keys(idx),
    count: () => Object.keys(idx).length,
    local: k => (loc[k] || 0) >= ((idx[k] && idx[k].at) || 1),
    localCount: () => Object.keys(idx).filter(k => (loc[k] || 0) >= (idx[k].at || 1)).length,
    async get(k) { if (!idx[k]) return null; let b = (loc[k] || 0) >= (idx[k].at || 0) ? await S.get(k) : null; if (!b && conf()) { try { b = await fetchOne(conf(), k); } catch (e) { b = await S.get(k); } } return b; },
    raw: S
  };
}
const VOICE = media('voice', 'mp3');
/* las fotos se muestran con <img src="blob:…">: se convierten una vez y quedan en memoria */
const IMGURL = {};
function setImgURL(k, b64) {
  if (IMGURL[k]) { try { URL.revokeObjectURL(IMGURL[k]); } catch (e) {} delete IMGURL[k]; }
  if (b64) { try { const bin = atob(b64), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); IMGURL[k] = URL.createObjectURL(new Blob([u8], { type: 'image/jpeg' })); } catch (e) {} }
  clearTimeout(setImgURL.t); setImgURL.t = setTimeout(() => api && api.media && api.media(), 120);
}
const IMG = media('img', 'jpg', setImgURL);
async function loadImgs() { for (const k of IMG.keys()) { if (IMGURL[k] || !IMG.local(k)) continue; const b = await IMG.raw.get(k); if (b) setImgURL(k, b); } }
const cacheGet = k => { try { return JSON.parse(sget(k) || 'null'); } catch (e) { return null; } };

/* ---------------- el motor, conectado a la app con TBSync.attach(api) */
let api = null, busy = null, again = false, timer = null;
const st = { last: Number(sget(LAST) || 0), err: '', running: false };
async function run(reason) {
  const c = conf(); if (!c || !api) return;
  if (busy) { again = true; return busy; }
  st.running = true; st.err = ''; api.status && api.status();
  busy = (async () => {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const rf = await getFile(c, 'progress.json');
        api.set(merge(api.get(), rf.data));
        const up = toRemote(api.get());
        if (!rf.data || !same(up, rf.data)) await putFile(c, 'progress.json', up, rf.sha, `progreso (${api.device()})`);
        const opt = async (p, fn) => { try { fn((await getFile(c, p)).data); } catch (e) { if (e.message !== 'repo') throw e; } };
        await opt('words.json', d => { const list = (d && d.words) || []; sset('ticobox.words', JSON.stringify(list)); api.custom && api.custom(list); });
        await opt('asks.json', d => { const list = (d && d.items) || []; sset('ticobox.asks', JSON.stringify(list)); api.asks && api.asks(list); });
        await opt('voice.json', d => { VOICE.setIndex(d && d.items, c, sget('ticobox.allvoice') === '1'); api.media && api.media(); });
        await opt('img.json', d => { IMG.setIndex(d && d.items, c, true); });
        st.last = Date.now(); st.err = ''; sset(LAST, String(st.last)); break;
      } catch (e) {
        st.err = e.message || 'error';
        if (e.message !== 'conflict') break;   // otro dispositivo escribió al mismo tiempo: se vuelve a leer y fusionar
      }
    }
  })();
  try { await busy; } finally { busy = null; st.running = false; api.status && api.status(); }
  if (again) { again = false; return run('again'); }
}
function soon(ms) { clearTimeout(timer); if (conf()) timer = setTimeout(() => run('soon'), ms == null ? 2500 : ms); }

window.TBSync = {
  DEFAULT_REPO,
  attach(a) {
    api = a;
    const w = cacheGet('ticobox.words'); if (w && w.length && api.custom) api.custom(w);
    const q = cacheGet('ticobox.asks'); if (q && api.asks) api.asks(q);
    loadImgs();
    if (conf()) setTimeout(() => run('boot'), 600);
    setInterval(() => { if (document.visibilityState !== 'hidden') run('tick'); }, 4 * 60 * 1000);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') run('hide'); else soon(500); });
  },
  conf, makeCode, readCode, merge, toRemote, run, soon, state: st,
  /** Conecta este dispositivo: revisa repo + token y sincroniza. n: 'est' para el dispositivo de la estudiante. */
  async connect(repo, token, n) {
    const c = { repo: cleanRepo(repo), token: String(token || '').trim() }; if (n) c.n = n;
    const info = await check(c);
    setConf(c); await run('connect');
    return info;
  },
  /** Crea el enlace de la estudiante sin conectar este dispositivo. Devuelve el código (va después de #). */
  async studentCode(repo, token) {
    const c = { repo: cleanRepo(repo), token: String(token || '').trim() };
    const info = await check(c);
    return { code: makeCode(c, { n: 'est' }), private: info.private };
  },
  disconnect() { setConf(null); },
  /** grabaciones del tutor: has(k), meta(k) → { at, tx }, get(k) → MP3 en base64 (se baja si no está en el dispositivo) */
  voice: { has: VOICE.has, meta: VOICE.meta, count: VOICE.count, localCount: VOICE.localCount, get: k => VOICE.get(k) },
  /** fotos del tutor: url(k) → URL blob si la foto ya está en este dispositivo */
  img: { url: k => IMGURL[k] || null, count: IMG.count },
  /** descargar todas las grabaciones para usarlas sin conexión (y seguir bajando las nuevas) */
  async downloadAll(on) { sset('ticobox.allvoice', on ? '1' : null); if (on && conf()) await VOICE.prefetch(conf(), true); },
  allVoice: () => sget('ticobox.allvoice') === '1',
  /** «Pregunta al tutor»: agrega la pregunta a asks.json (leer, agregar, escribir; reintenta si otro escribió a la vez) */
  async ask(k, q, dev) {
    const c = conf(); if (!c) throw new Error('nosync');
    const item = { id: 'q' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), k, q, at: Date.now(), dev };
    for (let n = 0; n < 4; n++) {
      const f = await getFile(c, 'asks.json'); const d = f.data || { v: 1, items: [] }; d.items = d.items || []; d.items.push(item);
      try { await putFile(c, 'asks.json', d, f.sha, 'pregunta de la estudiante'); sset('ticobox.asks', JSON.stringify(d.items)); api && api.asks && api.asks(d.items); return item; }
      catch (e) { if (e.message !== 'conflict' || n === 3) throw e; }
    }
  }
};
})();
