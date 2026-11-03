#!/usr/bin/env node
/**
 * scripts/v20/generateStandaloneHomes.js
 * Generator Deterministik Rumah Menyendiri di Alam Liar (60-120 entri)
 * Seed: 20261103
 */

const fs = require('fs');
const path = require('path');
const anchors = require('../../world-data/anchors.json');
const proceduralWorldEngine = require('../../utils/proceduralWorldEngine');
const { isInSettlementExclusion } = require('../../utils/settlementZones');

const SEED = 20261103;

// Mulberry32 PRNG
function createPRNG(seed) {
  let s = seed >>> 0;
  return function() {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = createPRNG(SEED);

// Occupant professions & naming
const OCCUPANT_TEMPLATES = [
  {
    profession: 'hermit',
    defIds: ['hut_mountain_hermit_day', 'hut_daoist_shrine_day'],
    names: ['Pertapa Xuanming', 'Kakek Berjanggut Putih', 'Pertapa Bintang Sunyi', 'Daois Qinghe', 'Nenek Penenun Awan', 'Pertapa Lembah Pinus'],
    housePrefixes: ['Gubuk Semedi', 'Pondok Bertapa', 'Pondok Hening', 'Gubuk Bambu', 'Pertapaan Awan'],
    dialogs: [
      'Dunia fana terlalu bising. Di sini, hati tenang bersama angin.',
      'Kultivasi sejati bukan tentang menaklukkan langit, tapi mendamaikan batin.',
      'Jika mencari pencerahan, perhatikan bagaimana air mengalir tanpa tergesa.',
      'Arak herbal ini diseduh dari embun pagi tujuh puncak gunung.'
    ],
    biomes: ['mountain', 'bamboo', 'pine', 'cliff', 'crag', 'spirit_wood']
  },
  {
    profession: 'hunter',
    defIds: ['hut_hunter_thatched_day'],
    names: ['Pemburu Zhao', 'Pemanah Sunyi', 'Penjerat Serigala Liar', 'Pemburu Gao', 'Penjejak Rimba Tua', 'Penjaga Batas Hutan'],
    housePrefixes: ['Gubuk Pemburu', 'Pondok Penjejak', 'Perkemahan Kayu', 'Gubuk Kulit Rusa'],
    dialogs: [
      'Hati-hati melangkah di hutan utara, kabutnya tebal dan beracun.',
      'Panah ini terbuat dari kayu besi berusia seratus tahun.',
      'Jejak serigala roh semakin dekat. Jangan berjalan sendirian saat senja.',
      'Daging buruan asap ini cukup untuk bertahan melewati musim dingin.'
    ],
    biomes: ['forest', 'woods', 'dense', 'hills', 'jungle']
  },
  {
    profession: 'woodcutter',
    defIds: ['hut_pine_woodcutter_day', 'hut_charcoal_burner_day'],
    names: ['Penebang Chen', 'Pembakar Arang Tua', 'Penebang Kayu Besi', 'Paman Kayu Wu', 'Pembakar Arang Yin'],
    housePrefixes: ['Pondok Penebang Kayu', 'Gubuk Pembakar Arang', 'Gudang Kayu Pinus'],
    dialogs: [
      'Pohon pinus kuno memiliki getah spiritual yang wangi dan langka.',
      'Kapak ini telah menemaniku membelah kayu selama tiga puluh tahun.',
      'Arang hitam ini membakar tanpa asap, digemari para ahli alkimia.'
    ],
    biomes: ['forest', 'pine', 'hills', 'wood']
  },
  {
    profession: 'fisher',
    defIds: ['hut_stilt_fisher_day'],
    names: ['Pemancing Liu', 'Kakek Kail Bambu', 'Nelayan Danau Dingin', 'Pencari Mutiara Sungai', 'Nelayan Kabut'],
    housePrefixes: ['Pondok Nelayan Panggung', 'Gubuk Tepi Danau', 'Pondok Kail Sunyi'],
    dialogs: [
      'Ikan roh emas hanya memakan lumut di dasar sungai saat bulan purnama.',
      'Duduk tenang menunggu umpan adalah salah satu cara melatih kesabaran Dao.',
      'Rakit bambuku sudah tua, tapi masih perkasa menembus arus.'
    ],
    biomes: ['river', 'lake', 'water', 'marsh', 'delta']
  },
  {
    profession: 'shepherd',
    defIds: ['hut_steppe_shepherd_day', 'hut_tea_harvester_day'],
    names: ['Gembala Padang Rumput', 'Pemetik Teh Embun', 'Gadis Padang Bunga', 'Pemetik Herba Gunung'],
    housePrefixes: ['Pondok Gembala Stepa', 'Gubuk Kebun Teh', 'Pondok Padang Bunga'],
    dialogs: [
      'Daun teh gunung ini dipetik sebelum matahari terbit, khasiatnya memurnikan Qi.',
      'Domba-domba ini makan rumput perak yang hanya tumbuh di padang ini.',
      'Suara suling bambuku menenangkan hewan liar di sekitar.'
    ],
    biomes: ['plains', 'steppe', 'grassland', 'hills', 'plateau']
  },
  {
    profession: 'desert_hermit',
    defIds: ['hut_desert_adobe_day', 'hut_obsidian_stone_day'],
    names: ['Penjaga Oasis Abu', 'Musafir Pasir Emas', 'Peramal Badai Gurun', 'Pertapa Batu Hitam'],
    housePrefixes: ['Pondok Tanah Gurun', 'Gubuk Oasis Terpencil', 'Pondok Batu Hitam'],
    dialogs: [
      'Di bawah lautan pasir ini terkubur sisa-sisa sekte kuno ribuan tahun lalu.',
      'Air di gurun ini lebih berharga daripada batu roh.',
      'Malam di gurun sangat dingin, peliharalah api dantians-mu.'
    ],
    biomes: ['desert', 'arid', 'badlands', 'dunes', 'volcanic']
  },
  {
    profession: 'snow_hermit',
    defIds: ['hut_snow_thatched_day'],
    names: ['Pertapa Salju Abadi', 'Penjaga Es Danau Bulan', 'Penyair Angin Beku'],
    housePrefixes: ['Gubuk Salju Beku', 'Pondok Es Dingin', 'Pertapaan Puncak Salju'],
    dialogs: [
      'Hawa dingin ini justru membakar kobaran api internal kultivator.',
      'Bunga teratai salju hanya mekar di tebing tertinggi.',
      'Salju turun menutupi seluruh jejak masa lalu.'
    ],
    biomes: ['snow', 'ice', 'frost', 'tundra']
  }
];

// Check distance against exclusion zone + 6 margin
function isNearExclusion(x, y, margin = 6) {
  for (const a of anchors) {
    const rad = ((a.v20 && a.v20.exclusionRadius) || 10) + margin;
    const minX = a.x - rad;
    const maxX = a.x + a.spanWidth - 1 + rad;
    const minY = a.y - rad;
    const maxY = a.y + a.spanHeight - 1 + rad;
    if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
      return true;
    }
  }
  return false;
}

// Target: 80-90 homes
const homes = [];
const TARGET_COUNT = 85;
const MIN_DISTANCE_HOMES = 30; // Chebyshev

// Candidate grid sampling across world (bounding box 1000..4000)
const candidates = [];
for (let y = 1000; y <= 4000; y += 45) {
  for (let x = 1000; x <= 4000; x += 45) {
    const jx = Math.round(x + (rng() - 0.5) * 36);
    const jy = Math.round(y + (rng() - 0.5) * 36);
    candidates.push({ x: jx, y: jy });
  }
}

// Shuffle candidates
for (let i = candidates.length - 1; i > 0; i--) {
  const j = Math.floor(rng() * (i + 1));
  [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
}

for (const cand of candidates) {
  if (homes.length >= TARGET_COUNT) break;

  const { x, y } = cand;
  if (x < 100 || x > 4900 || y < 100 || y > 4900) continue;

  // Check exclusion zone (+ 6 tile safety buffer)
  if (isNearExclusion(x, y, 6)) continue;

  // Check distance to already placed homes (Chebyshev >= 30)
  const tooClose = homes.some(h => Math.max(Math.abs(h.x - x), Math.abs(h.y - y)) < MIN_DISTANCE_HOMES);
  if (tooClose) continue;

  // Check terrain passability (walkable land, not solid cliff, not water)
  const tile = proceduralWorldEngine.getTileAt(x, y);
  if (!tile) continue;
  if (tile.isSolid) continue;
  const tt = (tile.terrainType || '').toLowerCase();
  if (tt.includes('ocean') || tt.includes('sea') || tt.includes('water') || tt.includes('lake') || tt.includes('abyss') || tt.includes('hazard')) continue;

  // Biome matching
  let matchedTpl = OCCUPANT_TEMPLATES[0];
  for (const tpl of OCCUPANT_TEMPLATES) {
    if (tpl.biomes.some(b => tt.includes(b))) {
      matchedTpl = tpl;
      break;
    }
  }

  const defId = matchedTpl.defIds[Math.floor(rng() * matchedTpl.defIds.length)];
  const name = matchedTpl.names[Math.floor(rng() * matchedTpl.names.length)];
  const prefix = matchedTpl.housePrefixes[Math.floor(rng() * matchedTpl.housePrefixes.length)];
  const dialog = matchedTpl.dialogs[Math.floor(rng() * matchedTpl.dialogs.length)];

  const homeId = `home_${String(homes.length + 1).padStart(2, '0')}`;
  homes.push({
    id: homeId,
    x,
    y,
    defId,
    occupantName: name,
    profession: matchedTpl.profession,
    houseName: `${prefix} ${name.split(' ').slice(1).join(' ') || name}`,
    dialog,
    regionSlug: tile.regionId || 'central_plains'
  });
}

const outPath = path.resolve(__dirname, '../../world-data/standalone-homes-v20.json');
fs.writeFileSync(outPath, JSON.stringify(homes, null, 2), 'utf8');
console.log(`Generated ${homes.length} standalone wilderness homes at world-data/standalone-homes-v20.json.`);
