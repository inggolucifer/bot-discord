#!/usr/bin/env node
/**
 * scripts/v20/generateRuins.js
 * Generator Deterministik Reruntuhan Kuno di Alam Liar (40-80 entri)
 * Seed: 20261103
 */

const fs = require('fs');
const path = require('path');
const anchors = require('../../world-data/anchors.json');
const proceduralWorldEngine = require('../../utils/proceduralWorldEngine');
const standaloneHomes = require('../../world-data/standalone-homes-v20.json');

const SEED = 20261103 ^ 0xFEEDFACE;

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

const RUIN_TEMPLATES = [
  {
    kind: 'collapsed_cottage',
    defId: 'hut_abandoned_thatched_ruin',
    names: ['Pondok Runtuh Berlumut', 'Gubuk Lapuk Terbengkalai', 'Bekas Pondok Penebang Tua', 'Reruntuhan Atap Jerami'],
    descriptions: [
      'Pondok kayu yang dindingnya telah lapuk dimakan rayap dan cuaca.',
      'Sisa tiang kayu dan atap jerami yang hampir menyatu dengan tanah hutan.',
      'Ditinggalkan bertahun-tahun lalu oleh penghuninya yang melarikan diri dari kekacauan.'
    ]
  },
  {
    kind: 'abandoned_hermitage',
    defId: 'hut_abandoned_hermit_ruin',
    names: ['Pertapaan Sunyi Terbengkalai', 'Pondok Semedi Retak', 'Reruntuhan Gua Daois', 'Pertapaan Angin Runtuh'],
    descriptions: [
      'Tempat bertapa seorang kultivator masa lalu, kini dipenuhi lumut dan akar tanaman menjalar.',
      'Meja batu tempat meditasi masih utuh, meski atap bangunannya telah lama ambruk.',
      'Tercium sisa aroma dupa kuno yang samar terbawa hembusan angin gunung.'
    ]
  },
  {
    kind: 'stone_stele_ruin',
    defId: 'building_wayside_stone_stele_pavilion_ruin',
    names: ['Prasasti Batu Retak', 'Paviliun Prasasti Kuno Runtuh', 'Monumen Berlumut Abadi', 'Tugu Peringatan Perang Kuno'],
    descriptions: [
      'Sebuah prasasti batu tinggi dengan aksara kuno yang sebagian telah terkikis badai.',
      'Sisa pilar batu dari paviliun prasasti yang hancur saat perang sekte berabad-abad silam.',
      'Aksara kaligrafi pada batu ini memancarkan residu Qi pedang yang samar namun tajam.'
    ]
  },
  {
    kind: 'sword_grave_remnant',
    defId: 'structure_scatter_ruin_ancient_broken_halberd_sword_grave',
    names: ['Makam Senjata Patah', 'Puing Medan Tempur Kuno', 'Gundukan Pedang Berkarat', 'Sarang Halberd Retak'],
    descriptions: [
      'Sisa-sisa tombak dan pedang perang berkarat yang tertancap di atas tanah berbatu.',
      'Medan tempur masa lalu di mana para prajurit fana dan kultivator gugur bersama.',
      'Bilah-bilah senjata kuno yang telah kehilangan kilau spiritualnya dimakan zaman.'
    ]
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

const ruins = [];
const TARGET_COUNT = 55; // Within 40-80
const MIN_DISTANCE_RUINS = 25; // Chebyshev

// Candidate sampling across world
const candidates = [];
for (let y = 800; y <= 4200; y += 50) {
  for (let x = 800; x <= 4200; x += 50) {
    const jx = Math.round(x + (rng() - 0.5) * 40);
    const jy = Math.round(y + (rng() - 0.5) * 40);
    candidates.push({ x: jx, y: jy });
  }
}

// Shuffle
for (let i = candidates.length - 1; i > 0; i--) {
  const j = Math.floor(rng() * (i + 1));
  [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
}

for (const cand of candidates) {
  if (ruins.length >= TARGET_COUNT) break;

  const { x, y } = cand;
  if (x < 100 || x > 4900 || y < 100 || y > 4900) continue;

  // Check exclusion zone (+ 6 tile safety buffer)
  if (isNearExclusion(x, y, 6)) continue;

  // Check distance to other ruins (>= 25)
  const tooCloseRuin = ruins.some(r => Math.max(Math.abs(r.x - x), Math.abs(r.y - y)) < MIN_DISTANCE_RUINS);
  if (tooCloseRuin) continue;

  // Check distance to standalone homes (>= 20)
  const tooCloseHome = standaloneHomes.some(h => Math.max(Math.abs(h.x - x), Math.abs(h.y - y)) < 20);
  if (tooCloseHome) continue;

  // Terrain check (not ocean / abyss / hazard)
  const tile = proceduralWorldEngine.getTileAt(x, y);
  if (!tile) continue;
  const tt = (tile.terrainType || '').toLowerCase();
  if (tt.includes('ocean') || tt.includes('sea') || tt.includes('water') || tt.includes('abyss') || tt.includes('hazard')) continue;

  const tpl = RUIN_TEMPLATES[Math.floor(rng() * RUIN_TEMPLATES.length)];
  const name = tpl.names[Math.floor(rng() * tpl.names.length)];
  const desc = tpl.descriptions[Math.floor(rng() * tpl.descriptions.length)];

  const ruinId = `ruin_${String(ruins.length + 1).padStart(2, '0')}`;
  ruins.push({
    id: ruinId,
    x,
    y,
    defId: tpl.defId,
    kind: tpl.kind,
    name,
    description: desc,
    regionSlug: tile.regionId || 'central_plains'
  });
}

const outPath = path.resolve(__dirname, '../../world-data/ruins-v20.json');
fs.writeFileSync(outPath, JSON.stringify(ruins, null, 2), 'utf8');
console.log(`Generated ${ruins.length} wilderness ruins at world-data/ruins-v20.json.`);
