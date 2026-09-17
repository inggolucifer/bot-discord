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

// --- NEW INTERACTIVE ATB BATTLE ENDPOINTS ---
const InteractiveBattleService = require('../../services/InteractiveBattleService');
const BattleSession = require('../../models/BattleSession');
const Monster = require('../../models/Monster');

// POST /api/battle/start
router.post('/start', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { targetId, targetType, zoneId } = req.body;

        const player = await Player.findOne({ discordId: userId }).populate('manuals.manualId');
        if (!player) return res.status(404).json({ error: 'Player tidak ditemukan' });

        const { getComputedStats } = require('../../utils/statCalculator');
        const computed = getComputedStats(player, player.laws || [], player.manuals || []);
        const maxHp = computed.maxHp || player.stats?.baseHp || 100;

        // Inisialisasi otomatis jika belum ada currentHp (default MongoDB null)
        if (player.currentHp === null || player.currentHp === undefined || isNaN(player.currentHp)) {
            player.currentHp = maxHp;
            await player.save();
        } else if (typeof player.currentHp === 'number' && player.currentHp <= 0) {
            return res.status(400).json({ error: 'Karaktermu sedang pingsan dan butuh pemulihan sebelum bertarung.' });
        }

        let enemies = [];
        let battleType = 'pve';

        if (targetType === 'monster') {
            const mongoose = require('mongoose');
            let monster = await Monster.findOne({
                $or: [
                    { key: targetId },
                    { name: targetId },
                    ...(mongoose.Types.ObjectId.isValid(targetId) ? [{ _id: targetId }] : [])
                ]
            });

            // Master monster catalog fallback (menjamin monster uji coba & bestiary selalu valid)
            const fallbackCatalog = {
                'wolf_azure': {
                    key: 'wolf_azure',
                    name: 'Serigala Roh Darah',
                    tier: 1,
                    statBlock: { hp: 150, atk: 20, def: 8, spd: 10 },
                    skills: [{ skillId: 'claw_strike', name: 'Cakaran Roh Darah', type: 'attack', power: 18, qiCost: 0, cooldown: 0, currentCooldown: 0 }]
                },
                'Serigala Roh Darah': {
                    key: 'wolf_azure',
                    name: 'Serigala Roh Darah',
                    tier: 1,
                    statBlock: { hp: 150, atk: 20, def: 8, spd: 10 },
                    skills: [{ skillId: 'claw_strike', name: 'Cakaran Roh Darah', type: 'attack', power: 18, qiCost: 0, cooldown: 0, currentCooldown: 0 }]
                },
                'golden_eagle': {
                    key: 'golden_eagle',
                    name: 'Elang Emas',
                    tier: 1,
                    statBlock: { hp: 100, atk: 22, def: 6, spd: 16 }
                },
                'cave_bat': {
                    key: 'cave_bat',
                    name: 'Kelelawar Gua Beracun',
                    tier: 1,
                    statBlock: { hp: 80, atk: 14, def: 6, spd: 8 }
                },
                'bandit_leader': {
                    key: 'bandit_leader',
                    name: 'Pemimpin Bandit',
                    tier: 2,
                    statBlock: { hp: 250, atk: 32, def: 18, spd: 12 }
                }
            };

            const candidate = req.body.monsterData || fallbackCatalog[targetId];

            if (!monster && candidate) {
                try {
                    const guildId = player.guildId || req.user.guildId || 'global';
                    monster = await Monster.findOneAndUpdate(
                        { guildId, key: candidate.key || targetId },
                        {
                            $setOnInsert: {
                                guildId,
                                key: candidate.key || targetId,
                                name: candidate.name || 'Monster Liar',
                                regionSlug: candidate.regionSlug || 'central_plains',
                                tier: candidate.tier || 1,
                                statBlock: {
                                    hp: candidate.hp || candidate.statBlock?.hp || 150,
                                    atk: candidate.atk || candidate.statBlock?.atk || 20,
                                    def: candidate.def || candidate.statBlock?.def || 8,
                                    spd: candidate.spd || candidate.statBlock?.spd || 10
                                },
                                isActive: true
                            }
                        },
                        { upsert: true, new: true }
                    );
                } catch (dbErr) {
                    console.warn('[API-BATTLE] Auto-seed monster fallback notice:', dbErr.message);
                }
            }

            const mData = monster || candidate;
            if (!mData) return res.status(404).json({ error: 'Monster tidak ditemukan' });

            const mHp = mData.statBlock?.hp || mData.hp || mData.stats?.hp || 150;
            const mAtk = mData.statBlock?.atk || mData.atk || mData.stats?.attack || 20;
            const mDef = mData.statBlock?.def || mData.def || mData.stats?.defense || 8;
            const mSpd = mData.statBlock?.spd || mData.spd || mData.stats?.speed || 10;
            const mSkills = (mData.skills && mData.skills.length > 0)
                ? mData.skills
                : [{ skillId: 'claw_strike', name: 'Cakaran Mematikan', type: 'attack', power: 18, qiCost: 0, cooldown: 0, currentCooldown: 0 }];

            enemies = [{
                id: mData.key || String(mData._id || targetId),
                name: mData.name || 'Monster Liar',
                level: mData.tier || mData.level || 1,
                imageUrl: mData.imageUrl || null,
                hp: mHp,
                maxHp: mHp,
                attack: mAtk,
                defense: mDef,
                speed: mSpd,
                skills: mSkills
            }];
        } else if (targetType === 'ambush') {
            enemies = [{
                id: `ambush_${Date.now()}`,
                name: req.body.enemyName || 'Musuh Ambush',
                level: player.level || 1,
                imageUrl: null,
                hp: player.maxHp * 0.8,
                maxHp: player.maxHp * 0.8,
                attack: player.stats?.attack * 0.8 || 10,
                defense: player.stats?.defense * 0.8 || 5,
                speed: player.stats?.speed * 0.8 || 5,
                skills: [
                    { skillId: 'basic_attack', name: 'Serangan Brutal', type: 'attack', power: 15, qiCost: 0, cooldown: 0, currentCooldown: 0 }
                ]
            }];
        } else if (targetType === 'player') {
            const targetPlayer = await Player.findOne({ discordId: targetId }).populate('manuals.manualId');
            if (!targetPlayer) return res.status(404).json({ error: 'Target player tidak ditemukan' });
            
            battleType = 'pvp';
            enemies = [{
                id: targetPlayer.discordId,
                name: targetPlayer.characterName || 'Pendekar',
                level: targetPlayer.level,
                imageUrl: targetPlayer.characterImage || null,
                hp: targetPlayer.currentHp || targetPlayer.maxHp,
                maxHp: targetPlayer.maxHp,
                attack: targetPlayer.stats?.attack || 10,
                defense: targetPlayer.stats?.defense || 10,
                speed: targetPlayer.stats?.speed || 10,
                qi: targetPlayer.currentQi,
                maxQi: targetPlayer.maxQi,
                stance: targetPlayer.stats?.stance || 100,
                skills: InteractiveBattleService.formatPlayerSkills(targetPlayer)
            }];
        } else {
            return res.status(400).json({ error: 'Tipe target tidak valid.' });
        }

        const session = await InteractiveBattleService.startBattle(player, enemies, battleType, zoneId);
        
        res.json({ success: true, battleId: session.battleId, session });
    } catch (err) {
        console.error('[API-BATTLE] Start Error:', err);
        res.status(400).json({ error: err.message });
    }
});

// GET /api/battle/state/:battleId
router.get('/state/:battleId', authenticateToken, async (req, res) => {
    try {
        const session = await BattleSession.findOne({ battleId: req.params.battleId });
        if (!session) return res.status(404).json({ error: 'Pertempuran tidak ditemukan' });

        // Verifikasi kepemilikan
        if (session.player.entityId !== req.user.userId) {
            return res.status(403).json({ error: 'Tidak memiliki akses ke pertempuran ini' });
        }

        res.json({ success: true, session });
    } catch (err) {
        console.error('[API-BATTLE] State Error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST /api/battle/action/:battleId
router.post('/action/:battleId', authenticateToken, async (req, res) => {
    try {
        const { actionType, skillId, targetId } = req.body;
        const battleId = req.params.battleId;
        const userId = req.user.userId;

        let session = await InteractiveBattleService.executeAction(battleId, userId, actionType, skillId, targetId);
        
        // Cek jika status menjadi won atau lost, bagikan reward
        if (session.status === 'won') {
             const player = await Player.findOne({ discordId: userId });
             if (player && session.rewards) {
                 player.exp = (player.exp || 0) + session.rewards.exp;
                 player.silver = (player.silver || 0) + session.rewards.silver;
                 player.currentHp = session.player.hp;
                 player.currentQi = session.player.qi;
                 await player.save();
             }
        } else if (session.status === 'lost') {
             const player = await Player.findOne({ discordId: userId });
             if (player) {
                 player.currentHp = 0;
                 await player.save();
             }
        }

        res.json({ success: true, session });
    } catch (err) {
        console.error('[API-BATTLE] Action Error:', err);
        res.status(400).json({ error: err.message });
    }
});

// POST /api/battle/tick/:battleId
router.post('/tick/:battleId', authenticateToken, async (req, res) => {
    try {
        const battleId = req.params.battleId;
        const userId = req.user.userId;

        const sessionCheck = await BattleSession.findOne({ battleId });
        if (!sessionCheck) return res.status(404).json({ error: 'Battle not found' });
        if (sessionCheck.player.entityId !== userId) return res.status(403).json({ error: 'Unauthorized' });

        if (sessionCheck.turnQueue.length === 0 && sessionCheck.status === 'ongoing') {
            const updatedSession = await InteractiveBattleService.processTick(battleId);
            return res.json({ success: true, session: updatedSession });
        }

        return res.json({ success: true, session: sessionCheck });
    } catch (err) {
        console.error('[API-BATTLE] Tick Error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
