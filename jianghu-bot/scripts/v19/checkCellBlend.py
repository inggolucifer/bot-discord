"""
scripts/v19/checkCellBlend.py
Authoritative metric check for F1:
Measures color difference of the target artifact box (pixels 720..830, 440..530)
identified in the prompt vs surrounding road body (ring 1.5 cells).
Must be <= 12.
"""
import sys
import os
import json
import numpy as np
from PIL import Image

def measure_cell_blend(with_png, noroad_png):
    img = Image.open(with_png).convert('RGB')
    arr = np.array(img, dtype=float)
    
    # Target box identified in prompt: pixels approx (720..830, 440..530)
    x0, x1 = 720, 830
    y0, y1 = 440, 530
    target_crop = arr[y0:y1, x0:x1]
    target_mean = target_crop.mean(axis=(0, 1))
    
    # Surrounding road body: ring 1.5 cells around target box
    # cell_px at zoom 1.4 is 38 * 1.4 = 53.2 px (or 54*1.4 = 75.6 px)
    ring_px = int(round(1.5 * 54 * 1.4)) # ~113 px
    ring_mask = np.zeros(arr.shape[:2], dtype=bool)
    ry0, ry1 = max(0, y0 - ring_px), min(arr.shape[0], y1 + ring_px)
    rx0, rx1 = max(0, x0 - ring_px), min(arr.shape[1], x1 + ring_px)
    ring_mask[ry0:ry1, rx0:rx1] = True
    ring_mask[y0:y1, x0:x1] = False
    
    # Road body in ring
    if noroad_png and os.path.exists(noroad_png):
        img_no = Image.open(noroad_png).convert('RGB')
        arr_no = np.array(img_no, dtype=float)
        d = np.abs(arr - arr_no).max(axis=2)
        road_mask = ring_mask & (d > 18)
        if road_mask.sum() > 100:
            road_mean = arr[road_mask].mean(axis=0)
        else:
            # Fallback to confirmed road corridor north of junction
            road_mean = arr[284:436, 716:867].mean(axis=(0, 1))
    else:
        road_mean = arr[284:436, 716:867].mean(axis=(0, 1))
        
    diff = np.abs(target_mean - road_mean)
    max_channel_diff = float(diff.max())
    euclidean_diff = float(np.linalg.norm(diff))
    
    result = {
        'target_box': {'x0': x0, 'x1': x1, 'y0': y0, 'y1': y1},
        'target_mean_rgb': [round(float(c), 2) for c in target_mean],
        'road_mean_rgb': [round(float(c), 2) for c in road_mean],
        'diff_rgb': [round(float(c), 2) for c in diff],
        'max_channel_diff': round(max_channel_diff, 2),
        'euclidean_diff': round(euclidean_diff, 2),
        'threshold': 12.0,
        'pass': max_channel_diff <= 12.0
    }
    return result

if __name__ == '__main__':
    p_with = sys.argv[1] if len(sys.argv) > 1 else 'jianghu-bot/review/shots_v19/P01_xingcun.png'
    p_noroad = sys.argv[2] if len(sys.argv) > 2 else 'jianghu-bot/review/shots_v19/P01_xingcun_noroad.png'
    res = measure_cell_blend(p_with, p_noroad)
    
    out_dir = os.path.join(os.path.dirname(__file__), '../../review/v19_raw')
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, 'f1_cell_blend.json')
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(res, f, indent=2)
        
    print(json.dumps(res, indent=2))
    print(f'Saved to {out_path}')
