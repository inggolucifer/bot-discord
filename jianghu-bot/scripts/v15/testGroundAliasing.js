#!/usr/bin/env node
/**
 * scripts/v15/testGroundAliasing.js
 * Verifies Gate P4: Ground Aliasing for 18 rejected macros (J5)
 * Checks:
 * 1. Every active family has >= 3 clean variants (directly or via alias).
 * 2. 0 macro textures from rejectedList are present in any active terrain variants.
 */

const fs = require('fs');
const path = require('path');

const PROJECT_DIR = path.resolve(__dirname, '../..');
const MANIFEST_V15_PATH = path.resolve(PROJECT_DIR, 'world-data/ground-manifest-v15.json');
const ALIAS_V15_PATH = path.resolve(PROJECT_DIR, 'world-data/ground-alias-v15.json');
const GROUND_MANIFEST_PATH = path.resolve(PROJECT_DIR, 'web-dashboard/public/assets/ground/ground-manifest.json');

const manifestV15 = JSON.parse(fs.readFileSync(MANIFEST_V15_PATH, 'utf8'));
const aliasV15 = JSON.parse(fs.readFileSync(ALIAS_V15_PATH, 'utf8'));
const groundManifest = JSON.parse(fs.readFileSync(GROUND_MANIFEST_PATH, 'utf8'));

const rejectedFiles = new Set((manifestV15.rejectedList || []).map(r => r.file));
console.log(`[testGroundAliasing] Loaded ${rejectedFiles.size} rejected files from manifest v15.`);

let allPass = true;
const familyVariantReport = {};

// Verify that ground-manifest terrain definitions do not include rejected files
for (const [terrainKey, tInfo] of Object.entries(groundManifest.terrains || {})) {
  const vars = tInfo.variants || [];
  const rejectedInTerrain = vars.filter(v => {
    const fn = v.replace(/^v11\//, '') + '.webp';
    return rejectedFiles.has(fn);
  });

  if (rejectedInTerrain.length > 0) {
    console.error(`  [FAIL] Terrain '${terrainKey}' contains rejected variant(s):`, rejectedInTerrain);
    allPass = false;
  }
}

// Compute total effective clean variants per family after aliasing
const aliases = aliasV15.aliases || {};
const cleanFamilies = manifestV15.cleanFamilies || {};

for (const [fam, cleanVars] of Object.entries(cleanFamilies)) {
  const famCleanList = (cleanVars || []).map(v => `v11/${fam}_m${v}`);
  const famAliases = (aliases[fam] || []).filter(v => {
    const fn = v.replace(/^v11\//, '') + '.webp';
    return !rejectedFiles.has(fn);
  });

  const merged = Array.from(new Set([...famCleanList, ...famAliases]));
  const count = merged.length;
  const pass = count >= 3;
  if (!pass) allPass = false;

  familyVariantReport[fam] = {
    cleanCount: count,
    variants: merged,
    passed: pass
  };

  console.log(`  [${pass ? 'PASS' : 'FAIL'}] Family '${fam}': ${count} clean variants (Target >= 3)`);
}

const outReport = {
  timestamp: new Date().toISOString(),
  totalFamilies: Object.keys(cleanFamilies).length,
  rejectedFilesCount: rejectedFiles.size,
  allFamiliesGe3Variants: allPass,
  zeroRejectedVariantsUsed: allPass,
  familyReport: familyVariantReport
};

const reportPath = path.resolve(PROJECT_DIR, 'review/v15_aliasing_evaluation.json');
fs.writeFileSync(reportPath, JSON.stringify(outReport, null, 2));
console.log(`\nGround aliasing evaluation report written to ${reportPath}`);

if (allPass) {
  console.log(`[SUCCESS] All 36 families have >= 3 clean variants and 0 rejected macros are active!`);
  process.exit(0);
} else {
  console.error(`[FAIL] Ground aliasing gate failed!`);
  process.exit(1);
}
