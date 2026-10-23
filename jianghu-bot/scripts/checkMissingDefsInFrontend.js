const fs = require('fs');
const bindings = JSON.parse(fs.readFileSync('config/asset-bindings.json', 'utf8'));
const procCode = fs.readFileSync('web-dashboard/src/lib/proceduralObjects.ts', 'utf8');

const allDefs = [];
for (const [k, v] of Object.entries(bindings.landmarks)) allDefs.push(v.defId);
for (const [k, v] of Object.entries(bindings.natureScatters)) {
  for (const item of v) allDefs.push(item.defId);
}
for (const [k, v] of Object.entries(bindings.settlementObjects)) {
  for (const item of v) allDefs.push(item.defId);
}

const missing = [];
for (const defId of allDefs) {
  if (!procCode.includes(`'${defId}'`) && !procCode.includes(`"${defId}"`)) {
    missing.push(defId);
  }
}
console.log('Total defIds in asset-bindings:', allDefs.length);
console.log('Missing from proceduralObjects.ts:', missing);
