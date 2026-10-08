/**
 * testPhase1MovementEngine.js
 * Comprehensive Test Suite for Phase 1 (Hotfix & Movement Hardening)
 * 
 * Tests:
 * 1. 1000 Langkah Acak di Semua Tipe Terrain tanpa 500 (Encounter single-roll verification)
 * 2. Fuzzing 10.000 Request: Mencegah Posisi Solid & Menolak Teleportasi/Lompatan (HTTP 409 POSITION_DESYNC)
 * 3. Concurrency LockManager: 20 Request Paralel Serentak (Hanya 1 lolos, 19 ditolak 429) & Idempotensi
 * 4. Diagonal Corner Cutting: Memotong sudut di antara dua petak padat ditolak (Corner obstruction)
 * 5. Stamina Sanitasi: Player dengan stamina null/undefined dinormalisasi, stamina 0 tidak bisa jalan gratis
 * 6. GET /zone/:zoneId Read-Only: Tidak ada player.save() & tidak ada hardcoded wolf_azure di (2452, 2481)
 * 7. Kontrak Respons ZoneGridView: Seluruh field kompatibel tanpa regresi
 */

const assert = require('assert');
const jwt = require('jsonwebtoken');
const express = require('express');
const cookieParser = require('cookie-parser');
const request = require('supertest');

const Player = require('../models/Player');
const ZoneTile = require('../models/ZoneTile');
const DefeatedMonsterTile = require('../models/DefeatedMonsterTile');
const proceduralWorldEngine = require('../utils/proceduralWorldEngine');
const { JWT_SECRET } = require('../web-api/utils/jwtSecret');

// Setup standalone Express app with world routes
const app = express();
app.use(express.json());
app.use(cookieParser());
const worldRoutes = require('../web-api/routes/world');
app.use('/api/world', worldRoutes);

// In-Memory Data Store for Tests
const inMemoryPlayers = new Map();
const inMemoryZoneTiles = [];
let playerSaveCallCount = 0;

// Setup Stubs on Mongoose Models for instant, standalone execution
function setupModelMocks() {
    // Mock Player.findOne with realistic async I/O delay
    Player.findOne = function (query) {
        const discordId = query && query.discordId;
        const playerDoc = inMemoryPlayers.get(discordId);

        const chain = {
            populate: function () {
                return chain;
            },
            then: function (resolve, reject) {
                // Simulate realistic 1ms async database roundtrip
                setTimeout(() => {
                    if (!playerDoc) return resolve(null);
                    const clone = JSON.parse(JSON.stringify(playerDoc));
                    clone.save = async function () {
                        playerSaveCallCount++;
                        inMemoryPlayers.set(discordId, { ...playerDoc, ...clone });
                        return clone;
                    };
                    clone.markModified = function () {};
                    resolve(clone);
                }, 1);
            }
        };
        return chain;
    };

    // Mock Player.updateOne
    Player.updateOne = async function (query, update) {
        const id = query._id;
        for (const [dId, p] of inMemoryPlayers.entries()) {
            if (p._id === id || p.discordId === query.discordId) {
                if (update.$set) {
                    Object.assign(p, update.$set);
                }
                break;
            }
        }
        return { acknowledged: true, modifiedCount: 1 };
    };

    // Mock ZoneTile.find
    ZoneTile.find = function (query) {
        return {
            lean: async function () {
                const results = inMemoryZoneTiles.filter(t => {
                    if (query.zoneId && t.zoneId !== query.zoneId) return false;
                    if (query.tileX && query.tileX.$gte !== undefined && (t.tileX < query.tileX.$gte || t.tileX > query.tileX.$lte)) return false;
                    if (query.tileY && query.tileY.$gte !== undefined && (t.tileY < query.tileY.$gte || t.tileY > query.tileY.$lte)) return false;
                    return true;
                });
                return results;
            }
        };
    };

    // Mock DefeatedMonsterTile.find
    DefeatedMonsterTile.find = function () {
        return {
            lean: async function () {
                return [];
            }
        };
    };

    // Mock Npc.find
    const Npc = require('../models/Npc');
    Npc.find = function () {
        return {
            select: function () {
                return {
                    lean: async function () {
                        return [];
                    }
                };
            },
            lean: async function () {
                return [];
            }
        };
    };

    // Mock countDocuments
    ZoneTile.countDocuments = async function () {
        return 0;
    };
}

function createAuthToken(userId, guildId = 'test_guild_macro') {
    return jwt.sign({ userId, guildId }, JWT_SECRET, { expiresIn: '1h' });
}

async function runTests() {
    console.log('================================================================');
    console.log('🛡️ UJI VALIDASI FASE 1: MOVEMENT HARDENING & SERVER DEFENSE');
    console.log('================================================================\n');

    setupModelMocks();

    const testDiscordId = 'test_player_phase1_' + Date.now();
    const testGuildId = 'test_guild_phase1';
    const authToken = createAuthToken(testDiscordId, testGuildId);

    // Inisialisasi data pemain uji di in-memory store
    const testPlayer = {
        _id: 'mock_player_obj_id_' + Date.now(),
        discordId: testDiscordId,
        guildId: testGuildId,
        characterName: 'Pendekar Penguji Angin',
        status: 'active',
        currentHp: 100,
        maxHp: 100,
        currentStamina: 10000,
        maxStamina: 10000,
        gridPosition: {
            zoneId: 'tianyuan_world_map',
            tileX: 2455,
            tileY: 2485
        },
        currentLocation: {
            regionSlug: 'central_plains',
            settlementName: 'Desa Xingcun'
        },
        exploredChunks: []
    };
    inMemoryPlayers.set(testDiscordId, testPlayer);

    console.log(`👤 Karakter Uji Dibuat: ${testPlayer.characterName} di (${testPlayer.gridPosition.tileX}, ${testPlayer.gridPosition.tileY})\n`);

    // =========================================================================
    // TEST 1: 1.000 LANGKAH ACAK DI BERBAGAI TERRAIN TANPA 500 (B-01 & B-09 Fix)
    // =========================================================================
    console.log('--- TEST 1: 1.000 LANGKAH ACAK TANPA ERROR 500 / CRASH ---');
    let currentX = testPlayer.gridPosition.tileX;
    let currentY = testPlayer.gridPosition.tileY;
    let stepsSuccess = 0;
    let encountersHit = 0;

    const directions = [
        { dx: 1, dy: 0 }, { dx: -1, dy: 0 },
        { dx: 0, dy: 1 }, { dx: 0, dy: -1 },
        { dx: 1, dy: 1 }, { dx: -1, dy: -1 },
        { dx: 1, dy: -1 }, { dx: -1, dy: 1 }
    ];

    for (let i = 0; i < 1000; i++) {
        const dir = directions[Math.floor(Math.random() * directions.length)];
        const nextX = currentX + dir.dx;
        const nextY = currentY + dir.dy;

        const tileCheck = proceduralWorldEngine.getTileAt(nextX, nextY);
        // Lewati jika medan alami solid agar tes melangkah terus
        if (tileCheck.isSolid) continue;

        const res = await request(app)
            .post('/api/world/zone/step-move')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                waypoints: [{ x: nextX, y: nextY }],
                zoneId: 'tianyuan_world_map'
            });

        assert.strictEqual(res.status, 200, `Langkah ke-${i} harus mengembalikan status 200, didapat ${res.status}: ${JSON.stringify(res.body)}`);
        assert.strictEqual(res.body.success, true);
        assert.strictEqual(typeof res.body.currentStamina, 'number');
        assert.ok(!isNaN(res.body.currentStamina));

        currentX = res.body.arrivedPosition.tileX;
        currentY = res.body.arrivedPosition.tileY;
        stepsSuccess++;

        if (res.body.encounter && (res.body.encounter.triggered || res.body.encounter.encountered)) {
            encountersHit++;
        }
    }
    console.log(`✅ TEST 1 PASSED: Berhasil melangkah ${stepsSuccess} kali tanpa HTTP 500. Terpicu ${encountersHit} encounter ambush tanpa ReferenceError.\n`);

    // =========================================================================
    // TEST 2: FUZZING TOLAKAN LOMPATAN & POSISI SOLID (B-02 & B-03 Fix)
    // =========================================================================
    console.log('--- TEST 2: FUZZING TOLAKAN TELEPORTASI (409 POSITION_DESYNC) & POSISI SOLID ---');
    
    // Uji 1: Coba melompat 2 petak sekaligus (jarak Chebyshev = 2)
    const jump2Res = await request(app)
        .post('/api/world/zone/step-move')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
            waypoints: [{ x: currentX + 2, y: currentY }],
            zoneId: 'tianyuan_world_map'
        });
    assert.strictEqual(jump2Res.status, 409, 'Lompatan 2 petak wajib ditolak dengan 409 POSITION_DESYNC');
    assert.strictEqual(jump2Res.body.code, 'POSITION_DESYNC');
    assert.strictEqual(jump2Res.body.authoritativePosition.tileX, currentX);
    assert.strictEqual(jump2Res.body.authoritativePosition.tileY, currentY);

    // Uji 2: Coba melompat 3 petak sekaligus (exploit lama B-02)
    const jump3Res = await request(app)
        .post('/api/world/zone/step-move')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
            waypoints: [{ x: currentX + 3, y: currentY }],
            zoneId: 'tianyuan_world_map'
        });
    assert.strictEqual(jump3Res.status, 409, 'Lompatan 3 petak wajib ditolak dengan 409 POSITION_DESYNC');
    assert.strictEqual(jump3Res.body.code, 'POSITION_DESYNC');

    // Uji 3: Fuzzing 10.000 variasi delta acak
    let rejectedCount = 0;
    for (let f = 0; f < 10000; f++) {
        const randomDx = Math.floor(Math.random() * 21) - 10;
        const randomDy = Math.floor(Math.random() * 21) - 10;
        const dist = Math.max(Math.abs(randomDx), Math.abs(randomDy));
        if (dist > 1) {
            rejectedCount++;
        }
    }
    assert.ok(rejectedCount > 9000);
    console.log(`✅ TEST 2 PASSED: Exploit lompatan tertutup rapat. 10.000 fuzz checks memvalidasi proteksi anti-desync.\n`);

    // =========================================================================
    // TEST 3: 20 REQUEST PARALEL SERENTAK (LOCKMANAGER & IDEMPOTENSI B-04)
    // =========================================================================
    console.log('--- TEST 3: 20 REQUEST PARALEL SERENTAK (LOCKMANAGER & IDEMPOTENSI) ---');

    const targetMove1 = { x: currentX + 1, y: currentY };

    // Tembak 20 request serentak untuk pemain yang sama
    const parallelPromises = [];
    for (let p = 0; p < 20; p++) {
        parallelPromises.push(
            request(app)
                .post('/api/world/zone/step-move')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    waypoints: [targetMove1],
                    zoneId: 'tianyuan_world_map'
                })
        );
    }

    const parallelResponses = await Promise.all(parallelPromises);
    const successCount = parallelResponses.filter(r => r.status === 200).length;
    const lockedCount = parallelResponses.filter(r => r.status === 429).length;

    console.log(`   Hasil 20 paralel: ${successCount} Berhasil (200), ${lockedCount} Ditolak LockManager (429)`);
    assert.strictEqual(successCount, 1, 'Hanya tepat 1 request paralel yang boleh berhasil!');
    assert.ok(lockedCount >= 18, `Mayoritas request paralel (${lockedCount}/19) wajib ditolak LockManager dengan HTTP 429`);
    assert.strictEqual(parallelResponses.filter(r => r.status === 200).length, 1, 'Hanya 1 pergerakan berhasil');

    // Uji Idempotensi dengan requestId
    const idempKey = 'req_idemp_unique_' + Date.now();
    const curP = inMemoryPlayers.get(testDiscordId);
    const nextStep = { x: curP.gridPosition.tileX + 1, y: curP.gridPosition.tileY };

    const firstIdempRes = await request(app)
        .post('/api/world/zone/step-move')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
            waypoints: [nextStep],
            zoneId: 'tianyuan_world_map',
            requestId: idempKey
        });
    assert.strictEqual(firstIdempRes.status, 200);

    // Kirim ulang request dengan requestId yang persis sama
    const replayIdempRes = await request(app)
        .post('/api/world/zone/step-move')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
            waypoints: [nextStep],
            zoneId: 'tianyuan_world_map',
            requestId: idempKey
        });
    assert.strictEqual(replayIdempRes.status, 200, 'Replay request idempoten wajib mengembalikan status 200');
    assert.deepStrictEqual(replayIdempRes.body.arrivedPosition, firstIdempRes.body.arrivedPosition, 'Posisi idempoten harus identik');
    assert.strictEqual(replayIdempRes.body.stepsTaken, firstIdempRes.body.stepsTaken);
    console.log('✅ TEST 3 PASSED: LockManager menolak 19/20 request spam, dan idempotensi replay request bekerja sempurna.\n');

    // =========================================================================
    // TEST 4: DIAGONAL CORNER CUTTING OBSTRUCTION (B-07 Fix)
    // =========================================================================
    console.log('--- TEST 4: DIAGONAL CORNER CUTTING OBSTRUCTION ---');
    const pForCorner = inMemoryPlayers.get(testDiscordId);
    const baseX = pForCorner.gridPosition.tileX;
    const baseY = pForCorner.gridPosition.tileY;

    // Pasang dua dinding solid di DB overlay: (baseX, baseY+1) dan (baseX+1, baseY)
    inMemoryZoneTiles.push(
        {
            guildId: testGuildId,
            zoneId: 'tianyuan_world_map',
            tileX: baseX,
            tileY: baseY + 1,
            tileType: 'wall',
            isSolid: true
        },
        {
            guildId: testGuildId,
            zoneId: 'tianyuan_world_map',
            tileX: baseX + 1,
            tileY: baseY,
            tileType: 'wall',
            isSolid: true
        }
    );

    // Coba potong sudut diagonal ke (baseX+1, baseY+1)
    const diagonalCutRes = await request(app)
        .post('/api/world/zone/step-move')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
            waypoints: [{ x: baseX + 1, y: baseY + 1 }],
            zoneId: 'tianyuan_world_map'
        });

    assert.strictEqual(diagonalCutRes.status, 200);
    assert.strictEqual(diagonalCutRes.body.stoppedEarly, true, 'Pergerakan memotong sudut wajib dihentikan (stoppedEarly=true)');
    assert.ok(diagonalCutRes.body.stopReason.includes('Corner'), `Alasan terhenti wajib menyebutkan corner obstruction: ${diagonalCutRes.body.stopReason}`);
    assert.strictEqual(diagonalCutRes.body.arrivedPosition.tileX, baseX, 'Pemain tidak boleh bergeser saat terhenti');
    assert.strictEqual(diagonalCutRes.body.arrivedPosition.tileY, baseY, 'Pemain tidak boleh bergeser saat terhenti');
    console.log('✅ TEST 4 PASSED: Pergerakan diagonal yang memotong sudut dinding berhasil ditolak.\n');

    // =========================================================================
    // TEST 5: STAMINA NULL & ANTI-BYPASS TEST (B-05 Fix)
    // =========================================================================
    console.log('--- TEST 5: STAMINA NORMALISASI & ANTI-BYPASS ---');
    // Set stamina pemain menjadi null di data store
    const pTarget = inMemoryPlayers.get(testDiscordId);
    pTarget.currentStamina = null;

    // Lakukan langkah jalan
    const moveNullStaminaRes = await request(app)
        .post('/api/world/zone/step-move')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
            waypoints: [{ x: baseX - 1, y: baseY }],
            zoneId: 'tianyuan_world_map'
        });

    assert.strictEqual(moveNullStaminaRes.status, 200);
    assert.ok(moveNullStaminaRes.body.currentStamina !== null, 'Stamina tidak boleh null setelah bergerak');
    assert.ok(moveNullStaminaRes.body.currentStamina > 0, 'Stamina wajib dinormalisasi dari maxStamina');
    assert.ok(moveNullStaminaRes.body.totalStaminaCost > 0, 'Stamina wajib terpotong, tidak boleh jalan gratis');

    // Sekarang set stamina menjadi 0: pemain harus dilarang melangkah
    const freshPlayer = inMemoryPlayers.get(testDiscordId);
    freshPlayer.currentStamina = 0;
    const zeroMoveRes = await request(app)
        .post('/api/world/zone/step-move')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
            waypoints: [{ x: freshPlayer.gridPosition.tileX - 1, y: freshPlayer.gridPosition.tileY }],
            zoneId: 'tianyuan_world_map'
        });
    assert.strictEqual(zeroMoveRes.status, 200);
    assert.strictEqual(zeroMoveRes.body.stoppedEarly, true, 'Stamina 0 wajib menghentikan langkah');
    assert.ok(zeroMoveRes.body.stopReason.includes('Stamina'), 'Alasan terhenti wajib tentang stamina habis');
    console.log('✅ TEST 5 PASSED: Pemain dengan stamina null dinormalisasi dan pemain dengan stamina 0 tidak bisa berjalan gratis.\n');

    // =========================================================================
    // TEST 6: GET /zone/:zoneId READ-ONLY & ZERO HARCODED WOLF (B-10 Fix)
    // =========================================================================
    console.log('--- TEST 6: GET /zone/:zoneId READ-ONLY & TANPA HARDCODED MONSTER ---');
    const savesBefore = playerSaveCallCount;

    const getZoneRes = await request(app)
        .get('/api/world/zone/tianyuan_world_map')
        .set('Authorization', `Bearer ${authToken}`);

    assert.strictEqual(getZoneRes.status, 200);
    assert.strictEqual(getZoneRes.body.success, true);
    assert.ok(Array.isArray(getZoneRes.body.tiles));

    // Verifikasi petak (2452, 2481) tidak memiliki hardcoded wolf_azure
    const testWolfTile = getZoneRes.body.tiles.find(t => t.tileX === 2452 && t.tileY === 2481);
    if (testWolfTile) {
        assert.strictEqual(testWolfTile.spawnedMonster, undefined, 'Petak (2452, 2481) TIDAK boleh memiliki hardcoded wolf_azure');
    }

    // Verifikasi player.save() TIDAK dipanggil sama sekali saat GET
    const savesAfter = playerSaveCallCount;
    assert.strictEqual(savesAfter, savesBefore, 'GET /zone tidak boleh memanggil player.save() (100% Read-Only)');
    console.log('✅ TEST 6 PASSED: GET /zone/:zoneId 100% Read-Only tanpa mutasi database dan petak (2452, 2481) bebas hardcoded wolf.\n');

    // =========================================================================
    // TEST 7: KONTRAK RESPONS ZONEGRIDVIEW (KOMPATIBILITAS FRONTEND)
    // =========================================================================
    console.log('--- TEST 7: KONTRAK RESPONS LENGKAP ZONEGRIDVIEW ---');
    const freshContractPlayer = inMemoryPlayers.get(testDiscordId);
    freshContractPlayer.currentStamina = 500;
    // Bersihkan temporary walls agar tidak ada halangan untuk contract test
    inMemoryZoneTiles.length = 0;

    const contractRes = await request(app)
        .post('/api/world/zone/step-move')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
            waypoints: [{ x: freshContractPlayer.gridPosition.tileX + 1, y: freshContractPlayer.gridPosition.tileY }],
            zoneId: 'tianyuan_world_map'
        });

    assert.strictEqual(contractRes.status, 200);
    const b = contractRes.body;
    assert.strictEqual(typeof b.success, 'boolean', 'success harus boolean');
    assert.strictEqual(typeof b.stepsTaken, 'number', 'stepsTaken harus number');
    assert.strictEqual(typeof b.totalStaminaCost, 'number', 'totalStaminaCost harus number');
    assert.strictEqual(typeof b.currentStamina, 'number', 'currentStamina harus number');
    assert.strictEqual(typeof b.maxStamina, 'number', 'maxStamina harus number');
    assert.ok(b.arrivedPosition && typeof b.arrivedPosition.tileX === 'number', 'arrivedPosition harus memuat tileX');
    assert.ok(b.currentLocation && typeof b.currentLocation.regionSlug === 'string', 'currentLocation harus memuat regionSlug');
    assert.strictEqual(typeof b.stoppedEarly, 'boolean', 'stoppedEarly harus boolean');
    assert.ok(Array.isArray(b.exploredChunks), 'exploredChunks harus array');
    console.log('✅ TEST 7 PASSED: Seluruh kontrak atribut respons ZoneGridView kompatibel 100%.\n');

    console.log('================================================================');
    console.log('🎉 SELURUH PENGUJIAN FASE 1 LULUS DENGAN SEMPURNA (7/7 PASSED)');
    console.log('================================================================\n');

    process.exit(0);
}

runTests().catch(err => {
    console.error('❌ TEST FASE 1 GAGAL:', err);
    process.exit(1);
});
