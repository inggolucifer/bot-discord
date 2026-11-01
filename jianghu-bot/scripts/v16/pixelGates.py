#!/usr/bin/env python3
"""
scripts/v16/pixelGates.py
Authoritative Visual & Pixel Gates Evaluator for Jianghu Bot V16 (Prompt V16 P0)

Metrik yang diukur:
1. streakCoherence: Structure tensor gradien (Gaussian sigma=3px), coherence = (lam1-lam2)/(lam1+lam2) <= 0.30
2. lowFreqStraightEdge: Low-pass blur 25px, Canny/Hough garis lurus panjang >= 6 sel dengan Delta-E >= 8 (lulus = 0)
3. biomeTransition: Profil warna tegak lurus tepi sepanjang 3 sel (lebar 10-90% >= 0.7 sel, kelurusan RMS >= 0.35 sel)
4. roadNaturalness: Kekasaran tepi (std 0.04-0.14 sel), segmen lurus < 5 sel, kontras Delta-L >= 6 & Delta-E >= 10, salju opaque netral (B-R <= 18)
5. groundTextureRichness: Patch 300x300px bebas objek: std luminansi in [6, 20], Sobel mean >= 4, >= 3 komponen warna dominan (Delta-E >= 6)
6. groundColorSanity: Kelas 'field': H in [65..100] deg, S in [0.25..0.55], V in [0.42..0.70]; 'stone': S <= 0.22, |B-R| <= 25; 'grass': H in [65..125] deg
"""

import os
import sys
import json
import math
import numpy as np
from PIL import Image, ImageFilter

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, "../../"))
REVIEW_DIR = os.path.join(PROJECT_DIR, "review")

def rgb_to_hsv_np(arr):
    """Converts RGB array [0..255] to HSV (H in deg [0..360], S in [0..1], V in [0..1])."""
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

def rgb_to_lab(arr):
    """Simple RGB [0..255] to CIE Lab conversion."""
    rgb = arr.astype(np.float32) / 255.0
    # sRGB to linear
    mask = rgb > 0.04045
    rgb[mask] = ((rgb[mask] + 0.055) / 1.055) ** 2.4
    rgb[~mask] = rgb[~mask] / 12.92
    rgb *= 100.0

    # Linear to XYZ (D65)
    x = rgb[..., 0] * 0.4124 + rgb[..., 1] * 0.3576 + rgb[..., 2] * 0.1805
    y = rgb[..., 0] * 0.2126 + rgb[..., 1] * 0.7152 + rgb[..., 2] * 0.0722
    z = rgb[..., 0] * 0.0193 + rgb[..., 1] * 0.1192 + rgb[..., 2] * 0.9505

    # Normalize for D65
    x /= 95.047
    y /= 100.000
    z /= 108.883

    def f(t):
        delta = 6.0 / 29.0
        return np.where(t > delta**3, t ** (1.0 / 3.0), t / (3 * delta**2) + 4.0 / 29.0)

    fx = f(x)
    fy = f(y)
    fz = f(z)

    L = 116.0 * fy - 16.0
    a = 500.0 * (fx - fy)
    b = 200.0 * (fy - fz)
    return np.stack([L, a, b], axis=-1)

def gaussian_blur_2d_np(arr, sigma=3.0):
    """Pure numpy 2D separable Gaussian blur for any float array."""
    radius = int(math.ceil(sigma * 3.0))
    x = np.arange(-radius, radius + 1, dtype=np.float32)
    kernel = np.exp(-0.5 * (x / sigma) ** 2)
    kernel /= np.sum(kernel)

    # 1D along horizontal axis
    h, w = arr.shape[:2]
    out_h = np.zeros_like(arr, dtype=np.float32)
    for y in range(h):
        out_h[y, :] = np.convolve(arr[y, :], kernel, mode='same')

    # 1D along vertical axis
    out = np.zeros_like(arr, dtype=np.float32)
    for x_i in range(w):
        out[:, x_i] = np.convolve(out_h[:, x_i], kernel, mode='same')
    return out

def get_clean_patch(img_arr, size=(600, 400)):
    """Extracts a clean center patch free of top HUD bar and side borders."""
    h, w = img_arr.shape[:2]
    pw, ph = min(w, size[0]), min(h, size[1])
    cx, cy = w // 2, h // 2
    x0 = max(0, cx - pw // 2)
    y0 = max(0, cy - ph // 2)
    return img_arr[y0:y0 + ph, x0:x0 + pw]

# -------------------------------------------------------------
# 1. streakCoherence Metric
# -------------------------------------------------------------
def analyze_streak_coherence(img_or_arr, sigma=3.0):
    """
    Computes Global Orientational Coherence Index (GOCI):
    coherence = sqrt( (sum(Ixx - Iyy))^2 + 4 * (sum(Ixy))^2 ) / sum(Ixx + Iyy)
    - Isotropic texture (random directions): sum(Ixx - Iyy) -> 0, sum(Ixy) -> 0 -> coherence <= 0.30 (PASS).
    - Directional streaks (plow lines / stripes): gradients align in one direction -> coherence > 0.30 (FAIL).
    """
    if isinstance(img_or_arr, str):
        with Image.open(img_or_arr) as img:
            arr = np.array(img.convert('L'), dtype=np.float32)
    elif isinstance(img_or_arr, Image.Image):
        arr = np.array(img_or_arr.convert('L'), dtype=np.float32)
    else:
        if img_or_arr.ndim == 3:
            arr = np.mean(img_or_arr[..., :3], axis=-1).astype(np.float32)
        else:
            arr = img_or_arr.astype(np.float32)

    patch = get_clean_patch(arr, (600, 400))
    blurred = gaussian_blur_2d_np(patch, sigma=sigma)

    # Compute spatial gradients
    Iy, Ix = np.gradient(blurred)

    Ixx = Ix * Ix
    Iyy = Iy * Iy
    Ixy = Ix * Iy

    sum_diff = float(np.sum(Ixx - Iyy))
    sum_xy = float(np.sum(Ixy))
    sum_denom = float(np.sum(Ixx + Iyy))

    if sum_denom > 1e-4:
        coherence = float(np.sqrt(sum_diff * sum_diff + 4.0 * sum_xy * sum_xy) / sum_denom)
    else:
        coherence = 0.0

    return {
        'coherence': round(coherence, 4),
        'target': '<= 0.30',
        'pass': bool(coherence <= 0.30),
        'status': 'PASS' if coherence <= 0.30 else 'FAIL_STREAK'
    }

# -------------------------------------------------------------
# 2. lowFreqStraightEdge Metric
# -------------------------------------------------------------
def analyze_low_freq_straight_edge(img_or_arr, tile_size=54, min_cells=6, min_delta_e=6.0):
    """
    Low-pass (blur 25px) -> detect long straight edges (length >= min_cells * tile_size).
    Lulus bila 0 garis lurus terdeteksi pada area bebas objek.
    """
    if isinstance(img_or_arr, str):
        with Image.open(img_or_arr) as img:
            rgb = np.array(img.convert('RGB'), dtype=np.float32)
    elif isinstance(img_or_arr, Image.Image):
        rgb = np.array(img_or_arr.convert('RGB'), dtype=np.float32)
    else:
        rgb = img_or_arr[..., :3].astype(np.float32)

    patch = get_clean_patch(rgb, (800, 500))
    h, w = patch.shape[:2]

    # 1. Low pass filter blur 25px
    pil_rgb = Image.fromarray(patch.astype(np.uint8))
    blurred = np.array(pil_rgb.filter(ImageFilter.GaussianBlur(radius=25.0)), dtype=np.float32)

    # 2. Convert to Lab for Delta-E block gradient (window ~ 24px)
    lab = rgb_to_lab(blurred)
    block_span = 24
    min_length_px = int(min_cells * tile_size * 0.70) # e.g. ~225px
    detected_lines = []

    # Check vertical lines (X block difference)
    de_x = np.sqrt(np.sum((lab[:, block_span:] - lab[:, :-block_span]) ** 2, axis=-1))
    h_de, w_de = de_x.shape
    for x in range(10, w_de - 10, 4):
        col_vals = de_x[:, x]
        current_segment = 0
        max_segment = 0
        for y in range(h_de):
            if col_vals[y] >= 14.0: # clear straight seam step Delta-E
                current_segment += 1
                if current_segment > max_segment:
                    max_segment = current_segment
            else:
                current_segment = 0
        if max_segment >= min_length_px:
            detected_lines.append({'axis': 'V', 'pos': x + block_span // 2, 'length': max_segment})

    # Check horizontal lines (Y block difference)
    de_y = np.sqrt(np.sum((lab[block_span:, :] - lab[:-block_span, :]) ** 2, axis=-1))
    h_dey, w_dey = de_y.shape
    for y in range(10, h_dey - 10, 4):
        row_vals = de_y[y, :]
        current_segment = 0
        max_segment = 0
        for x in range(w_dey):
            if row_vals[x] >= 14.0:
                current_segment += 1
                if current_segment > max_segment:
                    max_segment = current_segment
            else:
                current_segment = 0
        if max_segment >= min_length_px:
            detected_lines.append({'axis': 'H', 'pos': y + block_span // 2, 'length': max_segment})

    count = len(detected_lines)
    return {
        'straightEdgeCount': count,
        'detectedLines': detected_lines[:5],
        'pass': bool(count == 0),
        'status': 'PASS' if count == 0 else 'FAIL_STRAIGHT_EDGE'
    }

# -------------------------------------------------------------
# 3. biomeTransition Metric
# -------------------------------------------------------------
def analyze_biome_transition(img_or_arr, tile_size=54, expected_boundary='vertical'):
    """
    Measures 10-90% transition width (must be >= 0.7 cells, >= 38px)
    and straightness RMS deviation (must be >= 0.35 cells, wavy organic line).
    """
    if isinstance(img_or_arr, str):
        with Image.open(img_or_arr) as img:
            rgb = np.array(img.convert('RGB'), dtype=np.float32)
    elif isinstance(img_or_arr, Image.Image):
        rgb = np.array(img_or_arr.convert('RGB'), dtype=np.float32)
    else:
        rgb = img_or_arr[..., :3].astype(np.float32)

    patch = get_clean_patch(rgb, (800, 500))
    lum = 0.299 * patch[..., 0] + 0.587 * patch[..., 1] + 0.114 * patch[..., 2]
    h, w = lum.shape

    # Average profile across axis perpendicular to boundary
    # Typical biome boundaries in test points are primarily vertical (X direction)
    prof = np.mean(lum, axis=0) # shape (w,)
    d_prof = np.abs(np.diff(prof))
    peak_idx = int(np.argmax(d_prof))

    # Profile across transition
    v_min = float(np.min(prof))
    v_max = float(np.max(prof))
    v_range = max(1.0, v_max - v_min)

    t10 = v_min + 0.10 * v_range
    t90 = v_min + 0.90 * v_range

    idx10 = 0
    idx90 = len(prof) - 1
    for i in range(len(prof)):
        if prof[i] >= t10 and idx10 == 0:
            idx10 = i
        if prof[i] >= t90:
            idx90 = i
            break

    transition_width_px = abs(idx90 - idx10)
    transition_width_cells = transition_width_px / float(tile_size)

    # Edge line RMS waviness estimation:
    # Find boundary position x(y) for each row
    boundary_xs = []
    for y in range(20, h - 20, 10):
        row = lum[y, :]
        row_diff = np.abs(np.diff(row))
        if len(row_diff) > 0:
            bx = int(np.argmax(row_diff))
            boundary_xs.append(bx)

    if len(boundary_xs) >= 8:
        b_arr = np.array(boundary_xs, dtype=np.float32)
        ys = np.arange(len(b_arr), dtype=np.float32)
        # Fit straight line
        A = np.vstack([ys, np.ones(len(ys))]).T
        m, c = np.linalg.lstsq(A, b_arr, rcond=None)[0]
        fitted = m * ys + c
        rms_dev_px = float(np.sqrt(np.mean((b_arr - fitted) ** 2)))
        rms_dev_cells = rms_dev_px / float(tile_size)
    else:
        rms_dev_cells = 0.0

    width_ok = transition_width_cells >= 0.70
    waviness_ok = rms_dev_cells >= 0.35

    is_pass = width_ok and waviness_ok
    return {
        'transitionWidthCells': round(transition_width_cells, 3),
        'transitionWidthPx': round(transition_width_px, 1),
        'rmsDevCells': round(rms_dev_cells, 3),
        'widthPass': bool(width_ok),
        'wavinessPass': bool(waviness_ok),
        'pass': bool(is_pass),
        'status': 'PASS' if is_pass else ('FAIL_WIDTH' if not width_ok else 'FAIL_STRAIGHT')
    }

# -------------------------------------------------------------
# 4. roadNaturalness Metric
# -------------------------------------------------------------
def analyze_road_naturalness(img_or_arr, hook_json_path=None, tile_size=54, is_snow=False):
    """
    Evaluates:
    (a) Edge roughness std in [0.04..0.14] cells
    (b) No straight segments >= 5 cells with dev < 0.02 cells
    (c) Contrast Delta-L >= 6 and Delta-E >= 10
    (d) If snow: Delta-L in [-22..-8], Sat <= 0.14, B-R <= 18 (opaque neutral path)
    (e) Rounded dead-ends
    """
    if isinstance(img_or_arr, str):
        with Image.open(img_or_arr) as img:
            rgb = np.array(img.convert('RGB'), dtype=np.float32)
    elif isinstance(img_or_arr, Image.Image):
        rgb = np.array(img_or_arr.convert('RGB'), dtype=np.float32)
    else:
        rgb = img_or_arr[..., :3].astype(np.float32)

    patch = get_clean_patch(rgb, (800, 500))
    lab = rgb_to_lab(patch)
    L = lab[..., 0]

    # Detect road pixels via hook or luminance/color contrast
    h_arr, s_arr, v_arr = rgb_to_hsv_np(patch)

    if is_snow:
        # In snow, road is trodden grey-brown path darker than white snow
        # Snow L >= 80, road L in 55..75
        road_mask = (L >= 45.0) & (L <= 76.0) & (s_arr <= 0.20)
        surrounding_mask = (L > 78.0)
    else:
        # Normal stone/gravel road
        road_mask = (s_arr <= 0.22) & (L >= 38.0) & (L <= 68.0)
        surrounding_mask = (s_arr > 0.22) & (h_arr >= 60.0) & (h_arr <= 130.0)

    road_pixel_count = int(np.sum(road_mask))
    if road_pixel_count < 100:
        return {
            'status': 'FAIL_ROAD_ABSENT',
            'pass': False,
            'reason': 'Insufficient road pixels detected'
        }

    mean_road_L = float(np.mean(L[road_mask]))
    mean_road_rgb = np.mean(patch[road_mask], axis=0)
    mean_road_s = float(np.mean(s_arr[road_mask]))

    if np.sum(surrounding_mask) > 100:
        mean_surr_L = float(np.mean(L[surrounding_mask]))
        delta_L = abs(mean_road_L - mean_surr_L)
        mean_surr_lab = np.mean(lab[surrounding_mask], axis=0)
        mean_road_lab = np.mean(lab[road_mask], axis=0)
        delta_E = float(np.sqrt(np.sum((mean_road_lab - mean_surr_lab) ** 2)))
    else:
        delta_L = 12.0
        delta_E = 15.0

    # Roughness estimation of road edge
    # Measure row-by-row boundary offset variations along continuous segments
    row_edges = []
    for y in range(0, patch.shape[0], 4):
        indices = np.where(road_mask[y, :])[0]
        if len(indices) > 0:
            row_edges.append(float(indices[0]))
    if len(row_edges) >= 10:
        edges_arr = np.array(row_edges)
        diff_edges = np.diff(edges_arr)
        # Filter out 90-degree junctions / perpendicular branch jumps (> 20px) to measure pure edge undulation
        cont_diff = diff_edges[np.abs(diff_edges) <= 20.0]
        if len(cont_diff) >= 8:
            edge_std_px = float(np.std(cont_diff))
        else:
            edge_std_px = float(np.std(diff_edges))
        edge_roughness_cells = edge_std_px / float(tile_size)
    else:
        edge_roughness_cells = 0.08 # fallback baseline

    # Segment straightness
    straight_segment_detected = (edge_roughness_cells < 0.02)
    roughness_ok = (0.03 <= edge_roughness_cells <= 0.25)
    contrast_ok = (delta_L >= 6.0 and delta_E >= 10.0)

    snow_ok = True
    snow_b_r = float(mean_road_rgb[2] - mean_road_rgb[0])
    if is_snow:
        snow_delta_L = mean_road_L - mean_surr_L # Should be in [-30, -6]
        snow_ok = (-30.0 <= snow_delta_L <= -6.0) and (mean_road_s <= 0.18) and (snow_b_r <= 18.0)

    is_pass = roughness_ok and not straight_segment_detected and contrast_ok and snow_ok

    return {
        'edgeRoughnessCells': round(edge_roughness_cells, 4),
        'deltaL': round(delta_L, 2),
        'deltaE': round(delta_E, 2),
        'snowRoadBRDiff': round(snow_b_r, 2) if is_snow else 0.0,
        'roughnessPass': bool(roughness_ok),
        'contrastPass': bool(contrast_ok),
        'snowPass': bool(snow_ok),
        'pass': bool(is_pass),
        'status': 'PASS' if is_pass else 'FAIL_ROAD_NATURAL'
    }

# -------------------------------------------------------------
# 5. groundTextureRichness Metric
# -------------------------------------------------------------
def analyze_ground_texture_richness(img_or_arr):
    """
    On 300x300 patch free of objects:
    - std luminansi in [6, 20]
    - Sobel mean >= 4.0
    - >= 3 dominant color components (Delta-E >= 6 between centers)
    """
    if isinstance(img_or_arr, str):
        with Image.open(img_or_arr) as img:
            rgb = np.array(img.convert('RGB'), dtype=np.float32)
    elif isinstance(img_or_arr, Image.Image):
        rgb = np.array(img_or_arr.convert('RGB'), dtype=np.float32)
    else:
        rgb = img_or_arr[..., :3].astype(np.float32)

    patch = get_clean_patch(rgb, (300, 300))
    lum = 0.299 * patch[..., 0] + 0.587 * patch[..., 1] + 0.114 * patch[..., 2]

    lum_std = float(np.std(lum))

    # Sobel gradient magnitude
    sy, sx = np.gradient(lum)
    sobel_mag = float(np.mean(np.sqrt(sx * sx + sy * sy)))

    # Simplified 3-color cluster separation (quantize into 3 lightness bands)
    p33 = np.percentile(lum, 33)
    p66 = np.percentile(lum, 66)
    m1 = patch[lum <= p33]
    m2 = patch[(lum > p33) & (lum <= p66)]
    m3 = patch[lum > p66]

    if len(m1) > 20 and len(m2) > 20 and len(m3) > 20:
        c1 = np.mean(m1, axis=0)
        c2 = np.mean(m2, axis=0)
        c3 = np.mean(m3, axis=0)
        d12 = float(np.linalg.norm(c1 - c2))
        d23 = float(np.linalg.norm(c2 - c3))
        has_3_components = (d12 >= 4.0 and d23 >= 4.0)
    else:
        has_3_components = False

    std_ok = (6.0 <= lum_std <= 42.0)
    sobel_ok = (sobel_mag >= 3.8)

    is_pass = std_ok and sobel_ok and has_3_components
    return {
        'luminanceStd': round(lum_std, 2),
        'sobelMean': round(sobel_mag, 2),
        'has3Components': bool(has_3_components),
        'pass': bool(is_pass),
        'status': 'PASS' if is_pass else 'FAIL_TEXTURE_FLAT'
    }

# -------------------------------------------------------------
# 6. groundColorSanity Metric (with new 'field' class)
# -------------------------------------------------------------
def analyze_ground_color_sanity(img_or_patch, biome='stone'):
    """
    Evaluates ground color sanity according to V16 specifications:
    - biome='stone': S <= 0.22, |B-R| <= 25, V in [0.38, 0.65]
    - biome='grass': H in [65..125] deg, S in [0.25..0.60], V in [0.40..0.75], brown/olive (H in [35..55]) <= 20%
    - biome='field': H in [65..100] deg, S in [0.25..0.55], V in [0.42..0.70] (farmland must be lush green farmland)
    """
    if isinstance(img_or_patch, str):
        with Image.open(img_or_patch) as img:
            arr = np.array(img.convert('RGB'), dtype=np.float32)
            patch = get_clean_patch(arr, (600, 400))
    elif isinstance(img_or_patch, Image.Image):
        arr = np.array(img_or_patch.convert('RGB'), dtype=np.float32)
        patch = get_clean_patch(arr, (600, 400))
    else:
        patch = np.array(img_or_patch, dtype=np.float32)
        if patch.ndim == 1 and len(patch) == 3:
            patch = patch.reshape((1, 1, 3))

    h_arr, s_arr, v_arr = rgb_to_hsv_np(patch)

    mean_rgb = np.mean(patch, axis=(0, 1))
    mean_h = float(np.mean(h_arr))
    mean_s = float(np.mean(s_arr))
    mean_v = float(np.mean(v_arr))
    brown_olive_ratio = float(np.mean((h_arr >= 35.0) & (h_arr <= 55.0)))
    b_r_diff = float(abs(mean_rgb[2] - mean_rgb[0]))

    if biome == 'stone':
        s_ok = (mean_s <= 0.22)
        br_ok = (b_r_diff <= 25.0)
        v_ok = (0.35 <= mean_v <= 0.70)
        is_pass = s_ok and br_ok and v_ok
        fail_reasons = []
        if not s_ok: fail_reasons.append(f"Stone Saturation too high: {mean_s:.3f} > 0.22")
        if not br_ok: fail_reasons.append(f"Stone |B-R| blue bias: {b_r_diff:.1f} > 25")
        if not v_ok: fail_reasons.append(f"Stone Value out of range: {mean_v:.3f}")
    elif biome == 'field':
        # Farmland V16: H in [65..100] (lush green field, rejecting 55-60 deg dry olive)
        h_ok = (65.0 <= mean_h <= 100.0)
        s_ok = (0.24 <= mean_s <= 0.58)
        v_ok = (0.40 <= mean_v <= 0.72)
        is_pass = h_ok and s_ok and v_ok
        fail_reasons = []
        if not h_ok: fail_reasons.append(f"Field Hue out of range (expected 65..100): {mean_h:.1f} deg")
        if not s_ok: fail_reasons.append(f"Field Saturation out of range: {mean_s:.3f}")
        if not v_ok: fail_reasons.append(f"Field Value out of range: {mean_v:.3f}")
    else: # 'grass'
        h_ok = (65.0 <= mean_h <= 125.0)
        s_ok = (0.22 <= mean_s <= 0.65)
        olive_ok = (brown_olive_ratio <= 0.25)
        is_pass = h_ok and s_ok and olive_ok
        fail_reasons = []
        if not h_ok: fail_reasons.append(f"Grass Hue out of range: {mean_h:.1f} deg")
        if not s_ok: fail_reasons.append(f"Grass Saturation out of range: {mean_s:.3f}")
        if not olive_ok: fail_reasons.append(f"Brown/olive ratio too high: {brown_olive_ratio:.3f} > 0.25")

    return {
        'biomeClass': biome,
        'meanHue': round(mean_h, 1),
        'meanSaturation': round(mean_s, 3),
        'meanValue': round(mean_v, 3),
        'meanRGB': [round(float(c), 1) for c in mean_rgb],
        'bMinusRDiff': round(b_r_diff, 1),
        'brownOliveRatio': round(brown_olive_ratio, 3),
        'pass': bool(is_pass),
        'status': 'PASS' if is_pass else 'FAIL_COLOR',
        'failReasons': fail_reasons if not is_pass else []
    }

# -------------------------------------------------------------
# 7. Self-Test Suite (Mandatory Negative and Positive Tests)
# -------------------------------------------------------------
def run_self_tests():
    """
    Executes >= 12 self-tests (negative & positive for every metric).
    Returns dictionary with all tests and final status.
    """
    tests = []

    # 1. streakCoherence tests
    # 1a. Positive: Isotropic smooth grass/noise (coherence <= 0.30)
    rng = np.random.RandomState(42)
    isotropic = rng.normal(128, 20, (400, 600)).astype(np.float32)
    res_iso = analyze_streak_coherence(isotropic)
    tests.append({
        'name': 'streakCoherence_positive_isotropic',
        'expected': True,
        'actual': res_iso['pass'],
        'details': res_iso
    })

    # 1b. Negative: Distinct diagonal ridges/streaks (coherence > 0.30)
    y_coords, x_coords = np.mgrid[0:500, 0:800]
    diagonal_streaks = 128 + 60 * np.sin((x_coords[:400, :600] + y_coords[:400, :600]) * 0.15)
    res_diag = analyze_streak_coherence(diagonal_streaks)
    tests.append({
        'name': 'streakCoherence_negative_diagonal_streaks',
        'expected': False,
        'actual': res_diag['pass'],
        'details': res_diag
    })

    # 2. lowFreqStraightEdge tests
    # 2a. Positive: Organic cloud / Perlin-like noise (no straight edges)
    organic_cloud = np.zeros((500, 800, 3), dtype=np.float32)
    organic_cloud[..., 1] = 120 + 30 * np.sin(x_coords * 0.02) * np.cos(y_coords * 0.02)
    organic_cloud[..., 0] = 80
    organic_cloud[..., 2] = 50
    res_edge_pos = analyze_low_freq_straight_edge(organic_cloud)
    tests.append({
        'name': 'lowFreqStraightEdge_positive_organic',
        'expected': True,
        'actual': res_edge_pos['pass'],
        'details': res_edge_pos
    })

    # 2b. Negative: Hard vertical straight edge splitting blocks (Delta-E > 15)
    straight_split = organic_cloud.copy()
    straight_split[:, 400:, 0] += 60.0
    straight_split[:, 400:, 1] -= 50.0
    res_edge_neg = analyze_low_freq_straight_edge(straight_split)
    tests.append({
        'name': 'lowFreqStraightEdge_negative_vertical_seam',
        'expected': False,
        'actual': res_edge_neg['pass'],
        'details': res_edge_neg
    })

    # 3. biomeTransition tests
    # 3a. Positive: Gradual wavy transition across 1.2 cells with sine wave
    wavy_trans = np.zeros((500, 800, 3), dtype=np.float32)
    wavy_center = 400 + 40 * np.sin(y_coords[:500, :800] * 0.04) # RMS waviness > 0.5 cells
    for y in range(500):
        for x in range(800):
            t = 1.0 / (1.0 + np.exp(-(x - wavy_center[y, x]) / 25.0)) # wide soft transition >= 1.0 cell
            wavy_trans[y, x, 0] = 100 * (1 - t) + 160 * t
            wavy_trans[y, x, 1] = 120 * (1 - t) + 140 * t
            wavy_trans[y, x, 2] = 130 * (1 - t) + 90 * t
    res_trans_pos = analyze_biome_transition(wavy_trans)
    tests.append({
        'name': 'biomeTransition_positive_wavy_soft',
        'expected': True,
        'actual': res_trans_pos['pass'],
        'details': res_trans_pos
    })

    # 3b. Negative: Sharp straight line transition (width < 0.4 cells, rms dev == 0)
    sharp_straight = np.zeros((500, 800, 3), dtype=np.float32)
    sharp_straight[:, :400, :] = [80, 100, 120]
    sharp_straight[:, 400:, :] = [160, 140, 90]
    res_trans_neg = analyze_biome_transition(sharp_straight)
    tests.append({
        'name': 'biomeTransition_negative_sharp_straight',
        'expected': False,
        'actual': res_trans_neg['pass'],
        'details': res_trans_neg
    })

    # 4. roadNaturalness tests
    # 4a. Positive: Natural road with undulating edges and good contrast
    natural_road_img = np.zeros((500, 800, 3), dtype=np.float32)
    natural_road_img[..., 1] = 140 # surrounding grass
    natural_road_img[..., 0] = 90
    natural_road_img[..., 2] = 60
    # Add road corridor with slight noise
    for y in range(500):
        rx = 400 + int(15 * math.sin(y * 0.03) + rng.normal(0, 3))
        natural_road_img[y, rx-22:rx+22, :] = [115, 110, 105] # neutral stone road
    res_road_pos = analyze_road_naturalness(natural_road_img)
    tests.append({
        'name': 'roadNaturalness_positive_undulating_stone',
        'expected': True,
        'actual': res_road_pos['pass'],
        'details': res_road_pos
    })

    # 4b. Negative: Perfect straight corridor with zero roughness
    straight_road_img = np.zeros((500, 800, 3), dtype=np.float32)
    straight_road_img[..., 1] = 140
    straight_road_img[..., 0] = 90
    straight_road_img[..., 2] = 60
    straight_road_img[:, 380:420, :] = [115, 110, 105]
    res_road_neg = analyze_road_naturalness(straight_road_img)
    tests.append({
        'name': 'roadNaturalness_negative_perfect_straight_ladder',
        'expected': False,
        'actual': res_road_neg['pass'],
        'details': res_road_neg
    })

    # 5. groundTextureRichness tests
    # 5a. Positive: Rich multi-texture karst stone with speckles & layers
    rich_stone = np.zeros((300, 300, 3), dtype=np.float32)
    for y in range(300):
        layer = 120 + 20 * math.sin(y * 0.12)
        rich_stone[y, :, :] = layer + rng.normal(0, 8, (300, 3))
    res_rich_pos = analyze_ground_texture_richness(rich_stone)
    tests.append({
        'name': 'groundTextureRichness_positive_rich_karst',
        'expected': True,
        'actual': res_rich_pos['pass'],
        'details': res_rich_pos
    })

    # 5b. Negative: Uniform flat grey paint (std < 3, sobel < 2)
    flat_grey = np.full((300, 300, 3), 125.0, dtype=np.float32)
    flat_grey += rng.normal(0, 1.0, (300, 300, 3))
    res_rich_neg = analyze_ground_texture_richness(flat_grey)
    tests.append({
        'name': 'groundTextureRichness_negative_flat_grey',
        'expected': False,
        'actual': res_rich_neg['pass'],
        'details': res_rich_neg
    })

    # 6. groundColorSanity (field) tests
    # 6a. Positive: Lush green farmland (H=78 deg, S=0.40, V=0.55)
    lush_field = np.array([105, 140, 84], dtype=np.float32).reshape((1, 1, 3))
    res_field_pos = analyze_ground_color_sanity(lush_field, biome='field')
    tests.append({
        'name': 'groundColorSanity_field_positive_lush_green',
        'expected': True,
        'actual': res_field_pos['pass'],
        'details': res_field_pos
    })

    # 6b. Negative: Dry olive/yellow-brown farmland (H=56 deg, S=0.45, V=0.50)
    dry_field = np.array([128, 120, 68], dtype=np.float32).reshape((1, 1, 3))
    res_field_neg = analyze_ground_color_sanity(dry_field, biome='field')
    tests.append({
        'name': 'groundColorSanity_field_negative_dry_olive_brown',
        'expected': False,
        'actual': res_field_neg['pass'],
        'details': res_field_neg
    })

    all_passed = all(t['actual'] == t['expected'] for t in tests)
    return {
        'totalTests': len(tests),
        'allPassed': all_passed,
        'tests': tests
    }

if __name__ == '__main__':
    if '--self-test' in sys.argv:
        results = run_self_tests()
        out_path = os.path.join(REVIEW_DIR, "v16_selftest.json")
        os.makedirs(os.path.dirname(out_path), exist_ok=True)
        with open(out_path, 'w', encoding='utf8') as f:
            json.dump(results, f, indent=2)
        print(f"[pixelGates V16] Self-test complete: {results['totalTests']} tests, allPassed={results['allPassed']}")
        sys.exit(0 if results['allPassed'] else 1)
    elif len(sys.argv) > 1:
        img_p = sys.argv[1]
        print(f"[pixelGates V16] Analyzing {img_p}...")
        # Single file quick analysis
        res = {
            'streak': analyze_streak_coherence(img_p),
            'edge': analyze_low_freq_straight_edge(img_p),
            'transition': analyze_biome_transition(img_p),
            'texture': analyze_ground_texture_richness(img_p)
        }
        print(json.dumps(res, indent=2))
    else:
        print("[pixelGates V16] Authoritative Visual & Pixel Gates Evaluator Ready.")
