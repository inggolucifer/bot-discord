"""
scripts/v12/imageMetrics.py
Computes authoritative pixel and spatial data metrics:
  (a) whiteSquare: Components > 2x2 cells with L > 92% and Saturation < 8%
  (b) colLattice: Column lattice regularity from sprite coordinates (sigma < 0.3 cell)
  (c) emptyQuadrant: Empty quadrants among 4x3 (12) screen partitions
  (d) roadLadder: Periodic 75px autocorrelation pattern on roads
"""

import os
import sys
import json
import math
import numpy as np
from PIL import Image

def analyze_white_squares(img_arr, cell_size_px=54):
    """
    Detects square/rectangular whitish patches (>2x2 cells) with L > 92% and S < 8%.
    """
    arr = img_arr.astype(np.float32)
    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
    
    # Luminance L [0..255]
    lum = 0.299 * r + 0.587 * g + 0.114 * b
    max_c = np.maximum(np.maximum(r, g), b)
    min_c = np.minimum(np.minimum(r, g), b)
    sat = (max_c - min_c) / (max_c + 1e-5) # [0..1]
    
    # Thresholds: L > 92% (234.0/255), S < 8% (0.08)
    mask = (lum >= 234.0) & (sat < 0.08)
    
    h, w = mask.shape
    cell_2x = int(cell_size_px * 2.0)
    
    white_square_count = 0
    components = []
    
    # Check 2x2 cell sliding window
    step = max(8, cell_2x // 4)
    found_blocks = 0
    for y in range(0, h - cell_2x, step):
        for x in range(0, w - cell_2x, step):
            block = mask[y:y+cell_2x, x:x+cell_2x]
            if np.mean(block) > 0.40:
                found_blocks += 1
                components.append({
                    "bbox": [int(x), int(y), int(cell_2x), int(cell_2x)],
                    "mean_density": round(float(np.mean(block)), 2)
                })
                
    white_square_count = found_blocks
    return white_square_count, components
                        
    return white_square_count, components

def analyze_col_lattice(sprites):
    """
    Analyzes x-entropy and detects straight columns with >=3 sprites at uniform y-intervals (sigma < 0.3).
    sprites: list of {'x': float, 'y': float}
    """
    if not sprites or len(sprites) < 3:
        return 0, 0.0

    # Group by integer cell column round(x)
    cols = {}
    x_bins = {}
    for s in sprites:
        col_x = int(round(s['x']))
        cols.setdefault(col_x, []).append(s['y'])
        x_bins[col_x] = x_bins.get(col_x, 0) + 1

    # Entropy of x
    total = float(len(sprites))
    entropy = 0.0
    for cnt in x_bins.values():
        p = cnt / total
        entropy -= p * math.log2(p)

    lattice_cols = 0
    for cx, y_list in cols.items():
        if len(y_list) >= 3:
            y_sorted = sorted(y_list)
            diffs = [y_sorted[i+1] - y_sorted[i] for i in range(len(y_sorted)-1)]
            # check uniform spacing
            if len(diffs) >= 2:
                std_diff = float(np.std(diffs))
                mean_diff = float(np.mean(diffs))
                if std_diff < 0.3 and mean_diff > 0.5:
                    lattice_cols += 1

    return lattice_cols, round(entropy, 2)

def analyze_empty_quadrants(sprites, min_x, max_x, min_y, max_y):
    """
    Partitions viewport into 4x3 (12) quadrants, counts empty quadrants.
    """
    qw = (max_x - min_x) / 4.0
    qh = (max_y - min_y) / 3.0
    
    quads = np.zeros((3, 4), dtype=int)
    for s in sprites:
        qx = int(min(3, max(0, (s['x'] - min_x) / qw)))
        qy = int(min(2, max(0, (s['y'] - min_y) / qh)))
        quads[qy, qx] += 1
        
    empty_count = int(np.sum(quads == 0))
    return empty_count, quads.tolist()

def analyze_road_ladder(img_arr, lag_target=75):
    """
    Computes 1D autocorrelation on central horizontal and vertical bands to detect 75px ladder periodicity.
    """
    arr = img_arr.astype(np.float32)
    h, w, _ = arr.shape
    lum = 0.299 * arr[:, :, 0] + 0.587 * arr[:, :, 1] + 0.114 * arr[:, :, 2]
    
    # Strip horizontal slices
    strip = lum[h//3: 2*h//3, :]
    profile = np.mean(strip, axis=0)
    profile = profile - np.mean(profile)
    
    norm = np.sum(profile ** 2)
    if norm < 1e-4:
        return 0, 0.0
        
    # Autocorrelation
    ac = np.correlate(profile, profile, mode='full')
    ac = ac[len(profile)-1:] / norm
    
    # Check lag window [lag_target - 5, lag_target + 5]
    lo = max(1, lag_target - 5)
    hi = min(len(ac)-1, lag_target + 5)
    
    if hi > lo:
        peak_val = float(np.max(ac[lo:hi+1]))
    else:
        peak_val = 0.0
        
    is_ladder = 1 if peak_val > 0.35 else 0
    return is_ladder, round(peak_val, 3)

def evaluate_shot(image_path, sprites=None, bounds=None, zoom=1.0):
    im = Image.open(image_path).convert("RGB")
    arr = np.array(im)
    cell_px = 54 * zoom
    
    white_squares, ws_boxes = analyze_white_squares(arr, cell_size_px=cell_px)
    
    road_ladder, peak_val = analyze_road_ladder(arr, lag_target=int(round(54 * zoom)))
    
    col_lattice = 0
    entropy = 0.0
    empty_quadrants = 0
    quads_map = []
    
    if sprites is not None and bounds is not None:
        col_lattice, entropy = analyze_col_lattice(sprites)
        empty_quadrants, quads_map = analyze_empty_quadrants(
            sprites, bounds['minX'], bounds['maxX'], bounds['minY'], bounds['maxY']
        )
        
    return {
        "whiteSquare": white_squares,
        "whiteSquareBoxes": ws_boxes,
        "colLattice": col_lattice,
        "xEntropy": entropy,
        "emptyQuadrant": empty_quadrants,
        "quadrantsMap": quads_map,
        "roadLadder": road_ladder,
        "roadAutocorrPeak": peak_val
    }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python imageMetrics.py <image_path> [zoom]")
        sys.exit(1)
    img_path = sys.argv[1]
    z = float(sys.argv[2]) if len(sys.argv) > 2 else 1.0
    res = evaluate_shot(img_path, zoom=z)
    print(json.dumps(res, indent=2))
