/**
 * checkBestiaryUnique.js
 * Validates:
 * (a) Each region has exactly 3 common species with unique names (never duplicated across regions, compared lowercase)
 * (b) Each region has 1 unique elite (compared lowercase)
 * (c) All boss IDs are unique
 */

const fs = require('fs');
const path = require('path');

const bestiaryPath = path.join(__dirname, '../world-data/bestiary-v2.json');
const bestiary = JSON.parse(fs.readFileSync(bestiaryPath, 'utf8'));

let failures = 0;
const commonRegionMap = new Map(); // nameLower -> [regions]
const eliteRegionMap = new Map();  // nameLower -> [regions]
const bossIds = new Map();         // bossId -> region

const regions = Object.keys(bestiary);
console.log(`\n=== CHECK BESTIARY UNIQUE (${regions.length} Regions) ===`);

for (const regionId of regions) {
  const reg = bestiary[regionId];

  // (a) Validate commons
  const commons = reg.common || [];
  if (commons.length !== 3) {
    console.error(`[FAIL] Region ${regionId} has ${commons.length} common species (expected 3)`);
    failures++;
  }

  for (const c of commons) {
    const nameLower = (c.name || '').trim().toLowerCase();
    if (!nameLower) {
      console.error(`[FAIL] Region ${regionId} has an empty common species name`);
      failures++;
      continue;
    }
    if (!commonRegionMap.has(nameLower)) {
      commonRegionMap.set(nameLower, []);
    }
    commonRegionMap.get(nameLower).push(regionId);
  }

  // (b) Validate elite
  const elites = reg.elite || [];
  if (elites.length < 1) {
    console.error(`[FAIL] Region ${regionId} has 0 elite species`);
    failures++;
  } else {
    const eliteNameLower = (elites[0].name || '').trim().toLowerCase();
    if (!eliteNameLower) {
      console.error(`[FAIL] Region ${regionId} has an empty elite name`);
      failures++;
    } else {
      if (!eliteRegionMap.has(eliteNameLower)) {
        eliteRegionMap.set(eliteNameLower, []);
      }
      eliteRegionMap.get(eliteNameLower).push(regionId);
    }
  }

  // (c) Validate boss ID
  if (!reg.boss || !reg.boss.id) {
    console.error(`[FAIL] Region ${regionId} is missing boss or boss.id`);
    failures++;
  } else {
    const bId = reg.boss.id;
    if (bossIds.has(bId)) {
      console.error(`[FAIL] Duplicate boss ID '${bId}' in ${regionId} (already in ${bossIds.get(bId)})`);
      failures++;
    } else {
      bossIds.set(bId, regionId);
    }
  }
}

// Check duplicates in commons
for (const [name, regList] of commonRegionMap.entries()) {
  if (regList.length > 1) {
    console.error(`[FAIL] Common species '${name}' duplicated across regions: ${regList.join(', ')}`);
    failures++;
  }
}

// Check duplicates in elites
for (const [name, regList] of eliteRegionMap.entries()) {
  if (regList.length > 1) {
    console.error(`[FAIL] Elite species '${name}' duplicated across regions: ${regList.join(', ')}`);
    failures++;
  }
}

console.log(`Total Common Species: ${commonRegionMap.size} (Expected 87)`);
console.log(`Total Elite Species:  ${eliteRegionMap.size} (Expected 29)`);
console.log(`Total Boss IDs:       ${bossIds.size} (Expected 29)`);

if (failures === 0 && commonRegionMap.size === 87 && eliteRegionMap.size === 29 && bossIds.size === 29) {
  console.log(`\n[PASS] 100% Bestiary uniqueness verified! All 87 commons, 29 elites, and 29 boss IDs are unique.`);
  process.exit(0);
} else {
  console.error(`\n[FAIL] Bestiary uniqueness check failed with ${failures} error(s).`);
  process.exit(1);
}
