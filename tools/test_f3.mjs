// Pruebas de la Fase 3: página del tutor (agregar, LanguageTool con lista tica, foto, grabación en serie con cola,
// editar, ocultar, eliminar, preguntas) y lo que ve la estudiante (frases nuevas, voz normal y lenta, foto,
// grabaciones desactualizadas, editar el polaco, «Pregunta al tutor», descargar todo).
// GitHub y LanguageTool se simulan con page.route; el micrófono es el falso de Chromium.
// Uso: cd tools && node test_f3.mjs     (servidor local en el puerto 8769)
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const B = 'http://localhost:8769/';
const errs = [];
const ok = (c, m) => { if (!c) { errs.push('FALLA ' + m); console.log('✗', m); } else console.log('✓', m); };
mkdirSync(join(ROOT, 'shots'), { recursive: true });

/* ---- GitHub falso (repo me/data, token TESTTOKEN) y LanguageTool falso */
const files = {}; let shaN = 0, failPuts = 0;
const unb = s => Buffer.from(s, 'base64').toString('utf8');
const J = p => files[p] ? JSON.parse(unb(files[p].content)) : null;
async function fakes(ctx) {
  await ctx.route('https://api.github.com/**', async route => {
    const req = route.request(), url = new URL(req.url()), m = req.method();
    if (req.headers()['authorization'] !== 'Bearer TESTTOKEN') return route.fulfill({ status: 401, body: '{}' });
    if (url.pathname === '/repos/me/data') return route.fulfill({ status: 200, contentType: 'application/json', body: '{"private":true}' });
    const mm = url.pathname.match(/^\/repos\/me\/data\/contents\/(.+)$/); if (!mm) return route.fulfill({ status: 404, body: '{}' });
    const p = decodeURIComponent(mm[1]), f = files[p];
    if (m === 'GET') return f ? route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ sha: f.sha, content: f.content }) }) : route.fulfill({ status: 404, body: '{}' });
    const body = JSON.parse(req.postData() || '{}');
    if (m === 'PUT') {
      if (failPuts > 0 && /^voice\//.test(p)) { failPuts--; return route.fulfill({ status: 500, body: '{}' }); }
      if ((f && body.sha !== f.sha) || (!f && body.sha)) return route.fulfill({ status: 409, body: '{}' });
      files[p] = { sha: 's' + (++shaN), content: body.content };
      return route.fulfill({ status: f ? 200 : 201, contentType: 'application/json', body: JSON.stringify({ content: { sha: files[p].sha } }) });
    }
    if (m === 'DELETE') { delete files[p]; return route.fulfill({ status: 200, body: '{}' }); }
    route.fulfill({ status: 405, body: '{}' });
  });
  await ctx.route('https://api.languagetool.org/**', route => {
    const txt = new URLSearchParams(route.request().postData()).get('text'), matches = [];
    const add = (w, rep) => { const i = txt.indexOf(w); if (i >= 0) matches.push({ message: 'Posible error ortográfico', offset: i, length: w.length, context: { text: txt, offset: i, length: w.length }, replacements: rep ? [{ value: rep }] : [] }); };
    add('Diay'); add('cafesito', 'cafecito'); add('chunchito');
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ matches }) });
  });
}

const srv = spawn('python3', ['-m', 'http.server', '8769', '--bind', '127.0.0.1', '--directory', join(ROOT, 'web')], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 700));
const br = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
async function device(name, url, vp, init) {
  const ctx = await br.newContext({ viewport: vp || { width: 412, height: 860 }, serviceWorkers: 'block', permissions: ['microphone'] }); await fakes(ctx);
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(name + ': ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) errs.push(name + ' consola: ' + m.text()); });
  if (init) await p.addInitScript(init);
  await p.goto(url); await p.waitForTimeout(400);
  return { ctx, p };
}
const tutorReady = async T => { await T.p.waitForFunction(() => window.__tutor && document.querySelector('.tabs')); };
async function record(T, ms) { await T.p.click('[data-a="vrec"]'); await T.p.waitForTimeout(ms || 1200); await T.p.click('[data-a="vrec"]'); await T.p.waitForSelector('[data-a="vsave"]', { timeout: 8000 }); }
const idle = T => T.p.waitForFunction(() => !window.__tutor.UP.length, null, { timeout: 15000 });

/* ================= tutor */
const T = await device('tutor', B + 'tutor.html', { width: 1280, height: 900 });
ok((await T.p.inputValue('#crepo')) === 'MarvinCG/tico-box-data', 'tutor: repo por defecto MarvinCG/tico-box-data');
await T.p.fill('#crepo', 'me/data'); await T.p.fill('#ctok', 'TESTTOKEN'); await T.p.click('#cgo'); await tutorReady(T);
ok(await T.p.isVisible('text=Grabar en serie'), 'tutor conectado: pestañas Agregar · Grabar en serie · Frases · Preguntas');

/* ---- agregar con LanguageTool + lista tica */
await T.p.fill('#f_tx', 'Diay, ¿me regala un cafesito?'); await T.p.fill('#f_ne', '¿Me da un café, por favor?');
await T.p.click('[data-a="freg"][data-v="I"]');
await T.p.selectOption('#f_s', 'soda');
await T.p.click('#fcheck'); await T.p.waitForSelector('#fres .issue');
const res = await T.p.textContent('#fres');
ok(res.includes('cafesito') && !res.includes('«Diay»') && !/>Diay</.test(await T.p.innerHTML('#fres mark').catch(() => '')), 'LanguageTool: marca «cafesito» y deja pasar «Diay» (lista tica)');
await T.p.click('[data-a="ltfix"]'); await T.p.waitForTimeout(300);
ok((await T.p.inputValue('#f_tx')) === 'Diay, ¿me regala un cafecito?', 'sugerencia aplicada al texto tico');
ok((await T.p.inputValue('#f_em')).length > 0, 'emoji asignado automáticamente');
await T.p.setInputFiles('#fphoto', join(ROOT, 'tools/fixtures/photo.jpg')); await T.p.waitForSelector('.thumb');
await T.p.click('#fadd'); await T.p.waitForTimeout(800);
const w0 = J('words.json').words[0];
ok(w0.tx === 'Diay, ¿me regala un cafecito?' && w0.pl === '' && w0.r === 'I' && w0.s === 'soda' && w0.em, 'words.json: frase nueva con polaco vacío (pendiente), registro y situación');
ok(J('img.json') && J('img.json').items.t0 && files['img/t0.jpg'], 'foto subida como JPEG (img/t0.jpg + img.json)');
const jpg = Buffer.from(files['img/t0.jpg'].content, 'base64'); ok(jpg[0] === 0xff && jpg[1] === 0xd8, 'la foto es JPEG');
await T.p.fill('#f_tx', 'Qué chunchito'); await T.p.fill('#f_ne', 'Qué cosita'); await T.p.click('#fcheck'); await T.p.waitForSelector('[data-a="ltok"]');
await T.p.click('[data-a="ltok"]'); await T.p.waitForTimeout(400);
ok(!(await T.p.textContent('#fres')).includes('chunchito'), '«Es tico, permitir» agrega la palabra a la lista y la alerta desaparece');
await T.p.click('#fadd'); await T.p.waitForTimeout(600);
await T.p.screenshot({ path: join(ROOT, 'shots/f3_tutor_agregar.png') });

/* ---- grabación en serie, con la subida en cola (un fallo y reintento) */
await T.p.click('[data-a="tab"][data-v="serie"]'); await T.p.selectOption('#srsit', '0');
const c0 = await T.p.textContent('#srcount');
const firstKey = await T.p.evaluate(() => document.querySelector('.serial-tx').textContent);
failPuts = 1;
await record(T); await T.p.click('#vsave'); await T.p.waitForTimeout(200);
const second = await T.p.evaluate(() => document.querySelector('.serial-tx').textContent);
ok(second !== firstKey, 'tras guardar pasa a la siguiente sin esperar la subida');
await record(T); await T.p.click('#vsave');
await record(T); await T.p.click('#vsave');
await idle(T);
const vi = J('voice.json').items;
ok(vi.e0 && vi.e0.tx === '¡Upe!' && vi.e1 && vi.e2, 'voice.json: 3 grabaciones, cada una con el texto grabado (un fallo se reintentó)');
const mp3 = Buffer.from(files['voice/e0.mp3'].content, 'base64'); ok(mp3.length > 1000 && (mp3[0] === 0xff || mp3.slice(0, 3).toString() === 'ID3'), 'la grabación es MP3 (lamejs)');
ok((await T.p.textContent('#srcount')).startsWith('3 de'), `contador «X de Y grabadas» (${c0.trim()} → ${(await T.p.textContent('#srcount')).trim()})`);
await T.p.screenshot({ path: join(ROOT, 'shots/f3_tutor_serie.png') });

/* ---- frases: grabar la nueva, editar (deja la voz desactualizada), ocultar, eliminar */
await T.p.click('[data-a="tab"][data-v="words"]');
await T.p.evaluate(() => window.__tutor.ACT.wsel({ k: 't0' })); await T.p.waitForTimeout(100);
await record(T); await T.p.click('#vsave'); await idle(T);
ok(J('voice.json').items.t0, 'grabación de la frase nueva del tutor');
await T.p.evaluate(() => window.__tutor.ACT.wsel({ k: 'e2' })); await T.p.waitForTimeout(100);
await T.p.click('[data-a="eopen"]'); await T.p.fill('#e_tx', '¡Pase adelante, mi amor!'); await T.p.fill('#e_pl', 'Proszę wejść, kochanie!'); await T.p.click('#esave'); await T.p.waitForTimeout(500);
ok(J('progress.json').ed.e2.tx === '¡Pase adelante, mi amor!', 'edición guardada en progress.json (ed)');
ok((await T.p.textContent('.recc')).includes('El texto cambió después de tu grabación'), 'aviso de grabación desactualizada');
await T.p.selectOption('#wfilter', 'old'); await T.p.waitForTimeout(100);
ok(await T.p.evaluate(() => [...document.querySelectorAll('.vlist .wrow')].length) === 1, 'filtro «Desactualizada»');
await T.p.selectOption('#wfilter', 'all');
await T.p.evaluate(() => window.__tutor.ACT.wsel({ k: 'e3' })); await T.p.click('[data-a="hide"]'); await T.p.waitForTimeout(400);
ok(J('progress.json').hid.e3.h && J('progress.json').hid.e3.by === 't', 'ocultar (hid, por el tutor)');
await T.p.evaluate(() => window.__tutor.ACT.wsel({ k: 't1' })); await T.p.click('[data-a="delx"]'); await T.p.click('[data-a="delx"]'); await T.p.waitForTimeout(600);
ok(J('words.json').words[1].del && J('progress.json').hid.t1.x, 'eliminar definitivamente (doble confirmación)');
for (const [f, n] of [['novoice', null], ['nophoto', null], ['hidden', 1], ['plrev', null]]) { await T.p.selectOption('#wfilter', f); await T.p.waitForTimeout(60); const c = await T.p.evaluate(() => document.querySelectorAll('.vlist .wrow').length); if (n != null && c !== n) errs.push(`filtro ${f}: ${c}`); }
ok(true, 'filtros sin voz · sin foto · ocultas · polaco por revisar');
await T.p.selectOption('#wfilter', 'all');
await T.p.screenshot({ path: join(ROOT, 'shots/f3_tutor_frases.png') });

/* ================= estudiante */
const code = await T.p.evaluate(() => 'TBX1.' + btoa(JSON.stringify({ r: 'me/data', t: 'TESTTOKEN', n: 'est' })).replace(/=+$/, ''));
const spy = () => { window.__played = []; const A0 = window.Audio; window.Audio = function (u) { const a = new A0(u); const o = { set playbackRate(v) { a.playbackRate = v; this._r = v; }, get playbackRate() { return a.playbackRate; }, set preservesPitch(v) { this._p = v; }, set mozPreservesPitch(v) {}, set webkitPreservesPitch(v) {}, play: () => { window.__played.push({ r: o._r, p: o._p }); setTimeout(() => o.onended && o.onended(), 10); return Promise.resolve(); }, pause() {} }; return o; }; };
const P = await device('estudiante', B + '#' + code, null, spy);
await P.p.click('[data-a="lang"][data-v="es"]'); await P.p.waitForTimeout(1500);
const newE = await P.p.evaluate(() => window.__tb.E()[5000]);
ok(newE && newE.tx === 'Diay, ¿me regala un cafecito?' && newE.plp === 1, 'la frase nueva del tutor llega a su app (ID 5000), con «polaco pendiente»');
ok(!(await P.p.evaluate(() => window.__tb.E()[5001])), 'la frase eliminada por el tutor no aparece');
await P.p.evaluate(() => { window.__tb.A.tab({ k: 'sit' }); window.__tb.A.sit({ s: 2 }); }); await P.p.waitForTimeout(200);
ok((await P.p.textContent('main')).includes('cafecito'), 'aparece en su situación (En la soda)');
await P.p.evaluate(() => window.__tb.A.entry({ i: 5000 })); await P.p.waitForTimeout(1200);
ok(await P.p.evaluate(() => !!document.querySelector('#ov .pic.photo img[src^="blob:"]')), 'la ficha muestra la foto del tutor');
ok((await P.p.textContent('#ov')).includes('polaco pendiente'), 'etiqueta «polaco pendiente»');
await P.p.click('#ov [data-a="play"]:not([data-s])'); await P.p.waitForTimeout(400);
await P.p.click('#ov [data-a="play"][data-s="1"]'); await P.p.waitForTimeout(400);
const played = await P.p.evaluate(() => window.__played);
ok(played.length === 2 && played[0].r === 1 && played[1].r === 0.75 && played[1].p === true, 'reproduce tu voz: normal (1) y lenta (0.75 con preservesPitch)');
await P.p.evaluate(() => window.__tb.A.entry({ i: 2 })); await P.p.waitForTimeout(300);
ok((await P.p.textContent('#ov')).includes('sin voz todavía') && !(await P.p.$('#ov [data-a="play"]')), 'grabación desactualizada (texto editado): se ignora y queda «sin voz todavía»');
ok((await P.p.textContent('#ov')).includes('¡Pase adelante, mi amor!'), 'la edición del tutor llega a su app');
await P.p.evaluate(() => window.__tb.A.entry({ i: 0 })); await P.p.waitForTimeout(300);
ok(!!(await P.p.$('#ov [data-a="play"]')), 'frase grabada en serie: con botón de reproducir');
ok(!(await P.p.evaluate(() => window.__tb.E()[3] && !window.__tb.S().hid.e3)), 'la frase oculta por el tutor está oculta');
/* editar el polaco */
await P.p.click('#ov [data-a="edit"]'); await P.p.fill('#e_pl', 'Halo! Jest tu ktoś?'); await P.p.click('[data-a="edsave"]'); await P.p.waitForTimeout(200);
ok((await P.p.textContent('#ov')).includes('Halo! Jest tu ktoś?') && !(await P.p.textContent('#ov')).includes('polaco por revisar'), 'la estudiante corrige el polaco (deja de estar «por revisar»)');
/* pregunta al tutor */
await P.p.click('#ov [data-a="ask"]'); await P.p.fill('#askq', '¿Upe se dice también en la ciudad?'); await P.p.click('#asksend'); await P.p.waitForTimeout(600);
ok(J('asks.json').items[0].q === '¿Upe se dice también en la ciudad?' && J('asks.json').items[0].k === 'e0', 'la pregunta llega a asks.json');
/* ocultar y eliminar desde su app */
await P.p.evaluate(() => window.__tb.A.entry({ i: 1 })); await P.p.click('#ov [data-a="hide"]'); await P.p.waitForTimeout(100);
ok(await P.p.evaluate(() => window.__tb.S().hid.e1.h === true), 'la estudiante oculta una frase');
await P.p.evaluate(() => window.__tb.A.entry({ i: 4 })); await P.p.click('#ov [data-a="delw"]'); await P.p.click('#ov [data-a="delw"]'); await P.p.waitForTimeout(100);
ok(await P.p.evaluate(() => window.__tb.S().hid.e4.x === true && !document.querySelector('#ov')), 'la estudiante elimina una frase (doble confirmación)');
await P.p.evaluate(() => TBSync.run('t'));
await P.p.screenshot({ path: join(ROOT, 'shots/f3_estudiante.png') });

/* ================= el tutor ve los cambios y responde */
await T.p.click('[data-a="reload"]'); await T.p.waitForTimeout(600);
ok((await T.p.textContent('.tabs')).includes('Preguntas1'), 'pestaña Preguntas con 1 sin responder');
await T.p.click('[data-a="tab"][data-v="asks"]');
await T.p.fill('#qa0', 'Sí, aunque es más de pueblo.'); await T.p.click('[data-a="qsend"]'); await T.p.waitForTimeout(500);
ok(J('asks.json').items[0].a === 'Sí, aunque es más de pueblo.', 'respuesta guardada');
await T.p.screenshot({ path: join(ROOT, 'shots/f3_tutor_preguntas.png') });
await T.p.click('[data-a="tab"][data-v="words"]'); await T.p.evaluate(() => window.__tutor.ACT.wsel({ k: 'e0' })); await T.p.waitForTimeout(100);
ok((await T.p.textContent('.recc')).includes('editada por la estudiante'), 'el tutor ve que la estudiante corrigió el polaco');

/* ================= la estudiante recibe la respuesta y descarga todo */
await P.p.evaluate(() => TBSync.run('t')); await P.p.waitForTimeout(300);
await P.p.evaluate(() => window.__tb.A.tab({ k: 'me' })); await P.p.waitForTimeout(200);
ok((await P.p.textContent('main')).includes('Sí, aunque es más de pueblo.'), 'la respuesta aparece en Progreso › Tus preguntas');
await P.p.click('[data-a="dlall"]'); await P.p.waitForTimeout(1500);
ok(await P.p.evaluate(() => TBSync.voice.localCount() === TBSync.voice.count() && TBSync.allVoice()), 'descargar todas las grabaciones para usarlas sin conexión');
await P.p.screenshot({ path: join(ROOT, 'shots/f3_estudiante_progreso.png') });

/* ================= monkey en la página del tutor */
let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
for (let i = 0; i < 300; i++) {
  await T.p.evaluate(r => { const els = [...document.querySelectorAll('[data-a]')].filter(e => !/^(out|delx|vdel|pdel|vrec|connect)$/.test(e.dataset.a) && !e.disabled && e.getBoundingClientRect().width > 0); if (els.length) els[Math.floor(r * els.length)].click(); }, rnd());
  await T.p.waitForTimeout(15);
}
await T.p.waitForTimeout(800);
ok(true, 'monkey de 300 clics en la página del tutor');

for (const d of [T, P]) await d.ctx.close();
await br.close(); srv.kill();
const uniq = [...new Set(errs)];
console.log(uniq.length ? `\n${uniq.length} ERRORES\n` + uniq.join('\n') : '\nTodas las pruebas pasaron.');
process.exit(uniq.length ? 1 : 0);
