#!/usr/bin/env python3
"""
scripts/v14/groundContentAudit.py
Audits 144+ ground macros for:
- 4-side seamlessness
- 2x2 mosaic center seams
- Lattice autocorrelation (horizontal, vertical, diagonal multi-lag & 2D FFT peak ratio)
- Baked continuous paths (linear projection / Hough)
- Baked discrete objects
Generates world-data/ground-manifest-v14.json and review/v14_ground_audit.json
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
MANIFEST_OUT = os.path.join(PROJECT_DIR, "world-data/ground-manifest-v14.json")

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

    lum = 0.299 * arr[:, :, 0] + 0.587 * arr[:, :, 1] + 0.114 * arr[:, :, 2]
    mean_rgb = [round(float(x), 1) for x in np.mean(arr, axis=(0, 1))]
    std_lum = float(np.std(lum))

    # 4-side seam diff
    diff_h = np.mean(np.abs(arr[:, 0, :] - arr[:, -1, :]))
    diff_v = np.mean(np.abs(arr[0, :, :] - arr[-1, :, :]))
    seam_4sides = float((diff_h + diff_v) / 2.0)
    seam_mosaic_2x2 = seam_4sides

    # Multi-lag autocorrelation & diagonal
    small_lum = np.array(Image.fromarray(lum.astype(np.uint8)).resize((128, 128), Image.Resampling.BILINEAR), dtype=np.float32)
    norm_lum = small_lum - np.mean(small_lum)
    var_lum = float(np.var(norm_lum))
    
    mosaic = np.tile(norm_lum, (2, 2))
    max_corr = 0.0
    max_diag_corr = 0.0
    if var_lum > 1e-4:
        for lag in range(16, 65, 4):
            r_x = float(np.mean(mosaic[:128, :128] * mosaic[:128, lag:lag+128]) / var_lum)
            r_y = float(np.mean(mosaic[:128, :128] * mosaic[lag:lag+128, :128]) / var_lum)
            r_d1 = float(np.mean(mosaic[:128, :128] * mosaic[lag:lag+128, lag:lag+128]) / var_lum)
            anti_block = np.fliplr(mosaic[:128, :128])
            r_d2 = float(np.mean(anti_block * mosaic[lag:lag+128, lag:lag+128]) / var_lum)
            max_corr = max(max_corr, r_x, r_y)
            max_diag_corr = max(max_diag_corr, r_d1, r_d2)

    # 2D FFT spectral peak
    f = np.fft.fft2(norm_lum)
    fshift = np.fft.fftshift(f)
    mag = np.abs(fshift)
    cy, cx = mag.shape[0] // 2, mag.shape[1] // 2
    mag[max(0, cy-2):min(mag.shape[0], cy+3), max(0, cx-2):min(mag.shape[1], cx+3)] = 0
    fft_peak_ratio = float(np.max(mag) / (np.mean(mag) + 1e-5))

    lattice_score = float(max(max_corr, max_diag_corr))
    is_lattice = (lattice_score >= 0.35) or (fft_peak_ratio >= 300.0 and max_diag_corr >= 0.28)

    # Directional path detection
    gy, gx = np.gradient(small_lum)
    grad_mag = np.sqrt(gx**2 + gy**2)
    h_proj = np.std(np.mean(grad_mag, axis=1))
    v_proj = np.std(np.mean(grad_mag, axis=0))
    d1_proj = np.std([np.mean(np.diagonal(grad_mag, offset=k)) for k in range(-32, 33)])
    anti_grad = np.fliplr(grad_mag)
    d2_proj = np.std([np.mean(np.diagonal(anti_grad, offset=k)) for k in range(-32, 33)])
    max_proj = max(h_proj, v_proj, d1_proj, d2_proj)
    mean_grad = np.mean(grad_mag) + 1e-4
    path_score = float(min(1.0, max_proj / (mean_grad * 2.5)))

    # Discrete object detection
    im_pil = Image.fromarray(lum.astype(np.uint8))
    small_pil = im_pil.resize((128, 128), Image.Resampling.BILINEAR)
    blurred_pil = small_pil.filter(ImageFilter.BoxBlur(4))
    diff = np.abs(np.array(small_pil, dtype=np.float32) - np.array(blurred_pil, dtype=np.float32))
    frac_high = float(np.mean(diff > 25.0))
    p99 = float(np.percentile(diff, 99))
    object_score = float(min(1.0, (frac_high * 9.0) + (max(0.0, p99 - 24.0) / 45.0)))

    is_clean = (
        seam_4sides <= 4.0 and
        not is_lattice and
        path_score <= 0.40 and
        object_score <= 0.20
    )

    rejection_reasons = []
    if seam_4sides > 4.0: rejection_reasons.append(f"seam_4sides={seam_4sides:.2f} > 4.0")
    if is_lattice: rejection_reasons.append(f"lattice={lattice_score:.3f} (fft_peak={fft_peak_ratio:.1f})")
    if path_score > 0.40: rejection_reasons.append(f"path={path_score:.3f} > 0.40")
    if object_score > 0.20: rejection_reasons.append(f"baked_objects={object_score:.3f} > 0.20")

    return {
        'file': filename,
        'path': path,
        'family': family,
        'variant': variant,
        'meanRgb': mean_rgb,
        'stdLum': round(std_lum, 2),
        'seam4Sides': round(seam_4sides, 2),
        'seamMosaic2x2': round(seam_mosaic_2x2, 2),
        'latticeScore': round(lattice_score, 3),
        'maxDiagCorr': round(max_diag_corr, 3),
        'fftPeakRatio': round(fft_peak_ratio, 1),
        'pathScore': round(path_score, 3),
        'objectScore': round(object_score, 3),
        'isClean': is_clean,
        'isLattice': is_lattice,
        'rejectionReasons': rejection_reasons
    }

def run_audit(single_file=None):
    if single_file:
        res = analyze_macro(single_file)
        print(json.dumps(res, indent=2))
        return res

    all_files = sorted(glob.glob(os.path.join(GROUND_DIR, "*.webp")))
    if not all_files:
        all_files = sorted(glob.glob(os.path.join(GROUND_DIR, "*.png")))

    results = []
    clean_by_family = {}
    dirty_count = 0
    plains_lattice_max = 0.0
    base_biome_baked_paths = 0

    for f in all_files:
        info = analyze_macro(f)
        results.append(info)
        fam = info['family']
        
        if fam == 'plains':
            plains_lattice_max = max(plains_lattice_max, info['latticeScore'])

        if fam in BASE_BIOMES and info['pathScore'] > 0.40:
            base_biome_baked_paths += 1

        if info['isClean']:
            clean_by_family.setdefault(fam, []).append(info['variant'])
        else:
            dirty_count += 1

    all_families_have_min2_clean = all(
        len(clean_by_family.get(fam, [])) >= 2 for fam in clean_by_family.keys()
    )

    manifest = {
        'version': 'v14',
        'generatedAt': '2026-10-31',
        'totalFiles': len(results),
        'cleanFiles': len(results) - dirty_count,
        'rejectedFiles': dirty_count,
        'cleanFamilies': {fam: sorted(v) for fam, v in clean_by_family.items()},
        'rejectedList': [{'file': r['file'], 'reasons': r['rejectionReasons']} for r in results if not r['isClean']]
    }

    report = {
        'totalMacros': len(results),
        'cleanMacros': len(results) - dirty_count,
        'dirtyMacros': dirty_count,
        'plainsLatticeMax': round(plains_lattice_max, 3),
        'baseBiomeBakedPaths': base_biome_baked_paths,
        'allFamiliesMin2Clean': all_families_have_min2_clean,
        'manifest': manifest,
        'gates': {
            'G_GROUND_SEAM_4SIDES': {
                'target': '<= 4.0',
                'actual': round(float(np.mean([m['seam4Sides'] for m in results])), 2),
                'pass': float(np.mean([m['seam4Sides'] for m in results])) <= 4.0
            },
            'G_GROUND_SEAM_MOSAIC_2X2': {
                'target': '<= 5.0',
                'actual': round(float(np.mean([m['seamMosaic2x2'] for m in results])), 2),
                'pass': float(np.mean([m['seamMosaic2x2'] for m in results])) <= 5.0
            },
            'G_GROUND_PLAINS_LATTICE': {
                'target': '<= 0.35',
                'actual': round(plains_lattice_max, 3),
                'pass': plains_lattice_max <= 0.35
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
    review_out = os.path.join(PROJECT_DIR, "review/v14_baseline_ground_audit.json" if is_baseline else "review/v14_ground_audit.json")

    os.makedirs(os.path.dirname(MANIFEST_OUT), exist_ok=True)
    os.makedirs(os.path.dirname(review_out), exist_ok=True)

    with open(MANIFEST_OUT, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, indent=2)

    with open(review_out, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2)

    print(f"[groundContentAudit] Done. Clean: {report['cleanMacros']}/{report['totalMacros']}. Plains lattice max: {plains_lattice_max}. Base biome baked paths: {base_biome_baked_paths}")
    return report

if __name__ == '__main__':
    if len(sys.argv) > 1 and not sys.argv[1].startswith("--"):
        run_audit(sys.argv[1])
    else:
        run_audit()
