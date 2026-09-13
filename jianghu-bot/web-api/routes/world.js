const express = require('express');
const router = express.Router();
const Player = require('../../models/Player');
const Location = require('../../models/Location');
const Travel = require('../../models/Travel');
const Shop = require('../../models/Shop');
const AdminLog = require('../../models/AdminLog');
const { authenticateToken } = require('../middlewares/auth'); // assuming it's in auth based on other files
const travelConfig = require('../../config/travelDistances');
const { getRealmIndex } = require('../../utils/cultivation');
const { calculateEnergy } = require('../../utils/energyManager');
const CustomError = require('../utils/CustomError');
const { withTransaction } = require('../utils/dbTransaction');

router.get('/location', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const player = await Player.findOne({ discordId: userId });
        if (!player) return res.status(404).json({ error: 'Karakter tidak ditemukan' });

        const location = player.currentLocation || { regionSlug: 'central_plains', settlementName: 'Desa Xingcun', buildingName: null };

        // Find buildings in the settlement
        const buildings = await Location.find({
            guildId: player.guildId,
            settlementName: location.settlementName
        });

        res.json({
            currentLocation: location,
            buildings: buildings
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Gagal memuat lokasi' });
    }
});

router.get('/settlements', authenticateToken, async (req, res) => {
    try {
        res.json({ settlements: travelConfig.settlements });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Gagal memuat settlement' });
    }
});

router.post('/enter', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { buildingName } = req.body;
        if (!buildingName) return res.status(400).json({ error: 'Nama bangunan diperlukan.' });

        const activeTravel = await Travel.findOne({ discordId: userId, status: 'traveling' });
        if (activeTravel) return res.status(400).json({ error: 'Kamu sedang dalam perjalanan.' });

        const player = await Player.findOne({ discordId: userId });
        if (!player) return res.status(404).json({ error: 'Karakter tidak ditemukan' });

        const location = player.currentLocation || { regionSlug: 'central_plains', settlementName: 'Desa Xingcun', buildingName: null };

        const building = await Location.findOne({
            guildId: player.guildId,
            settlementName: location.settlementName,
            buildingName: buildingName
        });

        if (!building) return res.status(404).json({ error: 'Bangunan tidak ditemukan di settlement ini.' });

        if (!player.currentLocation) {
            player.currentLocation = { regionSlug: 'central_plains', settlementName: 'Desa Xingcun', buildingName: null };
        }
        player.currentLocation.buildingName = buildingName;
        await player.save();

        res.json({ success: true, message: `Memasuki ${buildingName}`, currentLocation: player.currentLocation });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Gagal memasuki bangunan' });
    }
});

router.post('/exit', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        const activeTravel = await Travel.findOne({ discordId: userId, status: 'traveling' });
        if (activeTravel) return res.status(400).json({ error: 'Kamu sedang dalam perjalanan.' });

        const player = await Player.findOne({ discordId: userId });
        if (!player) return res.status(404).json({ error: 'Karakter tidak ditemukan' });

        if (!player.currentLocation) {
            player.currentLocation = { regionSlug: 'central_plains', settlementName: 'Desa Xingcun', buildingName: null };
        }
        player.currentLocation.buildingName = null;
        await player.save();

        res.json({ success: true, message: `Keluar ke jalanan.`, currentLocation: player.currentLocation });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Gagal keluar dari bangunan' });
    }
});

router.post('/travel/start', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { toSettlementName, useEscortLetter } = req.body;

        if (!toSettlementName) return res.status(400).json({ error: 'Tujuan perjalanan diperlukan.' });

        const activeTravel = await Travel.findOne({ discordId: userId, status: 'traveling' });
        if (activeTravel) return res.status(400).json({ error: 'Kamu sudah dalam perjalanan.' });

        const player = await Player.findOne({ discordId: userId });
        if (!player) return res.status(404).json({ error: 'Karakter tidak ditemukan' });

        const fromLocation = player.currentLocation || { regionSlug: 'central_plains', settlementName: 'Desa Xingcun', buildingName: null };

        if (fromLocation.settlementName === toSettlementName) {
            return res.status(400).json({ error: 'Kamu sudah berada di settlement tersebut.' });
        }

        const targetSettlement = travelConfig.settlements.find(s => s.name === toSettlementName);
        if (!targetSettlement) return res.status(400).json({ error: 'Tujuan tidak valid.' });

        // Calculate distance
        let distance = null;
        if (travelConfig.distancesLi[fromLocation.settlementName] && travelConfig.distancesLi[fromLocation.settlementName][toSettlementName]) {
            distance = travelConfig.distancesLi[fromLocation.settlementName][toSettlementName];
        } else {
             return res.status(400).json({ error: 'Rute tidak ditemukan.' });
        }

        let baseHours = distance / travelConfig.LI_PER_HOUR;
        let realmIndex = getRealmIndex(player.systemCultivation?.realm || 'Fondasi Fana (Mortal Foundation)');
        let finalHours = baseHours * (1 - Math.min(0.5, realmIndex * 0.03));
        let arrivalTime = new Date(Date.now() + finalHours * 3600 * 1000);

        let escortUsed = false;
        if (useEscortLetter) {
            const Item = require('../../models/Item');
            const escortItemDef = await Item.findOne({ name: 'Surat Jaminan Biro Pengawalan' });
            if (escortItemDef) {
                const itemIndex = player.inventory.findIndex(i => i.itemId && i.itemId.toString() === escortItemDef._id.toString());
                if (itemIndex > -1) {
                    escortUsed = true;
                    player.inventory[itemIndex].quantity -= 1;
                    if (player.inventory[itemIndex].quantity <= 0) {
                        player.inventory.splice(itemIndex, 1);
                    }
                    await player.save();
                }
            }
        }

        const travel = new Travel({
            guildId: player.guildId,
            discordId: userId,
            fromLocation: { regionSlug: fromLocation.regionSlug, settlementName: fromLocation.settlementName },
            toLocation: { regionSlug: targetSettlement.regionSlug, settlementName: targetSettlement.name },
            startTime: new Date(),
            arrivalTime: arrivalTime,
            usedEscortLetter: escortUsed
        });

        await travel.save();

        // Remove player from building when traveling
        if (player.currentLocation) {
             player.currentLocation.buildingName = null;
             await player.save();
        }

        res.json({ success: true, travel: travel });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Gagal memulai perjalanan' });
    }
});

router.get('/travel/status', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const travel = await Travel.findOne({ discordId: userId, status: 'traveling' });

        if (!travel) return res.json({ travel: null });

        if (Date.now() >= travel.arrivalTime.getTime()) {
            await withTransaction(async (session) => {
                travel.status = 'arrived';
                const player = await Player.findOne({ discordId: userId }).session(session);
                if (!player) throw new CustomError('Karakter tidak ditemukan', 404);

                player.currentLocation = {
                    regionSlug: travel.toLocation.regionSlug,
                    settlementName: travel.toLocation.settlementName,
                    buildingName: null
                };

                let ambushData = null;
                if (!travel.ambushResolved) {
                    travel.ambushResolved = true;
                    // Ambush logic
                    let ambushChance = 0.15; // default base
                    if (travel.usedEscortLetter) ambushChance *= 0.3;

                    if (Math.random() < ambushChance) {
                        travel.ambushResult.happened = true;
                        travel.ambushResult.banditGroupSize = Math.floor(Math.random() * 3) + 3; // 3-5

                        const { getTotalCopper, payCurrency } = require('../../utils/currency');
                        const totalCopperEq = getTotalCopper(player.currency);
                        const lossCopper = Math.floor(totalCopperEq * travelConfig.AMBUSH_LOSS_PERCENT);
                        const capCopper = travelConfig.AMBUSH_LOSS_CAP_SILVER_EQ * 100;
                        const finalLossCopper = Math.min(lossCopper, capCopper);

                        if (finalLossCopper > 0) {
                            // Deduct using existing utility
                            payCurrency(player.currency, finalLossCopper, 'copper');

                            travel.ambushResult.currencyLost.copper = finalLossCopper;
                            travel.ambushResult.message = `Kamu disergap oleh ${travel.ambushResult.banditGroupSize} bandit dan kehilangan harta setara dengan ${Math.floor(finalLossCopper/100)} silver.`;

                            try {
                                const client = req.app.get('client');
                                if (client) {
                                    const { logTransaction } = require('../../utils/logger'); // or whichever file has it
                                    if (logTransaction) {
                                        logTransaction(client, {
                                            guildId: player.guildId,
                                            userId: player.discordId,
                                            type: 'travel_ambush',
                                            description: `Ambushed during travel, lost ${finalLossCopper} copper equivalent`,
                                            currencyType: 'copper',
                                            amount: finalLossCopper
                                        });
                                    }
                                }
                            } catch (e) {
                                // Ignore if economyLogger not found or client not set up fully
                            }

                            await AdminLog.create([{
                                guildId: player.guildId,
                                adminId: 'SYSTEM',
                                action: 'travel_ambush',
                                details: `Player ${player.discordId} ambushed, lost ${finalLossCopper} copper equivalent.`
                            }], { session });

                        } else {
                            travel.ambushResult.message = `Kamu disergap oleh bandit, tapi kamu tidak memiliki harta untuk dirampas.`;
                        }
                    }
                }

                await player.save({ session });
                await travel.save({ session });
            });

            // Re-fetch travel to get updated ambush result
            const updatedTravel = await Travel.findById(travel._id);
            const playerAfter = await Player.findOne({ discordId: userId });
            return res.json({ travel: updatedTravel, currentLocation: playerAfter.currentLocation });
        }

        res.json({ travel: travel });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Gagal memuat status perjalanan' });
    }
});

router.get('/shops', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const player = await Player.findOne({ discordId: userId });
        if (!player) return res.status(404).json({ error: 'Karakter tidak ditemukan' });

        const location = player.currentLocation || { regionSlug: 'central_plains', settlementName: 'Desa Xingcun', buildingName: null };

        let locationTag = null;
        if (location.buildingName) {
            const building = await Location.findOne({
                guildId: player.guildId,
                settlementName: location.settlementName,
                buildingName: location.buildingName
            });
            if (building && building.shopTag) {
                locationTag = building.shopTag;
            }
        }

        const query = {
            guildId: player.guildId,
            isActive: true,
            $or: [
                { locationTag: null }, // Global shops
                { locationTag: locationTag } // Shops matching building's tag
            ]
        };

        const shops = await Shop.find(query).populate('refId');
        // Let's ensure the format matches what market usually returns, maybe `{ data: shops }` since it errored before
        res.json({ data: shops });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Gagal memuat toko' });
    }
});

module.exports = router;
