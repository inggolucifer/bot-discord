const fs = require('fs');
const path = require('path');

const settlementSprites = require('../../world-data/settlement-sprites-v20.json');

const rows = [
  ['markerDefId', 'nama', 'tipe', 'biome', 'visualW', 'visualH', 'prompt_midjourney', 'prompt_sdxl_dall_e', 'palette', 'referensi_gaya']
];

for (const [id, s] of Object.entries(settlementSprites)) {
  const parts = id.split('_');
  const type = parts[1] || 'settlement';
  const biome = parts[2] || 'plains';

  let styleDesc = 'Traditional Song Dynasty ink wash architectural complex';
  if (type === 'sect') styleDesc = 'Grand immortal mountain gate with soaring Daoist pavilions, floating mist, carved dragon stone stairs';
  else if (type === 'city' || type === 'capital') styleDesc = 'Imperial Chinese fortress palace gate with double flying eaves, crimson lacquer pillars, glazed golden tiles';
  else if (type === 'port') styleDesc = 'Bustling ancient water dock with timber jetties, stone beacon watchtowers, moored junks, water ripples';
  else if (type === 'outpost') styleDesc = 'Frontier fortified garrison gatehouse with heavy wooden barricades, watchtowers, banners fluttering in wind';
  else if (type === 'village' || type === 'hamlet') styleDesc = 'Picturesque rural wuxia hamlet compound with thatched roofs, cobblestone courtyards, weeping willow trees';

  const mjPrompt = `isometric 2D game asset, ${styleDesc}, ${biome} atmosphere, Tale of Immortal art style, wuxia xianxia aesthetic, clean alpha background, 8k resolution, elegant ink outline --no modern elements, realistic photo --ar 4:3`;
  const sdxlPrompt = `isometric view 2D game building sprite, ${styleDesc}, set in ${biome} environment, traditional Chinese painting, Guofeng Xianxia art, high details, transparent background`;
  const palette = type === 'sect' ? 'Imperial Gold / Azure' : (type === 'city' ? 'Crimson / Dark Ink' : 'Earth Brown / Bamboo Green');
  const refStyle = 'Tale of Immortal / Gui Gu Ba Huang (鬼谷八荒)';

  rows.push([
    id,
    id.replace(/_/g, ' '),
    type,
    biome,
    s.visualW,
    s.visualH,
    `"${mjPrompt}"`,
    `"${sdxlPrompt}"`,
    palette,
    refStyle
  ]);
}

// Add ruins and wilderness variants
const ruinPrompts = [
  ['hut_abandoned_thatched_ruin', 'Pondok Runtuh Berlumut', 'ruin', 'wilderness', 1, 1, '"isometric 2D game asset, collapsed ancient thatched hut, rotten timber beams, overgrown moss and weeds, desolate wuxia wilderness, transparent background --ar 1:1"', '"isometric 2D ruin sprite, collapsed dilapidated cottage, mossy wooden planks, abandoned, transparent background"', 'Rotten Timber / Dark Green', 'Tale of Immortal'],
  ['hut_abandoned_hermit_ruin', 'Pertapaan Sunyi Terbengkalai', 'ruin', 'mountain', 1, 1, '"isometric 2D game asset, ancient ruined hermit sanctuary, cracked stone meditation dais, drifting fog, neglected Daoist altar, transparent background --ar 1:1"', '"isometric 2D ruin sprite, abandoned mountain hermitage, cracked stone platform, misty mountain peak, transparent background"', 'Slate Grey / Weathered Stone', 'Tale of Immortal'],
  ['building_wayside_stone_stele_pavilion_ruin', 'Prasasti Batu Retak', 'ruin', 'crossroad', 2, 2, '"isometric 2D game asset, cracked ancient stone stele monument in ruined wooden pavilion, weathered calligraphy inscription, sword qi scars, transparent background --ar 1:1"', '"isometric 2D game sprite, cracked ancient memorial stone stele, weathered pavilion beams, transparent background"', 'Granite Grey / Lichen Green', 'Tale of Immortal'],
  ['structure_scatter_ruin_ancient_broken_halberd_sword_grave', 'Makam Senjata Patah', 'ruin', 'battlefield', 2, 2, '"isometric 2D game asset, ancient sword grave battlefield ruin, broken halberds and rusted swords thrust into rocky soil, faint spiritual residue, transparent background --ar 1:1"', '"isometric 2D ruin sprite, ancient battlefield sword grave, rusted spears and broken blades in cracked earth, transparent background"', 'Rust Brown / Charcoal Black', 'Tale of Immortal']
];

for (const r of ruinPrompts) {
  rows.push(r);
}

const csvContent = rows.map(r => r.join(',')).join('\n');
const outCsvPath = path.resolve(__dirname, '../../world-data/settlement-art-prompts-v20.csv');
fs.writeFileSync(outCsvPath, csvContent, 'utf8');
console.log(`Generated world-data/settlement-art-prompts-v20.csv with ${rows.length - 1} entries.`);
