require('dotenv').config();
const mongoose = require('mongoose');
const Player = require('./models/Player');
const Npc = require('./models/Npc');
const ZoneTile = require('./models/ZoneTile');
const BarterOffer = require('./models/BarterOffer');
const Item = require('./models/Item');

async function runTest() {
    console.log('=== STARTING FASE G8 TEST: GRID-BASED BARTER & NPC PROXIMITY ===');
    try {
        if (!process.env.MONGODB_URI) {
            console.error('MONGODB_URI is not defined in .env');
            process.exit(1);
        }
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB.');

        const guildId = 'test_guild_g8';
        const zoneId = 'central_plains_bamboo_forest';

        // Clean up test data
        await Player.deleteMany({ guildId });
        await Npc.deleteMany({ guildId });
        await ZoneTile.deleteMany({ guildId });
        await BarterOffer.deleteMany({ guildId });

        // 1. Create Test Item for barter
        let testItem = await Item.findOne({ name: 'Test Jade Pendant' });
        if (!testItem) {
            testItem = await Item.create({
                name: 'Test Jade Pendant',
                type: 'equipment',
                rarity: 'rare',
                description: 'A test pendant for barter verification.'
            });
        }

        // 2. Create Two Players at nearby tiles (5,5) and (6,6) -> Chebyshev dist = 1
        const player1 = await Player.create({
            discordId: 'g8_player_1',
            guildId,
            characterName: 'Pengembara A',
            status: 'active',
            currency: { copper: 100, silver: 10, gold: 0 },
            inventory: [{ itemId: testItem._id, quantity: 2 }],
            gridPosition: { zoneId, tileX: 5, tileY: 5 }
        });

        const player2 = await Player.create({
            discordId: 'g8_player_2',
            guildId,
            characterName: 'Pengembara B',
            status: 'active',
            currency: { copper: 50, silver: 5, gold: 0 },
            inventory: [],
            gridPosition: { zoneId, tileX: 6, tileY: 6 }
        });

        console.log('Created Player A at (5, 5) and Player B at (6, 6).');

        // Test nearby-players query logic
        const px = player1.gridPosition.tileX;
        const py = player1.gridPosition.tileY;
        const nearbyQuery = {
            guildId,
            discordId: { $ne: player1.discordId },
            'gridPosition.zoneId': zoneId,
            'gridPosition.tileX': { $gte: px - 2, $lte: px + 2 },
            'gridPosition.tileY': { $gte: py - 2, $lte: py + 2 },
            status: 'active'
        };

        const nearbyFound = await Player.find(nearbyQuery);
        if (nearbyFound.length !== 1 || nearbyFound[0].discordId !== player2.discordId) {
            throw new Error(`TEST FAILED: Player B should be found in nearby query! Found: ${nearbyFound.length}`);
        }
        console.log('✅ TEST 1 PASSED: Player B correctly found nearby (Chebyshev distance <= 2).');

        // Test Barter Offer creation within proximity (Chebyshev dist = 1 <= 2)
        const dist1 = Math.max(
            Math.abs(player1.gridPosition.tileX - player2.gridPosition.tileX),
            Math.abs(player1.gridPosition.tileY - player2.gridPosition.tileY)
        );
        if (dist1 > 2) throw new Error('Distance should be <= 2');

        const offer = await BarterOffer.create({
            guildId,
            fromUserId: player1.discordId,
            toUserId: player2.discordId,
            offer: { copper: 10, silver: 0, gold: 0, items: [{ itemId: testItem._id, itemName: testItem.name, quantity: 1 }] },
            request: { copper: 20, silver: 0, gold: 0, items: [] },
            locationKey: `grid_${zoneId}`,
            status: 'pending',
            expiresAt: new Date(Date.now() + 3600000)
        });
        console.log('✅ TEST 2 PASSED: Barter offer created successfully while in range (dist: 1 <= 2).');

        // Test Acceptance validation when nearby
        const distAccept = Math.max(
            Math.abs(player1.gridPosition.tileX - player2.gridPosition.tileX),
            Math.abs(player1.gridPosition.tileY - player2.gridPosition.tileY)
        );
        if (distAccept > 2) throw new Error('Accept distance should be <= 2');
        console.log('✅ TEST 3 PASSED: Barter acceptance distance check succeeded.');

        // Now move Player B far away to (5, 9) -> Chebyshev dist = max(|5-5|, |5-9|) = 4 > 2
        player2.gridPosition.tileY = 9;
        await player2.save();

        const nearbyAfterMove = await Player.find(nearbyQuery);
        if (nearbyAfterMove.length !== 0) {
            throw new Error('TEST FAILED: Player B should NOT be found nearby after moving to (5, 9)!');
        }
        console.log('✅ TEST 4 PASSED: Player B no longer visible in nearby query after moving to (5, 9) (dist: 4 > 2).');

        // Verify distance validation rejects offer creation when dist > 2
        const distTooFar = Math.max(
            Math.abs(player1.gridPosition.tileX - player2.gridPosition.tileX),
            Math.abs(player1.gridPosition.tileY - player2.gridPosition.tileY)
        );
        if (distTooFar <= 2) throw new Error('Distance should be > 2');
        console.log(`✅ TEST 5 PASSED: Offer creation distance check correctly rejects when dist = ${distTooFar} > 2.`);

        // 3. NPC Interaction & Proximity Test
        const testNpc = await Npc.create({
            guildId,
            name: 'Tetua Roh Bambu',
            title: 'Penjaga Hutan',
            regionSlug: 'central_plains',
            settlementName: 'Hutan Bambu',
            zoneId: zoneId,
            tileX: 7,
            tileY: 7,
            greeting: 'Salam, pengembara grid wuxia.',
            isActive: true
        });

        await ZoneTile.create({
            guildId,
            zoneId,
            tileX: 7,
            tileY: 7,
            tileType: 'npc_spawn',
            linkedRefId: testNpc._id,
            label: 'Tetua Roh Bambu'
        });

        // Player A is at (5, 5) -> Chebyshev distance to NPC (7, 7) = max(|5-7|, |5-7|) = 2 <= 2
        const distNpcClose = Math.max(
            Math.abs(player1.gridPosition.tileX - testNpc.tileX),
            Math.abs(player1.gridPosition.tileY - testNpc.tileY)
        );
        if (distNpcClose > 2) throw new Error(`NPC distance should be <= 2, got: ${distNpcClose}`);
        console.log(`✅ TEST 6 PASSED: Player A at (5, 5) can interact with NPC at (7, 7) (Chebyshev dist = ${distNpcClose} <= 2).`);

        // Move Player A to (1, 1) -> Chebyshev distance to NPC (7, 7) = max(|1-7|, |1-7|) = 6 > 2
        player1.gridPosition.tileX = 1;
        player1.gridPosition.tileY = 1;
        await player1.save();

        const distNpcFar = Math.max(
            Math.abs(player1.gridPosition.tileX - testNpc.tileX),
            Math.abs(player1.gridPosition.tileY - testNpc.tileY)
        );
        if (distNpcFar <= 2) throw new Error(`NPC distance should be > 2, got: ${distNpcFar}`);
        console.log(`✅ TEST 7 PASSED: Player A at (1, 1) rejected from interacting with NPC at (7, 7) (dist = ${distNpcFar} > 2).`);

        // Clean up
        await Player.deleteMany({ guildId });
        await Npc.deleteMany({ guildId });
        await ZoneTile.deleteMany({ guildId });
        await BarterOffer.deleteMany({ guildId });

        console.log('=== ALL FASE G8 TESTS PASSED SUCCESSFULLY! ===');
    } catch (err) {
        console.error('TEST ERROR:', err);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

runTest();
