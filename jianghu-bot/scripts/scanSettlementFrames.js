const fs = require('fs');

for (const s of ['settlement_0', 'settlement_1', 'settlement_2', 'settlement_3', 'core_1']) {
  const manifest = JSON.parse(fs.readFileSync(`web-dashboard/public/assets/atlas/${s}.json`, 'utf8'));
  console.log(`=== ${s} ===`);
  for (const [id, f] of Object.entries(manifest.frames)) {
    if (id.includes('tea') || id.includes('pavilion') || id.includes('farm') || id.includes('hut') || id.includes('bamboo') || id.includes('house') || id.includes('pine')) {
      console.log(`  ${id} -> [${f.frame.x}, ${f.frame.y}, ${f.frame.w}, ${f.frame.h}]`);
    }
  }
}
