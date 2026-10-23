const fs = require('fs');
const regions = JSON.parse(fs.readFileSync('world-data/regions.json', 'utf8'));
console.log('Total regions in regions.json:', regions.length);
regions.forEach((r, i) => {
  const cx = r.centerX || Math.round((r.bounds.minX + r.bounds.maxX) / 2);
  const cy = r.centerY || Math.round((r.bounds.minY + r.bounds.maxY) / 2);
  console.log(`${i + 1}. [${r.id}] ${r.name || r.id} at (${cx}, ${cy})`);
});
