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
    // B-07 Fix: Larang diagonal memotong sudut (kedua ortogonal tidak boleh solid)
    if (Math.abs(dirInfo.dx) === 1 && Math.abs(dirInfo.dy) === 1 && !playerTraits.canFly) {
      const ortho1 = await gridZoneService.isTilePassable(guildId, zoneId, currentX, targetY, playerTraits);
      const ortho2 = await gridZoneService.isTilePassable(guildId, zoneId, targetX, currentY, playerTraits);
      if (!ortho1.passable || !ortho2.passable) {
        return {
          ok: false,
          error: 'Jalur diagonal terhalang oleh sudut rintangan padat (Corner cutting disallowed).',
          currentPosition: { zoneId, tileX: currentX, tileY: currentY },
          targetPosition: { zoneId, tileX: targetX, tileY: targetY }
        };
      }
    }

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

    // Terapkan damage racun jika melangkah dalam kondisi terpoison (mentok di 1 HP sampai efek racun hilang)
    if (condCheck.stepDamage > 0) {
      player.currentHp = Math.max(1, (player.currentHp || 100) - condCheck.stepDamage);
      if (player.conditions?.poison > 0) {
        player.conditions.poison = Math.max(0, player.conditions.poison - 2);
        player.markModified('conditions');
      }
    }

    // Sinkronisasi posisi otoritatif (B1 & B2 fix)
    await setPlayerAuthoritativePosition(player, {
      zoneId,
      tileX: targetX,
      tileY: targetY
    }, {
      facing: dirInfo.facing,
      save: false
    });

    // Jika masuk tile bukan interior, pastikan interiorInstanceId kosong
    if (!passCheck.isDoor) {
      if (!player.gridPosition) player.gridPosition = {};
      player.gridPosition.interiorInstanceId = null;
    }

    // Akumulasi Langkah Menjadi Qi / True Qi (Roc Wind Qi & Body Tempering Step Endurance)
    const { awardActiveCultivationQi, harvestEnvironmentalEssence, isNetherTerritory, getNetherSafeLimitSeconds } = require('../utils/lawCultivationEngine');
    awardActiveCultivationQi(player, 'step_endurance', { steps: 1 });

    // Inhalasi Esensi Alam Spontan (Khusus Jalur Penempaan Raga Suci)
    let environmentalInhalation = null;
    if (player.cultivationLaw?.activeLawType === 'body_tempering') {
      try {
        const WeatherConfig = require('../models/WeatherConfig');
        const weatherDoc = await WeatherConfig.findOne({ configId: 'global' }).lean();
        const currentWeather = weatherDoc?.currentWeather || 'Cerah';
        const currentHour = new Date().getHours();
        const currentRegion = player.currentLocation?.regionSlug || 'central_plains';

        const harvest = harvestEnvironmentalEssence(player, {
          weather: currentWeather,
          hour: currentHour,
          regionSlug: currentRegion
        });
        if (harvest && harvest.success) {
          environmentalInhalation = harvest;
        }
      } catch (err) {
        console.error('[MOVEMENT-SERVICE] Error harvesting essence:', err);
      }
    }

    // Pemantauan Wilayah Gelap Nether (Khusus Jalur Bayangan Sembilan Yin) (Master Plan §3.8)
    if (player.cultivationLaw?.activeLawType === 'demonic_nether_darkness') {
      if (!player.cultivationLaw.demonicData) {
        player.cultivationLaw.demonicData = {};
      }
      const demonicData = player.cultivationLaw.demonicData;
      const currentRegion = (player.currentLocation?.regionSlug || '').toLowerCase();
      const inNether = isNetherTerritory(zoneId, currentRegion, passCheck.tile || {});

      if (inNether) {
        demonicData.hasNetherDebuff = false;
        demonicData.leftNetherTerritoryAt = null;
        demonicData.netherExileTimerSeconds = getNetherSafeLimitSeconds(player.cultivationLaw.rank || 0);
      } else {
        if (!demonicData.leftNetherTerritoryAt) {
          demonicData.leftNetherTerritoryAt = new Date();
        }
        const safeLimitSeconds = getNetherSafeLimitSeconds(player.cultivationLaw.rank || 0);
        const secondsOutside = Math.floor((Date.now() - new Date(demonicData.leftNetherTerritoryAt).getTime()) / 1000);
        const remainingSeconds = Math.max(0, safeLimitSeconds - secondsOutside);
        demonicData.netherExileTimerSeconds = remainingSeconds;
        demonicData.hasNetherDebuff = (remainingSeconds <= 0);
      }
    }

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
      environmentalInhalation,
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

/**
 * Menetapkan posisi otoritatif pemain secara atomik dan menyinkronkan
 * gridPosition, currentLocation, serta discoveredLocations.
 * Menyelesaikan Bug B1 (Dual Position Sync Drift) & B2 (Region Slug Inconsistency).
 *
 * @param {Object} player - Dokumen Mongoose Player
 * @param {Object} coords - { zoneId, tileX, tileY }
 * @param {Object} options - { facing, buildingName, settlementName, regionSlug, clearTravelStatus, save, session }
 * @returns {Promise<Object>} player
 */
async function setPlayerAuthoritativePosition(player, coords = {}, options = {}) {
  if (!player) throw new Error('Player document is required.');

  const zoneId = coords.zoneId || player.gridPosition?.zoneId || 'tianyuan_world_map';
  let targetX = Math.round(Number(coords.tileX ?? player.gridPosition?.tileX ?? 2455));
  let targetY = Math.round(Number(coords.tileY ?? player.gridPosition?.tileY ?? 2485));

  // Clamping jika tianyuan_world_map (5000x5000)
  if (zoneId === 'tianyuan_world_map') {
    targetX = Math.max(0, Math.min(4999, targetX));
    targetY = Math.max(0, Math.min(4999, targetY));
  }

  // 1. Sinkronisasi gridPosition
  if (!player.gridPosition) player.gridPosition = {};
  player.gridPosition.zoneId = zoneId;
  player.gridPosition.tileX = targetX;
  player.gridPosition.tileY = targetY;
  if (options.facing !== undefined) {
    player.gridPosition.facing = options.facing;
  }

  // 2. Tentukan region & settlement otoritatif
  const { normalizeRegionSlug } = require('../utils/worldRegionEngine');
  const proceduralWorldEngine = require('../utils/proceduralWorldEngine');

  let resolvedRegionSlug = 'central_plains';
  let resolvedSettlementName = null;

  if (zoneId === 'tianyuan_world_map') {
    const tileInfo = proceduralWorldEngine.getTileAt(targetX, targetY);
    resolvedRegionSlug = normalizeRegionSlug(tileInfo.regionId || 'central_plains');
    resolvedSettlementName = tileInfo.settlementName || null;
  } else {
    resolvedRegionSlug = normalizeRegionSlug(coords.regionSlug || player.currentLocation?.regionSlug || 'central_plains');
    resolvedSettlementName = coords.settlementName || player.currentLocation?.settlementName || null;
  }

  if (options.settlementName) {
    resolvedSettlementName = options.settlementName;
  }
  if (options.regionSlug) {
    resolvedRegionSlug = normalizeRegionSlug(options.regionSlug);
  }

  // 3. Sinkronisasi currentLocation
  if (!player.currentLocation) player.currentLocation = {};
  player.currentLocation.regionSlug = resolvedRegionSlug;
  player.currentLocation.settlementName = resolvedSettlementName;
  if (options.buildingName !== undefined) {
    player.currentLocation.buildingName = options.buildingName;
  } else if (!resolvedSettlementName) {
    player.currentLocation.buildingName = null;
  }

  // 4. Catat discoveredLocations
  if (resolvedSettlementName) {
    const discKey = `${resolvedRegionSlug}|${resolvedSettlementName}`;
    if (!Array.isArray(player.discoveredLocations)) {
      player.discoveredLocations = [discKey];
    } else if (!player.discoveredLocations.includes(discKey)) {
      player.discoveredLocations.push(discKey);
    }
  }

  // 5. Bersihkan travel status jika diminta
  if (options.clearTravelStatus && player.travel) {
    player.travel.status = 'idle';
  }

  // 6. Reset gridMove
  if (player.gridMove) {
    player.gridMove.isMoving = false;
    player.gridMove.targetX = null;
    player.gridMove.targetY = null;
    player.gridMove.targetZoneId = null;
    player.gridMove.moveStartedAt = null;
    player.gridMove.moveArrivesAt = null;
  }

  if (typeof player.markModified === 'function') {
    player.markModified('gridPosition');
    player.markModified('currentLocation');
    player.markModified('discoveredLocations');
  }

  if (options.save !== false) {
    if (options.session) {
      await player.save({ session: options.session });
    } else {
      try {
        await player.save();
      } catch (err) {
        const PlayerModel = require('../models/Player');
        await PlayerModel.updateOne(
          { _id: player._id },
          {
            $set: {
              gridPosition: player.gridPosition,
              currentLocation: player.currentLocation,
              discoveredLocations: player.discoveredLocations,
              gridMove: player.gridMove
            }
          }
        );
      }
    }
  }

  return player;
}

const movementServiceInstance = new MovementService();
movementServiceInstance.setPlayerAuthoritativePosition = setPlayerAuthoritativePosition;

module.exports = movementServiceInstance;
module.exports.setPlayerAuthoritativePosition = setPlayerAuthoritativePosition;

