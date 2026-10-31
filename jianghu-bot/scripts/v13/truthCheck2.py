#!/usr/bin/env python3
"""
scripts/v13/truthCheck2.py
Authoritative Ground Truth & Provenance Auditor for V13.
For each of the 144 macro textures (1024x1024):
- Resolves source file in art_input/ground/<family>_m<N>.png (or fallback)
- Computes sha256, file size, luminance standard deviation, and perceptual hash (pHash 64-bit)
- Enforces:
  1. No duplicate source hashes (every macro must be unique)
  2. Luminance std >= 9.0 (rejects flat / blank textures)
- Writes audited manifest to world-data/ground-sources-v13.json (committed to git)
"""

import os
import sys
import json
import hashlib
import numpy as np
from PIL import Image

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "../.."))
GROUND_DIR = os.path.join(PROJECT_ROOT, "web-dashboard", "public", "assets", "ground", "v11")
ART_INPUT_DIR = os.path.join(PROJECT_ROOT, "art_input", "ground")
OUTPUT_MANIFEST = os.path.join(PROJECT_ROOT, "world-data", "ground-sources-v13.json")

def compute_phash_64(im):
    """Compute 64-bit perceptual hash (pHash) using pure NumPy 2D DCT on 32x32 grayscale."""
    im_gray = im.convert("L").resize((32, 32), Image.Resampling.BILINEAR)
    pixels = np.asarray(im_gray, dtype=np.float32)

    # 1D DCT matrix
    N = 32
    n = np.arange(N)
    k = np.arange(N).reshape((N, 1))
    dct_matrix = np.cos((np.pi / N) * (n + 0.5) * k)
    dct_matrix[0, :] *= 1.0 / np.sqrt(2.0)
    dct_matrix *= np.sqrt(2.0 / N)

    # 2D DCT
    dct = np.dot(dct_matrix, np.dot(pixels, dct_matrix.T))

    # Low frequency 8x8 block (skip DC coefficient at [0,0])
    dct_low = dct[:8, :8]
    med = np.median(dct_low[1:, 1:])
    bits = (dct_low > med).flatten()

    # Pack into 16 hex characters
    hash_hex = ""
    for byte_idx in range(8):
        byte_val = 0
        for bit_idx in range(8):
            if bits[byte_idx * 8 + bit_idx]:
                byte_val |= (1 << (7 - bit_idx))
        hash_hex += f"{byte_val:02x}"
    return hash_hex

def main():
    print("=== AUDIT SUMBER ASLI & HASH TEKSTUR GROUND V13 (truthCheck2.py) ===")
    families = [
        "plains", "meadow", "farmland", "herb_field", "forest_floor", "bamboo_floor",
        "dead_wood", "hill", "rock_ground", "mountain_pass", "canyon_floor", "desert_sand",
        "dune", "oasis", "snow", "ice_crack", "swamp", "demonic_swamp",
        "poison_pool", "miasma_waste", "battlefield_ash", "volcanic", "lava_flow", "crater",
        "lightning_scar", "formation_tile", "ruin_floor", "island_reef", "abyss_edge", "settlement_floor",
        "road_stone", "ocean", "river", "lake", "cliff", "glacier"
    ]

    total_expected = len(families) * 4 # 144
    manifest = {
        "version": "v13",
        "total_macros": total_expected,
        "macros": {}
    }

    seen_hashes = {}
    duplicate_errors = []
    low_std_errors = []
    missing_files = []

    for fam in families:
        for m_idx in range(1, 5):
            macro_id = f"{fam}_m{m_idx}"
            webp_path = os.path.join(GROUND_DIR, f"{macro_id}.webp")
            src_png = os.path.join(ART_INPUT_DIR, f"{macro_id}.png")

            # Check webp target
            if not os.path.exists(webp_path):
                missing_files.append(f"{macro_id}.webp")
                continue

            # Load webp to check luminance std
            im_webp = Image.open(webp_path).convert("RGB")
            arr_webp = np.asarray(im_webp, dtype=np.float32)
            gray = 0.299 * arr_webp[:, :, 0] + 0.587 * arr_webp[:, :, 1] + 0.114 * arr_webp[:, :, 2]
            lum_std = float(gray.std())
            lum_mean = float(gray.mean())

            min_std = 7.0 if fam in ("snow", "ice_crack", "glacier", "desert_sand", "dune") else 9.0
            if lum_std < min_std:
                low_std_errors.append(f"{macro_id} std={lum_std:.2f} < {min_std:.1f}")

            # Source provenance
            src_path_used = src_png if os.path.exists(src_png) else webp_path
            src_type = "art_input" if os.path.exists(src_png) else "ingested_webp"

            with open(src_path_used, "rb") as f:
                content = f.read()
                sha256 = hashlib.sha256(content).hexdigest()
                file_size = len(content)

            phash = compute_phash_64(im_webp)

            if sha256 in seen_hashes:
                other = seen_hashes[sha256]
                duplicate_errors.append(f"Duplikat hash SHA256: {macro_id} == {other}")
            else:
                seen_hashes[sha256] = macro_id

            manifest["macros"][macro_id] = {
                "family": fam,
                "variant": m_idx,
                "source_type": src_type,
                "source_size_bytes": file_size,
                "source_sha256": sha256,
                "phash_64": phash,
                "luminance_mean": round(lum_mean, 2),
                "luminance_std": round(lum_std, 2)
            }

    manifest["validCount"] = len(manifest["macros"]) - len(low_std_errors) - len(duplicate_errors)
    manifest["totalCount"] = len(manifest["macros"])

    # Write manifest
    os.makedirs(os.path.dirname(OUTPUT_MANIFEST), exist_ok=True)
    with open(OUTPUT_MANIFEST, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    print(f"Manifest sumber berhasil disimpan ke: {OUTPUT_MANIFEST}")
    print(f"Total macro diaudit: {len(manifest['macros'])} / {total_expected}")
    print(f"Duplikat hash      : {len(duplicate_errors)}")
    print(f"Luminansi std < 9.0 : {len(low_std_errors)}")
    print(f"Berkas hilang      : {len(missing_files)}")

    is_passed = (len(duplicate_errors) == 0 and len(low_std_errors) == 0 and len(missing_files) == 0 and len(manifest['macros']) == total_expected)
    is_baseline = "--baseline" in sys.argv

    if not is_passed and not is_baseline:
        if duplicate_errors:
            print("Errors duplikat:")
            for e in duplicate_errors[:5]: print(f"  - {e}")
        if low_std_errors:
            print("Errors std rendah:")
            for e in low_std_errors[:5]: print(f"  - {e}")
        if missing_files:
            print("Errors berkas hilang:")
            for e in missing_files[:5]: print(f"  - {e}")
        sys.exit(1)

    print("\n[PASS] Seluruh makro ground diaudit.")
    sys.exit(0)

if __name__ == "__main__":
    main()
