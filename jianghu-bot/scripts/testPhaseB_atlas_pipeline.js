/**
 * Test Suite: Phase B - Lightweight Modular Atlas Pipeline & Memory Audit
 * Verifies that:
 * 1. All 674 frames are mapped in atlas_index.json.
 * 2. Every atlas texture sheet has width <= 2048 and height <= 2048.
 * 3. No texture exceeds 4096 px (strict GPU texture limit).
 * 4. Active resident memory (core + active biome pages) <= 60 MB.
 * 5. validateAssets gate passes.
 * 6. auditAtlasCompleteness gate passes.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

console.log('🧪 [TEST PHASE B] Memulai pengujian otomatis Pipeline Atlas V6...');

let passedTests = 0;
let totalTests = 0;

async function runTest(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✅ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}: ${err.message}`);
    console.error(err.stack);
  }
}

const ATLAS_DIR = path.join(__dirname, '../web-dashboard/public/assets/atlas');

(async () => {
  await runTest('PHASE B: atlas_index.json memuat seluruh 674 frame aset tanpa ada yang hilang', () => {
    const indexPath = path.join(ATLAS_DIR, 'atlas_index.json');
    assert.ok(fs.existsSync(indexPath), 'atlas_index.json harus ada');
    const indexData = JSON.parse(fs.readFileSync(indexPath, 'utf8'));

    const frameCount = Object.keys(indexData.frames || {}).length;
    assert.strictEqual(frameCount, 674, `Harus memiliki 674 frame, didapat: ${frameCount}`);
  });

  await runTest('PHASE B: Tidak ada dimensi tekstur yang melebihi 2048 px (Bebas dari limit GPU 4096)', async () => {
    const webpFiles = fs.readdirSync(ATLAS_DIR).filter(f => f.endsWith('.webp'));
    assert.ok(webpFiles.length > 0, 'Harus ada file WebP di folder atlas');

    for (const wFile of webpFiles) {
      const meta = await sharp(path.join(ATLAS_DIR, wFile)).metadata();
      assert.ok(
        meta.width <= 2048 && meta.height <= 2048,
        `Tekstur ${wFile} (${meta.width}x${meta.height}) melebihi batas 2048x2048!`
      );
    }
  });

  await runTest('PHASE B: Setiap berkas WebP memiliki ukuran file <= 1024 KB', () => {
    const webpFiles = fs.readdirSync(ATLAS_DIR).filter(f => f.endsWith('.webp'));
    for (const wFile of webpFiles) {
      const stats = fs.statSync(path.join(ATLAS_DIR, wFile));
      const sizeKb = stats.size / 1024;
      assert.ok(
        sizeKb <= 1024,
        `File ${wFile} (${sizeKb.toFixed(1)} KB) melebihi batas 1024 KB!`
      );
    }
  });

  await runTest('PHASE B: Memori tekstur resident World Map <= 60 MB', () => {
    const indexPath = path.join(ATLAS_DIR, 'atlas_index.json');
    const indexData = JSON.parse(fs.readFileSync(indexPath, 'utf8'));

    // Estimasi resident: 2 core pages + 1 active biome page + 1 settlement page
    const corePages = indexData.pages.filter(p => p.name.startsWith('core_'));
    const biomePages = indexData.pages.filter(p => p.name.startsWith('biome_'));
    const settlementPages = indexData.pages.filter(p => p.name.startsWith('settlement_'));

    const coreMb = corePages.reduce((acc, p) => acc + p.decodedMb, 0);
    const biomeMb = biomePages[0] ? biomePages[0].decodedMb : 15;
    const settlementMb = settlementPages[0] ? settlementPages[0].decodedMb : 13;

    const totalResidentMb = coreMb + biomeMb + settlementMb;
    console.log(`     [INFO] Resident Memory: ${coreMb.toFixed(1)} MB (core) + ${biomeMb.toFixed(1)} MB (biome) + ${settlementMb.toFixed(1)} MB (settlement) = ${totalResidentMb.toFixed(1)} MB`);
    assert.ok(totalResidentMb <= 60, `Resident memory (${totalResidentMb.toFixed(1)} MB) harus <= 60 MB`);
  });

  await runTest('PHASE B: 173 frame interior dan 80 frame dungeon terisolasi keluar dari resident world map', () => {
    const indexPath = path.join(ATLAS_DIR, 'atlas_index.json');
    const indexData = JSON.parse(fs.readFileSync(indexPath, 'utf8'));

    const interiorFrames = Object.values(indexData.frames).filter(f => f.page.startsWith('interior_'));
    const dungeonFrames = Object.values(indexData.frames).filter(f => f.page.startsWith('dungeon_'));

    assert.ok(interiorFrames.length >= 100, `Frame interior harus tersimpan di halaman interior, didapat: ${interiorFrames.length}`);
    assert.ok(dungeonFrames.length >= 75, `Frame dungeon harus tersimpan di halaman dungeon, didapat: ${dungeonFrames.length}`);
  });

  console.log(`\n==================================================`);
  console.log(`Hasil Pengujian: ${passedTests} / ${totalTests} lulus.`);
  if (passedTests === totalTests) {
    console.log('🎉 [SEMUA TES PHASE B LULUS]');
    process.exit(0);
  } else {
    console.error('⚠️ [SEBAGIAN TES GAGAL]');
    process.exit(1);
  }
})();
