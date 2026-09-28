#!/usr/bin/env python3
"""Generate the OneGit launcher icon (blue One UI-style squircle with code chevrons)."""
import os
from PIL import Image, ImageDraw

BASE = os.path.dirname(os.path.abspath(__file__))
S = 512

# diagonal gradient: #0381FE -> #1B6EF3
grad = Image.new('RGBA', (S, S))
d = ImageDraw.Draw(grad)
c1 = (3, 129, 254)
c2 = (27, 110, 243)
for y in range(S):
    t = y / S
    col = tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3)) + (255,)
    d.line([(0, y), (S, y)], fill=col)

# squircle mask
mask = Image.new('L', (S, S), 0)
md = ImageDraw.Draw(mask)
md.rounded_rectangle([0, 0, S - 1, S - 1], radius=118, fill=255)

img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
img.paste(grad, (0, 0), mask)

# code glyph: < / >
w2 = ImageDraw.Draw(img)
white = (255, 255, 255, 255)
w2.line([(196, 176), (120, 256), (196, 336)], fill=white, width=42, joint='curve')
w2.line([(316, 176), (392, 256), (316, 336)], fill=white, width=42, joint='curve')
w2.line([(288, 148), (224, 364)], fill=white, width=28, joint='curve')

for out, name in [(48, 'mdpi'), (72, 'hdpi'), (96, 'xhdpi'), (144, 'xxhdpi'), (192, 'xxxhdpi')]:
    dstdir = os.path.join(BASE, 'res', 'mipmap-' + name)
    os.makedirs(dstdir, exist_ok=True)
    img.resize((out, out), Image.LANCZOS).save(os.path.join(dstdir, 'ic_launcher.png'))

print('icons written')
