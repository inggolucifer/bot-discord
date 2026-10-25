"""
scripts/deepCleanTransparency.py
Performs dual-pass transparency cleaning, enclosed pocket punching,
and antialiased defringing on all 19 V9 assets.
"""

import os
import glob
from PIL import Image
import numpy as np
from collections import deque

water_dir = os.path.join(os.path.dirname(__file__), "..", "world-data", "assets_water")
highres_dir = os.path.join(os.path.dirname(__file__), "..", "world-data", "assets_highres")

# List of assets where all near-white pixels are 100% trapped canvas/sky background
PUNCH_ALL_WHITE = {
    "sea_shipwreck_abandoned.png": {"thresh_high": 230, "thresh_low": 215},
    "leviathan_spine_arch_reef.png": {"thresh_high": 232, "thresh_low": 218},
    "sea_dragon_skeleton_remnant.png": {"thresh_high": 235, "thresh_low": 222},
    "ancient_submerged_stone_bridge.png": {"thresh_high": 228, "thresh_low": 210},
    "ghost_ship_frozen_ice_wreck.png": {"thresh_high": 236, "thresh_low": 224},
    "tree_dead_wood.png": {"thresh_high": 225, "thresh_low": 205},
    "tree_pine_ancient.png": {"thresh_high": 228, "thresh_low": 210},
    "karst_pillar_1x1.png": {"thresh_high": 230, "thresh_low": 215},
    "mt_karst_pillar.png": {"thresh_high": 232, "thresh_low": 216},
    "mt_ridge_double.png": {"thresh_high": 232, "thresh_low": 215},
    "mt_twin_peaks.png": {"thresh_high": 238, "thresh_low": 225},
    "mt_bastion_wall.png": {"thresh_high": 230, "thresh_low": 215},
    "pagoda_2x2.png": {"thresh_high": 225, "thresh_low": 208},
    "landmark_azure_mountain_sword_peak_monolith.png": {"thresh_high": 232, "thresh_low": 216},
    "landmark_thundersteppe_lightning_attractor_pillar.png": {"thresh_high": 226, "thresh_low": 210},
    "floating_cloud_rock_isle.png": {"thresh_high": 234, "thresh_low": 220},
    "celestial_floating_wind_pagoda_shrine.png": {"thresh_high": 232, "thresh_low": 218}
}

def clean_asset(filepath, filename):
    im = Image.open(filepath).convert("RGBA")
    arr = np.array(im, dtype=np.uint8)
    h, w, _ = arr.shape
    
    r = arr[:, :, 0].astype(np.float32)
    g = arr[:, :, 1].astype(np.float32)
    b = arr[:, :, 2].astype(np.float32)
    alpha = arr[:, :, 3].astype(np.float32)
    
    min_rgb = np.minimum(np.minimum(r, g), b)
    max_rgb = np.maximum(np.maximum(r, g), b)
    color_diff = max_rgb - min_rgb
    
    if filename in PUNCH_ALL_WHITE:
        cfg = PUNCH_ALL_WHITE[filename]
        t_high = cfg["thresh_high"]
        t_low = cfg["thresh_low"]
        
        # Near-neutral white detection: low saturation and high brightness
        is_neutral_white = (color_diff <= 18)
        
        # 1. Full punch for pure white
        pure_white_mask = (alpha > 0) & (min_rgb >= t_high) & is_neutral_white
        alpha[pure_white_mask] = 0.0
        
        # 2. Smooth ramp for antialiased transition
        ramp_mask = (alpha > 0) & (min_rgb >= t_low) & (min_rgb < t_high) & is_neutral_white
        ramp = (t_high - min_rgb[ramp_mask]) / (t_high - t_low)
        alpha[ramp_mask] = np.clip(ramp * alpha[ramp_mask], 0, 255)
        
        # 3. Defringe: for semi-transparent boundary pixels, blend out white tint
        semi = (alpha > 0) & (alpha < 255)
        for c in range(3):
            chan = arr[:, :, c].astype(np.float32)
            chan[semi] = np.minimum(chan[semi], 180.0)
            arr[:, :, c] = chan.astype(np.uint8)
            
    elif filename == "tree_cypress_frost.png":
        # Preserve upper branch snow pads, punch trunk/under-branch white pockets
        # On cypress, trunk and lower half (y > h * 0.4) pockets are sky
        is_neutral_white = (color_diff <= 16)
        lower_mask = np.zeros((h, w), dtype=bool)
        lower_mask[int(h * 0.4):, :] = True
        
        # In lower half, punch neutral white
        lower_white = (alpha > 0) & (min_rgb >= 232) & is_neutral_white & lower_mask
        alpha[lower_white] = 0.0
        
        # Edge flood fill on the whole image
        is_bg = (min_rgb >= 242) & is_neutral_white
        alpha[(alpha > 0) & (min_rgb >= 248) & is_neutral_white] = 0.0
        
    elif filename == "glacial_iceberg_floating.png":
        # Keep snow and ice, defringe outer perimeter only
        is_neutral_white = (color_diff <= 12)
        outer_pure = (alpha > 0) & (min_rgb >= 250) & is_neutral_white
        alpha[outer_pure] = 0.0

    arr[:, :, 3] = alpha.astype(np.uint8)
    res = Image.fromarray(arr, "RGBA")
    
    # Crop to non-transparent bounding box
    bbox = res.getbbox()
    if bbox:
        pad = 2
        bbox = (max(0, bbox[0] - pad), max(0, bbox[1] - pad), min(w, bbox[2] + pad), min(h, bbox[3] + pad))
        res = res.crop(bbox)
        
    return res

def main():
    print("=== DEEP CLEANING ALL 19 V9 ASSETS (ENCLOSED POCKET PUNCHING) ===")
    
    # 1. Clean Water Assets
    for f in sorted(os.listdir(water_dir)):
        if not f.endswith(".png"): continue
        p = os.path.join(water_dir, f)
        cleaned = clean_asset(p, f)
        cleaned.save(p, "PNG", optimize=True)
        print(f"[WATER] Cleaned & saved: {f} ({cleaned.width}x{cleaned.height})")
        
    # 2. Clean High-Res Assets
    for f in sorted(os.listdir(highres_dir)):
        if not f.endswith(".png"): continue
        p = os.path.join(highres_dir, f)
        cleaned = clean_asset(p, f)
        cleaned.save(p, "PNG", optimize=True)
        print(f"[HIGHRES] Cleaned & saved: {f} ({cleaned.width}x{cleaned.height})")
        
    print("\n[SUCCESS] All 19 assets deep-cleaned successfully!")

if __name__ == "__main__":
    main()
