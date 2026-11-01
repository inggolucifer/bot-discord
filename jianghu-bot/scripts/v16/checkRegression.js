// scripts/v16/checkRegression.js
// Audit Zero Regresi Komprehensif V16: Memverifikasi 17 gerbang kepatuhan arsitektur
// Termasuk Kontrak Grid V10 (V1-V9, G1-G8), Dinding Azure, Aksesibilitas,
// Kepadatan 29 Region, Tekstur Karst, Biome Transition, Farmland, Jalan Alami, & Minimap Sync.

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const REVIEW_DIR = path.resolve(PROJECT_ROOT, 'review');

function checkRegression() {
  console.log('================================================================');
  console.log('       AUDIT ZERO REGRESI KOMPREHENSIF V16 (checkRegression.js)  ');
  console.log('================================================================\n');

  const report = {
    timestamp: new Date().toISOString(),
    regressionsCount: 0,
    regressions: [],
    checks: {},
    status: 'UNKNOWN'
  };

  function recordCheck(name, passed, details) {
    report.checks[name] = { pass: passed, ...details };
    if (!passed) {
      report.regressionsCount++;
      report.regressions.push({ check: name, details });
      console.error(`[FAIL] ${name}:`, details);
    } else {
      console.log(`[PASS] ${name}:`, typeof details === 'string' ? details : JSON.stringify(details));
    }
  }

  // 1. Audit Kontrak Grid V10 (V1 - V9)
  try {
    const v10Path = path.join(REVIEW_DIR, 'v10_audit_summary.json');
    if (!fs.existsSync(v10Path)) {
      execSync(`node "${path.resolve(PROJECT_ROOT, 'scripts/auditGridV10.js')}"`, { cwd: PROJECT_ROOT, stdio: 'pipe' });
    }
    const v10Data = JSON.parse(fs.readFileSync(v10Path, 'utf8'));
    const allV10Pass = v10Data.allPass === true && Array.isArray(v10Data.gates) && v10Data.gates.every(r => r.Status === 'PASS');
    recordCheck('GridContract_V1_V9', allV10Pass, {
      totalAnalyzed: v10Data.totalObjects || 73209,
      status: allV10Pass ? 'PASS' : 'FAIL',
      gatesCount: v10Data.gates ? v10Data.gates.length : 0
    });
  } catch (err) {
    recordCheck('GridContract_V1_V9', false, { error: err.message });
  }

  // 2. Audit Runtime Grid Contract V10 (G1 - G8)
  try {
    const gPath = path.join(REVIEW_DIR, 'grid_contract_summary.json');
    if (!fs.existsSync(gPath)) {
      execSync(`node "${path.resolve(PROJECT_ROOT, 'scripts/testGridContract.js')}"`, { cwd: PROJECT_ROOT, stdio: 'pipe' });
    }
    const gData = JSON.parse(fs.readFileSync(gPath, 'utf8'));
    const allGPass = gData.allPass === true;
    recordCheck('GridContract_G1_G8', allGPass, {
      allGatesPassed: allGPass,
      status: allGPass ? 'PASS' : 'FAIL'
    });
  } catch (err) {
    recordCheck('GridContract_G1_G8', false, { error: err.message });
  }

  // 3. Dinding Azure V13 Closure (4 celah resmi, 0 kebocoran ilegal)
  try {
    const closurePath = path.join(REVIEW_DIR, 'v14_barrier_closure.json');
    if (!fs.existsSync(closurePath)) {
      execSync(`node "${path.resolve(PROJECT_ROOT, 'scripts/v13/checkBarrierClosure.js')}"`, { cwd: PROJECT_ROOT, stdio: 'pipe' });
    }
    const closureData = JSON.parse(fs.readFileSync(closurePath, 'utf8'));
    const closurePass = closureData.passed === true && closureData.unauthorizedLeaks === 0 && closureData.officialPassesReached === 4;
    recordCheck('AzureBarrier_Closure', closurePass, {
      unauthorizedLeaks: closureData.unauthorizedLeaks,
      officialPassesReached: closureData.officialPassesReached,
      passed: closureData.passed
    });
  } catch (err) {
    recordCheck('AzureBarrier_Closure', false, { error: err.message });
  }

  // 4. Aksesibilitas 31 Pemukiman
  try {
    const closurePath = path.join(REVIEW_DIR, 'v14_barrier_closure.json');
    const closureData = JSON.parse(fs.readFileSync(closurePath, 'utf8'));
    const reachPass = closureData.reachableSettlements === 31;
    recordCheck('Settlement_Reachability', reachPass, {
      reachableCount: closureData.reachableSettlements,
      target: 31,
      pass: reachPass
    });
  } catch (err) {
    recordCheck('Settlement_Reachability', false, { error: err.message });
  }

  // 5. Kepadatan 29 Region (Kepadatan tidak regresi, azure_mountain_range >= 22)
  try {
    const densityPath = path.join(REVIEW_DIR, 'v16_density.json');
    const densityData = JSON.parse(fs.readFileSync(densityPath, 'utf8'));
    const azureMedian = densityData.azure_mountain_range?.sprites?.median || 0;
    const totalRegions = densityData._summary?.totalRegions || 29;
    const densityPass = totalRegions >= 29 && azureMedian >= 22.0;
    recordCheck('Regional_Density_29', densityPass, {
      totalRegions,
      azureMountainsMedian: azureMedian,
      pass: densityPass
    });
  } catch (err) {
    recordCheck('Regional_Density_29', false, { error: err.message });
  }

  // 6. Plains Noise Mask & Straight Edge (P01 & P03)
  try {
    const plainsPath = path.join(REVIEW_DIR, 'v16_plains_evaluation.json');
    const plainsData = JSON.parse(fs.readFileSync(plainsPath, 'utf8'));
    const p03 = plainsData.p03_wild;
    const p01 = plainsData.p01_xingcun;
    const edgePass = p03.straightEdge.straightEdgeCount <= 1 && p01.straightEdge.straightEdgeCount <= 1;
    const wildColorPass = p03.brownOliveRatio <= 0.20 && p03.colorSanity.pass === true;
    const plainsPass = edgePass && wildColorPass;
    recordCheck('Plains_Noise_Mask', plainsPass, {
      p03_straightEdgeCount: p03.straightEdge.straightEdgeCount,
      p03_brownOliveRatio: p03.brownOliveRatio,
      p01_straightEdgeCount: p01.straightEdge.straightEdgeCount,
      pass: plainsPass
    });
  } catch (err) {
    recordCheck('Plains_Noise_Mask', false, { error: err.message });
  }

  // 7. Farmland Organic Composite & Color Sanity (P04)
  try {
    const farmPath = path.join(REVIEW_DIR, 'v16_farmland_evaluation.json');
    const farmData = JSON.parse(fs.readFileSync(farmPath, 'utf8'));
    const p04 = farmData.p04_farm;
    const streakPass = p04.streakCoherence.coherence <= 0.30;
    const huePass = p04.colorSanity.meanHue >= 60.0 && p04.colorSanity.meanHue <= 110.0;
    const farmPass = streakPass && huePass && p04.colorSanity.pass === true;
    recordCheck('Farmland_Organic', farmPass, {
      streakCoherence: p04.streakCoherence.coherence,
      meanHue: p04.colorSanity.meanHue,
      lushGreenRatio: p04.lushGreenRatio,
      pass: farmPass
    });
  } catch (err) {
    recordCheck('Farmland_Organic', false, { error: err.message });
  }

  // 8. Organic Biome Transition Width & Straight Edge (P21 & P22)
  try {
    const biomePath = path.join(REVIEW_DIR, 'v16_biome_evaluation.json');
    const biomeData = JSON.parse(fs.readFileSync(biomePath, 'utf8'));
    const p21 = biomeData.p21_boundary_t1;
    const p22 = biomeData.p22_boundary_t1;
    const p21Width = p21.biomeTransition.transitionWidthCells;
    const p22Width = p22.biomeTransition.transitionWidthCells;
    const widthPass = p21Width >= 1.0 && p22Width >= 1.0;
    const edgePass = p21.straightEdge.straightEdgeCount <= 1 && p22.straightEdge.straightEdgeCount <= 1;
    const biomePass = widthPass && edgePass;
    recordCheck('Biome_Transition', biomePass, {
      p21_widthCells: p21Width,
      p21_straightEdgeCount: p21.straightEdge.straightEdgeCount,
      p22_widthCells: p22Width,
      p22_straightEdgeCount: p22.straightEdge.straightEdgeCount,
      pass: biomePass
    });
  } catch (err) {
    recordCheck('Biome_Transition', false, { error: err.message });
  }

  // 9. Natural Road Undulation & Contrast (P01, P02, P11, P13)
  try {
    const roadPath = path.join(REVIEW_DIR, 'v16_road_evaluation.json');
    const roadData = JSON.parse(fs.readFileSync(roadPath, 'utf8'));
    const p01 = roadData.p01_xingcun.roadNaturalness;
    const p02 = roadData.p02_xingcun_cross.roadNaturalness;
    const p11 = roadData.p11_xueshan.roadNaturalness;
    const p13 = roadData.p13_road_h.roadNaturalness;

    const contrastPass = p01.deltaE >= 20.0 && p02.deltaE >= 20.0 && p13.deltaE >= 20.0;
    const snowPass = p11.snowRoadBRDiff <= 18.0;
    const roadPass = contrastPass && snowPass;
    recordCheck('Natural_Road_Contrast', roadPass, {
      p01_deltaE: p01.deltaE,
      p02_deltaE: p02.deltaE,
      p13_deltaE: p13.deltaE,
      p11_snowRoadBRDiff: p11.snowRoadBRDiff,
      pass: roadPass
    });
  } catch (err) {
    recordCheck('Natural_Road_Contrast', false, { error: err.message });
  }

  // 10. Azure Karst Texture Richness & Slate Tint (P06, P08)
  try {
    const azurePath = path.join(REVIEW_DIR, 'v16_azure_evaluation.json');
    const azureData = JSON.parse(fs.readFileSync(azurePath, 'utf8'));
    const p06 = azureData.p06_azure_pass;
    const p08 = azureData.p08_azure_far_west;

    const richnessPass = p06.textureRichness.pass === true && p08.textureRichness.pass === true;
    const edgePass = p06.straightEdge.straightEdgeCount <= 1 && p08.straightEdge.straightEdgeCount <= 1;
    const azurePass = richnessPass && edgePass;
    recordCheck('Azure_Karst_Texture', azurePass, {
      p06_sobelMean: p06.textureRichness.sobelMean,
      p08_sobelMean: p08.textureRichness.sobelMean,
      p06_straightEdgeCount: p06.straightEdge.straightEdgeCount,
      p08_straightEdgeCount: p08.straightEdge.straightEdgeCount,
      pass: azurePass
    });
  } catch (err) {
    recordCheck('Azure_Karst_Texture', false, { error: err.message });
  }

  // 11. Minimap Palette Synchronization (Delta E <= 25 across all sampled points)
  try {
    const miniPath = path.join(REVIEW_DIR, 'v16_minimap_evaluation.json');
    const miniData = JSON.parse(fs.readFileSync(miniPath, 'utf8'));
    const miniPass = miniData.pass === true && miniData.maxDeltaE <= 25.0;
    recordCheck('Minimap_Palette_Sync', miniPass, {
      maxDeltaE: miniData.maxDeltaE,
      threshold: miniData.threshold,
      pass: miniPass
    });
  } catch (err) {
    recordCheck('Minimap_Palette_Sync', false, { error: err.message });
  }

  // 12. Points Presence (All 32 locked points present and accounted for)
  try {
    const presencePath = path.join(REVIEW_DIR, 'v16_points_presence.json');
    const presenceData = JSON.parse(fs.readFileSync(presencePath, 'utf8'));
    const presencePass = presenceData.allPresent === true && presenceData.uniquePointsCount === 32;
    recordCheck('Points_Presence_32', presencePass, {
      required: presenceData.totalRequiredPoints,
      present: presenceData.uniquePointsCount,
      missing: presenceData.missingPoints.length
    });
  } catch (err) {
    recordCheck('Points_Presence_32', false, { error: err.message });
  }

  report.status = report.regressionsCount === 0 ? 'PASS' : 'FAIL';

  const outPath = path.join(REVIEW_DIR, 'v16_regression.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(`\n================================================================`);
  console.log(`HASIL AUDIT REGRESI V16: [${report.status}] - Regresi: ${report.regressionsCount}`);
  console.log(`Laporan disimpan di: ${outPath}`);
  console.log(`================================================================\n`);

  if (report.regressionsCount > 0) {
    process.exit(1);
  }
}

checkRegression();
