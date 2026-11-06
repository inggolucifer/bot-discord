/**
 * scripts/v25/auditWiring.js
 * Wiring Audit untuk V25
 * Mode default : Baseline audit (menghasilkan review/v25_raw/before.json)
 * Mode --after : Post-fix audit (menghasilkan review/v25_raw/after.json)
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

const isAfterMode = process.argv.includes('--after');

function auditT1_NearbyZones() {
  const nearbyRouteCode = fs.readFileSync(path.join(BOT_ROOT, 'web-api/routes/nearby.js'), 'utf8');
  const hasZonesV23Import = nearbyRouteCode.includes('zones-v23.json');
  const hasInstPrefix = nearbyRouteCode.includes('inst_');
  const queriesZones = nearbyRouteCode.includes('spirit_valley') || nearbyRouteCode.includes('land_of_spirits');
  const trustsClientCoords = nearbyRouteCode.includes('req.query.cx') && nearbyRouteCode.includes('req.query.cy');

  const resolved = hasZonesV23Import && hasInstPrefix && queriesZones && !trustsClientCoords;
  const failed = !resolved;

  return {
    tested: 'T1 (Nearby Zones)',
    failed,
    resolved,
    reason: resolved
      ? 'GET /api/world/nearby memuat zones-v23.json, menghasilkan ID inst_*, dan menggunakan posisi server otoritatif.'
      : 'GET /api/world/nearby tidak memuat zones-v23.json, tidak menghasilkan ID inst_*, atau memercayai query klien.',
    details: { hasZonesV23Import, hasInstPrefix, queriesZones, trustsClientCoords }
  };
}

function auditT2_InstancedRouteInjection() {
  const routeCode = fs.readFileSync(path.join(BOT_ROOT, 'web-api/routes/instancedZones.js'), 'utf8');
  const readsBodyDangerTier = /req\.body\.(dangerTier|zoneType)/.test(routeCode) || /\{\s*[^}]*(dangerTier|zoneType)[^}]*\}\s*=\s*req\.body/.test(routeCode);
  const usesInMemoryMap = routeCode.includes('const activeSessions = new Map()') || routeCode.includes('activeSessions.set');
  const checksDistance = routeCode.includes('dist > 3') || routeCode.includes('Math.max(Math.abs(px - zone.x)');
  const usesDatabaseModel = routeCode.includes('InstancedZoneSession');

  const resolved = !readsBodyDangerTier && !usesInMemoryMap && checksDistance && usesDatabaseModel;
  const failed = !resolved;

  return {
    tested: 'T2 (Instanced Route Hardening & Database Persistence)',
    failed,
    resolved,
    reason: resolved
      ? 'POST /enter hanya membaca zoneId, tersimpan persisten di MongoDB InstancedZoneSession, dan memvalidasi jarak server <= 3 petak.'
      : 'POST /enter menerima dangerTier/zoneType dari klien, memakai Map in-memory, atau tidak memvalidasi jarak server.',
    details: { readsBodyDangerTier, usesInMemoryMap, checksDistance, usesDatabaseModel }
  };
}

function auditT4_CharmsWiring() {
  const invCode = fs.readFileSync(path.join(BOT_ROOT, 'web-api/routes/inventory.js'), 'utf8');
  const playerModelCode = fs.readFileSync(path.join(BOT_ROOT, 'models/Player.js'), 'utf8');
  const worldCode = fs.readFileSync(path.join(BOT_ROOT, 'web-api/routes/world.js'), 'utf8');

  const invHandlesCharms = invCode.includes("item.effectType === 'repellent_charm'") || invCode.includes("item.effectType === 'attraction_charm'");
  const playerEnumHasCharms = playerModelCode.includes("'repellent_charm'") && playerModelCode.includes("'attraction_charm'");
  const worldUsesGhostFields = worldCode.includes('player.activeCharms') || worldCode.includes('player.charms');
  const worldChecksActiveBuffs = worldCode.includes('b.buffType === \'repellent_charm\'');

  const resolved = invHandlesCharms && playerEnumHasCharms && !worldUsesGhostFields && worldChecksActiveBuffs;
  const failed = !resolved;

  return {
    tested: 'T4 (Jimat Pengusir & Penarik Aktif)',
    failed,
    resolved,
    reason: resolved
      ? 'Jimat repellent & attraction terdaftar di enum Player.js, diproses mutlak di inventory.js, dan diinspeksi dari activeBuffs di world.js.'
      : 'Jimat tidak ditangani di inventory.js, tidak ada di enum Player.js, atau world.js masih membaca field hantu.',
    details: { invHandlesCharms, playerEnumHasCharms, worldUsesGhostFields, worldChecksActiveBuffs }
  };
}

function auditT5_SettlementRingTierCap() {
  const targetIds = ['kota_canghai', 'desa_heiyan', 'pulau_penyu_raksasa', 'dusun_pondok_karang', 'kota_leiyin'];
  const violations = [];

  for (const id of targetIds) {
    const anc = anchors.find(a => a.id === id);
    if (!anc) continue;
    const R = anc.v20?.exclusionRadius || 10;
    const allowedMax = (anc.tier || 1) + 1;

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
        break;
      }
    }
  }

  const resolved = violations.length === 0;
  const failed = !resolved;

  return {
    tested: 'T5 (Batas Tier Cincin Pemukiman)',
    failed,
    resolved,
    reason: resolved
      ? 'Semua pemukiman uji mematuhi batas tier cincin R+1..R+12 (dangerTier <= anc.tier + 1, 0 pelanggaran).'
      : `Ditemukan ${violations.length}/5 pemukiman melanggar batas tier (dangerTier > anc.tier + 1).`,
    details: { violationsCount: violations.length, violations }
  };
}

function auditT6_LegacyBlockerMessages() {
  const worldCode = fs.readFileSync(path.join(BOT_ROOT, 'web-api/routes/world.js'), 'utf8');
  const legacyStr = 'Jalur terhalang rintangan tebing batu yang mustahil ditembus! Dibutuhkan artefak terbang spiritual.';
  const hasLegacyMsg = worldCode.includes(legacyStr);
  const usesDescribeBlocker = worldCode.includes('describeBlocker(destTile');

  const resolved = !hasLegacyMsg && usesDescribeBlocker;
  const failed = !resolved;

  return {
    tested: 'T6 (Pesan Rintangan Kontekstual)',
    failed,
    resolved,
    reason: resolved
      ? 'Pesan tebing usang berhasil diganti total dengan modul otoritatif describeBlocker.'
      : 'Pesan tebing batu mustahil ditembus masih ditemukan di world.js:2709.',
    details: { hasLegacyMsg, usesDescribeBlocker }
  };
}

function auditT7_DocsHallucinatedRegions() {
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

  const resolved = foundTokens.length === 0;
  const failed = !resolved;

  return {
    tested: 'T7 (Penyelarasan Nama Wilayah Kanonikal)',
    failed,
    resolved,
    reason: resolved
      ? 'Seluruh dokumen dan skrip telah bersih dari nama wilayah fiktif (0 token halusinasi).'
      : `Ditemukan ${foundTokens.length} token wilayah fiktif pada dokumen/skrip.`,
    details: { foundTokensCount: foundTokens.length, foundTokens }
  };
}

function runAudit() {
  const modeLabel = isAfterMode ? 'POST-FIX AUDIT WIRING V25 (K8)' : 'BASELINE AUDIT WIRING & TES MERAH V25 (K0)';
  console.log('======================================================================');
  console.log(` ${modeLabel}`);
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
  let totalResolved = 0;
  let totalFailed = 0;

  for (const [key, result] of Object.entries(findings)) {
    totalTested++;
    if (result.resolved) totalResolved++;
    if (result.failed) totalFailed++;

    const icon = isAfterMode
      ? (result.resolved ? '🟢 TERSELESAIKAN' : '🔴 BELUM SELESAI')
      : (result.failed ? '🔴 GAGAL (TERKUNCI)' : '🟢 LULUS');

    console.log(`${key.padEnd(4)}: ${icon} | ${result.tested}`);
    console.log(`      ${result.reason}`);
  }

  if (!fs.existsSync(RAW_DIR)) {
    fs.mkdirSync(RAW_DIR, { recursive: true });
  }

  if (isAfterMode) {
    const allGreen = totalResolved === totalTested && totalTested === 6;
    console.log('======================================================================');
    console.log(`HASIL EVALUASI K8: ${totalResolved} / ${totalTested} TEMUAN TERSELESAIKAN (ALL GREEN: ${allGreen})`);
    console.log('======================================================================');

    const outputPayload = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTested,
        totalResolved,
        totalFailed,
        allGreen,
        gateStatus: allGreen ? 'PASS' : 'FAIL'
      },
      findings
    };

    const outputPath = path.join(RAW_DIR, 'after.json');
    fs.writeFileSync(outputPath, JSON.stringify(outputPayload, null, 2), 'utf8');
    console.log(`[OUTPUT] Hasil audit pasca-perbaikan disimpan ke: ${outputPath}`);

    if (!allGreen) {
      console.error('[FATAL] Evaluasi K8 gagal: Masih ada temuan yang belum terselesaikan!');
      process.exit(1);
    }
  } else {
    const allRed = totalFailed === totalTested && totalTested === 6;
    console.log('======================================================================');
    console.log(`HASIL EVALUASI K0: ${totalFailed} / ${totalTested} TEMUAN TERBUKTI GAGAL (ALL RED: ${allRed})`);
    console.log('======================================================================');

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
}

runAudit();
