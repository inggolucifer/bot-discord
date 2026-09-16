const { resolveNpcImage, resolveLocationImage, getEmoji } = require('../../utils/imageResolve');
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
const { applyTravelDrain, getCurrentStamina, getMaxStamina } = require('../../utils/stamina');
const staminaConfig = require('../../config/stamina');
const { getRealmIndex } = require('../../utils/cultivation');
const { calculateEnergy } = require('../../utils/energyManager');
const CustomError = require('../utils/CustomError');
const { withTransaction } = require('../utils/dbTransaction');
const { markArrived } = require('../../utils/mapDiscovery');

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
            gridPosition: player.gridPosition,
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
        const userId = req.user.userId;
        const player = await Player.findOne({ discordId: userId });
        const playerRealmIndex = player ? getRealmIndex(player.systemCultivation?.realm || 'Fondasi Fana (Mortal Foundation)') : 0;

        res.json({
            settlements: travelConfig.settlements,
            edges: travelConfig.distancesLi,
            playerRealmIndex: playerRealmIndex
        });
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

        const playerRealmIndex = getRealmIndex(player.systemCultivation?.realm || 'Fondasi Fana (Mortal Foundation)');
        if (targetSettlement.minRealmIndex != null && playerRealmIndex < targetSettlement.minRealmIndex) {
            return res.status(400).json({ error: 'Ranah Kultivasi (Realm) kamu belum cukup untuk memasuki wilayah ini.' });
        }

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

        let sectHomeDiscount = 0;
        if (player.sect && player.sect !== 'Tanpa Sekte (Rogue Cultivator)') {
             const Sect = require('../../models/Sect');
             const playerSect = await Sect.findOne({ name: player.sect, guildId: player.guildId }).lean();
             if (playerSect && playerSect.hallSettlementName === toSettlementName) {
                 sectHomeDiscount = 0.1; // 10% discount for traveling home
             }
        }

        const totalDiscount = Math.min(realmDiscount + horseSpeedBonus + sectHomeDiscount, MAX_TRAVEL_SPEED_DISCOUNT);

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

        let travel = await Travel.findOne({ discordId: userId, status: { $in: ["traveling", "ambushed"] } });

        if (travel) {
            const playerPre = await Player.findOne({ discordId: userId });
            if (playerPre) {
                applyTravelDrain(playerPre, travel);
                if (travel.exhausted && !travel.exhaustPenaltyApplied && travel.status === "traveling") {
                    const nowTime = Date.now();
                    if (nowTime < travel.arrivalTime.getTime()) {
                        const remainingTime = travel.arrivalTime.getTime() - nowTime;
                        const extraTime = remainingTime * (staminaConfig.EXHAUSTED_TRAVEL_TIME_MULTIPLIER - 1);
                        travel.arrivalTime = new Date(travel.arrivalTime.getTime() + extraTime);
                    }
                    travel.exhaustPenaltyApplied = true;
                }
                await travel.save();
                await playerPre.save();
            }
        }

        if (!travel) {
            const playerFallback = await Player.findOne({ discordId: userId });
            if (!playerFallback) return res.json({ travel: null });
            return res.json({ travel: null, currentStamina: getCurrentStamina(playerFallback), maxStamina: getMaxStamina(playerFallback) });
        }

        if (travel.status === 'traveling' && Date.now() >= travel.arrivalTime.getTime()) {
            await withTransaction(async (session) => {
                const player = await Player.findOne({ discordId: userId }).session(session);
                if (!player) throw new CustomError('Karakter tidak ditemukan', 404);

                let isAmbushed = false;
                if (!travel.ambushResolved) {
                    // Phase 6: Ambush logic modified to pending state
                    let ambushChance = 0.15; // default base
                    if (travel.usedEscortLetter) ambushChance *= 0.3;
                    if (travel.exhausted) ambushChance += staminaConfig.EXHAUSTED_AMBUSH_CHANCE_BONUS;

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

                    markArrived(player, travel.toLocation.regionSlug, travel.toLocation.settlementName);

                    await player.save({ session });
                }

                await travel.save({ session });
            });

            // Re-fetch travel to get updated ambush result
            const updatedTravel = await Travel.findById(travel._id);
            const playerAfter = await Player.findOne({ discordId: userId });
            if (!playerAfter) return res.json({ travel: updatedTravel }); return res.json({ travel: updatedTravel, currentLocation: playerAfter.currentLocation, currentStamina: getCurrentStamina(playerAfter), maxStamina: getMaxStamina(playerAfter) });
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

            markArrived(player, travel.toLocation.regionSlug, travel.toLocation.settlementName);

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


// --- Rest System Phase 13 ---

router.post('/rest/start', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { mode, hours } = req.body;

        if (!['tent', 'open'].includes(mode)) {
            return res.status(400).json({ error: 'Mode istirahat tidak valid (tent/open)' });
        }

        if (!hours || isNaN(hours) || hours < staminaConfig.MIN_REST_HOURS || hours > staminaConfig.MAX_REST_HOURS) {
            return res.status(400).json({ error: `Durasi harus antara ${staminaConfig.MIN_REST_HOURS} dan ${staminaConfig.MAX_REST_HOURS} jam` });
        }

        await withTransaction(async (session) => {
            const player = await Player.findOne({ discordId: userId }).populate('inventory.itemId').session(session);
            if (!player) throw new CustomError('Karakter tidak ditemukan', 404);

            const travel = await Travel.findOne({ discordId: userId, status: { $in: ['traveling', 'ambushed'] } }).session(session);
            if (travel) throw new CustomError('Tidak bisa istirahat saat dalam perjalanan', 400);

            if (player.rest && player.rest.status === 'resting') {
                throw new CustomError('Kamu sedang beristirahat', 400);
            }

            let usedTent = false;
            if (mode === 'tent') {
                const tentIndex = player.inventory.findIndex(i => i.itemId && i.itemId.name === staminaConfig.TENT_ITEM_NAME);
                if (tentIndex === -1) {
                    throw new CustomError('Kamu tidak memiliki Tenda Sederhana', 400);
                }

                player.inventory[tentIndex].quantity -= 1;
                if (player.inventory[tentIndex].quantity <= 0) {
                     player.inventory.splice(tentIndex, 1);
                }
                usedTent = true;

                await TransactionLog.create([{
                    guildId: player.guildId,
                    type: 'use_item',
                    description: `[${player.characterName}] memakai 1x Tenda Sederhana`,
                    amount: 0,
                    currency: 'copper'
                }], { session });
            }

            const now = new Date();
            const endsAt = new Date(now.getTime() + (hours * 3600000));

            player.rest = {
                status: 'resting',
                mode: mode,
                startedAt: now,
                endsAt: endsAt,
                lastAppliedAt: now,
                usedTentItem: usedTent
            };

            if (player.currentStamina === null || player.currentStamina === undefined) {
                 player.currentStamina = getMaxStamina(player);
            }

            await player.save({ session });
        });

        const updatedPlayer = await Player.findOne({ discordId: userId });
        res.json({ rest: updatedPlayer.rest, currentStamina: getCurrentStamina(updatedPlayer), maxStamina: getMaxStamina(updatedPlayer) });

    } catch (error) {
        if (error instanceof CustomError) return res.status(error.statusCode).json({ error: error.message });
        console.error(error);
        res.status(500).json({ error: 'Gagal memulai istirahat' });
    }
});

router.get('/rest/status', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const player = await Player.findOne({ discordId: userId });
        if (!player) return res.status(404).json({ error: 'Karakter tidak ditemukan' });

        if (!player.rest || player.rest.status !== 'resting') {
             return res.json({ rest: null, currentStamina: getCurrentStamina(player), maxStamina: getMaxStamina(player) });
        }

        const now = new Date();
        const lastApplied = player.rest.lastAppliedAt ? player.rest.lastAppliedAt.getTime() : player.rest.startedAt.getTime();
        const effectiveEnd = Math.min(now.getTime(), player.rest.endsAt.getTime());

        if (effectiveEnd > lastApplied) {
            const hoursElapsed = (effectiveEnd - lastApplied) / 3600000;

            const isTent = player.rest.mode === 'tent';
            const staminaRate = isTent ? staminaConfig.REST_STAMINA_PER_HOUR_TENT : staminaConfig.REST_STAMINA_PER_HOUR_OPEN;
            const hpRate = isTent ? staminaConfig.REST_HP_PERCENT_PER_HOUR_TENT : staminaConfig.REST_HP_PERCENT_PER_HOUR_OPEN;

            const maxStam = getMaxStamina(player);
            player.currentStamina = Math.min(maxStam, getCurrentStamina(player) + (staminaRate * hoursElapsed));

            if (player.currentHp !== null && player.currentHp !== undefined) {
                const { getComputedStats } = require('../../utils/statCalculator');
                const maxHp = getComputedStats(player).maxHp;
                const hpGain = maxHp * hpRate * hoursElapsed;
                player.currentHp = Math.min(maxHp, Math.floor(player.currentHp + hpGain));
            }

            const ambushChancePerHour = isTent ? staminaConfig.REST_AMBUSH_CHANCE_PER_HOUR_TENT : staminaConfig.REST_AMBUSH_CHANCE_PER_HOUR_OPEN;
            const fullHours = Math.floor(hoursElapsed);
            let ambushed = false;

            for (let i = 0; i < fullHours; i++) {
                 if (Math.random() < ambushChancePerHour) {
                      ambushed = true;
                      break;
                 }
            }

            if (ambushed) {
                 player.rest.status = 'idle';
                 player.rest.mode = null;

                 const { payCurrency } = require('../../utils/currency');
                 const penaltyCopper = 250;
                 if (player.currency.copper >= penaltyCopper) {
                      payCurrency(player.currency, penaltyCopper, 'copper');
                 } else {
                      player.currency.copper = 0;
                 }

                 await TransactionLog.create([{
                      guildId: player.guildId,
                      type: 'ambush_loss',
                      description: `[${player.characterName}] diganggu saat istirahat dan kehilangan sebagian harta.`,
                      amount: penaltyCopper,
                      currency: 'copper'
                 }]);
            } else {
                player.rest.lastAppliedAt = new Date(effectiveEnd);

                if (now.getTime() >= player.rest.endsAt.getTime()) {
                    player.rest.status = 'idle';
                    player.rest.mode = null;
                }
            }

            await player.save();
        }

        res.json({ rest: player.rest.status === 'resting' ? player.rest : null, currentStamina: getCurrentStamina(player), maxStamina: getMaxStamina(player) });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Gagal memuat status istirahat' });
    }
});

router.post('/rest/cancel', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const player = await Player.findOne({ discordId: userId });
        if (!player) return res.status(404).json({ error: 'Karakter tidak ditemukan' });

        if (!player.rest || player.rest.status !== 'resting') {
             return res.status(400).json({ error: 'Kamu tidak sedang istirahat' });
        }

        const now = new Date();
        const lastApplied = player.rest.lastAppliedAt ? player.rest.lastAppliedAt.getTime() : player.rest.startedAt.getTime();
        const effectiveEnd = Math.min(now.getTime(), player.rest.endsAt.getTime());

        if (effectiveEnd > lastApplied) {
            const hoursElapsed = (effectiveEnd - lastApplied) / 3600000;
            const isTent = player.rest.mode === 'tent';
            const staminaRate = isTent ? staminaConfig.REST_STAMINA_PER_HOUR_TENT : staminaConfig.REST_STAMINA_PER_HOUR_OPEN;
            const hpRate = isTent ? staminaConfig.REST_HP_PERCENT_PER_HOUR_TENT : staminaConfig.REST_HP_PERCENT_PER_HOUR_OPEN;

            const maxStam = getMaxStamina(player);
            player.currentStamina = Math.min(maxStam, getCurrentStamina(player) + (staminaRate * hoursElapsed));

            if (player.currentHp !== null && player.currentHp !== undefined) {
                const { getComputedStats } = require('../../utils/statCalculator');
                const maxHp = getComputedStats(player).maxHp;
                const hpGain = maxHp * hpRate * hoursElapsed;
                player.currentHp = Math.min(maxHp, Math.floor(player.currentHp + hpGain));
            }

            const ambushChancePerHour = isTent ? staminaConfig.REST_AMBUSH_CHANCE_PER_HOUR_TENT : staminaConfig.REST_AMBUSH_CHANCE_PER_HOUR_OPEN;
            const fullHours = Math.floor(hoursElapsed);
            let ambushed = false;

            for (let i = 0; i < fullHours; i++) {
                 if (Math.random() < ambushChancePerHour) {
                      ambushed = true;
                      break;
                 }
            }

            if (ambushed) {
                 const { payCurrency } = require('../../utils/currency');
                 const penaltyCopper = 250;
                 if (player.currency.copper >= penaltyCopper) {
                      payCurrency(player.currency, penaltyCopper, 'copper');
                 } else {
                      player.currency.copper = 0;
                 }

                 await TransactionLog.create([{
                      guildId: player.guildId,
                      type: 'ambush_loss',
                      description: `[${player.characterName}] diganggu saat istirahat dan kehilangan sebagian harta.`,
                      amount: penaltyCopper,
                      currency: 'copper'
                 }]);
            }
        }

        player.rest.status = 'idle';
        player.rest.mode = null;
        await player.save();

        res.json({ rest: null, currentStamina: getCurrentStamina(player), maxStamina: getMaxStamina(player) });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Gagal membatalkan istirahat' });
    }
});

module.exports = router;


// Helper validasi kedekatan NPC (Grid Chebyshev <= 2 atau Settlement Legacy)
async function checkNpcProximity(player, npc) {
    if (player.gridPosition?.zoneId) {
        const zoneId = player.gridPosition.zoneId;
        const px = player.gridPosition.tileX || 0;
        const py = player.gridPosition.tileY || 0;

        let npcZone = npc.zoneId;
        let npcX = npc.tileX;
        let npcY = npc.tileY;

        if (npcZone == null || npcX == null || npcY == null) {
            const ZoneTile = require('../../models/ZoneTile');
            const tile = await ZoneTile.findOne({
                guildId: player.guildId,
                zoneId: zoneId,
                tileType: 'npc_spawn',
                $or: [
                    { linkedRefId: npc._id },
                    { label: new RegExp(npc.name, 'i') }
                ]
            });
            if (tile) {
                npcZone = tile.zoneId;
                npcX = tile.tileX;
                npcY = tile.tileY;
            }
        }

        if (npcZone != null && npcX != null && npcY != null) {
            if (npcZone !== zoneId) {
                return { ok: false, error: 'NPC berada di zona yang berbeda.' };
            }
            const dist = Math.max(Math.abs(px - npcX), Math.abs(py - npcY));
            if (dist > 2) {
                return { ok: false, error: `Kamu terlalu jauh dari NPC ini (jarak: ${dist} tile, maksimal: 2 tile).` };
            }
            return { ok: true };
        }
    }

    const location = player.currentLocation || { settlementName: 'Desa Xingcun', buildingName: null };
    if (npc.settlementName !== location.settlementName || (npc.buildingName || null) !== (location.buildingName || null)) {
        return { ok: false, error: 'Kamu tidak berada di lokasi yang sama dengan NPC ini.' };
    }

    return { ok: true };
}

// --- NPC and Quests Phase 5 Routes ---

router.get('/npcs', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const player = await Player.findOne({ discordId: userId });
        if (!player) return res.status(404).json({ error: 'Karakter tidak ditemukan' });

        const Npc = require('../../models/Npc');
        const ZoneTile = require('../../models/ZoneTile');

        let npcs = [];
        if (player.gridPosition?.zoneId) {
            const currentZoneId = player.gridPosition.zoneId;
            const px = player.gridPosition.tileX || 0;
            const py = player.gridPosition.tileY || 0;

            const spawnTiles = await ZoneTile.find({
                guildId: player.guildId,
                zoneId: currentZoneId,
                tileType: 'npc_spawn',
                tileX: { $gte: px - 2, $lte: px + 2 },
                tileY: { $gte: py - 2, $lte: py + 2 }
            });

            const linkedIds = spawnTiles.map(t => t.linkedRefId).filter(Boolean);
            const npcNames = spawnTiles.map(t => t.label).filter(Boolean);

            npcs = await Npc.find({
                guildId: player.guildId,
                isActive: true,
                $or: [
                    { _id: { $in: linkedIds } },
                    { name: { $in: npcNames } },
                    {
                        zoneId: currentZoneId,
                        tileX: { $gte: px - 2, $lte: px + 2 },
                        tileY: { $gte: py - 2, $lte: py + 2 }
                    }
                ]
            });
        }

        if (npcs.length === 0) {
            const location = player.currentLocation || { regionSlug: 'central_plains', settlementName: 'Desa Xingcun', buildingName: null };
            npcs = await Npc.find({
                guildId: player.guildId,
                settlementName: location.settlementName,
                buildingName: location.buildingName || null,
                isActive: true
            });
        }

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

        const proximity = await checkNpcProximity(player, npc);
        if (!proximity.ok) {
            return res.status(400).json({ error: proximity.error });
        }

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

        const proximity = await checkNpcProximity(player, npc);
        if (!proximity.ok) {
            return res.status(400).json({ error: proximity.error });
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

const gridConfig = require('../../config/gridConfig');
const {
    getTileIndex,
    getCoordinatesFromIndex,
    getTilesInRevealRadius,
    revealTilesForPlayer,
    resolvePlayerGridMove
} = require('../../utils/gridManager');

router.get('/zone/:zoneId', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { zoneId } = req.params;

        if (!/^[a-z0-9_-]+$/i.test(zoneId)) {
            return res.status(400).json({ error: 'ID Zona tidak valid.' });
        }

        const player = await Player.findOne({ discordId: userId });
        if (!player) return res.status(404).json({ error: 'Karakter tidak ditemukan' });

        const fs = require('fs');
        const path = require('path');
        const configPath = path.join(__dirname, '../../config/zones', `${zoneId}.js`);
        if (!fs.existsSync(configPath)) {
            return res.status(404).json({ error: 'Zona tidak ditemukan' });
        }

        const zoneConfig = require(configPath);

        // Inisialisasi gridPosition jika belum ada
        if (!player.gridPosition || !player.gridPosition.zoneId) {
            player.gridPosition = {
                zoneId: zoneConfig.zoneId,
                tileX: 0,
                tileY: 0
            };
        }

        // Resolusi pergerakan lazy timestamp
        const moveStatus = resolvePlayerGridMove(player, zoneConfig);
        let encounterResult = null;

        if (moveStatus && moveStatus.justArrived) {
            const ZoneTile = require('../../models/ZoneTile');
            const destTile = await ZoneTile.findOne({
                guildId: player.guildId,
                zoneId: zoneId,
                tileX: player.gridPosition.tileX,
                tileY: player.gridPosition.tileY
            });
            const isHazard = Boolean(destTile && destTile.tileType === 'hazard');
            const { checkAndRunGridEncounter } = require('../../utils/gridCombat');
            encounterResult = checkAndRunGridEncounter(player, zoneConfig, isHazard);
        }

        // Pastikan ada initial reveal jika baru pertama kali memasuki zona ini
        const exploredEntry = (player.exploredTiles || []).find(e => e.zoneId === zoneId);
        if (!exploredEntry || !exploredEntry.tileIndexes || exploredEntry.tileIndexes.length === 0) {
            revealTilesForPlayer(
                player,
                zoneId,
                player.gridPosition.tileX || 0,
                player.gridPosition.tileY || 0,
                gridConfig.DEFAULT_REVEAL_RADIUS,
                zoneConfig.gridWidth,
                zoneConfig.gridHeight
            );
        }

        await player.save();

        const ZoneTile = require('../../models/ZoneTile');
        const allTiles = await ZoneTile.find({ guildId: player.guildId, zoneId: zoneId });

        // Auto-resolusi konstruksi yang telah rampung agar langsung terlihat semua pemain
        const nowMs = Date.now();
        for (const t of allTiles) {
            if (t.isUnderConstruction && t.constructionCompleteAt && nowMs >= new Date(t.constructionCompleteAt).getTime()) {
                t.isUnderConstruction = false;
                t.isOccupied = true;
                t.label = `${t.buildingName} (${t.ownerName || 'Pemain'})`;
                await t.save();
            }
        }

        // Filter tile hidden: hanya tampil jika sudah pernah ditemukan pemain via aksi 'Cari Sekitar'
        // Filter tile public visibility: hanya tampil jika isPubliclyVisible !== false
        const discoveredIds = new Set(player.discoveredSecretTileIds || []);
        const visibleTiles = allTiles.filter(tile => {
            if (tile.isPubliclyVisible === false) return false;
            return !tile.hidden || discoveredIds.has(tile._id.toString());
        });

        res.json({
            success: true,
            config: zoneConfig,
            tiles: visibleTiles,
            playerGrid: {
                position: player.gridPosition,
                move: player.gridMove,
                moveStatus: moveStatus,
                encounter: encounterResult,
                exploredTileIndexes: (player.exploredTiles?.find(e => e.zoneId === zoneId)?.tileIndexes) || [],
                lastGridSearchAt: player.lastGridSearchAt || null,
                searchCooldownSeconds: gridConfig.SEARCH_COOLDOWN_SECONDS,
                searchRadius: gridConfig.SEARCH_RADIUS
            }
        });
    } catch (error) {
        console.error('[API-ZONE] Error fetching zone:', error);
        res.status(500).json({ error: 'Gagal memuat data zona' });
    }
});

router.post('/zone/move', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { tileX, tileY, initiateTravel } = req.body;

        const player = await Player.findOne({ discordId: userId });
        if (!player) return res.status(404).json({ error: 'Karakter tidak ditemukan' });

        // Cek apakah pemain sedang dalam perjalanan jarak jauh
        const activeTravel = await Travel.findOne({
            discordId: userId,
            status: { $in: ['traveling', 'ambushed'] }
        });
        if (activeTravel) {
            return res.status(400).json({ error: 'Kamu sedang dalam perjalanan jauh (Travel) dan tidak dapat bergerak di grid!' });
        }

        const currentZoneId = player.gridPosition?.zoneId || 'central_plains_bamboo_forest';

        const fs = require('fs');
        const path = require('path');
        const configPath = path.join(__dirname, '../../config/zones', `${currentZoneId}.js`);
        if (!fs.existsSync(configPath)) {
            return res.status(404).json({ error: 'Konfigurasi zona aktif tidak ditemukan' });
        }
        const zoneConfig = require(configPath);

        // Resolusi lazy pergerakan sebelumnya bila sudah selesai
        resolvePlayerGridMove(player, zoneConfig);

        // Cek apakah masih dalam proses pergerakan
        if (player.gridMove && player.gridMove.moveArrivesAt) {
            const now = Date.now();
            const arrives = new Date(player.gridMove.moveArrivesAt).getTime();
            if (now < arrives) {
                const remaining = Math.max(1, Math.ceil((arrives - now) / 1000));
                return res.status(400).json({
                    error: `Kamu sedang melangkah. Harap tunggu ${remaining} detik lagi.`,
                    gridMove: player.gridMove,
                    remainingSeconds: remaining
                });
            }
        }

        const targetX = parseInt(tileX);
        const targetY = parseInt(tileY);

        if (isNaN(targetX) || isNaN(targetY)) {
            return res.status(400).json({ error: 'Koordinat tileX dan tileY harus berupa angka.' });
        }

        // Validasi batas peta
        if (targetX < 0 || targetX >= zoneConfig.gridWidth || targetY < 0 || targetY >= zoneConfig.gridHeight) {
            return res.status(400).json({
                error: `Tujuan berada di luar batas zona (${zoneConfig.gridWidth}x${zoneConfig.gridHeight})!`
            });
        }

        const currentX = player.gridPosition?.tileX ?? 0;
        const currentY = player.gridPosition?.tileY ?? 0;

        const dx = Math.abs(targetX - currentX);
        const dy = Math.abs(targetY - currentY);
        const distance = Math.max(dx, dy); // Chebyshev distance

        if (distance === 0) {
            return res.status(400).json({ error: 'Kamu sudah berada di posisi tersebut.' });
        }

        if (distance > gridConfig.MAX_MOVE_PER_ACTION) {
            return res.status(400).json({
                error: `Jarak langkah terlalu jauh! Maksimal pergerakan sekali jalan adalah ${gridConfig.MAX_MOVE_PER_ACTION} tile (kamu mencoba melangkah ${distance} tile).`
            });
        }

        // Blueprint: Validasi Obstruksi Medan & Konsumsi Stamina
        const { calculateEnergyCost, calculateTravelSpeed, isTileObstructed } = require('../../utils/explorationMath');
        const ZoneTile = require('../../models/ZoneTile');
        const destTile = await ZoneTile.findOne({
            guildId: player.guildId,
            zoneId: currentZoneId,
            tileX: targetX,
            tileY: targetY
        });

        const targetTerrain = destTile?.terrainType || 'plains';
        if (isTileObstructed({ terrainType: targetTerrain, mountType: player.equippedMount })) {
            return res.status(400).json({
                error: `Jalur terhalang rintangan tebing batu yang mustahil ditembus! Dibutuhkan artefak terbang spiritual.`
            });
        }

        const staminaCost = calculateEnergyCost({
            terrainType: targetTerrain,
            currentWeight: player.inventory?.length || 10,
            maxWeight: player.baseCarryCapacity || 50,
            mountType: player.equippedMount,
            bodyTemperingLevel: player.bodyTemperingLevel || 0
        });

        if (player.currentStamina !== null && player.currentStamina !== undefined && player.currentStamina < staminaCost) {
            return res.status(400).json({
                error: `Tenaga fisikmu habis! Membutuhkan ${staminaCost} Stamina untuk melangkah ke medan ini.`
            });
        }
        if (player.currentStamina !== null && player.currentStamina !== undefined) {
            player.currentStamina = Math.max(0, player.currentStamina - staminaCost);
        }

        // Cek apakah tujuan adalah travelGateTiles (pemicu Travel JARAK JAUH)
        const travelGate = (zoneConfig.travelGateTiles || []).find(g => g.tileX === targetX && g.tileY === targetY);
        if (travelGate) {
            if (initiateTravel) {
                // Alihkan ke alur Travel jarak jauh yang sudah ada
                return res.json({
                    success: true,
                    isTravelGate: true,
                    leadsToSettlement: travelGate.leadsToSettlement,
                    message: `Memasuki gerbang perjalanan menuju ${travelGate.leadsToSettlement}.`
                });
            }
        }

        // Hitung durasi pergerakan dinamis berdasarkan tunggangan & medan
        const tileSpeedMs = calculateTravelSpeed({ terrainType: targetTerrain, mountType: player.equippedMount });
        const totalDurationMs = Math.max(1000, distance * tileSpeedMs);
        const durationSeconds = Math.ceil(totalDurationMs / 1000);

        const startedAt = new Date();
        const arrivesAt = new Date(startedAt.getTime() + totalDurationMs);

        player.gridMove = {
            targetX: targetX,
            targetY: targetY,
            targetZoneId: currentZoneId,
            moveStartedAt: startedAt,
            moveArrivesAt: arrivesAt
        };

        await player.save();

        res.json({
            success: true,
            message: `Mulai melangkah ke (${targetX}, ${targetY})...`,
            gridMove: player.gridMove,
            durationSeconds,
            isTravelGate: Boolean(travelGate),
            travelGateInfo: travelGate || null,
            playerGrid: {
                position: player.gridPosition,
                move: player.gridMove,
                exploredTileIndexes: (player.exploredTiles?.find(e => e.zoneId === currentZoneId)?.tileIndexes) || [],
                lastGridSearchAt: player.lastGridSearchAt || null,
                searchCooldownSeconds: gridConfig.SEARCH_COOLDOWN_SECONDS,
                searchRadius: gridConfig.SEARCH_RADIUS
            }
        });
    } catch (error) {
        console.error('[API-ZONE-MOVE] Error in move:', error);
        res.status(500).json({ error: 'Gagal melakukan pergerakan grid' });
    }
});

router.post('/zone/resolve-move', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const player = await Player.findOne({ discordId: userId });
        if (!player) return res.status(404).json({ error: 'Karakter tidak ditemukan' });

        const currentZoneId = player.gridPosition?.zoneId || 'central_plains_bamboo_forest';
        const fs = require('fs');
        const path = require('path');
        const configPath = path.join(__dirname, '../../config/zones', `${currentZoneId}.js`);
        if (!fs.existsSync(configPath)) {
            return res.status(404).json({ error: 'Zona tidak ditemukan' });
        }
        const zoneConfig = require(configPath);

        const status = resolvePlayerGridMove(player, zoneConfig);
        let encounterResult = null;

        let thermalReport = null;
        if (status && status.justArrived) {
            const ZoneTile = require('../../models/ZoneTile');
            const destTile = await ZoneTile.findOne({
                guildId: player.guildId,
                zoneId: currentZoneId,
                tileX: player.gridPosition.tileX,
                tileY: player.gridPosition.tileY
            });
            const isHazard = Boolean(destTile && destTile.tileType === 'hazard');

            // 1. Ambush Evaluation
            const { evaluateAmbush } = require('../../utils/explorationMath');
            const ambushEval = evaluateAmbush({
                terrainType: destTile?.terrainType || 'plains',
                stealthRating: (player.kungfuSkills?.qinggong || 0) * 0.01,
                mountType: player.equippedMount,
                dangerLevel: zoneConfig?.ambientDangerTier || 1.0
            });

            if (ambushEval.triggered || isHazard) {
                const { checkAndRunGridEncounter } = require('../../utils/gridCombat');
                encounterResult = checkAndRunGridEncounter(player, zoneConfig, isHazard);
            }

            // 2. Blueprint: Termodinamika Lingkungan & Fisiologi Karakter
            const { calculateGridTemperature, evaluateThermalBreach } = require('../../utils/thermodynamicsEngine');
            const currentHour = new Date().getHours();
            const gridTemp = calculateGridTemperature({
                baseTemperature: destTile?.baseTemperature || 20,
                season: 'spring',
                hourOfDay: currentHour,
                weather: 'clear',
                spiritualVeinTier: destTile?.spiritualQiDensity ? Math.floor(destTile.spiritualQiDensity / 10) : 0
            });

            if (!player.thermalState) {
                player.thermalState = { consecutiveBreachTicks: 0, hasMeridianDamage: false };
            }

            const thermalResult = evaluateThermalBreach({
                envTemperature: gridTemp,
                cultivationRealm: player.systemCultivation?.realm || 'mortal',
                hpMax: player.playerStats?.baseHp || 100,
                thermalResistanceRatio: 0.1,
                consecutiveBreachTicks: player.thermalState.consecutiveBreachTicks || 0
            });

            player.thermalState.consecutiveBreachTicks = thermalResult.consecutiveBreachTicks;
            if (thermalResult.hasMeridianDamage) {
                player.thermalState.hasMeridianDamage = true;
            }
            if (thermalResult.hpLoss > 0 && player.currentHp !== null && player.currentHp !== undefined) {
                player.currentHp = Math.max(1, player.currentHp - thermalResult.hpLoss);
            }

            thermalReport = {
                gridTemperature: gridTemp,
                inComfortZone: thermalResult.inComfortZone,
                breachType: thermalResult.breachType,
                activeCondition: thermalResult.activeCondition,
                hpLoss: thermalResult.hpLoss,
                hasMeridianDamage: player.thermalState.hasMeridianDamage,
                realmLimits: thermalResult.realmLimits
            };
        }

        await player.save();

        res.json({
            success: true,
            status,
            gridPosition: player.gridPosition,
            gridMove: player.gridMove,
            encounter: encounterResult,
            thermalStatus: thermalReport,
            exploredTileIndexes: (player.exploredTiles?.find(e => e.zoneId === currentZoneId)?.tileIndexes) || [],
            playerGrid: {
                position: player.gridPosition,
                move: player.gridMove,
                moveStatus: status,
                encounter: encounterResult,
                exploredTileIndexes: (player.exploredTiles?.find(e => e.zoneId === currentZoneId)?.tileIndexes) || [],
                lastGridSearchAt: player.lastGridSearchAt || null,
                searchCooldownSeconds: gridConfig.SEARCH_COOLDOWN_SECONDS,
                searchRadius: gridConfig.SEARCH_RADIUS
            }
        });
    } catch (error) {
        console.error('[API-ZONE-RESOLVE] Error resolving move:', error);
        res.status(500).json({ error: 'Gagal meresolusi pergerakan' });
    }
});

router.post('/zone/search', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const player = await Player.findOne({ discordId: userId });
        if (!player) return res.status(404).json({ error: 'Karakter tidak ditemukan' });

        const currentZoneId = player.gridPosition?.zoneId || 'central_plains_bamboo_forest';
        const fs = require('fs');
        const path = require('path');
        const configPath = path.join(__dirname, '../../config/zones', `${currentZoneId}.js`);
        if (!fs.existsSync(configPath)) {
            return res.status(404).json({ error: 'Zona tidak ditemukan' });
        }
        const zoneConfig = require(configPath);

        // Resolusi pergerakan lazy terlebih dahulu
        resolvePlayerGridMove(player, zoneConfig);

        // Cek jika sedang bergerak
        if (player.gridMove && player.gridMove.moveArrivesAt) {
            const now = Date.now();
            const arrives = new Date(player.gridMove.moveArrivesAt).getTime();
            if (now < arrives) {
                return res.status(400).json({ error: 'Kamu tidak bisa melakukan pencarian saat sedang bergerak melangkah!' });
            }
        }

        // Cek Cooldown pencarian
        const now = Date.now();
        if (player.lastGridSearchAt) {
            const lastSearchTime = new Date(player.lastGridSearchAt).getTime();
            const elapsedSeconds = Math.floor((now - lastSearchTime) / 1000);
            if (elapsedSeconds < gridConfig.SEARCH_COOLDOWN_SECONDS) {
                const waitSeconds = gridConfig.SEARCH_COOLDOWN_SECONDS - elapsedSeconds;
                return res.status(429).json({
                    error: `Tenangkan inderamu sejenak. Kamu baru bisa mencari sekitar lagi dalam ${waitSeconds} detik.`,
                    cooldownSeconds: waitSeconds
                });
            }
        }

        const playerX = player.gridPosition?.tileX ?? 0;
        const playerY = player.gridPosition?.tileY ?? 0;

        const ZoneTile = require('../../models/ZoneTile');
        // Cari tile tersembunyi di zona ini
        const hiddenTiles = await ZoneTile.find({
            guildId: player.guildId,
            zoneId: currentZoneId,
            hidden: true
        });

        // Filter tile dalam radius pencarian (Chebyshev distance <= SEARCH_RADIUS)
        const discoveredNow = [];
        if (!player.discoveredSecretTileIds) {
            player.discoveredSecretTileIds = [];
        }

        for (const tile of hiddenTiles) {
            const dist = Math.max(Math.abs(tile.tileX - playerX), Math.abs(tile.tileY - playerY));
            if (dist <= gridConfig.SEARCH_RADIUS) {
                const tileIdStr = tile._id.toString();
                if (!player.discoveredSecretTileIds.includes(tileIdStr)) {
                    player.discoveredSecretTileIds.push(tileIdStr);
                    discoveredNow.push(tile);
                }
            }
        }

        player.lastGridSearchAt = new Date();
        await player.save();

        const allTiles = await ZoneTile.find({ guildId: player.guildId, zoneId: currentZoneId });
        const discoveredIds = new Set(player.discoveredSecretTileIds || []);
        const visibleTiles = allTiles.filter(tile => {
            if (tile.isPubliclyVisible === false) return false;
            return !tile.hidden || discoveredIds.has(tile._id.toString());
        });

        const playerGridData = {
            position: player.gridPosition,
            move: player.gridMove,
            exploredTileIndexes: (player.exploredTiles?.find(e => e.zoneId === currentZoneId)?.tileIndexes) || [],
            lastGridSearchAt: player.lastGridSearchAt || null,
            searchCooldownSeconds: gridConfig.SEARCH_COOLDOWN_SECONDS,
            searchRadius: gridConfig.SEARCH_RADIUS
        };

        if (discoveredNow.length > 0) {
            return res.json({
                success: true,
                found: true,
                message: `Inderamu yang tajam menangkap sesuatu yang tersembunyi di sekitar! (${discoveredNow.length} rahasia terungkap)`,
                discoveredTiles: discoveredNow,
                allDiscoveredSecretIds: player.discoveredSecretTileIds,
                tiles: visibleTiles,
                playerGrid: playerGridData
            });
        }

        res.json({
            success: true,
            found: false,
            message: 'Kamu menyisir dan memeriksa sekeliling dengan cermat, namun tidak menemukan kejanggalan atau rahasia apapun di sini.',
            discoveredTiles: [],
            tiles: visibleTiles,
            playerGrid: playerGridData
        });
    } catch (error) {
        console.error('[API-ZONE-SEARCH] Error searching zone:', error);
        res.status(500).json({ error: 'Gagal melakukan pencarian di zona' });
    }
});

router.post('/zone/buy-plot', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { tileX, tileY } = req.body;

        const player = await Player.findOne({ discordId: userId });
        if (!player) return res.status(404).json({ error: 'Karakter tidak ditemukan' });

        const currentZoneId = player.gridPosition?.zoneId || 'central_plains_bamboo_forest';
        const fs = require('fs');
        const path = require('path');
        const configPath = path.join(__dirname, '../../config/zones', `${currentZoneId}.js`);
        if (!fs.existsSync(configPath)) {
            return res.status(404).json({ error: 'Zona tidak ditemukan' });
        }
        const zoneConfig = require(configPath);

        // Validasi batasan zona yang diizinkan untuk pembangunan (G5.3)
        if (!zoneConfig.buildableAllowed) {
            return res.status(400).json({ error: 'Wilayah/zona ini tidak mengizinkan pembelian tanah dan pembangunan!' });
        }

        const targetX = parseInt(tileX);
        const targetY = parseInt(tileY);
        if (isNaN(targetX) || isNaN(targetY)) {
            return res.status(400).json({ error: 'Koordinat tileX dan tileY tidak valid' });
        }

        // Cek kedekatan fisik (pemain harus berdiri berdekatan dengan plot, radius 1 tile)
        const currentX = player.gridPosition?.tileX ?? 0;
        const currentY = player.gridPosition?.tileY ?? 0;
        const dist = Math.max(Math.abs(targetX - currentX), Math.abs(targetY - currentY));
        if (dist > 1) {
            return res.status(400).json({ error: 'Kamu harus berdiri di dekat plot tanah tersebut untuk membelinya!' });
        }

        const ZoneTile = require('../../models/ZoneTile');
        let tile = await ZoneTile.findOne({
            guildId: player.guildId,
            zoneId: currentZoneId,
            tileX: targetX,
            tileY: targetY
        });

        if (!tile || tile.tileType !== 'buildable_plot') {
            return res.status(400).json({ error: 'Tile ini bukan plot tanah yang dapat dibeli (bukan buildable_plot).' });
        }

        if (tile.isOccupied || tile.ownerId) {
            return res.status(400).json({ error: `Plot tanah ini sudah menjadi milik ${tile.ownerName || 'pemain lain'}!` });
        }

        const priceSilver = tile.plotPriceSilver || (gridConfig.BASE_PLOT_PRICE_SILVER * (zoneConfig.ambientDangerTier || 1));
        const { payCurrency } = require('../../utils/currency');

        if (!payCurrency(player.currency, priceSilver, 'silver')) {
            return res.status(400).json({ error: `Dana tidak mencukupi. Diperlukan setara ${priceSilver} Silver untuk membeli tanah ini.` });
        }

        tile.ownerType = 'player';
        tile.ownerId = player.discordId;
        tile.ownerName = player.characterName;
        tile.plotPriceSilver = priceSilver;
        tile.isOccupied = true;
        tile.label = `Lahan Milik ${player.characterName}`;
        await tile.save();
        await player.save();

        res.json({
            success: true,
            message: `Selamat! Kamu telah resmi membeli plot tanah di (${targetX}, ${targetY}) seharga ${priceSilver} Silver.`,
            tile
        });
    } catch (error) {
        console.error('[API-BUY-PLOT] Error:', error);
        res.status(500).json({ error: 'Gagal membeli plot tanah' });
    }
});

router.post('/zone/build', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { tileX, tileY, assetBlueprintId, assetName, isOpenToPublic } = req.body;

        const player = await Player.findOne({ discordId: userId });
        if (!player) return res.status(404).json({ error: 'Karakter tidak ditemukan' });

        const currentZoneId = player.gridPosition?.zoneId || 'central_plains_bamboo_forest';
        const targetX = parseInt(tileX);
        const targetY = parseInt(tileY);

        const ZoneTile = require('../../models/ZoneTile');
        const tile = await ZoneTile.findOne({
            guildId: player.guildId,
            zoneId: currentZoneId,
            tileX: targetX,
            tileY: targetY
        });

        if (!tile || tile.tileType !== 'buildable_plot') {
            return res.status(400).json({ error: 'Tile bukan plot pembangunan yang valid.' });
        }

        if (tile.ownerId !== player.discordId) {
            return res.status(403).json({ error: 'Kamu bukan pemilik sah dari plot tanah ini!' });
        }

        if (tile.buildingName && !tile.isUnderConstruction) {
            return res.status(400).json({ error: `Sudah berdiri bangunan ${tile.buildingName} di plot ini!` });
        }

        const Asset = require('../../models/Asset');
        let assetDoc = null;
        if (assetBlueprintId) {
            assetDoc = await Asset.findById(assetBlueprintId);
        }
        if (!assetDoc && assetName) {
            assetDoc = await Asset.findOne({ guildId: player.guildId, name: assetName }) || await Asset.findOne({ name: assetName });
        }

        const buildingName = assetDoc?.name || assetName || 'Kediaman Kultivator';
        const buildingImageUrl = assetDoc?.imageUrl || null;
        const buildingType = assetDoc?.buildingType || 'residence';
        const constructionMinutes = Math.max(1, (assetDoc?.constructionTimeHours || 1) * 2);
        const completeAt = new Date(Date.now() + constructionMinutes * 60 * 1000);

        tile.buildingName = buildingName;
        tile.buildingImageUrl = buildingImageUrl;
        tile.buildingType = buildingType;
        tile.linkedRefId = assetDoc?._id || null;
        tile.isUnderConstruction = true;
        tile.constructionCompleteAt = completeAt;
        tile.isOpenToPublic = isOpenToPublic !== undefined ? Boolean(isOpenToPublic) : true;
        tile.label = `[Sedang Dibangun] ${buildingName} (${player.characterName})`;
        await tile.save();

        if (!player.assets) player.assets = [];
        player.assets.push({
            assetId: assetDoc?._id || new (require('mongoose').Types.ObjectId)(),
            quantity: 1,
            status: 'building',
            constructionCompleteAt: completeAt,
            placement: { zoneId: currentZoneId, tileX: targetX, tileY: targetY },
            isOpenToPublic: tile.isOpenToPublic,
            isPubliclyVisible: true
        });
        await player.save();

        res.json({
            success: true,
            message: `Konstruksi ${buildingName} dimulai! Status sedang dibangun kini dapat dilihat oleh seluruh pemain yang melewati zona ini.`,
            tile
        });
    } catch (error) {
        console.error('[API-BUILD] Error:', error);
        res.status(500).json({ error: 'Gagal memulai pembangunan' });
    }
});

router.post('/zone/enter-building', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { tileX, tileY } = req.body;

        const player = await Player.findOne({ discordId: userId });
        if (!player) return res.status(404).json({ error: 'Karakter tidak ditemukan' });

        const currentZoneId = player.gridPosition?.zoneId || 'central_plains_bamboo_forest';
        const targetX = parseInt(tileX);
        const targetY = parseInt(tileY);

        const currentX = player.gridPosition?.tileX ?? 0;
        const currentY = player.gridPosition?.tileY ?? 0;
        const dist = Math.max(Math.abs(targetX - currentX), Math.abs(targetY - currentY));
        if (dist > 1) {
            return res.status(400).json({ error: 'Kamu harus berdiri di dekat bangunan untuk memasukinya!' });
        }

        const ZoneTile = require('../../models/ZoneTile');
        const tile = await ZoneTile.findOne({
            guildId: player.guildId,
            zoneId: currentZoneId,
            tileX: targetX,
            tileY: targetY
        });

        if (!tile || !tile.buildingName) {
            return res.status(400).json({ error: 'Tidak ada bangunan di koordinat ini.' });
        }

        // Resolusi status pembangunan jika waktu sudah selesai
        if (tile.isUnderConstruction) {
            if (Date.now() >= new Date(tile.constructionCompleteAt).getTime()) {
                tile.isUnderConstruction = false;
                tile.isOccupied = true;
                tile.label = `${tile.buildingName} (${tile.ownerName || 'Pemain'})`;
                await tile.save();
            } else {
                const remainingMinutes = Math.max(1, Math.ceil((new Date(tile.constructionCompleteAt).getTime() - Date.now()) / 60000));
                return res.status(400).json({
                    error: `Bangunan ${tile.buildingName} masih dalam proses konstruksi (selesai dalam ~${remainingMinutes} menit). Belum bisa dimasuki!`
                });
            }
        }

        // Cek izin akses publik
        if (!tile.isOpenToPublic && tile.ownerId !== player.discordId) {
            return res.status(403).json({
                error: `Pintu ${tile.buildingName} terkunci rapat. Pemiliknya (${tile.ownerName}) tidak mengizinkan orang luar masuk!`
            });
        }

        if (!player.currentLocation) player.currentLocation = {};
        player.currentLocation.buildingName = tile.buildingName;
        await player.save();

        res.json({
            success: true,
            message: `Kamu melangkah masuk ke dalam ${tile.buildingName} milik ${tile.ownerName}.`,
            building: {
                name: tile.buildingName,
                ownerName: tile.ownerName,
                imageUrl: tile.buildingImageUrl,
                type: tile.buildingType,
                isOpenToPublic: tile.isOpenToPublic
            }
        });
    } catch (error) {
        console.error('[API-ENTER-BUILDING] Error:', error);
        res.status(500).json({ error: 'Gagal memasuki bangunan' });
    }
});

router.post('/zone/gather', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { tileX, tileY, zoneId } = req.body;

        if (tileX == null || tileY == null || !zoneId) {
            return res.status(400).json({ error: 'Koordinat atau zoneId tidak lengkap.' });
        }

        const LockManager = require('../utils/lockManager');
        const lockKey = `gather_${userId}`;
        const releaseLock = await LockManager.acquire(lockKey);
        if (!releaseLock) return res.status(429).json({ error: 'Permintaan sedang diproses.' });

        try {
            const player = await Player.findOne({ discordId: userId }).populate('inventory.itemId');
            if (!player) return res.status(404).json({ error: 'Karakter tidak ditemukan' });

            const targetX = parseInt(tileX, 10);
            const targetY = parseInt(tileY, 10);
            const currentX = player.gridPosition?.tileX ?? 0;
            const currentY = player.gridPosition?.tileY ?? 0;
            const dist = Math.max(Math.abs(currentX - targetX), Math.abs(currentY - targetY));

            if (player.gridPosition?.zoneId !== zoneId || dist > 1) {
                return res.status(400).json({ error: 'Kamu terlalu jauh dari sumber daya tersebut (maksimal 1 tile).' });
            }

            const ZoneTile = require('../../models/ZoneTile');
            const tile = await ZoneTile.findOne({
                guildId: player.guildId,
                zoneId: zoneId,
                tileX: targetX,
                tileY: targetY
            });

            if (!tile || tile.tileType !== 'resource_node') {
                return res.status(400).json({ error: 'Tidak ada sumber daya yang bisa dikumpulkan di sini.' });
            }

            if (tile.nodeRespawnAt && Date.now() < new Date(tile.nodeRespawnAt).getTime()) {
                const remainingMinutes = Math.ceil((new Date(tile.nodeRespawnAt).getTime() - Date.now()) / 60000);
                return res.status(400).json({ error: `Sumber daya ini sedang habis. Tunggu ${remainingMinutes} menit lagi.` });
            }

            const Item = require('../../models/Item');
            
            let itemName = 'Kayu Biasa';
            let expType = 'woodcutting';
            
            if (tile.resourceType === 'ore') {
                itemName = 'Bijih Besi';
                expType = 'mining';
            } else if (tile.resourceType === 'herb') {
                itemName = 'Herbal Dasar';
                expType = 'alchemy';
            } else if (tile.label && tile.label.toLowerCase().includes('bambu')) {
                itemName = 'Bambu'; // Fallback for the bambu trees
                expType = 'woodcutting';
            }

            let itemDoc = await Item.findOne({ name: { $regex: new RegExp(itemName, 'i') } });
            
            if (!itemDoc) {
                // Try finding any material
                itemDoc = await Item.findOne({ type: 'material' });
            }
            
            if (!itemDoc) {
                itemDoc = await Item.create({
                    name: itemName,
                    type: 'material',
                    rarity: 'common',
                    description: `Bahan baku ${itemName} yang diperoleh dari alam.`,
                    value: 5,
                    maxStack: 99
                });
            }

            const gatherQty = Math.floor(Math.random() * 3) + 1; // 1 to 3 items
            const invCheck = await canAddToInventory(player, [{ itemDoc: itemDoc, quantity: gatherQty }]);
            if (!invCheck.ok) {
                return res.status(400).json({ error: `Inventory penuh atau berat melebihi kapasitas. (${invCheck.reason})` });
            }

            const existing = player.inventory.find(i => i.itemId._id.toString() === itemDoc._id.toString());
            if (existing) {
                existing.quantity += gatherQty;
            } else {
                player.inventory.push({ itemId: itemDoc._id, quantity: gatherQty });
            }

            // Award EXP
            const expGain = 10;
            if (!player.professions) player.professions = {};
            if (!player.professions[expType]) player.professions[expType] = { level: 1, exp: 0, isUnlocked: true };
            player.professions[expType].isUnlocked = true;
            player.professions[expType].exp += expGain;
            
            // Simple level up logic for profession
            let reqExp = player.professions[expType].level * 100;
            while (player.professions[expType].exp >= reqExp) {
                player.professions[expType].exp -= reqExp;
                player.professions[expType].level += 1;
                reqExp = player.professions[expType].level * 100;
            }

            // Set Cooldown (e.g. 15 minutes)
            tile.nodeRespawnAt = new Date(Date.now() + 15 * 60000);
            
            player.markModified('professions');
            player.markModified('inventory');
            await tile.save();
            await player.save();

            res.json({
                success: true,
                message: `Berhasil mengumpulkan ${gatherQty}x ${itemDoc.name}! (+${expGain} EXP ${expType})`,
                itemGathered: {
                    name: itemDoc.name,
                    quantity: gatherQty
                },
                profession: {
                    type: expType,
                    level: player.professions[expType].level,
                    exp: player.professions[expType].exp
                },
                nodeRespawnAt: tile.nodeRespawnAt,
                playerGrid: {
                    position: player.gridPosition,
                    move: player.gridMove,
                    exploredTileIndexes: (player.exploredTiles?.find(e => e.zoneId === zoneId)?.tileIndexes) || [],
                    lastGridSearchAt: player.lastGridSearchAt || null,
                    searchCooldownSeconds: gridConfig.SEARCH_COOLDOWN_SECONDS,
                    searchRadius: gridConfig.SEARCH_RADIUS
                }
            });

        } finally {
            if (typeof releaseLock === 'function') releaseLock();
        }
    } catch (error) {
        console.error('[API-WORLD-GATHER] Error:', error);
        res.status(500).json({ error: 'Gagal mengumpulkan sumber daya.' });
    }
});

// ==========================================
// BLUEPRINT: SISTEM PROPERTI & INTERIOR 12x12
// ==========================================

router.get('/zone/thermal-status', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const player = await Player.findOne({ discordId: userId });
        if (!player) return res.status(404).json({ error: 'Karakter tidak ditemukan' });

        const currentZoneId = player.gridPosition?.zoneId || 'central_plains_bamboo_forest';
        const ZoneTile = require('../../models/ZoneTile');
        const tile = await ZoneTile.findOne({
            guildId: player.guildId,
            zoneId: currentZoneId,
            tileX: player.gridPosition?.tileX ?? 0,
            tileY: player.gridPosition?.tileY ?? 0
        });

        const { calculateGridTemperature, evaluateThermalBreach, resolveRealmTolerance } = require('../../utils/thermodynamicsEngine');
        const currentHour = new Date().getHours();
        const gridTemp = calculateGridTemperature({
            baseTemperature: tile?.baseTemperature || 20,
            season: 'spring',
            hourOfDay: currentHour,
            weather: 'clear',
            spiritualVeinTier: tile?.spiritualQiDensity ? Math.floor(tile.spiritualQiDensity / 10) : 0
        });

        const realmLimits = resolveRealmTolerance(player.systemCultivation?.realm || 'mortal');
        const thermalResult = evaluateThermalBreach({
            envTemperature: gridTemp,
            cultivationRealm: player.systemCultivation?.realm || 'mortal',
            hpMax: player.playerStats?.baseHp || 100,
            thermalResistanceRatio: 0.1,
            consecutiveBreachTicks: player.thermalState?.consecutiveBreachTicks || 0
        });

        res.json({
            success: true,
            gridTemperature: gridTemp,
            realm: player.systemCultivation?.realm || 'mortal',
            realmLimits: {
                minTemp: realmLimits.minTemp,
                maxTemp: realmLimits.maxTemp,
                realmName: realmLimits.name
            },
            inComfortZone: thermalResult.inComfortZone,
            breachType: thermalResult.breachType,
            activeCondition: thermalResult.activeCondition,
            hpLoss: thermalResult.hpLoss,
            hasMeridianDamage: Boolean(player.thermalState?.hasMeridianDamage),
            consecutiveBreachTicks: player.thermalState?.consecutiveBreachTicks || 0
        });
    } catch (error) {
        console.error('[API-THERMAL-STATUS] Error:', error);
        res.status(500).json({ error: 'Gagal memuat status termal' });
    }
});

router.post('/zone/enter-property', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { tileX, tileY } = req.body;
        const player = await Player.findOne({ discordId: userId });
        if (!player) return res.status(404).json({ error: 'Karakter tidak ditemukan' });

        const currentZoneId = player.gridPosition?.zoneId || 'central_plains_bamboo_forest';
        const targetX = parseInt(tileX !== undefined ? tileX : player.gridPosition?.tileX ?? 0);
        const targetY = parseInt(tileY !== undefined ? tileY : player.gridPosition?.tileY ?? 0);

        const currentX = player.gridPosition?.tileX ?? 0;
        const currentY = player.gridPosition?.tileY ?? 0;
        const dist = Math.max(Math.abs(targetX - currentX), Math.abs(targetY - currentY));
        if (dist > 1) {
            return res.status(400).json({ error: 'Kamu harus berada di dekat pintu masuk kediaman!' });
        }

        const ZoneTile = require('../../models/ZoneTile');
        const tile = await ZoneTile.findOne({
            guildId: player.guildId,
            zoneId: currentZoneId,
            tileX: targetX,
            tileY: targetY
        });

        if (!tile || (!tile.isOccupied && !tile.buildingName && tile.tileType !== 'buildable_plot')) {
            return res.status(400).json({ error: 'Tidak ada kediaman atau properti di koordinat ini.' });
        }

        const PropertyStructure = require('../../models/PropertyStructure');
        const { generateDefaultEstateLayout, decompressLayoutRLE, TILE_METADATA } = require('../../utils/propertyManager');

        let property = null;
        if (tile.propertyStructureId) {
            property = await PropertyStructure.findById(tile.propertyStructureId);
        }
        if (!property) {
            property = await PropertyStructure.findOne({
                guildId: player.guildId,
                zoneId: currentZoneId,
                tileX: targetX,
                tileY: targetY
            });
        }

        // Jika belum ada record PropertyStructure, inisialisasi default 12x12
        if (!property) {
            const compressedLayout = generateDefaultEstateLayout(12, 12);
            property = await PropertyStructure.create({
                guildId: player.guildId,
                zoneId: currentZoneId,
                tileX: targetX,
                tileY: targetY,
                ownerId: tile.ownerId || player.discordId,
                ownerName: tile.ownerName || player.characterName,
                structureName: tile.buildingName || `Kediaman ${tile.ownerName || player.characterName}`,
                interiorLayoutCompressed: compressedLayout,
                subGridWidth: 12,
                subGridHeight: 12,
                isOpenToPublic: tile.isOpenToPublic !== undefined ? tile.isOpenToPublic : true
            });
            tile.propertyStructureId = property._id;
            await tile.save();
        }

        // Cek izin akses jika properti privat
        if (!property.isOpenToPublic && property.ownerId !== player.discordId) {
            return res.status(403).json({
                error: `Pintu gerbang ${property.structureName} terkunci rapat. Pemiliknya (${property.ownerName}) tidak mengizinkan tamu asing masuk.`
            });
        }

        // Set interior instance state pada player
        if (!player.gridPosition) player.gridPosition = {};
        player.gridPosition.interiorInstanceId = property._id;
        await player.save();

        const decompressedLayout = decompressLayoutRLE(property.interiorLayoutCompressed);

        res.json({
            success: true,
            message: `Kamu melangkah masuk ke dalam ${property.structureName} milik ${property.ownerName}.`,
            property: {
                id: property._id,
                name: property.structureName,
                ownerId: property.ownerId,
                ownerName: property.ownerName,
                isOwner: property.ownerId === player.discordId,
                subGridWidth: property.subGridWidth || 12,
                subGridHeight: property.subGridHeight || 12,
                facilities: {
                    qiGatheringArrayTier: property.qiGatheringArrayTier || 1,
                    alchemyCrucibleTier: property.alchemyCrucibleTier || 1,
                    forgeAnvilTier: property.forgeAnvilTier || 1,
                    herbPlotsUnlocked: property.herbPlotsUnlocked || 2
                },
                layout: decompressedLayout,
                tileMetadata: TILE_METADATA
            }
        });
    } catch (error) {
        console.error('[API-ENTER-PROPERTY] Error:', error);
        res.status(500).json({ error: 'Gagal memasuki interior properti' });
    }
});

router.post('/zone/exit-property', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const player = await Player.findOne({ discordId: userId });
        if (!player) return res.status(404).json({ error: 'Karakter tidak ditemukan' });

        if (player.gridPosition) {
            player.gridPosition.interiorInstanceId = null;
        }
        await player.save();

        res.json({
            success: true,
            message: 'Kamu melangkah keluar dari kediaman kembali ke alam bebas Jianghu.',
            playerGrid: {
                position: player.gridPosition,
                move: player.gridMove
            }
        });
    } catch (error) {
        console.error('[API-EXIT-PROPERTY] Error:', error);
        res.status(500).json({ error: 'Gagal keluar dari properti' });
    }
});

router.post('/zone/upgrade-property-facility', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { propertyId, facilityType } = req.body;
        const player = await Player.findOne({ discordId: userId });
        if (!player) return res.status(404).json({ error: 'Karakter tidak ditemukan' });

        const PropertyStructure = require('../../models/PropertyStructure');
        const property = await PropertyStructure.findById(propertyId);
        if (!property) return res.status(404).json({ error: 'Properti tidak ditemukan' });

        if (property.ownerId !== player.discordId) {
            return res.status(403).json({ error: 'Hanya pemilik sah kediaman yang dapat memperbarui fasilitas!' });
        }

        const validFacilities = ['qi_array', 'crucible', 'forge', 'herb_plots'];
        if (!validFacilities.includes(facilityType)) {
            return res.status(400).json({ error: 'Tipe fasilitas tidak valid' });
        }

        let currentTier = 1;
        let upgradeCostSilver = 500;
        let facilityName = '';

        if (facilityType === 'qi_array') {
            currentTier = property.qiGatheringArrayTier || 1;
            facilityName = 'Formasi Pengumpul Qi';
            upgradeCostSilver = currentTier * 800;
            if (currentTier >= 5) return res.status(400).json({ error: `${facilityName} sudah mencapai tingkatan maksimal (Tier 5)!` });
            property.qiGatheringArrayTier = currentTier + 1;
        } else if (facilityType === 'crucible') {
            currentTier = property.alchemyCrucibleTier || 1;
            facilityName = 'Tungku Alkimia Kuno';
            upgradeCostSilver = currentTier * 600;
            if (currentTier >= 5) return res.status(400).json({ error: `${facilityName} sudah mencapai tingkatan maksimal (Tier 5)!` });
            property.alchemyCrucibleTier = currentTier + 1;
        } else if (facilityType === 'forge') {
            currentTier = property.forgeAnvilTier || 1;
            facilityName = 'Landasan Tempa Baja Meteor';
            upgradeCostSilver = currentTier * 600;
            if (currentTier >= 5) return res.status(400).json({ error: `${facilityName} sudah mencapai tingkatan maksimal (Tier 5)!` });
            property.forgeAnvilTier = currentTier + 1;
        } else if (facilityType === 'herb_plots') {
            currentTier = property.herbPlotsUnlocked || 2;
            facilityName = 'Petak Tanah Tanaman Rohani';
            upgradeCostSilver = currentTier * 400;
            if (currentTier >= 8) return res.status(400).json({ error: `${facilityName} sudah mencapai batas maksimal 8 petak!` });
            property.herbPlotsUnlocked = currentTier + 1;
        }

        const { payCurrency } = require('../../utils/currency');
        if (!payCurrency(player.currency, upgradeCostSilver, 'silver')) {
            return res.status(400).json({ error: `Dana tidak mencukupi. Diperlukan ${upgradeCostSilver} Silver untuk memperbarui ${facilityName}.` });
        }

        property.lastUpgradedAt = new Date();
        await property.save();
        await player.save();

        res.json({
            success: true,
            message: `Berhasil memperbarui ${facilityName} ke tingkatan ${currentTier + 1}!`,
            facilities: {
                qiGatheringArrayTier: property.qiGatheringArrayTier,
                alchemyCrucibleTier: property.alchemyCrucibleTier,
                forgeAnvilTier: property.forgeAnvilTier,
                herbPlotsUnlocked: property.herbPlotsUnlocked
            }
        });
    } catch (error) {
        console.error('[API-UPGRADE-FACILITY] Error:', error);
        res.status(500).json({ error: 'Gagal memperbarui fasilitas' });
    }
});

module.exports = router;


