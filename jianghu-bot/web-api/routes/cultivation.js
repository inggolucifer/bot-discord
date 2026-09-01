const express = require('express');
const router = express.Router();
const Player = require('../../models/Player');
const Item = require('../../models/Item');
const { authenticateToken } = require('../middlewares/auth');
const LockManager = require('../utils/lockManager');
const { calculateCurrentQi, attemptBreakthrough, SYSTEM_REALMS, updateCultivationRole, syncPlayerCultivation } = require('../../utils/cultivation');
const CustomError = require('../utils/CustomError');
const { withTransaction } = require('../utils/dbTransaction');

// Endpoint: GET /api/cultivation
// Mengambil status real-time Qi (dihitung sejak lastSyncAt)
router.get('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const playerRef = await Player.findOne({ discordId: userId }).select('guildId').lean();
        const guildId = req.user.guildId || (playerRef ? playerRef.guildId : userId);

        let player = await Player.findOne({ discordId: userId, guildId });
        if (!player) return res.status(404).json({ error: 'Karakter tidak ditemukan.' });

        // Hitung real-time QI
        const calcResult = await syncPlayerCultivation(player);

        // Simpan pembaruan untuk menjaga konsistensi state terakhir
        player.markModified('systemCultivation');
        await player.save();

        const realmName = player.systemCultivation.realm;
        const stage = player.systemCultivation.stage;
        const realmData = SYSTEM_REALMS[calcResult.realmIdx];

        // Cari Pill yang sesuai dengan Realm saat ini di Inventory
        const pillName = `Pil Terobosan: ${realmName}`;
        let pillCount = 0;
        let pillItemId = null;

        const pillItem = await Item.findOne({ name: pillName, guildId });
        if (pillItem) {
            const inventoryPill = player.inventory.find(i => i.itemId.equals(pillItem._id));
            if (inventoryPill) {
                pillCount = inventoryPill.quantity;
            }
            pillItemId = pillItem._id;
        }

        let baseSuccessRate = realmData.baseSuccessRate;
        if (stage > 0) baseSuccessRate -= (stage * 2);

        res.json({
            success: true,
            data: {
                realm: realmName,
                stage: stage,
                realmIdx: calcResult.realmIdx,
                currentQi: calcResult.currentQi,
                maxQi: calcResult.maxQi,
                ratePerMinute: calcResult.ratePerMinute,
                isReadyForBreakthrough: calcResult.isReadyForBreakthrough,
                baseSuccessRate: baseSuccessRate,
                maxStage: realmData.maxStage,
                isMaxLevel: calcResult.realmIdx === SYSTEM_REALMS.length - 1 && stage === realmData.maxStage,
                pill: {
                    name: pillName,
                    count: pillCount,
                    itemId: pillItemId
                }
            }
        });

    } catch (error) {
        console.error('[API-CULTIVATION] Error fetching cultivation profile:', error);
        res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
    }
});


// Endpoint: POST /api/cultivation/breakthrough
// Memproses aksi breakthrough dengan atau tanpa pil dari web
router.post('/breakthrough', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { usePill } = req.body; // boolean

    const lockKey = `cultivation_breakthrough_${userId}`;
    const releaseLock = await LockManager.acquire(lockKey);
    if (!releaseLock) {
         return res.status(429).json({ error: 'Terobosan sedang diproses. Mohon tunggu.' });
    }

    try {
        const playerRef = await Player.findOne({ discordId: userId }).select('guildId').lean();
        const guildId = req.user.guildId || (playerRef ? playerRef.guildId : userId);

        let resultMessage = '';
        let isSuccess = false;
        let penaltyAmount = 0;
        let resultRealm = '';
        let resultStage = 0;
        let roleUpdated = false;

        await withTransaction(async (session) => {
            let player = await Player.findOne({ discordId: userId, guildId }).session(session);
            if (!player) throw new CustomError('Karakter tidak ditemukan.', 404);
            if (player.status !== 'active') throw new CustomError(`Karaktermu berstatus ${player.status}.`, 403);

            const calcResult = calculateCurrentQi(player);

            if (!calcResult.isReadyForBreakthrough) {
                throw new CustomError('Qi kamu belum mencukupi untuk menerobos batas!', 400);
            }

            const realmData = SYSTEM_REALMS[calcResult.realmIdx];
            if (calcResult.realmIdx === SYSTEM_REALMS.length - 1 && player.systemCultivation.stage === realmData.maxStage) {
                throw new CustomError('Kamu telah mencapai puncak kultivasi alam semesta!', 400);
            }

            if (usePill) {
                const pillName = `Pil Terobosan: ${player.systemCultivation.realm}`;
                const pillItem = await Item.findOne({ name: pillName, guildId }).session(session);

                if (!pillItem) {
                     throw new CustomError('Item Pil tidak ditemukan di sistem database.', 404);
                }

                const currentPill = player.inventory.find(i => i.itemId.equals(pillItem._id));
                if (!currentPill || currentPill.quantity < 1) {
                     throw new CustomError('Kamu tidak memiliki Pil Terobosan tersebut di inventory.', 400);
                }
                currentPill.quantity -= 1;
                player.markModified('inventory');
            }

            const attempt = attemptBreakthrough(calcResult.realmIdx, player.systemCultivation.stage, usePill);
            isSuccess = attempt.success;

            if (isSuccess) {
                 let newRealmIdx = calcResult.realmIdx;
                 let newStage = player.systemCultivation.stage + 1;
                 let isNewRealm = false;

                 if (newStage > realmData.maxStage) {
                     newRealmIdx++;
                     newStage = 1;
                     isNewRealm = true;
                 }

                 player.systemCultivation.realm = SYSTEM_REALMS[newRealmIdx].name;
                 player.systemCultivation.stage = newStage;
                 player.systemCultivation.qi = 0;

                 resultRealm = player.systemCultivation.realm;
                 resultStage = newStage;
                 resultMessage = `Terobosan Berhasil! Kamu telah mencapai tingkat ${resultRealm} (Tahap ${resultStage}).`;
                 roleUpdated = isNewRealm;

            } else {
                 penaltyAmount = Math.floor(calcResult.maxQi * 0.25);
                 player.systemCultivation.qi = Math.max(0, player.systemCultivation.qi - penaltyAmount);

                 resultRealm = player.systemCultivation.realm;
                 resultStage = player.systemCultivation.stage;
                 resultMessage = `Terobosan Gagal! Pondasi spiritualmu tidak stabil. Kamu kehilangan ${penaltyAmount.toLocaleString()} Qi.`;
            }

            player.systemCultivation.lastSyncAt = new Date();
            player.markModified('systemCultivation');

            await player.save({ session });
        });

        // Update Discord Role outside transaction if it's a new realm
        if (roleUpdated && isSuccess) {
             const reqClient = req.app.get('client');
             if (reqClient) {
                 const guild = reqClient.guilds.cache.get(guildId);
                 if (guild) {
                     const member = await guild.members.fetch(userId).catch(() => null);
                     if (member) {
                         // Mocking interaction-like object for the utility
                         const mockInteraction = { guild, user: { id: userId } };
                         await updateCultivationRole(mockInteraction, resultRealm).catch(e => console.error("Update role via web failed:", e));
                     }
                 }
             }
        }

        res.json({
            success: true,
            isSuccess: isSuccess,
            message: resultMessage,
            data: {
                realm: resultRealm,
                stage: resultStage,
                penalty: penaltyAmount
            }
        });

    } catch (error) {
        if (error instanceof CustomError) {
             return res.status(error.statusCode).json({ error: error.message });
        }
        console.error('[API-CULTIVATION] Error processing breakthrough:', error);
        res.status(500).json({ error: 'Terjadi kesalahan pada server saat menerobos.' });
    } finally {
        if (typeof releaseLock === 'function') releaseLock();
    }
});

module.exports = router;
