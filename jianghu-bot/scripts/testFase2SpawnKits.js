/**
 * testFase2SpawnKits.js
 * Verifikasi Mandiri Fase 2: 7 Titik Kelahiran & Starter Kits Otoritatif
 */

const assert = require('assert');
const { ORIGIN_SPAWNS, getOriginSpawn } = require('../config/starterKits');
const { getRegionAt } = require('../utils/worldRegionEngine');
const proceduralWorldEngine = require('../utils/proceduralWorldEngine');

async function testFase2() {
  console.log('--- [TEST FASE 2] Memulai Verifikasi 7 Origin Spawns & Starter Kits ---');

  const originKeys = Object.keys(ORIGIN_SPAWNS);
  assert.strictEqual(originKeys.length, 7, 'Harus ada tepat 7 titik asal kelahiran.');
  console.log(`1. Jumlah Origin Spawns terdaftar: ${originKeys.length} titik.`);

  for (const [key, origin] of Object.entries(ORIGIN_SPAWNS)) {
    assert.ok(origin.id, `Origin ${key} harus memiliki id`);
    assert.ok(origin.name, `Origin ${key} harus memiliki nama`);
    assert.ok(origin.spawnCoords, `Origin ${key} harus memiliki spawnCoords`);
    assert.ok(origin.starterKit, `Origin ${key} harus memiliki starterKit`);

    const { tileX, tileY } = origin.spawnCoords;
    const tileData = proceduralWorldEngine.getTileAt(tileX, tileY);

    // Titik spawn dilarang solid blocker
    assert.strictEqual(tileData.isSolid, false, `Titik spawn ${origin.name} di [${tileX}, ${tileY}] tidak boleh solid blocker!`);

    console.log(`   ✓ [${origin.id}] ${origin.name} di [${tileX}, ${tileY}]: terrain=${tileData.terrainType}, solid=${tileData.isSolid}, kit=${JSON.stringify(origin.starterKit.bonusStats || {})}`);
  }

  // Uji fallback
  const fallback = getOriginSpawn('unknown_fake_origin');
  assert.strictEqual(fallback.id, 'central_plains', 'Fallback harus ke central_plains');

  console.log('=== [TEST FASE 2 SELESAI: SEMUA 7 ORIGIN VALID & PLAYABLE] ===');
}

testFase2().catch((err) => {
  console.error('Test Failed:', err);
  process.exit(1);
});
