const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const shots = [
  { name: 'shot_v12_audit_a_xingcun_z10', x: 2050, y: 2650, zoom: 1.0, grid: 0 },
  { name: 'shot_v12_audit_c_plain_z10', x: 2450, y: 2450, zoom: 1.0, grid: 0 },
  { name: 'shot_v12_audit_e_azure_z10', x: 2200, y: 3340, zoom: 1.0, grid: 0 },
  { name: 'shot_v12_audit_f_frost_z10', x: 2500, y: 4400, zoom: 1.0, grid: 0 }
];

const shotsJsonPath = path.resolve(__dirname, 'audit_shots.json');
fs.writeFileSync(shotsJsonPath, JSON.stringify(shots, null, 2));

const outDir = path.resolve(__dirname, '../../review/shots_v13');
fs.mkdirSync(outDir, { recursive: true });

console.log('[captureAuditShots] Capturing', shots.length, 'shots to', outDir);

const proc = spawn('node', [
  path.resolve(__dirname, '../captureWorld.cjs'),
  shotsJsonPath,
  outDir
], { stdio: 'inherit' });

proc.on('close', (code) => {
  console.log('[captureAuditShots] Exited with code:', code);
  process.exit(code || 0);
});
