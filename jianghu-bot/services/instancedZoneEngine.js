/**
 * services/instancedZoneEngine.js
 * Engine Otoritatif Area Khusus Berinstans V23 (Ala Tale of Immortal R8)
 *
 * Mengimplementasikan 4 Tipe Area Khusus:
 * 1. Lembah Roh (spirit_valley): 3x3 rooms, elite/room, trap HP 8-15% ignore DEF, 10% inner demon.
 * 2. Tanah Roh (land_of_spirits): 500 spirit stones, sequential rooms -> boss, 1-time milestone reward.
 * 3. Lingkaran Pertahanan (defense_circle): 3 spirit fruits, 5-wave survival mode.
 * 4. Tanah Elemen (elemental_land): shard drops & koneksi workshop pemukiman V20.
 */

const fs = require('fs');
const path = require('path');

// PRNG Mulberry32
function Mulberry32(seed) {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function stringHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = Math.imul(31, hash) + str.charCodeAt(i) | 0;
  }
  return hash >>> 0;
}

// ----------------------------------------------------------------------------
// 1. LEMBAH ROH (spirit_valley)
// ----------------------------------------------------------------------------

function calculateTrapDamage(maxHp, seed) {
  const rng = Mulberry32(seed);
  // 8% s/d 15% dari Max HP, mengabaikan DEF
  const pct = 0.08 + rng() * 0.07;
  return Math.max(1, Math.round(maxHp * pct));
}

function checkInnerDemonEvent(seed) {
  const rng = Mulberry32(seed);
  // 10% peluang per kamar
  return rng() < 0.10;
}

function createSpiritValleySession(playerId, zoneId, dangerTier = 3, startedAt = Date.now()) {
  const sessionSeed = (stringHash(playerId) ^ stringHash(zoneId) ^ stringHash(String(startedAt))) >>> 0;
  const rng = Mulberry32(sessionSeed);

  // 9 kamar (Grid 3x3, index 0..8)
  const rooms = [];
  for (let i = 0; i < 9; i++) {
    const rx = i % 3;
    const ry = Math.floor(i / 3);
    const roomSeed = (sessionSeed ^ (i * 1013)) >>> 0;

    const hasTrap = rng() < 0.40; // 40% kamar memiliki jebakan
    const hasInnerDemon = checkInnerDemonEvent(roomSeed);

    rooms.push({
      index: i,
      x: rx,
      y: ry,
      cleared: false,
      hasTrap,
      trapTriggered: false,
      hasInnerDemon,
      innerDemonEncountered: false,
      eliteMonster: {
        id: `sv_elite_${i}`,
        name: `Penjaga Roh Kamar (${rx},${ry})`,
        hp: 1200 + dangerTier * 300,
        maxHp: 1200 + dangerTier * 300,
        atk: 100 + dangerTier * 25,
        def: 50 + dangerTier * 15,
        defeated: false
      }
    });
  }

  return {
    type: 'spirit_valley',
    zoneId,
    playerId,
    dangerTier,
    startedAt,
    sessionSeed,
    currentRoomIndex: 0,
    rooms,
    cost: {
      item: 'item_spirit_key',
      quantity: 1,
      gameDays: 5
    },
    cooldownDays: 7,
    status: 'active'
  };
}

// ----------------------------------------------------------------------------
// 2. TANAH ROH (land_of_spirits)
// ----------------------------------------------------------------------------

function createLandOfSpiritsSession(playerId, zoneId, dangerTier = 2, startedAt = Date.now()) {
  const sessionSeed = (stringHash(playerId) ^ stringHash(zoneId) ^ stringHash(String(startedAt))) >>> 0;

  // 5 Ruang Berurutan (Chambers 1-4: Penjaga, Chamber 5: Boss)
  const chambers = [
    { chamber: 1, name: 'Gerbang Hawa Murni', enemyType: 'guardian', hp: 800, atk: 70, defeated: false },
    { chamber: 2, name: 'Lorong Kristal Dao', enemyType: 'guardian', hp: 1100, atk: 95, defeated: false },
    { chamber: 3, name: 'Ruang Meditasi Leluhur', enemyType: 'guardian', hp: 1400, atk: 120, defeated: false },
    { chamber: 4, name: 'Batas Fondasi Roh', enemyType: 'guardian', hp: 1800, atk: 150, defeated: false },
    { chamber: 5, name: 'Altar Intisari Ilahi (Boss)', enemyType: 'boss', hp: 4500, atk: 280, defeated: false }
  ];

  return {
    type: 'land_of_spirits',
    zoneId,
    playerId,
    dangerTier,
    startedAt,
    sessionSeed,
    currentChamber: 1,
    chambers,
    cost: {
      spiritStones: 500,
      stamina: 10
    },
    milestoneReward: {
      name: 'Intisari Warisan Roh Leluhur',
      silver: 1500,
      spiritStones: 250,
      breakthroughPillGrade: 2
    },
    status: 'active'
  };
}

// ----------------------------------------------------------------------------
// 3. LINGKARAN PERTAHANAN (defense_circle)
// ----------------------------------------------------------------------------

function createDefenseCircleSession(playerId, zoneId, dangerTier = 3, startedAt = Date.now()) {
  const sessionSeed = (stringHash(playerId) ^ stringHash(zoneId) ^ stringHash(String(startedAt))) >>> 0;

  // 5 Gelombang Bertahan (Survival Mode ~120s combat)
  const waves = [
    { wave: 1, label: 'Gelombang 1: Gerombolan Serigala Roh', enemiesCount: 3, enemyHp: 400, enemyAtk: 45, cleared: false },
    { wave: 2, label: 'Gelombang 2: Pasukan Gagak Racun', enemiesCount: 4, enemyHp: 550, enemyAtk: 60, cleared: false },
    { wave: 3, label: 'Gelombang 3: Beruang Cadas & Pengawal', enemiesCount: 3, enemyHp: 800, enemyAtk: 90, hasElite: true, cleared: false },
    { wave: 4, label: 'Gelombang 4: Pasukan Siluman Menengah', enemiesCount: 4, enemyHp: 1100, enemyAtk: 125, hasElite: true, cleared: false },
    { wave: 5, label: 'Gelombang 5: Panglima Siluman Pemecah Segel', enemiesCount: 3, enemyHp: 2200, enemyAtk: 210, isBossWave: true, cleared: false }
  ];

  return {
    type: 'defense_circle',
    zoneId,
    playerId,
    dangerTier,
    startedAt,
    sessionSeed,
    currentWave: 1,
    waves,
    cost: {
      spiritFruits: 3,
      stamina: 10
    },
    estimatedDurationSeconds: 120,
    status: 'active'
  };
}

// ----------------------------------------------------------------------------
// 4. TANAH ELEMEN (elemental_land)
// ----------------------------------------------------------------------------

const ELEMENT_SHARDS = {
  api: { key: 'keping_roh_api', name: 'Keping Intisari Api (Fire Shard)', crystalName: 'Kristal Roh Api Murni' },
  air: { key: 'keping_roh_air', name: 'Keping Intisari Air (Water Shard)', crystalName: 'Kristal Roh Air Murni' },
  kayu: { key: 'keping_roh_kayu', name: 'Keping Intisari Kayu (Wood Shard)', crystalName: 'Kristal Roh Kayu Murni' },
  logam: { key: 'keping_roh_logam', name: 'Keping Intisari Logam (Metal Shard)', crystalName: 'Kristal Roh Logam Murni' },
  tanah: { key: 'keping_roh_tanah', name: 'Keping Intisari Tanah (Earth Shard)', crystalName: 'Kristal Roh Tanah Murni' }
};

function createElementalLandLoot(element, dangerTier = 3, seed = 1618) {
  const shardDef = ELEMENT_SHARDS[element] || ELEMENT_SHARDS.api;
  const rng = Mulberry32(seed);

  // Drop 2 s/d 4 keping per pertarungan
  const quantity = 2 + Math.floor(rng() * 3);

  return {
    element,
    shardKey: shardDef.key,
    shardName: shardDef.name,
    quantity,
    workshopRecipe: {
      resultItem: shardDef.crystalName,
      requiredShards: 10,
      requiredCatalyst: 'Bijih Besi Roh Murni',
      facilityRequired: 'workshop' // Bengkel pemukiman V20
    }
  };
}

// ----------------------------------------------------------------------------
// RESOLUSI AKSI SERVER-AUTHORITATIVE
// ----------------------------------------------------------------------------

function resolveStepAction(session, action, params = {}) {
  if (session.status !== 'active') {
    return { ok: false, error: 'Sesi instans tidak aktif' };
  }

  if (session.type === 'spirit_valley') {
    const room = session.rooms[session.currentRoomIndex];
    if (action === 'trigger_trap') {
      if (!room.hasTrap || room.trapTriggered) return { ok: false, error: 'Tidak ada jebakan aktif' };
      const trapSeed = (session.sessionSeed ^ (session.currentRoomIndex * 31337)) >>> 0;
      const damage = calculateTrapDamage(params.playerMaxHp || 1000, trapSeed);
      room.trapTriggered = true;
      return { ok: true, trapTriggered: true, damageIgnoringDef: damage };
    }

    if (action === 'disarm_trap') {
      if (!room.hasTrap || room.trapTriggered) {
        return { ok: true, trapDisarmed: false, message: 'Tidak ada jebakan aktif' };
      }
      room.hasTrap = false;
      return { ok: true, trapDisarmed: true };
    }

    if (action === 'clear_room') {
      room.cleared = true;
      room.eliteMonster.defeated = true;
      if (session.currentRoomIndex < 8) {
        session.currentRoomIndex++;
        return { ok: true, currentRoomIndex: session.currentRoomIndex, completed: false };
      } else {
        session.status = 'completed';
        return { ok: true, currentRoomIndex: session.currentRoomIndex, completed: true };
      }
    }
  }

  if (session.type === 'land_of_spirits') {
    const chamber = session.chambers[session.currentChamber - 1];
    if (action === 'clear_chamber') {
      chamber.defeated = true;
      if (session.currentChamber < 5) {
        session.currentChamber++;
        return { ok: true, currentChamber: session.currentChamber, completed: false };
      } else {
        session.status = 'completed';
        return {
          ok: true,
          currentChamber: session.currentChamber,
          completed: true,
          milestoneReward: session.milestoneReward
        };
      }
    }
  }

  if (session.type === 'defense_circle') {
    const wave = session.waves[session.currentWave - 1];
    if (action === 'clear_wave') {
      wave.cleared = true;
      if (session.currentWave < 5) {
        session.currentWave++;
        return { ok: true, currentWave: session.currentWave, completed: false };
      } else {
        session.status = 'completed';
        return { ok: true, currentWave: session.currentWave, completed: true };
      }
    }
  }

  return { ok: false, error: 'Aksi tidak dikenal' };
}

module.exports = {
  calculateTrapDamage,
  checkInnerDemonEvent,
  createSpiritValleySession,
  createLandOfSpiritsSession,
  createDefenseCircleSession,
  createElementalLandLoot,
  resolveStepAction,
  ELEMENT_SHARDS
};
