// Pruebas básicas de la Fase 0: carga, idiomas es/pl, sin conexión (service worker), PWA, sin voz sintética y prueba «monkey».
// Uso: cd tools && npm i && node test_f0.mjs     (levanta su propio servidor local en el puerto 8766)
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { readFileSync, readdirSync, statSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const B = 'http://localhost:8766/';
const errs = [];
const ok = (c, m) => { if (!c) { errs.push('FALLA ' + m); console.log('✗', m); } else console.log('✓', m); };
mkdirSync(join(ROOT, 'shots'), { recursive: true });

/* ---- 1. revisión estática: no queda código de voz sintética */
const TTS = /speechSynthesis|SpeechSynthesisUtterance|piper|espeak|AUDIO_HD|audio\.json|audio-hd|ttsText|\.speak\(/i;
const walk = d => readdirSync(d).flatMap(f => { const p = join(d, f); if (/node_modules|\.git$|shots|test-results/.test(p)) return []; return statSync(p).isDirectory() ? walk(p) : [p]; });
const files = walk(ROOT).filter(p => /\.(js|mjs|html|py|yml|webmanifest|json|css)$/.test(p) && !p.endsWith('test_f0.mjs') && !/package(-lock)?\.json$/.test(p));
const hits = files.filter(p => TTS.test(readFileSync(p, 'utf8')));
ok(hits.length === 0, 'sin código de voz sintética en el repo' + (hits.length ? ': ' + hits.join(', ') : ''));
ok(readdirSync(join(ROOT, 'web')).every(f => !/^(a|audio.*|ipa\.js)$/.test(f)), 'web/ no trae audio generado ni motor de voz (vendor/ solo tiene el codificador MP3 de las grabaciones)');

/* ---- servidor local */
const srv = spawn('python3', ['-m', 'http.server', '8766', '--bind', '127.0.0.1', '--directory', join(ROOT, 'web')], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 700));

/* contenido de prueba (solo para las pruebas; el contenido real llega en la Fase 1) */
const FIX = (() => {
  const SITS = [{ k: 'p1', es: 'Situación de prueba', pl: 'Sytuacja testowa', ic: '1f4ac', ds: 'Descripción de prueba.', dp: 'Opis testowy.', dl: [{ w: 'Ana', tx: 'Línea uno', ne: 'Línea uno neutra', pl: 'Linia pierwsza', vk: 'dp1_0' }, { w: 'Vos', tx: 'Línea dos', ne: 'Línea dos neutra', pl: 'Linia druga', vk: 'dp1_1' }] }];
  const regs = ['F', 'N', 'I', 'C'], ENTRIES = [];
  for (let i = 0; i < 60; i++) ENTRIES.push({ i, s: 0, vk: 'e' + i, tx: 'Frase de prueba ' + i, ne: 'Equivalente neutro ' + i, pl: 'Zdanie testowe ' + i, r: regs[i % 4], ej: 'Ejemplo ' + i, ...(i === 2 ? { du: 1, nc: 'Nota de prueba', z: 'Valle Central' } : {}) });
  return `window.SITS=${JSON.stringify(SITS)};window.ENTRIES=${JSON.stringify(ENTRIES)};`;
})();

const br = await chromium.launch();
async function device(name, vp, opts = {}) {
  const ctx = await br.newContext({ viewport: vp, hasTouch: vp.width < 800, serviceWorkers: opts.sw ? 'allow' : 'block' });
  if (opts.fixture || opts.empty) await ctx.route('**/data.js', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: opts.empty ? 'window.SITS=[];window.ENTRIES=[];' : FIX }));
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(name + ': ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(name + ' consola: ' + m.text()); });
  await p.addInitScript(() => {   // detecta cualquier intento de voz sintética o audio
    window.__ttsCalls = 0;
    if (window.speechSynthesis) window.speechSynthesis.speak = () => { window.__ttsCalls++; };
    const A0 = window.Audio; window.Audio = function () { window.__ttsCalls++; return new A0(); };
  });
  await p.goto(B); await p.waitForTimeout(250);
  return { ctx, p };
}
const txt = (p, s) => p.evaluate(s => [...document.querySelectorAll(s)].map(e => e.textContent.trim()), s);

/* ---- 2. carga e idiomas */
{
  const { ctx, p } = await device('carga', { width: 412, height: 860 }, { empty: true });
  ok(await p.isVisible('[data-a="lang"][data-v="es"]'), 'bienvenida con elección de idioma');
  await p.click('[data-a="lang"][data-v="es"]');
  ok(JSON.stringify(await txt(p, 'nav button span')) === JSON.stringify(['Hoy', 'Situaciones', 'Frases', 'Progreso']), 'navegación en español');
  ok((await p.textContent('main')).includes('Todavía no hay frases'), 'sin contenido: mensaje de vacío');
  await p.screenshot({ path: join(ROOT, 'shots/f0_hoy_es.png') });
  await p.click('[data-a="tab"][data-k="me"]'); await p.click('[data-a="cfg"][data-k="ui"][data-v="pl"]');
  ok(JSON.stringify(await txt(p, 'nav button span')) === JSON.stringify(['Dziś', 'Sytuacje', 'Zwroty', 'Postępy']), 'navegación en polaco');
  ok(await p.evaluate(() => document.documentElement.lang) === 'pl', 'lang="pl" en el documento');
  await p.reload(); await p.waitForTimeout(200);
  ok(!(await p.isVisible('[data-a="lang"]')) && (await txt(p, 'nav button span'))[0] === 'Dziś', 'el idioma se conserva al recargar');
  const keys = await p.evaluate(() => { const T = window.__tb.T; return [Object.keys(T.es).filter(k => !(k in T.pl)), Object.keys(T.pl).filter(k => !(k in T.es))]; });
  ok(!keys[0].length && !keys[1].length, 'T.es y T.pl tienen las mismas claves ' + JSON.stringify(keys));
  const eng = await p.evaluate(() => { const T = window.__tb.T, bad = /\b(the|and|you|your|settings|install|loading|search|back|close|phrases?|words?)\b/i; return Object.entries(Object.assign({}, T.es, T.pl)).filter(([k, v]) => bad.test(v)).map(([k]) => k); });
  ok(!eng.length, 'sin textos en inglés ' + JSON.stringify(eng));
  await ctx.close();
}

/* ---- 3. con contenido de prueba: situaciones, ficha, búsqueda, scroll */
{
  const { ctx, p } = await device('contenido', { width: 412, height: 860 }, { fixture: true });
  await p.click('[data-a="lang"][data-v="es"]');
  await p.click('[data-a="tab"][data-k="sit"]'); await p.click('[data-a="sit"][data-s="0"]');
  ok((await txt(p, '.dl b')).length === 2, 'la situación muestra su diálogo');
  await p.click('[data-a="entry"][data-i="2"]');
  const sheet = await p.textContent('#ov');
  ok(sheet.includes('sin voz todavía'), 'entrada sin grabar: «sin voz todavía»');
  ok(await p.evaluate(() => !document.querySelector('#ov .say, #ov audio, #ov [data-a="play"]')), 'entrada sin grabar: sin botón de reproducir');
  ok(sheet.includes('polaco por revisar') && sheet.includes('dudoso') && sheet.includes('Valle Central'), 'etiquetas «por revisar», «dudoso» y zona');
  await p.screenshot({ path: join(ROOT, 'shots/f0_ficha.png') });
  await p.click('#ov .sheet [data-a="close"]');
  await p.click('[data-a="tab"][data-k="words"]');
  await p.fill('#q', 'prueba 4'); await p.waitForTimeout(50);
  ok((await txt(p, '#wres .wrow')).length === 11, 'búsqueda filtra (prueba 4, 40–49)');
  await p.fill('#q', ''); await p.evaluate(() => { const m = document.querySelector('#q'); m.dispatchEvent(new Event('input', { bubbles: true })); });
  await p.evaluate(() => { document.querySelector('#main').scrollTop = 1500; });
  const y0 = await p.evaluate(() => document.querySelector('#main').scrollTop);
  await p.evaluate(() => document.querySelectorAll('#wres .wrow')[25].click()); await p.waitForTimeout(50);
  await p.click('#ov .sheet [data-a="close"]'); await p.waitForTimeout(50);
  const y1 = await p.evaluate(() => document.querySelector('#main').scrollTop);
  ok(y0 > 500 && Math.abs(y1 - y0) < 2, `scroll conservado al abrir y cerrar una ficha (${y0} → ${y1})`);
  await p.evaluate(() => { window.__tb.bgRender(); });
  await p.waitForTimeout(1600);
  ok(Math.abs((await p.evaluate(() => document.querySelector('#main').scrollTop)) - y0) < 2, 'repintado en segundo plano conserva el scroll');
  await ctx.close();
}

/* ---- 4. PWA: manifiesto, íconos y funcionamiento sin conexión */
{
  const { ctx, p } = await device('pwa', { width: 1280, height: 800 }, { sw: true });
  const man = await p.evaluate(async () => { const m = await (await fetch('manifest.webmanifest')).json(); const sizes = await Promise.all(m.icons.map(i => new Promise(r => { const im = new Image(); im.onload = () => r(im.naturalWidth + 'x' + im.naturalHeight + '=' + i.sizes); im.onerror = () => r('error ' + i.src); im.src = i.src; }))); return { m, sizes }; });
  ok(man.m.name === 'Tico Box' && man.m.display === 'standalone' && man.m.start_url, 'manifiesto válido');
  ok(man.sizes.every(s => s.split('=')[0] === s.split('=')[1]), 'íconos del tamaño declarado ' + JSON.stringify(man.sizes));
  await p.evaluate(() => navigator.serviceWorker.ready);
  await p.reload(); await p.waitForTimeout(400);
  ok(await p.evaluate(() => !!navigator.serviceWorker.controller), 'service worker activo');
  await ctx.setOffline(true);
  await p.reload(); await p.waitForTimeout(400);
  ok(await p.isVisible('nav') || await p.isVisible('[data-a="lang"]'), 'la app abre sin conexión');
  ok(await p.evaluate(async () => (await fetch('icons/icon-512.png')).ok), 'íconos disponibles sin conexión');
  await ctx.setOffline(false); await ctx.close();
}

/* ---- 5. prueba monkey: clics al azar en teléfono, DeX, horizontal y polaco */
const SKIP = /^(resetgo|export|install|syncout|synccode|copylink)$/;
async function monkey(tag, vp, n, lang) {
  const { ctx, p } = await device('monkey-' + tag, vp, { fixture: true });
  await p.click(`[data-a="lang"][data-v="${lang}"]`);
  let seed = 7 + n; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < n; i++) {
    const r = rnd();
    await p.evaluate(([r, skip]) => {
      const els = [...document.querySelectorAll('[data-a]')].filter(e => { if (new RegExp(skip).test(e.dataset.a) || e.disabled) return false; const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0; });
      if (!els.length) return; const inp = document.querySelector('#q'); if (inp && r < 0.06) { inp.value = 'pura'; inp.dispatchEvent(new Event('input', { bubbles: true })); }
      els[Math.floor(r * els.length)].click();
    }, [r, SKIP.source]);
    if (r > 0.96) await p.keyboard.press(['Escape', '1', '2', '3', '4'][Math.floor(rnd() * 5)]);
    await p.waitForTimeout(5);
  }
  ok(await p.evaluate(() => window.__ttsCalls) === 0, `monkey ${tag}: nunca se intentó reproducir voz sintética`);
  await p.screenshot({ path: join(ROOT, `shots/f0_monkey_${tag}.png`) });
  await ctx.close();
}
await monkey('telefono', { width: 412, height: 860 }, 700, 'es');
await monkey('dex', { width: 1280, height: 800 }, 700, 'es');
await monkey('horizontal', { width: 860, height: 400 }, 500, 'pl');

await br.close(); srv.kill();
const uniq = [...new Set(errs)];
console.log(uniq.length ? `\n${uniq.length} ERRORES\n` + uniq.join('\n') : '\nTodas las pruebas pasaron.');
process.exit(uniq.length ? 1 : 0);
