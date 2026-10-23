const fs = require('fs');
const path = require('path');
const atlasDir = path.resolve(__dirname, '../web-dashboard/public/assets/atlas');
const index = JSON.parse(fs.readFileSync(path.join(atlasDir, 'index.json'), 'utf8'));

const targets = ['bamboo', 'pavilion', 'hut', 'house', 'cleft', 'boulder', 'cypress', 'pine', 'rock_crag', 'farm'];
const matches = {};
for (const [id, meta] of Object.entries(index.frames)) {
  for (const t of targets) {
    if (id.toLowerCase().includes(t)) {
      if (!matches[t]) matches[t] = [];
      matches[t].push({ id, page: meta.page, frame: meta.frame });
    }
  }
}
for (const [k, v] of Object.entries(matches)) {
  console.log(`=== ${k} (${v.length} frames) ===`);
  v.forEach(x => console.log(`  ${x.id} -> ${x.page} [${x.frame.w}x${x.frame.h}]`));
}
