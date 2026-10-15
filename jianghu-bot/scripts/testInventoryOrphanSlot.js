/**
 * TEST SUITE: T1 - INVENTORY ORPHAN SLOT PROTECTION
 * Memverifikasi bahwa GET /api/inventory tidak crash (500) saat ada orphan slot
 * (itemId null atau item dihapus dari DB), slotId dikembalikan, dan meta.totalSlots akurat.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const assert = require('assert');
const express = require('express');
const supertest = require('supertest');
const mongoose = require('mongoose');

async function run() {
    console.log('\n=== TEST SUITE: T1 - INVENTORY ORPHAN SLOT PROTECTION ===\n');

    let passed = 0;
    let failed = 0;

    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
        console.error('MONGODB_URI not set');
        process.exit(1);
    }

    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });

    const Player = require('../models/Player');
    const Item = require('../models/Item');

    const testUserId = `test_orphan_${Date.now()}`;

    try {
        // 1. Ambil 2 item valid dari DB
        let validItems = await Item.find({}).limit(2);
        if (validItems.length < 2) {
            // Buat item dummy jika kurang
            const dummy1 = await Item.create({
                name: 'Test Herb ' + Date.now(),
                category: 'herb',
                rank: 'mortal',
                basePrice: 10
            });
            const dummy2 = await Item.create({
                name: 'Test Ore ' + Date.now(),
                category: 'material',
                rank: 'mortal',
                basePrice: 20
            });
            validItems = [dummy1, dummy2];
        }

        const fakeItemId = new mongoose.Types.ObjectId(); // ObjectId yang tidak ada di DB Item

        // 2. Buat Player dengan 3 slot: 2 valid + 1 orphan
        await Player.create({
            discordId: testUserId,
            characterName: 'OrphanTestChar',
            inventory: [
                { itemId: validItems[0]._id, quantity: 2 },
                { itemId: fakeItemId, quantity: 1 }, // Orphan slot!
                { itemId: validItems[1]._id, quantity: 5 }
            ]
        });

        // 3. Setup mock Express app dengan inventory router asli
        const jwt = require('jsonwebtoken');
        const token = jwt.sign({ userId: testUserId }, process.env.JWT_SECRET || 'secret');

        const app = express();
        app.use(express.json());
        const inventoryRouter = require('../web-api/routes/inventory');
        app.use('/api/inventory', inventoryRouter);

        // 4. Request GET /api/inventory
        const res = await supertest(app)
            .get('/api/inventory')
            .set('Authorization', `Bearer ${token}`);

        assert.strictEqual(res.status, 200, `Expected status 200, got ${res.status}: ${JSON.stringify(res.body)}`);
        assert.strictEqual(res.body.success, true, 'Expected success: true');
        assert.strictEqual(Array.isArray(res.body.data), true, 'Expected data array');
        assert.strictEqual(res.body.data.length, 2, `Expected exactly 2 valid items returned, got ${res.body.data.length}`);
        assert.strictEqual(res.body.meta.totalSlots, 2, `Expected meta.totalSlots to be 2, got ${res.body.meta.totalSlots}`);

        // Verifikasi setiap item memiliki slotId
        for (const item of res.body.data) {
            assert.ok(item.slotId, `Item ${item.name} should have slotId`);
            assert.ok(item.id, `Item ${item.name} should have id`);
        }

        console.log('[PASS] GET /api/inventory handles orphan slot gracefully, returns 200, and filters out null items.');
        console.log('[PASS] Every returned inventory item has a valid slotId.');
        console.log('[PASS] meta.totalSlots accurately reflects only valid slots.');
        passed += 3;

    } catch (err) {
        console.error('[FAIL]', err);
        failed++;
    } finally {
        // Cleanup test player
        await Player.deleteOne({ discordId: testUserId });
        await mongoose.connection.close();
    }

    console.log(`\n========================================`);
    console.log(`HASIL: ${passed} LULUS, ${failed} GAGAL`);
    console.log(`========================================\n`);

    if (failed > 0) process.exit(1);
}

run();
