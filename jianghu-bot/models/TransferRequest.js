const mongoose = require('mongoose');

const transferRequestSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    fromUserId: { type: String, required: true },
    toUserId: { type: String, required: true },
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
    quantity: { type: Number, required: true },
    taxAmount: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
    expiresAt: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('TransferRequest', transferRequestSchema);
