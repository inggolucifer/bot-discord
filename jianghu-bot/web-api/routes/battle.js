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

        const challenger = await Player.findOne({ discordId: userId, guildId })
            .populate('laws')
            .populate('manuals.manualId')
            .populate('inventory.itemId');
        if (!challenger) throw new CustomError('Karakter tidak ditemukan.', 404);
        if (challenger.status !== 'active') throw new CustomError('Karakter tidak aktif.', 403);

        const opponent = await Player.findOne({ discordId: opponentDiscordId, guildId })
            .populate('laws')
            .populate('manuals.manualId')
            .populate('inventory.itemId');
        if (!opponent) throw new CustomError('Lawan tidak ditemukan.', 404);
        if (opponent.status !== 'active') throw new CustomError('Lawan tidak aktif.', 403);

        // Simulasi Battle Turn-Based RPG
        const simResult = simulateBattle(challenger, opponent, { isPvE: false });

        challenger.currentHp = simResult.p1Hp;
        challenger.combatConditions = simResult.p1Conditions;

        // Terapkan perolehan Kungfu XP murni dari pertarungan turn-based berdasarkan senjata yang dibawa & jurus yang dipicu
        const { awardKungfuExp } = require('../../utils/kungfuMastery');
        const kungfuRewards = [];

        if (simResult.kungfuGains) {
            // EXP senjata: HANYA sesuai senjata yang sedang di-equip (atau fist jika unarmed).
            if (simResult.kungfuGains.weaponDiscipline && simResult.kungfuGains.weaponExp > 0) {
                const wRes = awardKungfuExp(challenger, simResult.kungfuGains.weaponDiscipline, simResult.kungfuGains.weaponExp, {
                    allowLevelUp: true
                });
                kungfuRewards.push({
                    skill: simResult.kungfuGains.weaponDiscipline,
                    expGained: simResult.kungfuGains.weaponExp,
                    weaponName: simResult.kungfuGains.weaponItemName || 'Tangan Kosong',
                    newLevel: wRes.newLevel,
                    levelUp: wRes.levelUp
                });
            }

            // EXP jurus tambahan: hanya jika jurus tersebut terbukti dieksekusi dalam ronde pertempuran
            if (Array.isArray(simResult.kungfuGains.usedSkills)) {
                for (const usedSkill of simResult.kungfuGains.usedSkills) {
                    if (usedSkill !== simResult.kungfuGains.weaponDiscipline && ['finger', 'fist', 'special', 'wineArt'].includes(usedSkill)) {
                        const bonusSkillExp = Math.max(5, Math.floor(simResult.kungfuGains.weaponExp * 0.5));
                        const sRes = awardKungfuExp(challenger, usedSkill, bonusSkillExp, {
                            allowLevelUp: true
                        });
                        kungfuRewards.push({
                            skill: usedSkill,
                            expGained: bonusSkillExp,
                            weaponName: 'Jurus Manual Terpicu',
                            newLevel: sRes.newLevel,
                            levelUp: sRes.levelUp
                        });
                    }
                }
            }
        }

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
                    stats: simResult.p1Stats,
                    equippedWeapon: simResult.kungfuGains?.weaponItemName || null
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
                    p2MaxHp: simResult.p2MaxHp,
                    kungfuRewards
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

// Endpoint: POST /api/battle/spar (Dihapus/Dinonaktifkan demi keaslian progres RPG)
router.post('/spar', authenticateToken, (req, res) => {
    return res.status(410).json({ 
        error: 'Fitur sparing tombol instan telah dinonaktifkan. Penguasaan kungfu dan senjata hanya bisa ditingkatkan secara menantang melalui pertarungan nyata dengan membawa perlengkapan terkait!' 
    });
});

module.exports = router;
