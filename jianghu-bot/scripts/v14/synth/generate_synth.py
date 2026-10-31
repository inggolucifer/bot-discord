#!/usr/bin/env python3
"""
scripts/v14/synth/generate_synth.py
Generates 6 deterministic synthetic images for Gate Self-Testing (Prompt V14 P0).

1. ladder_road.png: Road strip with periodic 1-cell bright rungs/blocks & chained circles (MUST FAIL roadLadder)
2. clean_road.png: Smooth road with organic undulating edges, no periodic blocks (MUST PASS roadLadder)
3. diamond_lattice_mosaic.png: 2x2 mosaic of plains_m1.webp real data (MUST FAIL lattice)
4. pale_flat_floor.png: 8x6 cells flat cream floor (RGB~230) with faint grid (MUST FAIL paleFlat)
5. straight_seam.png: Sharp straight vertical seam >= 150px with Delta-RGB > 20 (MUST FAIL straightSeam)
6. clean_ground.png: Crop of clean ground texture (MUST PASS all gates)
"""

import os
import sys
import numpy as np
from PIL import Image, ImageDraw

SYNTH_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SYNTH_DIR, "../../../"))
GROUND_DIR = os.path.join(PROJECT_ROOT, "jianghu-bot/web-dashboard/public/assets/ground/v11")

def make_ladder_road():
    # 600x400 canvas, tile size ~ 54px
    img = Image.new("RGB", (640, 400), (115, 140, 85)) # green wilderness
    draw = ImageDraw.Draw(img)
    
    # Road base strip: y=160 to 240
    draw.rectangle([0, 160, 640, 240], fill=(130, 120, 105))
    
    # Add periodic bright blocks (ladder rungs) every 54px
    # delta L > 20, uniform spacing (sigma = 0)
    for x in range(20, 620, 54):
        # Bright vertical block 18x70px
        draw.rectangle([x, 165, x + 20, 235], fill=(235, 230, 215))
        # Chained cream circle
        draw.ellipse([x - 10, 185, x + 10, 215], fill=(225, 220, 205))

    out_path = os.path.join(SYNTH_DIR, "ladder_road.png")
    img.save(out_path)
    print(f"[synth] Generated: {out_path}")

def make_clean_road():
    img = Image.new("RGB", (640, 400), (115, 140, 85))
    arr = np.array(img, dtype=np.float32)
    
    # Road center y = 200, half-width = 38px with organic 1D noise
    np.random.seed(42)
    noise_y = np.convolve(np.random.randn(640) * 4.0, np.ones(15)/15.0, mode='same')
    
    for x in range(640):
        y_center = 200 + noise_y[x]
        hw = 36 + np.sin(x * 0.05) * 3.0
        y0 = int(max(0, y_center - hw))
        y1 = int(min(400, y_center + hw))
        
        # Subtle texture without periodic modulation
        for y in range(y0, y1):
            tex_noise = np.random.uniform(-4, 4)
            arr[y, x] = [135 + tex_noise, 125 + tex_noise, 110 + tex_noise]

    clean_img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
    out_path = os.path.join(SYNTH_DIR, "clean_road.png")
    clean_img.save(out_path)
    print(f"[synth] Generated: {out_path}")

def make_diamond_lattice():
    m1_path = os.path.join(GROUND_DIR, "plains_m1.webp")
    if not os.path.exists(m1_path):
        # Fallback to local search if needed
        alt = os.path.join(PROJECT_ROOT, "web-dashboard/public/assets/ground/v11/plains_m1.webp")
        if os.path.exists(alt):
            m1_path = alt

    if os.path.exists(m1_path):
        m1 = Image.open(m1_path).convert("RGB")
        w, h = m1.size
        # 2x2 mosaic
        mosaic = Image.new("RGB", (w * 2, h * 2))
        mosaic.paste(m1, (0, 0))
        mosaic.paste(m1, (w, 0))
        mosaic.paste(m1, (0, h))
        mosaic.paste(m1, (w, h))
        # Downsample to 512x512 for fast analysis
        mosaic_small = mosaic.resize((512, 512), Image.Resampling.BILINEAR)
        out_path = os.path.join(SYNTH_DIR, "diamond_lattice_mosaic.png")
        mosaic_small.save(out_path)
        print(f"[synth] Generated: {out_path}")
    else:
        # Synthetic diamond lattice if file missing
        arr = np.zeros((512, 512, 3), dtype=np.uint8) + 130
        for y in range(512):
            for x in range(512):
                v = int(25 * np.sin((x + y) * 2 * np.pi / 64) * np.sin((x - y) * 2 * np.pi / 64))
                arr[y, x] = np.clip([130 + v, 120 + v, 85 + v], 0, 255)
        img = Image.fromarray(arr)
        out_path = os.path.join(SYNTH_DIR, "diamond_lattice_mosaic.png")
        img.save(out_path)
        print(f"[synth] Generated synthetic: {out_path}")

def make_pale_flat_floor():
    # 640x400 canvas, area of 8x6 cells (432x324 px) with std < 2.0 and L > 85% (L ~ 230)
    arr = np.zeros((400, 640, 3), dtype=np.uint8) + np.array([120, 100, 70], dtype=np.uint8) # surround
    
    # 8x6 flat pale area: (100, 40) to (532, 364)
    # Xuan paper color #FAF7F0 is (250, 247, 240)
    arr[40:364, 100:532] = [238, 235, 226]
    
    img = Image.fromarray(arr)
    draw = ImageDraw.Draw(img)
    # Add thin grid lines every 54px
    for x in range(100, 533, 54):
        draw.line([x, 40, x, 364], fill=(210, 206, 196), width=1)
    for y in range(40, 365, 54):
        draw.line([100, y, 532, y], fill=(210, 206, 196), width=1)
        
    out_path = os.path.join(SYNTH_DIR, "pale_flat_floor.png")
    img.save(out_path)
    print(f"[synth] Generated: {out_path}")

def make_straight_seam():
    # 640x400 canvas
    # Left: dark slate (85, 100, 115)
    # Right: warm khaki (145, 130, 90)
    # Boundary at x=320, vertical length 300px (>= 150px) with Delta-RGB > 20
    arr = np.zeros((400, 640, 3), dtype=np.uint8)
    arr[:, :320] = [85, 100, 115]
    arr[:, 320:] = [145, 130, 90]
    
    img = Image.fromarray(arr)
    out_path = os.path.join(SYNTH_DIR, "straight_seam.png")
    img.save(out_path)
    print(f"[synth] Generated: {out_path}")

def make_clean_ground():
    m2_path = os.path.join(GROUND_DIR, "plains_m2.webp")
    if not os.path.exists(m2_path):
        alt = os.path.join(PROJECT_ROOT, "web-dashboard/public/assets/ground/v11/plains_m2.webp")
        if os.path.exists(alt):
            m2_path = alt

    if os.path.exists(m2_path):
        m2 = Image.open(m2_path).convert("RGB")
        out_path = os.path.join(SYNTH_DIR, "clean_ground.png")
        m2.save(out_path)
        print(f"[synth] Saved full clean ground: {out_path}")
    else:
        # Synthetic clean ground (organic Perlin-style noise)
        np.random.seed(99)
        base = np.zeros((512, 512, 3), dtype=np.float32) + [140, 130, 90]
        noise = np.random.randn(512, 512, 1) * 6.0
        arr = np.clip(base + noise, 0, 255).astype(np.uint8)
        img = Image.fromarray(arr)
        out_path = os.path.join(SYNTH_DIR, "clean_ground.png")
        img.save(out_path)
        print(f"[synth] Generated synthetic: {out_path}")

def main():
    print("=== GENERATING SYNTHETIC TEST IMAGES (V14 P0) ===")
    make_ladder_road()
    make_clean_road()
    make_diamond_lattice()
    make_pale_flat_floor()
    make_straight_seam()
    make_clean_ground()
    print("=== ALL 6 SYNTHETIC IMAGES GENERATED ===")

if __name__ == "__main__":
    main()
