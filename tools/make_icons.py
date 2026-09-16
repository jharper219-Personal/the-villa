"""Draw the app icons (PNG + favicon) with Pillow:  python tools/make_icons.py

A coral-to-plum sunset, a white heart, a small sun. No external assets."""
import os, math
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'icons')
os.makedirs(OUT, exist_ok=True)

def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))

def gradient(size, top, bottom):
    img = Image.new('RGB', (size, size))
    px = img.load()
    for y in range(size):
        c = lerp(top, bottom, y / (size - 1))
        for x in range(size):
            px[x, y] = c
    return img

def heart(draw, cx, cy, s, fill):
    # Two circles and a rotated square, classic.
    r = s * 0.28
    draw.ellipse([cx - s * 0.5, cy - s * 0.42, cx - s * 0.5 + 2 * r, cy - s * 0.42 + 2 * r], fill=fill)
    draw.ellipse([cx + s * 0.5 - 2 * r, cy - s * 0.42, cx + s * 0.5, cy - s * 0.42 + 2 * r], fill=fill)
    pts = [(cx - s * 0.5, cy - s * 0.14), (cx + s * 0.5, cy - s * 0.14), (cx, cy + s * 0.5)]
    draw.polygon(pts, fill=fill)
    # fill the notch between circles and triangle
    draw.rectangle([cx - s * 0.5 + r * 0.2, cy - s * 0.14 - r * 0.6, cx + s * 0.5 - r * 0.2, cy - s * 0.14 + 2], fill=fill)

def make(size, maskable=False):
    img = gradient(size, (255, 122, 89), (78, 22, 84))
    d = ImageDraw.Draw(img)
    # sun
    sr = size * 0.16
    sx, sy = size * 0.74, size * 0.24
    d.ellipse([sx - sr, sy - sr, sx + sr, sy + sr], fill=(255, 214, 102))
    # sea line
    d.rectangle([0, size * 0.72, size, size], fill=(62, 18, 72))
    for i in range(6):
        y = size * 0.74 + i * size * 0.045
        d.rectangle([0, y, size, y + size * 0.012], fill=(120, 40, 120))
    # heart
    heart(d, size * 0.5, size * 0.5, size * 0.52, (255, 255, 255))
    heart(d, size * 0.5, size * 0.5, size * 0.42, (255, 92, 138))
    if not maskable:
        # rounded corners
        mask = Image.new('L', (size, size), 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, size - 1, size - 1], radius=int(size * 0.22), fill=255)
        out = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        out.paste(img, (0, 0), mask)
        return out
    return img.convert('RGBA')

make(192).save(os.path.join(OUT, 'icon-192.png'))
make(512).save(os.path.join(OUT, 'icon-512.png'))
make(512, maskable=True).save(os.path.join(OUT, 'icon-maskable-512.png'))
make(180).save(os.path.join(OUT, 'apple-touch-icon.png'))
fav = make(64)
fav.save(os.path.join(OUT, 'favicon.ico'), sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
print('icons written to', OUT)
