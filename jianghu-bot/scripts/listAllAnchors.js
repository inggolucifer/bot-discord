const fs = require('fs');
const anchors = JSON.parse(fs.readFileSync('world-data/anchors.json', 'utf8'));
anchors.forEach(a => {
  console.log(`[${a.region}] "${a.name}" at (${a.x}, ${a.y})`);
});
