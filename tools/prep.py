"""Genera web/data.js y copia los emojis Twemoji locales de Tico Box desde tools/content.txt.

No genera audio: la única voz de la app es la grabación del tutor.
Uso:  cd tools && npm i && python3 prep.py
"""
import json, os, re, shutil, sys, unicodedata

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = ROOT + '/web'
TW = ROOT + '/tools/node_modules/@twemoji/svg/'
SRC = ROOT + '/tools/content.txt'
REG = {'formal': 'F', 'neutral': 'N', 'informal': 'I', 'coloquial': 'C'}   # sin registro vulgar (decisión de Aaron, F1)
ESTADOS = ('', 'ok', 'corrección', 'correccion', 'dudoso', 'quitar')
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
    st = st.lower()
    if st not in ESTADOS:
        errors.append(f'línea {n}: estado inválido «{st}» (vacío, ok, corrección, dudoso o quitar)')
    i = len(entries)
    e = {'i': i, 's': len(sits) - 1, 'vk': f'e{i}', 'tx': tx, 'ne': ne, 'pl': pl, 'r': REG.get(reg.lower(), 'N')}
    if ej: e['ej'] = ej
    if nc: e['nc'] = nc
    p = pic(em, f'línea {n}')
    if p: e['p'] = p
    if z: e['z'] = z
    if st == 'dudoso': e['du'] = 1
    e['st'] = st
    entries.append(e)

# IDs estables: nunca se borran entradas. tools/ids.json guarda el texto tico de cada ID publicado.
IDS = ROOT + '/tools/ids.json'
prev = json.load(open(IDS, encoding='utf-8')) if os.path.exists(IDS) else []
if len(entries) < len(prev):
    errors.append(f'hay {len(entries)} entradas pero ya se publicaron {len(prev)}: nunca borrar entradas, reemplazarlas en su lugar')
changed = [i for i, tx in enumerate(prev) if i < len(entries) and entries[i]['tx'] != tx]
if changed:
    print(f'Aviso: cambió el texto tico de {len(changed)} IDs (reemplazo en el mismo lugar): {changed[:20]}')

if errors:
    sys.exit('Errores en content.txt:\n  ' + '\n  '.join(errors))

# Solo se publica lo que Aaron marcó «ok». Los IDs no cambian: las entradas descartadas se quedan en content.txt.
def fold(t):
    t = unicodedata.normalize('NFD', t.lower())
    return ''.join(c for c in t if unicodedata.category(c) != 'Mn')


def patterns(tx):
    # variantes «a / b», sin signos; terminación o/a flexible (hecho/hecha) y, para infinitivos, también sin el verbo
    out = []
    for v in tx.split('/'):
        w = re.findall(r"[\w']+", fold(v))
        if not w:
            continue
        cands = [w]
        if len(w) > 1 and w[0] in ('el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas'):
            cands.append(w[1:])   # «Una yapa» también cuenta como «yapa»
        if len(w) > 2 and re.search(r'(ar|er|ir)(se)?$', w[0]):
            cands.append(w[1:])   # «Ser muy pata» también cuenta como «muy pata»
        word = lambda x: (re.escape(x[:-1]) + '[oa]' if len(x) > 3 and x[-1] in 'oa' else re.escape(x)) + '(?:s|es)?'   # hecho/hecha, birra/birras
        for c in cands:
            out.append(re.compile(r'\b' + r'\s+'.join(word(x) for x in c) + r'\b'))
    return out


active = [e for e in entries if e['st'] == 'ok']
pats = [(e['i'], p) for e in active for p in patterns(e['tx'])]
for s_ in sits:
    for l in s_['dl']:
        uses = sorted({i for i, p in pats if p.search(fold(l['tx']))})
        if uses:
            l['u'] = uses
    s_['dl'] = [l for l in s_['dl'] if l.get('u')]
for e in entries:
    e.pop('st', None)
used = {f for f in used if any(e.get('p') == f for e in active) or any(s_['ic'] == f for s_ in sits) or f in {tw_file(c) for c in UI_EMOJI.split()}}

for f in sorted(used):
    shutil.copy(TW + f + '.svg', f'{OUT}/e/{f}.svg')

js = lambda o: json.dumps(o, ensure_ascii=False, separators=(',', ':'))
with open(OUT + '/data.js', 'w', encoding='utf-8') as fh:
    fh.write('/* Generado por tools/prep.py desde tools/content.txt. No editar a mano. */\n')
    fh.write(f'window.SITS={js(sits)};\nwindow.ENTRIES={js(active)};\n')
json.dump([e['tx'] for e in entries], open(IDS, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
print(f'content.txt: {len(entries)} entradas · publicadas («ok»): {len(active)} · líneas de diálogo publicadas: {sum(len(s["dl"]) for s in sits)} · {len(used)} emojis')
