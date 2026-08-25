const express = require('express');
const router = express.Router();
const Player = require('../../models/Player');
const Pet = require('../../models/Pet');
const Item = require('../../models/Item');
const { authenticateToken } = require('../middlewares/auth');
const { getExpRequired, addExp, parsePetItemEffect, simulateRound } = require('../../services/petService');
const PetBattle = require('../../models/PetBattle');

// Get My Pets
router.get('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const playerRef = await Player.findOne({ discordId: req.user.userId }).select('guildId').lean();
        const guildId = req.user.guildId || (playerRef ? playerRef.guildId : req.user.userId);const player = await Player.findOne({ discordId: userId, guildId }).populate('pets.petId').lean();
        if (!player) return res.status(404).json({ error: 'Karakter tidak ditemukan.' });

        res.json({
            success: true,
            data: {
                petSlots: player.petSlots,
                pets: player.pets
            }
        });
    } catch (error) {
        console.error('[API-PET] Error fetching pets:', error);
        res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
    }
});

// Release Pet
router.post('/release', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const playerRef = await Player.findOne({ discordId: req.user.userId }).select('guildId').lean();
        const guildId = req.user.guildId || (playerRef ? playerRef.guildId : req.user.userId);const { instanceId } = req.body;

        const player = await Player.findOne({ discordId: userId, guildId });
        if (!player) return res.status(404).json({ error: 'Karakter tidak ditemukan.' });

        const petIndex = player.pets.findIndex(p => p.instanceId === instanceId);
        if (petIndex === -1) return res.status(404).json({ error: 'Pet tidak ditemukan di inventaris.' });

        const petData = player.pets[petIndex];
        if (petData.isLocked) return res.status(400).json({ error: 'Pet sedang terkunci (mungkin dalam battle).' });

        player.pets.splice(petIndex, 1);
        await player.save();

        res.json({ success: true, message: 'Pet berhasil dilepaskan ke alam bebas.' });
    } catch (error) {
        console.error('[API-PET] Error releasing pet:', error);
        res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
    }
});

// Rename Pet
router.post('/rename', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { instanceId, newName } = req.body;

        if (!instanceId || !newName) return res.status(400).json({ error: 'Parameter tidak lengkap.' });
        if (newName.length > 16) return res.status(400).json({ error: 'Nama terlalu panjang (maksimal 16 karakter).' });

        const playerRef = await Player.findOne({ discordId: userId }).select('guildId').lean();
        const guildId = req.user.guildId || (playerRef ? playerRef.guildId : userId);

        const player = await Player.findOne({ discordId: userId, guildId });
        if (!player) return res.status(404).json({ error: 'Karakter tidak ditemukan.' });

        const pet = player.pets.find(p => p.instanceId === instanceId);
        if (!pet) return res.status(404).json({ error: 'Pet tidak ditemukan.' });

        pet.nickname = newName;
        await player.save();

        res.json({ success: true, message: `Nama pet berhasil diubah menjadi ${newName}.` });
    } catch (error) {
        console.error('[API-PET] Error renaming pet:', error);
        res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
    }
});

// Feed Pet
router.post('/feed', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { instanceId, itemId } = req.body;

    if (!instanceId || !itemId) return res.status(400).json({ error: 'Parameter tidak lengkap.' });

    const lockKey = `pet_feed_${userId}_${instanceId}`;
    const releaseLock = await LockManager.acquire(lockKey);
    if (!releaseLock) return res.status(429).json({ error: 'Sedang diproses. Mohon tunggu.' });

    try {
        const playerRef = await Player.findOne({ discordId: userId }).select('guildId').lean();
        const guildId = req.user.guildId || (playerRef ? playerRef.guildId : userId);

        const player = await Player.findOne({ discordId: userId, guildId }).populate('pets.petId');
        if (!player) return res.status(404).json({ error: 'Karakter tidak ditemukan.' });

        const pet = player.pets.find(p => p.instanceId === instanceId);
        if (!pet) return res.status(404).json({ error: 'Pet tidak ditemukan.' });

        const invIndex = player.inventory.findIndex(i => i.itemId.toString() === itemId);
        if (invIndex === -1) return res.status(400).json({ error: 'Item tidak ditemukan di inventaris.' });

        const itemDoc = await Item.findById(itemId);
        if (!itemDoc || !itemDoc.effect) return res.status(400).json({ error: 'Item tidak memiliki efek.' });

        const effect = parsePetItemEffect(itemDoc.effect);
        if (!effect || effect.type !== 'pet_food') return res.status(400).json({ error: 'Ini bukan makanan pet.' });

        const expAdd = parseInt(effect.params.exp) || 0;
        const hungerAdd = parseInt(effect.params.hunger) || 0;

        pet.hunger = Math.min(100, pet.hunger + hungerAdd);
        pet.affinity = Math.min(100, pet.affinity + 1);
        pet.lastFedAt = new Date();

        const levelUpMsgs = addExp(pet, expAdd, pet.petId);

        player.inventory[invIndex].quantity -= 1;
        if (player.inventory[invIndex].quantity <= 0) player.inventory.splice(invIndex, 1);

        await player.save();

        let msg = `Kamu memberi makan ${pet.nickname || pet.petId.name} dengan ${itemDoc.name}. Hunger +${hungerAdd}, EXP +${expAdd}.`;
        if (levelUpMsgs.length > 0) msg += `\n\n🎉 LEVEL UP!\n` + levelUpMsgs.join('\n');

        res.json({ success: true, message: msg });
    } catch (error) {
        console.error('[API-PET] Error feeding pet:', error);
        res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
    } finally {
        if (typeof releaseLock === 'function') releaseLock();
    }
});

// Heal Pet
router.post('/heal', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { instanceId, itemId } = req.body;

    if (!instanceId || !itemId) return res.status(400).json({ error: 'Parameter tidak lengkap.' });

    const lockKey = `pet_heal_${userId}_${instanceId}`;
    const releaseLock = await LockManager.acquire(lockKey);
    if (!releaseLock) return res.status(429).json({ error: 'Sedang diproses. Mohon tunggu.' });

    try {
        const playerRef = await Player.findOne({ discordId: userId }).select('guildId').lean();
        const guildId = req.user.guildId || (playerRef ? playerRef.guildId : userId);

        const player = await Player.findOne({ discordId: userId, guildId }).populate('pets.petId');
        if (!player) return res.status(404).json({ error: 'Karakter tidak ditemukan.' });

        const pet = player.pets.find(p => p.instanceId === instanceId);
        if (!pet) return res.status(404).json({ error: 'Pet tidak ditemukan.' });

        if (pet.hp >= pet.maxHp) return res.status(400).json({ error: 'HP Pet sudah penuh.' });

        const invIndex = player.inventory.findIndex(i => i.itemId.toString() === itemId);
        if (invIndex === -1) return res.status(400).json({ error: 'Item tidak ditemukan di inventaris.' });

        const itemDoc = await Item.findById(itemId);
        if (!itemDoc || !itemDoc.effect) return res.status(400).json({ error: 'Item tidak memiliki efek.' });

        const effect = parsePetItemEffect(itemDoc.effect);
        if (!effect || effect.type !== 'pet_heal') return res.status(400).json({ error: 'Ini bukan potion heal pet.' });

        const isFull = effect.params.full === 'true';
        const healAmt = parseInt(effect.params.amount) || 0;

        if (isFull) pet.hp = pet.maxHp;
        else pet.hp = Math.min(pet.maxHp, pet.hp + healAmt);

        player.inventory[invIndex].quantity -= 1;
        if (player.inventory[invIndex].quantity <= 0) player.inventory.splice(invIndex, 1);

        await player.save();

        const msg = isFull ? `HP pulih sepenuhnya!` : `HP bertambah ${healAmt}.`;
        res.json({ success: true, message: `Berhasil menggunakan ${itemDoc.name}. ${msg}` });
    } catch (error) {
        console.error('[API-PET] Error healing pet:', error);
        res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
    } finally {
        if (typeof releaseLock === 'function') releaseLock();
    }
});

// Get Consumable Items for Pet
router.get('/consumables', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const playerRef = await Player.findOne({ discordId: userId }).select('guildId').lean();
        const guildId = req.user.guildId || (playerRef ? playerRef.guildId : userId);

        const player = await Player.findOne({ discordId: userId, guildId }).populate('inventory.itemId').lean();
        if (!player) return res.status(404).json({ error: 'Karakter tidak ditemukan.' });

        const foodItems = [];
        const healItems = [];

        player.inventory.forEach(inv => {
            if (inv.itemId && inv.itemId.effect) {
                const effect = parsePetItemEffect(inv.itemId.effect);
                if (effect) {
                    if (effect.type === 'pet_food') foodItems.push({ item: inv.itemId, quantity: inv.quantity });
                    if (effect.type === 'pet_heal') healItems.push({ item: inv.itemId, quantity: inv.quantity });
                }
            }
        });

        res.json({ success: true, data: { foodItems, healItems } });
    } catch (error) {
        console.error('[API-PET] Error fetching consumables:', error);
        res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
    }
});

// Challenge to Battle
router.post('/battle/challenge', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { petInstanceId, opponentDiscordId } = req.body;

    if (!petInstanceId || !opponentDiscordId) return res.status(400).json({ error: 'Parameter tidak lengkap.' });
    if (userId === opponentDiscordId) return res.status(400).json({ error: 'Tidak bisa menantang diri sendiri.' });

    const lockKey = `pet_battle_${userId}`;
    const releaseLock = await LockManager.acquire(lockKey);
    if (!releaseLock) return res.status(429).json({ error: 'Sedang diproses. Mohon tunggu.' });

    try {
        const playerRef = await Player.findOne({ discordId: userId }).select('guildId characterName').lean();
        const guildId = req.user.guildId || (playerRef ? playerRef.guildId : userId);

        const player = await Player.findOne({ discordId: userId, guildId });
        if (!player) return res.status(404).json({ error: 'Karakter Anda tidak ditemukan.' });

        const p1Pet = player.pets.find(p => p.instanceId === petInstanceId);
        if (!p1Pet) return res.status(404).json({ error: 'Pet kamu tidak ditemukan.' });
        if (p1Pet.isLocked) return res.status(400).json({ error: 'Pet kamu sedang terkunci (mungkin dalam battle lain).' });
        if (p1Pet.hunger < 20) return res.status(400).json({ error: 'Pet kamu terlalu lapar untuk bertarung (Hunger < 20).' });
        if (p1Pet.hp < p1Pet.maxHp * 0.3) return res.status(400).json({ error: 'HP Pet kamu terlalu rendah untuk bertarung (< 30%).' });

        const cooldownPet = 5 * 60 * 1000;
        if (p1Pet.lastBattledAt && (Date.now() - p1Pet.lastBattledAt.getTime() < cooldownPet)) {
            return res.status(400).json({ error: 'Pet kamu masih kelelahan, tunggu beberapa saat lagi.' });
        }

        const opponent = await Player.findOne({ discordId: opponentDiscordId, guildId }).populate('pets.petId');
        if (!opponent) return res.status(404).json({ error: 'Lawan tidak ditemukan.' });

        const validLawanPets = opponent.pets.filter(p => !p.isLocked && p.hunger >= 20 && p.hp >= (p.maxHp * 0.3));
        if (!validLawanPets.length) return res.status(400).json({ error: 'Lawan tidak memiliki pet yang siap bertarung saat ini.' });

        p1Pet.isLocked = true;
        player.markModified('pets');
        await player.save();

        const battleRecord = await PetBattle.create({
            guildId,
            challengerId: userId,
            opponentId: opponentDiscordId,
            challengerPetInstanceId: p1Pet.instanceId,
            opponentPetInstanceId: 'TBD',
            status: 'pending',
            expiresAt: new Date(Date.now() + 2 * 60 * 1000)
        });

        res.json({
            success: true,
            message: `Berhasil menantang ${opponent.characterName}. Menunggu balasan...`,
            battleId: battleRecord._id
        });
    } catch (error) {
        console.error('[API-PET] Error challenging to battle:', error);
        res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
    } finally {
        if (typeof releaseLock === 'function') releaseLock();
    }
});

module.exports = router;
