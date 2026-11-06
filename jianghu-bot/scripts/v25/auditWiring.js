/**
 * scripts/v25/auditWiring.js
 * Baseline Wiring Audit & Red Test Lock for V25 (K0)
 * 
 * Verifies that all 6 findings (T1, T2, T4, T5, T6, T7) currently FAIL at HEAD.
 * Generates review/v25_raw/before.json with deterministic proof.
 */

const fs = require('fs');
const path = require('path');

const BOT_ROOT = path.resolve(__dirname, '../..');
const WORLD_DATA = path.join(BOT_ROOT, 'world-data');
const RAW_DIR = path.join(BOT_ROOT, 'review/v25_raw');

// Import authoritative modules
const proceduralWorldEngine = require('../../utils/proceduralWorldEngine');
const worldRegionEngine = require('../../utils/worldRegionEngine');
const anchors = require('../../world-data/anchors.json');
const regions = require('../../world-data/regions.json');
const zonesV23 = require('../../world-data/zones-v23.json');

function auditT1_NearbyZones() {
  // Test T1: Does nearby.js or nearbyEngine produce instanced zone entries with id 'inst_'?
  const nearbyRouteCode = fs.readFileSync(path.join(BOT_ROOT, 'web-api/routes/nearby.js'), 'utf8');
  const hasZonesV23Import = nearbyRouteCode.includes('zones-v23.json');
  const hasInstPrefix = nearbyRouteCode.includes('inst_');
  const queriesZones = nearbyRouteCode.includes('spirit_valley') || nearbyRouteCode.includes('land_of_spirits');
  
  // Also check if nearby.js relies on client query cx,cy instead of server position
  const trustsClientCoords = nearbyRouteCode.includes('req.query.cx') && nearbyRouteCode.includes('req.query.cy');

  const failed = !hasZonesV23Import && !hasInstPrefix && !queriesZones;
  return {
    tested: 'T1 (Nearby Zones)',
    failed,
    reason: failed 
      ? 'GET /api/world/nearby tidak memuat zones-v23.json, tidak menghasilkan ID inst_*, dan memercayai req.query klien.' 
      : 'T1 sudah terpasang (unexpected for baseline).',
    details: { hasZonesV23Import, hasInstPrefix, queriesZones, trustsClientCoords }
  };
}

function auditT2_InstancedRouteInjection() {
  // Test T2: Does POST /enter in instancedZones.js accept dangerTier/zoneType from req.body, and use in-memory Map?
  const routeCode = fs.readFileSync(path.join(BOT_ROOT, 'web-api/routes/instancedZones.js'), 'utf8');
  const readsBodyDangerTier = routeCode.includes('dangerTier') && routeCode.includes('req.body');
  const usesInMemoryMap = routeCode.includes('const activeSessions = new Map()') || routeCode.includes('activeSessions.set');
  const checksDistance = routeCode.includes('dist <= 3') || routeCode.includes('Chebyshev');

  const failed = readsBodyDangerTier && usesInMemoryMap && !checksDistance;
  return {
    tested: 'T2 (Instanced Route Injection & Memory Sessions)',
    failed,
    reason: failed
      ? 'POST /enter menerima dangerTier/zoneType dari body klien, memakai Map in-memory, dan tidak memvalidasi jarak server.'
      : 'T2 sudah diperbaiki (unexpected for baseline).',
    details: { readsBodyDangerTier, usesInMemoryMap, checksDistance }
  };
}

function auditT4_CharmsWiring() {
  // Test T4: Check inventory.js, Player.js, and world.js for charm disconnects
  const invCode = fs.readFileSync(path.join(BOT_ROOT, 'web-api/routes/inventory.js'), 'utf8');
  const playerModelCode = fs.readFileSync(path.join(BOT_ROOT, 'models/Player.js'), 'utf8');
  const worldCode = fs.readFileSync(path.join(BOT_ROOT, 'web-api/routes/world.js'), 'utf8');

  // Check inventory use-item handler
  const invHandlesCharms = invCode.includes("item.effectType === 'repellent_charm'") || invCode.includes("item.effectType === 'attraction_charm'");
  // Check Player.js activeBuffs enum
  const playerEnumHasCharms = playerModelCode.includes("'repellent_charm'") && playerModelCode.includes("'attraction_charm'");
  // Check world.js for ghost field player.activeCharms
  const worldUsesGhostFields = worldCode.includes('player.activeCharms') || worldCode.includes('player.charms');

  const failed = !invHandlesCharms && !playerEnumHasCharms && worldUsesGhostFields;
  return {
    tested: 'T4 (Jimat Tak Berfungsi)',
    failed,
    reason: failed
      ? 'Jimat repellent/attraction jatuh ke cabang unhandled di inventory.js, tidak ada di enum Player.js, dan world.js membaca field hantu.'
      : 'T4 sudah diperbaiki (unexpected for baseline).',
    details: { invHandlesCharms, playerEnumHasCharms, worldUsesGhostFields }
  };
}

function auditT5_SettlementRingTierCap() {
  // Test T5: Ring tier on at least 5 settlements exceeds settlement.tier + 1
  const targetIds = ['kota_canghai', 'desa_heiyan', 'pulau_penyu_raksasa', 'dusun_pondok_karang', 'kota_leiyin'];
  const violations = [];

  for (const id of targetIds) {
    const anc = anchors.find(a => a.id === id);
    if (!anc) continue;
    const R = anc.v20?.exclusionRadius || 10;
    const allowedMax = (anc.tier || 1) + 1;

    // Sample along ring R+1 to R+12
    for (let step = 1; step <= 12; step += 3) {
      const x = anc.x + R + step;
      const y = anc.y;
      const t = proceduralWorldEngine.getTileAt(x, y);
      const eff = worldRegionEngine.getEffectiveDanger(x, y);

      if (t.dangerTier > allowedMax || eff > allowedMax) {
        violations.push({
          settlementId: id,
          anchorTier: anc.tier,
          allowedMax,
          dist: R + step,
          tileDangerTier: t.dangerTier,
          effectiveDanger: eff
        });
        break; // Count once per settlement
      }
    }
  }

  const failed = violations.length >= 5;
  return {
    tested: 'T5 (Batas Tier Cincin Pemukiman)',
    failed,
    reason: failed
      ? `Terbukti ${violations.length}/5 pemukiman melanggar batas tier (dangerTier > anc.tier + 1).`
      : 'T5 tidak melanggar (unexpected for baseline).',
    details: { violationsCount: violations.length, violations }
  };
}

function auditT6_LegacyBlockerMessages() {
  // Test T6: Legacy tebing message in world.js line 2709
  const worldCode = fs.readFileSync(path.join(BOT_ROOT, 'web-api/routes/world.js'), 'utf8');
  const legacyStr = 'Jalur terhalang rintangan tebing batu yang mustahil ditembus! Dibutuhkan artefak terbang spiritual.';
  const hasLegacyMsg = worldCode.includes(legacyStr);

  const failed = hasLegacyMsg;
  return {
    tested: 'T6 (Pesan Halangan Lama Tersisa)',
    failed,
    reason: failed
      ? 'Ditemukan pesan tebing batu mustahil ditembus pada rute gerakan lama (world.js:2709).'
      : 'Pesan lama sudah dibersihkan (unexpected for baseline).',
    details: { hasLegacyMsg }
  };
}

function auditT7_DocsHallucinatedRegions() {
  // Test T7: Check docs for hallucinated region tokens
  const canonicalIds = new Set(regions.map(r => r.id));
  const hallucinatedList = [
    'kunlun_foothills',
    'hundred_thousand_hills',
    'lei_ze_wasteland',
    'everfrost_glacier',
    'lost_desert',
    'primordial_abyss',
    'chaos_origin'
  ];

  const filesToCheck = [
    path.join(BOT_ROOT, 'docs/SISTEM_ZONA_V23.md'),
    path.join(BOT_ROOT, 'scripts/v23/gateRunner.js'),
    path.join(BOT_ROOT, 'review/report_v23.md')
  ];

  const foundTokens = [];
  for (const f of filesToCheck) {
    if (fs.existsSync(f)) {
      const content = fs.readFileSync(f, 'utf8');
      for (const token of hallucinatedList) {
        if (content.includes(token) && !canonicalIds.has(token)) {
          foundTokens.push({ file: path.basename(f), token });
        }
      }
    }
  }

  const failed = foundTokens.length > 0;
  return {
    tested: 'T7 (Wilayah Halusinasi Dokumen)',
    failed,
    reason: failed
      ? `Ditemukan ${foundTokens.length} token wilayah fiktif pada dokumen/skrip V23.`
      : 'Dokumen sudah bersih (unexpected for baseline).',
    details: { foundTokensCount: foundTokens.length, sampleTokens: foundTokens.slice(0, 5) }
  };
}

function runAudit() {
  console.log('======================================================================');
  console.log(' BASELINE AUDIT WIRING & TES MERAH V25 (K0)');
  console.log('======================================================================');

  const findings = {
    T1: auditT1_NearbyZones(),
    T2: auditT2_InstancedRouteInjection(),
    T4: auditT4_CharmsWiring(),
    T5: auditT5_SettlementRingTierCap(),
    T6: auditT6_LegacyBlockerMessages(),
    T7: auditT7_DocsHallucinatedRegions()
  };

  let totalTested = 0;
  let totalFailed = 0;

  for (const [key, result] of Object.entries(findings)) {
    totalTested++;
    if (result.failed) totalFailed++;
    const icon = result.failed ? '🔴 GAGAL (TERKUNCI)' : '🟢 LULUS';
    console.log(`${key.padEnd(4)}: ${icon} | ${result.tested}`);
    console.log(`      ${result.reason}`);
  }

  const allRed = totalFailed === totalTested && totalTested === 6;

  console.log('======================================================================');
  console.log(`HASIL EVALUASI K0: ${totalFailed} / ${totalTested} TEMUAN TERBUKTI GAGAL (ALL RED: ${allRed})`);
  console.log('======================================================================');

  if (!fs.existsSync(RAW_DIR)) {
    fs.mkdirSync(RAW_DIR, { recursive: true });
  }

  const outputPayload = {
    timestamp: new Date().toISOString(),
    commitBase: '4d56a63a',
    summary: {
      totalTested,
      totalFailed,
      allRed,
      gateStatus: allRed ? 'PASS' : 'FAIL'
    },
    findings
  };

  const outputPath = path.join(RAW_DIR, 'before.json');
  fs.writeFileSync(outputPath, JSON.stringify(outputPayload, null, 2), 'utf8');
  console.log(`[OUTPUT] Hasil audit baseline disimpan ke: ${outputPath}`);

  if (!allRed) {
    console.error('[FATAL] Evaluasi K0 gagal: Tidak semua temuan terbukti gagal di HEAD baseline!');
    process.exit(1);
  }
}

runAudit();
