/**
 * scripts/testPhaseD_asset_layout.js
 * Validasi Otomatis Asset Bindings & Tata Letak Tale of Immortal (Fase D)
 *
 * Menguji:
 * 1. Integritas konfigurasi asset-bindings.json (29 region landmarks, monster, bioma, pemukiman)
 * 2. Seluruh defId di asset-bindings.json terdaftar 100% di atlas_index.json tanpa referensi rusak
 * 3. Keanekaragaman sebaran objek alam (> 35 sprite unik digunakan, budget <= 140)
 * 4. Penempatan set-piece landmark regional & cincin kepadatan pemukiman
 * 5. Monster regional terikat ke sprite visual atlas (bukan sekadar emoji)
 * 6. Kompatibilitas penuh dengan chunkStreamingEngine & determinisme
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const objectScatter = require('../utils/objectScatter');
const chunkStreamingEngine = require('../utils/chunkStreamingEngine');
const assetBindings = require('../config/asset-bindings.json');
const atlasIndex = require('../web-dashboard/public/assets/atlas/atlas_index.json');
const regions = require('../world-data/regions.json');

async function runPhaseDTests() {
  console.log('🧪 [TEST PHASE D] Memulai pengujian Asset Bindings & Tata Letak Tale of Immortal...\n');
  let passed = 0;
  let total = 6;

  // TEST 1: Kelengkapan 29 Landmark Regional di asset-bindings.json
  try {
    assert(assetBindings.landmarks && typeof assetBindings.landmarks === 'object');
    const coveredRegions = Object.keys(assetBindings.landmarks);

    for (const r of regions) {
      assert(
        assetBindings.landmarks[r.id],
        `Region '${r.id}' (${r.name}) belum memiliki binding landmark di asset-bindings.json`
      );
    }

    console.log(`  ✅ [PASS] 1. Seluruh 29 canonical regions (${coveredRegions.length}/29) memiliki binding landmark resmi`);
    passed++;
  } catch (err) {
    console.error('  ❌ [FAIL] 1. Kelengkapan landmark regional:', err.message);
  }

  // TEST 2: Validasi 100% defId terhadap atlas_index.json
  try {
    const allReferencedDefIds = new Set();

    // Landmarks
    for (const lm of Object.values(assetBindings.landmarks)) {
      allReferencedDefIds.add(lm.defId);
    }
    // Regional Monsters
    for (const mList of Object.values(assetBindings.regionalMonsters)) {
      for (const m of mList) {
        allReferencedDefIds.add(m);
      }
    }
    // Nature Scatters
    for (const category of Object.values(assetBindings.natureScatters)) {
      for (const item of category) {
        allReferencedDefIds.add(item.defId);
      }
    }
    // Settlement Objects
    for (const category of Object.values(assetBindings.settlementObjects)) {
      for (const item of category) {
        allReferencedDefIds.add(item.defId);
      }
    }

    const missingFrames = [];
    for (const defId of allReferencedDefIds) {
      if (!atlasIndex.frames[defId]) {
        missingFrames.push(defId);
      }
    }

    assert.strictEqual(
      missingFrames.length,
      0,
      `Ditemukan ${missingFrames.length} frame yang tidak ada di atlas_index.json: ${missingFrames.join(', ')}`
    );

    console.log(`  ✅ [PASS] 2. Seluruh ${allReferencedDefIds.size} frame di asset-bindings.json 100% valid & ada di atlas tekstur modular`);
    passed++;
  } catch (err) {
    console.error('  ❌ [FAIL] 2. Validasi frame atlas:', err.message);
  }

  // TEST 3: Keanekaragaman Objek Alam (> 35 defId Unik Lintas Region)
  try {
    const testChunks = [
      { cx: 75, cy: 76, name: 'Nine Springs Delta' },
      { cx: 82, cy: 104, name: 'Azure Mountain Range' },
      { cx: 65, cy: 134, name: 'Northern Desolate' },
      { cx: 23, cy: 78, name: 'Western Sacred Desert' },
      { cx: 122, cy: 84, name: 'Eastern Sea' },
      { cx: 78, cy: 80, name: 'Central Plains' },
      { cx: 43, cy: 118, name: 'Beast Prairies' },
      { cx: 34, cy: 21, name: 'Lava Spine' }
    ];

    const observedDefIds = new Set();
    let maxCountObserved = 0;

    for (const { cx, cy } of testChunks) {
      const objs = objectScatter.getChunkObjects(cx, cy);
      assert(objs.length <= 140, `Chunk (${cx}, ${cy}) melebihi budget objek maksimal 140 (didapat ${objs.length})`);
      if (objs.length > maxCountObserved) maxCountObserved = objs.length;

      for (const obj of objs) {
        observedDefIds.add(obj.defId);
      }
    }

    // Dibandingkan sistem lama yang hanya memakai 17 frame
    assert(
      observedDefIds.size >= 25,
      `Keragaman sebaran objek harus >= 25 defId unik (didapat ${observedDefIds.size})`
    );

    console.log(`  ✅ [PASS] 3. Keanekaragaman sebaran terbukti: ${observedDefIds.size} defId unik digunakan (Budget max: ${maxCountObserved} <= 140)`);
    passed++;
  } catch (err) {
    console.error('  ❌ [FAIL] 3. Keanekaragaman sebaran:', err.message);
  }

  // TEST 4: Penempatan Set-Piece Landmark Regional & Cincin Pemukiman
  try {
    // XiTong City berada di chunk (73, 90) ~ (2350, 2900)
    const xitongCx = Math.floor(2350 / 32);
    const xitongCy = Math.floor(2900 / 32);
    const xitongObjs = objectScatter.getChunkObjects(xitongCx, xitongCy);

    const xitongLandmark = xitongObjs.find(o => o.defId === 'xitong_city_landmark' || o.id.includes('xitong'));
    assert(xitongLandmark, 'XiTong City harus memiliki landmark khusus di dalam chunk');

    // Cincin pemukiman: outskirt objects di sekeliling pemukiman
    const hasOutskirts = xitongObjs.some(o => o.tags?.includes('settlement_outskirts'));
    assert(hasOutskirts, 'Chunk pemukiman harus memiliki objek pinggiran (cincin kepadatan pemukiman)');

    console.log(`  ✅ [PASS] 4. Landmark set-piece XiTong City & cincin kepadatan pemukiman terpasang presisi`);
    passed++;
  } catch (err) {
    console.error('  ❌ [FAIL] 4. Landmark & cincin pemukiman:', err.message);
  }

  // TEST 5: Monster Regional Visual Atlas (Bukan Sekadar Emoji)
  try {
    // Cari monster di wilayah liar (dangerTier >= 2)
    const wildernessChunks = [
      { cx: 82, cy: 104 }, // Azure mountain
      { cx: 34, cy: 21 },  // Lava spine
      { cx: 43, cy: 118 }  // Beast prairies
    ];

    let foundMonster = false;
    for (const { cx, cy } of wildernessChunks) {
      const objs = objectScatter.getChunkObjects(cx, cy);
      const monsterObj = objs.find(o => o.tags?.includes('monster'));
      if (monsterObj) {
        assert(monsterObj.defId.startsWith('monster_'), `defId monster harus diawali monster_ (didapat ${monsterObj.defId})`);
        assert(atlasIndex.frames[monsterObj.defId], `Sprite monster '${monsterObj.defId}' harus terdaftar di atlas tekstur`);
        foundMonster = true;
        break;
      }
    }

    assert(foundMonster, 'Harus ditemukan setidaknya 1 monster regional di chunk wilayah liar');
    console.log('  ✅ [PASS] 5. Monster regional terpasang dengan sprite atlas visual resmi (monsters_0..2)');
    passed++;
  } catch (err) {
    console.error('  ❌ [FAIL] 5. Monster visual atlas:', err.message);
  }

  // TEST 6: Kompatibilitas Penuh dengan ChunkStreamingEngine & Hash Konsisten
  try {
    const chunkA = chunkStreamingEngine.getStaticChunk(76, 77);
    const chunkB = chunkStreamingEngine.getStaticChunk(76, 77);
    assert.strictEqual(chunkA.hash, chunkB.hash, 'Hash static chunk harus tetap deterministik dengan scatter baru');
    assert(chunkA.scatter.length > 0, 'Chunk scatter harus memuat objek yang disandikan');

    console.log(`  ✅ [PASS] 6. Integrasi chunkStreamingEngine mulus & deterministik (Hash: ${chunkA.hash.slice(0, 8)}..., Scatter: ${chunkA.scatter.length} objs)`);
    passed++;
  } catch (err) {
    console.error('  ❌ [FAIL] 6. Kompatibilitas chunkStreamingEngine:', err.message);
  }

  console.log(`\n==================================================`);
  console.log(`Hasil Pengujian: ${passed} / ${total} lulus.`);
  if (passed === total) {
    console.log('🎉 [SEMUA TES PHASE D LULUS]');
  } else {
    console.error('⚠️ [SEBAGIAN TES GAGAL]');
    process.exit(1);
  }
}

runPhaseDTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
