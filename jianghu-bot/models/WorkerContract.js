const mongoose = require('mongoose');

const workerContractSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  workerId: { type: String, required: true },
  workerName: { type: String, required: true },

  pricePerHour: { type: Number, required: true, min: 2 },
  maxDurationHours: { type: Number, required: true, min: 1 },

  status: { type: String, enum: ['available', 'working'], default: 'available' },

  currentAssetId: { type: String, default: null },
  currentEmployerId: { type: String, default: null },

  workingSince: { type: Date, default: null },
  workingUntil: { type: Date, default: null },
}, { timestamps: true });

workerContractSchema.index({ guildId: 1, status: 1 });

module.exports = mongoose.model('WorkerContract', workerContractSchema);
