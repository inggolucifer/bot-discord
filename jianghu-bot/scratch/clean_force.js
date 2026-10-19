const fs = require('fs');
let code = fs.readFileSync('scripts/assets/ingestGeneratedAssets.js', 'utf8');

const targetStr = "id: 'structure_scatter_ruin_ancient_broken_halberd_sword_grave'";
const p205Index = code.indexOf(targetStr);
console.log('P2-05 index:', p205Index);

if (p205Index !== -1) {
  const beforeP205 = code.substring(0, p205Index);
  const p205AndAfter = code.substring(p205Index);
  const cleanedBefore = beforeP205.replace(/force:\s*true,/g, 'force: false,');
  fs.writeFileSync('scripts/assets/ingestGeneratedAssets.js', cleanedBefore + p205AndAfter, 'utf8');
  console.log('Cleaned force: true from prior batches!');
}
