

const express = require('express');
const router = express.Router();
const Player = require('../../models/Player');
const { authenticateToken } = require('../middlewares/auth');
const { simulateBattle } = require('../../utils/simulateBattle');
const CustomError = require('../utils/CustomError');
const LockManager = require('../utils/lockManager');
const { awardKungfuExp } = require('../../utils/kungfuMastery');
const { applyCombatSpiritualRootXp } = require('../../utils/spiritualRootXp');
const InteractiveBattleService = require('../../services/InteractiveBattleService');
const BattleSession = require('../../models/BattleSession');
const Monster = require('../../models/Monster');
const { getComputedStats } = require('../../utils/statCalculator');
const mongoose = require('mongoose');
const { normalizeCurrency } = require('../../utils/currencyNormalize');
const Item = require('../../models/Item');
const DefeatedMonsterTile = require('../../models/DefeatedMonsterTile');
const WorldBossSeason = require('../../models/WorldBossSeason');
const ArenaLadderEntry = require('../../models/ArenaLadderEntry');







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

        const { applyVitalityLossOnDeath } = require('../../utils/vitality');
        challenger.currentHp = simResult.p1Hp;
        challenger.combatConditions = simResult.p1Conditions;

        if (challenger.currentHp <= 0) {
             applyVitalityLossOnDeath(challenger);
        }

        // Terapkan perolehan Kungfu XP murni dari pertarungan turn-based berdasarkan senjata yang dibawa & jurus yang dipicu

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

            if (simResult.kungfuGains.usedElementsCount) {

                const rootGains = applyCombatSpiritualRootXp(challenger, simResult.kungfuGains.usedElementsCount);
                for (const gain of rootGains) {
                    kungfuRewards.push({
                        skill: `Spiritual Root (${gain.element.toUpperCase()})`,
                        expGained: gain.gain,
                        weaponName: `Resonansi Elemen (${gain.casts} cast)`,
                        newLevel: '-',
                        levelUp: false
                    });
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




// POST /api/battle/start
router.post('/start', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { targetId, targetType, zoneId, tileKey, maxActiveEnemies, allyInstanceIds } = req.body;

        const player = await Player.findOne({ discordId: userId }).populate('manuals.manualId').populate('inventory.itemId');
        if (!player) return res.status(404).json({ error: 'Player tidak ditemukan' });


        const computed = getComputedStats(player, player.laws || [], player.manuals || []);
        const maxHp = computed.maxHp || player.stats?.baseHp || 100;

        const isSpiritualProjection = targetType === 'world_boss' || targetType === 'sect_arena';

        // Cek Masa Pemulihan Kematian (Death Recovery 4 Jam)
        // HANYA berlaku untuk pertarungan fisik nyata di open-world (monster liar, ambush, perkelahian terbuka).
        // Pertarungan proyeksi spiritual (World Boss & Sect Arena) menggunakan sukma dan formasi pelindung,
        // sehingga kultivator tetap dapat berpartisipasi tanpa terhalang kondisi raga fana.
        if (!isSpiritualProjection && player.deathRecoveryUntil) {
            const recoveryTime = new Date(player.deathRecoveryUntil).getTime();
            if (recoveryTime > Date.now()) {
                const remainingMs = recoveryTime - Date.now();
                return res.status(403).json({
                    code: 'DEATH_RECOVERY',
                    error: 'Karaktermu sedang dalam masa pemulihan setelah gugur dalam pertarungan fisik di dunia Jianghu. Dantian butuh istirahat.',
                    remainingMs,
                    recoveryUntil: player.deathRecoveryUntil,
                    killedBy: player.lastKilledByMonster || 'Siluman Liar'
                });
            } else {
                // Pemulihan selesai
                player.deathRecoveryUntil = null;
                if (!player.currentHp || player.currentHp <= 0) {
                    player.currentHp = Math.floor(maxHp * 0.5);
                }
                player.markModified('kungfuSkills');
                await player.save();
            }
        }

        // Inisialisasi otomatis jika belum ada currentHp (default MongoDB null)
        if (player.currentHp === null || player.currentHp === undefined || isNaN(player.currentHp)) {
            player.currentHp = maxHp;
            await player.save();
        } else if (!isSpiritualProjection && typeof player.currentHp === 'number' && player.currentHp <= 0) {
            return res.status(400).json({ error: 'Karaktermu sedang pingsan dan butuh pemulihan sebelum bertarung di dunia nyata.' });
        }

        let enemies = [];
        let battleType = 'pve';

        if (targetType === 'monster') {
            const playerZoneId = player.gridPosition?.zoneId || 'tianyuan_world_map';
            if (playerZoneId !== zoneId) {
                return res.status(400).json({ error: 'Kamu harus berada di petak yang sama untuk melakukan aksi ini.' });
            }

            if (tileKey) {
                const parts = tileKey.includes('_') ? tileKey.split('_') : tileKey.split(',');
                const [targetX, targetY] = parts.map(Number);
                const currentX = Number(player.gridPosition?.tileX ?? 0);
                const currentY = Number(player.gridPosition?.tileY ?? 0);

                if (targetX !== currentX || targetY !== currentY) {
                    return res.status(400).json({ error: 'Kamu harus berada di petak yang sama untuk melakukan aksi ini.' });
                }
            }


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
                    tierSize: 'small',
                    element: 'neutral',
                    statBlock: { hp: 150, atk: 20, def: 8, spd: 10 },
                    skills: [{ skillId: 'claw_strike', name: 'Cakaran Roh Darah', type: 'attack', power: 18, qiCost: 0, cooldown: 0, currentCooldown: 0 }]
                },
                'Serigala Roh Darah': {
                    key: 'wolf_azure',
                    name: 'Serigala Roh Darah',
                    tier: 1,
                    tierSize: 'small',
                    element: 'neutral',
                    statBlock: { hp: 150, atk: 20, def: 8, spd: 10 },
                    skills: [{ skillId: 'claw_strike', name: 'Cakaran Roh Darah', type: 'attack', power: 18, qiCost: 0, cooldown: 0, currentCooldown: 0 }]
                },
                'golden_eagle': {
                    key: 'golden_eagle',
                    name: 'Elang Emas',
                    tier: 1,
                    tierSize: 'small',
                    element: 'metal',
                    statBlock: { hp: 100, atk: 22, def: 6, spd: 16 }
                },
                'cave_bat': {
                    key: 'cave_bat',
                    name: 'Kelelawar Gua Beracun',
                    tier: 1,
                    tierSize: 'small',
                    element: 'wood',
                    statBlock: { hp: 80, atk: 14, def: 6, spd: 8 }
                },
                'bandit_leader': {
                    key: 'bandit_leader',
                    name: 'Pemimpin Bandit',
                    tier: 2,
                    tierSize: 'medium',
                    element: 'neutral',
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
                                tierSize: candidate.tierSize || 'small',
                                element: candidate.element || 'neutral',
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
                element: mData.element || 'neutral',
                tierSize: mData.tierSize || 'small',
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
                element: 'neutral',
                tierSize: 'small',
                hp: Math.floor(player.maxHp * 0.8) || 80,
                maxHp: Math.floor(player.maxHp * 0.8) || 80,
                attack: Math.floor(player.stats?.attack * 0.8) || 10,
                defense: Math.floor(player.stats?.defense * 0.8) || 5,
                speed: Math.floor(player.stats?.speed * 0.8) || 5,
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
                element: 'neutral',
                tierSize: 'small',
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
        } else if (targetType === 'world_boss') {
            const now = new Date();
            const dayOfWeek = now.getDay(); // 0 = Minggu, 6 = Sabtu
            const isSaturday = dayOfWeek === 6;
            if (!isSaturday && !req.body.adminOverride) {
                return res.status(403).json({ error: 'Raja Siluman Dunia hanya bangkit pada hari Sabtu (00:00 - 23:59 WIB)!' });
            }

            const season = await WorldBossSeason.findOne({ status: 'active' }).sort({ seasonNumber: -1 });
            if (!season) return res.status(404).json({ error: 'Tidak ada Bos Dunia aktif saat ini.' });
            if (season.status === 'defeated') return res.status(400).json({ error: 'Bos Dunia minggu ini telah berhasil ditumbangkan!' });

            const todayStr = now.toISOString().slice(0, 10);
            const userAttempt = (season.dailyAttempts || []).find(a => a.discordId === userId && a.dateStr === todayStr);
            const attemptsUsed = userAttempt ? userAttempt.attemptsUsed : 0;
            if (attemptsUsed >= (season.dailyAttemptsLimit || 3)) {
                return res.status(400).json({ error: 'Kamu telah menggunakan seluruh jatah 3 kesempatan menyerang Bos Dunia hari ini.' });
            }

            battleType = 'boss';
            const bHp = Math.max(1000000, season.currentHp);
            const bMaxHp = season.maxHp || 400000000;
            const bStats = season.bossStats || { atk: 140, def: 70, spd: 25 };

            enemies = [{
                id: season.bossId || 'boss_flame_kirin',
                entityId: season.bossId || 'boss_flame_kirin',
                name: season.bossName || 'Raja Qilin Api Purba',
                level: 10,
                imageUrl: season.bossImageUrl || null,
                element: 'fire',
                tierSize: 'boss',
                hp: bHp,
                maxHp: bMaxHp,
                attack: bStats.atk || 140,
                defense: bStats.def || 70,
                speed: bStats.spd || 25,
                skills: [
                    { skillId: 'flame_breath', name: 'Semburan Api Purba', type: 'attack', power: 25, element: 'fire', qiCost: 0, cooldown: 2, currentCooldown: 0 },
                    { skillId: 'lava_burst', name: 'Letusan Lahar Samadhi', type: 'attack', power: 40, element: 'fire', qiCost: 0, cooldown: 4, currentCooldown: 0 },
                    { skillId: 'kirin_roar', name: 'Auman Menggetarkan Langit', type: 'attack', power: 20, element: 'neutral', qiCost: 0, cooldown: 3, currentCooldown: 0 }
                ]
            }];

            const session = await InteractiveBattleService.startBattle(
                player,
                enemies,
                battleType,
                'world_boss_domain',
                allies,
                {
                    maxActiveEnemies: 1,
                    isBossMode: true,
                    eventContext: 'world_boss',
                    isProjection: true,
                    initialPlayerHp: player.currentHp !== undefined && player.currentHp !== null ? player.currentHp : maxHp,
                    initialPlayerVitality: player.extendedStats?.vitality ?? player.vitality ?? 100
                }
            );

            return res.json({ success: true, battleId: session.battleId, session });
        } else if (targetType === 'sect_arena') {
            const { targetRank } = req.body;
            if (!targetRank) return res.status(400).json({ error: 'Target rank diperlukan.' });

            const challengerEntry = await ArenaLadderEntry.findOne({ discordId: userId });
            if (!challengerEntry) return res.status(404).json({ error: 'Data arena karakter belum terdaftar.' });

            const todayStr = new Date().toISOString().slice(0, 10);
            if (challengerEntry.lastChallengeDate !== todayStr) {
                challengerEntry.dailyChallengesUsed = 0;
                challengerEntry.lastChallengeDate = todayStr;
                await challengerEntry.save();
            }

            if (challengerEntry.dailyChallengesUsed >= 3) {
                return res.status(400).json({ error: 'Jatah 3 tiket tantangan harian arena telah habis hari ini.' });
            }

            const minAllowedRank = Math.max(1, challengerEntry.rank - 5);
            const maxAllowedRank = challengerEntry.rank - 1;
            if (challengerEntry.rank === 1) {
                return res.status(400).json({ error: 'Kamu adalah Juara 1! Tidak ada lawan di atasmu yang bisa ditantang.' });
            }
            if (targetRank >= challengerEntry.rank) {
                return res.status(400).json({ error: 'Kamu tidak dapat menantang pendekar yang memiliki peringkat sama atau di bawah peringkatmu!' });
            }
            if (targetRank < minAllowedRank || targetRank > maxAllowedRank) {
                return res.status(400).json({ error: `Kamu hanya bisa menantang peringkat di atasmu antara #${minAllowedRank} hingga #${maxAllowedRank}.` });
            }

            const targetEntry = await ArenaLadderEntry.findOne({ rank: targetRank });
            if (!targetEntry) return res.status(404).json({ error: `Pemain pada peringkat #${targetRank} tidak ditemukan.` });
            if (targetEntry.discordId === userId) {
                return res.status(400).json({ error: 'Kamu tidak dapat menantang karakter dirimu sendiri!' });
            }

            const targetPlayer = await Player.findOne({ discordId: targetEntry.discordId })
                .populate('laws')
                .populate('manuals.manualId')
                .populate('inventory.itemId');

            if (!targetPlayer) return res.status(404).json({ error: 'Karakter lawan tidak ditemukan di database.' });

            const tComputed = getComputedStats(targetPlayer, targetPlayer.laws || [], targetPlayer.manuals || []);
            const tMaxHp = tComputed.maxHp || targetPlayer.stats?.baseHp || 100;
            const tAtk = tComputed.atk || targetPlayer.stats?.baseAtk || 20;
            const tDef = tComputed.def || targetPlayer.stats?.baseDef || 10;
            const tSpd = tComputed.spd || targetPlayer.stats?.baseSpd || 10;

            battleType = 'pvp';
            enemies = [{
                id: targetPlayer.discordId,
                entityId: targetPlayer.discordId,
                name: targetPlayer.name || targetPlayer.characterName || 'Pendekar Sekte',
                level: targetPlayer.realmIndex || targetPlayer.level || 1,
                imageUrl: targetPlayer.characterImage || null,
                element: 'neutral',
                tierSize: 'small',
                hp: tMaxHp,
                maxHp: tMaxHp,
                attack: tAtk,
                defense: tDef,
                speed: tSpd,
                qi: targetPlayer.currentQi || 50,
                maxQi: targetPlayer.maxQi || 100,
                stance: 100,
                skills: InteractiveBattleService.formatPlayerSkills(targetPlayer)
            }];

            const session = await InteractiveBattleService.startBattle(
                player,
                enemies,
                battleType,
                'sect_arena_stage',
                allies,
                {
                    maxActiveEnemies: 1,
                    eventContext: 'sect_arena',
                    isProjection: true,
                    initialPlayerHp: player.currentHp !== undefined && player.currentHp !== null ? player.currentHp : maxHp,
                    initialPlayerVitality: player.extendedStats?.vitality ?? player.vitality ?? 100,
                    targetDiscordId: targetPlayer.discordId,
                    targetRank: targetRank,
                    challengerRank: challengerEntry.rank
                }
            );

            return res.json({ success: true, battleId: session.battleId, session });
        } else {
            return res.status(400).json({ error: 'Tipe target tidak valid.' });
        }

        // Bawa sekutu jika ada
        let allies = [];
        if (Array.isArray(allyInstanceIds) && allyInstanceIds.length > 0 && Array.isArray(player.pets)) {
            const chosenPets = player.pets.filter(p => allyInstanceIds.includes(p.instanceId));
            allies = chosenPets.map(p => ({
                entityId: p.instanceId,
                entityType: 'npc',
                name: p.nickname || 'Pet Pendamping',
                level: p.level || 1,
                hp: p.hp || 80,
                maxHp: p.maxHp || 80,
                attack: p.atk || 15,
                defense: p.def || 8,
                speed: p.spd || 10,
                allyType: 'pet'
            }));
        }

        const session = await InteractiveBattleService.startBattle(
            player, 
            enemies, 
            battleType, 
            zoneId, 
            allies, 
            { 
                maxActiveEnemies: maxActiveEnemies || 4,
                tileKey,
                zoneId
            }
        );
        
        res.json({ success: true, battleId: session.battleId, session });
    } catch (err) {
        console.error('[API-BATTLE] Start Error:', err);
        res.status(400).json({ error: err.message });
    }
});

// GET /api/battle/recovery-status
router.get('/recovery-status', authenticateToken, async (req, res) => {
    try {
        const player = await Player.findOne({ discordId: req.user.userId }).select('deathRecoveryUntil lastKilledAt lastKilledByMonster currentHp');
        if (!player) return res.status(404).json({ error: 'Player tidak ditemukan' });

        const now = Date.now();
        const recoveryTime = player.deathRecoveryUntil ? new Date(player.deathRecoveryUntil).getTime() : 0;
        const isRecovering = recoveryTime > now;
        const remainingMs = isRecovering ? (recoveryTime - now) : 0;

        res.json({
            success: true,
            isRecovering,
            remainingMs,
            recoveryUntil: player.deathRecoveryUntil,
            lastKilledAt: player.lastKilledAt,
            lastKilledByMonster: player.lastKilledByMonster || 'Musuh Jianghu'
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
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
        
        // Cek jika pertarungan khusus (World Boss atau Sect Arena) selesai
        if (session.status !== 'ongoing' && (session.battleConfig?.eventContext === 'world_boss' || session.battleConfig?.eventContext === 'sect_arena' || session.battleConfig?.isProjection)) {
            const player = await Player.findOne({ discordId: userId });
            if (player) {
                // ZERO IMPACT ON PHYSICAL BODY & VITALITY:
                // 1. HP Fisik Asli: Pulihkan ke nilai asli sebelum masuk pertarungan proyeksi
                if (session.battleConfig.initialPlayerHp !== undefined && session.battleConfig.initialPlayerHp !== null) {
                    player.currentHp = session.battleConfig.initialPlayerHp;
                }
                // 2. Vitalitas Asli: Kembalikan utuh ke nilai awal sebelum proyeksi (Zero Vitality Loss)
                if (session.battleConfig.initialPlayerVitality !== undefined && session.battleConfig.initialPlayerVitality !== null) {
                    if (player.extendedStats) {
                        player.extendedStats.vitality = session.battleConfig.initialPlayerVitality;
                        player.markModified('extendedStats');
                    }
                    player.vitality = session.battleConfig.initialPlayerVitality;
                }
                // 3. JANGAN PERNAH kenakan sanksi 4-jam death recovery dari pertempuran proyeksi arena/world boss
                if (player.lastKilledByMonster === session.enemies[0]?.name) {
                    player.deathRecoveryUntil = null;
                    player.lastKilledByMonster = null;
                }

                // Berikan reward EXP atau perak jika menang (HANYA pertarungan non-arena sekte; Arena sekte zero-reward)
                if (session.status === 'won' && session.rewards && session.battleConfig?.eventContext !== 'sect_arena') {
                    if (session.rewards.exp) player.exp = (player.exp || 0) + session.rewards.exp;
                    if (session.rewards.silver) {
                        player.currency = normalizeCurrency(player.currency);
                        player.currency.silver = (player.currency.silver || 0) + session.rewards.silver;
                    }
                }
                await player.save();
            }

            if (session.battleConfig.eventContext === 'world_boss') {
                const season = await WorldBossSeason.findOne({ status: 'active' }).sort({ seasonNumber: -1 });
                if (season) {
                    const totalDmg = Math.max(1000, session.battleConfig.totalBossDamageDealt || 0);
                    season.currentHp = Math.max(0, season.currentHp - totalDmg);
                    if (season.currentHp === 0) season.status = 'defeated';

                    const hpRatio = season.currentHp / (season.maxHp || 400000000);
                    if (hpRatio <= 0.25) season.phase = 3;
                    else if (hpRatio <= 0.60) season.phase = 2;
                    else season.phase = 1;

                    let contrib = season.contributions.find(c => c.discordId === userId);
                    if (contrib) {
                        contrib.damage += totalDmg;
                        contrib.attackCount += 1;
                        contrib.lastAttackedAt = new Date();
                    } else {
                        season.contributions.push({
                            discordId: userId,
                            characterName: player?.name || player?.characterName || 'Pendekar Fana',
                            sect: player?.sect || 'Pengelana Bebas',
                            damage: totalDmg,
                            attackCount: 1,
                            lastAttackedAt: new Date()
                        });
                    }

                    const todayStr = new Date().toISOString().slice(0, 10);
                    if (!season.dailyAttempts) season.dailyAttempts = [];
                    let att = season.dailyAttempts.find(a => a.discordId === userId && a.dateStr === todayStr);
                    if (att) {
                        att.attemptsUsed += 1;
                    } else {
                        season.dailyAttempts.push({ discordId: userId, dateStr: todayStr, attemptsUsed: 1 });
                    }

                    season.markModified('contributions');
                    season.markModified('dailyAttempts');
                    await season.save();
                }
            } else if (session.battleConfig.eventContext === 'sect_arena') {
                const challengerEntry = await ArenaLadderEntry.findOne({ discordId: userId });
                if (challengerEntry) {
                    const todayStr = new Date().toISOString().slice(0, 10);
                    if (challengerEntry.lastChallengeDate !== todayStr) {
                        challengerEntry.dailyChallengesUsed = 0;
                        challengerEntry.lastChallengeDate = todayStr;
                    }
                    challengerEntry.dailyChallengesUsed += 1;

                    const targetRank = session.battleConfig.targetRank;
                    const challengerRank = challengerEntry.rank;
                    const targetDiscordId = session.battleConfig.targetDiscordId;
                    const targetEntry = await ArenaLadderEntry.findOne({ discordId: targetDiscordId });

                    if (session.status === 'won' && targetRank && targetRank < challengerRank) {
                        // Cascade Shift Ladder Swap:
                        challengerEntry.rank = 0;
                        await challengerEntry.save();

                        await ArenaLadderEntry.updateMany(
                            { rank: { $gte: targetRank, $lt: challengerRank } },
                            { $inc: { rank: 1 } }
                        );

                        challengerEntry.rank = targetRank;
                        if (targetRank < (challengerEntry.peakRank || 9999)) {
                            challengerEntry.peakRank = targetRank;
                        }
                        challengerEntry.wins = (challengerEntry.wins || 0) + 1;

                        challengerEntry.matchHistory.unshift({
                            opponentDiscordId: targetDiscordId,
                            opponentName: targetEntry?.characterName || 'Rival Jianghu',
                            opponentRank: targetRank,
                            isAttacker: true,
                            outcome: 'win',
                            rankBefore: challengerRank,
                            rankAfter: targetRank,
                            timestamp: new Date()
                        });

                        if (targetEntry) {
                            targetEntry.losses = (targetEntry.losses || 0) + 1;
                            targetEntry.matchHistory.unshift({
                                opponentDiscordId: userId,
                                opponentName: challengerEntry.characterName,
                                opponentRank: challengerRank,
                                isAttacker: false,
                                outcome: 'loss',
                                rankBefore: targetRank,
                                rankAfter: targetRank + 1,
                                timestamp: new Date()
                            });
                            if (targetEntry.matchHistory.length > 20) targetEntry.matchHistory = targetEntry.matchHistory.slice(0, 20);
                            await targetEntry.save();
                        }
                    } else {
                        challengerEntry.losses = (challengerEntry.losses || 0) + 1;
                        challengerEntry.matchHistory.unshift({
                            opponentDiscordId: targetDiscordId,
                            opponentName: targetEntry?.characterName || 'Rival Jianghu',
                            opponentRank: targetRank,
                            isAttacker: true,
                            outcome: 'loss',
                            rankBefore: challengerRank,
                            rankAfter: challengerRank,
                            timestamp: new Date()
                        });
                    }

                    if (challengerEntry.matchHistory.length > 20) {
                        challengerEntry.matchHistory = challengerEntry.matchHistory.slice(0, 20);
                    }
                    await challengerEntry.save();
                }
            }

            return res.json({ success: true, session });
        }

        // Cek jika status menjadi won atau lost, bagikan reward
        if (session.status === 'won') {
             const player = await Player.findOne({ discordId: userId });
             if (player && session.rewards) {
                 player.exp = (player.exp || 0) + (session.rewards.exp || 0);
                 

                 player.currency = normalizeCurrency(player.currency);
                 player.currency.silver = (player.currency.silver || 0) + (session.rewards.silver || 0);

                 // Distribusi KungFu XP Senjata & Jurus

                 if (Array.isArray(session.rewards.kungfuExp)) {
                     for (const k of session.rewards.kungfuExp) {
                         const resExp = awardKungfuExp(player, k.discipline, k.amount, { allowLevelUp: true });
                         k.newLevel = resExp.newLevel;
                         k.levelUp = resExp.levelUp;
                     }
                 }

                 // Distribusi Aktif Qi Kultivasi & True Qi (Loop Adiktif Anti-Stagnan)
                 const { awardActiveCultivationQi } = require('../../utils/lawCultivationEngine');
                 const cultGain = awardActiveCultivationQi(player, 'battle_victory', {
                     monsterTier: session.enemies[0]?.tier || 1
                 });
                 if (cultGain?.message) {
                     if (!Array.isArray(session.logs)) session.logs = [];
                     session.logs.push(`✨ [Kultivasi]: ${cultGain.message}`);
                 }
                 player.markModified('cultivationLaw');
                 player.markModified('systemCultivation');

                 // Distribusi Item Loot
                 if (Array.isArray(session.rewards.items) && session.rewards.items.length > 0) {

                     for (const loot of session.rewards.items) {
                         let itemDoc = await Item.findOne({ key: loot.itemId });
                         if (!itemDoc) {
                             itemDoc = await Item.findOne({ name: loot.name });
                         }
                         if (itemDoc) {
                             const existingInv = player.inventory.find(i => i.itemId && i.itemId.toString() === itemDoc._id.toString());
                             if (existingInv) {
                                 existingInv.quantity += (loot.quantity || 1);
                             } else {
                                 player.inventory.push({
                                     itemId: itemDoc._id,
                                     quantity: loot.quantity || 1,
                                     qualityMultiplier: loot.qualityMultiplier || 1.0
                                 });
                             }
                             player.markModified('inventory');
                         }
                     }
                 }

                 // Catat petak monster yang dikalahkan agar menghilang dari peta (DefeatedMonsterTile)
                 const tileKey = session.battleConfig?.tileKey;
                 if (tileKey) {
                     try {

                         const guildId = player.guildId || req.user.guildId || 'global';
                         const zId = session.battleConfig.zoneId || session.zoneId || 'unknown';
                         await DefeatedMonsterTile.findOneAndUpdate(
                             { guildId, zoneId: zId, tileKey },
                             {
                                 guildId,
                                 zoneId: zId,
                                 tileKey,
                                 monsterKey: session.enemies[0]?.entityId || 'monster',
                                 defeatedAt: new Date(),
                                 respawnAt: new Date(Date.now() + 60 * 60 * 1000) // 1 Jam respawn
                             },
                             { upsert: true, new: true }
                         );
                     } catch (eTileErr) {
                         console.warn('[API-BATTLE] Gagal mencatat DefeatedMonsterTile:', eTileErr.message);
                     }
                 }

                 player.currentHp = session.player.hp;
                 player.currentQi = session.player.qi;
                 if (session.player.conditions) {
                     player.conditions = session.player.conditions;
                     player.markModified('conditions');
                 }
                 player.markModified('inventory');

                 // Catat progres misi harian dailyHub
                 const todayStr = new Date().toISOString().slice(0, 10);
                 if (!player.dailyHub) player.dailyHub = {};
                 if (!player.dailyHub.missions) player.dailyHub.missions = {};
                 if (player.dailyHub.missions.missionsDate !== todayStr) {
                     player.dailyHub.missions.missionsDate = todayStr;
                     player.dailyHub.missions.meditateMinutes = 0;
                     player.dailyHub.missions.meditateClaimed = false;
                     player.dailyHub.missions.combatDefeats = 0;
                     player.dailyHub.missions.combatClaimed = false;
                     player.dailyHub.missions.craftCount = 0;
                     player.dailyHub.missions.craftClaimed = false;
                 }
                 player.dailyHub.missions.combatDefeats = (player.dailyHub.missions.combatDefeats || 0) + 1;
                 player.markModified('dailyHub');
                 await player.save();
             }
        } else if (session.status === 'lost') {
             const player = await Player.findOne({ discordId: userId });
             if (player) {
                 const { applyVitalityLossOnDeath } = require('../../utils/vitality');
                 player.currentHp = 0;
                 if (session.player.conditions) {
                     player.conditions = session.player.conditions;
                     player.markModified('conditions');
                 }
                 applyVitalityLossOnDeath(player);
                 // Waktu pemulihan 4 jam diam di tempat
                 player.deathRecoveryUntil = new Date(Date.now() + 4 * 60 * 60 * 1000);
                 player.lastKilledAt = new Date();
                 player.lastKilledByMonster = session.enemies[0]?.name || 'Siluman Liar';
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
