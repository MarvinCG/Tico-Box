/* Tico Box — sincronización: guarda el progreso en un repositorio privado de GitHub
   (por defecto MarvinCG/tico-box-data) con la API de contenidos de GitHub.
   https://docs.github.com/en/rest/repos/contents
   No se envía nada a ningún otro lado. El token solo se guarda en este dispositivo.
   Copiado y adaptado de Polski Box (sync.js). Los medios del tutor (voz y fotos) llegan en la Fase 3. */
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
  disconnect() { setConf(null); }
};
})();
