#!/usr/bin/env python3
"""
scripts/v19/checkTexture.py
Mengukur standar deviasi luminansi di dalam patch 300x300 piksel di tengah petak sawah.
Syarat:
- stddev >= 4.0 (ada variasi tekstur makro, bukan flat color)
- 0 komponen gelap terhubung (L < 0.75 * median) berukuran > 1 sel^2 (tidak ada kolam air gelap).
"""
import sys, json
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

def check_texture(img_path, zoom=1.4):
    cell_px = 38.0 * float(zoom)
    im = Image.open(img_path).convert('RGB')
    arr = np.asarray(im, dtype=np.float64)
    H, W, _ = arr.shape
    
    # 300x300 patch at center
    cy, cx = H // 2, W // 2
    patch = arr[cy - 150 : cy + 150, cx - 150 : cx + 150]
    
    # Luminance L = 0.2126*R + 0.7152*G + 0.0722*B
    L = 0.2126 * patch[..., 0] + 0.7152 * patch[..., 1] + 0.0722 * patch[..., 2]
    stddev = float(np.std(L))
    
    # Dark connected components (L < 0.75 * median)
    med = float(np.median(L))
    dark_mask = L < 0.75 * med
    lab, n = ndi.label(dark_mask)
    sizes = ndi.sum(dark_mask, lab, range(1, n + 1)) if n > 0 else []
    
    threshold_area = cell_px * cell_px
    dark_large_components = int(sum(1 for s in sizes if s > threshold_area))
    max_dark_area_cells = float(max(sizes) / threshold_area) if len(sizes) > 0 else 0.0
    
    passed = (stddev >= 4.0) and (dark_large_components == 0)
    
    return {
        "file": img_path,
        "stddev": round(stddev, 3),
        "median_luminance": round(med, 2),
        "dark_components_over_1cell": dark_large_components,
        "max_dark_area_cells": round(max_dark_area_cells, 4),
        "pass": passed
    }

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python checkTexture.py <image_path> [zoom=1.4]")
        sys.exit(1)
    p = sys.argv[1]
    z = float(sys.argv[2]) if len(sys.argv) > 2 else 1.4
    res = check_texture(p, z)
    print(json.dumps(res, indent=2))
    sys.exit(0 if res["pass"] else 1)
