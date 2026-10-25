const { getMonstersInChunk } = require('../utils/monsterSpawnEngine');
const worldData = require('../utils/worldData');
const { getTileAt } = require('../utils/proceduralWorldEngine');
const regions = require('../world-data/regions.json');

const regionCounts = {};
for (const reg of regions) {
  regionCounts[reg.id] = { tier: reg.dangerTier || 1, counts: [] };
}

// Sample up to 10 land chunks per region
for (const reg of regions) {
  const minCX = Math.floor(reg.bounds.minX / 32);
  const maxCX = Math.floor(reg.bounds.maxX / 32);
  const minCY = Math.floor(reg.bounds.minY / 32);
  const maxCY = Math.floor(reg.bounds.maxY / 32);

  let samples = 0;
  // Step across chunk grid
  const stepX = Math.max(1, Math.floor((maxCX - minCX) / 8));
  const stepY = Math.max(1, Math.floor((maxCY - minCY) / 8));

  for (let cx = minCX + 1; cx < maxCX && samples < 12; cx += stepX) {
    for (let cy = minCY + 1; cy < maxCY && samples < 12; cy += stepY) {
      const midX = cx * 32 + 16;
      const midY = cy * 32 + 16;
      const r = worldData.getRegionAt(midX, midY);
      if (r && r.id === reg.id) {
        const tile = getTileAt(midX, midY);
        // Only sample chunks with walkable land
        if (tile && !tile.isSolid && !/river|lake|sea|ocean/i.test(tile.terrainType)) {
          const m = getMonstersInChunk(cx, cy);
          regionCounts[reg.id].counts.push(m.size);
          samples++;
        }
      }
    }
  }

  // Fallback: if uniform grid missed walkable spots in barrier regions, sample near challenge points
  if (regionCounts[reg.id].counts.length < 3) {
    const rc = require('../world-data/region_challenge_v9.json')[reg.id];
    if (rc && rc.eliteCamps) {
      for (const camp of rc.eliteCamps) {
        const ccx = Math.floor(camp.x / 32);
        const ccy = Math.floor(camp.y / 32);
        const m = getMonstersInChunk(ccx, ccy);
        regionCounts[reg.id].counts.push(m.size);
      }
    }
    if (rc && rc.lair) {
      const lcx = Math.floor(rc.lair.x / 32);
      const lcy = Math.floor(rc.lair.y / 32);
      const m = getMonstersInChunk(lcx, lcy);
      regionCounts[reg.id].counts.push(m.size);
    }
  }
}

function median(arr) {
  if (arr.length === 0) return 0;
  const s = [...arr].sort((a,b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 !== 0 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

console.log('| Region | Tier | Samples | Median Monsters/Chunk | Status |');
console.log('|---|---|---|---|---|');
let tier1Pass = true;
let tier4Pass = true;

for (const [rId, data] of Object.entries(regionCounts)) {
  const med = median(data.counts);
  let status = 'PASS';
  if (data.tier === 1) {
    if (med < 1 || med > 2) {
      tier1Pass = false;
      status = 'FAIL';
    }
  } else if (data.tier >= 4) {
    if (med < 3 || med > 6) {
      tier4Pass = false;
      status = 'FAIL';
    }
  }
  console.log(`| ${rId} | ${data.tier} | ${data.counts.length} | ${med} | ${status} |`);
}

console.log('\nTier 1 Pass (in [1,2]):', tier1Pass);
console.log('Tier >= 4 Pass (in [3,6]):', tier4Pass);
