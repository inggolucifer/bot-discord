const fs = require('fs');
const anchors = JSON.parse(fs.readFileSync('world-data/anchors.json', 'utf8'));

console.log('Total anchors:', anchors.length);
for (const a of anchors) {
  console.log(`${a.id} | ${a.name} | region: ${a.region} | pos: (${a.x}, ${a.y})`);
}
