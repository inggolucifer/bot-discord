#!/usr/bin/env python3
"""
scripts/v19/generateComparisons.py
Generates side-by-side comparison images (V18 Before vs V19 After) for:
- P01 (Xingcun olive square removed)
- P11 (Xueshan neutral cool snow road)
- P04 (Farmland translucent paddy & macro texture)
Saved in review/shots_v19/compare/
"""
import os
from PIL import Image, ImageDraw, ImageFont

out_dir = os.path.abspath('jianghu-bot/review/shots_v19/compare')
os.makedirs(out_dir, exist_ok=True)

targets = [
    {
        'id': 'P01',
        'title': 'P01 Xingcun: Olive Square Elimination (F1)',
        'v18': 'jianghu-bot/review/shots_v18/P01_xingcun.png',
        'v19': 'jianghu-bot/review/shots_v19/P01_xingcun.png',
        'out': 'P01_comparison.png'
    },
    {
        'id': 'P11',
        'title': 'P11 Xueshan: Neutral Cool Snow Road (F2)',
        'v18': 'jianghu-bot/review/shots_v18/P11_xueshan.png',
        'v19': 'jianghu-bot/review/shots_v19/P11_xueshan.png',
        'out': 'P11_comparison.png'
    },
    {
        'id': 'P04',
        'title': 'P04 Farmland: Translucent Paddy & Macro Texture (F3)',
        'v18': 'jianghu-bot/review/shots_v18/P04_farm.png',
        'v19': 'jianghu-bot/review/shots_v19/P04_farm.png',
        'out': 'P04_comparison.png'
    }
]

header_h = 60
label_h = 40

for t in targets:
    im18 = Image.open(t['v18']).convert('RGB')
    im19 = Image.open(t['v19']).convert('RGB')
    w, h = im18.size

    # Composite canvas: width = w * 2, height = h + header_h + label_h
    comp_w = w * 2
    comp_h = h + header_h + label_h
    comp = Image.new('RGB', (comp_w, comp_h), (20, 24, 30))
    draw = ImageDraw.Draw(comp)

    # Top title bar
    draw.rectangle([0, 0, comp_w, header_h], fill=(30, 36, 48))
    draw.text((40, 18), t['title'], fill=(240, 215, 140))

    # Left subtitle: V18 (Before)
    draw.rectangle([0, header_h, w, header_h + label_h], fill=(45, 30, 30))
    draw.text((40, header_h + 10), "[BEFORE] V18 Baseline", fill=(255, 150, 150))

    # Right subtitle: V19 (After)
    draw.rectangle([w, header_h, comp_w, header_h + label_h], fill=(30, 45, 35))
    draw.text((w + 40, header_h + 10), "[AFTER] V19 Authoritative Fix", fill=(150, 240, 160))

    # Paste screenshots
    comp.paste(im18, (0, header_h + label_h))
    comp.paste(im19, (w, header_h + label_h))

    # Border divider
    draw.line([w, header_h, w, comp_h], fill=(60, 70, 85), width=2)

    out_path = os.path.join(out_dir, t['out'])
    comp.save(out_path, quality=92)
    print(f"Generated comparison card: {out_path} ({comp_w}x{comp_h})")

print("All comparison cards generated successfully.")
