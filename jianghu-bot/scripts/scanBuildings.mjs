import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const canonPath = path.resolve(__dirname, '../world-data/scale-canon.json');
const canon = JSON.parse(fs.readFileSync(canonPath, 'utf8'));

const blds = Object.entries(canon).filter(([id, c]) => c.category === 'building');
console.log('Total buildings in canon:', blds.length);

blds.forEach(([id, c]) => {
  console.log(`[building] ${id}: visualW=${c.visualW}, visualH=${c.visualH}, class=${c.class}`);
});
