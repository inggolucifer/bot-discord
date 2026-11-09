const fs = require('fs');
const path = require('path');
const pwe = require('../../../utils/proceduralWorldEngine');
const obs = require('../../../utils/objectScatter');
const Npc = require('../../../models/Npc');

function isTileWalkable(tileX, tileY) {
  const tile = pwe.getTileAt(tileX, tileY);
  if (!tile || tile.isSolid) return false;
  if (typeof obs.isCellBlocked === 'function' && obs.isCellBlocked(tileX, tileY)) return false;
  return true;
}

/**
 * Real Invariant Checker V1-V14 for NPC Living Ecosystem
 * @param {Object} options { npcs, families, anchors, config }
 * @returns {Object} { violations: Array, stats: Object }
 */
function checkInvariants({ npcs = [], families = [], anchors = [], config = null }) {
  const violations = [];
  const rootDir = path.resolve(__dirname, '../../../');

  const essentialListPath = path.join(rootDir, 'world-data/npc-essential-v27.json');
  const essentialNames = fs.existsSync(essentialListPath)
    ? JSON.parse(fs.readFileSync(essentialListPath, 'utf8'))
    : [];

  const regionLadderPath = path.join(rootDir, 'world-data/region-ladder-v23.json');
  const regionLadder = fs.existsSync(regionLadderPath)
    ? JSON.parse(fs.readFileSync(regionLadderPath, 'utf8'))
    : { regions: {} };

  const anchorMap = new Map();
  anchors.forEach(a => anchorMap.set(a.id, a));

  const npcMapById = new Map();
  const nameSet = new Set();
  const locationSet = new Set();
  const anchorPopulationCount = new Map();

  let essentialCount = 0;
  let deadCount = 0;

  // Process all NPCs
  for (const npc of npcs) {
    const id = (npc._id || '').toString();
    if (id) npcMapById.set(id, npc);

    // V3: Unique names
    if (nameSet.has(npc.name)) {
      violations.push({ code: 'V3', message: `Duplicate NPC name: "${npc.name}"` });
    }
    nameSet.add(npc.name);

    const isEssential = !!(npc.vitalStatus?.isEssential || npc.isEssential);
    const isAlive = npc.vitalStatus?.isAlive !== false;

    if (isEssential) essentialCount++;
    if (!isAlive) deadCount++;

    // V2: No essential outside official list
    if (isEssential && !essentialNames.includes(npc.name)) {
      violations.push({ code: 'V2', message: `NPC "${npc.name}" is marked isEssential but not in npc-essential-v27.json` });
    }

    // V4: currentAge <= maxAge
    const currentAge = npc.lifespan?.currentAge ?? 0;
    const maxAge = npc.lifespan?.maxAge ?? 100;
    if (currentAge > maxAge) {
      violations.push({ code: 'V4', message: `NPC "${npc.name}" currentAge (${currentAge}) exceeds maxAge (${maxAge})` });
    }

    // V5: Spatial collision (no two live NPCs on same tile)
    if (isAlive) {
      const locKey = `${npc.tileX},${npc.tileY}`;
      if (locationSet.has(locKey)) {
        violations.push({ code: 'V5', message: `Tile collision at (${locKey}) for NPC "${npc.name}"` });
      }
      locationSet.add(locKey);
    }

    // V6: Tile is walkable
    if (!isTileWalkable(npc.tileX, npc.tileY)) {
      violations.push({ code: 'V6', message: `NPC "${npc.name}" placed on unwalkable tile (${npc.tileX}, ${npc.tileY})` });
    }

    // V7: schedule.tileX/Y == tileX/Y and not (0,0)
    const sX = npc.schedule?.tileX;
    const sY = npc.schedule?.tileY;
    if (npc.tileX === 0 && npc.tileY === 0) {
      violations.push({ code: 'V7', message: `NPC "${npc.name}" has invalid top-level coordinates (0, 0)` });
    }
    if (sX !== npc.tileX || sY !== npc.tileY) {
      violations.push({ code: 'V7', message: `NPC "${npc.name}" top-level coords (${npc.tileX}, ${npc.tileY}) mismatch schedule coords (${sX}, ${sY})` });
    }

    // V8: Realm within [base - 1, base + 3]
    const anchor = anchorMap.get(npc.schedule?.currentAnchorId);
    if (anchor) {
      const reg = regionLadder.regions[anchor.region];
      const tier = reg ? reg.tier : (anchor.tier || 1);
      const baseRealm = Math.max(0, tier - 1);
      const realmIdx = npc.cultivation?.realmIndex ?? 0;
      if (realmIdx < baseRealm - 1 || realmIdx > baseRealm + 3) {
        violations.push({ code: 'V8', message: `NPC "${npc.name}" realmIndex ${realmIdx} outside allowed range [${baseRealm - 1}, ${baseRealm + 3}] for region tier ${tier}` });
      }

      // V9: No NPC in secret_realm or danger_zone
      if (anchor.type === 'secret_realm' || anchor.type === 'danger_zone') {
        violations.push({ code: 'V9', message: `NPC "${npc.name}" placed in prohibited anchor type "${anchor.type}" (${anchor.id})` });
      }

      anchorPopulationCount.set(anchor.id, (anchorPopulationCount.get(anchor.id) || 0) + 1);
    }

    // V13: Document schema validity
    try {
      const doc = new Npc(npc);
      const valErr = doc.validateSync();
      if (valErr) {
        violations.push({ code: 'V13', message: `Schema validation failed for "${npc.name}": ${valErr.message}` });
      }
    } catch (e) {
      violations.push({ code: 'V13', message: `Schema instantiation failed for "${npc.name}": ${e.message}` });
    }

    // V14: zoneId is 'tianyuan_world_map'
    if (npc.zoneId !== 'tianyuan_world_map') {
      violations.push({ code: 'V14', message: `NPC "${npc.name}" has invalid zoneId "${npc.zoneId}" (expected "tianyuan_world_map")` });
    }
  }

  // V1: All essential story NPCs exist, are alive, and isEssential: true
  for (const essName of essentialNames) {
    const found = npcs.find(n => n.name === essName);
    if (!found) {
      violations.push({ code: 'V1', message: `Story NPC "${essName}" is missing from ecosystem` });
    } else {
      if (found.vitalStatus?.isAlive === false) {
        violations.push({ code: 'V1', message: `Story NPC "${essName}" is dead` });
      }
      if (!found.vitalStatus?.isEssential) {
        violations.push({ code: 'V1', message: `Story NPC "${essName}" is not marked isEssential: true` });
      }
    }
  }

  // V10: Total NPC count in range [650, 900]
  if (npcs.length < 650 || npcs.length > 900) {
    violations.push({ code: 'V10', message: `Total NPC count ${npcs.length} outside expected range [650, 900]` });
  }

  // V11: Populated anchors have >= 1 resident and <= quota
  if (config && config.residentsPerType) {
    for (const anchor of anchors) {
      const quota = config.residentsPerType[anchor.type];
      const count = anchorPopulationCount.get(anchor.id) || 0;
      if (quota > 0) {
        if (count < 1) {
          violations.push({ code: 'V11', message: `Anchor "${anchor.id}" of type "${anchor.type}" has 0 residents (expected ${quota})` });
        }
        if (count > quota + 5) {
          violations.push({ code: 'V11', message: `Anchor "${anchor.id}" exceeds resident quota (has ${count}, max ${quota + 5})` });
        }
      } else {
        if (count > 0) {
          violations.push({ code: 'V11', message: `Anchor "${anchor.id}" of type "${anchor.type}" should have 0 residents, but has ${count}` });
        }
      }
    }
  }

  // V12: Family members point to valid existing NPCs
  for (const family of families) {
    if (Array.isArray(family.members)) {
      for (const m of family.members) {
        const mid = (m.npcId || '').toString();
        if (!npcMapById.has(mid)) {
          violations.push({ code: 'V12', message: `Family "${family.familyName}" references orphaned member NPC ID: ${mid}` });
        }
      }
    }
  }

  // V15: Every ID/name in essential_sources.txt present in DB/snapshot must have isEssential === true
  const sourcesFilePath = path.join(rootDir, 'review/v29_raw/essential_sources.txt');
  if (fs.existsSync(sourcesFilePath)) {
    const rawSources = fs.readFileSync(sourcesFilePath, 'utf8');
    const sourceEntries = rawSources
      .split('\n')
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('#'))
      .map(l => l.split('|')[0].trim());

    for (const entry of sourceEntries) {
      const found = npcs.find(n =>
        (n._id && n._id.toString() === entry) ||
        n.name === entry ||
        n.slug === entry ||
        n.name.toLowerCase() === entry.replace(/^npc_/, '').replace(/_/g, ' ').toLowerCase()
      );
      if (found) {
        if (!found.vitalStatus?.isEssential) {
          violations.push({ code: 'V15', message: `Story NPC from essential_sources "${entry}" (${found.name}) is present in DB but vitalStatus.isEssential is false` });
        }
      }
    }
  }

  // Invariant V16: persentase NPC dengan wanderLevel>0 antara 8% dan 20%
  const wanderingNpcs = npcs.filter(n => (n.schedule?.wanderLevel || 0) > 0);
  const wanderPct = (wanderingNpcs.length / npcs.length) * 100;
  if (wanderPct < 8 || wanderPct > 20) {
    violations.push({
      code: 'V16',
      message: `Percentage of wandering NPCs (${wanderPct.toFixed(2)}%) outside required range [8%, 20%]`
    });
  }

  // Invariant V17: tidak ada NPC esensial dengan wanderLevel>0 atau targetDestination.type==='journey'
  for (const n of npcs) {
    if (n.vitalStatus?.isEssential) {
      if ((n.schedule?.wanderLevel || 0) > 0) {
        violations.push({
          code: 'V17',
          message: `Essential NPC "${n.name}" (${n._id || n.id}) has wanderLevel > 0: ${n.schedule?.wanderLevel}`
        });
      }
      if (n.schedule?.targetDestination?.type === 'journey') {
        violations.push({
          code: 'V17',
          message: `Essential NPC "${n.name}" (${n._id || n.id}) has targetDestination.type === 'journey'`
        });
      }
    }
  }

  // Invariant V18: setiap NPC dengan targetDestination.type==='journey' punya legs array tidak kosong, semua angka finite, etaAt > startedAt
  for (const n of npcs) {
    const dest = n.schedule?.targetDestination;
    if (dest && dest.type === 'journey') {
      if (!Array.isArray(dest.legs) || dest.legs.length === 0) {
        violations.push({
          code: 'V18',
          message: `NPC "${n.name}" journey has empty legs array`
        });
      } else {
        let finite = true;
        for (const leg of dest.legs) {
          if (!Number.isFinite(leg.ax) || !Number.isFinite(leg.ay) ||
              !Number.isFinite(leg.bx) || !Number.isFinite(leg.by) ||
              !Number.isFinite(leg.len)) {
            finite = false;
            break;
          }
        }
        if (!finite) {
          violations.push({
            code: 'V18',
            message: `NPC "${n.name}" journey has non-finite leg coordinates/len`
          });
        }
      }
      if (!Number.isFinite(dest.startedAt) || !Number.isFinite(dest.etaAt) || dest.etaAt <= dest.startedAt) {
        violations.push({
          code: 'V18',
          message: `NPC "${n.name}" journey has invalid timing: startedAt=${dest.startedAt}, etaAt=${dest.etaAt}`
        });
      }
    }
  }

  return {
    violations,
    stats: {
      totalNpcs: npcs.length,
      essentialCount,
      deadCount,
      uniqueLocations: locationSet.size,
      totalFamilies: families.length,
      populatedAnchors: anchorPopulationCount.size
    }
  };
}

module.exports = {
  checkInvariants,
  isTileWalkable
};
