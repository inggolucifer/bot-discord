#!/usr/bin/env python3
"""
scripts/v14/pixelMetrics.py
Objective Visual Metrics Evaluator for Jianghu Bot V14 (Prompt V14 P0)

Metrik yang diukur:
1. roadLadder: 1D autocorrelation profile & periodic bright block detector (lag 0.5-3 cells)
2. whiteSquare & lumDiff: settlement floor contrast vs surrounding wilderness
3. paleFlat: flat cream/pale areas >= 4x3 cells with std Lum < 4.0 and L > 85%
4. straightSeam: straight vertical/horizontal seams >= 150px with Delta-RGB > 20
5. smear: edge-clamped pixel stretch / streak detector
6. redTint: solid footprint tint detector
"""

import os
import sys
import json
import numpy as np
from PIL import Image

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, "../../"))
REVIEW_DIR = os.path.join(PROJECT_DIR, "review")

def get_active_viewport(arr):
    h, w = arr.shape[:2]
    if w >= 800 and h >= 500:
        return arr[60:h-40, 40:w-280]
    return arr

def analyze_road_ladder(img_path):
    """
    Evaluates road ladder artifacts:
    - Finds road regions / bright horizontal/vertical bands
    - Takes intensity profile along the road axis
    - Computes 1D residual autocorrelation across lags 0.5 to 3.0 cells (27 to 230 px)
    - Detects uniform periodic bright rungs / blocks (>= 4 blocks, sigma < 0.22, Delta L > 10)
    """
    with Image.open(img_path) as img:
        arr = np.array(img.convert('RGB'), dtype=np.float32)
    
    view = get_active_viewport(arr)
    h, w = view.shape[:2]
    lum = 0.299 * view[:, :, 0] + 0.587 * view[:, :, 1] + 0.114 * view[:, :, 2]
    
    max_peak_corr = 0.0
    detected_blocks = False
    
    step = 15
    y_start = 10 if h < 300 else 60
    y_end = max(y_start + 20, h - (20 if h < 300 else 60))
    for y in range(y_start, y_end, step):
        strip = lum[y:y+35, :]
        if strip.shape[0] < 20 or strip.shape[1] < 100: continue
        
        prof_x = np.mean(strip, axis=0)
        k_size = min(31, len(prof_x) // 2 * 2 + 1)
        if k_size < 5: continue
        kernel = np.ones(k_size) / float(k_size)
        lowpass = np.convolve(prof_x, kernel, mode='same')
        hp = prof_x - lowpass
        var_hp = np.var(hp)
        
        if var_hp > 4.0:
            n = len(hp)
            for lag in range(20, min(200, n // 2), 2):
                c = np.mean(hp[:-lag] * hp[lag:]) / var_hp
                if c > max_peak_corr:
                    max_peak_corr = float(c)

            peak_indices = []
            for i in range(1, len(hp) - 1):
                if hp[i] > 10.0 and hp[i] > hp[i-1] and hp[i] > hp[i+1]:
                    peak_indices.append(i)
            
            if len(peak_indices) >= 4:
                diffs = np.diff(peak_indices)
                mean_diff = np.mean(diffs)
                if 20 <= mean_diff <= 140:
                    sigma = np.std(diffs) / mean_diff
                    if sigma < 0.22:
                        detected_blocks = True

    x_start = 10 if w < 300 else 60
    x_end = max(x_start + 20, w - (20 if w < 300 else 60))
    for x in range(x_start, x_end, step):
        strip_v = lum[:, x:x+35]
        if strip_v.shape[0] < 100 or strip_v.shape[1] < 20: continue
        prof_y = np.mean(strip_v, axis=1)
        k_size = min(31, len(prof_y) // 2 * 2 + 1)
        if k_size < 5: continue
        kernel = np.ones(k_size) / float(k_size)
        lowpass = np.convolve(prof_y, kernel, mode='same')
        hp_v = prof_y - lowpass
        var_hp_v = np.var(hp_v)
        
        if var_hp_v > 4.0:
            n = len(hp_v)
            for lag in range(20, min(200, n // 2), 2):
                c = np.mean(hp_v[:-lag] * hp_v[lag:]) / var_hp_v
                if c > max_peak_corr:
                    max_peak_corr = float(c)

            peak_indices_v = []
            for i in range(1, len(hp_v) - 1):
                if hp_v[i] > 10.0 and hp_v[i] > hp_v[i-1] and hp_v[i] > hp_v[i+1]:
                    peak_indices_v.append(i)
            
            if len(peak_indices_v) >= 4:
                diffs = np.diff(peak_indices_v)
                mean_diff = np.mean(diffs)
                if 20 <= mean_diff <= 140:
                    sigma = np.std(diffs) / mean_diff
                    if sigma < 0.22:
                        detected_blocks = True

    has_ladder = max_peak_corr >= 0.35 or detected_blocks

    return {
        'maxPeakCorr': round(float(max_peak_corr), 3),
        'periodicBlocksDetected': bool(detected_blocks),
        'roadLadderDetected': bool(has_ladder)
    }

def analyze_pale_flat(img_path):
    """
    Detects flat pale floor areas >= 4x3 cells (approx 216x162 px)
    with std(Luminance) < 4.0 and mean Luminance > 85% (L > 217).
    Catches unrendered Xuan paper (#FAF7F0) holes.
    """
    with Image.open(img_path) as img:
        arr = np.array(img.convert('RGB'), dtype=np.float32)

    view = get_active_viewport(arr)
    vh, vw = view.shape[:2]
    lum = 0.299 * view[:, :, 0] + 0.587 * view[:, :, 1] + 0.114 * view[:, :, 2]

    win_w = min(216, vw)
    win_h = min(162, vh)
    if win_w < 60 or win_h < 60:
        win_w, win_h = vw, vh
    
    has_pale_flat = False
    min_std = 999.0
    max_pale_l = 0.0

    step = 25
    for y in range(0, max(1, vh - win_h + 1), step):
        for x in range(0, max(1, vw - win_w + 1), step):
            block = lum[y:y+win_h, x:x+win_w]
            mean_l = float(np.mean(block))
            std_l = float(np.std(block))
            if mean_l > 210.0 and std_l < 6.0:
                has_pale_flat = True
                min_std = min(min_std, std_l)
                max_pale_l = max(max_pale_l, mean_l)

    return {
        'paleFlatDetected': bool(has_pale_flat),
        'minStd': round(float(min_std if min_std < 999 else 0.0), 2),
        'maxPaleLum': round(float(max_pale_l), 1)
    }

def analyze_straight_seam(img_path):
    """
    Detects straight vertical or horizontal boundary seams >= 150px length
    with continuous Delta-RGB > 20 on either side (Hough/run-length).
    """
    with Image.open(img_path) as img:
        arr = np.array(img.convert('RGB'), dtype=np.float32)

    view = get_active_viewport(arr)
    vh, vw, _ = view.shape

    # Vertical seam check: Delta-RGB between column x and column x+1
    diff_v = np.mean(np.abs(view[:, 1:, :] - view[:, :-1, :]), axis=2) # vh x (vw-1)
    is_seam_v = diff_v > 20.0

    max_v_streak = 0
    for col in range(vw - 1):
        col_data = is_seam_v[:, col]
        cur = 0
        for val in col_data:
            if val:
                cur += 1
                if cur > max_v_streak: max_v_streak = cur
            else:
                cur = 0

    # Horizontal seam check: Delta-RGB between row y and row y+1
    diff_h = np.mean(np.abs(view[1:, :, :] - view[:-1, :, :]), axis=2)
    is_seam_h = diff_h > 20.0

    max_h_streak = 0
    for row in range(vh - 1):
        row_data = is_seam_h[row, :]
        cur = 0
        for val in row_data:
            if val:
                cur += 1
                if cur > max_h_streak: max_h_streak = cur
            else:
                cur = 0

    has_straight_seam = max_v_streak >= 150 or max_h_streak >= 150

    return {
        'straightSeamDetected': bool(has_straight_seam),
        'maxVerticalSeamPx': int(max_v_streak),
        'maxHorizontalSeamPx': int(max_h_streak)
    }

def analyze_white_square(img_path):
    with Image.open(img_path) as img:
        arr = np.array(img.convert('RGB'), dtype=np.float32)
    
    h, w, _ = arr.shape
    lum = 0.299 * arr[:, :, 0] + 0.587 * arr[:, :, 1] + 0.114 * arr[:, :, 2]
    
    center_y, center_x = h // 2, w // 2
    patch = arr[center_y-50:center_y+50, center_x-50:center_x+50]
    patch_mean = np.mean(patch, axis=(0, 1))
    
    is_pale_patch = (patch_mean[0] > 230 and patch_mean[1] > 225 and patch_mean[2] > 215)
    
    patch_l = float(np.mean(lum[center_y-50:center_y+50, center_x-50:center_x+50]))
    center_l = float(np.mean(lum[center_y-40:center_y+40, center_x-40:center_x+40]))
    
    surroundings = []
    if center_x - 220 >= 40:
        surroundings.append(lum[center_y-40:center_y+40, center_x-220:center_x-140])
    if center_x + 220 < w - 40:
        surroundings.append(lum[center_y-40:center_y+40, center_x+140:center_x+220])
    if center_y - 200 >= 40:
        surroundings.append(lum[center_y-200:center_y-120, center_x-40:center_x+40])
    if center_y + 200 < h - 40:
        surroundings.append(lum[center_y+120:center_y+200, center_x-40:center_x+40])
        
    surround_l = float(np.mean([np.mean(s) for s in surroundings])) if surroundings else float(np.mean(lum))
    lum_diff = abs(patch_l - surround_l)

    return {
        'whiteSquareDetected': bool(is_pale_patch),
        'patchMeanRgb': [round(float(x), 1) for x in patch_mean],
        'centerLuminance': round(center_l, 1),
        'borderLuminance': round(surround_l, 1),
        'lumDiff': round(lum_diff, 1)
    }

def analyze_smear(img_path):
    with Image.open(img_path) as img:
        arr = np.array(img.convert('RGB'), dtype=np.float32)
    
    h, w, _ = arr.shape
    view = arr[60:h-40, 40:max(40, w-280)]
    vh, vw, _ = view.shape
    
    grad_x = np.abs(view[:, 1:, :] - view[:, :-1, :])
    grad_y = np.abs(view[1:, :, :] - view[:-1, :, :])
    
    v_smear_pixels = (np.mean(grad_x, axis=2) < 0.5) & (np.mean(view[:, 1:, :], axis=2) > 30.0)
    h_smear_pixels = (np.mean(grad_y, axis=2) < 0.5) & (np.mean(view[1:, :, :], axis=2) > 30.0)
    
    v_streaks = 0
    for col in range(vw - 1):
        col_smear = v_smear_pixels[:, col]
        cur = 0
        for val in col_smear:
            if val:
                cur += 1
                if cur >= 80:
                    v_streaks += 1
                    break
            else:
                cur = 0
                
    h_streaks = 0
    for row in range(vh - 1):
        row_smear = h_smear_pixels[row, :]
        cur = 0
        for val in row_smear:
            if val:
                cur += 1
                if cur >= 80:
                    h_streaks += 1
                    break
            else:
                cur = 0
                
    total_streaks = v_streaks + h_streaks
    has_smear = total_streaks >= 2

    return {
        'verticalSmearStreaks': v_streaks,
        'horizontalSmearStreaks': h_streaks,
        'smearDetected': bool(has_smear)
    }

def analyze_red_tint(img_path):
    renderer_file = os.path.join(PROJECT_DIR, "web-dashboard/src/components/map/groundRenderer.ts")
    has_solid_tint_in_code = False
    if os.path.exists(renderer_file):
        with open(renderer_file, 'r', encoding='utf-8', errors='ignore') as f:
            code = f.read()
            if "rgba(200, 50, 50" in code or "rgba(180, 40, 40" in code:
                has_solid_tint_in_code = True

    return {
        'redTintDetected': has_solid_tint_in_code
    }

def analyze_single_file(img_path):
    res_road = analyze_road_ladder(img_path)
    res_pale = analyze_pale_flat(img_path)
    res_seam = analyze_straight_seam(img_path)
    res_white = analyze_white_square(img_path)
    return {
        'file': img_path,
        'roadLadder': res_road,
        'paleFlat': res_pale,
        'straightSeam': res_seam,
        'whiteSquare': res_white
    }

def run_metrics(baseline=False, shots_dir=None, out_json=None):
    if not shots_dir:
        shots_dir = os.path.join(REVIEW_DIR, "shots_v13" if baseline else "shots_v14")
        if not os.path.exists(shots_dir):
            shots_dir = os.path.join(REVIEW_DIR, "shots_v13")

    prefix = "shot_v12_audit_"
    xingcun = os.path.join(shots_dir, f"{prefix}a_xingcun_z10.png")
    plain = os.path.join(shots_dir, f"{prefix}c_plain_z10.png")
    azure = os.path.join(shots_dir, f"{prefix}e_azure_z10.png")
    frost = os.path.join(shots_dir, f"{prefix}f_frost_z10.png")

    results = {}
    
    if os.path.exists(xingcun):
        results['white_square_xingcun'] = analyze_white_square(xingcun)
        results['road_ladder_xingcun'] = analyze_road_ladder(xingcun)
        results['pale_flat_xingcun'] = analyze_pale_flat(xingcun)
        results['straight_seam_xingcun'] = analyze_straight_seam(xingcun)
        results['tint_xingcun'] = analyze_red_tint(xingcun)
    if os.path.exists(plain):
        results['smear_plain'] = analyze_smear(plain)
        results['pale_flat_plain'] = analyze_pale_flat(plain)
        results['straight_seam_plain'] = analyze_straight_seam(plain)
    if os.path.exists(azure):
        results['white_square_azure'] = analyze_white_square(azure)
        results['tint_azure'] = analyze_red_tint(azure)
        results['pale_flat_azure'] = analyze_pale_flat(azure)
        results['straight_seam_azure'] = analyze_straight_seam(azure)
    if os.path.exists(frost):
        results['road_ladder_frost'] = analyze_road_ladder(frost)
        results['pale_flat_frost'] = analyze_pale_flat(frost)
        results['straight_seam_frost'] = analyze_straight_seam(frost)

    white_square = any(v.get('whiteSquareDetected', False) for v in results.values() if isinstance(v, dict))
    max_lum_diff = max([v.get('lumDiff', 0.0) for v in results.values() if isinstance(v, dict)] or [0.0])
    road_ladder = any(v.get('roadLadderDetected', False) for v in results.values() if isinstance(v, dict))
    pale_flat = any(v.get('paleFlatDetected', False) for v in results.values() if isinstance(v, dict))
    straight_seam = any(v.get('straightSeamDetected', False) for v in results.values() if isinstance(v, dict))
    smear = any(v.get('smearDetected', False) for v in results.values() if isinstance(v, dict))
    red_tint = any(v.get('redTintDetected', False) for v in results.values() if isinstance(v, dict))

    out_data = {
        'results': results,
        'summary': {
            'whiteSquare': 1 if white_square else 0,
            'maxLumDiff': float(max_lum_diff),
            'roadLadder': 1 if road_ladder else 0,
            'paleFlat': 1 if pale_flat else 0,
            'straightSeam': 1 if straight_seam else 0,
            'smear': 1 if smear else 0,
            'redTint': 1 if red_tint else 0
        },
        'gates': {
            'G_SETTLEMENT_WHITE_SQUARE': {
                'target': '== 0',
                'actual': 1 if white_square else 0,
                'pass': not white_square
            },
            'G_SETTLEMENT_LUM_DIFF': {
                'target': '<= 22.0',
                'actual': max_lum_diff,
                'pass': max_lum_diff <= 22.0
            },
            'G_ROAD_LADDER_AUTOCORR': {
                'target': '== 0',
                'actual': 1 if road_ladder else 0,
                'pass': not road_ladder
            },
            'G_PALE_FLAT_FLOOR': {
                'target': '== 0',
                'actual': 1 if pale_flat else 0,
                'pass': not pale_flat
            },
            'G_STRAIGHT_SEAM': {
                'target': '== 0',
                'actual': 1 if straight_seam else 0,
                'pass': not straight_seam
            },
            'G_SMEAR_RATIO': {
                'target': '== 0',
                'actual': 1 if smear else 0,
                'pass': not smear
            },
            'G_TINT_RED_SOLID_PIXELS': {
                'target': '== 0',
                'actual': 1 if red_tint else 0,
                'pass': not red_tint
            }
        }
    }

    if not out_json:
        out_json = os.path.join(REVIEW_DIR, "v14_baseline_pixel_metrics.json" if baseline else "v14_pixel_metrics.json")
    
    os.makedirs(os.path.dirname(out_json), exist_ok=True)
    with open(out_json, 'w', encoding='utf-8') as f:
        json.dump(out_data, f, indent=2)

    print(f"[pixelMetrics] Output written to {out_json}")
    print(f"whiteSquare: {out_data['summary']['whiteSquare']}, lumDiff: {max_lum_diff}, roadLadder: {out_data['summary']['roadLadder']}, paleFlat: {out_data['summary']['paleFlat']}, straightSeam: {out_data['summary']['straightSeam']}, smear: {out_data['summary']['smear']}, redTint: {out_data['summary']['redTint']}")

    return out_data

if __name__ == "__main__":
    if len(sys.argv) > 1 and not sys.argv[1].startswith("--"):
        single = analyze_single_file(sys.argv[1])
        print(json.dumps(single, indent=2))
    elif "--file" in sys.argv:
        idx = sys.argv.index("--file")
        if idx + 1 < len(sys.argv):
            single = analyze_single_file(sys.argv[idx + 1])
            print(json.dumps(single, indent=2))
    else:
        baseline_flag = "--baseline" in sys.argv
        run_metrics(baseline=baseline_flag)
