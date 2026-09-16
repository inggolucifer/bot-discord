const express = require('express');
const router = express.Router();
const Player = require('../../models/Player');
const { authenticateToken } = require('../middlewares/auth');
const { simulateBattle } = require('../../utils/simulateBattle');
const CustomError = require('../utils/CustomError');
const LockManager = require('../utils/lockManager');

// Endpoint: POST /api/battle/simulate
// Menerima input "opponentId", mengembalikan hasil battle lengkap (array of logs)
router.post('/simulate', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { opponentDiscordId } = req.body;

    if (!opponentDiscordId) return res.status(400).json({ error: 'Opponent ID dibutuhkan.' });
    if (userId === opponentDiscordId) return res.status(400).json({ error: 'Tidak bisa duel melawan diri sendiri.' });

    const lockKey = `player_battle_simulate_${userId}`;
    const releaseLock = await LockManager.acquire(lockKey);
    if (!releaseLock) {
         return res.status(429).json({ error: 'Pertarungan lain sedang diproses.' });
    }

    try {
        const playerRef = await Player.findOne({ discordId: userId }).select('guildId').lean();
        const guildId = req.user.guildId || (playerRef ? playerRef.guildId : userId);

        const challenger = await Player.findOne({ discordId: userId, guildId }).populate('laws').populate('manuals.manualId').lean();
        if (!challenger) throw new CustomError('Karakter tidak ditemukan.', 404);
        if (challenger.status !== 'active') throw new CustomError('Karakter tidak aktif.', 403);

        const opponent = await Player.findOne({ discordId: opponentDiscordId, guildId }).populate('laws').populate('manuals.manualId').lean();
        if (!opponent) throw new CustomError('Lawan tidak ditemukan.', 404);
        if (opponent.status !== 'active') throw new CustomError('Lawan tidak aktif.', 403);

        // Simulasi Battle
        const simResult = simulateBattle(challenger, opponent, { isPvE: false });

        challenger.currentHp = simResult.p1Hp;
        challenger.combatConditions = simResult.p1Conditions;
        await challenger.save();

        opponent.currentHp = simResult.p2Hp;
        opponent.combatConditions = simResult.p2Conditions;
        await opponent.save();

        res.json({
            success: true,
            data: {
                challenger: {
                    id: challenger.discordId,
                    name: challenger.characterName,
                    avatar: challenger.characterImage || null,
                    stats: simResult.p1Stats
                },
                opponent: {
                    id: opponent.discordId,
                    name: opponent.characterName,
                    avatar: opponent.characterImage || null,
                    stats: simResult.p2Stats
                },
                logs: simResult.logs,
                result: {
                    winner: simResult.winnerIdx === 1 ? challenger.discordId : opponent.discordId,
                    p1Hp: simResult.p1Hp,
                    p2Hp: simResult.p2Hp,
                    p1MaxHp: simResult.p1MaxHp,
                    p2MaxHp: simResult.p2MaxHp
                }
            }
        });

    } catch (error) {
        if (error instanceof CustomError) {
             return res.status(error.statusCode).json({ error: error.message });
        }
        console.error('[API-BATTLE] Error simulating battle:', error);
        res.status(500).json({ error: 'Terjadi kesalahan pada server saat simulasi.' });
    } finally {
        if (typeof releaseLock === 'function') releaseLock();
    }
});

// Endpoint: POST /api/battle/spar
// Latihan tanding (sparring) di Sasana/Arena Web untuk mengasah Kungfu Mastery secara organik
router.post('/spar', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { skill } = req.body;

    const lockKey = `player_spar_${userId}`;
    const releaseLock = await LockManager.acquire(lockKey);
    if (!releaseLock) {
         return res.status(429).json({ error: 'Sesi latihan tanding sedang berlangsung.' });
    }

    try {
        const player = await Player.findOne({ discordId: userId }).populate('inventory.itemId');
        if (!player) return res.status(404).json({ error: 'Karakter tidak ditemukan.' });

        const guildId = req.user.guildId || player.guildId || userId;

        // Tentukan skill yang dilatih (jika tidak ditentukan, gunakan senjata yang di-equip atau fist)
        const { resolveWeaponDiscipline, KUNGFU_SKILLS } = require('../../utils/kungfuMastery');
        let selectedSkill = skill;
        if (!selectedSkill || !KUNGFU_SKILLS[selectedSkill]) {
            let equippedWeapon = null;
            if (player.inventory && player.equipment?.weapon) {
                const wId = player.equipment.weapon.toString();
                const invW = player.inventory.find(i => (i._id && i._id.toString() === wId) || (i.id && i.id.toString() === wId));
                if (invW && invW.itemId) equippedWeapon = invW.itemId;
            }
            selectedSkill = resolveWeaponDiscipline(equippedWeapon);
        }

        const forageTrainingService = require('../../services/forageTrainingService');
        const sparResult = await forageTrainingService.trainKungfu(userId, guildId, selectedSkill, { bypassLocationCheck: true });

        if (!sparResult.ok) {
            return res.status(400).json({ error: sparResult.error });
        }

        res.json({
            success: true,
            message: `Berhasil menyelesaikan latihan tanding teknik ${selectedSkill.toUpperCase()}!`,
            data: sparResult
        });
    } catch (error) {
        console.error('[API-BATTLE] Error sparring:', error);
        res.status(500).json({ error: 'Terjadi kesalahan pada server saat sparring.' });
    } finally {
        if (typeof releaseLock === 'function') releaseLock();
    }
});

module.exports = router;
