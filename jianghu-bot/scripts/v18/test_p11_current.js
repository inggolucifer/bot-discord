'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync, execSync } = require('child_process');

const outDir = path.resolve(__dirname, '../../review/v18_p5_snow_test');
fs.mkdirSync(outDir, { recursive: true });

const shots = [
  { name: 'P11_xueshan', x: 2350, y: 4300, zoom: 1.4, grid: 0, ground: 'only' },
  { name: 'P11_xueshan_noroad', x: 2350, y: 4300, zoom: 1.4, grid: 0, ground: 'only', noroad: 1, allowDuplicate: true }
];

const shotsFile = path.resolve(__dirname, '../../review/v18_p5_shots.json');
fs.writeFileSync(shotsFile, JSON.stringify(shots, null, 2), 'utf8');

const captureScript = path.resolve(__dirname, '../captureWorld.cjs');
const capRes = spawnSync('node', [captureScript, shotsFile, outDir], { stdio: 'inherit' });
if (capRes.status !== 0) {
  console.error(`captureWorld failed`);
  process.exit(1);
}

const verifyPy = path.resolve(__dirname, 'verify_v18.py');
const withRoad = path.join(outDir, 'P11_xueshan.png');
const noRoad = path.join(outDir, 'P11_xueshan_noroad.png');

console.log('\n--- verify_v18.py road P11 ---');
const roadOut = execSync(`python "${verifyPy}" road "${withRoad}" "${noRoad}" 1.4`, { encoding: 'utf8' }).trim();
console.log('road:', roadOut);

console.log('\n--- verify_v18.py repeat P11 ---');
const repOut = execSync(`python "${verifyPy}" repeat "${noRoad}" 1.4`, { encoding: 'utf8' }).trim();
console.log('repeat noRoad:', repOut);

const repOut2 = execSync(`python "${verifyPy}" repeat "${withRoad}" 1.4`, { encoding: 'utf8' }).trim();
console.log('repeat withRoad:', repOut2);
