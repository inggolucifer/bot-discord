const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');

// 1. Create scripts/v20/lib
const libDir = path.join(ROOT, 'scripts/v20/lib');
if (!fs.existsSync(libDir)) {
  fs.mkdirSync(libDir, { recursive: true });
}

// 2. Copy useful utilities to lib
const scriptsToKeep = [
  { from: 'scripts/v12/checkReachability.js', to: 'scripts/v20/lib/checkReachability.js' },
  { from: 'scripts/v13/checkBarrierClosure.js', to: 'scripts/v20/lib/checkBarrierClosure.js' },
  { from: 'scripts/v11/testSpawnClearance.js', to: 'scripts/v20/lib/testSpawnClearance.js' }
];

for (const s of scriptsToKeep) {
  const src = path.join(ROOT, s.from);
  const dest = path.join(ROOT, s.to);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`Copied ${s.from} -> ${s.to}`);
  }
}

// 3. Document in docs/v20/scripts-keep.md
const keepDoc = `# Inventaris Skrip Utilitas yang Dipertahankan di V20 (scripts/v20/lib)

Sesuai rencana pembersihan P9, folder versi legacy \`scripts/v11\` sampai \`scripts/v19\` telah dipensiunkan dan dihapus. Skrip analitik utilitas penting yang masih relevan dipindahkan ke \`scripts/v20/lib/\`:

| Berkas Asal | Lokasi Baru di V20 | Fungsi / Deskripsi |
|---|---|---|
| \`scripts/v12/checkReachability.js\` | \`scripts/v20/lib/checkReachability.js\` | Validasi keterjangkauan jalur A* graf antar wilayah |
| \`scripts/v13/checkBarrierClosure.js\` | \`scripts/v20/lib/checkBarrierClosure.js\` | Audit integritas garis pembatas benua dan celah lintasan |
| \`scripts/v11/testSpawnClearance.js\` | \`scripts/v20/lib/testSpawnClearance.js\` | Verifikasi jarak aman dan kebebasan tile spawn pemain |

Seluruh skrip tangkapan layar, evaluasi visual, dan perbandingan pixel telah dihapus total sejalan dengan kebijakan Zero Screenshot Policy V20.
`;
fs.writeFileSync(path.join(ROOT, 'docs/v20/scripts-keep.md'), keepDoc, 'utf8');
console.log('Created docs/v20/scripts-keep.md');

// 4. Delete folders scripts/v11..v19
for (let v = 11; v <= 19; v++) {
  const dir = path.join(ROOT, `scripts/v${v}`);
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
    console.log(`Deleted folder scripts/v${v}`);
  }
}

// 5. Delete world-data/settlements/*_blueprint.json
const settlementsDir = path.join(ROOT, 'world-data/settlements');
if (fs.existsSync(settlementsDir)) {
  fs.rmSync(settlementsDir, { recursive: true, force: true });
  console.log('Deleted legacy folder world-data/settlements');
}

// 6. Delete old ground manifests (-v13, -v14)
const oldGroundManifests = [
  'web-dashboard/public/assets/ground/ground-manifest-v13.json',
  'web-dashboard/public/assets/ground/ground-manifest-v14.json',
  'world-data/ground-manifest-v13.json',
  'world-data/ground-manifest-v14.json'
];

for (const gm of oldGroundManifests) {
  const p = path.join(ROOT, gm);
  if (fs.existsSync(p)) {
    fs.unlinkSync(p);
    console.log(`Deleted old ground manifest: ${gm}`);
  }
}

// 7. Clean loadBlueprints in utils/settlementEngine.js
const enginePath = path.join(ROOT, 'utils/settlementEngine.js');
let engineContent = fs.readFileSync(enginePath, 'utf8').replace(/\r\n/g, '\n');

engineContent = engineContent.replace(
  /function loadBlueprints\(\) {[\s\S]*?return blueprintsCache;\n}/,
  `function loadBlueprints() {\n    if (blueprintsCache) return blueprintsCache;\n    blueprintsCache = {};\n    return blueprintsCache;\n}`
);
fs.writeFileSync(enginePath, engineContent, 'utf8');
console.log('Updated loadBlueprints() in utils/settlementEngine.js');

console.log('Cleanup step executed successfully.');
