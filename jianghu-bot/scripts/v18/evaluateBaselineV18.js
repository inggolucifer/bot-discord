'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const BASELINE_DIR = path.resolve(PROJECT_ROOT, 'review/v18_baseline');
const VERIFY_PY = path.resolve(__dirname, 'verify_v18.py');

function runVerify(cmd, ...args) {
  const res = spawnSync('python', [VERIFY_PY, cmd, ...args], {
    cwd: PROJECT_ROOT,
    encoding: 'utf8'
  });
  if (res.status !== 0) {
    console.error(`[evaluateBaseline] verify_v18.py ${cmd} failed:`, res.stderr);
    return { error: res.stderr || 'Execution failed' };
  }
  try {
    return JSON.parse(res.stdout.trim());
  } catch (e) {
    console.error(`[evaluateBaseline] JSON parse error:`, res.stdout);
    return { error: 'Invalid JSON', raw: res.stdout };
  }
}

const metrics = {
  timestamp: new Date().toISOString(),
  head: 'bdfeda4e',
  farm: {},
  road: {},
  band: {},
  repeat: {},
  seam: {},
  baseline_defect_checks: {}
};

console.log('[evaluateBaseline] Running verify_v18.py on baseline shots...');

// 1. Farmland: P04 & P16
const farmShots = ['P04_farm', 'P16_west_farm'];
for (const name of farmShots) {
  const p = path.join(BASELINE_DIR, `${name}.png`);
  if (fs.existsSync(p)) {
    metrics.farm[name] = runVerify('farm', p);
  } else {
    metrics.farm[name] = { error: 'File missing' };
  }
}

// 2. Road: P01, P02, P11, P13, P14
const roadPairs = [
  { id: 'P01_xingcun', zoom: 1.4 },
  { id: 'P02_xingcun_cross', zoom: 1.4 },
  { id: 'P11_xueshan', zoom: 1.4 },
  { id: 'P13_road_h', zoom: 1.4 },
  { id: 'P14_road_v', zoom: 1.4 }
];
for (const rp of roadPairs) {
  const withRoad = path.join(BASELINE_DIR, `${rp.id}.png`);
  const noRoad = path.join(BASELINE_DIR, `${rp.id}_noroad.png`);
  if (fs.existsSync(withRoad) && fs.existsSync(noRoad)) {
    metrics.road[rp.id] = runVerify('road', withRoad, noRoad, String(rp.zoom));
  } else {
    metrics.road[rp.id] = { error: 'Files missing' };
  }
}

// 3. Band & Repeat for Azure: P06..P10 (zoom 1.0)
const azureShots = ['P06_azure_pass', 'P07_azure_west', 'P08_azure_far_west', 'P09_azure_east', 'P10_azure_mist'];
for (const name of azureShots) {
  const p = path.join(BASELINE_DIR, `${name}.png`);
  if (fs.existsSync(p)) {
    metrics.band[name] = runVerify('band', p, '1.0');
    metrics.repeat[name] = runVerify('repeat', p, '1.0');
  } else {
    metrics.band[name] = { error: 'File missing' };
    metrics.repeat[name] = { error: 'File missing' };
  }
}

// 4. Seam on P07 (Azure west boundary at x ≈ 857 px)
const p07Path = path.join(BASELINE_DIR, 'P07_azure_west.png');
if (fs.existsSync(p07Path)) {
  metrics.seam['P07_azure_west_x857'] = runVerify('seam', p07Path, '1.0', '857');
}

// 5. Repeat for Snow: P11 and 5 random snow points (zoom 1.4)
const snowShots = ['P11_xueshan', 'snow_rand_1', 'snow_rand_2', 'snow_rand_3', 'snow_rand_4', 'snow_rand_5'];
for (const name of snowShots) {
  const p = path.join(BASELINE_DIR, `${name}.png`);
  if (fs.existsSync(p)) {
    metrics.repeat[name] = runVerify('repeat', p, '1.4');
  } else {
    metrics.repeat[name] = { error: 'File missing' };
  }
}

// 6. Check that baseline FAILS on all defects A, B, C, D
// Defect A (Farmland teal pool): P04 green < 0.80 and water > 0.10
const p04Farm = metrics.farm['P04_farm'] || {};
const defectA_failed = (p04Farm.green !== undefined && p04Farm.green < 0.80) && (p04Farm.water !== undefined && p04Farm.water > 0.10);

// Defect B (Azure moiré & seam): P07 moirePeakRatio > 150 and seam ratio > 1.30
const p07Band = metrics.band['P07_azure_west'] || {};
const p07Seam = metrics.seam['P07_azure_west_x857'] || {};
const defectB_failed = (p07Band.moirePeakRatio !== undefined && p07Band.moirePeakRatio > 150) || (p07Seam.ratio !== undefined && p07Seam.ratio > 1.30);

// Defect C (Road bubbles/lobes/holes): P01 holes > 0 or lobeRatio > 1.35 or widthCV > 0.18
const p01Road = metrics.road['P01_xingcun'] || {};
const defectC_failed = (p01Road.holes > 0) || (p01Road.lobeRatio > 1.35) || (p01Road.widthCV > 0.18);

// Defect D (Snow road dL < -20 and snow repetition maxAutocorr > 0.35)
const p11Road = metrics.road['P11_xueshan'] || {};
const p11Repeat = metrics.repeat['P11_xueshan'] || {};
const defectD_failed = (p11Road.dL !== undefined && p11Road.dL < -20.0) || (p11Repeat.maxAutocorr !== undefined && p11Repeat.maxAutocorr > 0.35);

metrics.baseline_defect_checks = {
  defectA_farmland_teal_pool: {
    expected: 'FAIL (green < 0.80, water > 0.10)',
    actual: `green=${p04Farm.green}, water=${p04Farm.water}, brown=${p04Farm.brown}`,
    confirmed_defect: defectA_failed
  },
  defectB_azure_moire_seam: {
    expected: 'FAIL (moirePeakRatio > 150, seam > 1.30)',
    actual: `moirePeakRatio=${p07Band.moirePeakRatio}, seamRatio=${p07Seam.ratio}`,
    confirmed_defect: defectB_failed
  },
  defectC_road_bubbles_lobes: {
    expected: 'FAIL (holes > 0, lobeRatio > 1.35, widthCV > 0.18)',
    actual: `holes=${p01Road.holes}, lobeRatio=${p01Road.lobeRatio}, widthCV=${p01Road.widthCV}`,
    confirmed_defect: defectC_failed
  },
  defectD_snow_dark_road_repeat: {
    expected: 'FAIL (dL < -20, maxAutocorr > 0.35)',
    actual: `dL=${p11Road.dL}, maxAutocorr=${p11Repeat.maxAutocorr}`,
    confirmed_defect: defectD_failed
  },
  all_defects_confirmed_failing: defectA_failed && defectB_failed && defectC_failed && defectD_failed
};

const outFile = path.resolve(PROJECT_ROOT, 'review/v18_baseline_metrics.json');
fs.writeFileSync(outFile, JSON.stringify(metrics, null, 2), 'utf8');
console.log(`[evaluateBaseline] Wrote baseline metrics to ${outFile}`);
console.log('[evaluateBaseline] Defect confirmation:', JSON.stringify(metrics.baseline_defect_checks, null, 2));

if (!metrics.baseline_defect_checks.all_defects_confirmed_failing) {
  console.error('[ERROR] One or more baseline defects did not fail! See baseline_defect_checks.');
  process.exit(1);
} else {
  console.log('[SUCCESS] All defects A, B, C, D confirmed failing on HEAD bdfeda4e baseline!');
}
