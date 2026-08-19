const mongoose = require('mongoose');

const petBattleSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  challengerId: { type: String, required: true },
  opponentId: { type: String, required: true },
  challengerPetInstanceId: { type: String, required: true },
  opponentPetInstanceId: { type: String, required: true },
  status: { type: String, enum: ['pending', 'accepted', 'finished', 'cancelled'], default: 'pending' },
  messageId: { type: String, default: null },
  expiresAt: { type: Date, required: true }, // Untuk auto expire pending battle
}, { timestamps: true });

// TTL Index: dokumen akan otomatis dihapus oleh MongoDB setelah expiresAt lewat
petBattleSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('PetBattle', petBattleSchema);
