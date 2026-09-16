const mongoose = require('mongoose');

const propertyStructureSchema = new mongoose.Schema({
    guildId: { type: String, required: true, index: true },
    zoneId: { type: String, required: true },
    tileX: { type: Number, required: true },
    tileY: { type: Number, required: true },
    ownerId: { type: String, required: true, index: true }, // discordId pemilik
    ownerName: { type: String, required: true },
    structureName: { type: String, default: 'Kediaman Kultivator' },
    structureType: { type: String, default: 'courtyard_estate' },

    // Level Fasilitas Kediaman
    qiGatheringArrayTier: { type: Number, default: 1, min: 1, max: 5 },
    alchemyCrucibleTier: { type: Number, default: 1, min: 1, max: 5 },
    forgeAnvilTier: { type: Number, default: 1, min: 1, max: 5 },
    herbPlotsUnlocked: { type: Number, default: 2, min: 1, max: 8 },

    // Data Denah Interior 12x12 dikompresi RLE (Buffer / String)
    interiorLayoutCompressed: { type: String, required: true },
    subGridWidth: { type: Number, default: 12 },
    subGridHeight: { type: Number, default: 12 },

    // Status & Izin Akses
    isOpenToPublic: { type: Boolean, default: true },
    purchasedAt: { type: Date, default: Date.now },
    lastUpgradedAt: { type: Date, default: null }
}, { timestamps: true });

propertyStructureSchema.index({ guildId: 1, zoneId: 1, tileX: 1, tileY: 1 }, { unique: true });

module.exports = mongoose.model('PropertyStructure', propertyStructureSchema);
