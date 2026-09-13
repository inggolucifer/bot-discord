const express = require('express');
const router = express.Router();
const Player = require('../../models/Player');
const Npc = require('../../models/Npc');
const Quest = require('../../models/Quest');
const Item = require('../../models/Item');
const Travel = require('../../models/Travel');
const AdminLog = require('../../models/AdminLog');
const { authenticateToken } = require('../middlewares/auth');
const { evaluateQuestProgress } = require('../../utils/questProgress');
const { getRealmIndex, syncPlayerCultivation } = require('../../utils/cultivation');
const { payCurrency, getTotalCopper } = require('../../utils/currency');
const { withTransaction } = require('../utils/dbTransaction');
const CustomError = require('../utils/CustomError');
const { MAX_ACTIVE_QUESTS, DEFAULT_WAIT_DURATION_HOURS } = require('../../config/questConfig');

// This will be mounted under /api/world/quests

router.get('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const player = await Player.findOne({ discordId: userId }).populate('questLog.questId');
        if (!player) return res.status(404).json({ error: 'Karakter tidak ditemukan' });

        res.json({ questLog: player.questLog });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Terjadi kesalahan internal.' });
    }
});

router.post('/:questId/accept', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { questId } = req.params;
        const { npcId } = req.body;

        const player = await Player.findOne({ discordId: userId });
        if (!player) return res.status(404).json({ error: 'Karakter tidak ditemukan' });

        const travel = await Travel.findOne({ discordId: userId, status: 'traveling' });
        if (travel && travel.status === 'traveling') {
            return res.status(400).json({ error: 'Tidak bisa menerima quest saat dalam perjalanan.' });
        }


        const npc = await Npc.findById(npcId);
        if (!npc) return res.status(404).json({ error: 'NPC giver tidak ditemukan.' });

        const location = player.currentLocation || { settlementName: 'Desa Xingcun', buildingName: null };
        if (npc.settlementName !== location.settlementName || (npc.buildingName || null) !== (location.buildingName || null)) {
            return res.status(400).json({ error: 'Kamu tidak berada di lokasi yang sama dengan NPC ini.' });
        }

        if (!npcId) return res.status(400).json({ error: 'npcId tidak valid.' });

        const quest = await Quest.findById(questId);
        if (quest && quest.giverNpcId && quest.giverNpcId.toString() !== npcId.toString()) {
            return res.status(400).json({ error: 'NPC giver tidak sesuai.' });
        }
        if (!quest || !quest.isActive) return res.status(404).json({ error: 'Quest tidak ditemukan atau tidak aktif.' });

        // validasi realm
        const realmIndex = getRealmIndex(player.systemCultivation.realm);
        if (realmIndex < quest.minRealmIndex) {
            return res.status(400).json({ error: 'Ranah Kultivasi belum mencukupi.' });
        }

        // max active
        const activeQuests = player.questLog.filter(q => q.status === 'active');
        if (activeQuests.length >= MAX_ACTIVE_QUESTS) {
            return res.status(400).json({ error: `Maksimal ${MAX_ACTIVE_QUESTS} quest aktif bersamaan.` });
        }

        // check if already has or completed
        const existingQuest = player.questLog.find(q => q.questId.toString() === questId);
        if (existingQuest) {
             if (existingQuest.status === 'active') {
                 return res.status(400).json({ error: 'Quest ini sedang aktif.' });
             }
             if (!quest.repeatable && (existingQuest.status === 'completed' || existingQuest.status === 'claimed')) {
                 return res.status(400).json({ error: 'Quest ini sudah pernah diselesaikan.' });
             }
             if (quest.repeatable && existingQuest.status === 'claimed') {
                 const cooldownDate = new Date(existingQuest.claimedAt);
                 cooldownDate.setHours(cooldownDate.getHours() + quest.cooldownHours);
                 if (new Date() < cooldownDate) {
                     return res.status(400).json({ error: 'Quest ini masih dalam masa jeda (cooldown).' });
                 }
                 // Reset if repeatable and cooldown passed
                 existingQuest.status = 'active';
                 existingQuest.startedAt = new Date();
                 existingQuest.completedAt = null;
                 existingQuest.claimedAt = null;

                 const objectiveProgress = [];
                 quest.objectives.forEach((obj, idx) => {
                     const prog = { index: idx, done: false };
                     if (obj.type === 'wait_time') {
                         const waitStartedAt = new Date();
                         const waitDeadlineAt = new Date(waitStartedAt);
                         waitDeadlineAt.setHours(waitDeadlineAt.getHours() + (obj.durationHours || DEFAULT_WAIT_DURATION_HOURS));
                         prog.waitStartedAt = waitStartedAt;
                         prog.waitDeadlineAt = waitDeadlineAt;
                     }
                     objectiveProgress.push(prog);
                 });
                 existingQuest.objectiveProgress = objectiveProgress;
             } else if (existingQuest.status === 'failed') {
                existingQuest.status = 'active';
                existingQuest.startedAt = new Date();
                existingQuest.completedAt = null;
                existingQuest.claimedAt = null;

                const objectiveProgress = [];
                 quest.objectives.forEach((obj, idx) => {
                     const prog = { index: idx, done: false };
                     if (obj.type === 'wait_time') {
                         const waitStartedAt = new Date();
                         const waitDeadlineAt = new Date(waitStartedAt);
                         waitDeadlineAt.setHours(waitDeadlineAt.getHours() + (obj.durationHours || DEFAULT_WAIT_DURATION_HOURS));
                         prog.waitStartedAt = waitStartedAt;
                         prog.waitDeadlineAt = waitDeadlineAt;
                     }
                     objectiveProgress.push(prog);
                 });
                 existingQuest.objectiveProgress = objectiveProgress;
             }
        } else {
             // Prerequisites check
             if (quest.requiresQuestKeysCompleted && quest.requiresQuestKeysCompleted.length > 0) {
                 for (const reqKey of quest.requiresQuestKeysCompleted) {
                     const reqQuest = player.questLog.find(q => q.questKey === reqKey && (q.status === 'completed' || q.status === 'claimed'));
                     if (!reqQuest) {
                         return res.status(400).json({ error: 'Prasyarat quest belum terpenuhi.' });
                     }
                 }
             }

             // Initialize wait_time objective if exists
             const objectiveProgress = [];
             quest.objectives.forEach((obj, idx) => {
                 const prog = { index: idx, done: false };
                 if (obj.type === 'wait_time') {
                     const waitStartedAt = new Date();
                     const waitDeadlineAt = new Date(waitStartedAt);
                     waitDeadlineAt.setHours(waitDeadlineAt.getHours() + (obj.durationHours || DEFAULT_WAIT_DURATION_HOURS));
                     prog.waitStartedAt = waitStartedAt;
                     prog.waitDeadlineAt = waitDeadlineAt;
                 }
                 objectiveProgress.push(prog);
             });

             player.questLog.push({
                 questId: quest._id,
                 questKey: quest.key,
                 status: 'active',
                 objectiveProgress
             });
        }

        await player.save();
        res.json({ message: 'Quest diterima.', questLog: player.questLog });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Terjadi kesalahan internal.' });
    }
});

router.post('/:questId/submit-item', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { questId } = req.params;
        const { itemId, itemName, quantity } = req.body;

        if (!itemId && !itemName) return res.status(400).json({ error: 'Item harus dipilih.' });
        if (!quantity || quantity <= 0) return res.status(400).json({ error: 'Jumlah item tidak valid.' });

        const player = await Player.findOne({ discordId: userId });
        if (!player) return res.status(404).json({ error: 'Karakter tidak ditemukan' });

        const travel = await Travel.findOne({ discordId: userId, status: 'traveling' });
        if (travel && travel.status === 'traveling') {
            return res.status(400).json({ error: 'Tidak bisa serahkan item saat dalam perjalanan.' });
        }

        const quest = await Quest.findById(questId);
        if (!quest) return res.status(404).json({ error: 'Quest tidak ditemukan.' });

        const questEntry = player.questLog.find(q => q.questId.toString() === questId && q.status === 'active');
        if (!questEntry) return res.status(400).json({ error: 'Quest ini tidak aktif.' });

        // Find objective
        const objectiveIndex = quest.objectives.findIndex(o => o.type === 'submit_item' && (o.itemId?.toString() === itemId || o.itemName === itemName));
        if (objectiveIndex === -1) return res.status(400).json({ error: 'Quest tidak meminta item ini.' });

        const objective = quest.objectives[objectiveIndex];
        const progress = questEntry.objectiveProgress.find(p => p.index === objectiveIndex) || { index: objectiveIndex, done: false, submittedQty: 0 };

        if (progress.done) return res.status(400).json({ error: 'Objektif ini sudah selesai.' });

        const remainingQty = objective.quantity - (progress.submittedQty || 0);
        const qtyToSubmit = Math.min(quantity, remainingQty);

        // Deduct item from inventory
        let inventoryItemIndex = -1;
        if (itemId) {
            inventoryItemIndex = player.inventory.findIndex(i => i.itemId.toString() === itemId);
        } else {
             // Resolve itemName to itemId first
             const dbItem = await Item.findOne({ name: itemName, guildId: player.guildId });
             if (dbItem) {
                 inventoryItemIndex = player.inventory.findIndex(i => i.itemId.toString() === dbItem._id.toString());
             }
        }

        if (inventoryItemIndex === -1 || player.inventory[inventoryItemIndex].quantity < qtyToSubmit) {
            return res.status(400).json({ error: 'Item di inventory tidak cukup.' });
        }

        // Eval progress before potentially splicing
        const context = {
            submittedItems: {
                itemId: objective.itemId || (player.inventory[inventoryItemIndex] ? player.inventory[inventoryItemIndex].itemId : null),
                quantity: qtyToSubmit
            }
        };

        player.inventory[inventoryItemIndex].quantity -= qtyToSubmit;
        if (player.inventory[inventoryItemIndex].quantity <= 0) {
            player.inventory.splice(inventoryItemIndex, 1);
        }

        const { updatedProgress, allDone } = await evaluateQuestProgress(player, quest, questEntry, context);

        questEntry.objectiveProgress = updatedProgress;
        questEntry.lastTouchedAt = new Date();

        if (allDone) {
            questEntry.status = 'completed';
            questEntry.completedAt = new Date();
        }

        await player.save();
        res.json({ message: 'Item berhasil diserahkan.', questLog: player.questLog, completed: allDone });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Terjadi kesalahan internal.' });
    }
});

router.post('/:questId/evaluate', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { questId } = req.params;

        const player = await Player.findOne({ discordId: userId });
        if (!player) return res.status(404).json({ error: 'Karakter tidak ditemukan' });

        const quest = await Quest.findById(questId);
        if (!quest) return res.status(404).json({ error: 'Quest tidak ditemukan.' });

        const questEntry = player.questLog.find(q => q.questId.toString() === questId && q.status === 'active');
        if (!questEntry) return res.status(400).json({ error: 'Quest ini tidak aktif.' });

        const travel = await Travel.findOne({ discordId: userId, status: 'traveling' });
        const context = { isTraveling: travel && travel.status === 'traveling' };

        const { updatedProgress, allDone } = await evaluateQuestProgress(player, quest, questEntry, context);

        questEntry.objectiveProgress = updatedProgress;
        questEntry.lastTouchedAt = new Date();

        if (allDone) {
            questEntry.status = 'completed';
            questEntry.completedAt = new Date();
        }

        await player.save();
        res.json({ message: 'Progress diperbarui.', questLog: player.questLog, completed: allDone });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Terjadi kesalahan internal.' });
    }
});


router.post('/:questId/claim', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { questId } = req.params;

        await withTransaction(async (session) => {
            let player = await Player.findOne({ discordId: userId }).session(session);
            if (!player) throw new CustomError('Karakter tidak ditemukan', 404);

            const travel = await Travel.findOne({ discordId: userId, status: 'traveling' }).session(session);
            if (travel && travel.status === 'traveling') {
                throw new CustomError('Tidak bisa claim reward saat dalam perjalanan.', 400);
            }

            const quest = await Quest.findById(questId).session(session);
            if (!quest) throw new CustomError('Quest tidak ditemukan.', 404);

            const questEntry = player.questLog.find(q => q.questId.toString() === questId);
            if (!questEntry) throw new CustomError('Quest tidak ada di log.', 400);

            if (questEntry.status === 'claimed') throw new CustomError('Reward quest sudah diklaim.', 400);

            if (questEntry.status === 'active') {
                 const { allDone } = await evaluateQuestProgress(player, quest, questEntry, { isTraveling: false });
                 if (!allDone) {
                     throw new CustomError('Quest belum selesai.', 400);
                 }
            }

            // Apply Rewards
            const rewards = quest.rewards;
            let grantMessage = [];

            if (rewards.copper) { player.currency.copper += rewards.copper; grantMessage.push(`${rewards.copper} Copper`); }
            if (rewards.silver) { player.currency.silver += rewards.silver; grantMessage.push(`${rewards.silver} Silver`); }
            if (rewards.gold) { player.currency.gold += rewards.gold; grantMessage.push(`${rewards.gold} Gold`); }
            if (rewards.jade) { player.currency.jade += rewards.jade; grantMessage.push(`${rewards.jade} Jade`); }
            if (rewards.spirit) { player.currency.spirit += rewards.spirit; grantMessage.push(`${rewards.spirit} Spirit Stones`); }

            if (rewards.qiBonus > 0) {
                await syncPlayerCultivation(player);
                const maxQi = player.systemCultivation.stage * 1000 + 1000; // approximation if we don't have getCultivationRequirement
                player.systemCultivation.qi = Math.min(maxQi, player.systemCultivation.qi + rewards.qiBonus);
                grantMessage.push(`${rewards.qiBonus} Qi`);
            }

            for (const itemReward of rewards.items) {
                 let itemId = itemReward.itemId;
                 if (!itemId && itemReward.itemName) {
                     const dbItem = await Item.findOne({ name: itemReward.itemName, guildId: player.guildId }).session(session);
                     if (dbItem) itemId = dbItem._id;
                 }
                 if (itemId) {
                     const invItem = player.inventory.find(i => i.itemId.toString() === itemId.toString());
                     if (invItem) {
                         invItem.quantity += itemReward.quantity;
                     } else {
                         player.inventory.push({ itemId, quantity: itemReward.quantity });
                     }
                     const itemNameStr = itemReward.itemName || 'Item';
                     grantMessage.push(`${itemReward.quantity}x ${itemNameStr}`);
                 }
            }

            questEntry.status = 'claimed';
            questEntry.claimedAt = new Date();
            questEntry.lastTouchedAt = new Date();

            await player.save({ session });

            await AdminLog.create([{
                guildId: player.guildId,
                adminId: userId,
                action: 'QUEST_REWARD_CLAIMED',
                details: `Player ${player.username} claimed quest ${quest.key}. Rewards: ${grantMessage.join(', ')}`
            }], { session });

            const TransactionLog = require('../../models/TransactionLog');
            const addedCopper = getTotalCopper(rewards);
            await TransactionLog.create([{
                guildId: player.guildId,
                userId: player.discordId,
                type: 'quest_reward',
                amount: addedCopper, // Equivalent copper value of standard currencies added
                currency: 'copper',
                details: `Claimed quest ${quest.key}. Rewards: ${grantMessage.join(', ')}`
            }], { session });

            res.json({ message: 'Reward berhasil diklaim!', rewardsStr: grantMessage.join(', '), questLog: player.questLog });
        });
    } catch (err) {
        console.error(err);
        if (err.statusCode) {
             res.status(err.statusCode).json({ error: err.message });
        } else {
             res.status(500).json({ error: 'Terjadi kesalahan internal.' });
        }
    }
});

module.exports = router;
