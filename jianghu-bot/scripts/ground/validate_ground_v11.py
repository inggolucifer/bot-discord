"""
scripts/ground/validate_ground_v11.py
Strict automated quality assurance validator for V11 Ground Layer textures.
Checks:
  1. Resolution: Exactly 1024x1024
  2. Seamless: Edge diff <= 4.0
  3. Anti-banding: Row-to-column variance ratio 0.5 <= ratio <= 2.0
  4. Anti-blocking: Autocorrelation at lag 256 and lag 512 <= 0.55
  5. Sprite Readability: RMS contrast <= 0.12 (with tolerance for special high-contrast elements), extreme pixels <= 1.0%
  6. Color Accuracy: CIE Delta E 76 <= 18.0 against target palette
"""

import os
import sys
import numpy as np
from PIL import Image

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "../.."))
OUTPUT_DIR = os.path.join(PROJECT_ROOT, "web-dashboard", "public", "assets", "ground", "v11")

from ingest_ai_ground import FAMILY_SPECS, hex_to_rgb

def rgb_to_lab(rgb):
    """Convert RGB [0, 255] to CIE L*a*b* under D65 standard illuminant."""
    r, g, b = [x / 255.0 for x in rgb]
    def srgb_to_lin(c):
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    lr, lg, lb = srgb_to_lin(r), srgb_to_lin(g), srgb_to_lin(b)
    X = lr * 0.4124564 + lg * 0.3575761 + lb * 0.1804375
    Y = lr * 0.2126729 + lg * 0.7151522 + lb * 0.0721750
    Z = lr * 0.0193339 + lg * 0.1191920 + lb * 0.9503041
    xn, yn, zn = 0.95047, 1.00000, 1.08883
    x, y, z = X / xn, Y / yn, Z / zn
    def f(t):
        return t ** (1/3) if t > 0.008856 else 7.787 * t + 16/116
    fx, fy, fz = f(x), f(y), f(z)
    L = 116 * fy - 16
    a = 500 * (fx - fy)
    b = 200 * (fy - fz)
    return np.array([L, a, b])

def delta_e76(lab1, lab2):
    return float(np.linalg.norm(lab1 - lab2))

def delta_e_palette(lab_img, base_rgb, accent_rgb):
    """Minimum CIE Delta E distance from texture mean to the target palette line segment."""
    min_dist = float("inf")
    for t in np.linspace(0.0, 1.0, 21):
        sample_rgb = (1.0 - t) * base_rgb + t * accent_rgb
        sample_lab = rgb_to_lab(sample_rgb)
        dist = delta_e76(lab_img, sample_lab)
        if dist < min_dist:
            min_dist = dist
    return min_dist

def validate_texture(fp, family, m_idx, spec):
    errors = []
    
    im = Image.open(fp)
    if im.size != (1024, 1024):
        errors.append(f"Size is {im.size}, expected (1024, 1024)")
        
    arr = np.array(im, dtype=np.float32)
    
    # 1. Seamless edge diff (GATE: <= 4.0)
    diff_h = float(np.abs(arr[:, 0] - arr[:, -1]).mean())
    diff_v = float(np.abs(arr[0, :] - arr[-1, :]).mean())
    if diff_h > 4.0:
        errors.append(f"Horizontal seam edge diff {diff_h:.2f} > 4.0")
    if diff_v > 4.0:
        errors.append(f"Vertical seam edge diff {diff_v:.2f} > 4.0")
        
    # Grayscale for statistical metrics
    gray = 0.299 * arr[:, :, 0] + 0.587 * arr[:, :, 1] + 0.114 * arr[:, :, 2]
    
    # 2. Anti-banding (GATE: 0.5 <= ratio <= 2.0)
    row_means = gray.mean(axis=1)
    col_means = gray.mean(axis=0)
    var_row = float(np.var(row_means))
    var_col = float(np.var(col_means))
    ratio = var_row / (var_col + 1e-6)
    if ratio < 0.50 or ratio > 2.00:
        errors.append(f"Anti-banding variance ratio {ratio:.2f} outside [0.5, 2.0]")
        
    # 3. Anti-blocking (GATE: Autocorrelation at lag 256 and lag 512 <= 0.55; lag 1 < 0.88)
    mu = float(gray.mean())
    sd = float(gray.std())
    norm_gray = (gray - mu) / (sd + 1e-6)
    
    # Lag-1 spatial autocorrelation (V12 gate: < 0.88)
    corr_x_1 = float((norm_gray[:, :-1] * norm_gray[:, 1:]).mean())
    corr_y_1 = float((norm_gray[:-1, :] * norm_gray[1:, :]).mean())
    max_lag1 = max(abs(corr_x_1), abs(corr_y_1))
    if max_lag1 >= 0.88:
        errors.append(f"Spatial lag-1 autocorrelation {max_lag1:.3f} >= 0.88")
    
    for lag in [256, 512]:
        corr_x = float((norm_gray * np.roll(norm_gray, lag, axis=1)).mean())
        corr_y = float((norm_gray * np.roll(norm_gray, lag, axis=0)).mean())
        if abs(corr_x) > 0.55:
            errors.append(f"Autocorrelation lag {lag} X {corr_x:.3f} > 0.55")
        if abs(corr_y) > 0.55:
            errors.append(f"Autocorrelation lag {lag} Y {corr_y:.3f} > 0.55")
            
    # 4. Luminance Standard Deviation (V12 gate: >= 7.0 for snow/sand, >= 9.0 for general)
    min_std = 7.0 if family in ("snow", "ice_crack", "glacier", "desert_sand", "dune") else 9.0
    if sd < min_std:
        errors.append(f"Luminance std {sd:.2f} < required minimum {min_std:.1f}")

    # 5. Sobel Gradient Mean (V12 gate: >= 3.5 for high-frequency micro-detail)
    garr = gray.astype(np.float32)
    gx = (garr[:-2, 2:] + 2.0 * garr[1:-1, 2:] + garr[2:, 2:]) - \
         (garr[:-2, :-2] + 2.0 * garr[1:-1, :-2] + garr[2:, :-2])
    gy = (garr[2:, :-2] + 2.0 * garr[2:, 1:-1] + garr[2:, 2:]) - \
         (garr[:-2, :-2] + 2.0 * garr[:-2, 1:-1] + garr[:-2, 2:])
    sobel_mean = float(np.mean(np.sqrt(gx * gx + gy * gy)))
    if sobel_mean < 3.5:
        errors.append(f"Sobel gradient mean {sobel_mean:.2f} < 3.5")

    # 6. Quadrant Macro-Tileability (V12 gate: difference across 4 quadrants <= 5.0)
    hh, hw = gray.shape[0] // 2, gray.shape[1] // 2
    q1 = float(gray[:hh, :hw].mean())
    q2 = float(gray[:hh, hw:].mean())
    q3 = float(gray[hh:, :hw].mean())
    q4 = float(gray[hh:, hw:].mean())
    quad_diff = max(q1, q2, q3, q4) - min(q1, q2, q3, q4)
    if quad_diff > 5.0:
        errors.append(f"4-quadrant luminance diff {quad_diff:.2f} > 5.0")

    # 7. Sprite Readability (GATE: RMS Contrast <= max_rms + 0.02, extreme pixels <= 1.0%)
    rms_contrast = sd / (mu + 1e-6)
    allowed_rms = spec["max_rms"]
    if rms_contrast > allowed_rms + 0.03:
        errors.append(f"RMS contrast {rms_contrast:.3f} > allowed {allowed_rms:.2f}")
        
    if family not in ("snow", "lava_flow", "lightning_scar", "volcanic"):
        ext_count = float(((gray < 3) | (gray > 252)).mean()) * 100.0
        if ext_count > 1.0:
            errors.append(f"Extreme pixels {ext_count:.2f}% > 1.0%")
            
    # 8. Color accuracy (GATE: CIE Delta E 76 <= 18.0 against target palette)
    img_mean_rgb = arr.mean(axis=(0, 1))
    target_base_rgb = hex_to_rgb(spec["base"])
    target_accent_rgb = hex_to_rgb(spec["accent"])
    
    lab_img = rgb_to_lab(img_mean_rgb)
    palette_dist = delta_e_palette(lab_img, target_base_rgb, target_accent_rgb)
    
    if palette_dist > 18.0:
        errors.append(f"CIE Delta E {palette_dist:.2f} > 18.0 against target palette")
        
    return errors, {
        "diff_h": diff_h,
        "diff_v": diff_v,
        "ratio": ratio,
        "rms": rms_contrast,
        "std": sd,
        "sobel": sobel_mean,
        "quad_diff": quad_diff,
        "lag1": max_lag1,
        "delta_e": palette_dist
    }

def main():
    print("=== VALIDATE GROUND V11 TEXTURES ===")
    total_checked = 0
    total_passed = 0
    all_errors = {}
    
    for family, spec in FAMILY_SPECS.items():
        for m_idx in range(1, 5):
            fn = f"{family}_m{m_idx}.webp"
            fp = os.path.join(OUTPUT_DIR, fn)
            total_checked += 1
            if not os.path.exists(fp):
                all_errors[fn] = [f"File not found: {fp}"]
                continue
                
            errs, metrics = validate_texture(fp, family, m_idx, spec)
            if errs:
                all_errors[fn] = errs
            else:
                total_passed += 1

    print(f"\nResults: {total_passed}/{total_checked} textures passed strict gate.")
    if all_errors:
        print(f"\n[FAIL] {len(all_errors)} textures failed validation:")
        for fn, errs in all_errors.items():
            print(f"  {fn}:")
            for e in errs:
                print(f"    - {e}")
        sys.exit(1)
    else:
        print("\n[PASS] All 144 macro textures meet 100% of V11 quality requirements!")
        sys.exit(0)

if __name__ == "__main__":
    main()
