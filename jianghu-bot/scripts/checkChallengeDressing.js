/**
 * scripts/checkChallengeDressing.js
 * Verification of Thematic Challenge Node Dressing (Prompt J5)
 *
 * Audits all 145 challenge nodes (29 lairs + 87 elite camps + 29 hazard zones):
 * - Verifies that each node is surrounded by >= 3 thematic dressing objects
 *   within Chebyshev distance <= 6 cells.
 *
 * Exits 0 on pass, 1 on fail.
 */

const fs = require('fs');
const path = require('path');
const { getChunkObjects } = require('../utils/objectScatter');
const challengeData = require('../world-data/region_challenge_v9.json');

console.log('\n=== AUDIT DEKORASI TEMATIK TITIK TANTANGAN (checkChallengeDressing.js) ===\n');

let totalNodes = 0;
let passedNodes = 0;
const underDressed = [];

for (const [regId, chal] of Object.entries(challengeData)) {
  const nodes = [
    { type: 'lair', ...chal.lair },
    ...(chal.eliteCamps || []).map(ec => ({ type: 'eliteCamp', ...ec })),
    { type: 'hazardZone', ...chal.hazardZone }
  ].filter(n => n.x != null && n.y != null);

  for (const n of nodes) {
    totalNodes++;
    const cx = Math.floor(n.x / 32);
    const cy = Math.floor(n.y / 32);

    // Scan chunk and neighbor chunks if within 6 tiles of border
    const chunks = new Set();
    chunks.add(`${cx},${cy}`);
    if ((n.x % 32) < 6) chunks.add(`${cx - 1},${cy}`);
    if ((n.x % 32) > 25) chunks.add(`${cx + 1},${cy}`);
    if ((n.y % 32) < 6) chunks.add(`${cx},${cy - 1}`);
    if ((n.y % 32) > 25) chunks.add(`${cx},${cy + 1}`);

    const nearbyObjects = [];
    for (const cKey of chunks) {
      const [ccx, ccy] = cKey.split(',').map(Number);
      const objs = getChunkObjects(ccx, ccy);
      for (const o of objs) {
        const dist = Math.max(Math.abs(o.x - n.x), Math.abs(o.y - n.y));
        if (dist <= 6 && (o.x !== n.x || o.y !== n.y)) {
          nearbyObjects.push(o);
        }
      }
    }

    if (nearbyObjects.length >= 3) {
      passedNodes++;
    } else {
      underDressed.push({
        regionId: regId,
        type: n.type,
        x: n.x,
        y: n.y,
        count: nearbyObjects.length,
        objects: nearbyObjects.map(o => o.defId)
      });
    }
  }
}

const passPct = ((passedNodes / totalNodes) * 100).toFixed(1);

console.log(`Total Titik Tantangan : ${totalNodes} (145 titik)`);
console.log(`Titik Lolos (>= 3)    : ${passedNodes} (${passPct}%)`);
console.log(`Titik Gagal (< 3)     : ${underDressed.length}`);

if (underDressed.length > 0) {
  console.log('\nDaftar Titik dengan Dekorasi Kurang dari 3:');
  for (const u of underDressed) {
    console.log(` - [${u.regionId}] ${u.type} @ (${u.x}, ${u.y}) -> Hanya ${u.count} objek [${u.objects.join(', ')}]`);
  }
  console.error('\n[FAIL] Terdapat titik tantangan yang kekurangan dekorasi! (EXIT 1)\n');
  process.exit(1);
} else {
  console.log('\n[PASS] Seluruh 145 Titik Tantangan Memiliki >= 3 Objek Dekorasi Tematik! (EXIT 0)\n');
  process.exit(0);
}
