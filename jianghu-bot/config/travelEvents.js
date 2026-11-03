/**
 * JIANGHU BOT & IMMORTAL-X — DETERMINISTIC TRAVEL EVENTS (config/travelEvents.js)
 * V21 F4: Tabel probabilitas & penentu event perjalanan deterministik berbasis seed hash
 */

const TRAVEL_EVENTS = [
  {
    type: 'peaceful_journey',
    name: 'Perjalanan Tenang',
    weight: 50,
    description: 'Perjalanan tenang diiringi kicauan burung bangau dan semilir angin pegunungan yang menyejukkan hati.',
    isAmbush: false,
    qiBonus: 5
  },
  {
    type: 'spiritual_anomaly',
    name: 'Anomali Spiritual',
    weight: 20,
    description: 'Merasakan pusaran Qi murni di tepi tebing, memicu resonansi meridian dan pemulihan dantian.',
    isAmbush: false,
    qiBonus: 25
  },
  {
    type: 'traveling_merchant',
    name: 'Pedagang Keliling',
    weight: 15,
    description: 'Berpapasan dengan karavan pedagang keliling Jianghu yang ramah menyapa dari atas pedati.',
    isAmbush: false,
    qiBonus: 0
  },
  {
    type: 'bandit_ambush',
    name: 'Begal Hutan Hijau',
    weight: 15,
    description: 'Sekelompok begal bertopeng melompat dari semak-semak menghadang jalan setapak!',
    isAmbush: true,
    qiBonus: 0
  }
];

/**
 * 32-bit Integer FNV-1a / Murmur-like deterministic hash
 */
function hashSeed(inputStr) {
  const str = String(inputStr || '');
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return Math.abs(hash >>> 0);
}

/**
 * Menentukan event perjalanan secara deterministik per ruas jalur.
 * Pemain yang logout atau reconnect akan selalu mendapatkan hasil event yang sama persis.
 */
function resolveTravelEvent(playerId, edgeKey, startedAtTimestamp) {
  const seedString = `${playerId}:${edgeKey}:${startedAtTimestamp}`;
  const seed = hashSeed(seedString);
  const roll = seed % 100; // 0..99

  let cumulative = 0;
  for (const event of TRAVEL_EVENTS) {
    cumulative += event.weight;
    if (roll < cumulative) {
      return {
        ...event,
        seedRoll: roll,
        resolvedAt: startedAtTimestamp
      };
    }
  }

  return {
    ...TRAVEL_EVENTS[0],
    seedRoll: roll,
    resolvedAt: startedAtTimestamp
  };
}

/**
 * Evaluasi offline / real-time kemajuan perjalanan
 */
function evaluateTravelProgress(startedAtMs, arriveAtMs, nowMs = Date.now()) {
  const start = Number(startedAtMs);
  const end = Number(arriveAtMs);
  const now = Number(nowMs);

  if (now >= end) {
    return {
      progressPercent: 100,
      isArrived: true,
      remainingMs: 0
    };
  }

  const total = end - start;
  if (total <= 0) {
    return {
      progressPercent: 100,
      isArrived: true,
      remainingMs: 0
    };
  }

  const elapsed = Math.max(0, now - start);
  const ratio = Math.min(1, elapsed / total);

  return {
    progressPercent: Math.floor(ratio * 100),
    isArrived: false,
    remainingMs: Math.max(0, end - now)
  };
}

module.exports = {
  TRAVEL_EVENTS,
  hashSeed,
  resolveTravelEvent,
  evaluateTravelProgress
};
