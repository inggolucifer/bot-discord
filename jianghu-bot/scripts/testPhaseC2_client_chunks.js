/**
 * scripts/testPhaseC2_client_chunks.js
 * Validasi Otomatis Client-Side Chunk Streaming (Fase C2)
 *
 * Menguji:
 * 1. Transformasi koordinat dunia ke chunk (worldToChunkCoord, chunkToBounds)
 * 2. Algoritma Cincin Hot, Warm, dan Cold adaptif terhadap zoom
 * 3. Client unpacking Base64 & Palette menjadi TileData lengkap
 * 4. Fast O(1) tile lookup (chunkManager.getTile) dan overlay live data
 * 5. Antrean fetch terprioritisasi (jarak Euclidean terdekat) & deduplikasi
 * 6. Manajemen memori resident LRU (pembatasan maksimal 64 chunk resident)
 */

const assert = require('assert');
const chunkStreamingEngine = require('../utils/chunkStreamingEngine');

// Import ChunkManager logic (transpiled/required or direct TS test equivalent)
// Since Next.js is in TS, we require the module or implement test harness matching chunkManager.ts
const {
  CHUNK_SIZE,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  MAX_CHUNK_X,
  MAX_CHUNK_Y,
  MAX_RESIDENT_CHUNKS,
  worldToChunkCoord,
  chunkToBounds,
  decodeBase64ToUint8
} = require('./testChunkManagerHarness');

async function runPhaseC2Tests() {
  console.log('🧪 [TEST PHASE C2] Memulai pengujian Client Chunk Streaming V6...\n');
  let passed = 0;
  let total = 6;

  // TEST 1: Transformasi Koordinat Dunia <-> Chunk
  try {
    // (0, 0) -> chunk (0, 0), local (0, 0), idx 0
    const c0 = worldToChunkCoord(0, 0);
    assert.strictEqual(c0.cx, 0);
    assert.strictEqual(c0.cy, 0);
    assert.strictEqual(c0.lx, 0);
    assert.strictEqual(c0.ly, 0);
    assert.strictEqual(c0.index, 0);

    // (31, 31) -> chunk (0, 0), local (31, 31), idx 1023
    const c31 = worldToChunkCoord(31, 31);
    assert.strictEqual(c31.cx, 0);
    assert.strictEqual(c31.cy, 0);
    assert.strictEqual(c31.lx, 31);
    assert.strictEqual(c31.ly, 31);
    assert.strictEqual(c31.index, 31 * 32 + 31);

    // (2450, 2480) -> chunk (76, 77)
    const cP = worldToChunkCoord(2450, 2480);
    assert.strictEqual(cP.cx, Math.floor(2450 / 32));
    assert.strictEqual(cP.cy, Math.floor(2480 / 32));
    assert.strictEqual(cP.lx, 2450 % 32);
    assert.strictEqual(cP.ly, 2480 % 32);

    // Bounds check
    const b76 = chunkToBounds(76, 77);
    assert.strictEqual(b76.minX, 76 * 32);
    assert.strictEqual(b76.maxX, 76 * 32 + 31);
    assert.strictEqual(b76.minY, 77 * 32);
    assert.strictEqual(b76.maxY, 77 * 32 + 31);

    console.log('  ✅ [PASS] 1. Transformasi koordinat dunia ke chunk & bounds 100% akurat');
    passed++;
  } catch (err) {
    console.error('  ❌ [FAIL] 1. Transformasi koordinat:', err.message);
  }

  // TEST 2: Cincin Hot & Warm Adaptif
  try {
    const { ChunkManager } = require('./testChunkManagerHarness');
    const cm = new ChunkManager();

    // Normal zoom 1.0 -> hotRadius 1 (3x3 = 9 chunks), warmRadius 2 (5x5 = 25 chunks - 9 = 16 warm)
    const ringsNormal = cm.computeRings(2450, 2480, 1.0);
    assert.strictEqual(ringsNormal.hot.length, 9, 'Hot ring pada zoom 1.0 harus 9 chunk (3x3)');
    assert.strictEqual(ringsNormal.warm.length, 16, 'Warm ring pada zoom 1.0 harus 16 chunk keliling');
    assert.strictEqual(ringsNormal.centerCx, Math.floor(2450 / 32));
    assert.strictEqual(ringsNormal.centerCy, Math.floor(2480 / 32));

    // Macro zoom 0.2 -> hotRadius 3 (7x7 = 49 chunks)
    const ringsMacro = cm.computeRings(2450, 2480, 0.2);
    assert.strictEqual(ringsMacro.hot.length, 49, 'Hot ring pada zoom makro harus 49 chunk (7x7)');

    console.log('  ✅ [PASS] 2. Komputasi cincin Hot/Warm adaptif terhadap zoom kamera (Normal: 9 hot + 16 warm)');
    passed++;
  } catch (err) {
    console.error('  ❌ [FAIL] 2. Cincin Hot/Warm:', err.message);
  }

  // TEST 3: Client Unpacking Base64 & Palette
  try {
    const { ChunkManager } = require('./testChunkManagerHarness');
    const cm = new ChunkManager();

    // Buat static chunk dari server engine
    const serverChunk = chunkStreamingEngine.getStaticChunk(76, 77);
    const unpacked = cm.unpackChunk(serverChunk);

    assert.strictEqual(unpacked.length, 1024, 'Unpacked tiles harus berjumlah 1024');
    assert.strictEqual(unpacked[0].tileX, 76 * 32);
    assert.strictEqual(unpacked[0].tileY, 77 * 32);
    assert.strictEqual(typeof unpacked[0].terrainType, 'string');
    assert(unpacked[1023].tileX === 76 * 32 + 31 && unpacked[1023].tileY === 77 * 32 + 31);

    // Ingest ke manager
    cm.ingestStaticChunk(serverChunk);
    assert.strictEqual(cm.getLoadedChunkCount(), 1);

    console.log(`  ✅ [PASS] 3. Client Unpacking Base64 & Palette berhasil merekonstruksi 1024 TileData`);
    passed++;
  } catch (err) {
    console.error('  ❌ [FAIL] 3. Client Unpacking:', err.message);
  }

  // TEST 4: Fast O(1) Tile Lookup & Live Data Overlay
  try {
    const { ChunkManager } = require('./testChunkManagerHarness');
    const cm = new ChunkManager();
    const serverChunk = chunkStreamingEngine.getStaticChunk(76, 77);
    cm.ingestStaticChunk(serverChunk);

    // O(1) lookup
    const tile = cm.getTile(2450, 2480);
    assert(tile !== null, 'Petak (2450, 2480) harus ditemukan');
    assert.strictEqual(tile.tileX, 2450);
    assert.strictEqual(tile.tileY, 2480);

    // Petak di luar chunk yang belum dimuat mengembalikan null
    const unreachedTile = cm.getTile(100, 100);
    assert.strictEqual(unreachedTile, null, 'Petak belum dimuat harus mengembalikan null');

    // Live overlay simulation
    const liveUpdate = {
      cx: 76,
      cy: 77,
      timestamp: Date.now(),
      players: [],
      npcs: [],
      customTiles: [{
        tileX: 2450,
        tileY: 2480,
        ownerId: 'cultivator_999',
        buildingName: 'Gazebo Paviliun Emas',
        isUnderConstruction: false
      }],
      defeatedMonsterKeys: []
    };
    cm.setLiveData(liveUpdate);

    const updatedTile = cm.getTile(2450, 2480);
    assert.strictEqual(updatedTile.ownerId, 'cultivator_999');
    assert.strictEqual(updatedTile.buildingName, 'Gazebo Paviliun Emas');

    console.log('  ✅ [PASS] 4. Fast O(1) tile lookup & dynamic live data overlay terverifikasi');
    passed++;
  } catch (err) {
    console.error('  ❌ [FAIL] 4. O(1) Lookup & Live Overlay:', err.message);
  }

  // TEST 5: Prioritas Antrean Fetch Berdasarkan Jarak Euclidean
  try {
    const { ChunkManager } = require('./testChunkManagerHarness');
    const cm = new ChunkManager();

    // Kamera di (2450, 2480) -> chunk (76, 77)
    const { hot, warm } = cm.computeRings(2450, 2480, 1.0);
    const sortedQueue = cm.getPrioritizedFetchQueue(hot, warm, 76, 77);

    // Elemen pertama harus chunk pusat (76, 77) dengan jarak 0
    assert.strictEqual(sortedQueue[0].cx, 76);
    assert.strictEqual(sortedQueue[0].cy, 77);

    // Periksa bahwa jarak selalu menaik secara non-decreasing
    for (let i = 1; i < sortedQueue.length; i++) {
      const prevDist = Math.hypot(sortedQueue[i - 1].cx - 76, sortedQueue[i - 1].cy - 77);
      const currDist = Math.hypot(sortedQueue[i].cx - 76, sortedQueue[i].cy - 77);
      assert(currDist >= prevDist - 1e-6, 'Antrean harus terurut berdasarkan jarak terdekat');
    }

    console.log(`  ✅ [PASS] 5. Antrean fetch terprioritisasi presisi (Total ${sortedQueue.length} chunk terurut jarak)`);
    passed++;
  } catch (err) {
    console.error('  ❌ [FAIL] 5. Prioritas Fetch Queue:', err.message);
  }

  // TEST 6: Manajemen Memori Resident LRU (Max 64 Chunk)
  try {
    const { ChunkManager } = require('./testChunkManagerHarness');
    const cm = new ChunkManager();

    // Muat 80 chunk ke dalam memori
    for (let cx = 0; cx < 10; cx++) {
      for (let cy = 0; cy < 8; cy++) {
        cm.ingestStaticChunk({
          v: 'v6_20260916',
          cx,
          cy,
          bounds: chunkToBounds(cx, cy),
          palette: ['plains'],
          terrain: Buffer.alloc(1024).toString('base64'),
          specialTiles: {},
          scatter: [],
          hash: `hash_${cx}_${cy}`
        });
      }
    }

    assert.strictEqual(cm.getLoadedChunkCount(), 80, 'Sebelum eviksi harus 80 chunk');

    // Kamera dipusatkan ke (0, 0), memicu eviksi cold chunks
    cm.updateCamera(0, 0, 1.0);

    assert(cm.getLoadedChunkCount() <= MAX_RESIDENT_CHUNKS, `Memori resident harus <= ${MAX_RESIDENT_CHUNKS} (didapat ${cm.getLoadedChunkCount()})`);

    // Pastikan chunk di Hot ring (0,0) tetap ada
    assert(cm.hasChunk(0, 0), 'Chunk di Hot ring (0, 0) tidak boleh dieviki');

    console.log(`  ✅ [PASS] 6. Manajemen memori resident LRU berhasil membatasi memory cache (Tersisa: ${cm.getLoadedChunkCount()} <= ${MAX_RESIDENT_CHUNKS} chunk)`);
    passed++;
  } catch (err) {
    console.error('  ❌ [FAIL] 6. LRU Eviction:', err.message);
  }

  console.log(`\n==================================================`);
  console.log(`Hasil Pengujian: ${passed} / ${total} lulus.`);
  if (passed === total) {
    console.log('🎉 [SEMUA TES PHASE C2 LULUS]');
  } else {
    console.error('⚠️ [SEBAGIAN TES GAGAL]');
    process.exit(1);
  }
}

runPhaseC2Tests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
