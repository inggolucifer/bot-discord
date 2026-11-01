const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const baselineDir = path.resolve(__dirname, '../../review/v17_baseline');
const verifyPy = path.resolve(__dirname, 'verify_v17.py');
const verifyExtPy = path.resolve(__dirname, 'verify_v17_ext.py');

function runPython(args) {
  const res = spawnSync('python', args, { encoding: 'utf8' });
  if (res.error) throw res.error;
  try {
    return JSON.parse(res.stdout.trim());
  } catch (e) {
    console.error('Failed to parse stdout:', res.stdout, res.stderr);
    return { error: e.message, stdout: res.stdout, stderr: res.stderr };
  }
}

const metrics = {
  farm: {},
  boundary: {},
  road: {},
  strata: {},
  objectsDrawnCheck: {}
};

// 1. Farmland tests
for (const p of ['P04_farm', 'P16_west_farm']) {
  const img = path.join(baselineDir, `${p}.png`);
  if (fs.existsSync(img)) {
    metrics.farm[p] = runPython([verifyPy, 'farm', img]);
  }
}

// 2. Boundary tests (zoom=1.0)
for (const p of ['P06_azure_pass', 'P07_azure_west', 'P08_azure_far_west', 'P09_azure_east', 'P10_azure_mist']) {
  const img = path.join(baselineDir, `${p}.png`);
  if (fs.existsSync(img)) {
    metrics.boundary[p] = runPython([verifyPy, 'boundary', img, '1.0']);
  }
}

// 3. Road tests (zoom=1.4)
for (const p of ['P01_xingcun', 'P02_xingcun_cross', 'P11_xueshan', 'P13_road_h', 'P14_road_v']) {
  const img = path.join(baselineDir, `${p}.png`);
  if (fs.existsSync(img)) {
    metrics.road[p] = runPython([verifyExtPy, 'road', img, '1.4']);
  }
}

// 4. Strata tests
for (const p of ['P06_azure_pass', 'P07_azure_west', 'P08_azure_far_west', 'P09_azure_east', 'P10_azure_mist']) {
  const img = path.join(baselineDir, `${p}.png`);
  if (fs.existsSync(img)) {
    metrics.strata[p] = runPython([verifyExtPy, 'strata', img]);
  }
}

// 5. Objects drawn verification (__debugObjectsDrawn === 0 in all baseline shots)
const files = fs.readdirSync(baselineDir).filter(f => f.endsWith('.json'));
let allZeroObjects = true;
const objectsDrawnReport = {};

for (const f of files) {
  const data = JSON.parse(fs.readFileSync(path.join(baselineDir, f), 'utf8'));
  const count = data.debugObjectsDrawn;
  objectsDrawnReport[f] = count;
  if (count !== 0 && count !== null) {
    allZeroObjects = false;
  }
}
metrics.objectsDrawnCheck = {
  allZeroObjects,
  counts: objectsDrawnReport
};

const outFile = path.resolve(__dirname, '../../review/v17_baseline_metrics.json');
fs.writeFileSync(outFile, JSON.stringify(metrics, null, 2), 'utf8');
console.log(`[evaluateBaselineV17] Wrote baseline evaluation to ${outFile}`);
console.log(JSON.stringify(metrics, null, 2));
