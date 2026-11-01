// scripts/v16/capture100Shots.js
// Menghasilkan galeri 100 tangkapan layar unik (50 titik x 2 level zoom: 1.0 & 1.4)
// dengan grid ON sesuai aturan Aturan Keras 0.6.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const SHOTS_DIR = path.resolve(PROJECT_ROOT, 'review/shots_v16');
const REQ_POINTS_PATH = path.resolve(__dirname, 'requiredPoints.json');

const extraPoints = [
  { id: 'P35_lava_spine', x: 2500, y: 4800, desc: 'Lava Spine Volcanic Biome' },
  { id: 'P36_venom_mire', x: 3800, y: 4200, desc: 'Venom Mire Toxic Swamp' },
  { id: 'P37_southern_demon', x: 2000, y: 4500, desc: 'Southern Demon Domain' },
  { id: 'P38_crimson_field', x: 1500, y: 4500, desc: 'Crimson Battlefield Wasteland' },
  { id: 'P39_abyssal_scar', x: 3200, y: 4700, desc: 'Abyssal Scar Rift' },
  { id: 'P40_spirit_wood_sea', x: 4200, y: 2500, desc: 'Spirit Wood Sea Forest' },
  { id: 'P41_mist_insect_valley', x: 4000, y: 3200, desc: 'Mist Insect Valley Marsh' },
  { id: 'P42_formation_barrens', x: 800, y: 4000, desc: 'Formation Barrens Desert' },
  { id: 'P43_sword_gorge', x: 3100, y: 3350, desc: 'Sword Gorge Azure Canyon' },
  { id: 'P44_ore_teeth', x: 3600, y: 3400, desc: 'Ore Teeth Mountain Range' },
  { id: 'P45_frostmoon_sea', x: 500, y: 500, desc: 'Frostmoon Frozen Sea' },
  { id: 'P46_eastern_sea', x: 4500, y: 2000, desc: 'Eastern Sea Coastal Water' },
  { id: 'P47_floating_wind', x: 4200, y: 800, desc: 'Floating Wind Isles Highlands' },
  { id: 'P48_immortal_ruins', x: 1000, y: 1800, desc: 'Immortal Ruins Valley' },
  { id: 'P49_void_rift', x: 4600, y: 4600, desc: 'Void Rift Chaos Domain' },
  { id: 'P50_beast_prairies', x: 3500, y: 1500, desc: 'Beast Prairies Steppe' },
  { id: 'P51_godthunder_peaks', x: 1500, y: 800, desc: 'Godthunder Storm Peaks' },
  { id: 'P52_mirror_lake', x: 2500, y: 1500, desc: 'Mirror Lake Calm Waters' }
];

async function main() {
  console.log('================================================================');
  console.log('       GENERATOR GALERI 100 SCREENSHOTS V16 (capture100Shots.js) ');
  console.log('================================================================\n');

  if (!fs.existsSync(SHOTS_DIR)) {
    fs.mkdirSync(SHOTS_DIR, { recursive: true });
  }

  const rawReq = fs.readFileSync(REQ_POINTS_PATH, 'utf8');
  const reqPoints = JSON.parse(rawReq);

  const all50Points = [
    ...reqPoints.map(p => ({ id: p.id, x: p.x, y: p.y, desc: p.desc || p.id })),
    ...extraPoints
  ];

  console.log(`Titik dasar: ${reqPoints.length} required + ${extraPoints.length} ekstra = ${all50Points.length} titik unik`);

  // Bangkitkan 100 konfigurasi capture (50 titik x 2 level zoom: 1.0 & 1.4) dengan grid: true
  const shotConfigs = [];
  for (const pt of all50Points) {
    shotConfigs.push({
      name: `${pt.id}_z10`,
      x: pt.x,
      y: pt.y,
      zoom: 1.0,
      grid: true,
      desc: `${pt.desc} (Zoom 1.0, Grid ON)`
    });
    shotConfigs.push({
      name: `${pt.id}_z14`,
      x: pt.x,
      y: pt.y,
      zoom: 1.4,
      grid: true,
      desc: `${pt.desc} (Zoom 1.4, Grid ON)`
    });
  }

  console.log(`Total shot yang akan dieksekusi: ${shotConfigs.length} tangkapan layar.\n`);

  const cfgPath = path.join(SHOTS_DIR, 'shots100_config.json');
  fs.writeFileSync(cfgPath, JSON.stringify(shotConfigs, null, 2), 'utf8');

  const captureScript = path.resolve(PROJECT_ROOT, 'scripts/captureWorld.cjs');
  console.log(`Menjalankan captureWorld via: ${captureScript}...`);
  execSync(`node "${captureScript}" "${cfgPath}" "${SHOTS_DIR}"`, { cwd: PROJECT_ROOT, stdio: 'inherit' });

  // Verifikasi seluruh 100 tangkapan layar di disk
  console.log('\nMemverifikasi integritas 100 screenshots...');
  const files = fs.readdirSync(SHOTS_DIR).filter(f => f.endsWith('.png'));
  console.log(`Total PNG ditemukan di disk: ${files.length} / 100`);

  const shaMap = new Map();
  let duplicates = 0;
  for (const f of files) {
    const full = path.join(SHOTS_DIR, f);
    const buf = fs.readFileSync(full);
    const sha = crypto.createHash('sha1').update(buf).digest('hex');
    if (shaMap.has(sha)) {
      console.error(`[DUPLIKAT] ${f} memiliki hash identik dengan ${shaMap.get(sha)} (${sha})`);
      duplicates++;
    } else {
      shaMap.set(sha, f);
    }
  }

  const gallerySummary = {
    timestamp: new Date().toISOString(),
    totalExpected: 100,
    totalCaptured: files.length,
    uniqueHashes: shaMap.size,
    duplicates,
    pass: files.length === 100 && duplicates === 0,
    status: (files.length === 100 && duplicates === 0) ? 'PASS' : 'FAIL'
  };

  const summaryPath = path.resolve(PROJECT_ROOT, 'review/v16_gallery_summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(gallerySummary, null, 2), 'utf8');
  console.log(`\nRingkasan galeri disimpan ke: ${summaryPath}`);

  if (!gallerySummary.pass) {
    console.error(`[FAIL] Galeri tidak lengkap atau terdapat duplikat.`);
    process.exit(1);
  } else {
    console.log(`[PASS] Seluruh 100 tangkapan layar V16 berhasil ditangkap dengan 100 SHA-1 unik!`);
  }
}

main().catch(err => {
  console.error('[FATAL]', err);
  process.exit(1);
});
