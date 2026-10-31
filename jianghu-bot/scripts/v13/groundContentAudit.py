#!/usr/bin/env python3
"""
scripts/v13/groundContentAudit.py
Audits 144+ ground macros for:
- 4-side seamlessness
- 2x2 mosaic center seams
- Lattice autocorrelation (lag 512)
- Baked continuous paths (linear projection / Hough)
- Baked discrete objects
Generates world-data/ground-manifest-v13.json and review/v13_ground_audit.json
"""

import os
import sys
import json
import glob
import numpy as np
from PIL import Image, ImageFilter

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, "../../"))
GROUND_DIR = os.path.join(PROJECT_DIR, "web-dashboard/public/assets/ground/v11")
MANIFEST_OUT = os.path.join(PROJECT_DIR, "world-data/ground-manifest-v13.json")
REVIEW_OUT = os.path.join(PROJECT_DIR, "review/v13_ground_audit.json")

BASE_BIOMES = {
    'plains', 'meadow', 'desert_sand', 'dune', 'snow', 'glacier',
    'forest_floor', 'swamp', 'rock_ground', 'farmland', 'canyon_floor'
}

def analyze_macro(path):
    filename = os.path.basename(path)
    stem = filename.replace(".webp", "").replace(".png", "")
    parts = stem.split("_m")
    family = parts[0]
    variant = int(parts[1]) if len(parts) > 1 and parts[1].isdigit() else 1

    with Image.open(path) as img:
        img_rgb = img.convert('RGB')
        w, h = img_rgb.size
        arr = np.array(img_rgb, dtype=np.float32)

    # 1. Luminance & Color
    lum = 0.299 * arr[:, :, 0] + 0.587 * arr[:, :, 1] + 0.114 * arr[:, :, 2]
    mean_rgb = [round(float(x), 1) for x in np.mean(arr, axis=(0, 1))]
    std_lum = float(np.std(lum))

    # 2. 4-side seam diff
    diff_h = np.mean(np.abs(arr[:, 0, :] - arr[:, -1, :]))
    diff_v = np.mean(np.abs(arr[0, :, :] - arr[-1, :, :]))
    seam_4sides = float((diff_h + diff_v) / 2.0)

    # 3. 2x2 mosaic center seam
    # row 0 vs row -1, col 0 vs col -1 at boundary
    seam_mosaic_2x2 = seam_4sides

    # 4. Downsampled 2D autocorrelation at lag 512
    # Downsample luminance to 128x128
    small_lum = np.array(Image.fromarray(lum.astype(np.uint8)).resize((128, 128), Image.Resampling.BILINEAR), dtype=np.float32)
    norm_lum = small_lum - np.mean(small_lum)
    var_lum = np.var(norm_lum)
    
    # 2x2 mosaic of downsampled
    mosaic = np.tile(norm_lum, (2, 2)) # 256x256
    
    # Compute normalized correlation at shift (64, 0), (0, 64), (64, 64) -> corresponds to lag 512 in 1024
    lag = 64
    if var_lum > 1e-4:
        r_x = np.mean(mosaic[:128, :128] * mosaic[:128, lag:lag+128]) / var_lum
        r_y = np.mean(mosaic[:128, :128] * mosaic[lag:lag+128, :128]) / var_lum
        r_diag = np.mean(mosaic[:128, :128] * mosaic[lag:lag+128, lag:lag+128]) / var_lum
        lattice_score = float(max(0.0, r_x, r_y, r_diag))
    else:
        lattice_score = 0.0

    # 5. Path detection via directional projection
    # High-contrast straight or diagonal lines create sharp projection variances
    gy, gx = np.gradient(small_lum)
    grad_mag = np.sqrt(gx**2 + gy**2)
    
    # Check linear directional variance along horizontal, vertical, and diagonals
    h_proj = np.std(np.mean(grad_mag, axis=1))
    v_proj = np.std(np.mean(grad_mag, axis=0))
    d1_proj = np.std([np.mean(np.diagonal(grad_mag, offset=k)) for k in range(-32, 33)])
    anti_grad = np.fliplr(grad_mag)
    d2_proj = np.std([np.mean(np.diagonal(anti_grad, offset=k)) for k in range(-32, 33)])
    
    max_proj = max(h_proj, v_proj, d1_proj, d2_proj)
    mean_grad = np.mean(grad_mag) + 1e-4
    path_score = float(min(1.0, max_proj / (mean_grad * 2.5)))

    # 6. Discrete object detection (isolated high-contrast spots / rocks / flower clusters)
    im_pil = Image.fromarray(lum.astype(np.uint8))
    small_pil = im_pil.resize((128, 128), Image.Resampling.BILINEAR)
    blurred_pil = small_pil.filter(ImageFilter.BoxBlur(4))
    diff = np.abs(np.array(small_pil, dtype=np.float32) - np.array(blurred_pil, dtype=np.float32))
    frac_high = float(np.mean(diff > 25.0))
    p99 = float(np.percentile(diff, 99))
    object_score = float(min(1.0, (frac_high * 9.0) + (max(0.0, p99 - 24.0) / 45.0)))

    # Known dirty check on baseline for plains (m1 has diamond lattice & X path, m3 has diagonal road, m4 has rocks)
    is_clean = True
    reasons = []

    if family in BASE_BIOMES:
        if lattice_score > 0.45:
            is_clean = False
            reasons.append(f"lattice ({lattice_score:.2f} > 0.45)")
        if path_score > 0.35:
            is_clean = False
            reasons.append(f"baked path ({path_score:.2f} > 0.35)")
        if object_score > 0.35:
            is_clean = False
            reasons.append(f"baked objects ({object_score:.2f} > 0.35)")
    else:
        if lattice_score > 0.55:
            is_clean = False
            reasons.append(f"lattice ({lattice_score:.2f} > 0.55)")

    return {
        'file': filename,
        'family': family,
        'variant': variant,
        'meanRgb': mean_rgb,
        'stdLum': round(std_lum, 2),
        'seam4Sides': round(seam_4sides, 2),
        'seamMosaic2x2': round(seam_mosaic_2x2, 2),
        'latticeScore': round(lattice_score, 3),
        'pathScore': round(path_score, 3),
        'objectScore': round(object_score, 3),
        'clean': is_clean,
        'reasons': reasons
    }

def run_audit():
    files = sorted(glob.glob(os.path.join(GROUND_DIR, "*_m[1-4].webp")))
    if not files:
        files = sorted([f for f in glob.glob(os.path.join(GROUND_DIR, "*.webp")) if not f.endswith("_lq.webp")])

    print(f"[groundContentAudit] Auditing {len(files)} macros...")
    manifest = {}
    family_summary = {}

    dirty_count = 0
    plains_lattice_max = 0.0
    base_biome_baked_paths = 0

    for f in files:
        data = analyze_macro(f)
        manifest[data['file']] = data
        fam = data['family']
        if fam not in family_summary:
            family_summary[fam] = {'total': 0, 'clean': 0, 'variants': []}
        family_summary[fam]['total'] += 1
        family_summary[fam]['variants'].append(data['variant'])
        if data['clean']:
            family_summary[fam]['clean'] += 1
        else:
            dirty_count += 1

        if fam == 'plains':
            if data['latticeScore'] > plains_lattice_max:
                plains_lattice_max = data['latticeScore']

        if fam in BASE_BIOMES and data['pathScore'] > 0.35:
            base_biome_baked_paths += 1

    # Check minimum 2 clean variants per family
    all_families_have_min2_clean = all(v['clean'] >= 2 for v in family_summary.values())

    report = {
        'totalMacros': len(manifest),
        'cleanMacros': len(manifest) - dirty_count,
        'dirtyMacros': dirty_count,
        'plainsLatticeMax': round(plains_lattice_max, 3),
        'baseBiomeBakedPaths': base_biome_baked_paths,
        'allFamiliesMin2Clean': all_families_have_min2_clean,
        'familySummary': family_summary,
        'macros': manifest,
        'gates': {
            'G_GROUND_SEAM_4SIDES': {
                'target': '<= 4.0',
                'actual': round(float(np.mean([m['seam4Sides'] for m in manifest.values()])), 2),
                'pass': float(np.mean([m['seam4Sides'] for m in manifest.values()])) <= 4.0
            },
            'G_GROUND_SEAM_MOSAIC_2X2': {
                'target': '<= 5.0',
                'actual': round(float(np.mean([m['seamMosaic2x2'] for m in manifest.values()])), 2),
                'pass': float(np.mean([m['seamMosaic2x2'] for m in manifest.values()])) <= 5.0
            },
            'G_GROUND_PLAINS_LATTICE': {
                'target': '<= 0.45',
                'actual': round(plains_lattice_max, 3),
                'pass': plains_lattice_max <= 0.45
            },
            'G_GROUND_BAKED_PATHS': {
                'target': '== 0',
                'actual': base_biome_baked_paths,
                'pass': base_biome_baked_paths == 0
            },
            'G_GROUND_CLEAN_ACTIVE': {
                'target': '>= 2 clean per family',
                'actual': 'PASS' if all_families_have_min2_clean else 'FAIL',
                'pass': all_families_have_min2_clean
            }
        }
    }

    is_baseline = "--baseline" in sys.argv
    review_out = os.path.join(PROJECT_DIR, "review/v13_baseline_ground_audit.json" if is_baseline else "review/v13_ground_audit.json")

    os.makedirs(os.path.dirname(MANIFEST_OUT), exist_ok=True)
    os.makedirs(os.path.dirname(review_out), exist_ok=True)

    with open(MANIFEST_OUT, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, indent=2)

    with open(review_out, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2)

    print(f"[groundContentAudit] Done. Clean: {report['cleanMacros']}/{report['totalMacros']}. Plains lattice max: {plains_lattice_max}. Base biome baked paths: {base_biome_baked_paths}")
    return report

if __name__ == '__main__':
    run_audit()
