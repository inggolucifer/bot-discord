import os
from PIL import Image
import numpy as np
from collections import deque

input_files = [
    {
        "src": r"C:\Users\User\.gemini\antigravity-ide\brain\820a74ec-a0f1-4b89-8c19-ae3daa271077\.user_uploaded\media_1792909438826.jpg",
        "id": "tree_dead_wood",
        "folder": "assets_highres",
        "visualW": 2,
        "visualH": 3
    },
    {
        "src": r"C:\Users\User\.gemini\antigravity-ide\brain\820a74ec-a0f1-4b89-8c19-ae3daa271077\.user_uploaded\media_1792909439293.jpg",
        "id": "ghost_ship_frozen_ice_wreck",
        "folder": "assets_water",
        "visualW": 5,
        "visualH": 4
    },
    {
        "src": r"C:\Users\User\.gemini\antigravity-ide\brain\820a74ec-a0f1-4b89-8c19-ae3daa271077\.user_uploaded\media_1792909439448.jpg",
        "id": "leviathan_spine_arch_reef",
        "folder": "assets_water",
        "visualW": 5,
        "visualH": 4
    },
    {
        "src": r"C:\Users\User\.gemini\antigravity-ide\brain\820a74ec-a0f1-4b89-8c19-ae3daa271077\.user_uploaded\media_1792909439578.jpg",
        "id": "ancient_submerged_stone_bridge",
        "folder": "assets_water",
        "visualW": 5,
        "visualH": 4
    },
    {
        "src": r"C:\Users\User\.gemini\antigravity-ide\brain\820a74ec-a0f1-4b89-8c19-ae3daa271077\.user_uploaded\media_1792909439635.jpg",
        "id": "tree_cypress_frost",
        "folder": "assets_highres",
        "visualW": 2,
        "visualH": 3
    }
]

def remove_white_background_floodfill(img, threshold=242, feather=10):
    img = img.convert("RGBA")
    arr = np.array(img, dtype=np.uint8)
    h, w, _ = arr.shape
    
    r = arr[:, :, 0].astype(np.float32)
    g = arr[:, :, 1].astype(np.float32)
    b = arr[:, :, 2].astype(np.float32)
    min_rgb = np.minimum(np.minimum(r, g), b)
    
    visited = np.zeros((h, w), dtype=bool)
    is_bg = np.zeros((h, w), dtype=bool)
    
    queue = deque()
    
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
                    if min_rgb[ny, nx] >= 220:
                        queue.append((ny, nx))

    alpha = arr[:, :, 3].astype(np.float32)
    
    bg_mask = is_bg
    high_bg = bg_mask & (min_rgb >= threshold)
    trans_bg = bg_mask & (min_rgb < threshold) & (min_rgb >= 220)
    
    alpha[high_bg] = 0.0
    ramp = (threshold - min_rgb[trans_bg]) / (threshold - 220.0)
    alpha[trans_bg] = np.clip(ramp * 255.0, 0, 255)
    
    arr[:, :, 3] = alpha.astype(np.uint8)
    
    semi = (arr[:, :, 3] > 0) & (arr[:, :, 3] < 255) & is_bg
    for c in range(3):
        chan = arr[:, :, c].astype(np.float32)
        chan[semi] = np.minimum(chan[semi], 210.0)
        arr[:, :, c] = chan.astype(np.uint8)
        
    res = Image.fromarray(arr, "RGBA")
    
    bbox = res.getbbox()
    if bbox:
        pad = 2
        bbox = (max(0, bbox[0] - pad), max(0, bbox[1] - pad), min(w, bbox[2] + pad), min(h, bbox[3] + pad))
        res = res.crop(bbox)
        
    return res

print("=== MEMPROSES 5 ASET SESI 2 ===")
for item in input_files:
    target_dir = os.path.join(os.path.dirname(__file__), "..", "world-data", item["folder"])
    os.makedirs(target_dir, exist_ok=True)
    
    print(f"Memproses {item['id']}...")
    img = Image.open(item["src"])
    clean_img = remove_white_background_floodfill(img)
    out_path = os.path.join(target_dir, f"{item['id']}.png")
    clean_img.save(out_path, "PNG", optimize=True)
    print(f"-> Tersimpan: {out_path} ({clean_img.width}x{clean_img.height})")

print("\n[SELESAI] 5 aset Sesi 2 berhasil diproses!")
