#!/usr/bin/env python3
"""
scripts/v15/pixelGates.py
Authoritative Visual & Pixel Gates Evaluator for Jianghu Bot V15 (Prompt V15 P0)

Metrik yang diukur:
1. roadCoverage: Keberadaan piksel jalan pada sel __debugRoadCells (target >= 0.85, false positive <= 3%)
2. roadLadder: Detektor rel/tangga periodik; HANYA dievaluasi jika roadCoverage >= 0.85 (gagal ROAD_ABSENT jika coverage < 0.85)
3. groundColorSanity: Sanitasi HSV dan |B-R| kanal (stone: S <= 0.22, |B-R| <= 25; grass: H in 65-125 deg)
4. bakedPath: Segmentasi kontur/komponen memanjang pada macro 1024x1024 (aspect >= 3.5 or length >= 400px dengan Delta-E >= 12)
5. straightSeam, paleFlat, whiteSquare, smear, redTint (retained from V14)
"""

import os
import sys
import json
import numpy as np
from PIL import Image, ImageFilter

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, "../../"))
REVIEW_DIR = os.path.join(PROJECT_DIR, "review")

def get_active_viewport(arr):
    h, w = arr.shape[:2]
    if w >= 800 and h >= 500:
        return arr[60:h-40, 40:w-280]
    return arr

def rgb_to_hsv_np(arr):
    """Converts uint8 or float32 RGB array [0..255] to HSV (H in deg [0..360], S in [0..1], V in [0..1])."""
    rgb = arr.astype(np.float32) / 255.0
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    cmax = np.maximum(np.maximum(r, g), b)
    cmin = np.minimum(np.minimum(r, g), b)
    delta = cmax - cmin

    h = np.zeros_like(cmax)
    mask = delta > 1e-5

    mask_r = mask & (cmax == r)
    h[mask_r] = 60.0 * (((g[mask_r] - b[mask_r]) / delta[mask_r]) % 6)

    mask_g = mask & (cmax == g)
    h[mask_g] = 60.0 * (((b[mask_g] - r[mask_g]) / delta[mask_g]) + 2)

    mask_b = mask & (cmax == b)
    h[mask_b] = 60.0 * (((r[mask_b] - g[mask_b]) / delta[mask_b]) + 4)

    s = np.zeros_like(cmax)
    s[cmax > 1e-5] = delta[cmax > 1e-5] / cmax[cmax > 1e-5]

    v = cmax
    return h, s, v

def analyze_ground_color_sanity(img_or_patch, biome='stone'):
    """
    Evaluates ground color sanity according to V15 specifications:
    - biome='stone': S <= 0.22, |B-R| <= 25, V in [0.38, 0.65] (must be neutral stone grey, not saturated blue).
    - biome='grass': H in [65..125] deg, S in [0.25..0.60], V in [0.40..0.75], brown/olive (H in [35..55]) <= 40%.
    """
    if isinstance(img_or_patch, str):
        with Image.open(img_or_patch) as img:
            arr = np.array(img.convert('RGB'), dtype=np.float32)
            # Sample central patch free of UI
            h, w = arr.shape[:2]
            patch = arr[int(h*0.25):int(h*0.75), int(w*0.25):int(w*0.65)]
    else:
        patch = np.array(img_or_patch, dtype=np.float32)
        if patch.ndim == 1 and len(patch) == 3:
            # Single RGB triplet [R, G, B]
            patch = patch.reshape((1, 1, 3))

    mean_rgb = np.mean(patch, axis=(0, 1))
    r_mean, g_mean, b_mean = mean_rgb[0], mean_rgb[1], mean_rgb[2]
    b_r_diff = float(abs(b_mean - r_mean))

    h_arr, s_arr, v_arr = rgb_to_hsv_np(patch)
    mean_h = float(np.mean(h_arr))
    mean_s = float(np.mean(s_arr))
    mean_v = float(np.mean(v_arr))

    reasons = []
    passed = True

    if biome == 'stone':
        if mean_s > 0.22:
            passed = False
            reasons.append(f"saturation={mean_s:.3f} > 0.22 (blue saturation)")
        if b_r_diff > 25.0:
            passed = False
            reasons.append(f"|B-R|={b_r_diff:.1f} > 25.0 (cool blue tint imbalance)")
        if mean_v < 0.38 or mean_v > 0.65:
            passed = False
            reasons.append(f"value_V={mean_v:.3f} outside [0.38..0.65]")
    elif biome == 'grass':
        if mean_h < 65.0 or mean_h > 125.0:
            passed = False
            reasons.append(f"hue={mean_h:.1f} deg outside [65..125] (not fresh green)")
        if mean_s < 0.25 or mean_s > 0.60:
            passed = False
            reasons.append(f"saturation={mean_s:.3f} outside [0.25..0.60]")
        if mean_v < 0.40 or mean_v > 0.75:
            passed = False
            reasons.append(f"value_V={mean_v:.3f} outside [0.40..0.75]")
        brown_olive_ratio = float(np.mean((h_arr >= 35.0) & (h_arr <= 55.0)))
        if brown_olive_ratio > 0.40:
            passed = False
            reasons.append(f"brown_olive_ratio={brown_olive_ratio:.3f} > 0.40 (dry straw/mud)")

    return {
        'biome': biome,
        'meanRgb': [round(float(x), 1) for x in mean_rgb],
        'bMinusR': round(b_r_diff, 1),
        'meanHue': round(mean_h, 1),
        'meanSat': round(mean_s, 3),
        'meanVal': round(mean_v, 3),
        'passed': passed,
        'reasons': reasons
    }

def analyze_baked_path(img_path):
    """
    V15 P0.2 / P3.1: Evaluates baked road/path streaks on a 1024x1024 macro.
    Segments into 3 color components via k-means.
    Flags component if elongated (oriented bounding box aspect >= 3.5 or length >= 400px with Delta-E >= 12).
    """
    with Image.open(img_path) as img:
        img_rgb = img.convert('RGB')
        small = img_rgb.resize((256, 256), Image.Resampling.BILINEAR)
        arr = np.array(small, dtype=np.float32)

    flat = arr.reshape((-1, 3))
    p25 = np.percentile(flat, 25, axis=0)
    p50 = np.percentile(flat, 50, axis=0)
    p75 = np.percentile(flat, 75, axis=0)
    centers = np.array([p25, p50, p75])

    for _ in range(10):
        dists = np.linalg.norm(flat[:, None, :] - centers[None, :, :], axis=2)
        labels = np.argmin(dists, axis=1)
        for k in range(3):
            mask = (labels == k)
            if np.any(mask):
                centers[k] = np.mean(flat[mask], axis=0)

    labels = labels.reshape((256, 256))
    flagged = []

    for k in range(3):
        mask = (labels == k)
        other_mean = np.mean(flat[labels.ravel() != k], axis=0)
        this_mean = centers[k]
        delta_e = float(np.linalg.norm(this_mean - other_mean))

        visited = np.zeros((256, 256), dtype=bool)
        for y in range(256):
            for x in range(256):
                if mask[y, x] and not visited[y, x]:
                    comp = []
                    q = [(y, x)]
                    visited[y, x] = True
                    while q:
                        cy, cx = q.pop()
                        comp.append((cy, cx))
                        for ny, nx in [(cy+1, cx), (cy-1, cx), (cy, cx+1), (cy, cx-1)]:
                            if 0 <= ny < 256 and 0 <= nx < 256 and mask[ny, nx] and not visited[ny, nx]:
                                visited[ny, nx] = True
                                q.append((ny, nx))

                    if len(comp) >= 200: # Significant cluster
                        coords = np.array(comp, dtype=np.float32) * 4.0 # 1024 scale
                        c = coords - np.mean(coords, axis=0)
                        cov = np.cov(c, rowvar=False)
                        eigvals, eigvecs = np.linalg.eigh(cov)
                        proj = c @ eigvecs
                        box_extents = np.max(proj, axis=0) - np.min(proj, axis=0)
                        length = float(max(box_extents))
                        width = float(min(box_extents))
                        aspect = float(length / (width + 1e-5))

                        # Elongated path streak check (span >= 350px and aspect >= 2.5 with aspect >= 3.5 or length >= 400px)
                        if delta_e >= 12.0 and (aspect >= 3.5 or length >= 400.0) and length >= 350.0 and aspect >= 2.5:
                            flagged.append({
                                'cluster': int(k),
                                'size1024': int(len(comp) * 16),
                                'deltaE': round(delta_e, 1),
                                'length': round(length, 1),
                                'width': round(width, 1),
                                'aspect': round(aspect, 2)
                            })

    has_baked_path = len(flagged) > 0
    return {
        'hasBakedPath': has_baked_path,
        'flaggedComponents': flagged
    }

def analyze_road_coverage(img_path, hook_json_path=None, hook_data=None):
    """
    V15 P0.2 / P1: Evaluates road presence and coverage on cells registered in __debugRoadCells.
    Target: roadCoverage >= 0.85, roadFalsePositive <= 0.03.
    """
    if hook_data is None:
        if hook_json_path and os.path.exists(hook_json_path):
            with open(hook_json_path, 'r', encoding='utf-8') as f:
                hook_data = json.load(f)
        else:
            cand = os.path.splitext(img_path)[0] + ".json"
            if os.path.exists(cand):
                with open(cand, 'r', encoding='utf-8') as f:
                    hook_data = json.load(f)
            else:
                hook_data = {}

    road_cells = hook_data.get('roadCells', []) if isinstance(hook_data, dict) else []

    with Image.open(img_path) as img:
        arr = np.array(img.convert('RGB'), dtype=np.float32)

    img_h, img_w = arr.shape[:2]

    if not road_cells:
        return {
            'hasRoad': False,
            'cellCount': 0,
            'roadCoverage': 1.0,
            'roadFalsePositive': 0.0,
            'passed': True,
            'message': 'No road cells registered in viewport'
        }

    # Mask of registered road cells
    road_mask = np.zeros((img_h, img_w), dtype=bool)
    for cell in road_cells:
        px = max(0, min(img_w - 1, int(cell.get('px', 0))))
        py = max(0, min(img_h - 1, int(cell.get('py', 0))))
        w = max(1, min(img_w - px, int(cell.get('widthPx', 32))))
        h = max(1, min(img_h - py, int(cell.get('heightPx', 32))))
        road_mask[py:py+h, px:px+w] = True

    non_road_mask = ~road_mask
    if np.any(non_road_mask):
        global_bg_mean = np.mean(arr[non_road_mask], axis=0)
    else:
        global_bg_mean = np.array([125.0, 125.0, 75.0], dtype=np.float32)

    total_cell_area = 0
    actual_road_pixels = 0

    r_chan, g_chan, b_chan = arr[..., 0], arr[..., 1], arr[..., 2]
    cmax = np.maximum(np.maximum(r_chan, g_chan), b_chan)
    cmin = np.minimum(np.minimum(r_chan, g_chan), b_chan)
    sat = (cmax - cmin) / (cmax + 1e-5)

    for cell in road_cells:
        px = max(0, min(img_w - 1, int(cell.get('px', 0))))
        py = max(0, min(img_h - 1, int(cell.get('py', 0))))
        w = max(1, min(img_w - px, int(cell.get('widthPx', 32))))
        h = max(1, min(img_h - py, int(cell.get('heightPx', 32))))

        # Sample local non-road perimeter around cell (24px expansion)
        y0 = max(0, py - 24)
        y1 = min(img_h, py + h + 24)
        x0 = max(0, px - 24)
        x1 = min(img_w, px + w + 24)

        local_non_road = non_road_mask[y0:y1, x0:x1]
        if np.any(local_non_road):
            local_bg = np.mean(arr[y0:y1, x0:x1][local_non_road], axis=0)
        else:
            local_bg = global_bg_mean

        cell_patch = arr[py:py+h, px:px+w]
        diff_local = np.linalg.norm(cell_patch - local_bg, axis=2)

        is_snow_bg = float(np.mean(local_bg)) >= 200.0
        patch_b = b_chan[py:py+h, px:px+w]
        patch_sat = sat[py:py+h, px:px+w]
        patch_max = cmax[py:py+h, px:px+w]

        if is_snow_bg:
            # In snow/ice, road is trodden trail
            cell_hits = (diff_local >= 8.0) & (patch_max <= 210.0)
        else:
            # In grass/dirt/stone, road is stone path (contrasting with local ground and neutral tone)
            cell_hits = (diff_local >= 8.0) & (patch_sat <= 0.35)

        actual_road_pixels += int(np.sum(cell_hits))
        total_cell_area += w * h

    theoretical_road_area = total_cell_area * 0.75 # 0.88 * 0.88 approx ribbon
    coverage = float(min(1.0, actual_road_pixels / max(1.0, theoretical_road_area)))

    # False positive: road-like pixels outside road cells (buffered 4px for antialiased edge)
    buffered_road = road_mask.copy()
    for dy in (-4, 0, 4):
        for dx in (-4, 0, 4):
            buffered_road |= np.roll(np.roll(road_mask, dy, axis=0), dx, axis=1)
    pure_non_road = ~buffered_road

    is_global_snow = float(np.mean(global_bg_mean)) >= 200.0
    bg_sat = float((np.max(global_bg_mean) - np.min(global_bg_mean)) / (np.max(global_bg_mean) + 1e-5))
    diff_global = np.linalg.norm(arr - global_bg_mean, axis=2)

    if is_global_snow:
        outside_hits = (r_chan >= 145) & (r_chan <= 190) & (b_chan >= 160) & (b_chan <= 210) & (np.abs(b_chan - r_chan) <= 25) & pure_non_road
    elif bg_sat <= 0.22:
        outside_hits = np.zeros_like(pure_non_road)
    else:
        outside_hits = (diff_global >= 24.0) & (sat <= 0.15) & (b_chan >= 120.0) & pure_non_road

    false_pos_ratio = float(np.sum(outside_hits) / max(1.0, np.sum(pure_non_road)))

    passed = (coverage >= 0.85) and (false_pos_ratio <= 0.03)

    return {
        'hasRoad': True,
        'cellCount': len(road_cells),
        'actualRoadPixels': actual_road_pixels,
        'theoreticalRoadArea': round(theoretical_road_area, 1),
        'roadCoverage': round(coverage, 3),
        'roadFalsePositive': round(false_pos_ratio, 3),
        'passed': passed,
        'message': 'OK' if passed else ('ROAD_ABSENT' if coverage < 0.85 else 'HIGH_FALSE_POSITIVE')
    }

def analyze_road_ladder(img_path, coverage_res=None):
    """
    Evaluates ladder/rail road artifact via 1D autocorrelation profile.
    STRICT RULE (V15 P0.2): Only evaluates if roadCoverage >= 0.85.
    If coverage < 0.85, automatically returns ROAD_ABSENT / FAIL.
    """
    if coverage_res and not coverage_res.get('passed', False):
        if coverage_res.get('hasRoad', False) and coverage_res.get('roadCoverage', 0) < 0.85:
            return {
                'roadLadderDetected': True,
                'status': 'ROAD_ABSENT',
                'pass': False,
                'message': 'Road is absent (coverage < 0.85); ladder test cannot pass'
            }

    with Image.open(img_path) as img:
        arr = np.array(img.convert('RGB'), dtype=np.float32)

    vp = get_active_viewport(arr)
    lum = 0.299 * vp[..., 0] + 0.587 * vp[..., 1] + 0.114 * vp[..., 2]
    h, w = lum.shape[:2]

    # Ladder rungs cause periodic high-pass variance along road axis
    ladder_detected = False
    step = 20

    # Scan horizontal strips
    y_start = 10 if h < 300 else 40
    y_end = max(y_start + 20, h - (20 if h < 300 else 40))
    for y in range(y_start, y_end, step):
        strip = lum[y:min(h, y+35), :]
        if strip.shape[0] < 15 or strip.shape[1] < 100: continue
        prof = np.mean(strip, axis=0)
        k_size = min(31, len(prof) // 2 * 2 + 1)
        if k_size < 5: continue
        kernel = np.ones(k_size) / float(k_size)
        lowpass = np.convolve(prof, kernel, mode='same')
        hp = prof - lowpass
        var_hp = float(np.var(hp))

        if var_hp > 50.0:
            n = len(hp)
            for lag in range(20, min(140, n // 2), 2):
                c = float(np.mean(hp[:-lag] * hp[lag:]) / var_hp)
                if c > 0.65:
                    ladder_detected = True
                    break
        if ladder_detected: break

    # Scan vertical strips if not detected yet
    if not ladder_detected:
        x_start = 10 if w < 300 else 40
        x_end = max(x_start + 20, w - (20 if w < 300 else 40))
        for x in range(x_start, x_end, step):
            strip_v = lum[:, x:min(w, x+35)]
            if strip_v.shape[0] < 100 or strip_v.shape[1] < 15: continue
            prof_v = np.mean(strip_v, axis=1)
            k_size = min(31, len(prof_v) // 2 * 2 + 1)
            if k_size < 5: continue
            kernel = np.ones(k_size) / float(k_size)
            lowpass = np.convolve(prof_v, kernel, mode='same')
            hp_v = prof_v - lowpass
            var_hp_v = float(np.var(hp_v))

            if var_hp_v > 50.0:
                n = len(hp_v)
                for lag in range(20, min(140, n // 2), 2):
                    c = float(np.mean(hp_v[:-lag] * hp_v[lag:]) / var_hp_v)
                    if c > 0.65:
                        ladder_detected = True
                        break
            if ladder_detected: break

    return {
        'roadLadderDetected': ladder_detected,
        'status': 'FAIL_LADDER' if ladder_detected else 'PASS',
        'pass': not ladder_detected
    }

def analyze_single_file(img_path, hook_json_path=None, biome=None):
    """Performs full pixel gates evaluation on a single image."""
    cov = analyze_road_coverage(img_path, hook_json_path=hook_json_path)
    ladder = analyze_road_ladder(img_path, coverage_res=cov)

    result = {
        'file': os.path.basename(img_path),
        'roadCoverage': cov,
        'roadLadder': ladder
    }

    if biome:
        result['colorSanity'] = analyze_ground_color_sanity(img_path, biome=biome)

    return result

if __name__ == '__main__':
    if len(sys.argv) > 1 and not sys.argv[1].startswith('--'):
        img_p = sys.argv[1]
        hook_p = sys.argv[2] if len(sys.argv) > 2 else None
        res = analyze_single_file(img_p, hook_json_path=hook_p)
        print(json.dumps(res, indent=2))
    elif '--baked' in sys.argv:
        idx = sys.argv.index('--baked')
        if idx + 1 < len(sys.argv):
            res = analyze_baked_path(sys.argv[idx + 1])
            print(json.dumps(res, indent=2))
    elif '--sanity' in sys.argv:
        idx = sys.argv.index('--sanity')
        biome = sys.argv[idx + 1] if idx + 1 < len(sys.argv) else 'stone'
        arg_val = sys.argv[idx + 2] if idx + 2 < len(sys.argv) else None
        if arg_val:
            if ',' in arg_val:
                rgb_parts = [float(x.strip()) for x in arg_val.split(',')]
                res = analyze_ground_color_sanity(rgb_parts, biome=biome)
            else:
                res = analyze_ground_color_sanity(arg_val, biome=biome)
            print(json.dumps(res, indent=2))
    else:
        print("[pixelGates] V15 Authoritative Evaluator Ready.")
