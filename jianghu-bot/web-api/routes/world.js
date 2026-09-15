const express = require('express');
const router = express.Router();
const { canAddToInventory, buildInventoryItemMap, getCarryCapacity, getInventoryWeight } = require('../../utils/inventoryWeight');

const Player = require('../../models/Player');
const { normalizeCurrency } = require('../../utils/currencyNormalize');
const TransactionLog = require('../../models/TransactionLog');

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

        let currentLocationData = { ...location };
        if (location.buildingName) {
            const currentBuilding = buildings.find(b => b.buildingName === location.buildingName);
            if (currentBuilding) {
                currentLocationData.buildingType = currentBuilding.buildingType;
                currentLocationData.linkedSectId = currentBuilding.linkedSectId;
            }
        }

                // Find NPCs in the current settlement and building
        const npcsHere = await require('../../models/Npc').find({
            guildId: player.guildId,
            settlementName: location.settlementName,
            buildingName: location.buildingName || null,
            isActive: true
        }).select('_id name title portraitUrl greeting dialogLines minRealmIndexToTalk questIds');

        res.json({
            currentLocation: currentLocationData,
            buildings: buildings,
            npcsHere: npcsHere
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

        let realmDiscount = Math.min(0.5, realmIndex * 0.03);
        let horseSpeedBonus = 0;
        const Item = require('../../models/Item');

        if (player.equipment && player.equipment.accessory) {
            const accInvItem = player.inventory.id(player.equipment.accessory);
            if (accInvItem && accInvItem.itemId) {
                const accItem = await Item.findById(accInvItem.itemId);
                if (accItem && accItem.capacityType === 'horse') {
                    horseSpeedBonus = accItem.travelSpeedBonus || 0;
                }
            }
        }

        const { MAX_TRAVEL_SPEED_DISCOUNT } = require('../../config/inventoryWeight');
        const totalDiscount = Math.min(realmDiscount + horseSpeedBonus, MAX_TRAVEL_SPEED_DISCOUNT);

        let finalHours = baseHours * (1 - totalDiscount);
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
            staminaLastAppliedAt: new Date(),
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
        const travel = await Travel.findOne({ discordId: userId, status: { $in: ['traveling', 'ambushed'] } });

        if (!travel) { const playerFallback = await Player.findOne({ discordId: userId }); return res.json({ travel: null, currentStamina: getCurrentStamina(playerFallback), maxStamina: getMaxStamina(playerFallback) }); }

        if (travel.status === 'traveling' && Date.now() >= travel.arrivalTime.getTime()) {
            await withTransaction(async (session) => {
                const player = await Player.findOne({ discordId: userId }).session(session);
                if (!player) throw new CustomError('Karakter tidak ditemukan', 404);

                let isAmbushed = false;
                if (!travel.ambushResolved) {
                    // Phase 6: Ambush logic modified to pending state
                    let ambushChance = 0.15; // default base
                    if (travel.usedEscortLetter) ambushChance *= 0.3;

                    if (Math.random() < ambushChance) {
                        isAmbushed = true;
                        travel.status = 'ambushed';
                        travel.ambushResult.happened = true;
                        travel.ambushResult.banditGroupSize = Math.floor(Math.random() * 3) + 3; // 3-5
                        travel.ambushResult.message = `Kamu disergap oleh ${travel.ambushResult.banditGroupSize} bandit! Apa yang akan kamu lakukan?`;
                    } else {
                        travel.ambushResolved = true;
                    }
                }

                if (!isAmbushed) {
                    travel.status = 'arrived';
                    player.currentLocation = {
                        regionSlug: travel.toLocation.regionSlug,
                        settlementName: travel.toLocation.settlementName,
                        buildingName: null
                    };
                    await player.save({ session });
                }

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

router.post('/travel/resolve-ambush', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { choice } = req.body; // 'fight' | 'surrender'

    if (!['fight', 'surrender'].includes(choice)) {
        return res.status(400).json({ error: 'Pilihan tidak valid.' });
    }

    const LockManager = require('../utils/lockManager');
    const lockKey = `ambush_${userId}`;
    const releaseLock = await LockManager.acquire(lockKey);
    if (!releaseLock) return res.status(429).json({ error: 'Permintaan sedang diproses.' });

    try {
        const result = await withTransaction(async (session) => {
            const travel = await Travel.findOne({ discordId: userId, status: 'ambushed' }).session(session);
            if (!travel) throw new CustomError('Tidak ada ambush yang aktif.', 404);

            const player = await Player.findOne({ discordId: userId }).session(session);
            if (!player) throw new CustomError('Karakter tidak ditemukan', 404);

            let ambushLogs = [];
            let won = false;

            if (choice === 'surrender') {
                const { getTotalCopper, payCurrency } = require('../../utils/currency');
                const totalCopperEq = getTotalCopper(player.currency);
                const lossCopper = Math.floor(totalCopperEq * travelConfig.AMBUSH_LOSS_PERCENT);
                const capCopper = travelConfig.AMBUSH_LOSS_CAP_SILVER_EQ * 100;
                const finalLossCopper = Math.min(lossCopper, capCopper);

                if (finalLossCopper > 0) {
                    payCurrency(player.currency, finalLossCopper, 'copper');
                    travel.ambushResult.currencyLost.copper = finalLossCopper;
                    travel.ambushResult.message = `Kamu menyerah dan membayar upeti sebesar ${Math.floor(finalLossCopper/100)} silver.`;

                    await TransactionLog.create([{
                        guildId: player.guildId,
                        type: 'ambush_loss',
                        description: `[${player.characterName}] menyerah pada penyergapan bandit. Kehilangan ${finalLossCopper} Copper eq.`,
                        amount: finalLossCopper,
                        currency: 'copper'
                    }], { session });

                } else {
                    travel.ambushResult.message = `Kamu menyerah, namun tidak memiliki harta yang bisa dirampas.`;
                }

                won = false;
            } else if (choice === 'fight') {
                const Monster = require('../../models/Monster');
                const { simulateBattle } = require('../../utils/simulateBattle');
                const { syncPlayerCultivation } = require('../../utils/cultivation');

                await syncPlayerCultivation(player);
                await player.populate('laws manuals.manualId');

                // Get generic bandit stats
                let banditMonster = await Monster.findOne({ guildId: player.guildId, key: 'bandit_generic' }).session(session);

                // Fallback basic stats if seed is missing for some reason
                let baseHp = banditMonster ? banditMonster.statBlock.hp : 120;
                let baseAtk = banditMonster ? banditMonster.statBlock.atk : 12;
                let baseDef = banditMonster ? banditMonster.statBlock.def : 5;
                let baseSpd = banditMonster ? banditMonster.statBlock.spd : 8;
                let banditName = banditMonster ? banditMonster.name : 'Bandit Jalanan';

                const groupSize = travel.ambushResult.banditGroupSize || 3;

                // Submultiplicative scaling
                const totalHp = Math.floor(baseHp * (1 + 0.5 * (groupSize - 1)));
                const totalAtk = Math.floor(baseAtk * (1 + 0.6 * (groupSize - 1)));
                const totalDef = Math.floor(baseDef * (1 + 0.4 * (groupSize - 1)));
                const totalSpd = Math.floor(baseSpd * (1 + 0.2 * (groupSize - 1)));

                const opponent = {
                    characterName: `Kelompok ${banditName} (${groupSize} orang)`,
                    stats: {
                        baseHp: totalHp,
                        baseAtk: totalAtk,
                        baseDef: totalDef,
                        baseSpd: totalSpd
                    },
                    laws: [],
                    manuals: [],
                    activeBuffs: [],
                    equipment: {},
                    inventory: [],
                    systemCultivation: null
                };

                const battleResult = simulateBattle(player, opponent, { isPvE: true, allowSteal: true });
                player.currentHp = battleResult.p1Hp;
                player.combatConditions = battleResult.p1Conditions;

                if (battleResult.stealSuccess) {
                    player.kungfuSkills.stealing = (player.kungfuSkills.stealing || 0) + 1;

                    let stolenItem = null;
                    let stolenCopper = 0;
                    let stolenSilver = 0;

                    if (opponent.dropTable && opponent.dropTable.length > 0) {
                         const validDrops = opponent.dropTable.filter(d => Math.random() < d.chance);
                         if (validDrops.length > 0) {
                              const drop = validDrops[Math.floor(Math.random() * validDrops.length)];
                              const qty = Math.floor(Math.random() * (drop.quantityMax - drop.quantityMin + 1)) + drop.quantityMin;
                              if (qty > 0) {
                                  stolenItem = { id: drop.itemId, name: drop.itemName, qty };
                              }
                         }
                    }

                    if (!stolenItem && opponent.currencyDrop) {
                         stolenCopper = Math.floor((Math.floor(Math.random() * (opponent.currencyDrop.copperMax - opponent.currencyDrop.copperMin + 1)) + opponent.currencyDrop.copperMin) * 0.2);
                         stolenSilver = Math.floor((Math.floor(Math.random() * (opponent.currencyDrop.silverMax - opponent.currencyDrop.silverMin + 1)) + opponent.currencyDrop.silverMin) * 0.2);
                    }

                    if (stolenItem) {

                         const itemDoc = await Item.findById(stolenItem.id);
                         if (itemDoc) {
                             const invCheck = await canAddToInventory(player, [{ itemDoc: itemDoc, quantity: stolenItem.qty }], { isTraveling: true });
                             if (!invCheck.ok) {
                                 stolenItem = null;
                             } else {
                                 const existing = player.inventory.find(i => i.itemId.toString() === stolenItem.id.toString());
                                 if (existing) {
                                     existing.quantity += stolenItem.qty;
                                 } else {
                                     player.inventory.push({ itemId: stolenItem.id, quantity: stolenItem.qty });
                                 }
                             }

                             if (stolenItem) {
                                 await TransactionLog.create({
                                     guildId: player.guildId,
                                     userId: player.discordId,
                                     type: 'steal_pve',
                                     description: `Berhasil mencuri ${stolenItem.qty}x ${itemDoc.name} dari ${opponent.name}`
                                 });
                             }
                         }
                    } else if (stolenCopper > 0 || stolenSilver > 0) {

                         player.currency.copper += stolenCopper;
                         player.currency.silver += stolenSilver;


                         player.currency = normalizeCurrency(player.currency);

                         await TransactionLog.create({
                                 guildId: player.guildId,
                                 userId: player.discordId,
                                 type: 'steal_pve',
                                 description: `Berhasil mencuri dari ${opponent.name}`,
                                 amount: stolenCopper + (stolenSilver * 100),
                                 currency: 'copper'
                         });
                    }
                }
                ambushLogs = battleResult.logs;

                if (battleResult.winnerIdx === 1) {
                    won = true;

                    // Award EXP and check level up
                    const { POINTS_PER_LEVEL, getRequiredExpForLevel } = require('../../config/leveling');
                    const { TALENT_EFFECTS } = require('../../config/talentEffects');

                    let expGain = 60; // Mock base exp from bandit
                    if (player.talents && player.talents.int) {
                        expGain = Math.floor(expGain * (1 + (player.talents.int * TALENT_EFFECTS.int.expMultiplier)));
                    }
                    player.exp = (player.exp || 0) + expGain;

                    let requiredExp = getRequiredExpForLevel(player.level || 1);
                    while (player.exp >= requiredExp && (player.level || 1) < 100) {
                         player.exp -= requiredExp;
                         player.level = (player.level || 1) + 1;
                         player.unallocatedTalentPoints = (player.unallocatedTalentPoints || 0) + POINTS_PER_LEVEL;
                         requiredExp = getRequiredExpForLevel(player.level);
                    }

                    // Drop from generic bandit (using fallback values or from db)
                    let lootCopper = 0;
                    if (banditMonster && banditMonster.currencyDrop) {
                        const { copperMin, copperMax } = banditMonster.currencyDrop;
                        lootCopper = Math.floor(Math.random() * (copperMax - copperMin + 1)) + copperMin;
                        // Multiply loosely based on group size
                        lootCopper = Math.floor(lootCopper * (1 + 0.5 * (groupSize - 1)));
                    }

                    if (lootCopper > 0) {
                        player.currency.copper += lootCopper;
                        travel.ambushResult.message = `Kamu berhasil mengalahkan kelompok bandit tersebut dan merampas harta senilai ${lootCopper} Copper!`;

                        await TransactionLog.create([{
                            guildId: player.guildId,
                            type: 'ambush_win_loot',
                            description: `[${player.characterName}] menang melawan kelompok bandit (${groupSize} orang). (+${lootCopper} Copper)`,
                            amount: lootCopper,
                            currency: 'copper'
                        }], { session });
                    } else {
                        travel.ambushResult.message = `Kamu berhasil mengalahkan kelompok bandit tersebut!`;
                    }

                    // Quest Hook
                    const { evaluateQuestProgress } = require('../../utils/questProgress');
                    const Quest = require('../../models/Quest');
                    for (const questEntry of player.questLog.filter(q => q.status === 'active')) {
                         const quest = await Quest.findById(questEntry.questId).session(session);
                         if (!quest) continue;

                         const context = { defeatedBandit: true, amount: groupSize };
                         const { updatedProgress, allDone } = await evaluateQuestProgress(player, quest, questEntry, context);

                         if (JSON.stringify(questEntry.objectiveProgress) !== JSON.stringify(updatedProgress)) {
                             questEntry.objectiveProgress = updatedProgress;
                             questEntry.lastTouchedAt = new Date();
                             if (allDone) {
                                 questEntry.status = 'completed';
                                 questEntry.completedAt = new Date();
                             }
                         }
                    }
                } else {
                    won = false;
                    const { getTotalCopper, payCurrency } = require('../../utils/currency');
                    const totalCopperEq = getTotalCopper(player.currency);

                    const lossCopper = Math.floor(totalCopperEq * travelConfig.AMBUSH_LOSS_PERCENT * 1.5);
                    const capCopper = travelConfig.AMBUSH_LOSS_CAP_SILVER_EQ * 150;
                    const finalLossCopper = Math.min(lossCopper, capCopper);

                    if (finalLossCopper > 0) {
                        payCurrency(player.currency, finalLossCopper, 'copper');
                        travel.ambushResult.currencyLost.copper = finalLossCopper;
                        travel.ambushResult.message = `Kamu kalah melawan bandit dan dirampok secara paksa senilai ${Math.floor(finalLossCopper/100)} silver.`;

                        await TransactionLog.create([{
                            guildId: player.guildId,
                            type: 'ambush_loss',
                            description: `[${player.characterName}] kalah melawan bandit dan kehilangan harta senilai ${finalLossCopper} Copper eq.`,
                            amount: finalLossCopper,
                            currency: 'copper'
                        }], { session });

                    } else {
                        travel.ambushResult.message = `Kamu kalah melawan bandit, tapi untungnya mereka tidak menemukan apa-apa.`;
                    }
                }
            }

            travel.ambushResolved = true;
            travel.status = 'arrived';
            player.currentLocation = {
                regionSlug: travel.toLocation.regionSlug,
                settlementName: travel.toLocation.settlementName,
                buildingName: null
            };

            await player.save({ session });
            await travel.save({ session });

            return { travel, currentLocation: player.currentLocation, ambushLogs, won };
        });

        res.json({ success: true, ...result });
    } catch (error) {
        if (error instanceof CustomError) return res.status(error.statusCode).json({ error: error.message });
        console.error('[API-WORLD] Resolve ambush error:', error);
        res.status(500).json({ error: 'Gagal meresolve ambush.' });
    } finally {
        if (typeof releaseLock === 'function') releaseLock();
    }
});

router.get('/climate', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const player = await Player.findOne({ discordId: userId }).populate('inventory.itemId');
        if (!player) return res.status(404).json({ error: 'Karakter tidak ditemukan' });

        const location = player.currentLocation || { regionSlug: 'central_plains', settlementName: 'Desa Xingcun', buildingName: null };
        const regionSlug = location.regionSlug;

        const WeatherConfig = require('../../models/WeatherConfig');
        const weatherConfig = await WeatherConfig.findOne({ configId: 'global' });

        const { getClimatePenalties, getPlayerClimateResistance } = require('../../utils/climate');

        const resistance = await getPlayerClimateResistance(player);

        const penalties = getClimatePenalties(regionSlug, resistance, { weatherConfig });

        let message = '';
        if (penalties.inComfort) {
            message = 'Suhu terasa nyaman.';
            if (penalties.rawTemp < penalties.effectiveTemp) {
                message = 'Suhu nyaman berkat perlengkapan penahan dingin.';
            } else if (penalties.rawTemp > penalties.effectiveTemp) {
                message = 'Suhu nyaman berkat perlengkapan penahan panas.';
            }
        } else {
             message = penalties.reason;
        }

        res.json({
            regionSlug: regionSlug,
            settlementName: location.settlementName,
            temperature: penalties.rawTemp,
            effectiveTemperature: penalties.effectiveTemp,
            comfortMin: 10, // Matching config
            comfortMax: 30, // Matching config
            inComfort: penalties.inComfort,
            weather: weatherConfig ? weatherConfig.currentWeather : 'Cerah',
            resistance: {
                cold: resistance.coldResistance,
                heat: resistance.heatResistance
            },
            penalties: {
                qiRegenMultiplier: penalties.qiRegenMultiplier,
                combatStatMultiplier: penalties.combatStatMultiplier,
                reason: penalties.reason
            },
            message: message
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Gagal memuat status cuaca dan suhu' });
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


// --- NPC and Quests Phase 5 Routes ---

router.get('/npcs', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const player = await Player.findOne({ discordId: userId });
        if (!player) return res.status(404).json({ error: 'Karakter tidak ditemukan' });

        const Npc = require('../../models/Npc');
        const location = player.currentLocation || { regionSlug: 'central_plains', settlementName: 'Desa Xingcun', buildingName: null };

        const npcs = await Npc.find({
            guildId: player.guildId,
            settlementName: location.settlementName,
            buildingName: location.buildingName || null,
            isActive: true
        });

        res.json({ npcs });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Terjadi kesalahan internal.' });
    }
});

router.get('/npc/:npcId', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { npcId } = req.params;

        const player = await Player.findOne({ discordId: userId });
        if (!player) return res.status(404).json({ error: 'Karakter tidak ditemukan' });

        const Npc = require('../../models/Npc');
        const Quest = require('../../models/Quest');
        const { getRealmIndex } = require('../../utils/cultivation');

        const npc = await Npc.findById(npcId).populate('questIds');
        if (!npc || !npc.isActive) return res.status(404).json({ error: 'NPC tidak ditemukan.' });

        const realmIndex = getRealmIndex(player.systemCultivation.realm);
        if (realmIndex < npc.minRealmIndexToTalk) {
            return res.status(403).json({ error: 'Ranah Kultivasi belum mencukupi untuk berbicara dengan NPC ini.' });
        }

        // Filter valid quests
        const validQuests = npc.questIds.filter(quest => {
            if (!quest.isActive) return false;
            if (realmIndex < quest.minRealmIndex) return false;

            // Check prerequisites
            if (quest.requiresQuestKeysCompleted && quest.requiresQuestKeysCompleted.length > 0) {
                 for (const reqKey of quest.requiresQuestKeysCompleted) {
                     const reqQuest = player.questLog.find(q => q.questKey === reqKey && (q.status === 'completed' || q.status === 'claimed'));
                     if (!reqQuest) return false;
                 }
            }

            // Check repeat logic
            const existingQuest = player.questLog.find(q => q.questId.toString() === quest._id.toString());
            if (existingQuest) {
                if (existingQuest.status === 'active') return false; // Already active, shown in quest log
                if (!quest.repeatable && (existingQuest.status === 'completed' || existingQuest.status === 'claimed')) return false; // Already done
                if (quest.repeatable && existingQuest.status === 'claimed') {
                     const cooldownDate = new Date(existingQuest.claimedAt);
                     cooldownDate.setHours(cooldownDate.getHours() + quest.cooldownHours);
                     if (new Date() < cooldownDate) return false; // Still on cooldown
                }
            }

            return true;
        });

        res.json({ npc, availableQuests: validQuests });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Terjadi kesalahan internal.' });
    }
});

router.post('/npc/:npcId/talk', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { npcId } = req.params;
        const { dialogId } = req.body;

        const player = await Player.findOne({ discordId: userId });
        if (!player) return res.status(404).json({ error: 'Karakter tidak ditemukan' });

        const travel = await Travel.findOne({ discordId: userId, status: 'traveling' });
        if (travel && travel.status === 'traveling') {
            return res.status(400).json({ error: 'Tidak bisa berbicara saat dalam perjalanan.' });
        }

        const Npc = require('../../models/Npc');
        const Quest = require('../../models/Quest');
        const { getRealmIndex } = require('../../utils/cultivation');
        const { evaluateQuestProgress } = require('../../utils/questProgress');

        const npc = await Npc.findById(npcId);
        if (!npc || !npc.isActive) return res.status(404).json({ error: 'NPC tidak ditemukan.' });

        const location = player.currentLocation || { settlementName: 'Desa Xingcun', buildingName: null };
        if (npc.settlementName !== location.settlementName || (npc.buildingName || null) !== (location.buildingName || null)) {
            return res.status(400).json({ error: 'Kamu tidak berada di lokasi yang sama dengan NPC ini.' });
        }

        const realmIndex = getRealmIndex(player.systemCultivation.realm);
        if (realmIndex < npc.minRealmIndexToTalk) {
            return res.status(403).json({ error: 'Ranah Kultivasi belum mencukupi.' });
        }

        let dialogResponse = npc.greeting;
        if (dialogId) {
            const line = npc.dialogLines.find(dl => dl.id === dialogId);
            if (line) dialogResponse = line.text;
        }

        // Evaluate quest progress for talk_to_npc
        let updatedQuests = false;
        for (const questEntry of player.questLog.filter(q => q.status === 'active')) {
            const quest = await Quest.findById(questEntry.questId);
            if (!quest) continue;

            const context = { npcIdTalked: npc._id, isTraveling: false };
            const { updatedProgress, allDone } = await evaluateQuestProgress(player, quest, questEntry, context);

            questEntry.objectiveProgress = updatedProgress;
            questEntry.lastTouchedAt = new Date();

            if (allDone) {
                questEntry.status = 'completed';
                questEntry.completedAt = new Date();
            }
            updatedQuests = true;
        }

        if (updatedQuests) {
            await player.save();
        }

        res.json({ message: dialogResponse, dialogResponse, questLog: player.questLog });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Terjadi kesalahan internal.' });
    }
});
