// Pruebas de la Fase 2: sincronización con el repo privado, enlace de la estudiante y reglas de fusión.
// GitHub se simula con page.route: nada sale de esta máquina.
// Uso: cd tools && node test_f2.mjs     (levanta su propio servidor local en el puerto 8768)
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const B = 'http://localhost:8768/';
const errs = [];
const ok = (c, m) => { if (!c) { errs.push('FALLA ' + m); console.log('✗', m); } else console.log('✓', m); };
mkdirSync(join(ROOT, 'shots'), { recursive: true });

/* ---- GitHub falso: repo me/data (privado), token TESTTOKEN */
const files = {}; let shaN = 0, puts = 0, force409 = 0, offline = false;
const b64 = s => Buffer.from(s, 'utf8').toString('base64'), unb = s => Buffer.from(s, 'base64').toString('utf8');
const remote = () => files['progress.json'] ? JSON.parse(unb(files['progress.json'].content)) : null;
async function fakeGitHub(ctx) {
  await ctx.route('https://api.github.com/**', async route => {
    if (offline) return route.abort('internetdisconnected');
    const req = route.request(), url = new URL(req.url());
    if (req.headers()['authorization'] !== 'Bearer TESTTOKEN') return route.fulfill({ status: 401, body: '{}' });
    if (url.pathname === '/repos/me/data') return route.fulfill({ status: 200, contentType: 'application/json', body: '{"private":true}' });
    const m = url.pathname.match(/^\/repos\/me\/data\/contents\/(.+)$/); if (!m) return route.fulfill({ status: 404, body: '{}' });
    const p = m[1], f = files[p];
    if (req.method() === 'GET') return f ? route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ sha: f.sha, content: f.content }) }) : route.fulfill({ status: 404, body: '{}' });
    if (req.method() === 'PUT') {
      const body = JSON.parse(req.postData());
      if (force409 > 0) { force409--; return route.fulfill({ status: 409, body: '{}' }); }
      if ((f && body.sha !== f.sha) || (!f && body.sha)) return route.fulfill({ status: 409, body: '{}' });
      files[p] = { sha: 's' + (++shaN), content: body.content }; puts++;
      return route.fulfill({ status: f ? 200 : 201, contentType: 'application/json', body: JSON.stringify({ content: { sha: files[p].sha } }) });
    }
    route.fulfill({ status: 405, body: '{}' });
  });
}

const srv = spawn('python3', ['-m', 'http.server', '8768', '--bind', '127.0.0.1', '--directory', join(ROOT, 'web')], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 700));
const br = await chromium.launch();
async function device(name, url, vp, lang) {
  const ctx = await br.newContext({ viewport: vp || { width: 412, height: 860 }, serviceWorkers: 'block' }); await fakeGitHub(ctx);
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write']);
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(name + ': ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) errs.push(name + ' consola: ' + m.text()); });
  await p.goto(url || B); await p.waitForTimeout(300);
  const w = await p.$(`[data-a="lang"][data-v="${lang || 'es'}"]`); if (w) await w.click();
  return { ctx, p, name };
}
const sync = d => d.p.evaluate(() => TBSync.run('test'));
const knownIds = d => d.p.evaluate(() => Object.keys(window.__tb.S().cards).filter(k => window.__tb.S().cards[k].k).map(Number).sort((a, b) => a - b));
const ids = await (async () => { const d = await device('ids'); const r = await d.p.evaluate(() => window.__tb.E().filter(Boolean).slice(0, 6).map(e => e.i)); await d.ctx.close(); return r; })();

/* ---- 1. Aaron crea el enlace de la estudiante sin conectar su dispositivo */
const T = await device('tutor', B, { width: 1280, height: 860 });
await T.p.click('[data-a="tab"][data-k="me"]'); await T.p.click('[data-a="syncsetup"]');
ok((await T.p.inputValue('#srepo')) === 'MarvinCG/tico-box-data', 'repo de datos por defecto: MarvinCG/tico-box-data');
await T.p.fill('#srepo', 'me/data'); await T.p.fill('#stok', 'MALO'); await T.p.click('#sstud'); await T.p.waitForTimeout(300);
ok((await T.p.textContent('#serr')).includes('GitHub rechazó el token'), 'token malo: mensaje claro en español');
await T.p.fill('#stok', 'TESTTOKEN'); await T.p.click('#sstud'); await T.p.waitForTimeout(300);
const link = await T.p.inputValue('#slink');
ok(link.startsWith('https://marvincg.github.io/Tico-Box/#TBX1.'), 'enlace de la estudiante apunta a la web publicada con el código en el #');
const code = link.split('#')[1];
ok(await T.p.evaluate(c => { const o = TBSync.readCode(c); return o.r === 'me/data' && o.t === 'TESTTOKEN' && o.n === 'est'; }, code), 'el código lleva repo, token y modo estudiante');
ok(await T.p.evaluate(() => TBSync.conf() === null) && !files['progress.json'], 'crear el enlace no conecta el dispositivo del tutor ni escribe progreso');
await T.p.click('[data-a="copylink"]'); await T.p.waitForTimeout(100);
ok((await T.p.evaluate(() => navigator.clipboard.readText())) === link, 'botón «Copiar enlace» copia el enlace');
await T.p.screenshot({ path: join(ROOT, 'shots/f2_enlace.png') });
await T.ctx.close();

/* ---- 2. la estudiante abre el enlace en el teléfono: queda conectada sin configurar nada */
const P = await device('telefono', B + '#' + code, null, 'pl');
await P.p.waitForTimeout(800);
ok(await P.p.evaluate(() => { const c = TBSync.conf(); return !!c && c.n === 'est' && c.repo === 'me/data'; }), 'teléfono conectado en modo estudiante');
ok(await P.p.evaluate(() => location.hash === ''), 'el código se borra de la barra de direcciones');
ok(!!files['progress.json'], 'primera sincronización crea progress.json');
await P.p.click('[data-a="tab"][data-k="me"]'); await P.p.waitForTimeout(100);
ok(await P.p.evaluate(() => !document.querySelector('[data-a="synccode"],[data-a="syncout"],[data-a="syncsetup"]')), 'modo estudiante: sin botones de configuración, código ni desconexión');
ok((await P.p.textContent('#synccard')).includes('Synchronizacja'), 'tarjeta de sincronización en polaco');
await P.p.screenshot({ path: join(ROOT, 'shots/f2_estudiante_pl.png') });

/* ---- 3. progreso en el teléfono: «La sé» y fichas vistas */
for (const i of ids.slice(0, 3)) { await P.p.evaluate(i => window.__tb.A.entry({ i }), i); await P.p.click('[data-a="known"]'); await P.p.click('#ov .sheet [data-a="close"]'); }
await sync(P);
ok(JSON.stringify(Object.keys(remote().cards).map(Number).sort((a, b) => a - b)) === JSON.stringify(ids.slice(0, 3)), 'el progreso del teléfono llega al repo (3 frases aprendidas)');
const pdev = await P.p.evaluate(() => window.__tb.S().dev);
ok(remote().logs[pdev] && Object.values(remote().logs[pdev])[0].v === 3, 'registro de fichas vistas por dispositivo');

/* ---- 4. la tablet abre el mismo enlace y recibe el progreso; cambios en ambos sentidos */
const Q = await device('tablet', B + '#' + code, { width: 1280, height: 800 }, 'es');
await Q.p.waitForTimeout(800);
ok(JSON.stringify(await knownIds(Q)) === JSON.stringify(ids.slice(0, 3)), 'la tablet recibe las 3 frases aprendidas del teléfono');
await Q.p.evaluate(() => { window.__tb.A.tab({ k: 'me' }); });
{ const tx = await Q.p.textContent('main'); ok(tx.includes('3/'), 'Progreso de la tablet muestra 3 aprendidas'); if (!tx.includes('3/')) console.log(await Q.p.evaluate(() => JSON.stringify({ n: window.__tb.E().filter(Boolean).length, hid: window.__tb.S().hid, cards: window.__tb.S().cards }))); }
await Q.p.evaluate(i => { window.__tb.A.entry({ i }); }, ids[0]); await Q.p.click('[data-a="known"]'); await Q.p.click('#ov .sheet [data-a="close"]');   // desmarca la primera
await Q.p.evaluate(i => { window.__tb.A.entry({ i }); }, ids[4]); await Q.p.click('[data-a="known"]'); await Q.p.click('#ov .sheet [data-a="close"]');   // marca otra
await sync(Q); await sync(P);
const want = [ids[1], ids[2], ids[4]];
ok(JSON.stringify(await knownIds(P)) === JSON.stringify(want) && JSON.stringify(await knownIds(Q)) === JSON.stringify(want), 'gana el cambio más nuevo por frase: teléfono y tablet quedan iguales');
ok(await P.p.evaluate(() => window.__tb.LG(Math.floor((Date.now() - new Date().getTimezoneOffset() * 6e4) / 864e5)).v) === 5, 'fichas vistas hoy suman los dos dispositivos (3 + 2)');
ok(await Q.p.evaluate(() => window.__tb.S().cfg.ui) === 'es' && await P.p.evaluate(() => window.__tb.S().cfg.ui) === 'pl', 'el idioma de la app es de cada dispositivo');

/* ---- 5. tercer dispositivo (PC) y escritura simultánea (409) */
const C = await device('pc', B + '#' + code, { width: 1366, height: 900 }, 'es');
await C.p.waitForTimeout(800);
ok(JSON.stringify(await knownIds(C)) === JSON.stringify(want), 'la PC recibe el mismo progreso');
await C.p.evaluate(i => { window.__tb.A.entry({ i }); }, ids[5]); await C.p.click('[data-a="known"]'); await C.p.click('#ov .sheet [data-a="close"]');
force409 = 1; await sync(C);
ok(remote().cards[ids[5]] && remote().cards[ids[5]].k === 1 && await C.p.evaluate(() => !TBSync.state.err), 'conflicto 409: vuelve a leer, fusiona y guarda');

/* ---- 6. sin conexión: avisa sin marcar error grave; al volver, sincroniza */
await P.p.evaluate(i => { window.__tb.A.entry({ i }); }, ids[3]); await P.p.click('[data-a="known"]'); await P.p.click('#ov .sheet [data-a="close"]');
offline = true; await sync(P);
ok(await P.p.evaluate(() => TBSync.state.err) === 'offline', 'sin conexión: estado «offline»');
offline = false; await sync(P);
ok(remote().cards[ids[3]] && remote().cards[ids[3]].k === 1, 'al volver la conexión, el cambio pendiente sube');

/* ---- 7. borrar el progreso en un dispositivo lo borra en los demás */
await Q.p.evaluate(() => { window.__tb.A.resetgo(); }); await sync(Q); await sync(P);
ok((await knownIds(P)).length === 0, 'borrar el progreso se propaga a los demás dispositivos');

/* ---- 8. enlace con token malo: abre la configuración con el error */
const X = await device('malo', B + '#' + (await (async () => { const d = await device('tmp'); const c = await d.p.evaluate(() => TBSync.makeCode({ repo: 'me/data', token: 'OTRO' }, { n: 'est' })); await d.ctx.close(); return c; })()));
await X.p.waitForTimeout(600);
ok(await X.p.evaluate(() => TBSync.conf() === null) && (await X.p.textContent('#ov')).includes('GitHub rechazó el token'), 'enlace con token inválido: no conecta y explica el error');

for (const d of [P, Q, C, X]) await d.ctx.close();
await br.close(); srv.kill();
console.log(`  · ${puts} escrituras en el repo falso`);
const uniq = [...new Set(errs)];
console.log(uniq.length ? `\n${uniq.length} ERRORES\n` + uniq.join('\n') : '\nTodas las pruebas pasaron.');
process.exit(uniq.length ? 1 : 0);
