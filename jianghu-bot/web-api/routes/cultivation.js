
const express = require('express');
const router = express.Router();
const Player = require('../../models/Player');
const Item = require('../../models/Item');
const { authenticateToken } = require('../middlewares/auth');
const LockManager = require('../utils/lockManager');
const { calculateCurrentQi, attemptBreakthrough, SYSTEM_REALMS, updateCultivationRole, syncPlayerCultivation } = require('../../utils/cultivation');
const CustomError = require('../utils/CustomError');
const { withTransaction } = require('../utils/dbTransaction');
const { z } = require('zod');

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

        // Fetch and filter usable pills
        await player.populate({
            path: 'inventory.itemId',
            select: 'name effectType effectValue effectTierGate'
        });

        const normalizeEffectValue = (v) => {
            if (v == null) return 0;
            if (v > 0 && v <= 1) return v * 100;
            if (v > 1 && v <= 100) return v;
            return 0; // fallback or clamp
        };

        const usablePills = player.inventory
            .filter(inv => inv.itemId && inv.itemId.effectType === 'breakthrough_success_bonus' && inv.itemId.effectTierGate === (calcResult.realmIdx + 1) && inv.quantity > 0)
            .map(inv => {
                return {
                    itemId: inv.itemId._id,
                    name: inv.itemId.name,
                    count: inv.quantity,
                    effectValue: inv.itemId.effectValue || 0,
                    effectTierGate: inv.itemId.effectTierGate,
                    bonusPercent: normalizeEffectValue(inv.itemId.effectValue)
                };
            });

        const { getLevelCap } = require('../../config/leveling');
        const { calculateSurvivalHP, calculateRealmWaveDamage, runRealmTribulation } = require('../../utils/cultivation');
        const currentLevel = player.level || 1;
        const currentLevelCap = getLevelCap(calcResult.realmIdx);
        const isMaxLevelReached = currentLevel >= currentLevelCap;
        const isMajorBreakthrough = stage >= realmData.maxStage;

        // Persentase Sukses Riil (Base - Penalti Stage + Bonus Pil)
        let effectiveSuccessRate = baseSuccessRate;
        const highestPillBonus = usablePills.length > 0 ? Math.max(...usablePills.map(p => p.bonusPercent)) : 0;
        effectiveSuccessRate = Math.min(100, Math.max(1, effectiveSuccessRate + highestPillBonus));

        // Tribulasi Petir Surgawi
        const willFaceTribulation = isMajorBreakthrough && (realmData.tribulationTier > 0);
        const waveDamages = [0, 1, 2].map(w => calculateRealmWaveDamage(w, calcResult.realmIdx));
        const survivalHP = calculateSurvivalHP(player);
        const maxWaveDmg = Math.max(...waveDamages);
        const canSurviveTribulation = !willFaceTribulation || (survivalHP >= maxWaveDmg);

        // Checklist 3 Pilar Prasyarat Terobosan
        const breakthroughChecklist = [
            {
                id: 'qi',
                label: 'Akumulasi Qi Dantian Penuh',
                current: calcResult.currentQi,
                target: calcResult.maxQi,
                isMet: calcResult.isReadyForBreakthrough,
                hint: calcResult.isReadyForBreakthrough ? 'Dantian telah beresonansi 100%' : `Kurang ${(calcResult.maxQi - calcResult.currentQi).toLocaleString()} Qi`
            },
            {
                id: 'level',
                label: 'Kapasitas Fisik (Max Level Ranah)',
                current: currentLevel,
                target: currentLevelCap,
                isMet: isMaxLevelReached,
                required: isMajorBreakthrough,
                hint: isMaxLevelReached ? `Wadah fisik mencapai puncak sempurna (Lv. ${currentLevelCap})` : `Wajib mencapai Lv. ${currentLevelCap} (Kurang ${currentLevelCap - currentLevel} Level)`
            },
            {
                id: 'tribulation',
                label: willFaceTribulation ? `Tribulasi Petir: ${realmData.tribulationTitle}` : 'Penyelarasan Meridian Dantian',
                current: survivalHP,
                target: maxWaveDmg,
                isMet: canSurviveTribulation,
                required: willFaceTribulation,
                hint: willFaceTribulation 
                    ? (canSurviveTribulation ? `Survival HP (${survivalHP}) sanggup menahan Petir (${maxWaveDmg} DMG)` : `BAHAYA: Survival HP (${survivalHP}) di bawah Petir (${maxWaveDmg} DMG)! Perkuat DEF/Vitalitas`)
                    : 'Fondasi stabil tanpa sambaran petir mematikan'
            }
        ];

        const blockingReasons = [];
        if (!calcResult.isReadyForBreakthrough) {
            blockingReasons.push(`Qi dantian belum penuh (${calcResult.currentQi}/${calcResult.maxQi}).`);
        }
        if (isMajorBreakthrough && !isMaxLevelReached) {
            blockingReasons.push(`Level fisik belum maksimal (Lv. ${currentLevel}/${currentLevelCap}).`);
        }
        if (isMajorBreakthrough && calcResult.realmIdx === 0 && (!player.laws || player.laws.length === 0) && !player.isNormalCultivator) {
            blockingReasons.push(`Belum mengikat Hukum Alam di Altar 2-Slot atau memilih Jalur Kultivator Biasa.`);
        }

        const canBreakthrough = blockingReasons.length === 0;

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
                effectiveSuccessRate: effectiveSuccessRate,
                currentLevel: currentLevel,
                currentLevelCap: currentLevelCap,
                isMaxLevelReached: isMaxLevelReached,
                isMajorBreakthrough: isMajorBreakthrough,
                canBreakthrough: canBreakthrough,
                blockingReasons: blockingReasons,
                breakthroughChecklist: breakthroughChecklist,
                tribulationInfo: {
                    required: willFaceTribulation,
                    title: realmData.tribulationTitle,
                    tier: realmData.tribulationTier,
                    baseDamage: realmData.tribulationBaseDamage,
                    waveDamages: waveDamages,
                    survivalHp: survivalHP,
                    maxWaveDmg: maxWaveDmg,
                    canSurvive: canSurviveTribulation
                },
                maxStage: realmData.maxStage,
                isMaxLevel: calcResult.realmIdx === SYSTEM_REALMS.length - 1 && stage === realmData.maxStage,
                penaltyPreview: {
                    percent: 25,
                    qiAmount: Math.floor(calcResult.maxQi * 0.25)
                },
                usablePills: usablePills,
                moodCost: MOOD_COSTS.CULTIVATION_BREAKTHROUGH
            }
        });

    } catch (error) {
        console.error('[API-CULTIVATION] Error fetching cultivation profile:', error);
        res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
    }
});


// Endpoint: POST /api/cultivation/breakthrough
// Memproses aksi breakthrough dengan atau tanpa pil dari web
const breakthroughSchema = z.object({
    pillId: z.string().nullable().optional().default(null),
    forceBreakthrough: z.boolean().optional().default(false)
});

router.post('/breakthrough', authenticateToken, async (req, res) => {
    const userId = req.user.userId;

    const validation = breakthroughSchema.safeParse(req.body);
    if (!validation.success) {
         return res.status(400).json({ error: 'Payload tidak valid.' });
    }
    const { pillId, forceBreakthrough } = validation.data;

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
        let tribulationResult = null;
        let newLevelCapGranted = null;

        await withTransaction(async (session) => {
            let player = await Player.findOne({ discordId: userId, guildId }).session(session);
            if (!player) throw new CustomError('Karakter tidak ditemukan.', 404);
            if (player.status !== 'active') throw new CustomError(`Karaktermu berstatus ${player.status}.`, 403);

            const { assertMood, applyMoodDelta } = require('../../utils/moodManager');
            const { MOOD_COSTS } = require('../../config/fivePillars');
            assertMood(player, MOOD_COSTS.CULTIVATION_BREAKTHROUGH);

            const calcResult = await syncPlayerCultivation(player);

            if (!calcResult.isReadyForBreakthrough) {
                throw new CustomError('Qi kamu belum mencukupi untuk menerobos batas!', 400);
            }

            const realmData = SYSTEM_REALMS[calcResult.realmIdx];
            const isMajorBreakthrough = player.systemCultivation.stage >= realmData.maxStage;

            // SYARAT MUTLAK: Level cap wajib dicapai saat terobosan ranah besar (Major Realm Breakthrough)
            if (isMajorBreakthrough) {
                const { getLevelCap } = require('../../config/leveling');
                const currentLevelCap = getLevelCap(calcResult.realmIdx);
                const currentLevel = player.level || 1;
                if (currentLevel < currentLevelCap) {
                    throw new CustomError(
                        `Syarat Terobosan Ranah Tidak Terpenuhi: Kapasitas fisik tubuhmu belum mencapai batas maksimal ranah ini! Kamu harus mencapai Max Level ${currentLevelCap} (Level saat ini: ${currentLevel}) sebelum dapat menembus ke ranah berikutnya. Silakan berburu EXP di dunia fana/PvE untuk mematangkan wadah fisikmu.`,
                        400
                    );
                }
            }

            if (player.systemCultivation.realm === 'Fondasi Fana (Mortal Foundation)' && player.systemCultivation.stage >= 10) {
                if (!player.laws || player.laws.length === 0) {
                    if (!forceBreakthrough && !player.isNormalCultivator) {
                        throw new CustomError('PERINGATAN SURGAWI: Begitu tubuhmu dialiri Qi sejati, fondasi fanamu akan hancur dan Hukum Alam (Law) akan menolakmu selamanya. Kamu belum mengikat Hukum Alam apapun! Konfirmasi Jalur Kultivator Biasa atau gunakan flag konfirmasi jika bersedia melepas kesempatan ini.', 400);
                    } else if (forceBreakthrough && !player.isNormalCultivator) {
                        player.systemCultivation.isFlawedFoundation = true;
                    }
                }
            }
            if (calcResult.realmIdx === SYSTEM_REALMS.length - 1 && player.systemCultivation.stage === realmData.maxStage) {
                throw new CustomError('Kamu telah mencapai puncak kultivasi alam semesta!', 400);
            }

            let successBonus = 0;
            if (pillId) {
                const currentPill = player.inventory.find(i => i.itemId.toString() === pillId);
                if (!currentPill || currentPill.quantity < 1) {
                    throw new CustomError('Pil tersebut tidak ditemukan di inventory Anda.', 400);
                }

                const pillItem = await Item.findById(pillId).session(session);
                if (!pillItem || pillItem.effectType !== 'breakthrough_success_bonus') {
                    throw new CustomError('Item ini tidak bisa digunakan untuk breakthrough.', 400);
                }

                if (pillItem.effectTierGate !== (calcResult.realmIdx + 1)) {
                    throw new CustomError('Pil ini tidak cocok untuk tahapan kultivasimu saat ini.', 400);
                }

                const normalizeEffectValue = (v) => {
                    if (v == null) return 0;
                    if (v > 0 && v <= 1) return v * 100;
                    if (v > 1 && v <= 100) return v;
                    return 0; // fallback or clamp
                };

                successBonus = Math.floor(normalizeEffectValue(pillItem.effectValue));

                currentPill.quantity -= 1;
                player.markModified('inventory');
            }

            // Simulasi Tribulasi Petir Surgawi jika ini Major Breakthrough
            if (isMajorBreakthrough && realmData.tribulationTier > 0) {
                const { runRealmTribulation } = require('../../utils/cultivation');
                tribulationResult = runRealmTribulation(player, calcResult.realmIdx);

                if (!tribulationResult.survived) {
                    // Tribulasi Petir Gagal — Penalti Berat
                    penaltyAmount = Math.floor(calcResult.maxQi * 0.5);
                    player.systemCultivation.qi = Math.max(0, player.systemCultivation.qi - penaltyAmount);
                    player.systemCultivation.lastSyncAt = new Date();
                    player.markModified('systemCultivation');
                    await player.save({ session });

                    resultRealm = player.systemCultivation.realm;
                    resultStage = player.systemCultivation.stage;
                    resultMessage = `⚡ Tribulasi Petir Surgawi GAGAL! Sambaran ${tribulationResult.tribulationTitle} memecahkan pertahananmu di Gelombang ${tribulationResult.wavesCleared + 1}! Kehilangan ${penaltyAmount.toLocaleString()} Qi.`;

                    return res.json({
                        success: true,
                        isSuccess: false,
                        message: resultMessage,
                        tribulation: tribulationResult,
                        penalties: { qiLost: penaltyAmount }
                    });
                }
            }

            const attempt = attemptBreakthrough(calcResult.realmIdx, player.systemCultivation.stage, successBonus);
            isSuccess = attempt.success;

            // Deduct mood
            applyMoodDelta(player, -MOOD_COSTS.CULTIVATION_BREAKTHROUGH);

            if (isSuccess) {
                // Grant small insight
                if (!player.extendedStats) player.extendedStats = {};
                player.extendedStats.insight = (player.extendedStats.insight || 0) + 1;
                player.markModified('extendedStats');
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
                 roleUpdated = isNewRealm;

                 if (isNewRealm) {
                     const { getLevelCap } = require('../../config/leveling');
                     newLevelCapGranted = getLevelCap(newRealmIdx);
                     resultMessage = `🎉 TEROBOSAN AGUNG BERHASIL! Selamat datang di ranah ${resultRealm} (Tahap ${resultStage})! Batas Level Karaktermu kini terbuka hingga Level ${newLevelCapGranted}!`;
                 } else {
                     resultMessage = `Terobosan Berhasil! Kamu telah mencapai tingkat ${resultRealm} (Tahap ${resultStage}).`;
                 }

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
             const reqClient = req.discordClient || req.app.get('client');
             if (reqClient && reqClient.user) {
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

        if (req.io && req.user) req.io.to(req.user.userId).emit('user_update', { message: 'Terobosan berhasil!' });
        res.json({
            success: true,
            isSuccess: isSuccess,
            message: resultMessage,
            data: {
                realm: resultRealm,
                stage: resultStage,
                penalty: penaltyAmount,
                usedBonus: successBonus,
                pillConsumed: !!pillId,
                tribulation: tribulationResult,
                newLevelCap: newLevelCapGranted,
                isNewRealm: roleUpdated
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

// Endpoint: POST /api/cultivation/train
// Latihan penyerapan Qi menggunakan stamina (Mortal 1-9 & kultivator aktif)
router.post('/train', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const staminaCost = Math.max(5, Math.min(100, Math.floor(Number(req.body?.staminaCost) || 10)));

        const playerRef = await Player.findOne({ discordId: userId }).select('guildId').lean();
        const guildId = req.user.guildId || (playerRef ? playerRef.guildId : userId);

        let player = await Player.findOne({ discordId: userId, guildId });
        if (!player) return res.status(404).json({ error: 'Karakter tidak ditemukan.' });
        if (player.status !== 'active') return res.status(403).json({ error: `Karaktermu berstatus ${player.status}.` });

        const { clampStamina } = require('../../utils/stamina');
        const { current: currentStamina, max: maxStamina } = clampStamina(player);

        if (currentStamina < staminaCost) {
            return res.status(400).json({
                error: `Stamina tidak mencukupi untuk semadi (Butuh ${staminaCost} STA, tersisa ${Math.floor(currentStamina)} STA). Istirahatlah sejenak.`
            });
        }

        // Sinkronisasi kultivasi terkini
        const calcResult = await syncPlayerCultivation(player);
        const maxQi = calcResult.maxQi;
        let currentQi = calcResult.currentQi;

        if (currentQi >= maxQi) {
            return res.status(400).json({
                error: 'Dantian kamu telah terisi penuh oleh Qi! Waktunya untuk melakukan terobosan tahap (Breakthrough).'
            });
        }

        // Potong stamina
        player.currentStamina = Math.max(0, currentStamina - staminaCost);

        // Hitung Qi yang diperoleh dari semadi stamina
        const baseRate = Math.max(1, calcResult.ratePerMinute || 1);
        const qiGained = Math.max(15, Math.floor(staminaCost * baseRate * 5));
        
        currentQi = Math.min(maxQi, currentQi + qiGained);
        player.systemCultivation.qi = currentQi;
        player.systemCultivation.lastSyncAt = new Date();

        player.markModified('systemCultivation');
        await player.save();

        const isReady = currentQi >= maxQi;

        res.json({
            success: true,
            message: `🧘 Kamu memusatkan pikiran dan melancarkan sirkulasi Qi! Menghabiskan ${staminaCost} Stamina dan menyerap +${qiGained.toLocaleString()} Qi ke dalam dantian.${isReady ? ' ✨ Dantian bergemuruh! Kamu telah siap melakukan terobosan tahap!' : ''}`,
            data: {
                currentQi,
                maxQi,
                qiGained,
                staminaCost,
                currentStamina: Math.floor(player.currentStamina),
                maxStamina: Math.floor(maxStamina),
                isReadyForBreakthrough: isReady
            }
        });
    } catch (err) {
        console.error('[API-CULTIVATION] POST /train error:', err);
        res.status(500).json({ error: 'Gagal melakukan semadi latihan Qi.' });
    }
});

module.exports = router;
