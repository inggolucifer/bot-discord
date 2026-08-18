// Log SEMUA aksi admin (wajib untuk transparansi & audit)
const mongoose = require('mongoose');

const adminLogSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  adminId: { type: String, required: true },
  action: { type: String, required: true }, // cth: "ADD_ITEM", "FREEZE_PLAYER", "GIVE_CURRENCY"
  targetUserId: { type: String, default: null },
  details: { type: String, default: null },
}, { timestamps: true });

adminLogSchema.index({ guildId: 1, createdAt: -1 });

module.exports = mongoose.model('AdminLog', adminLogSchema);
