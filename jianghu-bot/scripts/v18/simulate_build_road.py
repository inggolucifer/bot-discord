import json, subprocess, numpy as np
from PIL import Image
from scipy import ndimage as ndi
from skimage.morphology import skeletonize

# 1. Fetch the exact 38x38 gridFamilies for chunk (64, 82)
out = subprocess.check_output(['node', '-e', """
const cse = require('./jianghu-bot/utils/chunkStreamingEngine');
const pwe = require('./jianghu-bot/utils/proceduralWorldEngine');
// Camera at (2062, 2648)
// Chunks involved around (2062, 2648): cx=64, cy=82
// Let's get the 38x38 grid for chunk 64, 82 (BORDER=3)
const cx = 64, cy = 82, BORDER = 3, CHUNK_SIZE = 32, GRID_DIM = 38;
const families = [];
for (let gy = -BORDER; gy < CHUNK_SIZE + BORDER; gy++) {
  for (let gx = -BORDER; gx < CHUNK_SIZE + BORDER; gx++) {
    const wx = cx * CHUNK_SIZE + gx;
    const wy = cy * CHUNK_SIZE + gy;
    const t = pwe.getTileAt(wx, wy);
    families.push(t ? t.terrainType : 'plains');
  }
}
console.log(JSON.stringify(families));
"""]).decode()
gridFamilies = json.loads(out)

GRID_DIM = 38
BORDER = 3
CHUNK_SIZE = 32
cx = 64
cy = 82
S = 4
W = GRID_DIM * S  # 152

def test_pipeline(inset_val=0.10, blur_sigma=1.12, thresh_low=0.42, thresh_high=0.58, disp_mult=1.0):
    isRoad = lambda gx, gy: 0 <= gx < GRID_DIM and 0 <= gy < GRID_DIM and (gridFamilies[gy * GRID_DIM + gx] in ('road_stone', 'settlement_floor'))
    isStrictRoad = lambda gx, gy: 0 <= gx < GRID_DIM and 0 <= gy < GRID_DIM and gridFamilies[gy * GRID_DIM + gx] == 'road_stone'

    # Step 0: Raw raster 152x152
    raw = np.zeros((W, W), dtype=np.float32)
    inset = inset_val * S
    for gy in range(GRID_DIM):
        for gx in range(GRID_DIM):
            if not isStrictRoad(gx, gy):
                continue
            raw[int(round(gy * S + inset)):int(round(gy * S + S - inset)),
                int(round(gx * S + inset)):int(round(gx * S + S - inset))] = 1.0
            if gx < GRID_DIM - 1 and isRoad(gx + 1, gy):
                raw[int(round(gy * S + inset)):int(round(gy * S + S - inset)),
                    int(round(gx * S + S - inset)):int(round(gx * S + S + inset))] = 1.0
            if gy < GRID_DIM - 1 and isRoad(gx, gy + 1):
                raw[int(round(gy * S + S - inset)):int(round(gy * S + S + inset)),
                    int(round(gx * S + inset)):int(round(gx * S + S - inset))] = 1.0
            if gx < GRID_DIM - 1 and gy < GRID_DIM - 1 and isRoad(gx + 1, gy + 1) and isRoad(gx + 1, gy) and isRoad(gx, gy + 1):
                raw[int(round(gy * S + S - inset)):int(round(gy * S + S + inset)),
                    int(round(gx * S + S - inset)):int(round(gx * S + S + inset))] = 1.0

    # Step 1: Blur
    blurred = ndi.gaussian_filter(raw, blur_sigma)

    # Step 2: Domain warp & smoothstep
    warped = np.zeros((W, W), dtype=np.float32)
    for py in range(W):
        wy = cy * CHUNK_SIZE + (py / S - BORDER)
        for px in range(W):
            wx = cx * CHUNK_SIZE + (px / S - BORDER)
            # Simulated noise
            dx = (np.sin(wx * 1.1 + 5) * 0.5) * 0.14 + (np.sin(wx * 3.3 + 9) * 0.5) * 0.06
            dy = (np.sin(wy * 1.1 + 17) * 0.5) * 0.14 + (np.sin(wy * 3.3 + 21) * 0.5) * 0.06
            dx *= disp_mult
            dy *= disp_mult
            sx = np.clip(px + dx * S, 0, W - 1)
            sy = np.clip(py + dy * S, 0, W - 1)
            # Bilinear sample
            x0 = int(sx); x1 = min(W - 1, x0 + 1); fx = sx - x0
            y0 = int(sy); y1 = min(W - 1, y0 + 1); fy = sy - y0
            s = (blurred[y0, x0] * (1 - fx) + blurred[y0, x1] * fx) * (1 - fy) + \
                (blurred[y1, x0] * (1 - fx) + blurred[y1, x1] * fx) * fy
            
            # Smoothstep
            if s <= thresh_low:
                a = 0.0
            elif s >= thresh_high:
                a = 1.0
            else:
                t = (s - thresh_low) / (thresh_high - thresh_low)
                a = t * t * (3 - 2 * t)
            warped[py, px] = a

    # Step 3: Upscale to chunk canvas (32 * 54 = 1728) and place in viewport 1280x720 at camera (2062, 2648) zoom 1.4
    # Sliced inner chunk: px from BORDER*S to (BORDER+32)*S = 12 to 140
    inner_warped = warped[BORDER * S:(BORDER + CHUNK_SIZE) * S, BORDER * S:(BORDER + CHUNK_SIZE) * S]
    # Zoom to 1728x1728
    chunk_img = Image.fromarray((inner_warped * 255).astype(np.uint8)).resize((32 * 54, 32 * 54), Image.Resampling.BILINEAR)
    
    # Render into viewport (1280x720) with camera (2062, 2648) zoom 1.4:
    vp = Image.new('L', (1280, 720), 0)
    # Chunk (64, 82) top-left in world: (64*32, 82*32) = (2048, 2624)
    # In viewport: center is (640, 360) for world (2062, 2648)
    cell_screen = 54 * 1.4
    chunk_screen_x = int(round(640 + (2048 - 2062) * cell_screen))
    chunk_screen_y = int(round(360 + (2624 - 2648) * cell_screen))
    chunk_scaled = chunk_img.resize((int(round(32 * cell_screen)), int(round(32 * cell_screen))), Image.Resampling.BILINEAR)
    vp.paste(chunk_scaled, (chunk_screen_x, chunk_screen_y))

    # Evaluate verify_v18 metric
    arr = np.asarray(vp)
    m = (arr > 128)
    filled = ndi.binary_fill_holes(m)
    cell_verify = 38 * 1.4
    dt = ndi.distance_transform_edt(filled)
    sk = skeletonize(filled)
    H, W_vp = filled.shape
    inner = np.zeros_like(sk); mg = int(cell_verify * 1.0); inner[mg:H-mg, mg:W_vp-mg] = True
    nb = ndi.convolve(sk.astype(int), np.ones((3, 3)), mode='constant') - sk
    junc = ndi.binary_dilation((sk & (nb >= 3)), iterations=int(cell_verify * 0.9))
    sel = sk & inner & ~junc
    r = dt[sel]
    if r.size < 20:
        return 'Too short'
    w = 2 * r / cell_verify
    return dict(n=len(w), widthCV=round(float(w.std() / w.mean()), 3), lobe=round(float(np.percentile(w, 98) / np.median(w)), 3),
                median=round(float(np.median(w)), 2), p98=round(float(np.percentile(w, 98)), 2))

def test_pipeline_balanced(blur_sigma=1.12, thresh_low=0.42, thresh_high=0.58, disp_mult=1.0, inset_2=0.25):
    isRoad = lambda gx, gy: 0 <= gx < GRID_DIM and 0 <= gy < GRID_DIM and (gridFamilies[gy * GRID_DIM + gx] in ('road_stone', 'settlement_floor'))
    isStrictRoad = lambda gx, gy: 0 <= gx < GRID_DIM and 0 <= gy < GRID_DIM and gridFamilies[gy * GRID_DIM + gx] == 'road_stone'

    raw = np.zeros((W, W), dtype=np.float32)

    for gy in range(GRID_DIM):
        for gx in range(GRID_DIM):
            if not isStrictRoad(gx, gy):
                continue
            hasN = isStrictRoad(gx, gy - 1)
            hasS = isStrictRoad(gx, gy + 1)
            hasW = isStrictRoad(gx - 1, gy)
            hasE = isStrictRoad(gx + 1, gy)

            inT = (inset_2 * S) if (hasS and not hasN) else (0.10 * S)
            inB = (inset_2 * S) if (hasN and not hasS) else (0.10 * S)
            inL = (inset_2 * S) if (hasE and not hasW) else (0.10 * S)
            inR = (inset_2 * S) if (hasW and not hasE) else (0.10 * S)

            x0 = gx * S + inL
            x1 = (gx + 1) * S - inR
            y0 = gy * S + inT
            y1 = (gy + 1) * S - inB

            raw[int(round(y0)):int(round(y1)), int(round(x0)):int(round(x1))] = 1.0

            if gx < GRID_DIM - 1 and isRoad(gx + 1, gy):
                raw[int(round(y0)):int(round(y1)), int(round(x1)):int(round((gx + 1) * S + 0.10 * S + 1))] = 1.0
            if gy < GRID_DIM - 1 and isRoad(gx, gy + 1):
                raw[int(round(y1)):int(round((gy + 1) * S + 0.10 * S + 1)), int(round(x0)):int(round(x1))] = 1.0
            if gx < GRID_DIM - 1 and gy < GRID_DIM - 1 and isRoad(gx + 1, gy + 1) and isRoad(gx + 1, gy) and isRoad(gx, gy + 1):
                raw[int(round(y1)):int(round((gy + 1) * S + 0.10 * S + 1)), int(round(x1)):int(round((gx + 1) * S + 0.10 * S + 1))] = 1.0

    blurred = ndi.gaussian_filter(raw, blur_sigma)

    warped = np.zeros((W, W), dtype=np.float32)
    for py in range(W):
        wy = cy * CHUNK_SIZE + (py / S - BORDER)
        for px in range(W):
            wx = cx * CHUNK_SIZE + (px / S - BORDER)
            dx = (np.sin(wx * 1.1 + 5) * 0.5) * 0.14 + (np.sin(wx * 3.3 + 9) * 0.5) * 0.06
            dy = (np.sin(wy * 1.1 + 17) * 0.5) * 0.14 + (np.sin(wy * 3.3 + 21) * 0.5) * 0.06
            dx *= disp_mult; dy *= disp_mult
            sx = np.clip(px + dx * S, 0, W - 1)
            sy = np.clip(py + dy * S, 0, W - 1)
            x0 = int(sx); x1 = min(W - 1, x0 + 1); fx = sx - x0
            y0 = int(sy); y1 = min(W - 1, y0 + 1); fy = sy - y0
            s = (blurred[y0, x0] * (1 - fx) + blurred[y0, x1] * fx) * (1 - fy) + \
                (blurred[y1, x0] * (1 - fx) + blurred[y1, x1] * fx) * fy
            if s <= thresh_low: a = 0.0
            elif s >= thresh_high: a = 1.0
            else:
                t = (s - thresh_low) / (thresh_high - thresh_low)
                a = t * t * (3 - 2 * t)
            warped[py, px] = a

    inner_warped = warped[BORDER * S:(BORDER + CHUNK_SIZE) * S, BORDER * S:(BORDER + CHUNK_SIZE) * S]
    chunk_img = Image.fromarray((inner_warped * 255).astype(np.uint8)).resize((32 * 54, 32 * 54), Image.Resampling.BILINEAR)

    vp = Image.new('L', (1280, 720), 0)
    cell_screen = 54 * 1.4
    chunk_screen_x = int(round(640 + (2048 - 2062) * cell_screen))
    chunk_screen_y = int(round(360 + (2624 - 2648) * cell_screen))
    chunk_scaled = chunk_img.resize((int(round(32 * cell_screen)), int(round(32 * cell_screen))), Image.Resampling.BILINEAR)
    vp.paste(chunk_scaled, (chunk_screen_x, chunk_screen_y))

    arr = np.asarray(vp)
    m = (arr > 128)
    filled = ndi.binary_fill_holes(m)
    cell_verify = 38 * 1.4
    dt = ndi.distance_transform_edt(filled)
    sk = skeletonize(filled)
    H, W_vp = filled.shape
    inner = np.zeros_like(sk); mg = int(cell_verify * 1.0); inner[mg:H-mg, mg:W_vp-mg] = True
    nb = ndi.convolve(sk.astype(int), np.ones((3, 3)), mode='constant') - sk
    junc = ndi.binary_dilation((sk & (nb >= 3)), iterations=int(cell_verify * 0.9))
    sel = sk & inner & ~junc
    r = dt[sel]
    if r.size < 20: return 'Too short'
    w = 2 * r / cell_verify
    return dict(n=len(w), widthCV=round(float(w.std() / w.mean()), 3), lobe=round(float(np.percentile(w, 98) / np.median(w)), 3),
                median=round(float(np.median(w)), 2), p98=round(float(np.percentile(w, 98)), 2))

for ins in [0.20, 0.22, 0.25, 0.28, 0.30]:
    print(f'inset_2={ins}:', test_pipeline_balanced(inset_2=ins))
