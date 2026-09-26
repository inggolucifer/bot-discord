const express = require('express');
const router = express.Router();
const Manual = require('../../models/Manual');
const Player = require('../../models/Player');
const LawSkillDefinition = require('../../models/LawSkillDefinition');
const { authenticateToken } = require('../middlewares/auth');
const { getMaxManualCapacity, getRequiredSkillCombatExp, getMaxSkillLevel } = require('../../utils/kungfuMastery');

// API to list all manuals for Almanack
router.get('/', async (req, res) => {
    try {
        const manuals = await Manual.find({}).populate('requiredSectId', 'name').lean();

        const formatted = manuals.map(m => {
            return {
                ...m,
                sectLocked: !!m.requiredSectId,
                requiredSectName: m.requiredSectId ? m.requiredSectId.name : null
            };
        });

        res.json({ success: true, data: formatted });
    } catch (error) {
        console.error('[API-MANUALS] Error fetching manuals:', error);
        res.status(500).json({ error: 'Terjadi kesalahan pada server saat memuat manual.' });
    }
});

// GET /api/manuals/my-techniques — Ringkasan Kitab & Hukum Alam
router.get('/my-techniques', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const player = await Player.findOne({ discordId: userId })
            .populate('manuals.manualId');

        if (!player) {
            return res.status(404).json({ error: 'Karakter tidak ditemukan.' });
        }

        const core = player.kungfuSkills?.core || 0;
        const maxCapacity = getMaxManualCapacity(player);

        // Format External Manuals
        const manualsList = (player.manuals || []).map(m => {
            const manualObj = m.manualId;
            if (!manualObj) return null;
            const lvl = m.level || 1;
            const tier = manualObj.tier || manualObj.rank || 1;
            const maxLvl = m.maxLevel || getMaxSkillLevel(tier);
            const exp = m.exp || 0;
            const reqExp = getRequiredSkillCombatExp(lvl);

            return {
                manualId: manualObj._id.toString(),
                name: manualObj.name,
                icon: manualObj.icon || '📜',
                tier,
                level: lvl,
                exp,
                reqExp,
                maxLevel: maxLvl,
                type: manualObj.type || 'attack',
                element: manualObj.element || 'neutral',
                description: manualObj.description || '',
                basePower: manualObj.basePower || 20,
                qiCost: manualObj.qiCost || 15
            };
        }).filter(Boolean);

        // Format Law Constellation Skills
        let lawSkillsList = [];
        const law = player.cultivationLaw;
        if (law?.activeLawType && Array.isArray(law.unlockedSkillIds) && law.unlockedSkillIds.length > 0) {
            const skillDefs = await LawSkillDefinition.find({
                skillId: { $in: law.unlockedSkillIds },
                lawType: law.activeLawType
            }).lean();

            lawSkillsList = skillDefs.map(def => {
                const lvl = (law.skillLevels ? (law.skillLevels.get ? law.skillLevels.get(def.skillId) : law.skillLevels[def.skillId]) : 1) || 1;
                const exp = (law.skillExp ? (law.skillExp.get ? law.skillExp.get(def.skillId) : law.skillExp[def.skillId]) : 0) || 0;
                const maxLvl = getMaxSkillLevel(def.tier || 1);
                const reqExp = getRequiredSkillCombatExp(lvl);
                const isEquipped = (law.combatLoadout || []).includes(def.skillId);

                return {
                    skillId: def.skillId,
                    name: def.name,
                    icon: def.icon || '✨',
                    tier: def.tier || 1,
                    level: lvl,
                    exp,
                    reqExp,
                    maxLevel: maxLvl,
                    type: def.isPassive ? 'passive' : 'active',
                    element: def.element || 'neutral',
                    description: def.description || '',
                    basePower: Math.round((def.damageMultiplier || 1.0) * 20),
                    qiCost: def.baseCost || 15,
                    isEquipped
                };
            });
        }

        res.json({
            success: true,
            data: {
                core,
                currentManualCount: manualsList.length,
                maxManualCapacity: maxCapacity,
                manuals: manualsList,
                lawSkills: lawSkillsList,
                combatLoadout: law?.combatLoadout || []
            }
        });
    } catch (error) {
        console.error('[API-MANUALS] Error fetching my-techniques:', error);
        res.status(500).json({ error: 'Terjadi kesalahan saat memuat daftar teknik.' });
    }
});

// POST /api/manuals/forget — Melupakan Manual Tertentu
router.post('/forget', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { manualId } = req.body;

        if (!manualId) {
            return res.status(400).json({ error: 'Manual ID harus disertakan.' });
        }

        const player = await Player.findOne({ discordId: userId }).populate('manuals.manualId');
        if (!player) {
            return res.status(404).json({ error: 'Karakter tidak ditemukan.' });
        }

        const manualIndex = (player.manuals || []).findIndex(m => {
            if (!m.manualId) return false;
            return m.manualId._id.toString() === manualId || m.manualId.toString() === manualId;
        });

        if (manualIndex === -1) {
            return res.status(404).json({ error: 'Manual tidak ditemukan dalam daftar teknik yang kamu kuasai.' });
        }

        const forgottenManualName = player.manuals[manualIndex].manualId.name || 'Manual Teknik';
        const targetManualIdStr = player.manuals[manualIndex].manualId._id.toString();
        player.manuals.splice(manualIndex, 1);
        player.markModified('manuals');

        // Jika manual yang dilupakan sedang terpasang di loadout tempur, lepaskan otomatis
        if (player.cultivationLaw && Array.isArray(player.cultivationLaw.combatLoadout)) {
            player.cultivationLaw.combatLoadout = player.cultivationLaw.combatLoadout.filter(
                id => id !== manualId && id !== targetManualIdStr
            );
            player.markModified('cultivationLaw');
        }

        await player.save();

        const currentCapacity = player.manuals.length;
        const maxCapacity = getMaxManualCapacity(player);

        res.json({
            success: true,
            message: `🗑️ Kamu telah melupakan teknik [${forgottenManualName}]. Satu slot pemahaman kini telah dikosongkan (${currentCapacity}/${maxCapacity}).`,
            data: {
                currentCount: currentCapacity,
                maxCapacity
            }
        });
    } catch (error) {
        console.error('[API-MANUALS] Error forgetting manual:', error);
        res.status(500).json({ error: 'Terjadi kesalahan saat melupakan manual.' });
    }
});

// POST /api/manuals/loadout — Menyimpan Loadout Jurus Tempur Aktif (Maks 4)
router.post('/loadout', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { combatLoadout } = req.body;

        if (!Array.isArray(combatLoadout)) {
            return res.status(400).json({ error: 'Format combatLoadout harus berupa array.' });
        }

        if (combatLoadout.length > 4) {
            return res.status(400).json({ error: 'Maksimal jurus aktif yang dapat dipasang adalah 4 slot.' });
        }

        const player = await Player.findOne({ discordId: userId });
        if (!player) {
            return res.status(404).json({ error: 'Karakter tidak ditemukan.' });
        }

        if (!player.cultivationLaw) {
            player.cultivationLaw = {};
        }

        player.cultivationLaw.combatLoadout = combatLoadout;
        player.markModified('cultivationLaw');
        await player.save();

        res.json({
            success: true,
            message: '✅ Loadout jurus tempur berhasil diperbarui.',
            data: { combatLoadout: player.cultivationLaw.combatLoadout }
        });
    } catch (error) {
        console.error('[API-MANUALS] Error updating loadout:', error);
        res.status(500).json({ error: 'Terjadi kesalahan saat memperbarui loadout jurus.' });
    }
});

module.exports = router;
