const fs = require('fs');
const anchors = JSON.parse(fs.readFileSync('world-data/anchors.json', 'utf8'));
const regions = JSON.parse(fs.readFileSync('world-data/regions.json', 'utf8'));

const anchorsByRegion = {};
anchors.forEach(a => {
  const r = a.region || 'central_plains';
  if (!anchorsByRegion[r]) anchorsByRegion[r] = [];
  anchorsByRegion[r].push(a);
});

console.log('Total regions:', regions.length);
regions.forEach((r, i) => {
  const ancs = anchorsByRegion[r.id] || [];
  let x, y, focalName;
  if (ancs.length > 0) {
    x = ancs[0].x;
    y = ancs[0].y;
    focalName = ancs[0].name;
  } else {
    x = Math.round((r.bounds.minX + r.bounds.maxX) / 2);
    y = Math.round((r.bounds.minY + r.bounds.maxY) / 2);
    focalName = 'Pusat Region';
  }
  console.log(`${i + 1}. [${r.id}] "${r.name}" (${focalName}) at (${x}, ${y})`);
});
