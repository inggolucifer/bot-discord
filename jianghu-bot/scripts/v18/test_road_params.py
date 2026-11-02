import sys, os, json, numpy as np
from PIL import Image
from scipy import ndimage as ndi
from skimage.morphology import skeletonize

def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)

# Load noroad image
noroad_path = 'jianghu-bot/review/v18_p4_road/P02_xingcun_cross_noroad.png'
B = np.asarray(Image.open(noroad_path).convert('RGB')).astype(np.float64)
H, W = B.shape[:2]
cell = 38 * 1.4

# Get chunks around camera (2062, 2648)
# At camera (2062, 2648), zoom 1.4:
# screen center (640, 360) is world (2062, 2648)
# screen px to world cell:
# wx = 2062 + (px - 640) / cell
# wy = 2648 + (py - 360) / cell

# Let's read the road grid from proceduralWorldEngine
import subprocess
out = subprocess.check_output(['node', '-e', """
const pwe = require('./jianghu-bot/utils/proceduralWorldEngine');
const roads = [];
for (let y = 2635; y <= 2660; y++) {
  for (let x = 2045; x <= 2075; x++) {
    const t = pwe.getTileAt(x, y);
    if (t && t.terrainType === 'road_stone') roads.push([x, y]);
  }
}
console.log(JSON.stringify(roads));
"""]).decode()
road_cells = set(tuple(p) for p in json.loads(out))

for inset_single, inset_multi in [(0.10, 0.10), (0.10, 0.18), (0.10, 0.22), (0.08, 0.24)]:
    # Build raster mask
    # For each screen pixel (py, px):
    mask = np.zeros((H, W), dtype=np.float32)
    # Rasterize per cell on screen:
    # A cell at (cx, cy) on screen has top-left (round((cx-2062)*cell + 640 - cell/2), ...)
    for cy in range(2635, 2661):
        for cx in range(2045, 2076):
            if (cx, cy) not in road_cells:
                continue
            hasN = (cx, cy - 1) in road_cells
            hasS = (cx, cy + 1) in road_cells
            hasE = (cx + 1, cy) in road_cells
            hasW = (cx - 1, cy) in road_cells
            # Multi-lane check: has parallel neighbor
            isMultiH = (hasN or hasS) and (hasE or hasW)
            ins = inset_multi if isMultiH else inset_single

            x0 = (cx - 2062) * cell + 640 - cell / 2
            y0 = (cy - 2648) * cell + 360 - cell / 2
            
            # cell bounds in screen pixels:
            ix0 = int(round(x0 + ins * cell))
            ix1 = int(round(x0 + (1 - ins) * cell))
            iy0 = int(round(y0 + ins * cell))
            iy1 = int(round(y0 + (1 - ins) * cell))
            
            # Clip
            if ix1 < 0 or ix0 >= W or iy1 < 0 or iy0 >= H:
                continue
            mask[max(0, iy0):min(H, iy1), max(0, ix0):min(W, ix1)] = 1.0
            
            # Bridges
            if hasE:
                bx0 = int(round(x0 + (1 - ins) * cell))
                bx1 = int(round(x0 + cell + ins * cell))
                mask[max(0, iy0):min(H, iy1), max(0, bx0):min(W, bx1)] = 1.0
            if hasS:
                by0 = int(round(y0 + (1 - ins) * cell))
                by1 = int(round(y0 + cell + ins * cell))
                mask[max(0, by0):min(H, by1), max(0, ix0):min(W, ix1)] = 1.0
            if hasE and hasS and (cx + 1, cy + 1) in road_cells:
                mask[max(0, by0):min(H, by1), max(0, bx0):min(W, bx1)] = 1.0

    # Blur sigma = 0.28 cell
    blurred = ndi.gaussian_filter(mask, cell * 0.28)
    
    # Threshold
    alpha = smoothstep(0.42, 0.58, blurred)
    
    # Test verify_v18 road metric directly on alpha > 0.5
    m = (alpha > 0.5)
    filled = ndi.binary_fill_holes(m)
    holes = filled & ~m
    lab, n = ndi.label(holes)
    sizes = ndi.sum(holes, lab, range(1, n + 1)) if n else []
    holeCount = int(sum(1 for s in sizes if s > 0.02 * cell * cell))
    
    dt = ndi.distance_transform_edt(filled)
    sk = skeletonize(filled)
    inner = np.zeros_like(sk); mg = int(cell * 1.0); inner[mg:H-mg, mg:W-mg] = True
    nb = ndi.convolve(sk.astype(int), np.ones((3, 3)), mode='constant') - sk
    junc = ndi.binary_dilation((sk & (nb >= 3)), iterations=int(cell * 0.9))
    sel = sk & inner & ~junc
    r = dt[sel]
    if r.size < 20:
        continue
    w = 2 * r / cell
    widthCV = float(w.std() / w.mean())
    lobe = float(np.percentile(w, 98) / np.median(w))
    print(f'insets ({inset_single}, {inset_multi}): holes={holeCount}, widthCV={widthCV:.3f}, lobeRatio={lobe:.3f}, mean_w={w.mean():.2f}, med_w={np.median(w):.2f}')
