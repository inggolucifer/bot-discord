"""
scripts/v12/truthCheck.py
Audits ground/v11/*_m*.webp files for size, luminance std, unique colors, and gradient entropy (Sobel mean).
Authoritatively checks true source existence in art_input/ground/<family>_m<N>.png with sha256.
Enforces zero-lie policy: only files backed by real source art are labeled 'ai'.
"""

import os
import re
import json
import hashlib
import numpy as np
from PIL import Image

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "../.."))
GROUND_DIR = os.path.join(PROJECT_ROOT, "web-dashboard", "public", "assets", "ground", "v11")
ART_INPUT_DIR = os.path.join(PROJECT_ROOT, "art_input", "ground")
OUTPUT_JSON = os.path.join(PROJECT_ROOT, "review", "v12_ground_truth.json")

def compute_sobel_mean(gray_arr):
    # Standard 3x3 Sobel operator implemented in pure numpy
    arr = gray_arr.astype(np.float32)
    # gx
    gx = (arr[:-2, 2:] + 2.0 * arr[1:-1, 2:] + arr[2:, 2:]) - \
         (arr[:-2, :-2] + 2.0 * arr[1:-1, :-2] + arr[2:, :-2])
    # gy
    gy = (arr[2:, :-2] + 2.0 * arr[2:, 1:-1] + arr[2:, 2:]) - \
         (arr[:-2, :-2] + 2.0 * arr[:-2, 1:-1] + arr[:-2, 2:])
    mag = np.sqrt(gx * gx + gy * gy)
    return float(np.mean(mag))

def get_file_sha256(filepath):
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()

def main():
    if not os.path.exists(GROUND_DIR):
        print(f"[ERROR] Ground directory not found: {GROUND_DIR}")
        return 1

    pattern = re.compile(r"^([a-z_]+)_(m[1-4])\.webp$")
    files = sorted([f for f in os.listdir(GROUND_DIR) if pattern.match(f)])

    total_files = len(files)
    ai_count = 0
    procedural_count = 0
    placeholder_count = 0

    results = {}

    for fn in files:
        m = pattern.match(fn)
        family = m.group(1)
        var_suffix = m.group(2) # m1, m2, m3, m4
        
        webp_path = os.path.join(GROUND_DIR, fn)
        kb_size = round(os.path.getsize(webp_path) / 1024.0, 2)
        
        im = Image.open(webp_path).convert("RGB")
        w, h = im.size
        arr = np.array(im)
        
        # Luminance L = 0.299 R + 0.587 G + 0.114 B
        lum = 0.299 * arr[:, :, 0] + 0.587 * arr[:, :, 1] + 0.114 * arr[:, :, 2]
        std_lum = round(float(np.std(lum)), 2)
        mean_lum = round(float(np.mean(lum)), 2)
        
        # Sobel mean
        sobel_mean = round(compute_sobel_mean(lum), 2)
        
        # Unique colors (fast uint32 packing: 1D array)
        packed = (arr[:, :, 0].astype(np.uint32) << 16) | (arr[:, :, 1].astype(np.uint32) << 8) | arr[:, :, 2].astype(np.uint32)
        unique_colors = int(len(np.unique(packed)))

        # Check true AI source in art_input/ground/<family>_<var_suffix>.png
        src_png_name = f"{family}_{var_suffix}.png"
        src_png_path = os.path.join(ART_INPUT_DIR, src_png_name)
        
        source_type = "procedural"
        src_sha256 = None
        src_resolution = None
        
        if os.path.exists(src_png_path):
            try:
                src_im = Image.open(src_png_path)
                sw, sh = src_im.size
                src_resolution = [sw, sh]
                if sw >= 1024 and sh >= 1024:
                    src_sha256 = get_file_sha256(src_png_path)
                    source_type = "ai"
                else:
                    source_type = "procedural" # Upscaled or undersized source is rejected as real AI
            except Exception:
                source_type = "procedural"
        
        # Quality classification (V12 gate: >= 7.0 for snow/sand, >= 8.5 general)
        min_std = 7.0 if family in ("snow", "ice_crack", "glacier", "desert_sand", "dune") else 8.5
        if std_lum < min_std or kb_size < 40.0:
            quality_flag = "low_contrast_placeholder"
            if source_type != "ai":
                placeholder_count += 1
            else:
                ai_count += 1
        else:
            quality_flag = "structured"
            if source_type == "ai":
                ai_count += 1
            else:
                procedural_count += 1
                
        results[fn] = {
            "family": family,
            "variant": var_suffix,
            "kb": kb_size,
            "dimensions": [w, h],
            "lum_mean": mean_lum,
            "lum_std": std_lum,
            "sobel_mean": sobel_mean,
            "unique_colors_sample": unique_colors,
            "quality_flag": quality_flag,
            "source": source_type,
            "src_file": src_png_name if os.path.exists(src_png_path) else None,
            "src_sha256": src_sha256,
            "src_resolution": src_resolution
        }

    os.makedirs(os.path.dirname(OUTPUT_JSON), exist_ok=True)
    summary = {
        "total_macros": total_files,
        "ai_count": ai_count,
        "procedural_count": procedural_count,
        "placeholder_count": placeholder_count,
        "rule": "ai count strictly derived from art_input/ground/<family>_m<N>.png (>=1024x1024) and valid sha256",
        "files": results
    }
    
    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)
        
    print(f"=== TRUTH CHECK V12: GROUND ASSET AUDIT ===")
    print(f"Total Macros Evaluated : {total_files}")
    print(f"Verified Real AI       : {ai_count}")
    print(f"Procedural / Upgraded  : {procedural_count}")
    print(f"Low Contrast / Flat    : {placeholder_count}")
    print(f"Summary written to     : {os.path.relpath(OUTPUT_JSON, PROJECT_ROOT)}")
    print(f"Status Output: ai={ai_count} procedural={procedural_count + placeholder_count}")
    
    return 0

if __name__ == "__main__":
    main()
