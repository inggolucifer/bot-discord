const fs = require('fs');
const manifest = JSON.parse(fs.readFileSync('web-dashboard/public/assets/atlas/biome_nature_7.json', 'utf8'));
console.log('Frames in biome_nature_7:', Object.keys(manifest.frames).length);
for (const [id, f] of Object.entries(manifest.frames)) {
  console.log(`  ${id} -> [${f.frame.x}, ${f.frame.y}, ${f.frame.w}, ${f.frame.h}]`);
}
