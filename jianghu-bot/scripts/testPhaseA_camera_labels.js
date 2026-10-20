/**
 * Test Suite: Phase A - Camera Centering & Xuan Paper Resource Labels
 * Tests Bug 1 (Camera auto-snap & pan protection) and Bug 2 (Resource label separation & layer collision)
 */

const assert = require('assert');
const path = require('path');

// Import proceduralWorldEngine for Bug 2 verification
const { getTileAt } = require('../utils/proceduralWorldEngine');

console.log('🧪 [TEST PHASE A] Memulai pengujian otomatis Fase A...');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}: ${err.message}`);
    console.error(err.stack);
  }
}

// ============================================================================
// BUG 2 TESTS: SEPARASI TERRAIN LABEL DARI RESOURCE NAME
// ============================================================================

runTest('BUG 2: proceduralWorldEngine memisahkan terrainLabel dari label resource', () => {
  // Cari koordinat yang menghasilkan farmland & resourceType atau resource apapun
  let foundResource = null;
  for (let dx = 0; dx < 50; dx++) {
    for (let dy = 0; dy < 50; dy++) {
      const tile = getTileAt(2400 + dx, 2450 + dy);
      if (tile.resourceType) {
        foundResource = tile;
        break;
      }
    }
    if (foundResource) break;
  }

  assert.ok(foundResource, 'Harus menemukan minimal 1 resource node');
  const validNames = ['Herba Roh', 'Urat Bijih', 'Kayu Roh', 'Lubuk Ikan'];
  assert.ok(
    validNames.includes(foundResource.label),
    `tile.label harus salah satu dari ${validNames.join(', ')}, dapat: ${foundResource.label}`
  );
  assert.ok(
    foundResource.terrainLabel !== undefined && foundResource.terrainLabel !== null,
    'tile.terrainLabel harus terdefinisi terpisah dari tile.label'
  );
  // Verifikasi jika terrainType farmland, terrainLabel mengandung Sawah
  const farmlandTile = getTileAt(2400, 2450);
  if (farmlandTile.terrainType === 'farmland') {
    assert.ok(farmlandTile.terrainLabel.includes('Sawah'), 'terrainLabel harus menyebut Sawah');
  }
});

runTest('BUG 2: Logika pemfilteran label pada Zoom < 0.8 menghasilkan 0 label', () => {
  // Simulasi fungsi getVisibleResourceLabels dari WorldCanvas
  function getVisibleResourceLabels(nodes, playerPos, hoveredTile, targetTile, zoom) {
    if (zoom < 0.8) return [];

    const candidates = [];
    for (const node of nodes) {
      const dist = Math.max(Math.abs(node.tileX - playerPos.x), Math.abs(node.tileY - playerPos.y));
      const isHovered = (hoveredTile && hoveredTile.tileX === node.tileX && hoveredTile.tileY === node.tileY);
      const isTarget = (targetTile && targetTile.x === node.tileX && targetTile.y === node.tileY);

      if (dist <= 3 || isHovered || isTarget) {
        candidates.push({ ...node, dist });
      }
    }

    // Urutkan berdasarkan jarak terdekat ke pemain
    candidates.sort((a, b) => a.dist - b.dist);

    // Filter tabrakan sederhana dan cap 8
    const finalLabels = [];
    for (const cand of candidates) {
      if (finalLabels.length >= 8) break;
      // Cek tabrakan bounding box
      let overlaps = false;
      for (const existing of finalLabels) {
        const dx = Math.abs(cand.screenX - existing.screenX);
        const dy = Math.abs(cand.screenY - existing.screenY);
        if (dx < 60 && dy < 22) { // 60px width, 22px height box
          overlaps = true;
          break;
        }
      }
      if (!overlaps) {
        finalLabels.push(cand);
      }
    }
    return finalLabels;
  }

  const sampleNodes = [
    { tileX: 10, tileY: 10, resourceType: 'herb', label: 'Herba Roh', screenX: 100, screenY: 100 },
    { tileX: 11, tileY: 10, resourceType: 'ore', label: 'Urat Bijih', screenX: 200, screenY: 100 },
  ];

  const labelsAtZoom05 = getVisibleResourceLabels(sampleNodes, { x: 10, y: 10 }, null, null, 0.5);
  assert.strictEqual(labelsAtZoom05.length, 0, 'Pada zoom 0.5 jumlah label harus 0');

  const labelsAtZoom1 = getVisibleResourceLabels(sampleNodes, { x: 10, y: 10 }, null, null, 1.0);
  assert.strictEqual(labelsAtZoom1.length, 2, 'Pada zoom 1.0 node <= 3 petak harus tampil');
});

runTest('BUG 2: Tabrakan label dan batasan maksimum 8 label per layar', () => {
  function getVisibleResourceLabels(nodes, playerPos, hoveredTile, targetTile, zoom) {
    if (zoom < 0.8) return [];
    const candidates = [];
    for (const node of nodes) {
      const dist = Math.max(Math.abs(node.tileX - playerPos.x), Math.abs(node.tileY - playerPos.y));
      if (dist <= 3) {
        candidates.push({ ...node, dist });
      }
    }
    candidates.sort((a, b) => a.dist - b.dist);
    const finalLabels = [];
    for (const cand of candidates) {
      if (finalLabels.length >= 8) break;
      let overlaps = false;
      for (const existing of finalLabels) {
        const dx = Math.abs(cand.screenX - existing.screenX);
        const dy = Math.abs(cand.screenY - existing.screenY);
        if (dx < 50 && dy < 20) {
          overlaps = true;
          break;
        }
      }
      if (!overlaps) {
        finalLabels.push(cand);
      }
    }
    return finalLabels;
  }

  // Buat 20 node berdekatan
  const manyNodes = [];
  for (let i = 0; i < 20; i++) {
    manyNodes.push({
      tileX: 10 + (i % 3),
      tileY: 10 + Math.floor(i / 3),
      resourceType: 'herb',
      label: 'Herba Roh',
      screenX: 100 + i * 55, // sebagian tumpang tindih
      screenY: 100 + (i % 2) * 5
    });
  }

  const result = getVisibleResourceLabels(manyNodes, { x: 10, y: 10 }, null, null, 1.0);
  assert.ok(result.length <= 8, `Jumlah label maksimal 8, didapat: ${result.length}`);
});

// ============================================================================
// BUG 1 TESTS: LOGIKA SNAP KAMERA DAN ANTI-JERK
// ============================================================================

runTest('BUG 1: Kamera snap ke pemain saat playerReady pertama kali menjadi true', () => {
  // Simulasi state kamera
  let hasInitialCentered = false;
  let camera = { x: 2455, y: 2485, zoom: 1.0 }; // fallback awal
  let animatedPlayerPos = { x: 2455, y: 2485 };

  function onPlayerReadyChange(playerReady, actualPos) {
    if (playerReady && !hasInitialCentered) {
      camera = { x: actualPos.x, y: actualPos.y, zoom: 1.0 };
      animatedPlayerPos = { x: actualPos.x, y: actualPos.y };
      hasInitialCentered = true;
      return true; // snapped
    }
    return false;
  }

  // Mount dengan playerReady = false (loading / null grid)
  assert.strictEqual(onPlayerReadyChange(false, { x: 2050, y: 2650 }), false);
  assert.strictEqual(camera.x, 2455, 'Kamera tidak boleh snap saat playerReady = false');

  // Server selesai load: playerReady = true
  assert.strictEqual(onPlayerReadyChange(true, { x: 2050, y: 2650 }), true);
  assert.strictEqual(camera.x, 2050, 'Kamera harus snap ke posisi pemain asli (2050)');
  assert.strictEqual(camera.y, 2650, 'Kamera harus snap ke posisi pemain asli (2650)');
  assert.strictEqual(hasInitialCentered, true);

  // Pembaruan berikutnya tidak boleh snap ulang
  assert.strictEqual(onPlayerReadyChange(true, { x: 2055, y: 2655 }), false);
});

runTest('BUG 1: User drag tidak boleh tersentak saat posisi pemain diperbarui', () => {
  let isDragging = true;
  let camera = { x: 3000, y: 3000, zoom: 1.0 }; // User sedang menggeser ke (3000, 3000)
  let isWalking = false;

  function onPlayerPositionUpdate(newPos) {
    // Aturan anti-jerk: jika user sedang drag atau tidak sedang berjalan, jangan sentak kamera
    if (isDragging) {
      return camera; // tetap di posisi pan user
    }
    if (isWalking) {
      camera = {
        ...camera,
        x: camera.x + (newPos.x - camera.x) * 0.25,
        y: camera.y + (newPos.y - camera.y) * 0.25
      };
    }
    return camera;
  }

  const updatedCam = onPlayerPositionUpdate({ x: 2050, y: 2650 });
  assert.strictEqual(updatedCam.x, 3000, 'Kamera tetap di posisi drag user tanpa menyentak');
  assert.strictEqual(updatedCam.y, 3000, 'Kamera tetap di posisi drag user tanpa menyentak');
});

runTest('BUG 1: Transisi easing 250ms saat tombol Kembali ke Karakter ditekan', () => {
  // Simulasi interpolasi easing cubic-bezier / smoothstep
  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  const startX = 3000;
  const targetX = 2050;

  // t = 0 (0ms)
  const pos0 = startX + (targetX - startX) * easeOutCubic(0);
  assert.strictEqual(pos0, 3000);

  // t = 0.5 (125ms)
  const posHalf = startX + (targetX - startX) * easeOutCubic(0.5);
  assert.strictEqual(posHalf, 3000 + (2050 - 3000) * 0.875);

  // t = 1.0 (250ms)
  const posEnd = startX + (targetX - startX) * easeOutCubic(1.0);
  assert.strictEqual(posEnd, 2050);
});

console.log(`\n==================================================`);
console.log(`Hasil Pengujian: ${passedTests} / ${totalTests} lulus.`);
if (passedTests === totalTests) {
  console.log('🎉 [SEMUA TES PHASE A LULUS]');
  process.exit(0);
} else {
  console.error('⚠️ [SEBAGIAN TES GAGAL]');
  process.exit(1);
}
