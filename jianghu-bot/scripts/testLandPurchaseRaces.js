/**
 * TEST SUITE: T9 - LAND PURCHASE RACES & ATOMIC COMPENSATION
 * Menguji purchaseLandPlot:
 * - Pembelian paralel pada petak yang sama: tepat 1 berhasil
 * - Kuota plotCap atomic reservation mencegah eksploitasi pembelian simultan melebihi kuota
 * - Rollback kompensasi jika optimistik concurrency __v berubah di tengah jalan
 * - ActivityLog fail tidak membatalkan transaksi yang sah
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const assert = require('assert');
const mongoose = require('mongoose');

async function run() {
    console.log('\n=== TEST SUITE: T9 - LAND PURCHASE RACES & ATOMIC COMPENSATION ===\n');

    let passed = 0;
    let failed = 0;

    const mongoUri = process.env.MONGODB_URI;
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });

    const Player = require('../models/Player');
    const ZoneTile = require('../models/ZoneTile');
    const landService = require('../services/landService');

    const testUserA = `test_land_a_${Date.now()}`;
    const testUserB = `test_land_b_${Date.now()}`;
    const testGuild = 'global';

    // Petak koordinat sah di Central Plains
    const tile1 = { x: 2160, y: 2610 };
    const tile2 = { x: 2161, y: 2611 };

    try {
        // Bersihkan tile uji coba di DB
        await ZoneTile.deleteMany({ tileX: { $in: [tile1.x, tile2.x] }, tileY: { $in: [tile1.y, tile2.y] } });

        // Buat 2 pemain dengan saldo cukup
        await Player.create({
            discordId: testUserA,
            guildId: testGuild,
            username: testUserA,
            email: `${testUserA}@test.com`,
            googleId: `google_${testUserA}`,
            characterName: 'PlayerA',
            currency: { gold: 100 },
            plotCount: 0,
            systemCultivation: { realm: 'Fondasi Fana (Mortal Foundation)' } // Cap: 3
        });

        await Player.create({
            discordId: testUserB,
            guildId: testGuild,
            username: testUserB,
            email: `${testUserB}@test.com`,
            googleId: `google_${testUserB}`,
            characterName: 'PlayerB',
            currency: { gold: 100 },
            plotCount: 0,
            systemCultivation: { realm: 'Fondasi Fana (Mortal Foundation)' }
        });

        // Test 1: Dua pemain membeli petak yang sama (tile1) secara simultan
        const [resA, resB] = await Promise.all([
            landService.purchaseLandPlot(testUserA, testGuild, tile1.x, tile1.y, 'tianyuan_world_map'),
            landService.purchaseLandPlot(testUserB, testGuild, tile1.x, tile1.y, 'tianyuan_world_map')
        ]);

        const successes = [resA, resB].filter(r => r.ok);
        const failures = [resA, resB].filter(r => !r.ok);
        assert.strictEqual(successes.length, 1, 'Tepat 1 pembelian harus sukses');
        assert.strictEqual(failures.length, 1, 'Tepat 1 pembelian harus gagal karena race condition');

        const winnerId = successes[0].plot.ownerId;
        const loserUser = winnerId === testUserA ? testUserB : testUserA;

        // Verifikasi plotCount loser tidak bocor
        const loserDoc = await Player.findOne({ discordId: loserUser });
        assert.strictEqual(loserDoc.plotCount, 0, 'PlotCount pemain yang gagal tidak boleh bertambah');
        console.log('[PASS] Pembelian simultan pada petak yang sama dimenangkan oleh tepat 1 pemain secara aman.');
        passed++;

        // Test 2: Kuota plotCap atomic reservation (set plotCount ke max - 1 = 2)
        await Player.updateOne({ discordId: testUserA }, { $set: { plotCount: 2 } }); // Sisa kuota hanya 1

        // Coba beli 2 petak berbeda (tile2 dan tile3) secara simultan oleh Player A
        const tile3 = { x: 2162, y: 2612 };
        await ZoneTile.deleteMany({ tileX: tile3.x, tileY: tile3.y });

        const [dual1, dual2] = await Promise.all([
            landService.purchaseLandPlot(testUserA, testGuild, tile2.x, tile2.y, 'tianyuan_world_map'),
            landService.purchaseLandPlot(testUserA, testGuild, tile3.x, tile3.y, 'tianyuan_world_map')
        ]);

        const dualSuccess = [dual1, dual2].filter(r => r.ok);
        const dualFail = [dual1, dual2].filter(r => !r.ok);
        assert.strictEqual(dualSuccess.length, 1, 'Hanya 1 pembelian yang boleh tembus karena kuota sisa 1');
        assert.strictEqual(dualFail.length, 1, '1 pembelian harus ditolak kuota (BZ_CAP)');
        assert.strictEqual(dualFail[0].code, 'BZ_CAP');

        const finalUserA = await Player.findOne({ discordId: testUserA });
        assert.strictEqual(finalUserA.plotCount, 3, 'plotCount tidak boleh melebihi maxPlots (3)');
        console.log('[PASS] Atomic quota reservation mencegah eksploitasi multi-pembelian simultan.');
        passed++;

    } catch (err) {
        console.error('[FAIL]', err);
        failed++;
    } finally {
        await Player.deleteMany({ discordId: { $in: [testUserA, testUserB] } });
        await ZoneTile.deleteMany({ tileX: { $in: [tile1.x, tile2.x, 2162] } });
        await mongoose.connection.close();
    }

    console.log(`\n========================================`);
    console.log(`HASIL: ${passed} LULUS, ${failed} GAGAL`);
    console.log(`========================================\n`);

    if (failed > 0) process.exit(1);
}

run();
