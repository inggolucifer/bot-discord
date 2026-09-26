const Player = require('../models/Player');
const gridZoneService = require('./gridZoneService');
const { getCurrentStamina, getMaxStamina } = require('../utils/stamina');
const { calculateEnergyCost } = require('../utils/explorationMath');
const { processGridStepConditions } = require('../utils/conditionEngine');

const DIRECTION_MAP = {
  // Indonesian aliases
  'utara': { dx: 0, dy: -1, facing: 0, label: 'Utara' },
  'timur': { dx: 1, dy: 0, facing: 1, label: 'Timur' },
  'selatan': { dx: 0, dy: 1, facing: 2, label: 'Selatan' },
  'barat': { dx: -1, dy: 0, facing: 3, label: 'Barat' },
  'timurlaut': { dx: 1, dy: -1, facing: 0, label: 'Timur Laut' },
  'baratlaut': { dx: -1, dy: -1, facing: 0, label: 'Barat Laut' },
  'tenggara': { dx: 1, dy: 1, facing: 2, label: 'Tenggara' },
  'baratdaya': { dx: -1, dy: 1, facing: 2, label: 'Barat Daya' },
  // English aliases
  'n': { dx: 0, dy: -1, facing: 0, label: 'Utara' },
  'e': { dx: 1, dy: 0, facing: 1, label: 'Timur' },
  's': { dx: 0, dy: 1, facing: 2, label: 'Selatan' },
  'w': { dx: -1, dy: 0, facing: 3, label: 'Barat' },
  'ne': { dx: 1, dy: -1, facing: 0, label: 'Timur Laut' },
  'nw': { dx: -1, dy: -1, facing: 0, label: 'Barat Laut' },
  'se': { dx: 1, dy: 1, facing: 2, label: 'Tenggara' },
  'sw': { dx: -1, dy: 1, facing: 2, label: 'Barat Daya' }
};

class MovementService {
  /**
   * Menggerakkan pemain satu langkah pada micro grid
   */
  async movePlayer(discordId, guildId, rawDirection, options = {}) {
    const dirKey = String(rawDirection || '').toLowerCase().trim();
    const dirInfo = DIRECTION_MAP[dirKey];

    if (!dirInfo) {
      return { 
        ok: false, 
        error: `Arah tidak valid '${rawDirection}'. Gunakan: utara, selatan, timur, barat.` 
      };
    }

    // 1. Ambil data player
    const player = await Player.findOne({ discordId, guildId });
    if (!player) {
      return { ok: false, error: 'Karakter pemain belum terdaftar.' };
    }

    if (player.status === 'dead' || (player.currentHp !== null && player.currentHp <= 0)) {
      return { ok: false, error: 'Karaktermu pingsan/tewas. Pulihkan diri terlebih dahulu.' };
    }

    if (player.rest && player.rest.status === 'resting') {
      return { ok: false, error: 'Kamu sedang beristirahat. Selesaikan atau batalkan istirahat sebelum melangkah.' };
    }

    const condCheck = processGridStepConditions(player, 1);
    if (!condCheck.canMove) {
      return { ok: false, error: condCheck.reason };
    }

    const zoneId = player.gridPosition?.zoneId || 'xingcun_village';
    const currentX = player.gridPosition?.tileX ?? 16;
    const currentY = player.gridPosition?.tileY ?? 16;

    const targetX = currentX + dirInfo.dx;
    const targetY = currentY + dirInfo.dy;

    // Resolusi Mount dari equipment
    let mountDoc = null;
    if (player.equipment && player.equipment.mount && Array.isArray(player.inventory)) {
      const mountInv = player.inventory.find(i => i._id && i._id.toString() === player.equipment.mount.toString());
      if (mountInv && mountInv.itemId) {
        const Item = require('../models/Item');
        mountDoc = typeof mountInv.itemId === 'object' && mountInv.itemId.name ? mountInv.itemId : await Item.findById(mountInv.itemId);
      }
    }
    const effectiveMountType = mountDoc?.mountType || player.equippedMount;
    const isFlyingMount = effectiveMountType === 'flying_sword' || (mountDoc && mountDoc.name && mountDoc.name.toLowerCase().includes('pedang terbang'));
    const isWaterMount = effectiveMountType === 'ship' || (mountDoc && mountDoc.name && (mountDoc.name.toLowerCase().includes('kapal') || mountDoc.name.toLowerCase().includes('perahu')));

    // 2. Trait karakter (terbang, berenang, dll)
    const playerTraits = {
      canFly: isFlyingMount,
      canSwim: isWaterMount || !!options.canSwim
    };

    // 3. Validasi Passability & Collision
    const passCheck = await gridZoneService.isTilePassable(guildId, zoneId, targetX, targetY, playerTraits);
    if (!passCheck.passable) {
      return {
        ok: false,
        error: passCheck.reason || 'Jalur tidak dapat dilalui.',
        currentPosition: { zoneId, tileX: currentX, tileY: currentY },
        targetPosition: { zoneId, tileX: targetX, tileY: targetY }
      };
    }

    // 4. Kalkulasi Biaya Stamina
    const tileMultiplier = passCheck.staminaCostMultiplier || 1.0;
    const terrain = passCheck.tile?.terrainType || 'settlement';
    
    // Hitung berat inventori jika ada
    let currentWeight = 10;
    let maxWeight = player.baseCarryCapacity || 50;
    if (Array.isArray(player.inventory)) {
      currentWeight = player.inventory.reduce((acc, it) => acc + (it.quantity || 1), 0);
    }

    let baseCost = 2;
    if (typeof calculateEnergyCost === 'function') {
      baseCost = calculateEnergyCost({
        terrainType: terrain,
        currentWeight,
        maxWeight,
        mountType: effectiveMountType,
        staminaReduction: mountDoc?.staminaReduction || 0
      });
    }

    // Diskon talent STA dan bodyTemperingLevel
    const staTalent = player.talents?.sta || 5;
    const bodyTempering = player.bodyTemperingLevel || 0;
    const talentDiscount = Math.min(0.5, (staTalent * 0.02) + (bodyTempering * 0.05));

    let finalStaminaCost = Math.max(1, Math.round(baseCost * tileMultiplier * (1 - talentDiscount)));

    const currentStamina = getCurrentStamina(player);
    const maxStamina = getMaxStamina(player);

    if (currentStamina < finalStaminaCost) {
      return {
        ok: false,
        error: `Stamina tidak mencukupi! (Sisa: ${Math.floor(currentStamina)}, Dibutuhkan: ${finalStaminaCost}). Silakan /istirahat atau konsumsi makanan.`,
        currentStamina,
        maxStamina,
        requiredStamina: finalStaminaCost
      };
    }

    // 5. Update Database Posisi & Stamina secara konsisten
    const newStamina = Math.max(0, currentStamina - finalStaminaCost);
    player.currentStamina = newStamina;

    // Terapkan damage racun jika melangkah dalam kondisi terpoison
    if (condCheck.stepDamage > 0) {
      player.currentHp = Math.max(1, (player.currentHp || 100) - condCheck.stepDamage);
    }

    if (!player.gridPosition) player.gridPosition = {};
    player.gridPosition.zoneId = zoneId;
    player.gridPosition.tileX = targetX;
    player.gridPosition.tileY = targetY;
    player.gridPosition.facing = dirInfo.facing;

    // Jika masuk tile bukan interior, pastikan interiorInstanceId kosong
    if (!passCheck.isDoor) {
      player.gridPosition.interiorInstanceId = null;
    }

    // Akumulasi Langkah Menjadi Qi / True Qi (Roc Wind Qi & Body Tempering Step Endurance)
    const { awardActiveCultivationQi } = require('../utils/lawCultivationEngine');
    awardActiveCultivationQi(player, 'step_endurance', { steps: 1 });
    player.markModified('cultivationLaw');
    player.markModified('systemCultivation');

    await player.save();

    // 6. Broadcast Real-time Socket.io jika ada
    const io = options.io || global.io;
    if (io) {
      io.to(`zone:${zoneId}`).emit('player:moved', {
        discordId,
        characterName: player.characterName,
        zoneId,
        tileX: targetX,
        tileY: targetY,
        facing: dirInfo.facing,
        stamina: newStamina
      });
    }

    return {
      ok: true,
      direction: dirInfo.label,
      previousPosition: { tileX: currentX, tileY: currentY },
      newPosition: { zoneId, tileX: targetX, tileY: targetY, facing: dirInfo.facing },
      staminaCost: finalStaminaCost,
      currentStamina: newStamina,
      maxStamina,
      tileInfo: passCheck.tile ? {
        type: passCheck.tile.tileType,
        terrain: passCheck.tile.terrainType,
        label: passCheck.tile.label,
        buildingName: passCheck.tile.buildingName,
        isDoor: !!passCheck.tile.isDoor,
        isClaimable: !!passCheck.tile.isClaimable,
        resourceType: passCheck.tile.resourceType
      } : null
    };
  }
}

module.exports = new MovementService();
