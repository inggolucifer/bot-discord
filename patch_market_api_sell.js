const fs = require('fs');
let code = fs.readFileSync('jianghu-bot/web-api/routes/market.js', 'utf8');

const sellEndpoint = `
// POST /api/market/player-shop/my-listings/sell
router.post('/player-shop/my-listings/sell', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { itemId, quantity, pricePerUnit, currency } = req.body;

    if (!itemId || !quantity || quantity <= 0 || !pricePerUnit || pricePerUnit <= 0 || !currency) {
        return res.status(400).json({ error: 'Data tidak valid.' });
    }

    const lockKey = \`market_playershop_sell_\${userId}\`;
    const releaseLock = await LockManager.acquire(lockKey);
    try {
        const player = await Player.findOne({ discordId: userId });
        if (!player) return res.status(404).json({ error: 'Karakter tidak ditemukan.' });

        const PlayerListing = require('../../models/PlayerListing');
        const Item = require('../../models/Item');
        const TransactionLog = require('../../models/TransactionLog');

        const MAX_LISTING_PER_PLAYER = 10;
        const activeCount = await PlayerListing.countDocuments({ guildId: player.guildId, sellerId: userId, status: 'active' });

        if (activeCount >= MAX_LISTING_PER_PLAYER) {
            return res.status(400).json({ error: \`Kamu sudah punya \${activeCount} listing aktif (maksimal \${MAX_LISTING_PER_PLAYER}).\` });
        }

        const owned = player.inventory.find(i => i.itemId.toString() === itemId);
        if (!owned || owned.quantity < quantity) {
            return res.status(400).json({ error: 'Item di inventory tidak cukup.' });
        }

        const item = await Item.findById(itemId);
        if (!item) return res.status(404).json({ error: 'Item tidak ditemukan.' });

        // Escrow item
        owned.quantity -= quantity;
        if (owned.quantity <= 0) {
            player.inventory = player.inventory.filter(i => i.itemId.toString() !== itemId);
        }

        await player.save();

        const listing = await PlayerListing.create({
            guildId: player.guildId,
            sellerId: userId,
            sellerName: player.characterName,
            type: 'item',
            refId: item._id,
            itemName: item.name,
            quantity: quantity,
            pricePerUnit: pricePerUnit,
            currency: currency,
        });

        await TransactionLog.create({
            guildId: player.guildId,
            type: 'MARKET_PLAYER_SELL',
            description: \`[\${player.characterName}] menjual \${quantity}x \${item.name} @ \${pricePerUnit} \${currency}\`,
        });

        res.json({ success: true, message: 'Berhasil menambahkan item ke Toko Player.' });
    } catch (error) {
        console.error('[API-MARKET] Player Shop Sell error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan saat menjual item.' });
    } finally {
        releaseLock();
    }
});
`;

code = code.replace(/module\.exports = router;/, sellEndpoint + '\nmodule.exports = router;');

fs.writeFileSync('jianghu-bot/web-api/routes/market.js', code);
console.log('patched market api sell');
