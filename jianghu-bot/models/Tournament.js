const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
  matchNumber: { type: Number, required: true }, // nomor urut match DALAM babak ini (1, 2, 3, ...)
  player1Id: { type: String, default: null },
  player1Name: { type: String, default: null },
  player2Id: { type: String, default: null },     // null = BYE (player1 otomatis menang tanpa lawan)
  player2Name: { type: String, default: null },
  winnerId: { type: String, default: null },
  status: { type: String, enum: ['pending', 'completed'], default: 'pending' },
}, { _id: false });

const roundSchema = new mongoose.Schema({
  roundNumber: { type: Number, required: true },
  roundLabel: { type: String, default: null }, // "Babak 1", "Semifinal", "Final", dst — diisi otomatis
  matches: { type: [matchSchema], default: [] },
}, { _id: false });

const tournamentSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  name: { type: String, required: true },

  status: { type: String, enum: ['registration', 'ongoing', 'finished', 'cancelled'], default: 'registration' },

  participants: [{
    discordId: { type: String, required: true },
    characterName: { type: String, required: true },
    eliminated: { type: Boolean, default: false },
  }],

  rounds: { type: [roundSchema], default: [] },

  winnerDiscordId: { type: String, default: null },
  winnerName: { type: String, default: null },

  createdBy: { type: String, required: true },
}, { timestamps: true });

tournamentSchema.index({ guildId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Tournament', tournamentSchema);

