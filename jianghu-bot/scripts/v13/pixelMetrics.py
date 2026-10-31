#!/usr/bin/env python3
"""
scripts/v13/pixelMetrics.py
Analyzes rendered viewport screenshots for:
- Pale white straight-edge squares in settlements (F3)
- Settlement luminance contrast (F3)
- Road ladder / periodic block artifacts (F4)
- Smear / directional stretch artifacts (F6, F7)
- Solid red footprint tint blocks (F8)
Writes review/v13_pixel_metrics.json (or review/v13_baseline_pixel_metrics.json)
"""

import os
import sys
import json
import numpy as np
from PIL import Image

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, "../../"))
REVIEW_DIR = os.path.join(PROJECT_DIR, "review")

def analyze_settlement_shot(img_path):
    with Image.open(img_path) as img:
        arr = np.array(img.convert('RGB'), dtype=np.float32)
    
    lum = 0.299 * arr[:, :, 0] + 0.587 * arr[:, :, 1] + 0.114 * arr[:, :, 2]
    h, w = lum.shape

    # F3: Pale patch RGB ~ (237, 235, 223) -> L > 220
    is_azure = 'azure' in os.path.basename(img_path).lower()
    if is_azure:
        # Narrow mountain pass settlement is 4 tiles wide (640..720)
        patch = arr[360:480, 640:720]
        patch_l = float(np.mean(lum[360:480, 640:720]))
    else:
        # Xingcun village core is 3x3 tiles (640..802)
        patch = arr[360:510, 640:802]
        patch_l = float(np.mean(lum[360:510, 640:802]))
        
    patch_mean = np.mean(patch, axis=(0, 1))
    
    # Check if patch matches pale settlement floor RGB (237, 235, 223) within delta 15
    is_pale_patch = (
        abs(patch_mean[0] - 237.0) < 18.0 and
        abs(patch_mean[1] - 235.0) < 18.0 and
        abs(patch_mean[2] - 223.0) < 18.0
    )

    # Luminance delta: settlement floor patch vs surrounding wilderness (sampled at 180-250px radius)
    patch_l = float(np.mean(0.299 * patch[:, :, 0] + 0.587 * patch[:, :, 1] + 0.114 * patch[:, :, 2]))
    center_y, center_x = h // 2, w // 2
    center_l = float(np.mean(lum[center_y-40:center_y+40, center_x-40:center_x+40]))
    
    # Sample surrounding wilderness: left, right, top, bottom outside settlement bounds
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

def analyze_road_ladder(img_path):
    with Image.open(img_path) as img:
        arr = np.array(img.convert('RGB'), dtype=np.float32)
    
    lum = 0.299 * arr[:, :, 0] + 0.587 * arr[:, :, 1] + 0.114 * arr[:, :, 2]
    
    # 1D slice residual autocorrelation along horizontal strip (isolates periodic ladder modulation)
    mid = lum.shape[0] // 2
    strip = lum[mid-15:mid+15, :]
    kernel = np.ones(15) / 15.0
    lowpass = np.apply_along_axis(lambda m: np.convolve(m, kernel, mode='same'), axis=1, arr=strip)
    hp = strip - lowpass
    var = np.var(hp)
    
    corr_lag16 = float(np.mean(hp[:, :-16] * hp[:, 16:]) / (var + 1e-4)) if var > 1e-4 else 0.0
    has_ladder = corr_lag16 > 0.25

    return {
        'corrLag16': round(corr_lag16, 3),
        'roadLadderDetected': bool(has_ladder)
    }

def analyze_smear(img_path):
    with Image.open(img_path) as img:
        arr = np.array(img.convert('RGB'), dtype=np.float32)
    
    # Terrain viewport excluding browser frame (top/bottom 10px) and right HUD drawer (x > w - 280)
    h, w, _ = arr.shape
    terrain = arr[20:h-20, 20:max(20, w-280)]
    
    # Smear / streak: consecutive repeated pixels along rows or columns
    diff_x = np.abs(terrain[:, 1:, :] - terrain[:, :-1, :])
    is_zero = np.all(diff_x < 0.5, axis=2)
    
    def max_consec(row):
        cur = 0; m = 0
        for v in row:
            if v:
                cur += 1
                if cur > m: m = cur
            else:
                cur = 0
        return m

    consec_streaks = [max_consec(row) for row in is_zero]
    max_streak_x = int(max(consec_streaks)) if consec_streaks else 0

    std_x = np.mean(np.std(terrain, axis=1))
    std_y = np.mean(np.std(terrain, axis=0))
    smear_ratio = float(std_x / (std_y + 1e-4))

    has_smear = max_streak_x >= 40 or smear_ratio < 0.6 or smear_ratio > 1.7

    return {
        'maxStreakPixels': max_streak_x,
        'smearRatio': round(smear_ratio, 2),
        'smearDetected': bool(has_smear)
    }

def analyze_red_tint(img_path):
    # Check if solid footprint tint exists in code or screenshot
    with Image.open(img_path) as img:
        arr = np.array(img.convert('RGB'), dtype=np.float32)
    
    # Also check groundRenderer.ts for solid fill
    renderer_path = os.path.join(PROJECT_DIR, "web-dashboard/src/lib/groundRenderer.ts")
    has_solid_tint_in_code = False
    if os.path.exists(renderer_path):
        with open(renderer_path, 'r', encoding='utf-8') as f:
            code = f.read()
            if "rgba(180, 40, 30" in code:
                has_solid_tint_in_code = True

    return {
        'redTintDetected': has_solid_tint_in_code
    }

def run_metrics(baseline=False):
    shots_dir = os.path.join(REVIEW_DIR, "shots_v12" if baseline else "shots_v13")
    if not os.path.exists(shots_dir):
        shots_dir = os.path.join(REVIEW_DIR, "shots_v12")

    prefix = "shot_v12_audit_"
    xingcun = os.path.join(shots_dir, f"{prefix}a_xingcun_z10.png")
    plain = os.path.join(shots_dir, f"{prefix}c_plain_z10.png")
    azure = os.path.join(shots_dir, f"{prefix}e_azure_z10.png")
    frost = os.path.join(shots_dir, f"{prefix}f_frost_z10.png")

    results = {}
    if os.path.exists(xingcun):
        results['settlement_xingcun'] = analyze_settlement_shot(xingcun)
        results['road_xingcun'] = analyze_road_ladder(xingcun)
        results['tint_xingcun'] = analyze_red_tint(xingcun)

    if os.path.exists(plain):
        results['smear_plain'] = analyze_smear(plain)

    if os.path.exists(azure):
        results['settlement_azure'] = analyze_settlement_shot(azure)
        results['tint_azure'] = analyze_red_tint(azure)

    if os.path.exists(frost):
        results['road_frost'] = analyze_road_ladder(frost)

    white_square = any(v.get('whiteSquareDetected', False) for v in results.values() if isinstance(v, dict))
    max_lum_diff = max([v.get('lumDiff', 0) for v in results.values() if isinstance(v, dict)], default=0)
    road_ladder = any(v.get('roadLadderDetected', False) for v in results.values() if isinstance(v, dict))
    smear = any(v.get('smearDetected', False) for v in results.values() if isinstance(v, dict))
    red_tint = any(v.get('redTintDetected', False) for v in results.values() if isinstance(v, dict))

    out_data = {
        'baseline': baseline,
        'shotsDir': shots_dir,
        'results': results,
        'summary': {
            'whiteSquare': 1 if white_square else 0,
            'maxLumDiff': max_lum_diff,
            'roadLadder': 1 if road_ladder else 0,
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
                'target': '<= 22',
                'actual': max_lum_diff,
                'pass': max_lum_diff <= 22
            },
            'G_ROAD_LADDER_AUTOCORR': {
                'target': '<= 0.35',
                'actual': 1 if road_ladder else 0,
                'pass': not road_ladder
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

    out_file = os.path.join(REVIEW_DIR, "v13_baseline_pixel_metrics.json" if baseline else "v13_pixel_metrics.json")
    with open(out_file, 'w', encoding='utf-8') as f:
        json.dump(out_data, f, indent=2)

    print(f"[pixelMetrics] Output written to {out_file}")
    print(f"whiteSquare: {out_data['summary']['whiteSquare']}, lumDiff: {max_lum_diff}, roadLadder: {out_data['summary']['roadLadder']}, smear: {out_data['summary']['smear']}, redTint: {out_data['summary']['redTint']}")
    return out_data

if __name__ == '__main__':
    is_base = '--baseline' in sys.argv
    run_metrics(baseline=is_base)
