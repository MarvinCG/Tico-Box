// Pruebas de la Fase 1: content.txt completo, data.js solo con lo marcado «ok» en la hoja, sin contenido vulgar, y recorrido de lo publicado.
// Uso: cd tools && node test_f1.mjs     (levanta su propio servidor local en el puerto 8767)
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { readFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const B = 'http://localhost:8767/';
const errs = [];
const ok = (c, m) => { if (!c) { errs.push('FALLA ' + m); console.log('✗', m); } else console.log('✓', m); };
mkdirSync(join(ROOT, 'shots'), { recursive: true });

/* ---- 1. integridad de los datos */
// content.txt guarda todo (IDs estables); data.js publica solo lo que Aaron marcó «ok» en la hoja de revisión.
const SRC = readFileSync(join(ROOT, 'tools/content.txt'), 'utf8').split('\n').filter(l => l.trim() && !(l.startsWith('#') && !l.startsWith('##')));
const srcSits = SRC.filter(l => l.startsWith('##')).length, srcEntries = SRC.filter(l => !l.startsWith('#') && !l.startsWith('>'));
const srcOk = srcEntries.map((l, i) => [i, l.split('|')[8]?.trim()]).filter(([, st]) => st === 'ok').map(([i]) => i);
ok(srcSits === 11, `content.txt: ${srcSits} situaciones (se eliminaron amigos, fútbol, brete y trámites)`);
const gone = srcEntries.filter(l => l.startsWith('~')).length;
ok(srcEntries.length === 391 && gone === 145, `content.txt: ${srcEntries.length} IDs, ${srcEntries.length - gone} entradas y ${gone} eliminadas`);
const js = readFileSync(join(ROOT, 'web/data.js'), 'utf8');
const win = {}; new Function('window', js)(win);
const { SITS, ENTRIES } = win;
ok(SITS.length === srcSits, 'data.js conserva todas las situaciones (posiciones estables)');
ok(JSON.stringify(ENTRIES.map(e => e.i)) === JSON.stringify(srcOk), `data.js publica solo las «ok»: ${ENTRIES.length} de ${srcEntries.length}`);
ok(ENTRIES.every(e => e.vk === 'e' + e.i && e.tx && e.ne && e.pl && e.p), 'cada entrada publicada conserva su ID y trae sus campos');
ok(ENTRIES.every(e => ['F', 'N', 'I', 'C'].includes(e.r)), 'registro válido en todas (sin vulgar)');
const okIds = new Set(srcOk);
ok(SITS.every(s => s.dl.every(l => l.u && l.u.length && l.u.every(i => okIds.has(i)))), 'cada línea de diálogo publicada usa al menos una entrada «ok»');
ok(new Set(SITS.flatMap(s => s.dl.map(l => l.vk))).size === SITS.reduce((a, s) => a + s.dl.length, 0), 'claves de diálogo únicas');
const IDS = JSON.parse(readFileSync(join(ROOT, 'tools/ids.json'), 'utf8'));
ok(srcEntries.length >= IDS.length && IDS.every((tx, i) => tx === null ? srcEntries[i].startsWith('~') : srcEntries[i].split('|')[0].trim() === tx), `IDs estables: los ${IDS.length} IDs registrados siguen en su lugar (eliminados reservados)`);
ok(!SITS.some(s => ['ami', 'futbol', 'brete', 'tram'].includes(s.k)), 'no quedan las situaciones eliminadas');
const shown = SITS.map((s, k) => k).filter(k => SITS[k].dl.length || ENTRIES.some(e => e.s === k));

/* ---- servidor y navegador */
const srv = spawn('python3', ['-m', 'http.server', '8767', '--bind', '127.0.0.1', '--directory', join(ROOT, 'web')], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 700));
const br = await chromium.launch();
async function device(name, vp) {
  const ctx = await br.newContext({ viewport: vp, hasTouch: vp.width < 800 });
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(name + ': ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(name + ' consola: ' + m.text()); });
  p.on('response', r => { if (r.status() >= 400) errs.push(name + ' ' + r.status() + ' ' + r.url()); });
  await p.goto(B); await p.waitForTimeout(250);
  return { ctx, p };
}

/* ---- 2. recorrido completo: cada situación y cada ficha abren sin errores ni imágenes rotas */
{
  const { ctx, p } = await device('recorrido', { width: 412, height: 860 });
  await p.click('[data-a="lang"][data-v="es"]');
  if (ENTRIES.length) ok((await p.textContent('main')).includes('Frase del día'), 'Hoy: frase del día');
  await p.click('[data-a="tab"][data-k="sit"]');
  const listed = await p.evaluate(() => [...document.querySelectorAll('[data-a="sit"]')].map(b => Number(b.dataset.s)));
  ok(JSON.stringify(listed) === JSON.stringify(shown), `solo se listan las situaciones con algo publicado (${listed.length})`);
  for (const k of shown) {
    await p.evaluate(k => { const tb = window.__tb; tb.A.tab({ k: 'sit' }); tb.A.sit({ s: k }); }, k);
    const n = await p.evaluate(() => [document.querySelectorAll('[data-a="entry"]').length, document.querySelectorAll('.dl').length]);
    if (n[0] !== ENTRIES.filter(e => e.s === k).length || n[1] !== SITS[k].dl.length) errs.push(`situación ${SITS[k].k}: ${n} en pantalla`);
  }
  ok(true, 'cada situación muestra solo sus frases y líneas publicadas');
  const broken = await p.evaluate(async () => {
    const tb = window.__tb, bad = [];
    for (const e of tb.E.filter(Boolean)) { tb.A.entry({ i: e.i }); const sh = document.querySelector('#ov'); if (!sh || !sh.textContent.includes(e.tx)) bad.push(e.i); }
    tb.A.close(); return bad;
  });
  ok(!broken.length, 'todas las fichas publicadas abren ' + JSON.stringify(broken.slice(0, 5)));
  await p.waitForTimeout(400);
  ok(await p.evaluate(() => [...document.images].every(i => i.complete && i.naturalWidth > 0)), 'sin imágenes rotas en la vista');
  await p.click('[data-a="tab"][data-k="sit"]'); await p.waitForTimeout(300);
  await p.screenshot({ path: join(ROOT, 'shots/f1_situaciones.png') });
  if (shown.length) { await p.click(`[data-a="sit"][data-s="${shown[0]}"]`); await p.waitForTimeout(300); }
  await p.screenshot({ path: join(ROOT, 'shots/f1_amigos.png') });
  await ctx.close();
}

/* ---- 3. sin contenido vulgar ni ajuste para ocultarlo */
{
  const { ctx, p } = await device('sin-vulgar', { width: 1280, height: 800 });
  await p.click('[data-a="lang"][data-v="pl"]');
  await p.click('[data-a="tab"][data-k="words"]');
  for (const w of ['malparido', 'hijueputa', 'mierda', 'agüevado']) { await p.fill('#q', w); await p.waitForTimeout(30); if (await p.evaluate(() => document.querySelectorAll('#wres .wrow').length)) errs.push('aparece ' + w); }
  ok(true, 'ninguna palabra vulgar aparece en la búsqueda');
  await p.click('[data-a="tab"][data-k="me"]');
  ok(!(await p.textContent('main')).match(/wulgar|vulgar/i) && !(await p.isVisible('[data-a="tog"]')), 'sin ajuste de vulgares en Progreso');
  await p.screenshot({ path: join(ROOT, 'shots/f1_dex_pl.png') });
  await ctx.close();
}

await br.close(); srv.kill();
const uniq = [...new Set(errs)];
console.log(uniq.length ? `\n${uniq.length} ERRORES\n` + uniq.join('\n') : '\nTodas las pruebas pasaron.');
process.exit(uniq.length ? 1 : 0);
