const fs = require('fs');

const path = 'jianghu-bot/web-api/routes/market.js';
let content = fs.readFileSync(path, 'utf8');

// The original code segment to replace
const original = `
        // Kembalikan barang ke inventory
        if (target.type === 'item') {
            const owned = player.inventory.find((i) => i.itemId.equals(target.itemId));
            if (owned) owned.quantity += target.quantity;
            else player.inventory.push({ itemId: target.itemId, quantity: target.quantity });
        } else if (target.type === 'asset') {
            const owned = player.assets.find((a) => a.assetId.equals(target.refId));
            if (owned) owned.quantity += target.quantity;
            else player.assets.push({ assetId: target.refId, quantity: target.quantity });
        } else if (target.type === 'pet') {
            const Pet = require('../../models/Pet');
            const petDoc = await Pet.findById(target.refId);
`;

// The updated code segment
const replacement = `
        // Kembalikan barang ke inventory
        const targetId = target.refId || target.itemId;

        if (target.type === 'item') {
            if (!targetId) return res.status(400).json({ error: 'Data listing tidak memiliki ID item/ref.' });
            const owned = player.inventory.find((i) => i.itemId && i.itemId.equals(targetId));
            if (owned) owned.quantity += target.quantity;
            else player.inventory.push({ itemId: targetId, quantity: target.quantity });
        } else if (target.type === 'asset') {
            if (!targetId) return res.status(400).json({ error: 'Data listing tidak memiliki ID asset/ref.' });
            const owned = player.assets.find((a) => a.assetId && a.assetId.equals(targetId));
            if (owned) owned.quantity += target.quantity;
            else player.assets.push({ assetId: targetId, quantity: target.quantity });
        } else if (target.type === 'pet') {
            if (!targetId) return res.status(400).json({ error: 'Data listing tidak memiliki ID pet/ref.' });
            const Pet = require('../../models/Pet');
            const petDoc = await Pet.findById(targetId);
`;

if (content.includes(original)) {
    content = content.replace(original, replacement);
    fs.writeFileSync(path, content);
    console.log("Successfully updated the market.js file.");
} else {
    console.log("Failed to find the exact code block in market.js");
}
