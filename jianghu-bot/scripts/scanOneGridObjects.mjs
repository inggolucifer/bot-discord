import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const canonPath = path.resolve(__dirname, '../world-data/scale-canon.json');
const canon = JSON.parse(fs.readFileSync(canonPath, 'utf8'));

const categorized = {};
for (const [id, c] of Object.entries(canon)) {
  if (!categorized[c.category]) categorized[c.category] = [];
  categorized[c.category].push({ id, w: c.visualW, h: c.visualH, cat: c.category, class: c.class });
}

for (const [cat, list] of Object.entries(categorized)) {
  console.log(`\n=== Category [${cat}] (${list.length} items) ===`);
  list.forEach(x => {
    // Print all items in category, or flag if suspicious
    const isSuspicious = (
      (cat === 'mountain' && !x.id.startsWith('mt_') && !x.id.includes('peak') && !x.id.includes('cliff') && !x.id.includes('crag') && !x.id.includes('bastion') && !x.id.includes('pillar') && !x.id.includes('ridge') && !x.id.includes('rock')) ||
      (cat === 'building' && (x.id.includes('lantern') || x.id.includes('well') || x.id.includes('bench') || x.id.includes('stall') || x.id.includes('sign') || x.id.includes('post') || x.id.includes('fence'))) ||
      (cat === 'nature' && (x.id.includes('flower') || x.id.includes('peony') || x.id.includes('tea') || x.id.includes('herb') || x.id.includes('lotus') || x.id.includes('shrub') || x.id.includes('bush') || x.id.includes('ginseng') || x.id.includes('creeper'))) ||
      (x.w >= 2.0 && (x.id.includes('flower') || x.id.includes('herb') || x.id.includes('lantern') || x.id.includes('well') || x.id.includes('shrub') || x.id.includes('peony') || x.id.includes('camellia')))
    );
    if (isSuspicious) {
      console.log(`  [SUSPICIOUS 1-GRID]: ${x.id}: cat=${cat}, class=${x.class}, visualW=${x.w}, visualH=${x.h}`);
    }
  });
}
