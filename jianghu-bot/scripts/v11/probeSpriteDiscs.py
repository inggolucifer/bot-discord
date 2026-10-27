#!/usr/bin/env python3
import glob, json, os
import numpy as np
from PIL import Image

A = 'web-dashboard/public/assets/atlas/'
canon = json.load(open('world-data/grid-canon-v10.json'))['frames']
discs = {}

for jf in sorted(glob.glob(A + '*.json')):
    if jf.endswith('index.json') or jf.endswith('atlas_index.json'): continue
    j = json.load(open(jf))
    page = j.get('meta', {}).get('image') or os.path.basename(jf)[:-5] + '.webp'
    p = os.path.join(A, os.path.basename(page))
    if not os.path.exists(p): p = jf[:-5] + '.webp'
    if not os.path.exists(p): continue
    im = Image.open(p).convert('RGBA')
    arr = np.asarray(im)
    
    for k, v in j['frames'].items():
        if k not in canon: continue
        f = v['frame']
        sub = arr[f['y']:f['y']+f['h'], f['x']:f['x']+f['w']]
        alpha = sub[:, :, 3]
        ys, xs = np.where(alpha > 24)
        if len(xs) == 0: continue
        
        y0, y1 = ys.min(), ys.max() + 1
        content_h = y1 - y0
        if content_h < 10: continue
        content_w = xs.max() - xs.min() + 1
        
        bot_cut = int(y1 - content_h * 0.15)
        bot_strip = sub[bot_cut:y1, :]
        bot_a = bot_strip[:, :, 3]
        bot_rgb = bot_strip[:, :, :3].astype(float) / 255.0
        
        r, g, b = bot_rgb[:, :, 0], bot_rgb[:, :, 1], bot_rgb[:, :, 2]
        max_c = np.maximum(np.maximum(r, g), b)
        min_c = np.minimum(np.minimum(r, g), b)
        delta = max_c - min_c
        lum = 0.299 * r + 0.587 * g + 0.114 * b
        sat = np.zeros_like(lum)
        mask = max_c > 0.01
        sat[mask] = delta[mask] / max_c[mask]
        
        disc_pixels = (bot_a > 24) & (lum > 0.85) & (sat < 0.12)
        disc_ys, disc_xs = np.where(disc_pixels)
        if len(disc_ys) > 0:
            disc_w = disc_xs.max() - disc_xs.min() + 1
            disc_h = disc_ys.max() - disc_ys.min() + 1
            ratio = disc_h / content_h
            if ratio > 0.08 and (disc_w / content_w > 0.30) and len(disc_ys) > 100:
                discs[k] = round(float(ratio), 4)

print(json.dumps(discs))
