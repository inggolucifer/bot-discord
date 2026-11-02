import json, subprocess, numpy as np
from scipy import ndimage as ndi
from skimage.morphology import skeletonize
from PIL import Image

# Pre-fetch road tiles for world
node_code = """
const pwe = require('./jianghu-bot/utils/proceduralWorldEngine');
const roads = [];
for (let y = 2000; y <= 4500; y++) {
  // sample regions of interest
}
"""

def get_roads_around(cx_world, cy_world, span=22):
    node_code = f"""
    const pwe = require('./jianghu-bot/utils/proceduralWorldEngine');
    const roads = [];
    for (let y = {cy_world - span}; y <= {cy_world + span}; y++) {{
      for (let x = {cx_world - span}; x <= {cx_world + span}; x++) {{
        const t = pwe.getTileAt(x, y);
        if (t && (t.terrainType === 'road_stone' || t.family === 'road_stone')) roads.push([x, y]);
      }}
    }}
    console.log(JSON.stringify(roads));
    """
    out = subprocess.check_output(['node', '-e', node_code]).decode()
    return set(tuple(p) for p in json.loads(out))

def smoothNoise2D(x, y, seed=0):
    xi = int(np.floor(x)); yi = int(np.floor(y))
    xf = x - xi; yf = y - yi
    u = xf * xf * (3 - 2 * xf); v = yf * yf * (3 - 2 * yf)
    def h(ix, iy):
        n = (ix * 374761393 + iy * 668265263 + seed * 1274126177) & 0x7fffffff
        n = (n ^ (n >> 13)) * 1274126177 & 0x7fffffff
        return (n ^ (n >> 16)) / 2147483647.0
    return (h(xi, yi)*(1-u) + h(xi+1, yi)*u)*(1-v) + (h(xi, yi+1)*(1-u) + h(xi+1, yi+1)*u)*v

def simulate_point(cam_x, cam_y, zoom=1.4, single_inset=0.10, multi_inset=0.25, blur_sigma=1.12, t_low=0.42, t_high=0.58, warp_mag=0.5):
    roads = get_roads_around(cam_x, cam_y, span=20)
    isRoad = lambda x, y: (x, y) in roads
    
    min_x = cam_x - 16; max_x = cam_x + 16
    min_y = cam_y - 12; max_y = cam_y + 12
    W_cells = max_x - min_x + 1
    H_cells = max_y - min_y + 1
    S = 4
    W_px = W_cells * S
    H_px = H_cells * S
    
    raw = np.zeros((H_px, W_px), dtype=np.float32)
    
    for y in range(min_y, max_y + 1):
        gy = y - min_y
        for x in range(min_x, max_x + 1):
            gx = x - min_x
            if not isRoad(x, y): continue
            
            hasN = isRoad(x, y - 1)
            hasS = isRoad(x, y + 1)
            hasW = isRoad(x - 1, y)
            hasE = isRoad(x + 1, y)
            
            inT = single_inset * S
            inB = single_inset * S
            inL = single_inset * S
            inR = single_inset * S
            
            # Parallel multi-lane road balancing
            if hasE or hasW:
                if hasS and not hasN: inT = multi_inset * S
                if hasN and not hasS: inB = multi_inset * S
            if hasN or hasS:
                if hasE and not hasW: inL = multi_inset * S
                if hasW and not hasE: inR = multi_inset * S
            
            x0 = int(round(gx * S + inL))
            x1 = int(round((gx + 1) * S - inR))
            y0 = int(round(gy * S + inT))
            y1 = int(round((gy + 1) * S - inB))
            raw[y0:y1, x0:x1] = 1.0
            
            if isRoad(x + 1, y):
                raw[y0:y1, x1:int(round((gx + 1) * S + inL + 1))] = 1.0
            if isRoad(x, y + 1):
                raw[y1:int(round((gy + 1) * S + inT + 1)), x0:x1] = 1.0
            if isRoad(x + 1, y + 1) and isRoad(x + 1, y) and isRoad(x, y + 1):
                raw[y1:int(round((gy + 1) * S + inT + 1)), x1:int(round((gx + 1) * S + inL + 1))] = 1.0

    blurred = ndi.gaussian_filter(raw, blur_sigma)
    
    warped = np.zeros_like(blurred)
    for py in range(H_px):
        wy = min_y + py / S
        for px in range(W_px):
            wx = min_x + px / S
            dx = ((smoothNoise2D(wx * 1.1, wy * 1.1, 5) - 0.5) * 0.14 + (smoothNoise2D(wx * 3.3, wy * 3.3, 9) - 0.5) * 0.06) * warp_mag
            dy = ((smoothNoise2D(wx * 1.1, wy * 1.1, 17) - 0.5) * 0.14 + (smoothNoise2D(wx * 3.3, wy * 3.3, 21) - 0.5) * 0.06) * warp_mag
            sx = np.clip(px + dx * S, 0, W_px - 1)
            sy = np.clip(py + dy * S, 0, H_px - 1)
            x0 = int(sx); x1 = min(W_px - 1, x0 + 1); fx = sx - x0
            y0 = int(sy); y1 = min(H_px - 1, y0 + 1); fy = sy - y0
            s = (blurred[y0, x0]*(1-fx) + blurred[y0, x1]*fx)*(1-fy) + (blurred[y1, x0]*(1-fx) + blurred[y1, x1]*fx)*fy
            if s <= t_low: a = 0.0
            elif s >= t_high: a = 1.0
            else:
                t = (s - t_low) / (t_high - t_low)
                a = t * t * (3 - 2 * t)
            warped[py, px] = a

    cell_screen = 54 * zoom
    vp_w, vp_h = 1280, 720
    scaled_w = int(round(W_cells * cell_screen))
    scaled_h = int(round(H_cells * cell_screen))
    img = Image.fromarray((warped * 255).astype(np.uint8)).resize((scaled_w, scaled_h), Image.Resampling.BILINEAR)
    
    vp = Image.new('L', (vp_w, vp_h), 0)
    vx = int(round(vp_w / 2 + (min_x - cam_x) * cell_screen))
    vy = int(round(vp_h / 2 + (min_y - cam_y) * cell_screen))
    vp.paste(img, (vx, vy))
    
    vp_arr = np.asarray(vp)
    
    cell_verify = 38 * zoom
    m = (vp_arr > 128)
    filled = ndi.binary_fill_holes(m)
    holes = filled & ~m
    lab, n = ndi.label(holes)
    sizes = ndi.sum(holes, lab, range(1, n+1)) if n else []
    holeCount = int(sum(1 for s in sizes if s > 0.02 * cell_verify * cell_verify))
    
    dt = ndi.distance_transform_edt(filled)
    sk = skeletonize(filled)
    H, W = filled.shape
    inner = np.zeros_like(sk)
    mg = int(cell_verify * 1.0)
    inner[mg:H-mg, mg:W-mg] = True
    nb = ndi.convolve(sk.astype(int), np.ones((3,3)), mode='constant') - sk
    junc = ndi.binary_dilation((sk & (nb >= 3)), iterations=int(cell_verify * 0.9))
    sel = sk & inner & ~junc
    r = dt[sel]
    if r.size < 20: return dict(error='Too short', n=int(r.size))
    w = 2 * r / cell_verify
    return dict(holes=holeCount, widthCV=round(float(w.std() / w.mean()), 3), lobeRatio=round(float(np.percentile(w, 98) / np.median(w)), 3),
                median=round(float(np.median(w)), 2), p98=round(float(np.percentile(w, 98)), 2), n=len(w))

pts = [
    ('P01', 2050, 2650),
    ('P02', 2062, 2648),
    ('P13', 2040, 2651),
    ('P14', 2053, 2648),
    ('rand1', 2057, 2649),
    ('rand2', 2000, 4254),
    ('rand3', 3100, 3094),
    ('rand4', 2350, 2891),
    ('rand5', 2053, 2645)
]

for m_inset in [0.20, 0.22, 0.25]:
    print(f"\n--- TESTING multi_inset = {m_inset} ---")
    all_pass = True
    for name, x, y in pts:
        res = simulate_point(x, y, multi_inset=m_inset)
        pass_pt = (res.get('holes') == 0 and res.get('widthCV', 99) <= 0.18 and res.get('lobeRatio', 99) <= 1.35)
        if not pass_pt: all_pass = False
        print(f"  {name}: {res} => {'PASS' if pass_pt else 'FAIL'}")
    print(f"OVERALL for {m_inset}: {'ALL PASS' if all_pass else 'SOME FAIL'}")
