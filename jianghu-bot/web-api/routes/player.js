const express = require('express');
const router = express.Router();
const Player = require('../../models/Player');
const Asset = require('../../models/Asset');
const { authenticateToken } = require('../middlewares/auth');
const { calculateProgress } = require('../../utils/assetProgress');
const { isUnderConstruction } = require('../../utils/crafting');
const { syncWorkerContracts } = require('../../utils/workerManager');
const { isClaimedToday, isClaimedYesterday } = require('../../utils/timezone');
const LockManager = require('../utils/lockManager');
const { withTransaction } = require('../utils/dbTransaction');
const CustomError = require('../utils/CustomError');

// Endpoint: GET /api/player/transactions
router.get('/transactions', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const playerRef = await Player.findOne({ discordId: userId }).select('guildId').lean();
        const guildId = req.user.guildId || (playerRef ? playerRef.guildId : userId);

        const TransactionLog = require('../../models/TransactionLog');
        // Retrieve transactions involving this user (either explicitly or via descriptions that match their actions - simplified for now)
        // A more robust implementation would structure TransactionLog to have fromUserId and toUserId, but for now we search description
        const player = await Player.findOne({ discordId: userId, guildId }).select('characterName').lean();
        if (!player) return res.status(404).json({ error: 'Karakter tidak ditemukan.' });

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
            .select('-inventory -pets -assets') // Exclude heavy arrays for the simple profile view
            .lean();

        if (!player) {
            return res.status(404).json({ error: 'Karakter tidak ditemukan. Pastikan Anda sudah register di Discord.' });
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
                effectValue: pm.manualId.effectValue,
                triggerChance: pm.manualId.triggerChance,
                isComprehending: pm.isComprehending,
                comprehendStartTime: pm.comprehendStartTime
            };
        }).filter(m => m !== null);

        res.json({
            success: true,
            data: {
                ...player,
                manuals: formattedManuals,
                discordAvatar: discordAvatarUrl || null,
                hasCompletedTour: player.hasCompletedTour || false
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
            .populate('assets.assetId')
            .lean();

        if (!player) {
            return res.status(404).json({ error: 'Karakter tidak ditemukan.' });
        }

        const assets = player.assets.map(asset => {
            let statusLabel = 'Aktif';
            let underConstruction = false;

            if (isUnderConstruction(asset)) {
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
                recipes: asset.assetId ? asset.assetId.recipes : []
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
        if (!player) return res.status(404).json({ error: 'Karakter tidak ditemukan.' });
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

        const { hasEnoughCurrency, payCurrency } = require('../../utils/currency');
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
           if (silver > 0) costStr.push(`${silver} Silver`);

           return res.status(400).json({ error: `Saldo Wealth kamu tidak cukup. Butuh ${costStr.join(' ')} untuk unlock slot aset ke-${currentSlots + 1}.` });
        }

        // Deduct wealth
        if (!payCurrency(player.currency, costSilver, 'silver')) {
           return res.status(400).json({ error: `Uang tidak cukup. Butuh setara dengan ${costSilver} Silver.` });
        }

        player.assetSlots = currentSlots + 1;
        await player.save();

        const { logTransaction } = require('../../utils/logger');
        // Using shop_purchase as per user instruction
        await logTransaction(req.app.get('client'), {
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
        if (!player) return res.status(404).json({ error: 'Karakter tidak ditemukan.' });

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

        const totalCost = durasi * 5;
        const { payCurrency } = require('../../utils/currency');
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
        const playerRef = await Player.findOne({ discordId: userId }).select('guildId').lean();
        const guildId = req.user.guildId || (playerRef ? playerRef.guildId : req.user.userId);
        const { assetId } = req.body;

        if (!assetId) {
            return res.status(400).json({ error: 'Data tidak lengkap.' });
        }

        const player = await Player.findOne({ discordId: userId, guildId });
        if (!player) return res.status(404).json({ error: 'Karakter tidak ditemukan.' });

        const Asset = require('../../models/Asset');
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
        const WorkerContract = require('../../models/WorkerContract');
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
        const guildId = req.user.guildId || (playerRef ? playerRef.guildId : req.user.userId);const { assetId, workerId, durasi } = req.body;

        if (!assetId || !workerId || !durasi || durasi < 1) {
            return res.status(400).json({ error: 'Data tidak lengkap.' });
        }

        const WorkerContract = require('../../models/WorkerContract');
        const contract = await WorkerContract.findOne({ _id: workerId, guildId, status: 'available' });
        if (!contract) return res.status(400).json({ error: 'Pekerja tidak tersedia.' });

        if (durasi > contract.maxDurationHours) {
            return res.status(400).json({ error: `Durasi melebihi batas maksimal pekerja (${contract.maxDurationHours} jam).` });
        }
        if (contract.workerId === userId) {
            return res.status(400).json({ error: 'Tidak bisa menyewa diri sendiri.' });
        }

        const player = await Player.findOne({ discordId: userId, guildId });
        if (!player) return res.status(404).json({ error: 'Karakter tidak ditemukan.' });

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

        const totalCost = durasi * contract.pricePerHour;
        const { payCurrency } = require('../../utils/currency');
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
        const guildId = req.user.guildId || (playerRef ? playerRef.guildId : req.user.userId);const { targetAssetId, workerId } = req.body;

        if (!targetAssetId || !workerId) return res.status(400).json({ error: 'Data tidak lengkap.' });

        const player = await Player.findOne({ discordId: userId, guildId });
        if (!player) return res.status(404).json({ error: 'Karakter tidak ditemukan.' });

        const WorkerContract = require('../../models/WorkerContract');
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
            .select('characterName characterImage sect status realm stage totalWealth assets pets customStatus')
            .lean();

        if (!player) {
            return res.status(404).json({ error: 'Karakter tidak ditemukan.' });
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
                realm: player.realm,
                stage: player.stage,
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
                characterName: { $regex: new RegExp('^' + targetName + '$', 'i') },
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
                if (!senderCheck) throw new CustomError('Karakter tidak ditemukan.', 404);
                if (senderCheck.status !== 'active') throw new CustomError(`Karaktermu berstatus ${senderCheck.status}.`, 403);
                throw new CustomError(`Saldo ${currencyType} kamu tidak mencukupi.`, 400);
            }

            // Atomically add to receiver
            const addQuery = {};
            addQuery[`currency.${currencyType}`] = amount;

            await Player.updateOne(
                { _id: receiver._id },
                { $inc: addQuery },
                { session }
            );

            const TransactionLog = require('../../models/TransactionLog');
            await TransactionLog.create([{
                guildId,
                type: 'transfer',
                description: `[${sender.characterName}] mengirim ${amount} ${currencyType} kepada [${receiver.characterName}].`
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

        const LootPool = require('../../models/LootPool');
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
            const LootPool = require('../../models/LootPool');
            // Atomically lock and claim the pool
            const pool = await LootPool.findOneAndUpdate(
                { _id: poolId, guildId, targetUserId: userId, claimed: false },
                { $set: { claimed: true, claimedAt: new Date() } },
                { new: true, session }
            );

            if (!pool) throw new CustomError('Loot tidak ditemukan atau sudah diklaim.', 404);

            const player = await Player.findOne({ discordId: userId, guildId }).session(session);
            if (!player) throw new CustomError('Karakter tidak ditemukan.', 404);
            if (player.status !== 'active') throw new CustomError(`Karaktermu berstatus ${player.status}.`, 403);

            for (const c of ['copper', 'silver', 'gold', 'jade', 'spirit']) {
                player.currency[c] += pool.currency[c] || 0;
            }

            for (const it of pool.inventory) {
                const owned = player.inventory.find((i) => i.itemId.equals(it.itemId));
                if (owned) owned.quantity += it.quantity;
                else player.inventory.push({ itemId: it.itemId, quantity: it.quantity });
            }

            let petLootedCount = 0;
            const crypto = require('crypto');
            for (const p of pool.pets) {
                if (player.pets.length < 6) {
                    const transferredPet = p;
                    transferredPet.instanceId = crypto.randomUUID();
                    player.pets.push(transferredPet);
                    petLootedCount++;
                }
            }

            await player.save({ session });

            const TransactionLog = require('../../models/TransactionLog');
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
            if (!player) throw new CustomError('Karakter tidak ditemukan.', 404);
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
            await player.save({ session });

            const TransactionLog = require('../../models/TransactionLog');
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

            if (!player) throw new CustomError('Karakter tidak ditemukan.', 404);

            const HANCURKAN_COST_SILVER = 100;
            const { hasEnoughCurrency, payCurrency } = require('../../utils/currency');

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

            const WorkerContract = require('../../models/WorkerContract');
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

            await player.save({ session });

            const TransactionLog = require('../../models/TransactionLog');
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

        if (!player) return res.status(404).json({ error: 'Karakter tidak ditemukan.' });

        const pm = player.manuals.find(m => m.manualId && m.manualId.equals(manualId));
        if (!pm) return res.status(400).json({ error: 'Kamu tidak memiliki manual ini.' });
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

            if (!player) throw new CustomError('Karakter tidak ditemukan.', 404);

            const pm = player.manuals.find(m => m.manualId && m.manualId.equals(manualId));
            if (!pm) throw new CustomError('Kamu tidak memiliki manual ini.', 400);
            if (!pm.isComprehending) throw new CustomError('Kamu belum memulai comprehend untuk manual ini.', 400);

            const m = pm.manualId;
            const msPassed = Date.now() - new Date(pm.comprehendStartTime).getTime();
            const hoursPassed = msPassed / (1000 * 60 * 60);

            if (hoursPassed < m.timeToComprehendHours) {
                const left = m.timeToComprehendHours - hoursPassed;
                throw new CustomError(`Meditasi belum selesai. Tersisa sekitar ${left.toFixed(1)} jam.`, 400);
            }

            const { hasEnoughCurrency, payCurrency } = require('../../utils/currency');
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

            player.markModified('manuals');
            player.markModified('currency');
            await player.save({ session });

            const TransactionLog = require('../../models/TransactionLog');
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
        console.error('[API-PLAYER] Upgrade skill error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
    } finally {
        if (typeof releaseLock === 'function') releaseLock();
    }
});


const Law = require('../../models/Law');
const { getRealmIndex } = require('../../utils/cultivation');

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

            if (!player) throw new CustomError('Karakter tidak ditemukan.', 404);

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

            if (!player) throw new CustomError('Karakter tidak ditemukan.', 404);

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

            await player.save({ session });

            const TransactionLog = require('../../models/TransactionLog');
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
        const TransferRequest = require('../../models/TransferRequest');
        const Item = require('../../models/Item');

        await withTransaction(async (session) => {
            const playerRef = await Player.findOne({ discordId: userId }).select('guildId').lean();
            const guildId = req.user.guildId || (playerRef ? playerRef.guildId : userId);

            const sender = await Player.findOne({ discordId: userId, guildId }).session(session);
            if (!sender) throw new CustomError('Karakter tidak ditemukan.', 404);
            if (sender.status !== 'active') throw new CustomError(`Karaktermu berstatus ${sender.status}.`, 403);

            const receiver = await Player.findOne({
                characterName: { $regex: new RegExp('^' + targetName + '$', 'i') },
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
            if (sender.currency.silver < pajak) {
                throw new CustomError(`Saldo Silver tidak cukup untuk bayar pajak (Butuh: ${pajak} Silver).`, 400);
            }

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
        const TransferRequest = require('../../models/TransferRequest');

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
        const TransferRequest = require('../../models/TransferRequest');
        const TransactionLog = require('../../models/TransactionLog');

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
            if (!senderOwned || senderOwned.quantity < tr.quantity) throw new CustomError('Pengirim tidak memiliki item yang cukup.', 400);

            // Deduct from sender
            sender.currency.silver -= tr.taxAmount;
            senderOwned.quantity -= tr.quantity;
            if (senderOwned.quantity <= 0) {
                sender.inventory = sender.inventory.filter(i => i.itemId.toString() !== tr.itemId._id.toString());
            }

            // Add to receiver
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

            msg = `Berhasil menerima ${tr.quantity}x ${tr.itemId.name}.`;
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
        const { withTransaction } = require('../utils/dbTransaction');

        await withTransaction(async (session) => {
            const playerRef = await Player.findOne({ discordId: userId }).select('guildId').lean();
            const guildId = req.user.guildId || (playerRef ? playerRef.guildId : userId);

            const player = await Player.findOne({ discordId: userId, guildId }).session(session);
            if (!player) throw new CustomError('Karakter tidak ditemukan.', 404);

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
            player.realm = 'Mortal';
            player.stage = '-';
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

            await player.save({ session });

            const TransactionLog = require('../../models/TransactionLog');
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



module.exports = router;
