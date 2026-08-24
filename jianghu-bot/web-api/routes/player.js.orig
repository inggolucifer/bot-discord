const express = require('express');
const router = express.Router();
const Player = require('../../models/Player');
const Asset = require('../../models/Asset');
const { authenticateToken } = require('../middlewares/auth');
const { calculateProgress } = require('../../utils/assetProgress');
const { isUnderConstruction } = require('../../utils/crafting');
const { syncWorkerContracts } = require('../../utils/workerManager');

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
                progressHours: progressHours
            };
        });

        res.json({ success: true, data: assets });
    } catch (error) {
        console.error('[API-PLAYER] Error fetching assets:', error);
        res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
    }
});

router.post('/assets/claim-profit', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        const player = await Player.findOne({ discordId: userId });
        if (!player) return res.status(404).json({ error: 'Karakter tidak ditemukan.' });
        if (player.status !== 'active') return res.status(400).json({ error: `Karaktermu berstatus ${player.status}, tidak bisa klaim.` });

        if (!player.assets.length) {
            return res.status(400).json({ error: 'Kamu belum memiliki aset apapun.' });
        }

        await syncWorkerContracts(req.discordClient, player.guildId);

        const assetDocs = await Asset.find({ _id: { $in: player.assets.map(a => a.assetId) } });
        const currencyTotals = {};
        const claimedNow = [];
        const alreadyClaimed = [];
        const underConstruction = [];

        for (const owned of player.assets) {
            const doc = assetDocs.find(d => d._id.equals(owned.assetId));
            if (!doc) continue;

            if (isUnderConstruction(owned)) {
                underConstruction.push(`${doc.name} 🚧 (Sedang dibangun / butuh worker)`);
                continue;
            }

            let hasActiveWorker = false;
            if (owned.assignedWorkers && owned.assignedWorkers.length > 0) {
                hasActiveWorker = owned.assignedWorkers.some(w => !w.endTime || w.endTime.getTime() > Date.now());
            }

            if (!doc.isCraftingStation && !hasActiveWorker) {
                underConstruction.push(`${doc.name} ⚠️ (Tidak beroperasi, butuh worker)`);
                continue;
            }

            let claimedSomething = false;
            const progressMs = calculateProgress(owned) + (owned.progressAccumulated || 0);
            const hoursPassed = Math.floor(progressMs / 3600000);

            if (hoursPassed < 1) {
                alreadyClaimed.push(doc.name);
                continue;
            }

            if (doc.dailyProfit > 0) {
                const profit = hoursPassed * doc.dailyProfit * owned.quantity;
                currencyTotals[doc.profitCurrency] = (currencyTotals[doc.profitCurrency] || 0) + profit;
                claimedNow.push(`${doc.name} x${owned.quantity} -> ${profit} ${doc.profitCurrency}`);
                claimedSomething = true;
            }

            if (doc.workerOutputItemId && doc.workerOutputQuantity > 0) {
                if (doc.workerInputMaterials && doc.workerInputMaterials.length > 0) {
                    underConstruction.push(`${doc.name} ⚙️ (Diproses otomatis)`);
                    continue;
                }

                const hasil = hoursPassed * doc.workerOutputQuantity * owned.quantity;
                const ownedItem = player.inventory.find(i => i.itemId.equals(doc.workerOutputItemId));
                if (ownedItem) ownedItem.quantity += hasil;
                else player.inventory.push({ itemId: doc.workerOutputItemId, quantity: hasil });

                claimedNow.push(`${doc.name} x${owned.quantity} -> ${hasil}x ${doc.workerOutputItemName}`);
                claimedSomething = true;
            }

            if (claimedSomething) {
                const leftoverMs = progressMs - (hoursPassed * 3600000);
                owned.progressAccumulated = leftoverMs;
                owned.lastProgressUpdate = new Date();
            }
        }

        for (const [currency, amount] of Object.entries(currencyTotals)) {
            player.currency[currency] += amount;
        }

        await player.save();

        res.json({
            success: true,
            data: {
                claimed: claimedNow,
                waiting: alreadyClaimed,
                other: underConstruction
            }
        });

    } catch (error) {
        console.error('[API-PLAYER] Error claiming profit:', error);
        res.status(500).json({ error: 'Terjadi kesalahan pada server saat klaim profit.' });
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

        const { isUnderConstruction, calculateProgress } = require('../../utils/crafting');

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

module.exports = router;
