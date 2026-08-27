const express = require('express');
const router = express.Router();
const Player = require('../../models/Player');
const Asset = require('../../models/Asset');
const { authenticateToken } = require('../middlewares/auth');
const { calculateProgress } = require('../../utils/assetProgress');
const { isUnderConstruction } = require('../../utils/crafting');
const { syncWorkerContracts } = require('../../utils/workerManager');
const { isClaimedToday } = require('../../utils/timezone');
const LockManager = require('../utils/lockManager');

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
            .select('-inventory -pets -assets') // Exclude heavy arrays for the simple profile view
            .lean();

        if (!player) {
            return res.status(404).json({ error: 'Karakter tidak ditemukan. Pastikan Anda sudah register di Discord.' });
        }

        // Inject Discord Avatar URL from the JWT payload as fallback
        const discordAvatarUrl = req.user.avatar; // Assuming we passed it during auth

        res.json({
            success: true,
            data: {
                ...player,
                discordAvatar: discordAvatarUrl || null
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
                rank: asset.assetId ? asset.assetId.rank : 'Common'
            };
        });

        res.json({ success: true, data: assets });
    } catch (error) {
        console.error('[API-PLAYER] Error fetching assets:', error);
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
            if (activeWorkers >= 1) {
                return res.status(400).json({ error: 'Aset yang sudah jadi hanya boleh maksimal memiliki 1 pekerja.' });
            }
        }

        const totalCost = durasi * 5;
        if (player.currency.silver < totalCost) {
            return res.status(400).json({ error: `Silver kamu tidak cukup. Butuh ${totalCost} Silver.` });
        }

        player.currency.silver -= totalCost;

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
            if (activeWorkers >= 1) {
                return res.status(400).json({ error: 'Aset yang sudah jadi hanya boleh maksimal memiliki 1 pekerja.' });
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
            if (activeWorkers >= 1) {
                return res.status(400).json({ error: 'Aset yang sudah jadi hanya boleh maksimal memiliki 1 pekerja.' });
            }
        }

        const totalCost = durasi * contract.pricePerHour;
        if (player.currency.silver < totalCost) {
            return res.status(400).json({ error: `Silver kamu tidak cukup. Butuh ${totalCost} Silver.` });
        }

        player.currency.silver -= totalCost;

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
            if (activeWorkers >= 1) return res.status(400).json({ error: 'Aset tujuan sudah jadi, maksimal 1 pekerja.' });
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

// Endpoint: POST /api/player/transfer
router.post('/transfer', authenticateToken, async (req, res) => {
    const { targetName, currencyType, amount } = req.body;
    const userId = req.user.userId;

    if (!targetName || !currencyType || !amount || amount <= 0 || !Number.isInteger(amount)) {
        return res.status(400).json({ error: 'Data tidak valid. Pastikan jumlah adalah angka positif utuh.' });
    }

    const validCurrencies = ['silver', 'gold', 'jade', 'spirit'];
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

        const sender = await Player.findOne({ discordId: userId, guildId });
        if (!sender) return res.status(404).json({ error: 'Karakter tidak ditemukan.' });
        if (sender.status !== 'active') return res.status(403).json({ error: `Karaktermu berstatus ${sender.status}.` });

        const receiver = await Player.findOne({
            characterName: { $regex: new RegExp('^' + targetName + '$', 'i') },
            guildId
        });

        if (!receiver) return res.status(404).json({ error: 'Karakter penerima tidak ditemukan di sekte/guild yang sama.' });
        if (receiver.status !== 'active') return res.status(403).json({ error: `Penerima berstatus ${receiver.status}.` });

        if (receiver.discordId === userId) {
            return res.status(400).json({ error: 'Tidak bisa transfer ke diri sendiri.' });
        }

        if (sender.currency[currencyType] < amount) {
            return res.status(400).json({ error: `Saldo ${currencyType} kamu tidak mencukupi.` });
        }

        // Atomically transfer
        sender.currency[currencyType] -= amount;
        receiver.currency[currencyType] += amount;

        await sender.save();
        await receiver.save();

        const TransactionLog = require('../../models/TransactionLog');
        await TransactionLog.create({
            guildId,
            type: 'transfer',
            description: `[${sender.characterName}] mengirim ${amount} ${currencyType} kepada [${receiver.characterName}].`
        });

        res.json({ success: true, message: `Berhasil mentransfer ${amount} ${currencyType} kepada ${receiver.characterName}.` });
    } catch (error) {
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

        const LootPool = require('../../models/LootPool');
        const pool = await LootPool.findOne({ _id: poolId, guildId, targetUserId: userId, claimed: false });

        if (!pool) return res.status(404).json({ error: 'Loot tidak ditemukan atau sudah diklaim.' });

        const player = await Player.findOne({ discordId: userId, guildId });
        if (!player) return res.status(404).json({ error: 'Karakter tidak ditemukan.' });
        if (player.status !== 'active') return res.status(403).json({ error: `Karaktermu berstatus ${player.status}.` });

        for (const c of ['silver', 'gold', 'jade', 'spirit']) {
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

        await player.save();

        pool.claimed = true;
        pool.claimedAt = new Date();
        await pool.save();

        const TransactionLog = require('../../models/TransactionLog');
        await TransactionLog.create({
            guildId,
            type: 'loot_claim',
            description: `[${player.characterName}] klaim loot dari ${pool.deceasedCharacterName}.`
        });

        res.json({
            success: true,
            message: `Berhasil mengambil loot dari ${pool.deceasedCharacterName}. ${petLootedCount < pool.pets.length ? 'Beberapa pet tidak diambil karena kapasitas penuh.' : ''}`
        });

    } catch (error) {
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

    try {
        const playerRef = await Player.findOne({ discordId: userId }).select('guildId').lean();
        const guildId = req.user.guildId || (playerRef ? playerRef.guildId : userId);

        const player = await Player.findOne({ discordId: userId, guildId });
        if (!player) return res.status(404).json({ error: 'Karakter tidak ditemukan.' });
        if (player.status !== 'active') return res.status(403).json({ error: `Karaktermu berstatus ${player.status}.` });

        if (isClaimedToday(player.lastDailyClaim)) {
            return res.status(400).json({ error: 'Kamu sudah klaim daily hari ini. Reset pada jam 00:00 WIB.' });
        }

        player.currency.silver += 2; // Daily reward: 2 silver
        player.lastDailyClaim = new Date();
        await player.save();

        const TransactionLog = require('../../models/TransactionLog');
        await TransactionLog.create({
            guildId,
            type: 'daily_claim',
            description: `[${player.characterName}] klaim daily reward 2 silver.`
        });

        res.json({ success: true, message: 'Berhasil klaim daily reward (2 Silver)!' });
    } catch (error) {
        console.error('[API-PLAYER] Error daily claim:', error);
        res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
    } finally {
        if (typeof releaseLock === 'function') releaseLock();
    }
});

module.exports = router;
