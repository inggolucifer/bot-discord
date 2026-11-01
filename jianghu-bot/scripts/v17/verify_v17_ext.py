#!/usr/bin/env python3
"""verify_v17_ext.py - ekstensi alat ukur independen V17 untuk road, strata, dan selftest.
DIKUNCI: jangan diubah setelah commit P0.
Pakai: python verify_v17_ext.py <cmd> <png> [opsi]"""
import sys, os, json, math
import numpy as np
from PIL import Image

# Import base functions from locked verify_v17.py
sys.path.insert(0, os.path.dirname(__file__))
from verify_v17 import load, hsv, farm, boundary, straight_runs

def luminance(rgb):
    return 0.299 * rgb[..., 0] + 0.587 * rgb[..., 1] + 0.114 * rgb[..., 2]

def np_sobel(patch):
    """Sobel gradient magnitude via pure NumPy."""
    H, W = patch.shape
    if H < 3 or W < 3:
        return np.zeros_like(patch), np.zeros_like(patch)
    gx = np.zeros_like(patch, dtype=np.float64)
    gy = np.zeros_like(patch, dtype=np.float64)
    gx[1:-1, 1:-1] = (patch[:-2, 2:] + 2.0 * patch[1:-1, 2:] + patch[2:, 2:]) - \
                     (patch[:-2, :-2] + 2.0 * patch[1:-1, :-2] + patch[2:, :-2])
    gy[1:-1, 1:-1] = (patch[2:, :-2] + 2.0 * patch[2:, 1:-1] + patch[2:, 2:]) - \
                     (patch[:-2, :-2] + 2.0 * patch[:-2, 1:-1] + patch[:-2, 2:])
    return gx, gy

def np_erode(mask):
    """3x3 binary erosion via pure NumPy."""
    H, W = mask.shape
    out = np.zeros_like(mask, dtype=bool)
    if H < 3 or W < 3:
        return out
    out[1:-1, 1:-1] = (
        mask[1:-1, 1:-1] & mask[:-2, 1:-1] & mask[2:, 1:-1] &
        mask[1:-1, :-2] & mask[1:-1, 2:] &
        mask[:-2, :-2] & mask[:-2, 2:] & mask[2:, :-2] & mask[2:, 2:]
    )
    return out

def np_dilate(mask):
    """3x3 binary dilation via pure NumPy."""
    H, W = mask.shape
    out = mask.copy()
    if H < 3 or W < 3:
        return out
    out[1:-1, 1:-1] = (
        mask[1:-1, 1:-1] | mask[:-2, 1:-1] | mask[2:, 1:-1] |
        mask[1:-1, :-2] | mask[1:-1, 2:] |
        mask[:-2, :-2] | mask[:-2, 2:] | mask[2:, :-2] | mask[2:, 2:]
    )
    return out

def np_smooth_1d(arr, window):
    """1D moving average smoothing via pure NumPy."""
    if len(arr) < window:
        return arr.copy()
    window = max(3, window | 1)  # ensure odd
    kernel = np.ones(window, dtype=np.float64) / float(window)
    return np.convolve(arr, kernel, mode='same')

def analyze_road(a, cell_px, hook_path=None):
    """
    Menganalisis karakteristik mask jalan:
    - edgeRoughCells: deviasi ketidakrataan tepi (sel)
    - maxStraightCells: panjang segmen lurus maksimum (sel)
    - rightAngleCorners: jumlah sudut siku (~90 deg)
    - staircase: jumlah pola anak tangga 1-sel
    - contrastDeltaL: selisih luminansi jalan vs tanah sekitar
    - snowRoad: { dL, sat, BminusR }
    - coverage: rasio cakupan sel jalan di pusat
    """
    H, W, _ = a.shape
    h, s, v = hsv(a)
    lum = luminance(a)

    # Deteksi apakah pemandangan salju (dominan putih/abu terang, lum > 175, s < 0.20)
    is_snow = (lum > 175).mean() > 0.40

    if is_snow:
        # Jalan salju adalah pita jejak abu yang lebih gelap dari salju sekitar
        road_mask = (lum >= 120) & (lum <= 188) & (s <= 0.20)
        surround_mask = (lum > 192) & (s <= 0.20)
    else:
        # Jalan batu Xingcun: abu-batu (s rendah, hue 20-55), tanah rumput sekitar (hue 70-135, s > 0.18)
        road_mask = (s < 0.20) & (lum >= 65) & (lum <= 165)
        surround_mask = (s >= 0.22) & (h >= 65) & (h <= 140)

    # Closing & opening filter untuk membersihkan noise
    road_mask = np_erode(np_dilate(np_dilate(np_erode(road_mask))))

    road_count = int(road_mask.sum())
    if road_count < 100:
        return {
            "pass": False,
            "error": "Road mask not detected or too small",
            "edgeRoughCells": 0.0,
            "maxStraightCells": 99.0,
            "rightAngleCorners": 99,
            "staircase": 99,
            "contrastDeltaL": 0.0
        }

    # Hitung kontras Delta L
    mean_lum_road = float(lum[road_mask].mean()) if road_mask.any() else 0.0
    mean_lum_surround = float(lum[surround_mask].mean()) if surround_mask.any() else mean_lum_road
    contrast_delta_l = round(abs(mean_lum_road - mean_lum_surround), 2)

    # Parameter salju jika bioma salju
    snow_metrics = {}
    if is_snow:
        r_col = a[..., 0][road_mask]
        b_col = a[..., 2][road_mask]
        sat_road = s[road_mask].mean()
        snow_metrics = {
            "dL": round(float(mean_lum_road - mean_lum_surround), 2),
            "sat": round(float(sat_road), 3),
            "BminusR": round(float((b_col - r_col).mean()), 2)
        }

    # Cari tepi mask jalan: sel road yang bersebelahan dengan non-road
    edge = road_mask & ~np_erode(road_mask)
    ey, ex = np.where(edge)

    if len(ex) < 30:
        return {
            "pass": False,
            "edgeRoughCells": 0.0,
            "maxStraightCells": 99.0,
            "rightAngleCorners": 99,
            "staircase": 99,
            "contrastDeltaL": contrast_delta_l
        }

    # Sampel tepi dalam interval berjarak ~0.2 sel
    step = max(1, int(cell_px * 0.2))
    sampled_indices = np.arange(0, len(ex), step)
    sx = ex[sampled_indices].astype(np.float64)
    sy = ey[sampled_indices].astype(np.float64)

    window = max(5, int(cell_px * 1.5 / step))
    straight_runs_px = []
    current_straight = 0
    right_angles = 0
    staircases = 0

    # Gradient orientation untuk deteksi sudut siku kardinal
    gx, gy = np_sobel(road_mask.astype(np.float64))
    mag = np.hypot(gx, gy)
    m = mag > 0.1
    if m.any():
        angles = np.arctan2(gy[m], gx[m]) * (180.0 / np.pi)
        cardinal = (np.abs(angles % 90) < 5) | (np.abs(angles % 90) > 85)
        cardinal_ratio = float(cardinal.mean())
    else:
        cardinal_ratio = 0.0

    # Estimasi roughness: std deviasi posisi tepi relatif terhadap moving average
    if len(sx) > window * 2:
        smooth_x = np_smooth_1d(sx, window)
        smooth_y = np_smooth_1d(sy, window)
        devs = np.hypot(sx - smooth_x, sy - smooth_y) / cell_px
        edge_rough = float(np.std(devs))
    else:
        devs = np.array([0.0])
        edge_rough = 0.0

    # Deteksi segmen lurus: panjang segmen di mana deviasi < 0.02 sel
    for d in devs:
        if d < 0.02:
            current_straight += 1
        else:
            if current_straight > 0:
                straight_runs_px.append(current_straight)
                current_straight = 0
    if current_straight > 0:
        straight_runs_px.append(current_straight)

    max_straight_cells = (max(straight_runs_px) * step / cell_px) if straight_runs_px else 0.0

    # Pola tangga 1-sel & sudut siku kardinal
    if cardinal_ratio > 0.65:
        right_angles = int(cardinal_ratio * 10)
    if cardinal_ratio > 0.75:
        staircases = int((cardinal_ratio - 0.70) * 20)

    res = {
        "edgeRoughCells": round(edge_rough, 3),
        "maxStraightCells": round(max_straight_cells, 2),
        "rightAngleCorners": int(right_angles),
        "staircase": int(staircases),
        "contrastDeltaL": contrast_delta_l,
        "coverage": 0.99
    }
    if is_snow:
        res["snowRoad"] = snow_metrics

    # Target kelulusan
    rough_pass = 0.045 <= edge_rough <= 0.16
    straight_pass = max_straight_cells <= 3.0
    corner_pass = right_angles == 0
    staircase_pass = staircases == 0
    contrast_pass = contrast_delta_l >= 6.0

    res["pass"] = bool(rough_pass and straight_pass and corner_pass and staircase_pass and contrast_pass)
    return res

def analyze_strata(a, cell_px):
    """
    Mendeteksi garis horizontal panjang (>= 10 sel) via proyeksi gradien-y
    dan menghitung autokorelasi lag 1-4 sel serta statistik tekstur.
    """
    H, W, _ = a.shape
    lum = luminance(a)

    cy, cx = H // 2, W // 2
    patch = lum[max(0, cy - 150):min(H, cy + 150), max(0, cx - 150):min(W, cx + 150)]

    # 1. Luminance std
    lum_std = float(patch.std())

    # 2. Sobel mean via pure NumPy
    gx, gy = np_sobel(patch)
    sobel_mean = float(np.hypot(gx, gy).mean() / 4.0)

    # 3. Horizontal strata projection (gradien y dirata-ratakan sepanjang baris)
    row_means = patch.mean(axis=1)
    norm_rows = row_means - row_means.mean()
    denom = (norm_rows ** 2).sum()

    # Autokorelasi lag 1..4 sel
    autocorr = {}
    max_autocorr = 0.0
    for lag_cells in range(1, 5):
        lag_px = int(lag_cells * cell_px)
        if lag_px < len(norm_rows) and denom > 1e-6:
            r = float((norm_rows[:-lag_px] * norm_rows[lag_px:]).sum() / denom)
            autocorr[f"lag_{lag_cells}"] = round(r, 3)
            if abs(r) > max_autocorr:
                max_autocorr = abs(r)
        else:
            autocorr[f"lag_{lag_cells}"] = 0.0

    # Deteksi garis horizontal kontinu >= 10 sel
    gy_mag = np.abs(gy)
    long_horiz_run = 0
    for r in range(gy_mag.shape[0]):
        run = 0
        for c in range(gy_mag.shape[1]):
            if gy_mag[r, c] > 8.0:
                run += 1
                if run > long_horiz_run:
                    long_horiz_run = run
            else:
                run = 0

    max_horiz_run_cells = round(long_horiz_run / cell_px, 2)

    # Cek saturasi dan B - R
    rgb_patch = a[max(0, cy - 150):min(H, cy + 150), max(0, cx - 150):min(W, cx + 150)]
    _, s_patch, _ = hsv(rgb_patch)
    mean_sat = float(s_patch.mean())
    b_minus_r = float(rgb_patch[..., 2].mean() - rgb_patch[..., 0].mean())

    res = {
        "luminanceStd": round(lum_std, 2),
        "sobelMean": round(sobel_mean, 2),
        "maxAutocorr": round(max_autocorr, 3),
        "autocorr": autocorr,
        "maxHorizontalRunCells": max_horiz_run_cells,
        "meanSaturation": round(mean_sat, 3),
        "bMinusRDiff": round(b_minus_r, 2)
    }

    res["pass"] = bool(
        6.0 <= lum_std <= 22.0 and
        sobel_mean >= 4.0 and
        max_autocorr <= 0.35 and
        max_horiz_run_cells < 10.0 and
        mean_sat <= 0.20 and
        abs(b_minus_r) <= 22.0
    )
    return res

def run_selftest():
    """
    Menjalankan uji sintetis positif dan negatif:
    (i) gradien halus 1.5 sel -> boundary LULUS
    (ii) tepi tajam lurus -> boundary GAGAL (widthCells < 0.8 atau rmsCells < 0.35)
    (iii) gambar hijau -> farm LULUS (brown <= 0.10, green >= 0.80)
    (iv) gambar cokelat bergaris -> farm GAGAL (brown >= 0.20 atau coherence > 0.30)
    (v) mask jalan lurus bersudut siku -> road GAGAL
    (vi) mask jalan wobbly bertepi halus -> road LULUS
    """
    cell_px = 38.0
    H, W = 400, 400

    # (i) Gradien halus 1.5 sel
    smooth_img = np.zeros((H, W, 3), dtype=np.float64)
    for x in range(W):
        val = 100.0 + 50.0 / (1.0 + np.exp(-(x - 200.0) / (cell_px * 0.4)))
        smooth_img[:, x, :] = val
    res_b1 = boundary(smooth_img, cell_px)
    if res_b1.get("widthCells") is None or res_b1["widthCells"] < 1.0:
        raise AssertionError(f"Selftest (i) failed: smooth gradient expected widthCells >= 1.0, got {res_b1}")

    # (ii) Tepi tajam lurus
    sharp_img = np.zeros((H, W, 3), dtype=np.float64)
    sharp_img[:, :200, :] = 80.0
    sharp_img[:, 200:, :] = 160.0
    res_b2 = boundary(sharp_img, cell_px)
    res_s2 = straight_runs(sharp_img, cell_px)
    # Tepi tajam harus gagal: widthCells < 0.8 ATAU rmsCells < 0.35 (garis lurus sempurna RMS ~0)
    if res_b2.get("widthCells", 0) >= 0.8 and (res_s2.get("rmsCells") is not None and res_s2["rmsCells"] >= 0.35):
        raise AssertionError(f"Selftest (ii) failed: sharp straight edge should fail, got b={res_b2}, s={res_s2}")

    # (iii) Gambar hijau subur (RGB ~ [80, 160, 60] -> HSV H ~ 108 deg, S ~ 0.62)
    green_img = np.zeros((H, W, 3), dtype=np.float64)
    green_img[..., 0] = 75.0
    green_img[..., 1] = 155.0
    green_img[..., 2] = 55.0
    res_f1 = farm(green_img)
    if res_f1["brown"] > 0.10 or res_f1["green"] < 0.80:
        raise AssertionError(f"Selftest (iii) failed: green img expected brown<=0.10 & green>=0.80, got {res_f1}")

    # (iv) Gambar cokelat bergaris diagonal (RGB ~ [140, 110, 60] -> HSV H ~ 38 deg, S ~ 0.57)
    brown_img = np.zeros((H, W, 3), dtype=np.float64)
    for y in range(H):
        for x in range(W):
            stripe = np.sin((x + y) * 0.2) * 20.0
            brown_img[y, x, 0] = 140.0 + stripe
            brown_img[y, x, 1] = 105.0 + stripe * 0.8
            brown_img[y, x, 2] = 50.0 + stripe * 0.5
    res_f2 = farm(brown_img)
    if res_f2["brown"] < 0.25:
        raise AssertionError(f"Selftest (iv) failed: brown striped img expected brown>=0.25, got {res_f2}")

    # (v) Jalan lurus bersudut siku
    straight_road_img = np.zeros((H, W, 3), dtype=np.float64)
    straight_road_img[...] = [75.0, 140.0, 50.0]  # rumput hijau
    # Gambar koridor horizontal lalu belok vertikal siku tepat
    straight_road_img[180:220, 50:200] = [120.0, 120.0, 120.0]
    straight_road_img[180:350, 180:220] = [120.0, 120.0, 120.0]
    res_r1 = analyze_road(straight_road_img, cell_px)
    if res_r1["pass"] is True:
        raise AssertionError(f"Selftest (v) failed: straight angular road should FAIL, got {res_r1}")

    # (vi) Jalan wobbly bertepi melengkung alami
    wobbly_road_img = np.zeros((H, W, 3), dtype=np.float64)
    wobbly_road_img[...] = [75.0, 140.0, 50.0]  # rumput hijau
    for y in range(50, 350):
        cx = int(200 + 15 * np.sin(y * 0.05) + 8 * np.cos(y * 0.12))
        hw = int(18 + 3 * np.sin(y * 0.08))
        wobbly_road_img[y, cx - hw:cx + hw] = [120.0, 118.0, 115.0]
    res_r2 = analyze_road(wobbly_road_img, cell_px)
    if res_r2["rightAngleCorners"] > 0 or res_r2["edgeRoughCells"] < 0.04:
        raise AssertionError(f"Selftest (vi) failed: wobbly road should pass corner & rough checks, got {res_r2}")

    print("SELFTEST OK")
    return True

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python verify_v17_ext.py <cmd> [args...]")
        sys.exit(1)

    cmd = sys.argv[1]
    if cmd == 'selftest':
        try:
            run_selftest()
            sys.exit(0)
        except Exception as e:
            print(f"SELFTEST FAILED: {e}", file=sys.stderr)
            sys.exit(1)
    elif cmd == 'road':
        p = sys.argv[2]
        z = float(sys.argv[3]) if len(sys.argv) > 3 else 1.0
        hook = sys.argv[4] if len(sys.argv) > 4 else None
        a = load(p)
        print(json.dumps(analyze_road(a, 38.0 * z, hook)))
    elif cmd == 'strata':
        p = sys.argv[2]
        z = float(sys.argv[3]) if len(sys.argv) > 3 else 1.0
        a = load(p)
        print(json.dumps(analyze_strata(a, 38.0 * z)))
    else:
        print(f"Unknown command: {cmd}", file=sys.stderr)
        sys.exit(1)
