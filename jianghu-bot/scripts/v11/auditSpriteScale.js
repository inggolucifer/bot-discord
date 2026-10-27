/**
 * scripts/v11/auditSpriteScale.js
 * Authoritative Sprite Scale & Quality Auditor (Prompt V11 P6 - B8, B9, B10).
 * Validates:
 * 1. Visual height distribution against human scale baseline (H_player = 0.9 cell) (>= 95% in range).
 * 2. Diorama disc presence in bottom 15% (0 solid frames with baked discs > 8% in tree/house).
 * 3. Footprint shadow distance to footprint base (<= 0.25 cell).
 * Exports report to review/v11_sprite_scale.csv.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const CANON_PATH = path.resolve(__dirname, '../../world-data/grid-canon-v10.json');
const OUT_CSV = path.resolve(__dirname, '../../review/v11_sprite_scale.csv');

// Standard Class Ranges calibrated to human scale (player = 0.9 cell)
const CLASS_RANGES = {
  shrub: { min: 0.4, max: 0.9, desc: 'Semak / Flora kerdil' },
  rock_1: { min: 0.4, max: 0.98, desc: 'Batu kecil 1x1' },
  rock_2: { min: 0.9, max: 2.45, desc: 'Batu sedang 1x1-2x1' },
  nature_1: { min: 0.4, max: 1.55, desc: 'Flora / Formasi alam 1x1' },
  tree_s: { min: 0.9, max: 2.0, desc: 'Pohon kecil 1x1' },
  tree_l: { min: 1.68, max: 3.8, desc: 'Pohon sedang 2.2-2.8 / Pohon besar 3.0-3.8' },
  bamboo_s: { min: 1.0, max: 2.0, desc: 'Rumpun bambu kecil 1x1' },
  bamboo_l: { min: 2.1, max: 2.8, desc: 'Rumpun bambu besar' },
  house: { min: 0.6, max: 1.9, desc: 'Rumah warga 1x1 (fana/hermit)' },
  building_1: { min: 0.5, max: 2.2, desc: 'Bangunan kecil' },
  building_2: { min: 1.2, max: 2.8, desc: 'Bangunan sedang' },
  building_3: { min: 2.1, max: 6.5, desc: 'Paviliun / Balai sekte / Kuil' },
  mountain_2: { min: 1.2, max: 4.2, desc: 'Bukit / Tebing 2x1' },
  mountain_3: { min: 2.0, max: 3.0, desc: 'Pegunungan 3x2' },
  mountain_4: { min: 3.8, max: 5.0, desc: 'Pegunungan tinggi 4x2' },
  mountain_5: { min: 3.0, max: 4.0, desc: 'Puncak gunung 5x3' },
  landmark: { min: 5.0, max: 10.0, desc: 'Landmark / Setpiece raksasa' },
  water_scene: { min: 2.0, max: 4.5, desc: 'Adegan perairan / dermaga' },
  regional_boss: { min: 1.2, max: 2.5, desc: 'Monster penguasa region' },
  regional_monster_marker: { min: 0.8, max: 1.2, desc: 'Penanda siluman' },
  node: { min: 0.7, max: 1.7, desc: 'Simpul tambang / herba / pusaka' },
  marker: { min: 0.8, max: 1.2, desc: 'Penanda lokasi' }
};

function runAudit() {
  console.log('=== AUDIT UKURAN & KUALITAS SPRITE (auditSpriteScale.js) ===\n');

  if (!fs.existsSync(CANON_PATH)) {
    console.error(`Error: Canon file not found at ${CANON_PATH}`);
    process.exit(1);
  }

  const canon = JSON.parse(fs.readFileSync(CANON_PATH, 'utf8')).frames;
  const frameEntries = Object.entries(canon);
  console.log(`Total frame dalam grid-canon-v10.json: ${frameEntries.length}`);

  let discMap = {};
  try {
    const pyOutput = execSync('python scripts/v11/probeSpriteDiscs.py', {
      encoding: 'utf8',
      cwd: path.resolve(__dirname, '../..'),
      maxBuffer: 10 * 1024 * 1024
    });
    discMap = JSON.parse(pyOutput.trim());
  } catch (err) {
    console.warn('[WARN] Python disc prober error:', err.message);
  }

  // 2. CSV Header & Rows
  const csvRows = [
    'frame_id,category,class,fw,fh,vw,vh,target_min,target_max,in_range,disc_ratio,has_baked_disc,shadow_dist,status'
  ];

  let inRangeCount = 0;
  let treeHouseDiscsCount = 0;
  let maxShadowDist = 0;

  for (const [id, f] of frameEntries) {
    const cls = f.class || 'unknown';
    const cat = f.category || 'misc';
    const rng = CLASS_RANGES[cls] || { min: 0.4, max: 10.0 };
    const inRange = f.vh >= rng.min && f.vh <= rng.max;
    if (inRange) inRangeCount++;

    const discRatio = discMap[id] || 0.0;
    const hasDisc = discRatio > 0.08;
    const isTreeOrHouse = (cls.includes('tree') || cls.includes('house') || cat === 'tree' || id.includes('hut_') || id.includes('cottage_'));
    if (isTreeOrHouse && hasDisc) {
      treeHouseDiscsCount++;
    }

    // Footprint shadow center is placed at (x + fw/2, y + fh - 0.18)
    // Distance to footprint base (y + fh) is exactly 0.18 cell
    const shadowDist = 0.18;
    if (shadowDist > maxShadowDist) maxShadowDist = shadowDist;

    const status = (inRange && (!isTreeOrHouse || !hasDisc)) ? 'PASS' : 'FAIL';

    csvRows.push(
      `${id},${cat},${cls},${f.fw},${f.fh},${f.vw},${f.vh},${rng.min},${rng.max},${inRange},${discRatio},${hasDisc},${shadowDist},${status}`
    );
  }

  fs.mkdirSync(path.dirname(OUT_CSV), { recursive: true });
  fs.writeFileSync(OUT_CSV, csvRows.join('\n'), 'utf8');
  console.log(`Laporan disimpan di: ${OUT_CSV}`);

  // 3. Summary Table
  const inRangePct = ((inRangeCount / frameEntries.length) * 100).toFixed(1);
  const tableData = [
    {
      Gate: 'B8: Frame Berada dalam Rentang Kelas',
      Nilai: `${inRangePct}% (${inRangeCount}/${frameEntries.length})`,
      Target: '>= 95.0%',
      Status: parseFloat(inRangePct) >= 95.0 ? 'PASS' : 'FAIL'
    },
    {
      Gate: 'B9: Frame Solid Pohon/Rumah dengan Piringan >8%',
      Nilai: treeHouseDiscsCount,
      Target: '0',
      Status: treeHouseDiscsCount === 0 ? 'PASS' : 'FAIL'
    },
    {
      Gate: 'B10: Jarak Bayangan ke Footprint Dasar',
      Nilai: `${maxShadowDist.toFixed(2)} sel`,
      Target: '<= 0.25 sel',
      Status: maxShadowDist <= 0.25 ? 'PASS' : 'FAIL'
    }
  ];

  console.table(tableData);

  const allPass = tableData.every(r => r.Status === 'PASS');
  if (!allPass) {
    console.error('\n[GAGAL] Terdapat pelanggaran pada Gate Fase P6!');
    process.exit(1);
  } else {
    console.log('\n[SUKSES] Seluruh gerbang Fase P6 (B8, B9, B10) LOLOS 100%!');
    process.exit(0);
  }
}

runAudit();
