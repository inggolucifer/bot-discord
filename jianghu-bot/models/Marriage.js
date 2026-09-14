const mongoose = require('mongoose');
const { Schema } = mongoose;

const marriageSchema = new Schema({
  guildId: { type: String, required: true, index: true },
  partnerA: { type: String, required: true, index: true }, // discordId
  partnerB: { type: String, required: true, index: true }, // discordId
  status: {
    type: String,
    enum: ['proposed', 'married', 'divorced', 'cancelled', 'expired'],
    default: 'proposed',
    index: true
  },
  proposedBy: { type: String, required: true }, // discordId
  dowry: {
    copper: { type: Number, default: 0 },
    silver: { type: Number, default: 0 },
    gold: { type: Number, default: 0 },
    items: [{
      itemId: { type: Schema.Types.ObjectId, ref: 'Item' },
      itemName: { type: String },
      quantity: { type: Number, min: 1 }
    }]
  },
  locationKey: { type: String }, // snapshot lokasi saat propose
  proposedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, index: true },
  marriedAt: { type: Date, default: null },
  divorcedAt: { type: Date, default: null },
  divorceInitiatedBy: { type: String, default: null },
  ceremonyFeeCopper: { type: Number, default: 0 },
  notes: { type: String, default: null }
});

// partial index to ensure a player can only have one active marriage/proposal at a time.
// Since partnerA and partnerB can be either the proposer or proposee, we don't strict unique them together here directly,
// but we will enforce this tightly in the application layer.

module.exports = mongoose.model('Marriage', marriageSchema);
