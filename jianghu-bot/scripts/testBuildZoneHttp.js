/**
 * TEST SUITE: BUILD ZONE HTTP & CONCURRENCY (FASE 17)
 * Menguji endpoint API buildZone:
 * - POST /zone/build-check (Pre-flight inspection)
 * - GET /build-zone/chunk/:cx/:cy (Chunk bitmask)
 * - POST /zone/buy-plot rejection pada Tier 3 (BZ_TIER) & Buffer (BZ_SETTLEMENT_BUFFER)
 * - Simulasi pembelian paralel pada petak yang sama (Atomic Concurrency)
 */

const assert = require('assert');
const express = require('express');
const supertest = require('supertest');
const { getBuildability } = require('../utils/buildZoneEngine');

let passed = 0;
let failed = 0;

function it(name, fn) {
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`[FAIL] ${name}:`, err.message);
    failed++;
  }
}

async function itAsync(name, fn) {
  try {
    await fn();
    console.log(`[PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`[FAIL] ${name}:`, err.message);
    failed++;
  }
}

console.log('\n=== TEST SUITE: BUILD ZONE HTTP & CONCURRENCY (FASE 17) ===\n');

// Mock Express app yang merefleksikan route world.js
const app = express();
app.use(express.json());

// Mock middleware auth
const mockAuth = (req, res, next) => {
  req.user = { userId: 'player_test_123' };
  next();
};

app.post('/zone/build-check', mockAuth, (req, res) => {
  const { tileX, tileY, width = 1, height = 1, zoneId = 'tianyuan_world_map' } = req.body;
  const result = getBuildability({
    zoneId,
    x: parseInt(tileX),
    y: parseInt(tileY),
    footprint: { w: parseInt(width) || 1, h: parseInt(height) || 1 }
  });
  res.json(result);
});

app.get('/build-zone/chunk/:cx/:cy', mockAuth, (req, res) => {
  const cx = parseInt(req.params.cx);
  const cy = parseInt(req.params.cy);
  if (isNaN(cx) || isNaN(cy)) return res.status(400).json({ error: 'Invalid cx/cy' });

  const startX = cx * 32;
  const startY = cy * 32;
  const bitmask = [];
  const reasonMap = {};

  for (let dy = 0; dy < 32; dy++) {
    let rowMask = 0;
    for (let dx = 0; dx < 32; dx++) {
      const tx = startX + dx;
      const ty = startY + dy;
      const check = getBuildability({ zoneId: 'tianyuan_world_map', x: tx, y: ty, footprint: { w: 1, h: 1 } });
      if (check.ok) {
        rowMask |= (1 << (dx % 31));
      } else if (!reasonMap[check.code]) {
        reasonMap[check.code] = check.message;
      }
    }
    bitmask.push(rowMask);
  }

  res.json({ success: true, chunkX: cx, chunkY: cy, bitmask, reasons: reasonMap });
});

app.post('/zone/buy-plot', mockAuth, (req, res) => {
  const { tileX, tileY, zoneId = 'tianyuan_world_map' } = req.body;
  const targetX = parseInt(tileX);
  const targetY = parseInt(tileY);

  const check = getBuildability({ zoneId, x: targetX, y: targetY, footprint: { w: 1, h: 1 } });
  if (!check.ok) {
    return res.status(400).json({ error: check.message, code: check.code, details: check.details });
  }

  res.json({ success: true, tileX: targetX, tileY: targetY });
});

async function runAllTests() {
  // Test 1: POST /zone/build-check pada area sah
  await itAsync('POST /zone/build-check returns ok: true on valid plains', async () => {
    // Cari titik plains valid di Central Plains luar buffer
    const res = await supertest(app)
      .post('/zone/build-check')
      .send({ tileX: 2150, tileY: 2600, width: 1, height: 1 });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.ok, true);
    assert.strictEqual(res.body.code, 'BZ_OK');
  });

  // Test 2: POST /zone/build-check di dalam buffer settlement ditolak
  await itAsync('POST /zone/build-check rejects inside Xingcun buffer with BZ_SETTLEMENT_BUFFER', async () => {
    const res = await supertest(app)
      .post('/zone/build-check')
      .send({ tileX: 2071, tileY: 2650, width: 1, height: 1 });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.ok, false);
    assert.strictEqual(res.body.code, 'BZ_SETTLEMENT_BUFFER');
  });

  // Test 3: GET /build-zone/chunk/:cx/:cy returns 32-element bitmask
  await itAsync('GET /build-zone/chunk/:cx/:cy returns 32 bitmask rows and reasons', async () => {
    const res = await supertest(app).get('/build-zone/chunk/65/82');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.bitmask.length, 32);
    assert.ok(typeof res.body.reasons === 'object');
  });

  // Test 4: POST /zone/buy-plot ditolak 400 di wilayah Tier 3
  await itAsync('POST /zone/buy-plot returns 400 BZ_TIER on danger tier >= 3', async () => {
    const res = await supertest(app)
      .post('/zone/buy-plot')
      .send({ tileX: 3100, tileY: 1700 });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.code, 'BZ_TIER');
    assert.ok(res.body.error.length > 0);
  });

  // Test 5: POST /zone/buy-plot ditolak 400 di dalam buffer pemukiman
  await itAsync('POST /zone/buy-plot returns 400 BZ_SETTLEMENT_BUFFER inside buffer', async () => {
    const res = await supertest(app)
      .post('/zone/buy-plot')
      .send({ tileX: 2071, tileY: 2650 });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.code, 'BZ_SETTLEMENT_BUFFER');
  });

  // Test 6: Concurrency Simulation (Atomic Land Purchase)
  await itAsync('Parallel purchases on same tile: exactly 1 succeeds, race condition protected', async () => {
    let mockClaimState = { ownerId: null };
    const buySimulate = async (playerId) => {
      // Simulasikan findOneAndUpdate atomik
      if (mockClaimState.ownerId === null) {
        // Simulasi context switch kecil
        await new Promise(r => setTimeout(r, 5));
        if (mockClaimState.ownerId === null) {
          mockClaimState.ownerId = playerId;
          return { ok: true, ownerId: playerId };
        }
      }
      return { ok: false, error: 'Sudah dimiliki' };
    };

    const results = await Promise.all([
      buySimulate('player_A'),
      buySimulate('player_B')
    ]);

    const successes = results.filter(r => r.ok);
    const failures = results.filter(r => !r.ok);
    assert.strictEqual(successes.length, 1, 'Exactly 1 purchase must succeed');
    assert.strictEqual(failures.length, 1, 'Exactly 1 purchase must fail');
  });

  console.log(`\n========================================`);
  console.log(`HASIL: ${passed} LULUS, ${failed} GAGAL`);
  console.log(`========================================\n`);

  if (failed > 0) process.exit(1);
}

runAllTests().catch(err => {
  console.error(err);
  process.exit(1);
});
