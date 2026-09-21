
const express = require('express');
const { getRealmIndex } = require('../../utils/cultivation');
const router = express.Router();
const mongoose = require('mongoose');
const Player = require('../../models/Player');
const { authenticateToken } = require('../middlewares/auth');
const TransactionLog = require('../../models/TransactionLog');
const { getComputedStats } = require('../../utils/statCalculator');
const Travel = require('../../models/Travel');
const { hasEnoughCurrency, payCurrency, getTotalCopper } = require('../../utils/currency');
const { logTransaction } = require('../../utils/logger');
const WorkerContract = require('../../models/WorkerContract');
const LootPool = require('../../models/LootPool');
const crypto = require('crypto');
const { calculateRepairCost, calculateDailyGuardCost } = require('../../utils/assetCostCalculator');
const { convertFromCopper, convertToCopper } = require('../../utils/currencyNormalize');
const { getPlayerSect } = require('../../utils/sectUtils');
const { getPlayerSectRank, can } = require('../../utils/sectAccess');
const { getKungfuLevel, KUNGFU_SKILLS, getWeaponMasteryMultiplier, getUnarmedBonus, getToolDurabilityPreserveChance, getStealingSuccessBonus } = require('../../utils/kungfuMastery');
const { applyTrainingSpiritualRootXp, applyCombatSpiritualRootXp } = require('../../utils/spiritualRootXp');
const TransferRequest = require('../../models/TransferRequest');
const Item = require('../../models/Item');
const Asset = require('../../models/Asset');
const { getGlobalAssets } = require('../../utils/imageResolve');
const LockManager = require('../utils/lockManager');
const { withTransaction } = require('../utils/dbTransaction');
const CustomError = require('../utils/CustomError');
const { calculateEnergy, MAX_ENERGY } = require('../../utils/energyManager');
const { canAddToInventory, buildInventoryItemMap, getCarryCapacity, getInventoryWeight } = require('../../utils/inventoryWeight');
const Law = require('../../models/Law');
const { escapeRegex } = require('../../utils/escapeRegex');
const { isUnderConstruction, calculateProgress } = require('../../utils/crafting');

function formatCurrencyString(currencyObj) {
    const parts = [];
    if (currencyObj.spirit) parts.push(currencyObj.spirit + ' Spirit');
    if (currencyObj.jade) parts.push(currencyObj.jade + ' Jade');
    if (currencyObj.gold) parts.push(currencyObj.gold + ' Gold');
    if (currencyObj.silver) parts.push(currencyObj.silver + ' Silver');
    if (currencyObj.copper) parts.push(currencyObj.copper + ' Copper');
    return parts.length > 0 ? parts.join(', ') : '0 Copper';
}


// Endpoint: GET /api/player/transactions
router.get('/transactions', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const playerRef = await Player.findOne({ discordId: userId }).select('guildId').lean();
        const guildId = req.user.guildId || (playerRef ? playerRef.guildId : userId);


        // Retrieve transactions involving this user (either explicitly or via descriptions that match their actions - simplified for now)
        // A more robust implementation would structure TransactionLog to have fromUserId and toUserId, but for now we search description
        const player = await Player.findOne({ discordId: userId, guildId }).select('characterName').lean();
        if (!player) return res.status(404).json({ error: 'Karakter tidak ditemukan. Silakan registrasi karakter baru di menu pendaftaran.' });

        const regex = new RegExp(`\\[${player.characterName}\\]`, 'i');
        const transactions = await TransactionLog.find({
            guildId,
            $or: [
                { description: regex },
                { description: new RegExp(`kepada \\[${player.characterName}\\]`, 'i') },
                { description: new RegExp(`dari \\[${player.characterName}\\]`, 'i') }
            ]
        }).sort({ createdAt: -1 }).limit(50).lean();

        res.json({ success: true, data: transactions });
    } catch (error) {
        console.error('[API-PLAYER] Error fetching transactions:', error);
        res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
    }
});

// Endpoint to fetch player's character profile and basic stats
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        // Note: For multi-guild support, we ideally need guildId from frontend.
        // For now, we fetch the first profile found for the user (assuming 1 main server)
        // In a full production scenario, the frontend should pass guildId.
        const player = await Player.findOne({ discordId: userId })
            .populate('laws')
            .populate('manuals.manualId')
            .populate('inventory.itemId')
            .select('-pets -assets') // Exclude heavy arrays for the simple profile view
            .lean();

        if (!player) {
            return res.status(404).json({ error: 'Karakter tidak ditemukan. Pastikan Anda sudah membuat karakter melalui Web Dashboard.' });
        }

        // Inject Discord Avatar URL from the JWT payload as fallback
        const discordAvatarUrl = req.user.avatar; // Assuming we passed it during auth

        // Format Manuals to bring manual details directly into the object and flatten it slightly
        const formattedManuals = (player.manuals || []).map(pm => {
            if (!pm.manualId) return null;
            return {
                id: pm.manualId._id,
                name: pm.manualId.name,
                description: pm.manualId.description,
                maxLevel: pm.manualId.maxLevel,
                level: pm.level,
                effectType: pm.manualId.effectType,
                triggerChance: pm.manualId.triggerChance,
                sectLocked: pm.manualId.requiredSectId ? true : false,
                requiredSectId: pm.manualId.requiredSectId,
                isComprehending: pm.isComprehending,
                comprehendStartTime: pm.comprehendStartTime
            };
        }).filter(m => m !== null);



        const combatStats = getComputedStats(player, player.laws, player.manuals);

        // Calculate real-time energy safely
        let currentEnergy = 100;
        try {
          if (typeof calculateEnergy === 'function') {
            currentEnergy = calculateEnergy(player);
          } else if (player.energy && typeof player.energy.current === 'number') {
            currentEnergy = player.energy.current;
          }
        } catch (e) {
          console.warn('[API-PLAYER] calculateEnergy failed:', e.message);
        }

        let inventoryWeight = 0;
        let carryCapacity = 50;
        try {
          const equippedItems = [];
          if (player.equipment && player.equipment.accessory && Array.isArray(player.inventory)) {
            const accInvItem = player.inventory.find(
              (i) => i && i._id && i._id.toString() === String(player.equipment.accessory)
            );
            if (accInvItem && accInvItem.itemId && accInvItem.itemId.capacityBonus) {
              equippedItems.push(accInvItem.itemId);
            }
          }
          if (player.equipment && player.equipment.mount && Array.isArray(player.inventory)) {
            const mountInvItem = player.inventory.find(
              (i) => i && i._id && i._id.toString() === String(player.equipment.mount)
            );
            if (mountInvItem && mountInvItem.itemId && mountInvItem.itemId.capacityBonus) {
              equippedItems.push(mountInvItem.itemId);
            }
          }

          const activeTravel = await Travel.findOne({
            discordId: userId,
            status: { $in: ['traveling', 'ambushed'] }
          });
          const isTraveling = !!activeTravel;

          if (typeof buildInventoryItemMap === 'function') {
            const itemMapWeight = await buildInventoryItemMap(player);
            inventoryWeight = getInventoryWeight(player, itemMapWeight);
            carryCapacity = await getCarryCapacity(player, { isTraveling }, equippedItems);
          }
        } catch (weightErr) {
          console.warn('[API-PLAYER] weight calc skipped:', weightErr.message);
        }

        const defaultExtendedStats = {
            maxLifespan: 100,
            mood: 100,
            luck: 10,
            insight: 10,
            vitality: 100,
            maxVitality: 100,
            innerEnergy: 100,
            maxInnerEnergy: 100,
            focus: 100,
            maxFocus: 100,
            critRate: 5,
            critResist: 0,
            agility: 10,
            critDmg: 150,
            critDmgReduce: 0,
            travelSpeed: 100,
            martialRes: 0,
            spiritualRes: 0,
            spiritualRoot: { fire: 0, water: 0, lightning: 0, wind: 0, earth: 0, wood: 0 },
            artisanship: { alchemy: 1, forge: 1, talismans: 1, herbology: 1, mining: 1 }
        };

        // Sinkronisasi Terpadu: Kemahiran Profesi & Artisanship Menjadi Satu Kesatuan Sistem
        const prof = player.professions || {};
        const extArt = (player.extendedStats && player.extendedStats.artisanship) || {};
        
        const unifiedArtisanship = {
            alchemy: Math.floor(prof.alchemy?.isUnlocked ? (prof.alchemy.level || 1) : (Number(extArt.alchemy) || 1)),
            forge: Math.floor(prof.smithing?.isUnlocked ? (prof.smithing.level || 1) : (Number(extArt.forge) || 1)),
            herbology: Math.floor(prof.farming?.isUnlocked ? (prof.farming.level || 1) : (Number(extArt.herbology) || 1)),
            mining: Math.floor(prof.mining?.isUnlocked ? (prof.mining.level || 1) : (Number(extArt.mining) || 1)),
            talismans: Math.floor(Number(extArt.talismans) || 1),
            fishing: Math.floor(prof.fishing?.isUnlocked ? (prof.fishing.level || 1) : 0),
            cooking: Math.floor(prof.cooking?.isUnlocked ? (prof.cooking.level || 1) : 0)
        };

        const rawSpiritualRoot = (player.extendedStats && player.extendedStats.spiritualRoot) || {};
        // Memastikan seluruh pemain start dari 0 untuk spiritual root
        const normalizedSpiritualRoot = {
            fire: Math.floor(Number(rawSpiritualRoot.fire) || 0),
            water: Math.floor(Number(rawSpiritualRoot.water) || 0),
            lightning: Math.floor(Number(rawSpiritualRoot.lightning) || 0),
            wind: Math.floor(Number(rawSpiritualRoot.wind) || 0),
            earth: Math.floor(Number(rawSpiritualRoot.earth) || 0),
            wood: Math.floor(Number(rawSpiritualRoot.wood) || 0)
        };

        const mergedExtendedStats = {
            ...defaultExtendedStats,
            ...(player.extendedStats || {}),
            spiritualRoot: normalizedSpiritualRoot,
            artisanship: unifiedArtisanship
        };

        res.json({
            success: true,
            data: {
                ...player,
                extendedStats: mergedExtendedStats,
                alignment: player.alignment || { righteous: 50, demonic: 0 },
                destinyNature: (player.destinyNature && player.destinyNature.length > 0) ? player.destinyNature : ['Dual Talents'],
                destinyNurture: (player.destinyNurture && player.destinyNurture.length > 0) ? player.destinyNurture : ['Taoist Mind Essence'],
                personalityTags: (player.personalityTags && player.personalityTags.length > 0) ? player.personalityTags : ['Protective', 'Carefree'],
                internalTraits: player.internalTraits || 'Middle Way',
                externalTraits: player.externalTraits || 'Traditional Carefree',
                charisma: player.charisma || 'Average',
                interests: (player.interests && player.interests.length > 0) ? player.interests : ['Bambooware', 'Flute', 'Wine'],
                race: player.race || 'Human',
                reputation: player.reputation !== undefined ? player.reputation : 100,
                levelCap: getLevelCap(getRealmIndex(player.systemCultivation?.realm || 'Fondasi Fana (Mortal Foundation)')),
                reputationTitle: player.reputationTitle || 'Novice Cultivator',
                energy: { current: currentEnergy, lastUpdated: player.energy ? player.energy.lastUpdated : new Date() },
                maxEnergy: (typeof MAX_ENERGY === 'number' ? MAX_ENERGY : 100),
                currentLocation: player.currentLocation || { regionSlug: 'central_plains', settlementName: 'Desa Xingcun', buildingName: null },
                combatStats,
                manuals: formattedManuals,
                discordAvatar: discordAvatarUrl || null,
                hasCompletedTour: player.hasCompletedTour || false,
                prologueCompleted: player.prologueCompleted || false,
                inventoryWeight,
                carryCapacity
            }
        });
    } catch (error) {
        console.error('[API-PLAYER] Error fetching profile:', error);
        res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
    }
});

// Endpoint to fetch player's assets
router.get('/assets', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const player = await Player.findOne({ discordId: userId })
            .populate({
                path: 'assets.assetId',
                populate: {
                    path: 'workerInputMaterials.itemId',
                    model: 'Item'
                }
            })
            .lean();

        if (!player) {
            return res.status(404).json({ error: 'Karakter tidak ditemukan. Silakan registrasi karakter baru di menu pendaftaran.' });
        }

        const assets = player.assets.map(asset => {
            let statusLabel = 'Aktif';
            let underConstruction = false;

            if (asset.isDamaged) {
                statusLabel = 'Rusak';
            } else if (isUnderConstruction(asset)) {
                underConstruction = true;
                statusLabel = 'Dalam Pembangunan';
            } else if (asset.status === 'pending') {
                statusLabel = 'Pending';
            } else if (asset.status === 'building') {
                statusLabel = 'Membangun';
            } else if (asset.isHalted) {
                statusLabel = 'Halted (Terhenti)';
            }

            let progressHours = 0;
            if (asset.assetId && !underConstruction && !asset.isHalted && asset.status === 'active') {
                const progressMs = calculateProgress(asset) + (asset.progressAccumulated || 0);
                progressHours = Math.floor(progressMs / 3600000);
            }

            return {
                id: asset.assetId ? asset.assetId._id : null,
                name: asset.assetId ? asset.assetId.name : 'Unknown Asset',
                description: asset.assetId ? asset.assetId.description : '',
                imageUrl: asset.assetId ? asset.assetId.imageUrl : null,
                quantity: asset.quantity,
                status: statusLabel,
                underConstruction: underConstruction,
                constructionCompleteAt: asset.constructionCompleteAt,
                assignedWorkers: asset.assignedWorkers,
                progressHours: progressHours,
                rank: asset.assetId ? asset.assetId.rank : 'Common',
                isCraftingStation: asset.assetId ? asset.assetId.isCraftingStation : false,
                recipes: asset.assetId ? asset.assetId.recipes : [],
                workerInputMaterials: asset.assetId ? asset.assetId.workerInputMaterials : [],
                isDamaged: asset.isDamaged,
                damageType: asset.damageType,
                guardEndTime: asset.guardEndTime,
                toolDurabilityUsage: asset.toolDurabilityUsage ? Object.fromEntries(asset.toolDurabilityUsage) : {},
                placement: asset.placement || null,
                hp: asset.hp !== undefined ? asset.hp : (asset.isDamaged ? 30 : 100),
                maxHp: asset.maxHp || 100
            };
        });

        res.json({ success: true, data: assets, assetSlots: player.assetSlots || 1 });
    } catch (error) {
        console.error('[API-PLAYER] Error fetching assets:', error);
        res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
    }
});




router.post('/assets/tambah-slot', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const playerRef = await Player.findOne({ discordId: userId }).select('guildId').lean();
        const guildId = req.user.guildId || (playerRef ? playerRef.guildId : userId);

        const player = await Player.findOne({ discordId: userId, guildId: guildId });
        if (!player) return res.status(404).json({ error: 'Karakter tidak ditemukan. Silakan registrasi karakter baru di menu pendaftaran.' });
        if (player.status !== 'active') return res.status(400).json({ error: `Karaktermu berstatus ${player.status}.` });

        const currentSlots = player.assetSlots || 1;
        if (currentSlots >= 5) {
            return res.status(400).json({ error: 'Maksimal slot aset adalah 5.' });
        }

        const slotCosts = {
            2: 100, // 1 Gold
            3: 2000, // 20 Gold
            4: 8000, // 80 Gold
            5: 10000 // 1 Jade (100 Gold)
        };

        const costSilver = slotCosts[currentSlots + 1];


        if (!hasEnoughCurrency(player.currency, costSilver, 'silver')) {
           let tempCost = costSilver;
           const spirit = Math.floor(tempCost / 1000000); tempCost %= 1000000;
           const jade = Math.floor(tempCost / 10000); tempCost %= 10000;
           const gold = Math.floor(tempCost / 100);
           const silver = tempCost % 100;

           let costStr = [];
           if (spirit > 0) costStr.push(`${spirit} Spirit`);
           if (jade > 0) costStr.push(`${jade} Jade`);
           if (gold > 0) costStr.push(`${gold} Gold`);

           return res.status(400).json({ error: `Saldo Wealth kamu tidak cukup. Butuh ${costStr.join(' ')} untuk unlock slot aset ke-${currentSlots + 1}.` });
        }

        // Deduct wealth
        if (!payCurrency(player.currency, costSilver, 'silver')) {
           return res.status(400).json({ error: `Uang tidak cukup. Butuh setara dengan ${costSilver} Silver.` });
        }

        player.assetSlots = currentSlots + 1;
        player.markModified('currency');
        await player.save();


        // Using shop_purchase as per user instruction
        await logTransaction(req.discordClient || req.app.get('client'), {
          guildId: guildId,
          type: 'shop_purchase',
          fromUserId: userId,
          currency: 'silver',
          amount: costSilver,
          itemDescription: `Unlock Asset Slot ke-${currentSlots + 1} dari Web`,
          balanceAfter: player.currency
        });

        res.json({ success: true, message: `Berhasil menambah slot aset! Kamu sekarang memiliki ${currentSlots + 1} slot aset.`, newSlots: currentSlots + 1 });
    } catch (error) {
        console.error('[API-PLAYER] Error tambah slot aset:', error);
        res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
    }
});

router.post('/assets/hire-npc', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const playerRef = await Player.findOne({ discordId: req.user.userId }).select('guildId').lean();
        const guildId = req.user.guildId || (playerRef ? playerRef.guildId : req.user.userId);const { assetId, durasi } = req.body;

        if (!assetId || !durasi || durasi < 1) {
            return res.status(400).json({ error: 'Data tidak lengkap atau durasi tidak valid.' });
        }

        const player = await Player.findOne({ discordId: userId, guildId: guildId });
        if (!player) return res.status(404).json({ error: 'Karakter tidak ditemukan. Silakan registrasi karakter baru di menu pendaftaran.' });

        const assetDoc = await Asset.findById(assetId);
        if (!assetDoc) return res.status(404).json({ error: 'Aset tidak ditemukan.' });

        const ownedAsset = player.assets.find(a => a.assetId.equals(assetDoc._id));

        if (!isUnderConstruction(ownedAsset)) {
            if (!ownedAsset.assignedWorkers) ownedAsset.assignedWorkers = [];
            const activeWorkers = ownedAsset.assignedWorkers.filter(w => !w.endTime || w.endTime.getTime() > Date.now()).length;
            const maxWorkers = ownedAsset.quantity || 1;
            if (activeWorkers >= maxWorkers) {
                return res.status(400).json({ error: `Aset yang sudah jadi hanya boleh maksimal memiliki ${maxWorkers} pekerja.` });
            }
        }

        const totalCost = durasi * 5;

        if (!payCurrency(player.currency, totalCost, 'silver')) {
            return res.status(400).json({ error: `Uang kamu tidak cukup. Butuh setara dengan ${totalCost} Silver.` });
        }

        ownedAsset.progressAccumulated += calculateProgress(ownedAsset);
        ownedAsset.lastProgressUpdate = new Date();

        if (!ownedAsset.assignedWorkers) ownedAsset.assignedWorkers = [];
        ownedAsset.assignedWorkers.push({
            workerId: `NPC_${Date.now()}`,
            endTime: new Date(Date.now() + durasi * 3600000)
        });

        if (ownedAsset.status === 'pending') ownedAsset.status = 'building';

        player.markModified('currency');
        await player.save();

        res.json({ success: true, message: `Berhasil menyewa NPC Worker untuk ${durasi} jam.` });

    } catch (error) {
        console.error('[API-PLAYER] Error hiring NPC:', error);
        res.status(500).json({ error: 'Terjadi kesalahan pada server saat menyewa NPC.' });
    }
});

router.post('/assets/work-self', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const guildId = req.user.guildId || (playerRef ? playerRef.guildId : req.user.userId);
        const { assetId } = req.body;

        if (!assetId) {
            return res.status(400).json({ error: 'Data tidak lengkap.' });
        }

        const player = await Player.findOne({ discordId: userId, guildId });
        if (!player) return res.status(404).json({ error: 'Karakter tidak ditemukan. Silakan registrasi karakter baru di menu pendaftaran.' });


        const assetDoc = await Asset.findById(assetId);
        if (!assetDoc) return res.status(404).json({ error: 'Aset tidak ditemukan.' });

        const ownedAsset = player.assets.find(a => a.assetId.equals(assetDoc._id));
        if (!ownedAsset) return res.status(400).json({ error: 'Kamu tidak memiliki aset tersebut.' });

        if (!isUnderConstruction(ownedAsset)) {
            if (!ownedAsset.assignedWorkers) ownedAsset.assignedWorkers = [];
            const activeWorkers = ownedAsset.assignedWorkers.filter(w => !w.endTime || w.endTime.getTime() > Date.now()).length;
            const maxWorkers = ownedAsset.quantity || 1;
            if (activeWorkers >= maxWorkers) {
                return res.status(400).json({ error: `Aset yang sudah jadi hanya boleh maksimal memiliki ${maxWorkers} pekerja.` });
            }
        }

        // Cek jika player sudah bekerja di suatu tempat
        for (const a of player.assets) {
           if(a.assignedWorkers && a.assignedWorkers.find(w => w.workerId === userId)) {
               return res.status(400).json({ error: 'Kamu sudah bekerja secara mandiri di aset lain.' });
           }
        }

        // Batalkan kontrak dari WorkerContract jika ada

        const existingContract = await WorkerContract.findOne({ guildId, workerId: userId });
        if (existingContract) {
            if (existingContract.status === 'working') {
                return res.status(400).json({ error: 'Kamu sedang terikat kontrak dengan pemain lain.' });
            } else {
                await WorkerContract.deleteOne({ _id: existingContract._id });
            }
        }

        ownedAsset.progressAccumulated += calculateProgress(ownedAsset);
        ownedAsset.lastProgressUpdate = new Date();

        if (!ownedAsset.assignedWorkers) ownedAsset.assignedWorkers = [];
        // endTime null berarti permanen sampai dibatalkan
        ownedAsset.assignedWorkers.push({
            workerId: userId,
            endTime: null
        });

        if (ownedAsset.status === 'pending') ownedAsset.status = 'building';

        player.customStatus = `Sedang bekerja mandiri di asset ${assetDoc.name} miliknya.`;

        await player.save();

        res.json({ success: true, message: 'Berhasil mulai bekerja secara mandiri di aset ini.' });

    } catch (error) {
        console.error('[API-PLAYER] Error work self:', error);
        res.status(500).json({ error: 'Terjadi kesalahan pada server saat memproses kerja mandiri.' });
    }
});

router.post('/assets/hire-player', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const playerRef = await Player.findOne({ discordId: req.user.userId }).select('guildId').lean();
        const guildId = req.user.guildId || (playerRef ? playerRef.guildId : req.user.userId);
        const { assetId, workerId, durasi } = req.body;

        if (!assetId || !workerId || !durasi || durasi < 1) {
            return res.status(400).json({ error: 'Data tidak lengkap.' });
        }


        const contract = await WorkerContract.findOne({ _id: workerId, guildId, status: 'available' });
        if (!contract) return res.status(400).json({ error: 'Pekerja tidak tersedia.' });

        if (durasi > contract.maxDurationHours) {
            return res.status(400).json({ error: `Durasi melebihi batas maksimal pekerja (${contract.maxDurationHours} jam).` });
        }
        if (contract.workerId === userId) {
            return res.status(400).json({ error: 'Tidak bisa menyewa diri sendiri.' });
        }

        const player = await Player.findOne({ discordId: userId, guildId });
        if (!player) return res.status(404).json({ error: 'Karakter tidak ditemukan. Silakan registrasi karakter baru di menu pendaftaran.' });

        const assetDoc = await Asset.findById(assetId);
        if (!assetDoc) return res.status(404).json({ error: 'Aset tidak ditemukan.' });

        const ownedAsset = player.assets.find(a => a.assetId.equals(assetDoc._id));
        if (!ownedAsset) return res.status(400).json({ error: 'Kamu tidak memiliki aset tersebut.' });

        if (!isUnderConstruction(ownedAsset)) {
            if (!ownedAsset.assignedWorkers) ownedAsset.assignedWorkers = [];
            const maxWorkers = ownedAsset.quantity || 1;
            if (activeWorkers >= maxWorkers) {
                return res.status(400).json({ error: `Aset yang sudah jadi hanya boleh maksimal memiliki ${maxWorkers} pekerja.` });
            }
        }

        const totalCost = durasi * contract.pricePerHour;

        if (!payCurrency(player.currency, totalCost, 'silver')) {
            return res.status(400).json({ error: `Uang kamu tidak cukup. Butuh setara dengan ${totalCost} Silver.` });
        }

        ownedAsset.progressAccumulated += calculateProgress(ownedAsset);
        ownedAsset.lastProgressUpdate = new Date();

        const endTime = new Date(Date.now() + durasi * 3600000);

        if (!ownedAsset.assignedWorkers) ownedAsset.assignedWorkers = [];
        ownedAsset.assignedWorkers.push({
            workerId: contract.workerId,
            endTime: endTime
        });

        if (ownedAsset.status === 'pending') ownedAsset.status = 'building';

        contract.status = 'working';
        contract.currentAssetId = assetDoc._id.toString();
        contract.currentEmployerId = userId;
        contract.workingSince = new Date();
        contract.workingUntil = endTime;

        await contract.save();
        player.markModified('currency');
        await player.save();

        const workerPlayer = await Player.findOne({ discordId: contract.workerId, guildId });
        if (workerPlayer) {
            workerPlayer.customStatus = `Sedang bekerja di asset ${assetDoc.name} milik ${player.characterName}`;
            await workerPlayer.save();
        }

        res.json({ success: true, message: `Berhasil menyewa ${contract.workerName} untuk ${durasi} jam.` });

    } catch (error) {
        console.error('[API-PLAYER] Error hiring player:', error);
        res.status(500).json({ error: 'Terjadi kesalahan pada server saat menyewa pekerja.' });
    }
});

router.post('/assets/move-worker', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const playerRef = await Player.findOne({ discordId: req.user.userId }).select('guildId').lean();

        if (!targetAssetId || !workerId) return res.status(400).json({ error: 'Data tidak lengkap.' });

        const player = await Player.findOne({ discordId: userId, guildId });
        if (!player) return res.status(404).json({ error: 'Karakter tidak ditemukan. Silakan registrasi karakter baru di menu pendaftaran.' });


        let contract = null;
        let isNpc = workerId.startsWith('NPC_');

        if (!isNpc) {
            contract = await WorkerContract.findOne({ guildId, workerId: workerId, currentEmployerId: userId, status: 'working' });
            if (!contract) return res.status(400).json({ error: 'Worker tersebut tidak sedang bekerja untukmu.' });
        }

        const targetAssetDoc = await Asset.findById(targetAssetId);
        if (!targetAssetDoc) return res.status(404).json({ error: 'Aset tujuan tidak ditemukan.' });

        const targetOwnedAsset = player.assets.find(a => a.assetId.equals(targetAssetDoc._id));
        if (!targetOwnedAsset) return res.status(400).json({ error: 'Kamu tidak memiliki aset tujuan tersebut.' });

        if (!isUnderConstruction(targetOwnedAsset)) {
            if (!targetOwnedAsset.assignedWorkers) targetOwnedAsset.assignedWorkers = [];
            const activeWorkers = targetOwnedAsset.assignedWorkers.filter(w => !w.endTime || w.endTime.getTime() > Date.now()).length;
            const maxWorkers = targetOwnedAsset.quantity || 1;
            if (activeWorkers >= maxWorkers) return res.status(400).json({ error: `Aset tujuan sudah jadi, maksimal ${maxWorkers} pekerja.` });
        }

        let oldAssetFound = false;
        let endTimeToCarryOver = null;

        for (let a of player.assets) {
            if (!a.assignedWorkers) continue;
            const workerIdx = a.assignedWorkers.findIndex(w => w.workerId === workerId);
            if (workerIdx !== -1) {
                const w = a.assignedWorkers[workerIdx];
                if (w.endTime && w.endTime.getTime() < Date.now()) {
                    return res.status(400).json({ error: 'Kontrak pekerja ini sudah habis.' });
                }
                endTimeToCarryOver = w.endTime;

                a.progressAccumulated += calculateProgress(a);
                a.lastProgressUpdate = new Date();

                a.assignedWorkers.splice(workerIdx, 1);
                if (a.assignedWorkers.length === 0) a.status = 'pending';

                oldAssetFound = true;
                break;
            }
        }

        if (!oldAssetFound) return res.status(400).json({ error: 'Pekerja tidak ditemukan di aset manapun milikmu.' });

        targetOwnedAsset.progressAccumulated += calculateProgress(targetOwnedAsset);
        targetOwnedAsset.lastProgressUpdate = new Date();

        if (!targetOwnedAsset.assignedWorkers) targetOwnedAsset.assignedWorkers = [];
        targetOwnedAsset.assignedWorkers.push({ workerId: workerId, endTime: endTimeToCarryOver });
        if (targetOwnedAsset.status === 'pending') targetOwnedAsset.status = 'building';

        if (contract) {
            contract.currentAssetId = targetAssetDoc._id.toString();
            await contract.save();
            const workerPlayer = await Player.findOne({ discordId: workerId, guildId });
            if (workerPlayer) {
                workerPlayer.customStatus = `Sedang bekerja di asset ${targetAssetDoc.name} milik ${player.characterName}`;
                await workerPlayer.save();
            }
        }

        await player.save();
        res.json({ success: true, message: 'Berhasil memindahkan pekerja.' });

    } catch (error) {
        console.error('[API-PLAYER] Error moving worker:', error);
        res.status(500).json({ error: 'Terjadi kesalahan pada server saat memindah pekerja.' });
    }
});


// Endpoint to fetch public profile for chat interaction
router.get('/public-profile/:discordId', async (req, res) => {
    try {
        const { discordId } = req.params;
        const player = await Player.findOne({ discordId })
            .select('characterName characterImage sect status realm stage totalWealth assets pets customStatus systemCultivation')
            .lean();

        if (!player) {
            return res.status(404).json({ error: 'Karakter tidak ditemukan. Silakan registrasi karakter baru di menu pendaftaran.' });
        }

        const totalAssets = player.assets ? player.assets.reduce((sum, a) => sum + (a.quantity || 1), 0) : 0;
        const totalPets = player.pets ? player.pets.length : 0;

        res.json({
            success: true,
            data: {
                characterName: player.characterName,
                characterImage: player.characterImage,
                sect: player.sect,
                status: player.status,
                realm: player.systemCultivation?.realm || 'Fondasi Fana (Mortal Foundation)',
                stage: String(player.systemCultivation?.stage || 0),
                systemCultivation: player.systemCultivation,
                totalWealth: player.totalWealth,
                totalAssets,
                totalPets,
                customStatus: player.customStatus
            }
        });
    } catch (error) {
        console.error('[API-PLAYER] Error fetching public profile:', error);
        res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
    }
});

// Endpoint: POST /api/player/tour-complete
router.post('/tour-complete', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const playerRef = await Player.findOne({ discordId: userId }).select('guildId').lean();
        const guildId = req.user.guildId || (playerRef ? playerRef.guildId : userId);

        await Player.updateOne({ discordId: userId, guildId }, { $set: { hasCompletedTour: true } });
        res.json({ success: true });
    } catch (error) {
        console.error('[API-PLAYER] Failed to complete tour:', error);
        res.status(500).json({ error: 'Gagal mengupdate status tour.' });
    }
});


// Endpoint: POST /api/player/transfer
router.post('/transfer', authenticateToken, async (req, res) => {
    const { targetName, currencyType, amount } = req.body;
    const userId = req.user.userId;

    if (!targetName || !currencyType || !amount || amount <= 0 || !Number.isInteger(amount)) {
        return res.status(400).json({ error: 'Data tidak valid. Pastikan jumlah adalah angka positif utuh.' });
    }

    const validCurrencies = ['copper', 'silver', 'gold', 'jade', 'spirit'];
    if (!validCurrencies.includes(currencyType)) {
        return res.status(400).json({ error: 'Mata uang tidak valid.' });
    }

    const lockKey = `player_transfer_${userId}`;
    const releaseLock = await LockManager.acquire(lockKey);
    if (!releaseLock) {
         return res.status(429).json({ error: 'Transaksi sedang diproses. Mohon tunggu.' });
    }

    try {
        const playerRef = await Player.findOne({ discordId: userId }).select('guildId').lean();
        const guildId = req.user.guildId || (playerRef ? playerRef.guildId : userId);

        let receiverName = '';

        await withTransaction(async (session) => {
            const receiver = await Player.findOne({
                characterName: { $regex: new RegExp('^\\s*' + escapeRegex(targetName) + '\\s*$', 'i') },
                guildId
            }).session(session);

            if (!receiver) throw new CustomError('Karakter penerima tidak ditemukan di sekte/guild yang sama.', 404);
            if (receiver.status !== 'active') throw new CustomError(`Penerima berstatus ${receiver.status}.`, 403);
            if (receiver.discordId === userId) throw new CustomError('Tidak bisa transfer ke diri sendiri.', 400);

            receiverName = receiver.characterName;

            // Atomically check and deduct sender currency
            const updateQuery = {};
            updateQuery[`currency.${currencyType}`] = -amount;

            const sender = await Player.findOneAndUpdate(
                { discordId: userId, guildId, [`currency.${currencyType}`]: { $gte: amount }, status: 'active' },
                { $inc: updateQuery },
                { new: true, session }
            );

            if (!sender) {
                // Determine the cause of failure to provide a better error message
                const senderCheck = await Player.findOne({ discordId: userId, guildId }).session(session);
                if (!senderCheck) throw new CustomError('Karakter tidak ditemukan. Silakan registrasi karakter baru di menu pendaftaran.', 404);
                if (senderCheck.status !== 'active') throw new CustomError(`Karaktermu berstatus ${senderCheck.status}.`, 403);
                throw new CustomError(`Saldo ${currencyType} kamu tidak mencukupi.`, 400);
            }

            const taxRate = 0.08;
            const totalCopper = amount * (RATE_TO_COPPER[currencyType] || 1);
            const taxCopper = Math.floor(totalCopper * taxRate);

            // Notice we use receiver.save() to trigger 'save' middleware on update?
            // `updateOne` and `$inc` don't trigger `pre('save')` normalisation in mongoose natively.

            receiver.currency[currencyType] = (receiver.currency[currencyType] || 0) + amount;
            receiver.currency.copper = (receiver.currency.copper || 0) - taxCopper;
            await receiver.save({ session });


            await TransactionLog.create([{
                guildId,
                type: 'transfer',
                description: `[${sender.characterName}] mengirim ${amount} ${currencyType} kepada [${receiver.characterName}] (pajak ${taxCopper} copper).`
            }], { session });
        });

        res.json({ success: true, message: `Berhasil mentransfer ${amount} ${currencyType} kepada ${receiverName}.` });
    } catch (error) {
        if (error instanceof CustomError) {
            return res.status(error.statusCode).json({ error: error.message });
        }
        console.error('[API-PLAYER] Error transfer currency:', error);
        res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
    } finally {
        if (typeof releaseLock === 'function') releaseLock();
    }
});

// Endpoint: GET /api/player/available-loot
router.get('/loot', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const playerRef = await Player.findOne({ discordId: userId }).select('guildId').lean();
        const guildId = req.user.guildId || (playerRef ? playerRef.guildId : userId);


        const availableLoots = await LootPool.find({
            guildId,
            targetUserId: userId,
            claimed: false
        }).lean();

        res.json({ success: true, data: availableLoots });
    } catch (error) {
        console.error('[API-PLAYER] Error fetching loot:', error);
        res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
    }
});

// Endpoint: POST /api/player/loot
router.post('/loot', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { poolId } = req.body;

    if (!poolId) return res.status(400).json({ error: 'ID Loot tidak valid.' });

    const lockKey = `player_loot_${poolId}_${userId}`;
    const releaseLock = await LockManager.acquire(lockKey);
    if (!releaseLock) {
         return res.status(429).json({ error: 'Transaksi sedang diproses. Mohon tunggu.' });
    }

    try {
        const playerRef = await Player.findOne({ discordId: userId }).select('guildId').lean();
        const guildId = req.user.guildId || (playerRef ? playerRef.guildId : userId);
        let successMessage = '';

        await withTransaction(async (session) => {

            // Atomically lock and claim the pool
            const pool = await LootPool.findOneAndUpdate(
                { _id: poolId, guildId, targetUserId: userId, claimed: false },
                { $set: { claimed: true, claimedAt: new Date() } },
                { new: true, session }
            );

            if (!pool) throw new CustomError('Loot tidak ditemukan atau sudah diklaim.', 404);

            const player = await Player.findOne({ discordId: userId, guildId }).session(session);
            if (!player) throw new CustomError('Karakter tidak ditemukan. Silakan registrasi karakter baru di menu pendaftaran.', 404);
            if (player.status !== 'active') throw new CustomError(`Karaktermu berstatus ${player.status}.`, 403);

            for (const c of ['copper', 'silver', 'gold', 'jade', 'spirit']) {
                player.currency[c] += pool.currency[c] || 0;
            }

            for (const it of pool.inventory) {
                const itemDoc = await Item.findById(it.itemId).session(session);
                const invCheck = await canAddToInventory(player, [{ itemDoc, quantity: it.quantity }]);
                if (!invCheck.ok) {
                    throw new CustomError(`Inventory penuh (berat ${invCheck.currentWeight}/${invCheck.capacity}). Kurangi beban atau pakai Storage Ring/Cart.`, 400);
                }
                const owned = player.inventory.find((i) => i.itemId.equals(it.itemId));
                if (owned) owned.quantity += it.quantity;
                else player.inventory.push({ itemId: it.itemId, quantity: it.quantity });
            }

            let petLootedCount = 0;

            for (const p of pool.pets) {
                if (player.pets.length < 6) {
                    const transferredPet = p;
                    transferredPet.instanceId = crypto.randomUUID();
                    player.pets.push(transferredPet);
                    petLootedCount++;
                }
            }



            await TransactionLog.create([{
                guildId,
                type: 'loot_claim',
                description: `[${player.characterName}] klaim loot dari ${pool.deceasedCharacterName}.`
            }], { session });

            successMessage = `Berhasil mengambil loot dari ${pool.deceasedCharacterName}. ${petLootedCount < pool.pets.length ? 'Beberapa pet tidak diambil karena kapasitas penuh.' : ''}`;
        });

        res.json({
            success: true,
            message: successMessage
        });

    } catch (error) {
        if (error instanceof CustomError) {
             return res.status(error.statusCode).json({ error: error.message });
        }
        console.error('[API-PLAYER] Error claiming loot:', error);
        res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
    } finally {
        if (typeof releaseLock === 'function') releaseLock();
    }
});

// Endpoint: POST /api/player/daily
router.post('/daily', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const lockKey = `daily_claim_${userId}`;
    const releaseLock = await LockManager.acquire(lockKey);

    const STREAK_REWARDS = [
        { type: 'copper', amount: 10, label: '10 Copper Coins (铜币)' },
        { type: 'copper', amount: 20, label: '20 Copper Coins (铜币)' },
        { type: 'copper', amount: 40, label: '40 Copper Coins (铜币)' },
        { type: 'copper', amount: 50, label: '50 Copper Coins (铜币)' },
        { type: 'copper', amount: 60, label: '60 Copper Coins (铜币)' },
        { type: 'copper', amount: 80, label: '80 Copper Coins (铜币)' },
        { type: 'silver', amount: 1, label: '1 Silver Tael (银两)' }
    ];

    try {
        const playerRef = await Player.findOne({ discordId: userId }).select('guildId').lean();
        const guildId = req.user.guildId || (playerRef ? playerRef.guildId : userId);

        const rewardData = await withTransaction(async (session) => {
            const player = await Player.findOne({ discordId: userId, guildId }).session(session);
            if (!player) throw new CustomError('Karakter tidak ditemukan. Silakan registrasi karakter baru di menu pendaftaran.', 404);
            if (player.status !== 'active') throw new CustomError(`Karaktermu berstatus ${player.status}.`, 403);

            if (isClaimedToday(player.lastDailyClaim)) {
                throw new CustomError('Kamu sudah klaim daily hari ini. Reset pada jam 00:00 WIB.', 400);
            }

            if (isClaimedYesterday(player.lastDailyClaim)) {
                player.dailyStreak += 1;
                if (player.dailyStreak > 7) {
                    player.dailyStreak = 1;
                }
            } else {
                player.dailyStreak = 1;
            }

            const rewardIndex = player.dailyStreak - 1;
            const reward = STREAK_REWARDS[rewardIndex];

            player.currency[reward.type] += reward.amount;
            player.lastDailyClaim = new Date();
            player.markModified('currency');
            await player.save({ session });

            await TransactionLog.create([{
                guildId,
                type: 'daily_claim',
                description: `[${player.characterName}] klaim daily reward hari ke-${player.dailyStreak} (${reward.amount} ${reward.type}).`
            }], { session });
            return { reward, dailyStreak: player.dailyStreak };
        });

        res.json({ success: true, message: `Berhasil klaim daily reward hari ke-${rewardData.dailyStreak}! Kamu mendapatkan ${rewardData.reward.label}.` });
    } catch (error) {
        if (error instanceof CustomError) {
            return res.status(error.statusCode).json({ error: error.message });
        }
        console.error('[API-PLAYER] Error daily claim:', error);
        res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
    } finally {
        if (typeof releaseLock === 'function') releaseLock();
    }
});


// --- START REPAIR ASSET ---
router.post('/assets/repair', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { assetId } = req.body;

    if (!assetId) {
        return res.status(400).json({ error: 'Data tidak lengkap.' });
    }

    const lockKey = `asset_repair_${userId}_${assetId}`;
    const releaseLock = await LockManager.acquire(lockKey);
    if (!releaseLock) return res.status(429).json({ error: "Sedang memproses perbaikan. Mohon tunggu." });

    try {
        const playerRef = await Player.findOne({ discordId: userId }).select('guildId').lean();
        const guildId = req.user.guildId || (playerRef ? playerRef.guildId : userId);

        const player = await Player.findOne({ discordId: userId, guildId }).populate('assets.assetId');
        if (!player) return res.status(404).json({ error: 'Karakter tidak ditemukan. Silakan registrasi karakter baru di menu pendaftaran.' });

        const assetConfig = await Asset.findById(assetId);
        if (!assetConfig) return res.status(404).json({ error: 'Data master aset tidak ditemukan.' });

        const ownedAsset = player.assets.find(a => a.assetId._id.equals(assetConfig._id) || a.assetId.equals(assetConfig._id));
        if (!ownedAsset) return res.status(400).json({ error: 'Kamu tidak memiliki aset tersebut.' });
        if (!ownedAsset.isDamaged) return res.status(400).json({ error: 'Aset tersebut tidak sedang rusak.' });

        const { neededMaterials, repairCostInCopper } = calculateRepairCost(assetConfig);

        let repairCostLog = "";

        if (neededMaterials.length > 0) {
            // Check inventory
            for (const mat of neededMaterials) {
                const owned = player.inventory.find(i => String(i.itemId._id || i.itemId) === String(mat.itemId._id || mat.itemId));
                const available = owned ? owned.quantity : 0;
                if (available < mat.quantity) {
                    return res.status(400).json({ error: `Kekurangan material ${mat.itemName}. Butuh: ${mat.quantity}, Milikmu: ${available}.` });
                }
            }

            // Deduct
            for (const mat of neededMaterials) {
                const ownedIndex = player.inventory.findIndex(i => String(i.itemId._id || i.itemId) === String(mat.itemId._id || mat.itemId));
                if (ownedIndex !== -1) {
                    player.inventory[ownedIndex].quantity -= mat.quantity;
                    if (player.inventory[ownedIndex].quantity <= 0) {
                        player.inventory.splice(ownedIndex, 1);
                    }
                }
                repairCostLog += `${mat.quantity}x ${mat.itemName}, `;
            }
        } else {
            if (!hasEnoughCurrency(player.currency, repairCostInCopper, 'copper')) {

                const costStr = formatCurrencyString(convertFromCopper(repairCostInCopper));
            }
            if (!payCurrency(player.currency, repairCostInCopper, 'copper')) {
                return res.status(400).json({ error: 'Gagal memotong uang untuk biaya perbaikan.' });
            }

            repairCostLog = formatCurrencyString(convertFromCopper(repairCostInCopper));
        }
        ownedAsset.isDamaged = false;
        ownedAsset.isHalted = false;
        ownedAsset.damageType = null;
        ownedAsset.lastProgressUpdate = new Date();

        player.markModified('currency');
        player.markModified('inventory');
        await player.save();


        try {
            const client = req.discordClient || req.app.get('client');
            if (client && client.user) {
                await logTransaction(client, {
                    guildId,
                    type: 'player_repair_asset',
                    fromUserId: userId,
                    amount: repairCostInCopper,
                    currency: 'copper',
                    itemDescription: `Repair asset: ${assetConfig.name}. Cost: ${repairCostLog}`
                });
            }
        } catch (e) {
            console.error('[API-PLAYER] Gagal mencatat log perbaikan:', e);
        }

        res.json({ success: true, message: 'Aset berhasil diperbaiki.', cost: repairCostLog });

    } catch (error) {
        console.error('[API-PLAYER] Error repairing asset:', error);
        res.status(500).json({ error: 'Terjadi kesalahan internal server saat memperbaiki aset.' });
    } finally {
        if (typeof releaseLock === 'function') releaseLock();
    }
});
// --- END REPAIR ASSET ---

// --- START GUARD ASSET ---
router.post('/assets/guard', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { assetId, hari } = req.body;

    if (!assetId || !hari || hari < 1) {
        return res.status(400).json({ error: 'Data tidak lengkap atau durasi tidak valid.' });
    }

    const lockKey = `asset_guard_${userId}_${assetId}`;
    const releaseLock = await LockManager.acquire(lockKey);
    if (!releaseLock) return res.status(429).json({ error: "Sedang memproses penyewaan guard. Mohon tunggu." });

    try {
        const playerRef = await Player.findOne({ discordId: userId }).select('guildId').lean();
        const guildId = req.user.guildId || (playerRef ? playerRef.guildId : userId);

        const player = await Player.findOne({ discordId: userId, guildId }).populate('assets.assetId');
        if (!player) return res.status(404).json({ error: 'Karakter tidak ditemukan. Silakan registrasi karakter baru di menu pendaftaran.' });

        const assetConfig = await Asset.findById(assetId);
        if (!assetConfig) return res.status(404).json({ error: 'Data master aset tidak ditemukan.' });

        const ownedAsset = player.assets.find(a => a.assetId._id.equals(assetConfig._id) || a.assetId.equals(assetConfig._id));
        if (!ownedAsset) return res.status(400).json({ error: 'Kamu tidak memiliki aset tersebut.' });
        if (ownedAsset.status !== 'active') return res.status(400).json({ error: 'Aset belum selesai dibangun, tidak bisa dijaga.' });
        // Guard allowed while damaged for protection





        const dailyCostCopper = calculateDailyGuardCost(assetConfig);
        const formattedCost = formatCurrencyString(convertFromCopper(totalCostCopper));
        if (!hasEnoughCurrency(player.currency, totalCostCopper, 'copper')) {
        }

        if (!payCurrency(player.currency, totalCostCopper, 'copper')) {
            return res.status(400).json({ error: 'Gagal memotong biaya uang.' });
        }

        const now = Date.now();
        let currentEndTime = ownedAsset.guardEndTime ? ownedAsset.guardEndTime.getTime() : now;
        if (currentEndTime < now) currentEndTime = now;

        ownedAsset.guardEndTime = new Date(currentEndTime + (hari * 24 * 3600 * 1000));

        player.markModified('currency');
        await player.save();


        try {
            const client = req.discordClient || req.app.get('client');
            if (client && client.user) {
                await logTransaction(client, {
                    guildId,
                    type: 'player_guard_asset',
                    fromUserId: userId,
                    currency: 'copper',
                    itemDescription: `Guard asset: ${assetConfig.name} for ${hari} days. Cost: ${formattedCost}`
                });
            }
        } catch (logError) {
            console.error('[API-PLAYER] Warning: Failed to log transaction for asset guard:', logError);
        }

        res.json({ message: `Berhasil menyewa guard untuk ${hari} hari.`, guardEndTime: ownedAsset.guardEndTime, cost: formattedCost });

    } catch (error) {
        console.error('[API-PLAYER] Error guarding asset:', error);
        res.status(500).json({ error: 'Terjadi kesalahan internal server saat menyewa guard.' });
    } finally {
        if (typeof releaseLock === 'function') releaseLock();
    }
});
// --- END GUARD ASSET ---

// --- START GUARD COST ---
router.post('/assets/guard-cost', authenticateToken, async (req, res) => {
    const { assetId, hari } = req.body;
    let hariParsed = parseInt(hari);
    if (!assetId || isNaN(hariParsed) || hariParsed < 1) {
        return res.status(400).json({ error: 'Data tidak lengkap atau durasi tidak valid.' });
    }
    try {
        const playerRef = await Player.findOne({ discordId: req.user.userId }).select('guildId').lean();
        const guildId = req.user.guildId || (playerRef ? playerRef.guildId : req.user.userId);
        const player = await Player.findOne({ discordId: req.user.userId, guildId }).populate('assets.assetId');
        if (!player) return res.status(404).json({ error: 'Karakter tidak ditemukan. Silakan registrasi karakter baru di menu pendaftaran.' });
        const ownedAsset = player.assets.find(a => (a.assetId && a.assetId._id && a.assetId._id.equals(assetId)) || (a.assetId && a.assetId.equals && a.assetId.equals(assetId)));
        if (!ownedAsset) return res.status(400).json({ error: 'Kamu tidak memiliki aset tersebut.' });




        const dailyCostCopper = calculateDailyGuardCost(ownedAsset.assetId);
        const totalCostCopper = dailyCostCopper * hariParsed;
        const formattedCost = formatCurrencyString(convertFromCopper(totalCostCopper));

        res.json({
            success: true,
            costCopper: totalCostCopper,
        });
    } catch (error) {
        console.error('[API-PLAYER] Error fetching guard cost:', error);
        res.status(500).json({ error: 'Terjadi kesalahan internal server saat menghitung biaya guard.' });
    }
});
// --- END GUARD COST ---

// --- START REPAIR COST ---
router.post('/assets/repair-cost', authenticateToken, async (req, res) => {
    const { assetId } = req.body;
    if (!assetId) {
        return res.status(400).json({ error: 'Data tidak lengkap.' });
    }
    try {
        const playerRef = await Player.findOne({ discordId: req.user.userId }).select('guildId').lean();
        const guildId = req.user.guildId || (playerRef ? playerRef.guildId : req.user.userId);
        const player = await Player.findOne({ discordId: req.user.userId, guildId }).populate('assets.assetId').populate('inventory.itemId');
        if (!player) return res.status(404).json({ error: 'Karakter tidak ditemukan. Silakan registrasi karakter baru di menu pendaftaran.' });
        const ownedAsset = player.assets.find(a => (a.assetId && a.assetId._id && a.assetId._id.equals(assetId)) || (a.assetId && a.assetId.equals && a.assetId.equals(assetId)));
        if (!ownedAsset) return res.status(400).json({ error: 'Kamu tidak memiliki aset tersebut.' });


        const { neededMaterials, repairCostInCopper } = calculateRepairCost(ownedAsset.assetId);



        let repairCostLog = "";
        let mode = 'currency';
        let playerCanAfford = true;
        let detailedMaterials = [];

        if (neededMaterials.length > 0) {
            neededMaterials.forEach(mat => {
                repairCostLog += `${mat.quantity}x ${mat.itemName}, `;
                const ownedQuantity = owned ? owned.quantity : 0;
                detailedMaterials.push({
                    itemId: mat.itemId,
                    itemName: mat.itemName,
                    quantity: mat.quantity,
                    ownedQuantity,
                    enough: ownedQuantity >= mat.quantity
                });
            });
            repairCostLog = repairCostLog.replace(/, $/, ""); // trim trailing comma and space
        } else {
            repairCostLog = formatCurrencyString(convertFromCopper(repairCostInCopper));
            playerCanAfford = hasEnoughCurrency(player.currency, repairCostInCopper, 'copper');
        }

        res.json({
            success: true,
            mode,
            costText: repairCostLog,
            repairCostInCopper: mode === 'currency' ? repairCostInCopper : 0,
            neededMaterials: mode === 'materials' ? detailedMaterials : undefined,
            playerCanAfford
        });
    } catch (error) {
        console.error('[API-PLAYER] Error fetching repair cost:', error);
        res.status(500).json({ error: 'Terjadi kesalahan internal server saat menghitung biaya perbaikan.' });
    }
});
// --- END REPAIR COST ---

// Hancurkan Aset (Destroy Asset)
router.post('/assets/destroy', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { assetId } = req.body;

    if (!assetId) {
        return res.status(400).json({ error: 'Data tidak lengkap.' });
    }

    const lockKey = `asset_destroy_${userId}_${assetId}`;
    const releaseLock = await LockManager.acquire(lockKey);
    if (!releaseLock) return res.status(429).json({ error: "Transaksi sedang diproses. Mohon tunggu." });

    try {
        await withTransaction(async (session) => {
            const playerRef = await Player.findOne({ discordId: userId }).select('guildId').lean();
            const guildId = req.user.guildId || (playerRef ? playerRef.guildId : userId);
            const player = await Player.findOne({ discordId: userId, guildId }).populate('assets.assetId').session(session);

            if (!player) throw new CustomError('Karakter tidak ditemukan. Silakan registrasi karakter baru di menu pendaftaran.', 404);

            const HANCURKAN_COST_SILVER = 100;


            if (!hasEnoughCurrency(player.currency, HANCURKAN_COST_SILVER, 'silver')) {
                throw new CustomError('Saldo Wealth kamu tidak cukup. Butuh setara dengan 1 Gold (100 Silver) untuk menghancurkan aset.', 400);
            }

            const assetIndex = player.assets.findIndex(a => a.assetId && a.assetId.equals(assetId));
            if (assetIndex === -1) {
                throw new CustomError('Kamu tidak memiliki aset tersebut.', 400);
            }

            const ownedAsset = player.assets[assetIndex];
            if (isUnderConstruction(ownedAsset)) {
                throw new CustomError('Aset masih dalam tahap pembangunan dan tidak bisa dihancurkan.', 400);
            }


            if (ownedAsset.assignedWorkers && ownedAsset.assignedWorkers.length > 0) {
                const workerIds = ownedAsset.assignedWorkers.map(w => w.workerId);
                await WorkerContract.updateMany(
                    { _id: { $in: workerIds }, guildId },
                    { $set: { status: 'idle', assignedAssetId: null } },
                    { session }
                );
                ownedAsset.assignedWorkers = [];
            }

            if (ownedAsset.quantity > 1) {
                ownedAsset.quantity -= 1;
            } else {
                player.assets.splice(assetIndex, 1);
            }

            if (!payCurrency(player.currency, HANCURKAN_COST_SILVER, 'silver')) {
                throw new CustomError('Saldo tidak cukup untuk biaya penghancuran.', 400);
            }

            player.markModified('currency');
            player.markModified('assets');
            await player.save({ session });


            await TransactionLog.create([{
                guildId,
                type: 'player_destroy_asset',
                description: `[${player.characterName}] menghancurkan aset ${ownedAsset.assetId.name} dengan biaya ${HANCURKAN_COST_SILVER} Silver.`,
            }], { session });
        });
        if (req.io && req.user) req.io.to(req.user.userId).emit('user_update', { message: `Berhasil menghancurkan aset.` });
        res.json({ success: true, message: `Berhasil menghancurkan aset.` });
    } catch (error) {
        if (error instanceof CustomError) {
             return res.status(error.statusCode).json({ error: error.message });
        }
        console.error('[API-PLAYER] Destroy asset error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
    } finally {
        if (typeof releaseLock === 'function') releaseLock();
    }
});


// Skills: Comprehend
router.post('/skills/comprehend', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { manualId } = req.body;

    if (!manualId) return res.status(400).json({ error: 'Data tidak lengkap.' });

    const lockKey = `skill_comprehend_${userId}`;
    const releaseLock = await LockManager.acquire(lockKey);
    if (!releaseLock) return res.status(429).json({ error: "Transaksi sedang diproses. Mohon tunggu." });

    try {
        const playerRef = await Player.findOne({ discordId: userId }).select('guildId').lean();
        const guildId = req.user.guildId || (playerRef ? playerRef.guildId : userId);
        const player = await Player.findOne({ discordId: userId, guildId }).populate('manuals.manualId');

        if (!player) return res.status(404).json({ error: 'Karakter tidak ditemukan. Silakan registrasi karakter baru di menu pendaftaran.' });

        const pm = player.manuals.find(m => m.manualId && m.manualId.equals(manualId));
        if (!pm) return res.status(400).json({ error: 'Kamu tidak memiliki manual ini.' });

                if (pm.manualId.requiredSectId) {


            const playerSect = await getPlayerSect(guildId, player.discordId);

            if (!playerSect || !playerSect._id.equals(pm.manualId.requiredSectId)) {
                await pm.manualId.populate('requiredSectId');
                const sectName = pm.manualId.requiredSectId ? pm.manualId.requiredSectId.name : 'Sekte Tersembunyi';
                return res.status(403).json({ error: `Manual ini eksklusif anggota sekte ${sectName}.` });
            }
            const rank = getPlayerSectRank(playerSect, player.discordId);
            if (!can(rank, 'learn_sect_manual')) {
                return res.status(403).json({ error: `Jabatan sektemu (${rank || 'Tidak ada'}) tidak punya akses untuk memediasikan manual ini.` });
            }
        }

        // Phase 10: Check kungfu skill requirements
        if (pm.manualId.requiredSkillType && pm.manualId.requiredSkillPoints > 0) {
            if (playerSkillPoints < pm.manualId.requiredSkillPoints) {
            }
        }

        if (pm.level >= pm.manualId.maxLevel) return res.status(400).json({ error: 'Manual ini sudah mencapai level maksimal.' });
        if (pm.isComprehending) return res.status(400).json({ error: 'Kamu sudah sedang memediasikan manual ini.' });

        const isAlreadyMeditating = player.manuals.some(m => m.isComprehending);
        if (isAlreadyMeditating) return res.status(400).json({ error: 'Kamu hanya bisa memediasikan satu manual pada satu waktu.' });

        pm.isComprehending = true;
        pm.comprehendStartTime = new Date();

        player.markModified('manuals');
        await player.save();

        if (req.io && req.user) req.io.to(req.user.userId).emit('user_update', { message: `Mulai memediasikan ${pm.manualId.name}.` });
        res.json({ success: true, message: `Mulai memediasikan ${pm.manualId.name}.` });
    } catch (error) {
        console.error('[API-PLAYER] Comprehend error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
    } finally {
        if (typeof releaseLock === 'function') releaseLock();
    }
});

// Skills: Upgrade
router.post('/skills/upgrade', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { manualId } = req.body;

    if (!manualId) return res.status(400).json({ error: 'Data tidak lengkap.' });

    const lockKey = `skill_upgrade_${userId}`;
    const releaseLock = await LockManager.acquire(lockKey);
    if (!releaseLock) return res.status(429).json({ error: "Transaksi sedang diproses. Mohon tunggu." });

    try {
        await withTransaction(async (session) => {
            const playerRef = await Player.findOne({ discordId: userId }).select('guildId').lean();
            const guildId = req.user.guildId || (playerRef ? playerRef.guildId : userId);
            const player = await Player.findOne({ discordId: userId, guildId }).populate('manuals.manualId').session(session);

            if (!player) throw new CustomError('Karakter tidak ditemukan. Silakan registrasi karakter baru di menu pendaftaran.', 404);

            const pm = player.manuals.find(m => m.manualId && m.manualId.equals(manualId));
            if (!pm) throw new CustomError('Kamu tidak memiliki manual ini.', 400);
            if (!pm.isComprehending) throw new CustomError('Kamu belum memulai comprehend untuk manual ini.', 400);

                        const m = pm.manualId;

            // Validasi Spiritual Root (e.g., fire 10, water 5, dll)
            if (m.requiredRootType && m.requiredRootLevel > 0) {
                const extRoots = (player.extendedStats && player.extendedStats.spiritualRoot) || {};
                const rawExp = Number(extRoots[m.requiredRootType]) || 0;

                const rootLevel = getKungfuLevel(rawExp).level;

                if (rootLevel < m.requiredRootLevel) {
                    throw new CustomError(
                        `Teknik **${m.name}** membutuhkan Spiritual Root ${m.requiredRootType.toUpperCase()} level ${m.requiredRootLevel}. Levelmu saat ini: ${rootLevel}.`,
                        400
                    );
                }
            }

            if (m.requiredSectId) {


                const playerSect = await getPlayerSect(guildId, player.discordId);

                if (!playerSect || !playerSect._id.equals(m.requiredSectId)) {
                    await m.populate('requiredSectId');
                    const sectName = m.requiredSectId ? m.requiredSectId.name : 'Sekte Tersembunyi';
                }
                const rank = getPlayerSectRank(playerSect, player.discordId);
                if (!can(rank, 'learn_sect_manual')) {
                    throw new CustomError(`Jabatan sektemu (${rank || 'Tidak ada'}) tidak punya akses untuk upgrade manual sekte.`, 403);
                }
            }

            const msPassed = Date.now() - new Date(pm.comprehendStartTime).getTime();
            const hoursPassed = msPassed / (1000 * 60 * 60);

            if (hoursPassed < m.timeToComprehendHours) {
                const left = m.timeToComprehendHours - hoursPassed;
            }

            const costCurrency = m.costCurrency;
            const nextLevel = pm.level + 1;
            const totalCost = m.baseCost * nextLevel;

            const costObj = {};
            costObj[costCurrency] = totalCost;

            if (!hasEnoughCurrency(player.currency, costObj)) {
                throw new CustomError(`Uangmu tidak cukup. Butuh ${totalCost} ${costCurrency}.`, 400);
            }

            if (!payCurrency(player.currency, costObj)) {
                throw new CustomError('Gagal memotong biaya uang.', 400);
            }

            pm.level = nextLevel;
            pm.isComprehending = false;
            pm.comprehendStartTime = null;

            // Phase 10: Increase Core skill upon manual upgrade success
            if (!player.kungfuSkills) player.kungfuSkills = {};

            if (m.rootType) {

                applyTrainingSpiritualRootXp(player, m.rootType, m);
            }

            player.markModified('manuals');
            player.markModified('kungfuSkills');
            player.markModified('currency');
            await player.save({ session });


            await TransactionLog.create([{
                guildId,
                type: 'comprehend_manual',
                description: `[${player.characterName}] memantapkan pemahaman ${m.name} ke level ${nextLevel}.`,
            }], { session });
        });

        if (req.io && req.user) req.io.to(req.user.userId).emit('user_update', { message: `Berhasil memantapkan pemahaman.` });
        res.json({ success: true, message: `Berhasil memantapkan pemahaman.` });
    } catch (error) {
        if (error instanceof CustomError) {
             return res.status(error.statusCode).json({ error: error.message });
        }
        res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
    } finally {
        if (typeof releaseLock === 'function') releaseLock();
    }
});




// Endpoint: GET /api/player/laws
router.get('/laws', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const playerRef = await Player.findOne({ discordId: userId }).select('guildId').lean();
        const guildId = req.user.guildId || (playerRef ? playerRef.guildId : userId);

        const laws = await Law.find({ guildId }).lean();
        res.json({ success: true, data: laws });
    } catch (error) {
        console.error('[API-PLAYER] Error fetching laws:', error);
        res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
    }
});

// Endpoint: POST /api/player/laws/learn
router.post('/laws/learn', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { lawId } = req.body;

    if (!lawId) return res.status(400).json({ error: 'ID Law tidak valid.' });

    const lockKey = `law_learn_${userId}`;
    const releaseLock = await LockManager.acquire(lockKey);
    if (!releaseLock) return res.status(429).json({ error: "Transaksi sedang diproses. Mohon tunggu." });

    try {
        await withTransaction(async (session) => {
            const playerRef = await Player.findOne({ discordId: userId }).select('guildId').lean();
            const guildId = req.user.guildId || (playerRef ? playerRef.guildId : userId);
            const player = await Player.findOne({ discordId: userId, guildId }).populate('laws').session(session);

            if (!player) throw new CustomError('Karakter tidak ditemukan. Silakan registrasi karakter baru di menu pendaftaran.', 404);

            const realmIdx = getRealmIndex(player.systemCultivation?.realm || 'Fondasi Fana (Mortal Foundation)');
            if (player.isNormalCultivator || realmIdx > 0) {
                throw new CustomError('Terlambat! Tubuh fanamu sudah beradaptasi dengan Qi biasa. Kamu tidak bisa lagi mempelajari Hukum Alam (Hanya bisa di tahap Mortal).', 400);
            }

            const lawToLearn = await Law.findOne({ _id: lawId, guildId }).session(session);
            if (!lawToLearn) throw new CustomError('Hukum Alam tidak ditemukan.', 404);

            if (player.laws.length >= 1) {
                const currentLaw = player.laws[0];
                throw new CustomError(`Jiwa fanamu hanya mampu menampung satu Hukum Alam semesta. Kamu sudah mengikat takdirmu dengan ${currentLaw.name}.`, 400);
            }

            if (player.laws.some(l => l._id.equals(lawToLearn._id))) {
                throw new CustomError('Kamu sudah memahami Hukum Alam ini.', 400);
            }

            player.laws.push(lawToLearn._id);
            await player.save({ session });
        });

        if (req.io && req.user) req.io.to(req.user.userId).emit('user_update', { message: `Berhasil mempelajari Hukum Alam.` });
        res.json({ success: true, message: `Luar biasa! Kamu berhasil memahami Hukum Alam. Fondasi jalan dewamu semakin kuat!` });
    } catch (error) {
        if (error instanceof CustomError) {
             return res.status(error.statusCode).json({ error: error.message });
        }
        console.error('[API-PLAYER] Learn law error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
    } finally {
        if (typeof releaseLock === 'function') releaseLock();
    }
});

// Endpoint: POST /api/player/laws/reset
router.post('/laws/reset', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { itemName } = req.body;

    if (!itemName) return res.status(400).json({ error: 'Nama item tidak valid.' });

    const lockKey = `law_reset_${userId}`;
    const releaseLock = await LockManager.acquire(lockKey);
    if (!releaseLock) return res.status(429).json({ error: "Transaksi sedang diproses. Mohon tunggu." });

    try {
        await withTransaction(async (session) => {
            const playerRef = await Player.findOne({ discordId: userId }).select('guildId').lean();
            const guildId = req.user.guildId || (playerRef ? playerRef.guildId : userId);
            const player = await Player.findOne({ discordId: userId, guildId }).populate('inventory.itemId').populate('laws').session(session);

            if (!player) throw new CustomError('Karakter tidak ditemukan. Silakan registrasi karakter baru di menu pendaftaran.', 404);

            if (!player.laws || player.laws.length === 0) {
                throw new CustomError('Kamu belum memahami Hukum Alam apapun untuk direset.', 400);
            }

            const inventorySlotIndex = player.inventory.findIndex(inv => inv.itemId && inv.itemId.name.toLowerCase() === itemName.toLowerCase());
            if (inventorySlotIndex === -1 || player.inventory[inventorySlotIndex].quantity <= 0) {
                throw new CustomError(`Kamu tidak memiliki item ${itemName} di inventory.`, 400);
            }

            const item = player.inventory[inventorySlotIndex].itemId;

            player.inventory[inventorySlotIndex].quantity -= 1;
            if (player.inventory[inventorySlotIndex].quantity <= 0) {
                player.inventory.splice(inventorySlotIndex, 1);
            }
            player.markModified('inventory');

            const oldLaw = player.laws[0];
            player.laws = [];
            player.markModified('laws');

            player.markModified('inventory');
            await player.save({ session });


            await TransactionLog.create([{
                guildId,
                type: 'law_reset',
                description: `[${player.characterName}] mereset Hukum Alam ${oldLaw.name} menggunakan ${item.name}.`,
            }], { session });
        });

        if (req.io && req.user) req.io.to(req.user.userId).emit('user_update', { message: `Berhasil mereset Hukum Alam.` });
        res.json({ success: true, message: `Keajaiban terjadi! Kekuatan mengalir ke seluruh meridianmu. Jiwamu disucikan kembali, menghapus ikatanmu dengan Hukum Alam sebelumnya. Kini kamu bebas mengukir takdir baru!` });
    } catch (error) {
        if (error instanceof CustomError) {
             return res.status(error.statusCode).json({ error: error.message });
        }
        console.error('[API-PLAYER] Reset law error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
    } finally {
        if (typeof releaseLock === 'function') releaseLock();
    }
});

// Endpoint: POST /api/player/transfer-item-request
router.post('/transfer-item-request', authenticateToken, async (req, res) => {
    const { targetName, itemId, quantity } = req.body;
    const userId = req.user.userId;
    if (!targetName || !itemId || !quantity || quantity <= 0) {
        return res.status(400).json({ error: 'Data tidak valid.' });
    }

    const lockKey = `player_transfer_req_${userId}`;
    const releaseLock = await LockManager.acquire(lockKey);
    if (!releaseLock) return res.status(429).json({ error: 'Transaksi sedang diproses. Mohon tunggu.' });

    try {



        await withTransaction(async (session) => {
            const playerRef = await Player.findOne({ discordId: userId }).select('guildId').lean();
            const guildId = req.user.guildId || (playerRef ? playerRef.guildId : userId);

            const sender = await Player.findOne({ discordId: userId, guildId }).session(session);
            if (!sender) throw new CustomError('Karakter tidak ditemukan. Silakan registrasi karakter baru di menu pendaftaran.', 404);
            if (sender.status !== 'active') throw new CustomError(`Karaktermu berstatus ${sender.status}.`, 403);

            const receiver = await Player.findOne({
                characterName: { $regex: new RegExp('^\\s*' + escapeRegex(targetName) + '\\s*$', 'i') },
                guildId
            }).session(session);
            if (!receiver) throw new CustomError('Karakter penerima tidak ditemukan.', 404);
            if (receiver.status !== 'active') throw new CustomError(`Penerima berstatus ${receiver.status}.`, 403);
            if (receiver.discordId === userId) throw new CustomError('Tidak bisa transfer ke diri sendiri.', 400);

            const item = await Item.findById(itemId).session(session);
            if (!item) throw new CustomError('Item tidak ditemukan.', 404);

            const owned = sender.inventory.find(i => i.itemId.toString() === itemId);
            if (!owned || owned.quantity < quantity) throw new CustomError('Item tidak cukup di inventory.', 400);

            const pajak = quantity; // 1 silver per item
                throw new CustomError(`Saldo Silver tidak cukup untuk bayar pajak (Butuh: ${pajak} Silver).`, 400);

            const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

            await TransferRequest.create([{
                guildId,
                fromUserId: sender.discordId,
                toUserId: receiver.discordId,
                type: 'item',
                itemId: item._id,
                quantity,
                taxAmount: pajak,
                expiresAt
            }], { session });

        });

        res.json({ success: true, message: `Permintaan transfer dikirim ke ${targetName}. (Berlaku 5 menit)` });
    } catch (error) {
        if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
        console.error('[API-PLAYER] Transfer item request error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan server.' });
    } finally {
        if (typeof releaseLock === 'function') releaseLock();
    }
});

// Endpoint: GET /api/player/transfer-requests
router.get('/transfer-requests', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;


        // cleanup expired
        await TransferRequest.updateMany(
            { status: 'pending', expiresAt: { $lt: new Date() } },
            { $set: { status: 'rejected' } }
        );

        const requests = await TransferRequest.find({
            toUserId: userId,
            status: 'pending',
            expiresAt: { $gte: new Date() }
        }).populate('itemId').lean();

        const formatted = await Promise.all(requests.map(async (requestItem) => {
             const sender = await Player.findOne({ discordId: requestItem.fromUserId }).select('characterName').lean();
             return {
                 id: requestItem._id,
                 senderName: sender ? sender.characterName : 'Unknown',
                 type: requestItem.type,
                 itemName: requestItem.itemId ? requestItem.itemId.name : null,
                 quantity: requestItem.quantity,
                 taxAmount: requestItem.taxAmount,
                 expiresAt: requestItem.expiresAt
             };
        }));

        res.json({ success: true, data: formatted });
    } catch (error) {
        console.error('[API-PLAYER] GET transfer requests error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan server.' });
    }
});

// Endpoint: POST /api/player/transfer-item-respond
router.post('/transfer-item-respond', authenticateToken, async (req, res) => {
    const { requestId, accept } = req.body;
    const userId = req.user.userId;

    if (!requestId || accept === undefined) return res.status(400).json({ error: 'Data tidak valid.' });

    const lockKey = `player_transfer_res_${requestId}`;
    const releaseLock = await LockManager.acquire(lockKey);
    if (!releaseLock) return res.status(429).json({ error: 'Transaksi sedang diproses.' });

    try {



        let msg = '';
        await withTransaction(async (session) => {
            const tr = await TransferRequest.findById(requestId).populate('itemId').session(session);
            if (!tr) throw new CustomError('Request tidak ditemukan.', 404);
            if (tr.toUserId !== userId) throw new CustomError('Akses ditolak.', 403);
            if (tr.status !== 'pending' || tr.expiresAt < new Date()) {
                if (tr.status === 'pending') {
                    tr.status = 'rejected';
                    await tr.save({ session });
                }
                throw new CustomError('Request sudah kedaluwarsa atau sudah diproses.', 400);
            }

            if (!accept) {
                tr.status = 'rejected';
                await tr.save({ session });
                msg = 'Permintaan transfer ditolak.';
                return;
            }

            const sender = await Player.findOne({ discordId: tr.fromUserId, guildId: tr.guildId }).session(session);
            const receiver = await Player.findOne({ discordId: tr.toUserId, guildId: tr.guildId }).session(session);

            if (!sender || sender.status !== 'active') throw new CustomError('Pengirim tidak valid/tidak aktif.', 400);
            if (!receiver || receiver.status !== 'active') throw new CustomError('Penerima tidak aktif.', 400);
            if (sender.currency.silver < tr.taxAmount) throw new CustomError('Pengirim tidak memiliki cukup Silver untuk pajak.', 400);
            const senderOwned = sender.inventory.find(i => i.itemId.toString() === tr.itemId._id.toString());

            // Deduct from sender
            sender.currency.silver -= tr.taxAmount;
            senderOwned.quantity -= tr.quantity;
            if (senderOwned.quantity <= 0) {
                sender.inventory = sender.inventory.filter(i => i.itemId.toString() !== tr.itemId._id.toString());
            }

            // Add to receiver

            const itemDoc = await Item.findById(tr.itemId._id).session(session);
            const invCheck = await canAddToInventory(receiver, [{ itemDoc, quantity: tr.quantity }]);
            if (!invCheck.ok) {
                throw new CustomError(`Inventory penerima penuh (berat ${invCheck.currentWeight}/${invCheck.capacity}).`, 400);
            }

            const receiverOwned = receiver.inventory.find(i => i.itemId.toString() === tr.itemId._id.toString());
            if (receiverOwned) {
                receiverOwned.quantity += tr.quantity;
            } else {
                receiver.inventory.push({ itemId: tr.itemId._id, quantity: tr.quantity });
            }

            sender.markModified('currency');
            sender.markModified('inventory');
            receiver.markModified('inventory');
            await sender.save({ session });
            await receiver.save({ session });

            tr.status = 'accepted';
            await tr.save({ session });

            await TransactionLog.create([{
                guildId: tr.guildId,
                type: 'transfer',
                fromUserId: sender.discordId,
                toUserId: receiver.discordId,
                itemDescription: `[WEB] Transfer ${tr.quantity}x ${tr.itemId.name} (Pajak ${tr.taxAmount} Silver)`
            }], { session });

        });

        res.json({ success: true, message: msg });
    } catch (error) {
         if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
         console.error('[API-PLAYER] Transfer item respond error:', error);
         res.status(500).json({ error: 'Terjadi kesalahan server.' });
    } finally {
        if (typeof releaseLock === 'function') releaseLock();
    }
});

// Endpoint: POST /api/player/restart-karakter
router.post('/restart-karakter', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { confirmation } = req.body;

    if (!confirmation) return res.status(400).json({ error: 'Konfirmasi tidak valid.' });

    const lockKey = `player_restart_${userId}`;
    const releaseLock = await LockManager.acquire(lockKey);
    if (!releaseLock) return res.status(429).json({ error: 'Transaksi sedang diproses. Mohon tunggu.' });

    try {


        await withTransaction(async (session) => {
            const playerRef = await Player.findOne({ discordId: userId }).select('guildId').lean();
            const guildId = req.user.guildId || (playerRef ? playerRef.guildId : userId);

            const player = await Player.findOne({ discordId: userId, guildId }).session(session);
            if (!player) throw new CustomError('Karakter tidak ditemukan. Silakan registrasi karakter baru di menu pendaftaran.', 404);

            if (player.status !== 'dead') {
                throw new CustomError('Karaktermu masih hidup! Command ini hanya untuk karakter yang sudah meninggal.', 400);
            }

            const expectedConfirmation = `${player.characterName} RESTART`;
            if (confirmation !== expectedConfirmation) {
                throw new CustomError(`Konfirmasi gagal. Ketik "${expectedConfirmation}".`, 400);
            }

            // Perform Hard Reset (simulating what the discord bot does, or typically wiping most things)
            player.status = 'active';
            player.inventory = [];
            player.pets = [];
            player.assets = [];
            player.manuals = [];
            player.laws = [];
            player.currency = { copper: 0, silver: 0, gold: 0, jade: 0, spirit: 0 };
            player.stats = { baseHp: 100, baseAtk: 15, baseDef: 10, baseSpd: 10 };
            player.systemCultivation = { realm: 'Fondasi Fana (Mortal Foundation)', stage: 0, qi: 0, lastSyncAt: new Date() };
            player.age = 16;
            player.isNormalCultivator = false;

            // Keep discordId, guildId, characterName, gender, sect, characterImage, etc.
            player.markModified('inventory');
            player.markModified('pets');
            player.markModified('assets');
            player.markModified('manuals');
            player.markModified('laws');
            player.markModified('currency');
            player.markModified('stats');
            player.markModified('systemCultivation');

            player.markModified('currency');
            await player.save({ session });


            await TransactionLog.create([{
                guildId,
                type: 'law_reset', // Close enough type for reset
                fromUserId: userId,
                description: `[WEB] Karakter direstart (Reinkarnasi)`
            }], { session });

        });

        res.json({ success: true, message: `Reinkarnasi berhasil. Selamat datang kembali.` });
    } catch (error) {
        if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
        console.error('[API-PLAYER] Restart karakter error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan server.' });
    } finally {
        if (typeof releaseLock === 'function') releaseLock();
    }
});




// Endpoint: GET /api/player/stats
router.get('/stats', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const player = await Player.findOne({ discordId: userId })
            .populate('laws')
            .populate('manuals.manualId')
            .populate('inventory.itemId')
            .lean();



        const computedStats = getComputedStats(player, player.laws, player.manuals);


        const kungfuMastery = {};
        for (const skillKey of Object.keys(KUNGFU_SKILLS)) {
            const rawExp = player.kungfuSkills ? (player.kungfuSkills[skillKey] || 0) : 0;
            const levelInfo = getKungfuLevel(rawExp);
            kungfuMastery[skillKey] = {
                ...KUNGFU_SKILLS[skillKey],
                ...levelInfo,
                weaponMasteryMultiplier: getWeaponMasteryMultiplier(levelInfo.level),
                unarmedBonus: skillKey === 'fist' ? getUnarmedBonus(levelInfo.level) : null,
                preserveChance: skillKey === 'forging' ? getToolDurabilityPreserveChance(levelInfo.level) : null,
                stealingBonus: skillKey === 'stealing' ? getStealingSuccessBonus(levelInfo.level) : null
            };
        }

        res.json({
            success: true,
            data: {
                level: player.level,
                exp: player.exp,
                levelCap: getLevelCap(getRealmIndex(player.systemCultivation?.realm || 'Fondasi Fana (Mortal Foundation)')),
                talents: player.talents,
                unallocatedTalentPoints: player.unallocatedTalentPoints,
                kungfuSkills: player.kungfuSkills,
                kungfuMastery,
                computedStats
            }
        });
    } catch (error) {
        console.error('[API-PLAYER] GET stats error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan server.' });
    }
});

// Endpoint: POST /api/player/talents/allocate
router.post('/talents/allocate', authenticateToken, async (req, res) => {
    const userId = req.user.userId;

    const lockKey = `player_talents_${userId}`;
    const releaseLock = await LockManager.acquire(lockKey);
    if (!releaseLock) return res.status(429).json({ error: 'Transaksi sedang diproses.' });

    try {
        const player = await Player.findOne({ discordId: userId });
        if (!player) return res.status(404).json({ error: 'Karakter tidak ditemukan. Silakan registrasi karakter baru di menu pendaftaran.' });

        const valStr = Number(str) || 0;
        const valAgi = Number(agi) || 0;
        const valSta = Number(sta) || 0;
        const valPow = Number(pow) || 0;
        const valInt = Number(int) || 0;
        const valMor = Number(mor) || 0;

        if (valStr < 0 || valAgi < 0 || valSta < 0 || valPow < 0 || valInt < 0 || valMor < 0) {
            return res.status(400).json({ error: 'Poin yang dialokasikan tidak boleh negatif.' });
        }

        const pointsToAllocate = valStr + valAgi + valSta + valPow + valInt + valMor;

        if (pointsToAllocate <= 0) return res.status(400).json({ error: 'Jumlah poin yang dialokasikan tidak valid.' });
        if (pointsToAllocate > player.unallocatedTalentPoints) return res.status(400).json({ error: 'Poin talent tidak mencukupi.' });

        player.unallocatedTalentPoints -= pointsToAllocate;

        if (!player.talents) player.talents = { str: 5, agi: 5, sta: 5, pow: 5, int: 5, mor: 5 };

        player.talents.str += valStr;
        player.talents.agi += valAgi;
        player.talents.sta += valSta;
        player.talents.pow += valPow;
        player.talents.int += valInt;
        player.talents.mor += valMor;

        player.markModified('talents');
        await player.save();

        res.json({ success: true, message: 'Poin talent berhasil dialokasikan.', talents: player.talents, unallocatedTalentPoints: player.unallocatedTalentPoints });
    } catch (error) {
        console.error('[API-PLAYER] POST talents allocate error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan server.' });
    } finally {
        if (typeof releaseLock === 'function') releaseLock();
    }
});

// Endpoint: GET /api/player/kungfu/mastery
// Menampilkan ringkasan tingkat kemahiran beladiri dan efek aktif
router.get('/kungfu/mastery', authenticateToken, async (req, res) => {
    try {
        const player = await Player.findOne({ discordId: req.user.userId });
        if (!player) return res.status(404).json({ error: 'Karakter tidak ditemukan. Silakan registrasi karakter baru di menu pendaftaran.' });



        const masteryData = {};
        for (const skillKey of Object.keys(KUNGFU_SKILLS)) {
            const rawExp = player.kungfuSkills ? (player.kungfuSkills[skillKey] || 0) : 0;
            const levelInfo = getKungfuLevel(rawExp);
            masteryData[skillKey] = {
                ...KUNGFU_SKILLS[skillKey],
                ...levelInfo,
                weaponMasteryMultiplier: getWeaponMasteryMultiplier(levelInfo.level),
                unarmedBonus: skillKey === 'fist' ? getUnarmedBonus(levelInfo.level) : null,
                preserveChance: skillKey === 'forging' ? getToolDurabilityPreserveChance(levelInfo.level) : null,
                stealingBonus: skillKey === 'stealing' ? getStealingSuccessBonus(levelInfo.level) : null
            };
        }

        res.json({ success: true, data: masteryData });
    } catch (error) {
        console.error('[API-PLAYER] GET kungfu mastery error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan server.' });
    }
});

// Endpoint: PATCH /api/player/profile
router.patch('/profile', authenticateToken, async (req, res) => {
    const { biography, age, gender, nickname, body } = req.body;
    const userId = req.user.userId;

    const lockKey = `player_profile_${userId}`;
    const releaseLock = await LockManager.acquire(lockKey);
    if (!releaseLock) return res.status(429).json({ error: 'Transaksi sedang diproses.' });

    try {
        const player = await Player.findOne({ discordId: userId });
        if (!player) return res.status(404).json({ error: 'Karakter tidak ditemukan. Silakan registrasi karakter baru di menu pendaftaran.' });

        if (biography !== undefined) {
             const cleanBio = escapeRegex(biography).substring(0, 500);
             player.biography = cleanBio;
        }

        if (nickname !== undefined) {
             const cleanNickname = nickname ? escapeRegex(nickname).substring(0, 32) : null;
             player.nickname = cleanNickname;
        }

        if (age !== undefined) player.age = parseInt(age);

        let mappedGender = gender;
        if (gender === 'Laki-laki') mappedGender = 'Pria';
        if (gender === 'Perempuan') mappedGender = 'Wanita';
        if (mappedGender !== undefined && ['Pria', 'Wanita'].includes(mappedGender)) player.gender = mappedGender;

        if (body !== undefined && typeof body === 'object') {

             const catalog = getGlobalAssets();
             const validKeys = (part, key) => key === null || key === '' || (catalog.body && catalog.body[part] && catalog.body[part][key] !== undefined);
             if (!player.body) player.body = {};
             // Simple key string updates as per Phase 10
             if (body.face !== undefined && validKeys('face', body.face)) player.body.face = body.face;
             if (body.hair !== undefined && validKeys('hair', body.hair)) player.body.hair = body.hair;
             if (body.cloth !== undefined && validKeys('cloth', body.cloth)) player.body.cloth = body.cloth;
             if (body.mask !== undefined && validKeys('mask', body.mask)) player.body.mask = body.mask;
             if (body.spellAvatar !== undefined && validKeys('spellAvatar', body.spellAvatar)) player.body.spellAvatar = body.spellAvatar;
             if (body.title !== undefined && validKeys('title', body.title)) player.body.title = body.title;
             if (body.avatarBorder !== undefined && validKeys('avatarBorder', body.avatarBorder)) player.body.avatarBorder = body.avatarBorder;
             if (body.chatBorder !== undefined && validKeys('chatBorder', body.chatBorder)) player.body.chatBorder = body.chatBorder;
             player.markModified('body');
        }

        await player.save();

        res.json({ success: true, message: 'Profil berhasil diperbarui.', data: { biography: player.biography, age: player.age, gender: player.gender,
            avatarUrl: player.avatarUrl,
            imageEmoji: getEmoji('avatar'),
            resolvedBody: {
              face: resolveBodyPart('face', player.body?.face),
              hair: resolveBodyPart('hair', player.body?.hair),
              cloth: resolveBodyPart('cloth', player.body?.cloth),
              mask: resolveBodyPart('mask', player.body?.mask),
              spellAvatar: resolveBodyPart('spellAvatar', player.body?.spellAvatar),
              title: resolveBodyPart('title', player.body?.title),
              avatarBorder: resolveBodyPart('avatarBorder', player.body?.avatarBorder),
              chatBorder: resolveBodyPart('chatBorder', player.body?.chatBorder)
            }, nickname: player.nickname, body: player.body } });
    } catch (error) {
        console.error('[API-PLAYER] PATCH profile error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan server.' });
    } finally {
        if (typeof releaseLock === 'function') releaseLock();
    }
});

// Endpoint: POST /api/player/finish-prologue
router.post('/finish-prologue', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const player = await Player.findOne({ discordId: userId });
        if (!player) return res.status(404).json({ error: 'Karakter tidak ditemukan. Silakan registrasi karakter baru di menu pendaftaran.' });

        player.prologueCompleted = true;
        await player.save();

        res.json({ success: true, message: 'Prologue selesai.' });
    } catch (error) {
        console.error('[API-PLAYER] POST /finish-prologue error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan server.' });
    }
});

module.exports = router;
