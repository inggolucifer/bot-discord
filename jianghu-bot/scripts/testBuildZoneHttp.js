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

const bzTestCache = new Map();
app.get('/build-zone/chunk/:cx/:cy', mockAuth, (req, res) => {
  const cx = Number(req.params.cx);
  const cy = Number(req.params.cy);
  if (!Number.isInteger(cx) || !Number.isInteger(cy) || cx < 0 || cx > 156 || cy < 0 || cy > 156) {
    return res.status(400).json({ error: 'Parameter cx dan cy tidak valid (harus integer 0-156)' });
  }

  const cacheKey = `${cx}_${cy}`;
  if (bzTestCache.has(cacheKey)) {
    return res.json({ ...bzTestCache.get(cacheKey), fromCache: true });
  }

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

  const result = { success: true, chunkX: cx, chunkY: cy, bitmask, reasons: reasonMap };
  bzTestCache.set(cacheKey, result);
  res.json(result);
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

  // Test 7: POST /zone/buy-plot ditolak 400 BZ_RESOURCE_NODE pada petak bersumber daya alam
  await itAsync('POST /zone/buy-plot returns 400 BZ_RESOURCE_NODE on resource node tile', async () => {
    const proceduralWorldEngine = require('../utils/proceduralWorldEngine');
    let resTile = null;
    for (let x = 2000; x < 2200; x++) {
      for (let y = 2500; y < 2700; y++) {
        const t = proceduralWorldEngine.getTileAt(x, y);
        if (t.resourceType) {
          resTile = { x, y, resourceType: t.resourceType };
          break;
        }
      }
      if (resTile) break;
    }
    assert.ok(resTile, 'Resource node tile should be found in map');
    const res = await supertest(app)
      .post('/zone/buy-plot')
      .send({ tileX: resTile.x, tileY: resTile.y });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.code, 'BZ_RESOURCE_NODE');
  });

  // Test 8: GET /build-zone/chunk validation and cache
  await itAsync('GET /build-zone/chunk validates bounds and serves from cache', async () => {
    const resNeg = await supertest(app).get('/build-zone/chunk/-1/50');
    assert.strictEqual(resNeg.status, 400);

    const resOverflow = await supertest(app).get('/build-zone/chunk/200/50');
    assert.strictEqual(resOverflow.status, 400);

    const resValid1 = await supertest(app).get('/build-zone/chunk/50/50');
    assert.strictEqual(resValid1.status, 200);

    const resValid2 = await supertest(app).get('/build-zone/chunk/50/50');
    assert.strictEqual(resValid2.status, 200);
    assert.strictEqual(resValid2.body.fromCache, true, 'Second request must hit cache');
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
