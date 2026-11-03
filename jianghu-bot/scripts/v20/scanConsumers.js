const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../../..');
const BOT_ROOT = path.resolve(__dirname, '../..');
const DOCS_V20 = path.join(BOT_ROOT, 'docs/v20');

console.log('[CONSUMERS] Memindai konsumen data pemukiman...');

const TARGET_PATTERNS = [
  { key: 'authored-props.json', regex: /authored-props(\.v\d+)?\.json/i, label: 'authored-props.json' },
  { key: 'blueprints', regex: /(village|city|port|outpost|sect)_blueprint\.json|settlements\/.*blueprint/i, label: 'settlements/*_blueprint.json' },
  { key: 'isSettlementOrigin', regex: /\bisSettlementOrigin\b/, label: 'isSettlementOrigin' },
  { key: 'ANCHOR_SETTLEMENTS', regex: /\bANCHOR_SETTLEMENTS\b/, label: 'ANCHOR_SETTLEMENTS' },
  { key: 'village-archetypes-v9.json', regex: /village-archetypes(-v\d+)?\.json/i, label: 'village-archetypes-v9.json' }
];

// Get all tracked files in git
const trackedFiles = execSync('git ls-files', { cwd: ROOT, encoding: 'utf8' })
  .trim()
  .split(/\r?\n/)
  .filter(f => !f.startsWith('jianghu-bot/review/') && !f.endsWith('.png') && !f.endsWith('.webp') && !f.endsWith('.jpg') && !f.endsWith('.zip'));

const findings = {};
for (const target of TARGET_PATTERNS) {
  findings[target.key] = [];
}

for (const relPath of trackedFiles) {
  const fullPath = path.join(ROOT, relPath);
  let content = '';
  try {
    content = fs.readFileSync(fullPath, 'utf8');
  } catch (_) {
    continue;
  }

  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const target of TARGET_PATTERNS) {
      if (target.regex.test(line)) {
        findings[target.key].push({
          file: relPath,
          lineNum: i + 1,
          snippet: line.trim().slice(0, 160)
        });
      }
    }
  }
}

// Generate Markdown Table
let md = `# INVENTARIS KONSUMEN SISTEM PEMUKIMAN V20 (consumers.md)

Dokumen ini memetakan seluruh file dan baris kode yang merujuk pada data pemukiman lama sebelum dilakukan perombakan di V20.
Dibuat secara otomatis oleh \`scripts/v20/scanConsumers.js\` pada ${new Date().toISOString()}.

---

`;

for (const target of TARGET_PATTERNS) {
  const list = findings[target.key];
  md += `## 1. Pemakai \`${target.label}\` (${list.length} temuan)\n\n`;
  if (list.length === 0) {
    md += `*Tidak ditemukan pemakai di file ter-track non-review.*\n\n`;
  } else {
    md += `| File | Baris | Potongan Kode |\n`;
    md += `|---|---|---|\n`;
    for (const item of list) {
      const cleanSnippet = item.snippet.replace(/\|/g, '\\|').replace(/`/g, '\\`');
      md += `| \`${item.file}\` | L${item.lineNum} | \`${cleanSnippet}\` |\n`;
    }
    md += `\n`;
  }
}

// Add analysis section
md += `## 2. Rangkuman Analisis Dampak V20

1. **authored-props.json**:
   - Dipakai di \`utils/assetPlacementV10.js\` dan skrip validasi V10.
   - Di V20 (P3), rumah yang ber-anchorId pemukiman dipindahkan ke \`anchors.json[].v20.residences\` dan prop pemukiman dibersihkan.
   - Bridge & landmark di luar pemukiman tetap dipertahankan.

2. **settlements/*_blueprint.json**:
   - Dipakai terutama di \`utils/settlementEngine.js\` (\`loadBlueprints\`).
   - Di V20 (P3/P6), seluruh blueprint dimigrasikan ke sumber tunggal \`world-data/settlement-facilities-v20.json\`, lalu blueprint lama dihapus di P9.

3. **isSettlementOrigin**:
   - Dipakai di \`utils/proceduralWorldEngine.js\`, \`utils/chunkStreamingEngine.js\`, \`web-dashboard/src/lib/chunkManager.ts\`, \`WorldCanvas.tsx\` (L1226 label), dan \`ZoneGridView.tsx\`.
   - Di V20 (P4/P5), ketergantungan UI digantikan oleh \`isSettlementEntrance\` untuk masuk dan hit-test marker objek besar untuk label/klik pemukiman.

4. **ANCHOR_SETTLEMENTS**:
   - Diekspor oleh \`utils/proceduralWorldEngine.js\` dari \`world-data/anchors.json\`.
   - Dipakai oleh \`web-api/routes/world.js\`, \`services/gridZoneService.js\`, dan kues/ferry.
   - Di V20, definisi anchor tetap dipertahankan; koordinat x,y dan span tetap sama sehingga tidak memutus rute/logika downstream.

5. **village-archetypes-v9.json**:
   - Dipakai oleh skrip v10/v11 dan generator peta.
   - Di V20 (P3), dipakai sebagai sumber penentuan arketipe marker (\`markerDefId\`) untuk desa dan dusun.
`;

fs.writeFileSync(path.join(DOCS_V20, 'consumers.md'), md, 'utf8');
console.log(`[CONSUMERS] Berhasil menulis docs/v20/consumers.md!`);
