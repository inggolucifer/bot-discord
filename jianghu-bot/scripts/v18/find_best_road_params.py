import json, subprocess, numpy as np
from PIL import Image
from scipy import ndimage as ndi
from skimage.morphology import skeletonize

def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)

# We can evaluate any generated viewport against verify_v18
cell_verify = 38 * 1.4
def evaluate_vp(vp_arr):
    m = (vp_arr > 128)
    filled = ndi.binary_fill_holes(m)
    dt = ndi.distance_transform_edt(filled)
    sk = skeletonize(filled)
    H, W = filled.shape
    inner = np.zeros_like(sk); mg = int(cell_verify * 1.0); inner[mg:H-mg, mg:W-mg] = True
    nb = ndi.convolve(sk.astype(int), np.ones((3, 3)), mode='constant') - sk
    junc = ndi.binary_dilation((sk & (nb >= 3)), iterations=int(cell_verify * 0.9))
    sel = sk & inner & ~junc
    r = dt[sel]
    if r.size < 20: return dict(error='Too short')
    w = 2 * r / cell_verify
    return dict(n=len(w), widthCV=round(float(w.std() / w.mean()), 3), lobeRatio=round(float(np.percentile(w, 98) / np.median(w)), 3),
                median=round(float(np.median(w)), 2), p98=round(float(np.percentile(w, 98)), 2))

# Let's inspect the actual raw tile coordinates around P02 (2062, 2648)
# At zoom 1.4, viewport 1280x720:
# cell_screen = 54 * 1.4 = 75.6 px
# x span: 1280 / 75.6 = 16.93 cells
# y span: 720 / 75.6 = 9.52 cells
# x range: 2062 - 8.5 to 2062 + 8.5 = 2053 to 2071
# y range: 2648 - 4.8 to 2648 + 4.8 = 2643 to 2653

# Let's query tiles from proceduralWorldEngine for range x in [2045..2075], y in [2035..2065]
out = subprocess.check_output(['node', '-e', """
const pwe = require('./jianghu-bot/utils/proceduralWorldEngine');
const roads = {};
for (let y = 2635; y <= 2660; y++) {
  for (let x = 2045; x <= 2075; x++) {
    const t = pwe.getTileAt(x, y);
    if (t && t.terrainType === 'road_stone') roads[`${x},${y}`] = true;
  }
}
console.log(JSON.stringify(roads));
"""]).decode()
road_map = json.loads(out)
isRoad = lambda x, y: f'{x},{y}' in road_map

# Simulate rendering viewport for camera (2062, 2648)
def render_p02(inset_val=0.10, blur_sigma=1.12, t_low=0.42, t_high=0.58, warp_scale=1.0):
    # Viewport 1280x720
    # Let's render at 4 px/cell raster
    # x in [2045..2075] is 30 cells -> 120 px
    # y in [2635..2660] is 25 cells -> 100 px
    minX, maxX = 2045, 2075
    minY, maxY = 2635, 2660
    S = 4
    W_r = (maxX - minX + 1) * S
    H_r = (maxY - minY + 1) * S
    raw = np.zeros((H_r, W_r), dtype=np.float32)
    inset = inset_val * S

    for y in range(minY, maxY + 1):
        gy = y - minY
        for x in range(minX, maxX + 1):
            gx = x - minX
            if not isRoad(x, y):
                continue
            raw[int(round(gy*S + inset)):int(round(gy*S + S - inset)),
                int(round(gx*S + inset)):int(round(gx*S + S - inset))] = 1.0
            if isRoad(x + 1, y):
                raw[int(round(gy*S + inset)):int(round(gy*S + S - inset)),
                    int(round(gx*S + S - inset)):int(round(gx*S + S + inset))] = 1.0
            if isRoad(x, y + 1):
                raw[int(round(gy*S + S - inset)):int(round(gy*S + S + inset)),
                    int(round(gx*S + inset)):int(round(gx*S + S - inset))] = 1.0
            if isRoad(x + 1, y + 1) and isRoad(x + 1, y) and isRoad(x, y + 1):
                raw[int(round(gy*S + S - inset)):int(round(gy*S + S + inset)),
                    int(round(gx*S + S - inset)):int(round(gx*S + S + inset))] = 1.0

    # Blur
    blurred = ndi.gaussian_filter(raw, blur_sigma)

    # Domain warp & smoothstep
    warped = np.zeros_like(blurred)
    for py in range(H_r):
        wy = minY + py / S
        for px in range(W_r):
            wx = minX + px / S
            dx = (np.sin(wx * 1.1 + 5) * 0.5) * 0.14 + (np.sin(wx * 3.3 + 9) * 0.5) * 0.06
            dy = (np.sin(wy * 1.1 + 17) * 0.5) * 0.14 + (np.sin(wy * 3.3 + 21) * 0.5) * 0.06
            dx *= warp_scale; dy *= warp_scale
            sx = np.clip(px + dx * S, 0, W_r - 1)
            sy = np.clip(py + dy * S, 0, H_r - 1)
            x0 = int(sx); x1 = min(W_r - 1, x0 + 1); fx = sx - x0
            y0 = int(sy); y1 = min(H_r - 1, y0 + 1); fy = sy - y0
            s = (blurred[y0, x0] * (1 - fx) + blurred[y0, x1] * fx) * (1 - fy) + \
                (blurred[y1, x0] * (1 - fx) + blurred[y1, x1] * fx) * fy
            if s <= t_low: a = 0.0
            elif s >= t_high: a = 1.0
            else:
                t = (s - t_low) / (t_high - t_low)
                a = t * t * (3 - 2 * t)
            warped[py, px] = a

    # Map to viewport 1280x720 centered at (2062, 2648), zoom 1.4 (cell_screen = 54 * 1.4 = 75.6)
    cell_screen = 54 * 1.4
    vp = Image.new('L', (1280, 720), 0)
    # Scaled size of warped:
    scaled_w = int(round((maxX - minX + 1) * cell_screen))
    scaled_h = int(round((maxY - minY + 1) * cell_screen))
    warped_img = Image.fromarray((warped * 255).astype(np.uint8)).resize((scaled_w, scaled_h), Image.Resampling.BILINEAR)
    
    # Position in viewport:
    # World (2062, 2648) is at screen (640, 360)
    # World (minX, minY) is at:
    vx = int(round(640 + (minX - 2062) * cell_screen))
    vy = int(round(360 + (minY - 2648) * cell_screen))
    vp.paste(warped_img, (vx, vy))

    return evaluate_vp(np.asarray(vp))

print('P02 default:', render_p02())
for inset in [0.08, 0.10, 0.12, 0.14]:
    for blur in [0.90, 1.12, 1.30]:
        res = render_p02(inset_val=inset, blur_sigma=blur)
        print(f'inset={inset:.2f}, blur={blur:.2f}: {res}')
