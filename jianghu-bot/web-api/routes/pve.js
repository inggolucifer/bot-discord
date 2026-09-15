const express = require('express');
const router = express.Router();
const { canAddToInventory, buildInventoryItemMap, getCarryCapacity, getInventoryWeight } = require('../../utils/inventoryWeight');

const Player = require('../../models/Player');
const { normalizeCurrency } = require('../../utils/currencyNormalize');
const TransactionLog = require('../../models/TransactionLog');

const { getRealmIndex, getRealmName } = require('../../utils/cultivation');
const Item = require('../../models/Item');
const Exploration = require('../../models/Exploration');

const LockManager = require('../utils/lockManager');
const CustomError = require('../utils/CustomError');
const { authenticateToken } = require('../middlewares/auth');
const mongoose = require('mongoose');
const { escapeRegex } = require('../../utils/escapeRegex');
const { EXPLORATION_LOCATIONS: LOCATIONS, getExplorationEntryCost } = require('../../config/explorationLocations');
const { getTotalCopper, hasEnoughCurrency, payCurrency, RATE_TO_COPPER } = require('../../utils/currency');
const { evaluateQuestProgress } = require('../../utils/questProgress');
const Quest = require('../../models/Quest');
const Monster = require('../../models/Monster');
const { simulateBattle } = require('../../utils/simulateBattle');
const { syncPlayerCultivation } = require('../../utils/cultivation');

// Helper untuk Mongoose Transaction
const withTransaction = async (callback) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const result = await callback(session);
        await session.commitTransaction();
        return result;
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
};

// Helper to generate drops
async function generateDrops(location, durationHours, guildId, player) {
    const WeatherConfig = require('../../models/WeatherConfig');
    const weatherConfig = await WeatherConfig.findOne({ configId: 'global' });
    let isBadWeather = weatherConfig && weatherConfig.currentWeather === 'Badai Beracun';

    let failChanceModifier = 0;
    if (isBadWeather) {
        // Check if player has anti-poison buff (can be checked via activeBuffs, assuming we added a buff_anti_poison later, or just a flag)
        const hasAntiPoison = player.activeBuffs && player.activeBuffs.some(b => b.buffType === 'anti_poison' && b.expiresAt > new Date());
        if (!hasAntiPoison) {
            failChanceModifier = 0.3; // 30% failure chance increase
        }
    }

    const drops = { copper: 0, silver: 0, gold: 0, items: [] };

    // Calculate currency based on duration multiplier
    if (location.drops.currency.copper) {
        const [min, max] = location.drops.currency.copper;
        drops.copper = Math.floor(Math.random() * (max - min + 1) + min) * durationHours;
    }
    if (location.drops.currency.silver) {
         const [min, max] = location.drops.currency.silver;
         drops.silver = Math.floor(Math.random() * (max - min + 1) + min) * durationHours;
    }

    // Convert currency overflow
    let totalCopper = drops.copper + (drops.silver * 100);
    drops.silver = Math.floor(totalCopper / 100);
    drops.copper = totalCopper % 100;

    // Items
    for (let i = 0; i < durationHours; i++) {
        // Apply weather fail chance to whole hour
        if (Math.random() < failChanceModifier) {
            continue; // Skipped hour due to bad weather
        }
        for (const dropItem of location.drops.items) {
            if (Math.random() <= dropItem.chance) {
                const qty = Math.floor(Math.random() * (dropItem.max - dropItem.min + 1)) + dropItem.min;

                // Cari ID Item dari DB (hanya mencari item yang ada)
                const itemRef = await Item.findOne({ guildId, name: new RegExp('^\\s*' + escapeRegex(dropItem.name) + '\\s*$', 'i') }).select('_id');
                if (itemRef) {
                    const existingItem = drops.items.find(i => i.itemId.toString() === itemRef._id.toString());
                    if (existingItem) {
                        existingItem.quantity += qty;
                    } else {
                        drops.items.push({ itemId: itemRef._id, quantity: qty });
                    }
                }
            }
        }
    }
    return drops;
}

router.get('/locations', authenticateToken, (req, res) => {
    // Add cost helper calculation for UI directly on locations array
    const locationsWithCost = LOCATIONS.map(loc => {
        return {
            ...loc,
            entryCostHelper: {
                copperCostPerHour: loc.copperCostPerHour || 0,
                silverCostPerHour: loc.silverCostPerHour || 0,
                provisions: loc.provisions || null
            }
        };
    });
    res.json({ success: true, data: locationsWithCost });
});

router.get('/status', authenticateToken, async (req, res) => {
    try {
        const exploration = await Exploration.findOne({ discordId: req.user.userId, status: 'exploring' }).populate('drops.items.itemId');
        res.json({ success: true, data: exploration });
    } catch (error) {
        res.status(500).json({ error: 'Gagal mengambil status eksplorasi.' });
    }
});

router.post('/start', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { locationId, durationHours } = req.body;

    if (!locationId || !durationHours) return res.status(400).json({ error: 'Data eksplorasi tidak lengkap.' });

    const location = LOCATIONS.find(l => l.id === locationId);
    if (!location) return res.status(400).json({ error: 'Lokasi tidak ditemukan.' });
    if (!location.durations.includes(Number(durationHours))) return res.status(400).json({ error: 'Durasi tidak valid.' });

    const lockKey = `explore_${userId}`;
    const releaseLock = await LockManager.acquire(lockKey);
    if (!releaseLock) return res.status(429).json({ error: 'Permintaan sedang diproses.' });

    try {
        const playerRef = await Player.findOne({ discordId: userId }).select('guildId customStatus').lean();
        const guildId = req.user.guildId || (playerRef ? playerRef.guildId : userId);

        await withTransaction(async (session) => {
            const player = await Player.findOne({ discordId: userId, guildId }).populate('inventory.itemId').session(session);
            if (!player) throw new CustomError('Karakter tidak ditemukan.', 404);
            if (player.status !== 'active') throw new CustomError('Karakter tidak aktif.', 403);
            if (player.customStatus && player.customStatus.toLowerCase().includes('bekerja')) {
                throw new CustomError('Kamu sedang bekerja. Berhenti bekerja terlebih dahulu untuk eksplorasi.', 400);
            }
            if (player.customStatus && player.customStatus.toLowerCase().includes('eksplorasi')) {
                throw new CustomError('Kamu sedang melakukan eksplorasi lain.', 400);
            }

            // Validasi realm level
            const playerRealmIdx = getRealmIndex(player.systemCultivation?.realm || 'Fondasi Fana (Mortal Foundation)');
            if (playerRealmIdx < location.minRealmLevel) {
                 throw new CustomError(`Kultivasi tidak cukup kuat untuk wilayah ini. Butuh minimal Realm Index ${location.minRealmLevel}.`, 403);
            }

            // Retribusi & Syarat Ransum
            const { copperCost, silverCost, foodQty, acceptedItemNames } = getExplorationEntryCost(location, durationHours);
            const totalCopperCost = copperCost + (silverCost * (RATE_TO_COPPER.silver || 100));

            if (!hasEnoughCurrency(player.currency, totalCopperCost, 'copper')) {
                let errorCostMsg = `${copperCost} Copper`;
                if (silverCost > 0) errorCostMsg = `${silverCost} Silver dan ${copperCost} Copper`;
                throw new CustomError(`Butuh biaya ${errorCostMsg} (lokasi ${location.name}, ${durationHours} jam). Uangmu tidak cukup.`, 400);
            }

            let foundInvIndex = -1;
            for (const acceptedName of acceptedItemNames) {
                foundInvIndex = player.inventory.findIndex(i => i.itemId.name === acceptedName && i.quantity >= foodQty);
                if (foundInvIndex !== -1) break; // found an item that has enough quantity
            }

            if (foundInvIndex === -1) {
                throw new CustomError(`Butuh bekal ${foodQty}x (${acceptedItemNames.join(' / ')}). Milikmu tidak cukup.`, 400);
            }

            // Deduct cost and item
            if (!payCurrency(player.currency, totalCopperCost, 'copper')) {
                throw new CustomError('Gagal memotong biaya uang, ada kesalahan.', 500);
            }

            player.inventory[foundInvIndex].quantity -= foodQty;
            if (player.inventory[foundInvIndex].quantity <= 0) {
                player.inventory.splice(foundInvIndex, 1);
            }

            const activeExp = await Exploration.findOne({ discordId: userId, status: 'exploring' }).session(session);
            if (activeExp) throw new CustomError('Kamu sudah memiliki eksplorasi aktif.', 400);

            const now = new Date();
            const endTime = new Date(now.getTime() + (durationHours * 60 * 60 * 1000));

            const generatedDrops = await generateDrops(location, durationHours, guildId, player);

            const exploration = new Exploration({
                guildId,
                discordId: userId,
                characterName: player.characterName,
                location: location.name,
                startTime: now,
                endTime,
                status: 'exploring',
                drops: generatedDrops
            });

            await exploration.save({ session });

            player.customStatus = `Sedang mengeksplorasi ${location.name}`;
            await player.save({ session });
        });

        res.json({ success: true, message: `Berhasil memulai eksplorasi ke ${location.name}.` });
    } catch (error) {
        if (error instanceof CustomError) return res.status(error.statusCode).json({ error: error.message });
        console.error('[API-PVE] Start exploration error:', error);
        res.status(500).json({ error: 'Gagal memulai eksplorasi.' });
    } finally {
        if (typeof releaseLock === 'function') releaseLock();
    }
});

router.post('/claim', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const lockKey = `explore_${userId}`;
    const releaseLock = await LockManager.acquire(lockKey);
    if (!releaseLock) return res.status(429).json({ error: 'Permintaan sedang diproses.' });

    try {
        const playerRef = await Player.findOne({ discordId: userId }).select('guildId').lean();
        const guildId = req.user.guildId || (playerRef ? playerRef.guildId : userId);

        const result = await withTransaction(async (session) => {
            const player = await Player.findOne({ discordId: userId, guildId }).populate('inventory.itemId').session(session);
            if (!player) throw new CustomError('Karakter tidak ditemukan.', 404);

            const exploration = await Exploration.findOne({ discordId: userId, status: 'exploring' }).populate('drops.items.itemId').session(session);
            if (!exploration) throw new CustomError('Tidak ada eksplorasi aktif.', 404);

            if (new Date() < exploration.endTime) {
                throw new CustomError('Waktu eksplorasi belum selesai.', 400);
            }

            await syncPlayerCultivation(player);

            // Map location to region slug
            const locObj = LOCATIONS.find(l => l.name === exploration.location);
            const regionSlug = locObj ? locObj.id : 'central_plains';

            const playerRealmIndex = getRealmIndex(player.systemCultivation.realm);

            // Fetch eligible monsters
            const monsters = await Monster.find({
                guildId,
                regionSlug,
                isActive: true,
                minRealmIndex: { $lte: playerRealmIndex }
            }).session(session);

            let encounterResult = {
                won: true, // Default to true if no monsters exist to preserve old behavior
                monsterName: null,
                monsterKey: null,
                combatLogs: []
            };

            let drops = exploration.drops; // Default to pre-calculated drops

            if (monsters && monsters.length > 0) {
                // Pick one random monster
                const monster = monsters[Math.floor(Math.random() * monsters.length)];
                encounterResult.monsterName = monster.name;
                encounterResult.monsterKey = monster.key;

                // Mock monster opponent for simulateBattle
                const opponent = {
                    characterName: monster.name,
                    stats: {
                        baseHp: monster.statBlock.hp,
                        baseAtk: monster.statBlock.atk,
                        baseDef: monster.statBlock.def,
                        baseSpd: monster.statBlock.spd
                    },
                    laws: [],
                    manuals: [],
                    activeBuffs: [],
                    equipment: {},
                    inventory: [],
                    systemCultivation: null
                };

                // Re-populate laws and manuals for player combat stats
                await player.populate('laws manuals.manualId');

                // Simulate Battle
                const battleResult = simulateBattle(player, opponent, { isPvE: true, allowSteal: true });
                player.currentHp = battleResult.p1Hp;
                player.combatConditions = battleResult.p1Conditions;

                if (battleResult.stealSuccess) {
                    player.kungfuSkills.stealing = (player.kungfuSkills.stealing || 0) + 1;

                    let stolenItem = null;
                    let stolenCopper = 0;
                    let stolenSilver = 0;

                    // Try item first
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
                         stolenCopper = Math.floor((Math.floor(Math.random() * (opponent.currencyDrop.copperMax - opponent.currencyDrop.copperMin + 1)) + opponent.currencyDrop.copperMin) * 0.2); // Steal 20%
                         stolenSilver = Math.floor((Math.floor(Math.random() * (opponent.currencyDrop.silverMax - opponent.currencyDrop.silverMin + 1)) + opponent.currencyDrop.silverMin) * 0.2);
                    }

                    if (stolenItem) {

                         const itemDoc = await Item.findById(stolenItem.id);
                         if (itemDoc) {
                             const invCheck = await canAddToInventory(player, [{ itemDoc: itemDoc, quantity: stolenItem.qty }]);
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
                encounterResult.combatLogs = battleResult.logs;

                if (battleResult.winnerIdx === 1) {
                    encounterResult.won = true;

                    // Award EXP and check level up
                    const { POINTS_PER_LEVEL, getRequiredExpForLevel } = require('../../config/leveling');
                    const { TALENT_EFFECTS } = require('../../config/talentEffects');

                    let expGain = 50; // Mock base exp from monster
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

                    // Generate drops from monster
                    drops = { copper: 0, silver: 0, gold: 0, items: [] };

                    if (monster.currencyDrop) {
                        const c = monster.currencyDrop;
                        drops.copper = Math.floor(Math.random() * (c.copperMax - c.copperMin + 1)) + c.copperMin;
                        drops.silver = Math.floor(Math.random() * (c.silverMax - c.silverMin + 1)) + c.silverMin;
                    }

                    for (const drop of monster.dropTable) {
                        if (Math.random() <= drop.chance) {
                            const qty = Math.floor(Math.random() * (drop.quantityMax - drop.quantityMin + 1)) + drop.quantityMin;

                            // If itemId is null, we try to find it by name or skip
                            let finalItemId = drop.itemId;
                            if (!finalItemId && drop.itemName) {
                                const matchedItem = await Item.findOne({ guildId, name: drop.itemName }).session(session);
                                if (matchedItem) finalItemId = matchedItem._id;
                            }

                            if (finalItemId) {
                                const existingItem = drops.items.find(i => i.itemId.toString() === finalItemId.toString());
                                if (existingItem) {
                                    existingItem.quantity += qty;
                                } else {
                                    drops.items.push({ itemId: finalItemId, quantity: qty });
                                }
                            }
                        }
                    }
                } else {
                    encounterResult.won = false;
                    drops = { copper: 0, silver: 0, gold: 0, items: [] }; // No drops if defeated
                }
            }

            if (encounterResult.won) {
                // Claim rewards
                player.currency.copper += drops.copper;
                player.currency.silver += drops.silver;
                player.currency.gold += drops.gold;

                const itemIds = drops.items.map(d => d.itemId._id || d.itemId);
                const itemDocs = await Item.find({ _id: { $in: itemIds } }).session(session);
                const dropsToAdd = drops.items.map(drop => {
                     const doc = itemDocs.find(d => d._id.equals(drop.itemId._id || drop.itemId));
                     return { itemDoc: doc || { weight: 1, category: 'material' }, quantity: drop.quantity };
                });
                const itemMapdropCheck = await buildInventoryItemMap(player);
                const dropCheck = await canAddToInventory(player, dropsToAdd, { itemMap: itemMapdropCheck });
                if (!dropCheck.ok) {
                    throw new CustomError(`Inventory penuh (berat ${dropCheck.currentWeight}/${dropCheck.capacity}). Kurangi beban atau pakai Storage Ring/Cart. Tidak dapat claim loot.`, 400);
                }

                for (const dropItem of drops.items) {
                    const invItem = player.inventory.find(i => {
                         const id = i.itemId && i.itemId._id ? i.itemId._id.toString() : i.itemId.toString();
                         return id === (dropItem.itemId && dropItem.itemId._id ? dropItem.itemId._id.toString() : dropItem.itemId.toString());
                    });
                    if (invItem) {
                        invItem.quantity += dropItem.quantity;
                    } else {
                        player.inventory.push({ itemId: dropItem.itemId._id || dropItem.itemId, quantity: dropItem.quantity });
                    }
                }

                // Quest Hook: kill_beast
                let questsUpdated = false;
                for (const questEntry of player.questLog.filter(q => q.status === 'active')) {
                     const quest = await Quest.findById(questEntry.questId).session(session);
                     if (!quest) continue;

                     const context = {
                         killedBeastName: encounterResult.monsterName || exploration.location,
                         killedBeastKey: encounterResult.monsterKey,
                         explorationLocation: exploration.location,
                         amount: 1
                     };
                     const { updatedProgress, allDone } = await evaluateQuestProgress(player, quest, questEntry, context);

                     if (JSON.stringify(questEntry.objectiveProgress) !== JSON.stringify(updatedProgress)) {
                         questEntry.objectiveProgress = updatedProgress;
                         questEntry.lastTouchedAt = new Date();
                         if (allDone) {
                             questEntry.status = 'completed';
                             questEntry.completedAt = new Date();
                         }
                         questsUpdated = true;
                     }
                }

                if (drops.copper > 0 || drops.silver > 0 || drops.items.length > 0) {
                    const addedCopper = (drops.copper || 0) + (drops.silver || 0) * 100 + (drops.gold || 0) * 10000;
                    const itemDesc = drops.items && drops.items.length > 0
                        ? ` serta item (${drops.items.reduce((acc, i) => acc + i.quantity, 0)} pcs)`
                        : '';

                    await TransactionLog.create([{
                        guildId,
                        type: 'exploration_loot',
                        description: `[${player.characterName}] menang eksplorasi di ${exploration.location}${encounterResult.monsterName ? ` (vs ${encounterResult.monsterName})` : ''}. (+${addedCopper} Copper eq${itemDesc})`,
                        amount: addedCopper,
                        currency: 'copper'
                    }], { session });
                }
            }

            player.customStatus = null; // Clear status
            await player.save({ session });

            exploration.status = 'claimed';
            exploration.drops = drops; // Update with actual drops gained (or empty if lost)
            await exploration.save({ session });

            return { drops, encounterResult };
        });

        res.json({
            success: true,
            message: result.encounterResult.won
                ? 'Berhasil mengklaim hasil eksplorasi.'
                : 'Kamu kalah melawan monster, eksplorasi selesai tanpa hasil.',
            drops: result.drops,
            encounter: result.encounterResult
        });
    } catch (error) {
        if (error instanceof CustomError) return res.status(error.statusCode).json({ error: error.message });
        console.error('[API-PVE] Claim exploration error:', error);
        res.status(500).json({ error: 'Gagal mengklaim hasil eksplorasi.' });
    } finally {
        if (typeof releaseLock === 'function') releaseLock();
    }
});

module.exports = router;
