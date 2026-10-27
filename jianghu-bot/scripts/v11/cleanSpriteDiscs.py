#!/usr/bin/env python3
"""
scripts/v11/cleanSpriteDiscs.py
SSOT Sprite Diorama Disc Cleaner (Prompt V11 P6 - B9).
Cleans baked white/pale mist discs in the bottom 15% of sprites across atlas pages.
Applies alpha masking and gradient feathering so sprites rest cleanly on ground terrain.
"""

import os
import glob
import json
import shutil
import numpy as np
from PIL import Image

ATLAS_DIR = 'web-dashboard/public/assets/atlas/'

def clean_frame_disc(sub_arr):
    """
    Cleans baked white diorama disc in bottom 15% of a sprite frame.
    Returns cleaned sub_arr and number of pixels modified.
    """
    alpha = sub_arr[:, :, 3]
    ys, xs = np.where(alpha > 24)
    if len(xs) == 0:
        return sub_arr, 0

    y0, y1 = ys.min(), ys.max() + 1
    content_h = y1 - y0
    if content_h < 10:
        return sub_arr, 0

    content_w = xs.max() - xs.min() + 1
    bot_cut = int(y1 - content_h * 0.15)
    bot_strip = sub_arr[bot_cut:y1, :]

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

    # Disc pixel condition: alpha > 24, lum > 0.82, sat < 0.14
    disc_pixels = (bot_a > 24) & (lum > 0.82) & (sat < 0.14)
    disc_ys, disc_xs = np.where(disc_pixels)

    if len(disc_ys) == 0:
        return sub_arr, 0

    disc_w = disc_xs.max() - disc_xs.min() + 1
    disc_h = disc_ys.max() - disc_ys.min() + 1
    ratio = disc_h / content_h

    # Only treat as diorama disc if ratio > 8%, disc spans >= 30% width, and >= 80 pixels
    if ratio < 0.08 or (disc_w / content_w < 0.30) or len(disc_ys) < 80:
        return sub_arr, 0

    # Modify alpha of disc pixels
    cleaned_sub = sub_arr.copy()
    cleaned_bot = cleaned_sub[bot_cut:y1, :]
    
    # 1. Hard mask for clear disc pixels (lum > 0.82, sat < 0.14)
    cleaned_bot[disc_pixels, 3] = 0

    # 2. Feather boundary (lum 0.78 - 0.82, sat < 0.14)
    feather_mask = (bot_a > 24) & (lum >= 0.78) & (lum <= 0.82) & (sat < 0.14)
    f_ys, f_xs = np.where(feather_mask)
    for py, px in zip(f_ys, f_xs):
        factor = max(0.0, min(1.0, (0.82 - lum[py, px]) / 0.04))
        cleaned_bot[py, px, 3] = int(cleaned_bot[py, px, 3] * factor)

    cleaned_sub[bot_cut:y1, :] = cleaned_bot
    return cleaned_sub, len(disc_ys)

def clean_all_atlases():
    canon = json.load(open('world-data/grid-canon-v10.json'))['frames']
    total_cleaned_frames = 0
    pages_modified = 0

    for jf in sorted(glob.glob(ATLAS_DIR + '*.json')):
        if jf.endswith('index.json') or jf.endswith('atlas_index.json'):
            continue
        j = json.load(open(jf))
        page_name = j.get('meta', {}).get('image') or os.path.basename(jf)[:-5] + '.webp'
        webp_path = os.path.join(ATLAS_DIR, os.path.basename(page_name))
        if not os.path.exists(webp_path):
            webp_path = jf[:-5] + '.webp'
        if not os.path.exists(webp_path):
            continue

        im = Image.open(webp_path).convert('RGBA')
        page_arr = np.asarray(im).copy()
        page_changed = False

        for k, v in j['frames'].items():
            if k not in canon:
                continue
            cf = canon[k]
            cls = cf.get('class', '')
            cat = cf.get('category', '')
            is_tree_or_house = ('tree' in cls or 'house' in cls or cat == 'tree' or 'hut' in k or 'cottage' in k or 'village_house' in k)
            if not is_tree_or_house:
                continue

            f = v['frame']
            sub = page_arr[f['y']:f['y']+f['h'], f['x']:f['x']+f['w']]
            cleaned_sub, count = clean_frame_disc(sub)

            if count > 0:
                page_arr[f['y']:f['y']+f['h'], f['x']:f['x']+f['w']] = cleaned_sub
                page_changed = True
                total_cleaned_frames += 1
                print(f"  [CLEANED] {k} in {os.path.basename(webp_path)} ({count} disc px removed)")

        if page_changed:
            bak_path = webp_path + '.bak'
            if not os.path.exists(bak_path):
                shutil.copy2(webp_path, bak_path)
                print(f"  [BACKUP] Created {os.path.basename(bak_path)}")
            
            out_img = Image.fromarray(page_arr)
            out_img.save(webp_path, format='WEBP', lossless=True)
            pages_modified += 1
            print(f"  [SAVED] {os.path.basename(webp_path)}")

    print(f"\nTotal frames cleaned: {total_cleaned_frames} across {pages_modified} atlas pages.")

if __name__ == '__main__':
    clean_all_atlases()
