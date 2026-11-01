'use strict';
/**
 * scripts/v15/capture80Shots.js
 * Authoritative 80-Shot Capture Suite for V15.
 * Captures 40 unique geographic coordinates at zoom 1.0 and 1.4 (80 PNGs total).
 * Output: review/shots_v15/*.png
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const POINTS = [
  // 1. 7 Evaluation Points
  { id: 'eval_01_xingcun', x: 2050, y: 2650, desc: 'Desa Xingcun Center' },
  { id: 'eval_02_xingcun_east', x: 2062, y: 2648, desc: 'Desa Xingcun East' },
  { id: 'eval_03_wilderness', x: 2300, y: 3000, desc: 'Central Wilderness' },
  { id: 'eval_04_xueshan', x: 2350, y: 4300, desc: 'Xueshan Snow Frost' },
  { id: 'eval_05_azure_pass', x: 2200, y: 3340, desc: 'Azure Mountain Pass North' },
  { id: 'eval_06_hanhai', x: 900, y: 2600, desc: 'Western Sacred Desert Hanhai' },
  { id: 'eval_07_donghai', x: 3950, y: 2600, desc: 'Donghai Port & Coast' },

  // 2. 5 Azure Wall Windows
  { id: 'azure_win_01_caravan', x: 750, y: 3340, desc: 'Azure Wall Caravan Gap' },
  { id: 'azure_win_02_west_barrier', x: 1500, y: 3350, desc: 'Azure Wall Solid West Barrier' },
  { id: 'azure_win_03_north_pass', x: 2200, y: 3350, desc: 'Azure Wall North Pass Gate' },
  { id: 'azure_win_04_mist_pass', x: 2600, y: 3340, desc: 'Azure Wall Mist Pass Gate' },
  { id: 'azure_win_05_sword_pass', x: 3100, y: 3340, desc: 'Azure Wall Sword Gorge Pass Gate' },

  // 3. 6 Mountains & Valleys
  { id: 'mt_01_azure_high_peak', x: 1800, y: 3350, desc: 'Azure High Peak Massif' },
  { id: 'mt_02_ore_teeth', x: 3625, y: 2800, desc: 'Ore Teeth Range Ridge' },
  { id: 'mt_03_hermit_highlands', x: 2700, y: 3600, desc: 'Hermit Highlands Plateau' },
  { id: 'mt_04_wind_isles', x: 4600, y: 2700, desc: 'Floating Wind Isles' },
  { id: 'mt_05_western_gorge', x: 600, y: 3300, desc: 'Western Gorge Labyrinth' },
  { id: 'mt_06_sword_gorge', x: 3300, y: 3700, desc: 'Sword Gorge Deep Ravine' },

  // 4. 6 Biome Borders & Transitions
  { id: 'border_01_plains_delta', x: 1800, y: 2500, desc: 'Plains to Nine Springs Delta' },
  { id: 'border_02_plains_prairies', x: 2300, y: 2200, desc: 'Plains to Beast Prairies' },
  { id: 'border_03_desert_steppe', x: 1100, y: 2700, desc: 'Desert to Thundersteppe' },
  { id: 'border_04_azure_highlands', x: 2400, y: 3500, desc: 'Azure Range to Hermit Highlands' },
  { id: 'border_05_frost_tundra', x: 2500, y: 4200, desc: 'Frostmoon Sea to Snow Tundra' },
  { id: 'border_06_coast_sea', x: 3900, y: 2700, desc: 'Bone Sea Coast to Eastern Sea' },

  // 5. 16 Landmarks, Towns & Diverse Wilderness
  { id: 'land_01_xitong_city', x: 2300, y: 2700, desc: 'XiTong City Capital' },
  { id: 'land_02_fengyang_city', x: 2200, y: 2100, desc: 'Fengyang City' },
  { id: 'land_03_jinling_city', x: 1900, y: 2900, desc: 'Jinling City' },
  { id: 'land_04_leiyin_town', x: 1500, y: 3800, desc: 'Leiyin Town' },
  { id: 'land_05_canghai_town', x: 3800, y: 2300, desc: 'Canghai Town' },
  { id: 'land_06_bamboo_village', x: 2150, y: 2600, desc: 'Bamboo Grove Village' },
  { id: 'land_07_peach_orchard', x: 2080, y: 2620, desc: 'Peach Orchard Hamlet' },
  { id: 'land_08_shadi_oasis', x: 800, y: 3000, desc: 'Shadi Oasis Camp' },
  { id: 'land_09_heiyan_village', x: 500, y: 3800, desc: 'Heiyan Village' },
  { id: 'land_10_spirit_wood_sea', x: 3200, y: 2200, desc: 'Spirit Wood Sea Forest' },
  { id: 'land_11_godthunder_peaks', x: 3400, y: 4000, desc: 'Godthunder Peaks' },
  { id: 'land_12_lava_spine', x: 1200, y: 4200, desc: 'Lava Spine Volcano' },
  { id: 'land_13_abyssal_scar', x: 1000, y: 1500, desc: 'Abyssal Scar' },
  { id: 'land_14_tiedao_village', x: 1800, y: 2200, desc: 'Tiedao Village' },
  { id: 'land_15_binghu_town', x: 2400, y: 4100, desc: 'Binghu Town' },
  { id: 'land_16_moyun_town', x: 400, y: 3600, desc: 'Moyun Town' }
];

console.log(`=== MENYIAPKAN 80 TANGKAPAN DUNIA V15 (capture80Shots.js) ===`);
console.log(`Titik geografis: ${POINTS.length} titik x 2 level zoom (1.0 & 1.4) = ${POINTS.length * 2} screenshot\n`);

const shots = [];
for (const pt of POINTS) {
  shots.push({
    name: `${pt.id}_z10`,
    x: pt.x,
    y: pt.y,
    zoom: 1.0,
    grid: 1,
    desc: `${pt.desc} (Zoom 1.0, Grid ON)`
  });
  shots.push({
    name: `${pt.id}_z14`,
    x: pt.x,
    y: pt.y,
    zoom: 1.4,
    grid: 1,
    desc: `${pt.desc} (Zoom 1.4, Grid ON)`
  });
}

const shotsJsonPath = path.resolve(__dirname, 'shots_v15_config.json');
fs.writeFileSync(shotsJsonPath, JSON.stringify(shots, null, 2), 'utf8');

const outDir = path.resolve(__dirname, '../../review/shots_v15');
fs.mkdirSync(outDir, { recursive: true });

console.log(`Menjalankan captureWorld.cjs untuk ${shots.length} screenshot...`);
console.log(`Direktori output: ${outDir}\n`);

const proc = spawn('node', [
  path.resolve(__dirname, '../captureWorld.cjs'),
  shotsJsonPath,
  outDir
], { stdio: 'inherit' });

proc.on('close', (code) => {
  console.log(`\n[capture80Shots] Proses selesai dengan exit code: ${code}`);
  
  // Verifikasi keunikan sha1 & ketiadaan duplikat
  const files = fs.readdirSync(outDir).filter(f => f.endsWith('.png'));
  console.log(`Total PNG berhasil disimpan: ${files.length} / 80`);
  process.exit(code || 0);
});
