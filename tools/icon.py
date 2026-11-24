"""Íconos de la PWA de Tico Box: franjas de la bandera de Costa Rica (azul, blanco, rojo, blanco, azul)."""
import os
from PIL import Image, ImageDraw, ImageFont

BLUE, WHITE, RED = (0, 43, 127, 255), (255, 255, 255, 255), (206, 17, 38, 255)
BANDS = ((BLUE, 1), (WHITE, 1), (RED, 2), (WHITE, 1), (BLUE, 1))
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'   # apt: fonts-dejavu-core
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'web', 'icons')


def flag(size):
    im = Image.new('RGBA', (size, size)); d = ImageDraw.Draw(im); y = 0
    for col, h in BANDS:
        y2 = y + size * h / 6; d.rectangle([0, round(y), size, round(y2)], fill=col); y = y2
    # globo de diálogo blanco con borde azul y «tb»
    c, r, bw = size / 2, size * 0.24, size * 0.03
    tail = [(c - r * 0.62, c + r * 0.7), (c - r * 0.98, c + r * 1.12), (c - r * 0.2, c + r * 0.95)]
    d.polygon([(x + (x - c) * 0.12, y + (y - c) * 0.12) for x, y in tail], fill=BLUE)
    d.ellipse([c - r - bw, c - r - bw, c + r + bw, c + r + bw], fill=BLUE)
    d.polygon(tail, fill=WHITE)
    d.ellipse([c - r, c - r, c + r, c + r], fill=WHITE)
    f = ImageFont.truetype(FONT, int(size * 0.2))
    bb = d.textbbox((0, 0), 'tb', font=f)
    d.text((c - (bb[2] - bb[0]) / 2 - bb[0], c - (bb[3] - bb[1]) / 2 - bb[1]), 'tb', font=f, fill=BLUE)
    return im


os.makedirs(OUT, exist_ok=True)
for px, name, maskable in ((192, 'icon-192.png', False), (512, 'icon-512.png', False), (512, 'maskable-512.png', True), (180, 'apple-touch-icon.png', True)):
    S = px * 4; im = flag(S)
    if not maskable:
        mask = Image.new('L', (S, S), 0); ImageDraw.Draw(mask).rounded_rectangle([0, 0, S - 1, S - 1], radius=int(S * 0.22), fill=255)
        im.putalpha(mask)
    im.resize((px, px), Image.LANCZOS).save(os.path.join(OUT, name))
print('íconos listos')
