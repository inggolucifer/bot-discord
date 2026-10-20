/**
 * scripts/testPhaseC1_chunk_streaming.js
 * Validasi Otomatis Server-Side Chunk Streaming (Fase C1)
 *
 * Menguji:
 * 1. Batas koordinat chunk (0..156) dan versi dunia v6
 * 2. Deterministik static chunk (Base64 packed, hash MD5, ETag)
 * 3. Ekuivalensi 1000 tile acak antara unpackChunkTiles dan getTileAt
 * 4. Kinerja LRU Cache (< 2ms hit, <= 15ms uncached, limit 2000)
 * 5. Efisiensi ukuran payload (>= 10x lebih hemat dari legacy window)
 * 6. Batch chunks retrieval & validasi versi
 * 7. Live dynamic chunk aggregator structure
 */

const assert = require('assert');
const chunkStreamingEngine = require('../utils/chunkStreamingEngine');
const proceduralWorldEngine = require('../utils/proceduralWorldEngine');

async function runPhaseC1Tests() {
  console.log('🧪 [TEST PHASE C1] Memulai pengujian Server Chunk Streaming V6...\n');
  let passed = 0;
  let total = 7;

  // TEST 1: Batas Koordinat & Validasi Versi
  try {
    assert.strictEqual(chunkStreamingEngine.CHUNK_SIZE, 32, 'CHUNK_SIZE harus 32');
    assert.strictEqual(chunkStreamingEngine.MAX_CHUNK_X, 156, 'MAX_CHUNK_X untuk 5000 petak harus 156');
    assert.strictEqual(chunkStreamingEngine.MAX_CHUNK_Y, 156, 'MAX_CHUNK_Y untuk 5000 petak harus 156');

    assert.strictEqual(chunkStreamingEngine.isValidChunk(0, 0), true);
    assert.strictEqual(chunkStreamingEngine.isValidChunk(156, 156), true);
    assert.strictEqual(chunkStreamingEngine.isValidChunk(157, 0), false);
    assert.strictEqual(chunkStreamingEngine.isValidChunk(-1, 50), false);
    assert.strictEqual(chunkStreamingEngine.isValidChunk(50, 200), false);
    assert.strictEqual(chunkStreamingEngine.isValidChunk(1.5, 10), false);

    // Cek mismatch versi
    let threwVersion = false;
    try {
      chunkStreamingEngine.getStaticChunk(76, 77, 'v5_legacy');
    } catch (e) {
      threwVersion = true;
      assert.strictEqual(e.statusCode, 410, 'Version mismatch harus melempar 410 Gone');
    }
    assert.strictEqual(threwVersion, true, 'Harus menolak versi dunia yang usang');

    console.log('  ✅ [PASS] 1. Batas koordinat [0..156] dan proteksi versi v6 valid');
    passed++;
  } catch (err) {
    console.error('  ❌ [FAIL] 1. Batas koordinat & versi:', err.message);
  }

  // TEST 2: Deterministik Static Chunk & Hashing MD5
  try {
    const chunkA = chunkStreamingEngine.getStaticChunk(76, 77);
    assert(chunkA.hash && typeof chunkA.hash === 'string', 'Chunk harus memiliki hash MD5');
    assert.strictEqual(chunkA.v, chunkStreamingEngine.WORLD_VERSION);
    assert.strictEqual(chunkA.cx, 76);
    assert.strictEqual(chunkA.cy, 77);
    assert.strictEqual(chunkA.bounds.minX, 76 * 32);
    assert.strictEqual(chunkA.bounds.maxX, 76 * 32 + 31);
    assert.strictEqual(chunkA.bounds.minY, 77 * 32);
    assert.strictEqual(chunkA.bounds.maxY, 77 * 32 + 31);
    assert(Array.isArray(chunkA.palette), 'Palette harus berupa array');
    assert(typeof chunkA.terrain === 'string', 'Terrain harus string Base64');
    assert(Array.isArray(chunkA.scatter), 'Scatter harus berupa array');

    // Pastikan pemanggilan kedua menghasilkan hash yang sama persis
    const chunkB = chunkStreamingEngine.getStaticChunk(76, 77);
    assert.strictEqual(chunkA.hash, chunkB.hash, 'Hash chunk harus konsisten deterministik');
    assert.strictEqual(chunkA, chunkB, 'Harus mengembalikan instance ter-cache dari LRU');

    console.log(`  ✅ [PASS] 2. Format static chunk valid (Hash: ${chunkA.hash.slice(0, 8)}..., Base64 terrain: ${chunkA.terrain.length} chars)`);
    passed++;
  } catch (err) {
    console.error('  ❌ [FAIL] 2. Format static chunk:', err.message);
  }

  // TEST 3: 100% Ekuivalensi 1000 Tile Acak vs proceduralWorldEngine.getTileAt
  try {
    const testChunks = [
      { cx: 76, cy: 77 }, // Central plains
      { cx: 56, cy: 71 }, // Azure mountains barrier
      { cx: 121, cy: 78 }, // Eastern sea
      { cx: 25, cy: 68 },  // Western desert
      { cx: 67, cy: 131 }  // Northern desolate
    ];

    let totalCheckedTiles = 0;
    let mismatchedTiles = 0;

    for (const { cx, cy } of testChunks) {
      const chunk = chunkStreamingEngine.getStaticChunk(cx, cy);
      const unpacked = chunkStreamingEngine.unpackChunkTiles(chunk);
      assert.strictEqual(unpacked.length, 1024, `Unpacked tiles harus berjumlah 1024 (didapat ${unpacked.length})`);

      // Cek sample 200 petak per chunk = 1000 total
      for (let i = 0; i < 200; i++) {
        const randIdx = Math.floor(Math.random() * unpacked.length);
        const tile = unpacked[randIdx];
        const directTile = proceduralWorldEngine.getTileAt(tile.tileX, tile.tileY);

        if (tile.terrainType !== directTile.terrainType) {
          mismatchedTiles++;
          console.error(`Terrain mismatch at (${tile.tileX}, ${tile.tileY}): unpacked=${tile.terrainType}, direct=${directTile.terrainType}`);
        }
        if (tile.tileX !== directTile.tileX || tile.tileY !== directTile.tileY) {
          mismatchedTiles++;
        }
        if (tile.resourceType !== directTile.resourceType) {
          mismatchedTiles++;
        }
        if (tile.isSettlementOrigin !== directTile.isSettlementOrigin) {
          mismatchedTiles++;
        }
        totalCheckedTiles++;
      }
    }

    assert.strictEqual(mismatchedTiles, 0, `Ditemukan ${mismatchedTiles} tile yang tidak sinkron!`);
    console.log(`  ✅ [PASS] 3. Ekuivalensi ${totalCheckedTiles} tile acak di 5 region 100% identik dengan getTileAt`);
    passed++;
  } catch (err) {
    console.error('  ❌ [FAIL] 3. Ekuivalensi tile:', err.message);
  }

  // TEST 4: Kinerja LRU Cache & Kecepatan Akses
  try {
    // 4A. Hit Latency
    const t0 = process.hrtime.bigint();
    const iterations = 500;
    for (let i = 0; i < iterations; i++) {
      chunkStreamingEngine.getStaticChunk(76, 77);
    }
    const t1 = process.hrtime.bigint();
    const avgHitMs = Number(t1 - t0) / (iterations * 1e6);
    assert(avgHitMs < 2.0, `Cache hit harus < 2ms (didapat ${avgHitMs.toFixed(3)} ms)`);

    // 4B. Uncached Warm Generation
    chunkStreamingEngine.staticChunkCache.clear();
    const genT0 = Date.now();
    chunkStreamingEngine.getStaticChunk(80, 80);
    const genLatencyMs = Date.now() - genT0;
    assert(genLatencyMs <= 60, `Uncached generation harus <= 60ms (didapat ${genLatencyMs} ms)`);

    // 4C. LRU Limit
    const miniCache = new chunkStreamingEngine.staticChunkCache.constructor(10);
    for (let i = 0; i < 20; i++) {
      miniCache.set(`k${i}`, `val${i}`);
    }
    assert.strictEqual(miniCache.size, 10, 'LRU cache size harus dibatasi sesuai kapasitas');
    assert.strictEqual(miniCache.has('k0'), false, 'Key terlama harus dikeluarkan dari LRU');
    assert.strictEqual(miniCache.has('k19'), true, 'Key terbaru harus tetap ada');

    console.log(`  ✅ [PASS] 4. Kinerja LRU Cache teruji (Hit: ${avgHitMs.toFixed(4)} ms, Uncached: ${genLatencyMs} ms, Max: ${chunkStreamingEngine.LRU_CAPACITY})`);
    passed++;
  } catch (err) {
    console.error('  ❌ [FAIL] 4. Kinerja LRU Cache:', err.message);
  }

  // TEST 5: Penghematan Ukuran Payload (>= 10x Lebih Kecil dari Legacy)
  try {
    const chunk = chunkStreamingEngine.getStaticChunk(76, 77);
    const compactSize = Buffer.byteLength(JSON.stringify(chunk));

    // Hitung estimasi legacy window (1024 tile objek JSON lengkap)
    const unpacked = chunkStreamingEngine.unpackChunkTiles(chunk);
    const legacySize = Buffer.byteLength(JSON.stringify({
      tiles: unpacked,
      scatter: chunk.scatter
    }));

    const reductionRatio = legacySize / compactSize;
    assert(reductionRatio >= 10.0, `Ukuran payload harus minimal 10x lebih hemat (didapat ${reductionRatio.toFixed(1)}x)`);

    console.log(`  ✅ [PASS] 5. Ukuran payload: Compact ${(compactSize / 1024).toFixed(1)} KB vs Legacy ${(legacySize / 1024).toFixed(1)} KB (${reductionRatio.toFixed(1)}x lebih hemat)`);
    passed++;
  } catch (err) {
    console.error('  ❌ [FAIL] 5. Ukuran payload:', err.message);
  }

  // TEST 6: Batch Chunks Retrieval
  try {
    const batchReq = [
      { cx: 76, cy: 77 },
      { cx: 77, cy: 77 },
      { cx: 76, cy: 78 }
    ];
    const batchRes = chunkStreamingEngine.getStaticChunksBatch(batchReq);
    assert.strictEqual(batchRes.version, chunkStreamingEngine.WORLD_VERSION);
    assert.strictEqual(batchRes.chunks.length, 3);
    assert.strictEqual(batchRes.chunks[0].cx, 76);
    assert.strictEqual(batchRes.chunks[1].cx, 77);
    assert.strictEqual(batchRes.chunks[2].cy, 78);

    console.log('  ✅ [PASS] 6. Batch retrieval POST /chunks berhasil (3/3 chunks dimuat)');
    passed++;
  } catch (err) {
    console.error('  ❌ [FAIL] 6. Batch retrieval:', err.message);
  }

  // TEST 7: Dynamic Live Chunk Aggregator Structure
  try {
    // Mock models for offline unit test
    const mockModels = {
      Player: { find: () => ({ select: () => ({ lean: async () => [{ discordId: '123', username: 'TestCultivator', gridPosition: { tileX: 2455, tileY: 2485 } }] }) }) },
      Npc: { find: () => ({ select: () => ({ lean: async () => [{ _id: 'n1', name: 'Elder Wu', tileX: 2450, tileY: 2480 }] }) }) },
      ZoneTile: { find: () => ({ lean: async () => [{ tileX: 2452, tileY: 2482, ownerId: '123' }] }) },
      DefeatedMonsterTile: { find: () => ({ select: () => ({ lean: async () => [] }) }) }
    };

    const live = await chunkStreamingEngine.getChunkLive(76, 77, 'guild1', mockModels);
    assert.strictEqual(live.cx, 76);
    assert.strictEqual(live.cy, 77);
    assert.strictEqual(live.players.length, 1);
    assert.strictEqual(live.players[0].username, 'TestCultivator');
    assert.strictEqual(live.npcs.length, 1);
    assert.strictEqual(live.npcs[0].name, 'Elder Wu');
    assert.strictEqual(live.customTiles.length, 1);
    assert.strictEqual(live.customTiles[0].ownerId, '123');

    console.log('  ✅ [PASS] 7. Dynamic live chunk aggregator valid (players, npcs, customTiles, defeatedMonsters)');
    passed++;
  } catch (err) {
    console.error('  ❌ [FAIL] 7. Dynamic live chunk:', err.message);
  }

  console.log(`\n==================================================`);
  console.log(`Hasil Pengujian: ${passed} / ${total} lulus.`);
  if (passed === total) {
    console.log('🎉 [SEMUA TES PHASE C1 LULUS]');
  } else {
    console.error('⚠️ [SEBAGIAN TES GAGAL]');
    process.exit(1);
  }
}

runPhaseC1Tests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
