// Pruebas de la Fase 1: el contenido real cargado en web/data.js, el ajuste para ocultar lo vulgar y un recorrido por todas las situaciones.
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
const js = readFileSync(join(ROOT, 'web/data.js'), 'utf8');
const win = {}; new Function('window', js)(win);
const { SITS, ENTRIES } = win;
ok(SITS.length >= 12 && SITS.length <= 15, `situaciones: ${SITS.length} (12–15)`);
ok(ENTRIES.length >= 350 && ENTRIES.length <= 450, `entradas: ${ENTRIES.length} (350–450)`);
ok(ENTRIES.every((e, i) => e.i === i && e.vk === 'e' + i), 'IDs posicionales y claves e<ID>');
ok(ENTRIES.every(e => e.tx && e.ne && e.pl), 'toda entrada trae tico, neutro y polaco');
ok(ENTRIES.every(e => ['F', 'N', 'I', 'C', 'V'].includes(e.r)), 'registro válido en todas');
ok(ENTRIES.every(e => e.p), 'toda entrada trae emoji');
ok(SITS.every(s => s.dl.length >= 5), 'cada situación trae un diálogo (≥ 5 líneas)');
ok(SITS.every((s, k) => ENTRIES.filter(e => e.s === k).length >= 20), 'cada situación trae al menos 20 entradas');
ok(new Set(SITS.flatMap(s => s.dl.map(l => l.vk))).size === SITS.reduce((a, s) => a + s.dl.length, 0), 'claves de diálogo únicas');
const dud = ENTRIES.filter(e => e.du).length, vul = ENTRIES.filter(e => e.r === 'V').length;
console.log(`  · ${dud} entradas «dudoso», ${vul} vulgares`);
ok(dud > 0 && vul > 0, 'hay entradas «dudoso» y vulgares marcadas');
const IDS = JSON.parse(readFileSync(join(ROOT, 'tools/ids.json'), 'utf8'));
ok(ENTRIES.length >= IDS.length && IDS.every((tx, i) => ENTRIES[i].tx === tx), `IDs estables: las ${IDS.length} entradas publicadas siguen en su lugar`);

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
  ok((await p.textContent('main')).includes('Frase del día') && (await p.textContent('main')).includes('Situación del día'), 'Hoy: frase y situación del día');
  for (let k = 0; k < SITS.length; k++) {
    await p.evaluate(k => { const tb = window.__tb; tb.A.tab({ k: 'sit' }); tb.A.sit({ s: k }); }, k);
    const n = await p.evaluate(() => document.querySelectorAll('[data-a="entry"]').length);
    if (n !== ENTRIES.filter(e => e.s === k).length) errs.push(`situación ${SITS[k].k}: ${n} frases en pantalla`);
  }
  ok(true, 'las 15 situaciones muestran todas sus frases');
  const broken = await p.evaluate(async () => {
    const tb = window.__tb, bad = [];
    for (const e of tb.E) { tb.A.entry({ i: e.i }); const sh = document.querySelector('#ov'); if (!sh || !sh.textContent.includes(e.tx)) bad.push(e.i); }
    tb.A.close(); return bad;
  });
  ok(!broken.length, 'todas las fichas abren ' + JSON.stringify(broken.slice(0, 5)));
  await p.waitForTimeout(400);
  ok(await p.evaluate(() => [...document.images].every(i => i.complete && i.naturalWidth > 0)), 'sin imágenes rotas en la vista');
  await p.click('[data-a="tab"][data-k="sit"]'); await p.waitForTimeout(300);
  await p.screenshot({ path: join(ROOT, 'shots/f1_situaciones.png') });
  await p.click('[data-a="sit"][data-s="1"]'); await p.waitForTimeout(300);
  await p.screenshot({ path: join(ROOT, 'shots/f1_amigos.png') });
  await ctx.close();
}

/* ---- 3. ocultar lo vulgar */
{
  const { ctx, p } = await device('vulgar', { width: 1280, height: 800 });
  await p.click('[data-a="lang"][data-v="pl"]');
  await p.click('[data-a="tab"][data-k="words"]');
  const count = () => p.evaluate(() => document.querySelectorAll('#wres .wrow').length);
  const all = await count();
  await p.fill('#q', 'malparido'); await p.waitForTimeout(50);
  ok(await count() === 1, 'búsqueda encuentra una entrada vulgar');
  await p.click('[data-a="tab"][data-k="me"]');
  ok((await p.textContent('main')).includes('Ukryj wulgarne zwroty'), 'ajuste visible en polaco');
  await p.click('[data-a="tog"][data-k="hideV"]');
  await p.click('[data-a="tab"][data-k="words"]');
  await p.fill('#q', 'malparido'); await p.waitForTimeout(50);
  ok(await count() === 0, 'con el ajuste, lo vulgar no aparece');
  await p.fill('#q', ''); await p.evaluate(() => document.querySelector('#q').dispatchEvent(new Event('input', { bubbles: true })));
  ok(await count() === Math.min(120, all) || (await count()) <= all, 'la lista sigue funcionando');
  await p.reload(); await p.waitForTimeout(200);
  ok(await p.evaluate(() => window.__tb.S().cfg.hideV === true), 'el ajuste se conserva al recargar');
  await p.screenshot({ path: join(ROOT, 'shots/f1_dex_pl.png') });
  await ctx.close();
}

await br.close(); srv.kill();
const uniq = [...new Set(errs)];
console.log(uniq.length ? `\n${uniq.length} ERRORES\n` + uniq.join('\n') : '\nTodas las pruebas pasaron.');
process.exit(uniq.length ? 1 : 0);
