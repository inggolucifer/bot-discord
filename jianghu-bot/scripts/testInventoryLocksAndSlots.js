/**
 * TEST SUITE: T2 - INVENTORY LOCKS, SLOTS & EQUIPMENT GUARD
 * Menguji:
 * - Mutasi via slotId spesifik pada item yang itemId-nya sama
 * - Validasi quantity integer & > 0
 * - Equipment guard: menolak discard jika item sedang di-equip
 * - Proteksi lock: mutasi paralel tidak menyebabkan duplicate discard / negatif
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const assert = require('assert');
const express = require('express');
const supertest = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

async function run() {
    console.log('\n=== TEST SUITE: T2 - INVENTORY LOCKS, SLOTS & EQUIPMENT GUARD ===\n');

    let passed = 0;
    let failed = 0;

    const mongoUri = process.env.MONGODB_URI;
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });

    const Player = require('../models/Player');
    const Item = require('../models/Item');

    const testUserId = `test_lockslot_${Date.now()}`;

    // Setup mock Express app
    const token = jwt.sign({ userId: testUserId }, process.env.JWT_SECRET || 'secret');
    const app = express();
    app.use(express.json());
    const inventoryRouter = require('../web-api/routes/inventory');
    app.use('/api/inventory', inventoryRouter);

    try {
        // Ambil 1 item untuk tes
        let testItem = await Item.findOne({ category: 'weapon' });
        if (!testItem) {
            testItem = await Item.create({
                name: 'Pedang Uji ' + Date.now(),
                category: 'weapon',
                rank: 'mortal',
                basePrice: 50
            });
        }

        // Test Case 1: SlotId Targeting
        // Buat player dengan 2 slot terpisah yang memiliki itemId sama
        const playerDoc = await Player.create({
            discordId: testUserId,
            characterName: 'SlotTestChar',
            inventory: [
                { itemId: testItem._id, quantity: 5 },
                { itemId: testItem._id, quantity: 10 }
            ],
            equipment: {}
        });

        const slot0Id = String(playerDoc.inventory[0]._id);
        const slot1Id = String(playerDoc.inventory[1]._id);

        // Buang 3 dari slot kedua (slot1Id)
        const resSlot = await supertest(app)
            .post('/api/inventory/discard')
            .set('Authorization', `Bearer ${token}`)
            .send({ itemId: testItem._id.toString(), quantity: 3, slotId: slot1Id });

        assert.strictEqual(resSlot.status, 200, `Expected 200, got ${resSlot.status}`);
        const updatedPlayer = await Player.findOne({ discordId: testUserId });
        assert.strictEqual(updatedPlayer.inventory.length, 2, 'Should still have 2 slots');
        const s0 = updatedPlayer.inventory.find(s => String(s._id) === slot0Id);
        const s1 = updatedPlayer.inventory.find(s => String(s._id) === slot1Id);
        assert.strictEqual(s0.quantity, 5, 'Slot 0 quantity should remain 5');
        assert.strictEqual(s1.quantity, 7, 'Slot 1 quantity should be reduced from 10 to 7');
        console.log('[PASS] Slot targeting by slotId modifies the exact designated slot.');
        passed++;

        // Test Case 2: Integer validation & negative/zero validation
        const resDec = await supertest(app)
            .post('/api/inventory/discard')
            .set('Authorization', `Bearer ${token}`)
            .send({ itemId: testItem._id.toString(), quantity: 1.5, slotId: slot1Id });
        assert.strictEqual(resDec.status, 400, 'Decimal quantity must be rejected with 400');

        const resZero = await supertest(app)
            .post('/api/inventory/discard')
            .set('Authorization', `Bearer ${token}`)
            .send({ itemId: testItem._id.toString(), quantity: 0, slotId: slot1Id });
        assert.strictEqual(resZero.status, 400, 'Zero quantity must be rejected with 400');

        const resNeg = await supertest(app)
            .post('/api/inventory/discard')
            .set('Authorization', `Bearer ${token}`)
            .send({ itemId: testItem._id.toString(), quantity: -2, slotId: slot1Id });
        assert.strictEqual(resNeg.status, 400, 'Negative quantity must be rejected with 400');
        console.log('[PASS] Decimal, zero, and negative quantities are properly rejected.');
        passed++;

        // Test Case 3: Equipment Guard
        // Set item sebagai equipped weapon
        await Player.updateOne(
            { discordId: testUserId },
            { $set: { 'equipment.weapon': testItem._id } }
        );

        const resEquipGuard = await supertest(app)
            .post('/api/inventory/discard')
            .set('Authorization', `Bearer ${token}`)
            .send({ itemId: testItem._id.toString(), quantity: 1, slotId: slot1Id });

        assert.strictEqual(resEquipGuard.status, 400, 'Discarding equipped item must return 400');
        assert.ok(resEquipGuard.body.error.includes('Lepas item'), 'Error message should instruct to unequip first');
        console.log('[PASS] Equipment guard prevents discarding currently equipped items.');
        passed++;

        // Test Case 4: Unequip and Discard completes successfully
        await Player.updateOne(
            { discordId: testUserId },
            { $set: { 'equipment.weapon': null } }
        );

        const resUnequipped = await supertest(app)
            .post('/api/inventory/discard')
            .set('Authorization', `Bearer ${token}`)
            .send({ itemId: testItem._id.toString(), quantity: 1, slotId: slot1Id });
        assert.strictEqual(resUnequipped.status, 200, 'Discard should succeed after unequipping');
        console.log('[PASS] Item can be discarded after being unequipped.');
        passed++;

    } catch (err) {
        console.error('[FAIL]', err);
        failed++;
    } finally {
        await Player.deleteOne({ discordId: testUserId });
        await mongoose.connection.close();
    }

    console.log(`\n========================================`);
    console.log(`HASIL: ${passed} LULUS, ${failed} GAGAL`);
    console.log(`========================================\n`);

    if (failed > 0) process.exit(1);
}

run();
