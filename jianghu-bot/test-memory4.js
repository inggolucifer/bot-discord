const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;
const inventoryItemSchema = new mongoose.Schema({
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
  quantity: { type: Number, default: 1 },
}, { _id: false });
const playerSchema = new mongoose.Schema({
  inventory: { type: [inventoryItemSchema], default: [] },
});
const Player = mongoose.model('PlayerTest2', playerSchema);
const player = new Player({ inventory: [{ itemId: new ObjectId() }] });
const target = { type: 'item' }; // no itemId or refId

try {
    const targetId = target.refId || target.itemId;
    const owned = player.inventory.find((i) => i.itemId.equals(targetId));
    console.log("Success");
} catch(e) {
    console.log("Error:", e.message);
}
