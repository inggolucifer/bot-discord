import os
import sys
from PIL import Image
import numpy as np
from collections import deque

input_files = [
    {
        "src": r"C:\Users\User\.gemini\antigravity-ide\brain\820a74ec-a0f1-4b89-8c19-ae3daa271077\.user_uploaded\media_1792906381020.jpg",
        "id": "celestial_floating_wind_pagoda_shrine",
        "category": "water_scene",
        "visualW": 4,
        "visualH": 5
    },
    {
        "src": r"C:\Users\User\.gemini\antigravity-ide\brain\820a74ec-a0f1-4b89-8c19-ae3daa271077\.user_uploaded\media_1792906381218.jpg",
        "id": "floating_cloud_rock_isle",
        "category": "water_scene",
        "visualW": 4,
        "visualH": 4
    },
    {
        "src": r"C:\Users\User\.gemini\antigravity-ide\brain\820a74ec-a0f1-4b89-8c19-ae3daa271077\.user_uploaded\media_1792906381303.jpg",
        "id": "sea_dragon_skeleton_remnant",
        "category": "water_scene",
        "visualW": 5,
        "visualH": 4
    },
    {
        "src": r"C:\Users\User\.gemini\antigravity-ide\brain\820a74ec-a0f1-4b89-8c19-ae3daa271077\.user_uploaded\media_1792906381360.jpg",
        "id": "sea_shipwreck_abandoned",
        "category": "water_scene",
        "visualW": 5,
        "visualH": 4
    },
    {
        "src": r"C:\Users\User\.gemini\antigravity-ide\brain\820a74ec-a0f1-4b89-8c19-ae3daa271077\.user_uploaded\media_1792906381430.jpg",
        "id": "glacial_iceberg_floating",
        "category": "water_scene",
        "visualW": 4,
        "visualH": 4
    }
]

out_dir = os.path.join(os.path.dirname(__file__), "..", "world-data", "assets_water")
os.makedirs(out_dir, exist_ok=True)

def remove_white_background_floodfill(img, threshold=242, feather=10):
    img = img.convert("RGBA")
    arr = np.array(img, dtype=np.uint8)
    h, w, _ = arr.shape
    
    # Calculate whiteness distance: min(R, G, B)
    r = arr[:, :, 0].astype(np.float32)
    g = arr[:, :, 1].astype(np.float32)
    b = arr[:, :, 2].astype(np.float32)
    min_rgb = np.minimum(np.minimum(r, g), b)
    
    # Flood-fill from border pixels
    visited = np.zeros((h, w), dtype=bool)
    is_bg = np.zeros((h, w), dtype=bool)
    
    queue = deque()
    
    # Add top, bottom, left, right border pixels if they are light (min_rgb > 220)
    for x in range(w):
        if min_rgb[0, x] >= 220:
            queue.append((0, x))
            visited[0, x] = True
        if min_rgb[h - 1, x] >= 220:
            queue.append((h - 1, x))
            visited[h - 1, x] = True
            
    for y in range(h):
        if min_rgb[y, 0] >= 220 and not visited[y, 0]:
            queue.append((y, 0))
            visited[y, 0] = True
        if min_rgb[y, w - 1] >= 220 and not visited[y, w - 1]:
            queue.append((y, w - 1))
            visited[y, w - 1] = True
            
    while queue:
        cy, cx = queue.popleft()
        is_bg[cy, cx] = True
        
        for dy, dx in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            ny, nx = cy + dy, cx + dx
            if 0 <= ny < h and 0 <= nx < w:
                if not visited[ny, nx]:
                    visited[ny, nx] = True
                    # Connected background pixel threshold
                    if min_rgb[ny, nx] >= 220:
                        queue.append((ny, nx))

    # Compute smooth alpha on background pixels
    alpha = arr[:, :, 3].astype(np.float32)
    
    # On connected bg pixels:
    # If min_rgb >= threshold -> alpha = 0
    # If 220 <= min_rgb < threshold -> gradual ramp
    bg_mask = is_bg
    high_bg = bg_mask & (min_rgb >= threshold)
    trans_bg = bg_mask & (min_rgb < threshold) & (min_rgb >= 220)
    
    alpha[high_bg] = 0.0
    
    # Linear ramp for antialiased boundary
    ramp = (threshold - min_rgb[trans_bg]) / (threshold - 220.0)
    alpha[trans_bg] = np.clip(ramp * 255.0, 0, 255)
    
    arr[:, :, 3] = alpha.astype(np.uint8)
    
    # Defringe slightly on boundary pixels (remove white tint from semi-transparent edges)
    semi = (arr[:, :, 3] > 0) & (arr[:, :, 3] < 255) & is_bg
    for c in range(3):
        # Desaturate slightly or blend toward underlying color
        chan = arr[:, :, c].astype(np.float32)
        # Avoid blown out white fringes
        chan[semi] = np.minimum(chan[semi], 210.0)
        arr[:, :, c] = chan.astype(np.uint8)
        
    res = Image.fromarray(arr, "RGBA")
    
    # Crop to non-transparent bounding box
    bbox = res.getbbox()
    if bbox:
        # Add slight 2px padding
        pad = 2
        bbox = (max(0, bbox[0] - pad), max(0, bbox[1] - pad), min(w, bbox[2] + pad), min(h, bbox[3] + pad))
        res = res.crop(bbox)
        
    return res

print("=== MEMPROSES 5 ASET AIR SESI 1 ===")
for item in input_files:
    print(f"Memproses {item['id']}...")
    img = Image.open(item["src"])
    clean_img = remove_white_background_floodfill(img)
    out_path = os.path.join(out_dir, f"{item['id']}.png")
    clean_img.save(out_path, "PNG", optimize=True)
    print(f"-> Tersimpan: {out_path} ({clean_img.width}x{clean_img.height})")

print("\n[SELESAI] 5 aset air berhasil dibersihkan dan dipotong!")
