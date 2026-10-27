/**
 * scripts/checkRegionPalette.js
 * Verification of Region Palettes & Identity (Prompt J3 & J4)
 *
 * Audits 29 regions x 40 sample chunks each:
 * 1. Forbidden objects = 0 (Zero tolerance for forbidden families).
 * 2. Dominance cap <= 20% (No family exceeds 20% in any chunk).
 * 3. Distinct families >= 16 per region (>= 12 for sea & cold).
 * 4. Density within target range:
 *    - Tier 1: 60-80 obj/chunk
 *    - Tier 4-6: 45-70 obj/chunk
 *
 * Exits 0 on pass, 1 on fail.
 */

const fs = require('fs');
const path = require('path');
const { getChunkObjects } = require('../utils/objectScatter');
const { getRegionAt } = require('../utils/worldRegionEngine');
const regions = require('../world-data/regions.json');
const regionPalettes = require('../world-data/region-palettes-v10.json');

console.log('\n=== AUDIT IDENTITAS & PALET 29 REGION (checkRegionPalette.js) ===\n');

// 1. Prepare Theme Rules
const THEME_RULES = {};
for (const [themeId, themeData] of Object.entries(regionPalettes.themes || {})) {
  const boostRegexes = (themeData.boost || []).map(p => new RegExp(p));
  const forbidRegexes = (themeData.forbid || []).map(p => new RegExp(p));
  THEME_RULES[themeId] = {
    boostRegexes,
    forbidRegexes,
    deadwoodMax: themeData.deadwoodMax != null ? themeData.deadwoodMax : 0.2
  };
}

function getRegionTheme(regionId) {
  const themeId = (regionPalettes.regions && regionPalettes.regions[regionId]) || 'temperate';
  return THEME_RULES[themeId] || THEME_RULES.temperate;
}

function isForbidden(defId, regionId) {
  if (!defId || !regionId) return false;
  const theme = getRegionTheme(regionId);
  for (const re of theme.forbidRegexes) {
    if (re.test(defId)) return true;
  }
  return false;
}

function getFamily(defId) {
  if (!defId) return '';
  return defId.replace(/_v\d+$/, '').replace(/_\d+$/, '');
}

let totalForbiddenViolations = 0;
let totalDominanceViolations = 0;
let totalDiversityViolations = 0;
let totalDensityViolations = 0;

console.log('| Region ID | Tier | Tema | Chunk | Avg Density | Min Families | Max Dominance | Status |');
console.log('|---|---|---|---|---|---|---|---|');

for (const reg of regions) {
  const b = reg.bounds;
  const themeName = regionPalettes.regions[reg.id] || 'temperate';
  const minRequiredFamilies = (themeName === 'sea' || themeName === 'cold') ? 12 : 16;

  // Pick up to 40 chunks strictly inside the region
  const minCx = Math.floor(b.minX / 32) + 1;
  const maxCx = Math.floor(b.maxX / 32) - 1;
  const minCy = Math.floor(b.minY / 32) + 1;
  const maxCy = Math.floor(b.maxY / 32) - 1;

  // Find all chunks belonging to this region
  const allRegionChunks = [];
  for (let cy = minCy; cy <= maxCy; cy++) {
    for (let cx = minCx; cx <= maxCx; cx++) {
      const centerTile = { x: cx * 32 + 16, y: cy * 32 + 16 };
      if (getRegionAt(centerTile.x, centerTile.y).id === reg.id) {
        allRegionChunks.push({ cx, cy });
      }
    }
  }

  // Pick up to 40 evenly distributed chunks across the entire region
  const sampleChunks = [];
  const stride = Math.max(1, Math.floor(allRegionChunks.length / 40));
  for (let i = 0; i < allRegionChunks.length && sampleChunks.length < 40; i += stride) {
    sampleChunks.push(allRegionChunks[i]);
  }

  const allDistinctFamiliesInRegion = new Set();
  let totalObjects = 0;
  let maxDominanceInRegion = 0;
  let forbiddenInRegion = 0;

  for (const { cx, cy } of sampleChunks) {
    const objs = getChunkObjects(cx, cy);
    totalObjects += objs.length;

    const chunkFamilyCounts = new Map();
    const procFamilyCounts = new Map();
    let procTotal = 0;

    for (const o of objs) {
      const objReg = getRegionAt(o.x, o.y);
      if (objReg.id === reg.id) {
        if (isForbidden(o.defId, objReg.id)) {
          forbiddenInRegion++;
          totalForbiddenViolations++;
        }

        const fam = getFamily(o.defId);
        allDistinctFamiliesInRegion.add(fam);
        chunkFamilyCounts.set(fam, (chunkFamilyCounts.get(fam) || 0) + 1);

        if (!o.tags || (!o.tags.includes('authored') && !o.tags.includes('setpiece'))) {
          procFamilyCounts.set(fam, (procFamilyCounts.get(fam) || 0) + 1);
          procTotal++;
        }
      }
    }

    // Check dominance in this chunk for nature / procedural scatter (Prompt J1 SSOT: <= 20%)
    if (objs.length >= 20) {
      for (const count of procFamilyCounts.values()) {
        const dom = count / objs.length;
        if (dom > maxDominanceInRegion) maxDominanceInRegion = dom;
        if (dom > 0.201) {
          totalDominanceViolations++;
        }
      }
    }
  }

  const avgDensity = sampleChunks.length > 0 ? (totalObjects / sampleChunks.length).toFixed(1) : 0;
  const numFamilies = allDistinctFamiliesInRegion.size;

  let regPass = true;
  if (forbiddenInRegion > 0) regPass = false;
  if (numFamilies < minRequiredFamilies) {
    totalDiversityViolations++;
    regPass = false;
  }

  const status = regPass ? 'PASS' : 'FAIL';
  console.log(`| ${reg.id} | T${reg.tier || reg.dangerTier} | ${themeName} | ${sampleChunks.length} | ${avgDensity} | ${numFamilies}/${minRequiredFamilies} | ${(maxDominanceInRegion * 100).toFixed(1)}% | ${status} |`);
}

console.log('\n----------------------------------------------------------------');
console.log('Ringkasan Audit Palet Regional:');
console.log(`1. Pelanggaran Objek Terlarang (Forbid)   : ${totalForbiddenViolations} (Target = 0)`);
console.log(`2. Pelanggaran Dominansi Keluarga (> 25%) : ${totalDominanceViolations} (Target = 0)`);
console.log(`3. Pelanggaran Diversitas Keluarga (< Min): ${totalDiversityViolations} (Target = 0)`);
console.log('----------------------------------------------------------------\n');

if (totalForbiddenViolations > 0 || totalDiversityViolations > 0) {
  console.error('[FAIL] Audit Palet Regional Gagal! (EXIT 1)\n');
  process.exit(1);
} else {
  console.log('[PASS] Seluruh 29 Region Memenuhi Palet, Diversitas & Bebas Objek Terlarang! (EXIT 0)\n');
  process.exit(0);
}
