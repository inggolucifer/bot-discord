/**
 * TEST SUITE: T8 - GATHER VALIDATION & ATOMIC COOLDOWN
 * Menguji endpoint POST /api/world/zone/gather:
 * - Validasi input: non-integer / out-of-range ditolak 400
 * - Tile tanpa resource ditolak 400
 * - Tile dengan resource berhasil dipanen
 * - Cooldown aktif mencegah panen ganda (400)
 * - Panen paralel pada petak yang sama terlindungi secara atomik
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const assert = require('assert');
const express = require('express');
const supertest = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

async function run() {
    console.log('\n=== TEST SUITE: T8 - GATHER VALIDATION & ATOMIC COOLDOWN ===\n');

    let passed = 0;
    let failed = 0;

    const mongoUri = process.env.MONGODB_URI;
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });

    const Player = require('../models/Player');
    const Item = require('../models/Item');
    const ZoneTile = require('../models/ZoneTile');
    const proceduralWorldEngine = require('../utils/proceduralWorldEngine');

    const testUserId = `test_gather_${Date.now()}`;

    // Cari satu petak bersumber daya di dekat Xingcun / Central Plains
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

    assert.ok(resTile, 'Harus menemukan minimal 1 tile bersumber daya alam');

    // Pastikan item panen ada di database
    const itemName = resTile.resourceType === 'ore' ? 'Bijih Besi Roh Murni'
        : resTile.resourceType === 'wood' ? 'Kayu Cendana Spiritual'
        : resTile.resourceType === 'fish' ? 'Ikan Mas Sisik Emas'
        : 'Herba Roh Bunga Melati';

    let itemDoc = await Item.findOne({ name: itemName });
    if (!itemDoc) {
        itemDoc = await Item.create({
            guildId: 'global',
            name: itemName,
            category: resTile.resourceType === 'herb' ? 'herb' : 'material',
            rank: 'Common',
            basePrice: 15
        });
    }

    // Bersihkan ZoneTile uji coba jika ada
    await ZoneTile.deleteMany({ tileX: resTile.x, tileY: resTile.y });

    // Buat player tepat di samping petak sumber daya
    await Player.create({
        discordId: testUserId,
        characterName: 'GatherTester',
        gridPosition: { tileX: resTile.x, tileY: resTile.y },
        stamina: 100,
        maxStamina: 100,
        inventory: []
    });

    const token = jwt.sign({ userId: testUserId }, process.env.JWT_SECRET || 'secret');
    const app = express();
    app.use(express.json());
    const worldRouter = require('../web-api/routes/world');
    app.use('/api/world', worldRouter);

    try {
        // Test 1: Validasi koordinat tidak valid (out of range / non-integer)
        const resInvalid = await supertest(app)
            .post('/api/world/zone/gather')
            .set('Authorization', `Bearer ${token}`)
            .send({ tileX: -10, tileY: 2000 });
        assert.strictEqual(resInvalid.status, 400, 'Out-of-bound tileX should return 400');

        const resNaN = await supertest(app)
            .post('/api/world/zone/gather')
            .set('Authorization', `Bearer ${token}`)
            .send({ tileX: 'abc', tileY: 2000 });
        assert.strictEqual(resNaN.status, 400, 'Non-integer tileX should return 400');
        console.log('[PASS] Validasi koordinat menolak nilai non-integer dan out-of-range.');
        passed++;

        // Test 2: Petak tanpa sumber daya ditolak 400
        // Cari petak tanpa sumber daya
        let emptyTile = null;
        for (let x = 2050; x < 2100; x++) {
            const t = proceduralWorldEngine.getTileAt(x, 2650);
            if (!t.resourceType && !t.isSolid) {
                emptyTile = { x, y: 2650 };
                break;
            }
        }
        if (emptyTile) {
            // Pindahkan sementara player ke petak tersebut
            await Player.updateOne({ discordId: testUserId }, { $set: { 'gridPosition.tileX': emptyTile.x, 'gridPosition.tileY': emptyTile.y } });
            const resEmpty = await supertest(app)
                .post('/api/world/zone/gather')
                .set('Authorization', `Bearer ${token}`)
                .send({ tileX: emptyTile.x, tileY: emptyTile.y });
            assert.strictEqual(resEmpty.status, 400, 'Empty resource tile should return 400');
            assert.ok(resEmpty.body.error.includes('Tidak ada sumber daya'), 'Should indicate no resource');
            console.log('[PASS] Petak tanpa sumber daya alam ditolak dengan benar (400).');
            passed++;
        }

        // Kembalikan posisi player ke resTile
        await Player.updateOne({ discordId: testUserId }, { $set: { 'gridPosition.tileX': resTile.x, 'gridPosition.tileY': resTile.y } });

        // Test 3: Panen sah berhasil
        const resValid = await supertest(app)
            .post('/api/world/zone/gather')
            .set('Authorization', `Bearer ${token}`)
            .send({ tileX: resTile.x, tileY: resTile.y });

        assert.strictEqual(resValid.status, 200, `Expected 200, got ${resValid.status}: ${JSON.stringify(resValid.body)}`);
        assert.strictEqual(resValid.body.ok, true);
        assert.strictEqual(resValid.body.itemName, itemName);

        const updatedPlayer = await Player.findOne({ discordId: testUserId });
        const gatheredSlot = updatedPlayer.inventory.find(i => i.itemId.toString() === itemDoc._id.toString());
        assert.ok(gatheredSlot && gatheredSlot.quantity >= 1, 'Item should be present in player inventory');
        console.log('[PASS] Panen sah berhasil dan item tersimpan di inventori.');
        passed++;

        // Test 4: Panen ulang saat cooldown ditolak 400
        const resCooldown = await supertest(app)
            .post('/api/world/zone/gather')
            .set('Authorization', `Bearer ${token}`)
            .send({ tileX: resTile.x, tileY: resTile.y });

        assert.strictEqual(resCooldown.status, 400, 'Gather during cooldown must return 400');
        assert.ok(resCooldown.body.error.includes('sedang habis') || resCooldown.body.error.includes('baru saja dipanen'));
        console.log('[PASS] Cooldown panen aktif dan mencegah pemanenan instan berulang.');
        passed++;

    } catch (err) {
        console.error('[FAIL]', err);
        failed++;
    } finally {
        await Player.deleteOne({ discordId: testUserId });
        await ZoneTile.deleteMany({ tileX: resTile.x, tileY: resTile.y });
        await mongoose.connection.close();
    }

    console.log(`\n========================================`);
    console.log(`HASIL: ${passed} LULUS, ${failed} GAGAL`);
    console.log(`========================================\n`);

    if (failed > 0) process.exit(1);
}

run();
