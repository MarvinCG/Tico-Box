"""Genera web/data.js y copia los emojis Twemoji locales de Tico Box desde tools/content.txt.

No genera audio: la única voz de la app es la grabación del tutor.
Uso:  cd tools && npm i && python3 prep.py
"""
import json, os, shutil, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = ROOT + '/web'
TW = ROOT + '/tools/node_modules/@twemoji/svg/'
SRC = ROOT + '/tools/content.txt'
REG = {'formal': 'F', 'neutral': 'N', 'informal': 'I', 'coloquial': 'C', 'vulgar': 'V'}
UI_EMOJI = '📦 🇨🇷 🇵🇱 💬 📝'   # íconos fijos de la interfaz (situación sin ícono, frase sin emoji…)

if not os.path.isdir(TW):
    sys.exit('Falta @twemoji/svg: ejecuta «npm i» dentro de tools/.')


def tw_file(ch):
    cps = [f'{ord(c):x}' for c in ch]
    for cand in ('-'.join(cps), '-'.join(c for c in cps if c != 'fe0f')):
        if os.path.exists(TW + cand + '.svg'):
            return cand
    return None


shutil.rmtree(OUT + '/e', ignore_errors=True)
os.makedirs(OUT + '/e')
used, errors = set(), []


def pic(ch, where):
    if not ch:
        return None
    f = tw_file(ch)
    if not f:
        errors.append(f'{where}: emoji sin imagen Twemoji «{ch}»')
        return None
    used.add(f)
    return f


for ch in UI_EMOJI.split():
    pic(ch, 'interfaz')

sits, entries, cur = [], [], None
for n, ln in enumerate(open(SRC, encoding='utf-8').read().splitlines(), 1):
    if not ln.strip() or (ln.startswith('#') and not ln.startswith('##')):
        continue
    if ln.startswith('##'):
        f = [x.strip() for x in ln[2:].split('|')] + [''] * 6
        cur = {'k': f[0], 'es': f[1], 'pl': f[2], 'ic': pic(f[3], f'línea {n}') or tw_file('💬'), 'ds': f[4], 'dp': f[5], 'dl': []}
        if any(s['k'] == cur['k'] for s in sits):
            errors.append(f'línea {n}: clave de situación repetida «{cur["k"]}»')
        sits.append(cur)
        continue
    if cur is None:
        errors.append(f'línea {n}: entrada antes de la primera situación')
        continue
    if ln.startswith('>'):
        f = [x.strip() for x in ln[1:].split('|')] + [''] * 4
        j = len(cur['dl'])
        cur['dl'].append({'w': f[0], 'tx': f[1], 'ne': f[2], 'pl': f[3], 'vk': f'd{cur["k"]}_{j}'})
        continue
    f = [x.strip() for x in ln.split('|')] + [''] * 9
    tx, ne, pl, reg, ej, nc, em, z, st = f[:9]
    if not tx:
        errors.append(f'línea {n}: falta el texto tico')
    if reg.lower() not in REG:
        errors.append(f'línea {n}: registro inválido «{reg}» (usa: {", ".join(REG)})')
    if st and st.lower() != 'dudoso':
        errors.append(f'línea {n}: estado inválido «{st}» (vacío o «dudoso»)')
    i = len(entries)
    e = {'i': i, 's': len(sits) - 1, 'vk': f'e{i}', 'tx': tx, 'ne': ne, 'pl': pl, 'r': REG.get(reg.lower(), 'N')}
    if ej: e['ej'] = ej
    if nc: e['nc'] = nc
    p = pic(em, f'línea {n}')
    if p: e['p'] = p
    if z: e['z'] = z
    if st: e['du'] = 1
    entries.append(e)

if errors:
    sys.exit('Errores en content.txt:\n  ' + '\n  '.join(errors))

for f in sorted(used):
    shutil.copy(TW + f + '.svg', f'{OUT}/e/{f}.svg')

js = lambda o: json.dumps(o, ensure_ascii=False, separators=(',', ':'))
with open(OUT + '/data.js', 'w', encoding='utf-8') as fh:
    fh.write('/* Generado por tools/prep.py desde tools/content.txt. No editar a mano. */\n')
    fh.write(f'window.SITS={js(sits)};\nwindow.ENTRIES={js(entries)};\n')
print(f'data.js: {len(sits)} situaciones, {len(entries)} entradas, {sum(len(s["dl"]) for s in sits)} líneas de diálogo · {len(used)} emojis')
