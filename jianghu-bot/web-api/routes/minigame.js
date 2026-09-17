/**
 * minigame.js
 * Modul Authoritative Server untuk Validasi Hasil Tiga Minigame Kultivasi:
 * 1. Resonansi Titik Akupunktur (Acupoint Pulse Tracing)
 * 2. Sinkronisasi Kuda-Kuda Silat (Kata Alignment QTE)
 * 3. Pengendalian Tungku Alkimia (Crucible Yin-Yang Equilibrium)
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth');
const Player = require('../../models/Player');
const Item = require('../../models/Item');

/**
 * 1. SUBMIT HASIL MINIGAME RESONANSI TITIK AKUPUNKTUR
 */
router.post('/acupoint/submit', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { accuracyPercent = 0, perfectHits = 0, totalNodes = 12 } = req.body;

        const player = await Player.findOne({ discordId: userId });
        if (!player) return res.status(404).json({ error: 'Karakter tidak ditemukan' });

        const accuracy = Math.min(100, Math.max(0, parseFloat(accuracyPercent)));
        const isPureResonance = accuracy >= 90;
        const isGoodResonance = accuracy >= 65;

        let expGain = Math.round(50 * (accuracy / 100));
        let neigongPoints = Math.round(150 * (accuracy / 100));
        let message = '';
        let meridianHealed = false;

        if (isPureResonance) {
            expGain = Math.round(expGain * 3.0); // +300%
            neigongPoints = Math.round(neigongPoints * 3.0);
            message = 'Luar Biasa! Tercipta Resonansi Meridian Murni. Sirkulasi Qi berlipat ganda 300%!';
            // Sembuhkan Kerusakan Meridian jika ada
            if (player.thermalState?.hasMeridianDamage) {
                player.thermalState.hasMeridianDamage = false;
                player.thermalState.consecutiveBreachTicks = 0;
                meridianHealed = true;
                message += ' Kerusakan Meridian tubuhmu telah pulih seutuhnya!';
            }
        } else if (isGoodResonance) {
            message = `Sirkulasi napas Qi mengalir harmonis. Kamu memperoleh ${neigongPoints} Poin Kemahiran Neigong.`;
        } else {
            message = 'Aliran Qi tersendat di beberapa simpul. Teruslah berlatih untuk menyelaraskan pernapasan batin.';
        }

        // Tambahkan Qi & Exp
        if (!player.systemCultivation) {
            player.systemCultivation = { qi: 0, realm: 'Mortal', stage: 0 };
        }
        player.systemCultivation.qi = (player.systemCultivation.qi || 0) + expGain;
        player.kungfuSkills = player.kungfuSkills || {};
        player.kungfuSkills.special = (player.kungfuSkills.special || 0) + Math.round(neigongPoints / 20);

        await player.save();

        res.json({
            success: true,
            isPureResonance,
            meridianHealed,
            expGain,
            neigongPoints,
            message,
            playerState: {
                qi: player.systemCultivation.qi,
                hasMeridianDamage: Boolean(player.thermalState?.hasMeridianDamage)
            }
        });
    } catch (error) {
        console.error('[MINIGAME-ACUPOINT] Error:', error);
        res.status(500).json({ error: 'Gagal memproses hasil latihan akupunktur' });
    }
});

/**
 * 2. SUBMIT HASIL MINIGAME KATA ALIGNMENT QTE
 */
router.post('/kata/submit', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { discipline = 'sword', streakCount = 0, successCount = 0 } = req.body;

        const player = await Player.findOne({ discordId: userId });
        if (!player) return res.status(404).json({ error: 'Karakter tidak ditemukan' });

        const validDisciplines = ['sword', 'saber', 'fist', 'finger', 'staff'];
        const skillKey = validDisciplines.includes(discipline) ? discipline : 'sword';

        const streaks = Math.max(0, parseInt(streakCount) || 0);
        const successes = Math.max(0, parseInt(successCount) || 0);

        // Kombo menghasilkan poin kemahiran setara penggunaan bertarung berkali-kali
        const proficiencyPoints = Math.round((successes * 20) + (streaks * 15));
        const aptitudeGain = Math.min(5, Math.floor(streaks / 4));

        player.kungfuSkills = player.kungfuSkills || {};
        player.kungfuSkills[skillKey] = (player.kungfuSkills[skillKey] || 0) + aptitudeGain;

        await player.save();

        res.json({
            success: true,
            discipline: skillKey,
            proficiencyPoints,
            aptitudeGain,
            currentAptitude: player.kungfuSkills[skillKey],
            message: `Latihan rangkaian jurus selesai! Kamu meraih ${proficiencyPoints} Poin Kemahiran (${streaks}x Max Combo). Kemahiran senjata meningkat +${aptitudeGain}!`
        });
    } catch (error) {
        console.error('[MINIGAME-KATA] Error:', error);
        res.status(500).json({ error: 'Gagal memproses hasil latihan jurus silat' });
    }
});

/**
 * 3. SUBMIT HASIL MINIGAME PENGENDALIAN TUNGKU ALKIMIA
 */
router.post('/crucible/submit', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { durationInEquilibriumSec = 0, isExploded = false } = req.body;

        const player = await Player.findOne({ discordId: userId });
        if (!player) return res.status(404).json({ error: 'Karakter tidak ditemukan' });

        if (isExploded) {
            // Tungku meledak: karakter kehilangan sedikit HP akibat hawa panas
            if (player.currentHp !== null && player.currentHp !== undefined) {
                player.currentHp = Math.max(1, player.currentHp - 15);
            }
            await player.save();
            return res.json({
                success: false,
                isExploded: true,
                message: '💥 Kuali meledak akibat deviasi suhu Yin-Yang! Ramuan obat hangus dan kamu menderita luka bakar ringan (-15 HP).'
            });
        }

        const equilibriumSec = Math.min(30, Math.max(0, parseFloat(durationInEquilibriumSec)));
        const purityPercent = Math.min(100, Math.round((equilibriumSec / 30) * 100));

        let pillGrade = 'Pil Roh Kualitas Rendah';
        let qualityTier = 'low';
        let qiBonus = 50;

        if (purityPercent >= 90) {
            pillGrade = 'Pil Intisari Roh Kualitas Puncak (Top-Grade Spirit Pill)';
            qualityTier = 'top';
            qiBonus = 350;
        } else if (purityPercent >= 65) {
            pillGrade = 'Pil Roh Kualitas Menengah (Mid-Grade Spirit Pill)';
            qualityTier = 'mid';
            qiBonus = 180;
        }

        // Tambahkan Exp Alkimia
        if (!player.professions) player.professions = {};
        if (!player.professions.alchemy) player.professions.alchemy = { level: 1, exp: 0, isUnlocked: true };
        player.professions.alchemy.exp += 35;

        // Berikan Pil ke inventaris pemain
        let spiritPillItem = await Item.findOne({ name: 'Pil Pemulihan Meridian' }) || await Item.findOne();
        if (spiritPillItem) {
            if (!player.inventory) player.inventory = [];
            const existingSlot = player.inventory.find(i => i.itemId && i.itemId.toString() === spiritPillItem._id.toString());
            if (existingSlot) {
                existingSlot.quantity = (existingSlot.quantity || 1) + 1;
            } else {
                player.inventory.push({ itemId: spiritPillItem._id, quantity: 1 });
            }
        }

        // Berikan Qi langsung dari konsumsi hawa tungku murni
        if (player.systemCultivation) {
            player.systemCultivation.qi = (player.systemCultivation.qi || 0) + qiBonus;
        }

        await player.save();

        res.json({
            success: true,
            isExploded: false,
            purityPercent,
            pillGrade,
            qualityTier,
            qiBonus,
            message: `Peleburan sukses sempurna! Dihasilkan ${pillGrade} dengan kemurnian ${purityPercent}%. Hawa aromatik tungku menambah +${qiBonus} Qi!`
        });
    } catch (error) {
        console.error('[MINIGAME-CRUCIBLE] Error:', error);
        res.status(500).json({ error: 'Gagal memproses hasil peleburan alkimia' });
    }
});

/**
 * 4. SUBMIT HASIL MINIGAME MEMASAK (WOK HEI & SEASONING)
 */
router.post('/cooking/submit', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { scorePercent = 0, perfectSeasonings = 0, dishName = 'Sup Ikan Mas' } = req.body;

        const player = await Player.findOne({ discordId: userId });
        if (!player) return res.status(404).json({ error: 'Karakter tidak ditemukan' });

        const score = Math.min(100, Math.max(0, parseFloat(scorePercent)));
        const isMasterDish = score >= 85;

        // Berikan EXP Memasak
        if (!player.professions) player.professions = {};
        if (!player.professions.cooking) player.professions.cooking = { level: 1, exp: 0, isUnlocked: true };
        
        const expGain = isMasterDish ? 45 : 25;
        player.professions.cooking.exp += expGain;

        // Pulihkan Stamina instan dari aroma masakan
        const staminaGain = isMasterDish ? 30 : 15;
        if (player.currentStamina !== undefined && player.maxStamina !== undefined) {
            player.currentStamina = Math.min(player.maxStamina, (player.currentStamina || 0) + staminaGain);
        }

        // Berikan item makanan ke inventory
        const finalDish = isMasterDish ? `Kelezatan Sempurna: ${dishName}` : dishName;
        let foodItem = await Item.findOne({ name: dishName }) || await Item.findOne({ type: 'consumable' });
        if (foodItem) {
            if (!player.inventory) player.inventory = [];
            const existingSlot = player.inventory.find(i => i.itemId && i.itemId.toString() === foodItem._id.toString());
            if (existingSlot) {
                existingSlot.quantity = (existingSlot.quantity || 1) + 1;
            } else {
                player.inventory.push({ itemId: foodItem._id, quantity: 1 });
            }
        }

        await player.save();

        res.json({
            success: true,
            scorePercent: score,
            isMasterDish,
            dishName: finalDish,
            staminaGain,
            expGain,
            cookingLevel: player.professions.cooking.level,
            message: `Masakan ${finalDish} selesai dengan cita rasa ${score}%! Menikmati aroma masakan memulihkan +${staminaGain} Stamina!`
        });
    } catch (error) {
        console.error('[MINIGAME-COOKING] Error:', error);
        res.status(500).json({ error: 'Gagal memproses hasil masakan' });
    }
});

/**
 * 5. SUBMIT HASIL MINIGAME PANEN HERBA (DELICATE ROOT HARVEST)
 */
router.post('/harvest/submit', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { accuracyPercent = 0, rootsIntact = true, cropName = 'Herba Rohani' } = req.body;

        const player = await Player.findOne({ discordId: userId });
        if (!player) return res.status(404).json({ error: 'Karakter tidak ditemukan' });

        const accuracy = Math.min(100, Math.max(0, parseFloat(accuracyPercent)));
        const isPristine = accuracy >= 85 && rootsIntact;

        // Berikan EXP Farming
        if (!player.professions) player.professions = {};
        if (!player.professions.farming) player.professions.farming = { level: 1, exp: 0, isUnlocked: true };
        
        const expGain = isPristine ? 40 : 20;
        player.professions.farming.exp += expGain;

        // Berikan hasil panen ke inventory
        const harvestQty = isPristine ? 2 : 1;
        let cropItem = await Item.findOne({ name: cropName }) || await Item.findOne({ type: 'material' });
        if (cropItem) {
            if (!player.inventory) player.inventory = [];
            const existingSlot = player.inventory.find(i => i.itemId && i.itemId.toString() === cropItem._id.toString());
            if (existingSlot) {
                existingSlot.quantity = (existingSlot.quantity || 1) + harvestQty;
            } else {
                player.inventory.push({ itemId: cropItem._id, quantity: harvestQty });
            }
        }

        await player.save();

        res.json({
            success: true,
            accuracyPercent: accuracy,
            isPristine,
            cropName,
            harvestQty,
            expGain,
            farmingLevel: player.professions.farming.level,
            message: isPristine
                ? `Panen Sempurna! Akar ${cropName} dicabut utuh tanpa cacat. Memperoleh ${harvestQty}x ${cropName} berkualitas tinggi (+${expGain} EXP Tani)!`
                : `Panen selesai. Berhasil mengumpulkan ${harvestQty}x ${cropName} (+${expGain} EXP Tani).`
        });
    } catch (error) {
        console.error('[MINIGAME-HARVEST] Error:', error);
        res.status(500).json({ error: 'Gagal memproses hasil panen herba' });
    }
});

module.exports = router;
