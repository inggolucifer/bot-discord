const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;

const target = {
    type: 'item',
    itemId: null,
    refId: new ObjectId(),
    quantity: 1
};

const player = {
    inventory: []
};

// Original logic
try {
    const owned = player.inventory.find((i) => i.itemId.equals(target.itemId));
    if (owned) owned.quantity += target.quantity;
    else player.inventory.push({ itemId: target.itemId, quantity: target.quantity });
    console.log("Original logic success", player.inventory);
} catch (e) {
    console.error("Original logic error:", e.message);
}
