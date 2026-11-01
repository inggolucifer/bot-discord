/**
 * JIANGHU WORLD — MINIMAP PALETTE SYNCHRONIZATION AUDIT (scripts/v16/testMinimapSync.js)
 * Implements Gate P7 / K8:
 * - Compares ground rendered screenshot average colors with minimap raster map colors
 * - Tests points: P01_xingcun, P04_farm, P06_azure_pass, P11_xueshan, P12_desert
 * - Verifies ΔE76 <= 25 for all points
 * - Outputs structured results to review/v16_minimap_evaluation.json
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const REVIEW_DIR = path.resolve(PROJECT_ROOT, 'review');
const OUT_FILE = path.join(REVIEW_DIR, 'v16_minimap_evaluation.json');

const pyScript = `
import json, os, sys
from PIL import Image
import numpy as np

pts = [
    ('P01_xingcun', 2050, 2650),
    ('P04_farm', 2450, 2450),
    ('P06_azure_pass', 2200, 3340),
    ('P11_xueshan', 2350, 4300),
    ('P12_desert', 900, 2600)
]

def rgb_to_lab(rgb):
    rgb = np.array(rgb, dtype=float) / 255.0
    mask = rgb > 0.04045
    rgb[mask] = ((rgb[mask] + 0.055) / 1.055) ** 2.4
    rgb[~mask] = rgb[~mask] / 12.92
    
    matrix = np.array([
        [0.4124564, 0.3575761, 0.1804375],
        [0.2126729, 0.7151522, 0.0721750],
        [0.0193339, 0.1191920, 0.9503041]
    ])
    xyz = np.dot(rgb, matrix.T)
    xyz /= np.array([0.95047, 1.00000, 1.08883])
    
    mask = xyz > 0.008856
    xyz[mask] = xyz[mask] ** (1/3)
    xyz[~mask] = (7.787 * xyz[~mask]) + (16 / 116)
    
    L = (116 * xyz[1]) - 16
    a = 500 * (xyz[0] - xyz[1])
    b = 200 * (xyz[1] - xyz[2])
    return np.array([L, a, b])

project_root = r"${PROJECT_ROOT.replace(/\\/g, '\\\\')}"
raster_path = os.path.join(project_root, 'web-dashboard', 'public', 'assets', 'world-raster.png')
if not os.path.exists(raster_path):
    print(json.dumps({'error': f'Raster file not found: {raster_path}'}))
    sys.exit(1)

raster_img = Image.open(raster_path).convert('RGB')
raster_arr = np.array(raster_img)

points_data = {}
max_delta_e = 0.0
all_passed = True

for pid, wx, wy in pts:
    shot_path = os.path.join(project_root, 'review', 'v16_baseline', f'{pid}.png')
    if not os.path.exists(shot_path):
        print(json.dumps({'error': f'Shot file not found: {shot_path}'}))
        sys.exit(1)
        
    shot_img = Image.open(shot_path).convert('RGB')
    shot_arr = np.array(shot_img)
    h, w, _ = shot_arr.shape
    center_shot = shot_arr[h//2-100:h//2+100, w//2-100:w//2+100]
    mean_rgb_shot = np.mean(center_shot, axis=(0,1))
    
    rx = int(wx * 0.25)
    ry = int(wy * 0.25)
    sample_raster = raster_arr[max(0, ry-2):min(1250, ry+3), max(0, rx-2):min(1250, rx+3)]
    mean_rgb_raster = np.mean(sample_raster, axis=(0,1))
    
    lab_shot = rgb_to_lab(mean_rgb_shot)
    lab_rast = rgb_to_lab(mean_rgb_raster)
    
    delta_e = float(np.linalg.norm(lab_shot - lab_rast))
    if delta_e > max_delta_e:
        max_delta_e = delta_e
        
    point_pass = delta_e <= 25.0
    if not point_pass:
        all_passed = False
        
    points_data[pid] = {
        'x': wx,
        'y': wy,
        'groundRgb': [round(float(c), 1) for c in mean_rgb_shot],
        'rasterRgb': [round(float(c), 1) for c in mean_rgb_raster],
        'deltaE': round(delta_e, 2),
        'pass': point_pass
    }

result = {
    'points': points_data,
    'maxDeltaE': round(max_delta_e, 2),
    'threshold': 25.0,
    'pass': all_passed
}

print(json.dumps(result))
`;

console.log('================================================================');
console.log('  JIANGHU WORLD — FASE P7: MINIMAP PALETTE SYNC AUDIT (K8)');
console.log('================================================================\n');

const pyRun = spawnSync('python', ['-c', pyScript], { encoding: 'utf8' });
if (pyRun.error || pyRun.status !== 0) {
  console.error('Python evaluation error:', pyRun.stderr || pyRun.stdout || pyRun.error);
  process.exit(1);
}

let result;
try {
  result = JSON.parse(pyRun.stdout.trim());
} catch (e) {
  console.error('Failed to parse Python output:', pyRun.stdout);
  process.exit(1);
}

if (result.error) {
  console.error('Audit Error:', result.error);
  process.exit(1);
}

console.log('Minimap vs Ground Rendered Color Palette Results:');
for (const [pid, data] of Object.entries(result.points)) {
  console.log(`  [${pid}] (${data.x}, ${data.y}): Ground [${data.groundRgb.join(', ')}] vs Raster [${data.rasterRgb.join(', ')}] -> ΔE = ${data.deltaE} ${data.pass ? '✓' : '✗'}`);
}

console.log(`\nMaximum ΔE: ${result.maxDeltaE} (Threshold: <= ${result.threshold})`);
console.log(`Result: ${result.pass ? 'PASSED ✓' : 'FAILED ✗'}`);

fs.writeFileSync(OUT_FILE, JSON.stringify(result, null, 2), 'utf8');
console.log(`Saved evaluation summary to ${OUT_FILE}`);

if (!result.pass) {
  process.exit(1);
}
