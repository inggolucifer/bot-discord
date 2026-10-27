/**
 * scripts/v11/probeTerrain.js
 * Probes terrain distributions, specifically checking T4 Arctic regions (shots 17-20)
 * to detect any unwanted plains/meadow/farmland terrain leaks in snowy tundra biomes.
 */

const { getTileAt, getRegionAt } = require('../../utils/proceduralWorldEngine');

const POINTS = [
  { name: '17_desa_xueshan', x: 2350, y: 4300 },
  { name: '18_dusun_pondok_es', x: 2000, y: 4250 },
  { name: '19_pos_tundra_salju', x: 2120, y: 4180 },
  { name: '20_istana_es_abadi', x: 1950, y: 4700 }
];

console.log('=== PROBE TERRAIN T4 ARCTIC / SNOW (probeTerrain.js) ===\n');

let totalSampled = 0;
let invalidTerrainCount = 0;

for (const pt of POINTS) {
  const counts = {};
  const radius = 16;
  const reg = getRegionAt ? getRegionAt(pt.x, pt.y) : null;
  console.log(`Point [${pt.name}] at (${pt.x}, ${pt.y}) - Region: ${reg ? reg.name || reg.id : 'unknown'}`);
  
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      totalSampled++;
      const tx = pt.x + dx;
      const ty = pt.y + dy;
      const tile = getTileAt(tx, ty);
      const t = tile ? tile.terrainType || tile.terrain : 'unknown';
      counts[t] = (counts[t] || 0) + 1;
      
      // T4 Arctic regions should NOT have temperate green plains, meadow, or tropical farmland
      if (['farmland', 'herb_field', 'bamboo_grove', 'bamboo_forest', 'oasis'].includes(t)) {
        invalidTerrainCount++;
      }
    }
  }
  
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  for (const [k, v] of sorted) {
    const pct = ((v / (33 * 33)) * 100).toFixed(1);
    console.log(`  - ${k.padEnd(18)}: ${v} (${pct}%)`);
  }
  console.log('');
}

console.log(`Total sel diperiksa: ${totalSampled}`);
if (invalidTerrainCount > 0) {
  console.log(`[WARN] Ditemukan ${invalidTerrainCount} sel terrain non-salju di area T4 Arktik.`);
} else {
  console.log(`[PASS] 0 kebocoran terrain non-salju di zona T4 Arktik.`);
}
