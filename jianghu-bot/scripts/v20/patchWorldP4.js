const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');

function patchFile(relPath, patchFn) {
  const fullPath = path.join(ROOT, relPath);
  let content = fs.readFileSync(fullPath, 'utf8').replace(/\r\n/g, '\n');
  const updated = patchFn(content);
  if (content === updated) {
    console.log(`[P4] ${relPath}: No changes needed or pattern already applied.`);
  } else {
    fs.writeFileSync(fullPath, updated, 'utf8');
    console.log(`[P4] ${relPath}: Successfully patched.`);
  }
}

// ---------------------------------------------------------------------------
// 1. utils/chunkStreamingEngine.js
// ---------------------------------------------------------------------------
patchFile('utils/chunkStreamingEngine.js', (content) => {
  // Add entrance forwarding in specialTiles
  const targetSpecial = `      if (tile.isSettlementOrigin) {
        special.isSettlementOrigin = true;
        if (tile.settlementName) special.settlementName = tile.settlementName;
        if (tile.chineseName) special.chineseName = tile.chineseName;
        if (tile.label) special.label = tile.label;
      }`;

  const replSpecial = `      if (tile.isSettlementOrigin) {
        special.isSettlementOrigin = true;
        if (tile.settlementName) special.settlementName = tile.settlementName;
        if (tile.chineseName) special.chineseName = tile.chineseName;
        if (tile.label) special.label = tile.label;
      }
      if (tile.isSettlementEntrance) {
        special.isSettlementEntrance = true;
        if (tile.settlementName) special.settlementName = tile.settlementName;
        if (tile.settlementData) {
          special.settlementData = {
            id: tile.settlementData.id,
            name: tile.settlementData.name,
            tier: tile.settlementData.tier
          };
        }
      }`;

  if (content.includes(targetSpecial) && !content.includes('tile.isSettlementEntrance')) {
    content = content.replace(targetSpecial, replSpecial);
  }

  // Settlement marker collision in getStaticChunk
  const targetColLoop = `    if (col === 'solid') {
      const w = obj.cw || 1;
      const h = obj.ch || 1;`;

  const replColLoop = `    if (col === 'solid') {
      const w = obj.cw || 1;
      // V20: For settlement markers, collision height is spanHeight - 1 (forecourt is walkable)
      const h = (obj.tags && obj.tags.includes('settlement_marker'))
        ? Math.max(1, (obj.spanHeight || 2) - 1)
        : (obj.ch || 1);`;

  if (content.includes(targetColLoop) && !content.includes('settlement_marker')) {
    content = content.replace(targetColLoop, replColLoop);
  }

  // Forward entrance in unpackChunk
  const targetUnpack = `        settlementName: special.settlementName !== undefined ? special.settlementName : baseTile.settlementName,
        chineseName: special.chineseName !== undefined ? special.chineseName : baseTile.chineseName,`;

  const replUnpack = `        settlementName: special.settlementName !== undefined ? special.settlementName : baseTile.settlementName,
        chineseName: special.chineseName !== undefined ? special.chineseName : baseTile.chineseName,
        isSettlementEntrance: special.isSettlementEntrance !== undefined ? special.isSettlementEntrance : baseTile.isSettlementEntrance,
        settlementData: special.settlementData !== undefined ? special.settlementData : baseTile.settlementData,`;

  if (content.includes(targetUnpack) && !content.includes('isSettlementEntrance: special.isSettlementEntrance')) {
    content = content.replace(targetUnpack, replUnpack);
  }

  return content;
});

// ---------------------------------------------------------------------------
// 2. utils/objectScatter.js
// ---------------------------------------------------------------------------
patchFile('utils/objectScatter.js', (content) => {
  // Ensure settlementZones and manmade list are required
  const reqTarget = `const assetPlacementV10 = require('./assetPlacementV10');`;
  const reqRepl = `const assetPlacementV10 = require('./assetPlacementV10');
const { isInSettlementExclusion } = require('./settlementZones');
const MANMADE_SET = new Set(require('../world-data/manmade-defids-v20.json'));

function isManmadeDefId(defId) {
  if (!defId) return false;
  if (MANMADE_SET.has(defId)) return true;
  const d = defId.toLowerCase();
  return d.startsWith('building_') ||
         d.startsWith('house_') ||
         d.startsWith('hut_') ||
         d.startsWith('prop_') ||
         d.startsWith('craft_') ||
         d.startsWith('shop_') ||
         d.startsWith('furn_') ||
         d.startsWith('decor_') ||
         d.startsWith('market_') ||
         d.startsWith('structure_') ||
         d.startsWith('facility_') ||
         d.startsWith('fence_') ||
         d.startsWith('wall_');
}`;

  if (content.includes(reqTarget) && !content.includes('isManmadeDefId')) {
    content = content.replace(reqTarget, reqRepl);
  }

  // Update objects.push filter inside getChunkObjects
  const targetPush = `  const origPush = objects.push.bind(objects);
  objects.push = function(...items) {
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it && it.defId) {
        const fam = getAssetFamily(it.defId);
        objects.familyCounts.set(fam, (objects.familyCounts.get(fam) || 0) + 1);
        objects.defCounts.set(it.defId, (objects.defCounts.get(it.defId) || 0) + 1);
      }
    }
    return origPush(...items);
  };`;

  const replPush = `  const origPush = objects.push.bind(objects);
  const ambientNaturePerAnchor = new Map();
  objects.push = function(...items) {
    const filtered = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it || !it.defId) continue;
      
      // V20: Settlement marker is always allowed
      if (it.tags && it.tags.includes('settlement_marker')) {
        filtered.push(it);
      } else {
        // Check settlement exclusion zone
        const ex = isInSettlementExclusion(it.x, it.y);
        if (ex.inZone) {
          if (isManmadeDefId(it.defId)) {
            // Strictly prohibit manmade objects in exclusion zone
            continue;
          }
          // Ambient nature props capped at 12 per anchor
          const aId = ex.anchor.id;
          const curr = ambientNaturePerAnchor.get(aId) || 0;
          if (curr >= 12) continue;
          ambientNaturePerAnchor.set(aId, curr + 1);
        }
        filtered.push(it);
      }

      const fam = getAssetFamily(it.defId);
      objects.familyCounts.set(fam, (objects.familyCounts.get(fam) || 0) + 1);
      objects.defCounts.set(it.defId, (objects.defCounts.get(it.defId) || 0) + 1);
    }
    return origPush(...filtered);
  };`;

  if (content.includes(targetPush) && !content.includes('ambientNaturePerAnchor')) {
    content = content.replace(targetPush, replPush);
  }

  // Replace anchor setpiece placement (Section 1)
  const targetAnchorSection = `  // 1. Set-pieces from anchors & 29 Regional Landmarks
  const anchorsInChunk = worldData.getAnchors().filter(a =>
    a.x >= startTileX && a.x <= endTileX &&
    a.y >= startTileY && a.y <= endTileY
  );
  const isSettlementChunk = anchorsInChunk.some(a => ['village', 'hamlet', 'city', 'capital_city', 'sect', 'port'].includes(a.type));

  for (const a of anchorsInChunk) {
    const region = getRegionAt(a.x, a.y);
    const landmarkBinding = assetBindings.landmarks[region.id];

    let structureDef = { defId: 'building_village_thatched_cottage', cw: 2, ch: 2, collision: 'solid' };

    if (a.id === 'xitong_city' || a.name.toLowerCase().includes('xitong')) {
      structureDef = { defId: 'xitong_city_landmark', cw: 4, ch: 3, collision: 'solid' };
    } else if (a.type === 'sect') {
      structureDef = { defId: 'building_sect_library', cw: 3, ch: 2, collision: 'solid' };
    } else if (a.type === 'capital_city' || a.type === 'major_city' || a.type === 'city') {
      structureDef = { defId: 'building_spirit_pagoda', cw: 3, ch: 3, collision: 'solid' };
    } else if (a.name.toLowerCase().includes('dermaga') || a.name.toLowerCase().includes('dock') || a.name.toLowerCase().includes('port') || a.type === 'port') {
      structureDef = { defId: 'building_dock_warehouse', cw: 3, ch: 2, collision: 'solid' };
    } else if (a.type === 'village' || a.type === 'hamlet') {
      structureDef = { defId: 'building_village_thatched_cottage', cw: 2, ch: 2, collision: 'solid' };
    } else if (a.type === 'outpost') {
      structureDef = { defId: 'building_stone_torii_v1', cw: 2, ch: 2, collision: 'solid' };
    } else if (landmarkBinding && (a.type === 'landmark' || a.type === 'focal')) {
      structureDef = {
        defId: landmarkBinding.defId,
        cw: landmarkBinding.cw || 3,
        ch: landmarkBinding.ch || 3,
        collision: landmarkBinding.collision || 'solid'
      };
    }

    const g = GC.getGrid(structureDef.defId);
    const fw = g ? g.fw : (structureDef.cw || 2);
    const fh = g ? g.fh : (structureDef.ch || 2);
    const x0 = a.x - Math.floor(fw / 2);
    const y0 = a.y - fh;

    if (canPlaceFootprint(x0, y0, fw, fh, occupiedGrid, getTileAt, true, structureDef.defId, objects, true)) {
      const objId = \`anchor_\${a.id}\`;
      markFootprintOccupied(x0, y0, fw, fh, occupiedGrid, objId, structureDef.defId, true);
      objects.push({
        id: objId,
        defId: structureDef.defId,
        x: x0,
        y: y0,
        customLabel: a.name,
        collision: structureDef.collision,
        tags: ['setpiece', a.type, region.id]
      });
    }
  }`;

  const replAnchorSection = `  // 1. V20 Single Large Settlement Marker per Anchor
  const anchorsInChunk = worldData.getAnchors().filter(a =>
    a.x >= startTileX && a.x <= endTileX &&
    a.y >= startTileY && a.y <= endTileY
  );
  const isSettlementChunk = anchorsInChunk.some(a => ['village', 'hamlet', 'town', 'city', 'major_city', 'capital_city', 'sect', 'port', 'outpost'].includes(a.type));

  for (const a of anchorsInChunk) {
    const markerDefId = (a.v20 && a.v20.markerDefId) || 'settlement_village_default';
    const fw = a.spanWidth || 2;
    const fh = a.spanHeight || 2;
    const objId = \`marker_\${a.id}\`;

    // Mark span tiles occupied in occupiedGrid to protect building footprint and forecourt
    for (let dy = 0; dy < fh; dy++) {
      for (let dx = 0; dx < fw; dx++) {
        occupiedGrid.set(\`\${a.x + dx},\${a.y + dy}\`, objId);
      }
    }

    objects.push({
      id: objId,
      defId: markerDefId,
      x: a.x,
      y: a.y,
      customLabel: a.name,
      collision: 'solid',
      spanWidth: fw,
      spanHeight: fh,
      cw: fw,
      ch: Math.max(1, fh - 1),
      tags: ['settlement_marker', a.type, a.id]
    });
  }`;

  if (content.includes(targetAnchorSection)) {
    content = content.replace(targetAnchorSection, replAnchorSection);
  }

  // Disable Section 2 (Settlement Density Rings: Outskirts structures)
  const targetOutskirts = `  // 2. Settlement Density Rings: Outskirts structures around nearby anchors (radius <= 8 tiles)
  const nearbyAnchors = worldData.getAnchors().filter(a =>
    a.x >= (startTileX - 8) && a.x <= (endTileX + 8) &&
    a.y >= (startTileY - 8) && a.y <= (endTileY + 8)
  );

  if (nearbyAnchors.length > 0) {
    const outskirts = assetBindings.settlementObjects.outskirts;
    for (const a of nearbyAnchors) {
      const ringCount = Math.floor(rand() * 3) + 2; // 2..4 outskirts objects per anchor
      for (let i = 0; i < ringCount; i++) {
        if (objects.length - authoredCount >= maxObjectsBudget) break;
        const angle = rand() * Math.PI * 2;
        const dist = 3 + rand() * 4; // dist 3..7 tiles from anchor center
        const ox = Math.round(a.x + Math.cos(angle) * dist);
        const oy = Math.round(a.y + Math.sin(angle) * dist);

        if (ox >= startTileX && ox <= endTileX && oy >= startTileY && oy <= endTileY) {
          const itemDef = outskirts[Math.floor(rand() * outskirts.length)];
          if (canPlaceFootprint(ox, oy, itemDef.cw, itemDef.ch, occupiedGrid, getTileAt, false, itemDef.defId, objects)) {
            const objId = \`outskirt_\${ox}_\${oy}\`;
            markFootprintOccupied(ox, oy, itemDef.cw, itemDef.ch, occupiedGrid, objId, itemDef.defId);
            objects.push({
              id: objId,
              defId: itemDef.defId,
              x: ox,
              y: oy,
              collision: itemDef.collision,
              tags: ['settlement_outskirts']
            });
          }
        }
      }
    }
  }`;

  const replOutskirts = `  // 2. V20: Outskirts structures around settlements removed (interior has all facilities)`;

  if (content.includes(targetOutskirts)) {
    content = content.replace(targetOutskirts, replOutskirts);
  }

  return content;
});

// ---------------------------------------------------------------------------
// 3. utils/assetPlacementV10.js
// ---------------------------------------------------------------------------
patchFile('utils/assetPlacementV10.js', (content) => {
  // Ensure settlementZones is required
  if (!content.includes('settlementZones')) {
    content = content.replace(
      `const { getRegionAt } = require('./proceduralWorldEngine');`,
      `const { getRegionAt } = require('./proceduralWorldEngine');\nconst { isInSettlementExclusion } = require('./settlementZones');`
    );
  }

  // Section E: disable town facilities and craft structures around anchors
  const targetSecE = `  // --------------------------------------------------------------------------
  // E. TOWN FACILITIES & PROF STRUCTURES (Proportionate by Anchor Tier)
  // --------------------------------------------------------------------------
  const anchorsInChunk = allAnchors.filter(a =>
    a.x >= (startTileX - 32) && a.x <= (endTileX + 32) &&
    a.y >= (startTileY - 32) && a.y <= (endTileY + 32)
  );

  for (let ai = 0; ai < anchorsInChunk.length; ai++) {
    const a = anchorsInChunk[ai];
    const isMajor = a.type === 'capital_city' || a.type === 'major_city' || a.type === 'city' || a.type === 'sect';
    const isUrban = isMajor || a.type === 'town';

    // Facilities: Major cities get 10 facilities, small rural villages get 2 local facilities
    const facCount = isUrban ? 10 : 2;
    for (let fi = 0; fi < facCount; fi++) {
      let facDef = TOWN_FACILITY_VARIANTS[(ai * 7 + fi) % TOWN_FACILITY_VARIANTS.length];
      if (a.id === 'xitong_city' && fi === 0) facDef = 'xitong_city_landmark';
      if (isMajor && fi === 0) facDef = 'building_spirit_pagoda';

      const g = GC.getGrid(facDef);
      const fw = g ? g.fw : 2;
      const fh = g ? g.fh : 2;

      for (let attempt = 0; attempt < 12; attempt++) {
        const angle = (((fi * 36) + attempt * 30) / 180) * Math.PI;
        const dist = 5 + attempt * 2;
        const fx = Math.round(a.x + Math.cos(angle) * dist);
        const fy = Math.round(a.y + Math.sin(angle) * dist);

        if (fx < startTileX || fx > endTileX || fy < startTileY || fy > endTileY) continue;
        if (AUTHORED_ROAD_TILES.has(\`\${fx},\${fy}\`)) continue;

        if (canPlaceFootprint(fx, fy, fw, fh, occupiedGrid, getTileAt, false, facDef, objects)) {
          const objId = \`facility_\${fx}_\${fy}\`;
          markFootprintOccupied(fx, fy, fw, fh, occupiedGrid, objId, facDef);
          objects.push({
            id: objId,
            defId: facDef,
            x: fx,
            y: fy,
            collision: 'solid',
            tags: ['facility', a.type]
          });
          break;
        }
      }
    }

    // Professional Craft Structure (4 for urban, 2 for rural)
    const profCount = isUrban ? 4 : 2;
    for (let pi = 0; pi < profCount; pi++) {
      const profDef = PROF_STRUCTURE_VARIANTS[(ai * 3 + pi) % PROF_STRUCTURE_VARIANTS.length];
      for (let attempt = 0; attempt < 10; attempt++) {
        const pAngle = (((pi * 90) + attempt * 36) / 180) * Math.PI;
        const pDist = 4 + attempt * 2;
        const px = Math.round(a.x + Math.cos(pAngle) * pDist);
        const py = Math.round(a.y + Math.sin(pAngle) * pDist);

        if (px < startTileX || px > endTileX || py < startTileY || py > endTileY) continue;
        if (AUTHORED_ROAD_TILES.has(\`\${px},\${py}\`)) continue;

        if (canPlaceFootprint(px, py, 1, 1, occupiedGrid, getTileAt, false, profDef, objects)) {
          const objId = \`prof_\${px}_\${py}\`;
          markFootprintOccupied(px, py, 1, 1, occupiedGrid, objId, profDef);
          objects.push({
            id: objId,
            defId: profDef,
            x: px,
            y: py,
            collision: 'solid',
            tags: ['craft_structure', 'profession']
          });
          break;
        }
      }
    }`;

  const replSecE = `  // --------------------------------------------------------------------------
  // E. TOWN FACILITIES & PROF STRUCTURES (V20: Disabled - inside settlement interior)
  // --------------------------------------------------------------------------
  const anchorsInChunk = allAnchors.filter(a =>
    a.x >= (startTileX - 32) && a.x <= (endTileX + 32) &&
    a.y >= (startTileY - 32) && a.y <= (endTileY + 32)
  );

  for (let ai = 0; ai < anchorsInChunk.length; ai++) {
    const a = anchorsInChunk[ai];
    const isMajor = a.type === 'capital_city' || a.type === 'major_city' || a.type === 'city' || a.type === 'sect';
    const isUrban = isMajor || a.type === 'town';`;

  if (content.includes(targetSecE)) {
    content = content.replace(targetSecE, replSecE);
  }

  // Section F: Rustic countryside around anchors disabled
  const targetSecF = `  // --------------------------------------------------------------------------
  // F. RUSTIC COUNTRYSIDE (8 for urban outskirts, 3 for rural hamlets)
  // --------------------------------------------------------------------------
  for (let ai = 0; ai < anchorsInChunk.length; ai++) {
    const a = anchorsInChunk[ai];
    const isUrban = a.type === 'capital_city' || a.type === 'major_city' || a.type === 'city' || a.type === 'sect' || a.type === 'town';
    const rusticLimit = isUrban ? 8 : 3;
    for (let ri = 0; ri < rusticLimit; ri++) {
      const rusticDef = RUSTIC_COUNTRY_VARIANTS[(ai * 7 + ri) % RUSTIC_COUNTRY_VARIANTS.length];
      const g = GC.getGrid(rusticDef);
      const fw = g ? g.fw : 2;
      const fh = g ? g.fh : 2;

      for (let attempt = 0; attempt < 12; attempt++) {
        const angle = (((ri * 36) + attempt * 30) / 180) * Math.PI;
        const dist = 6 + attempt * 2;
        const rx = Math.round(a.x + Math.cos(angle) * dist);
        const ry = Math.round(a.y + Math.sin(angle) * dist);

        if (rx < startTileX || rx > endTileX || ry < startTileY || ry > endTileY) continue;
        if (AUTHORED_ROAD_TILES.has(\`\${rx},\${ry}\`)) continue;

        const tile = getTileAt(rx, ry);
        if (!tile || tile.isSolid) continue;

        if (canPlaceFootprint(rx, ry, fw, fh, occupiedGrid, getTileAt, false, rusticDef, objects)) {
          const objId = \`rustic_\${rx}_\${ry}\`;
          markFootprintOccupied(rx, ry, fw, fh, occupiedGrid, objId, rusticDef);
          objects.push({
            id: objId,
            defId: rusticDef,
            x: rx,
            y: ry,
            collision: 'solid',
            tags: ['rustic_country', 'outskirts']
          });
          break;
        }
      }
    }
  }`;

  const replSecF = `  // --------------------------------------------------------------------------
  // F. RUSTIC COUNTRYSIDE (V20: Disabled inside settlement exclusion zones)
  // --------------------------------------------------------------------------`;

  if (content.includes(targetSecF)) {
    content = content.replace(targetSecF, replSecF);
  }

  // Section G: POI misc around anchors disabled
  const targetSecG = `  // --------------------------------------------------------------------------
  // G. POI MISC & WATER EDGE STRUCTURES (8 variants)
  // --------------------------------------------------------------------------
  for (const a of anchorsInChunk) {
    const wDefs = ['building_ferry_dock', 'building_watermill_stream', 'building_riverside_watermill_paddle_wheel'];
    for (let wi = 0; wi < wDefs.length; wi++) {
      const wDef = wDefs[wi];
      for (let attempt = 0; attempt < 6; attempt++) {
        const wx = a.x + (wi * 4 - 4) + (attempt % 3);
        const wy = a.y + 6 + Math.floor(attempt / 3) * 2;
        if (wx < startTileX || wx > endTileX || wy < startTileY || wy > endTileY) continue;
        if (AUTHORED_ROAD_TILES.has(\`\${wx},\${wy}\`)) continue;

        const tile = getTileAt(wx, wy);
        if (!tile || tile.isSolid) continue;

        if (canPlaceFootprint(wx, wy, 2, 2, occupiedGrid, getTileAt, false, wDef, objects)) {
          const objId = \`poi_water_\${wx}_\${wy}\`;
          markFootprintOccupied(wx, wy, 2, 2, occupiedGrid, objId, wDef);
          objects.push({
            id: objId,
            defId: wDef,
            x: wx,
            y: wy,
            collision: 'solid',
            tags: ['water_structure', 'scenic']
          });
          break;
        }
      }
    }
  }`;

  const replSecG = `  // --------------------------------------------------------------------------
  // G. POI MISC & WATER EDGE STRUCTURES (V20: Disabled inside settlement exclusion zones)
  // --------------------------------------------------------------------------`;

  if (content.includes(targetSecG)) {
    content = content.replace(targetSecG, replSecG);
  }

  return content;
});

// ---------------------------------------------------------------------------
// 4. services/movementService.js
// ---------------------------------------------------------------------------
patchFile('services/movementService.js', (content) => {
  if (!content.includes("require('../utils/settlementZones')")) {
    content = content.replace(
      `const { processGridStepConditions } = require('../utils/conditionEngine');`,
      `const { processGridStepConditions } = require('../utils/conditionEngine');\nconst settlementZones = require('../utils/settlementZones');`
    );
  }

  const targetReturn = `    return {
      ok: true,
      direction: dirInfo.label,
      previousPosition: { tileX: currentX, tileY: currentY },
      newPosition: { zoneId, tileX: targetX, tileY: targetY, facing: dirInfo.facing },
      staminaCost: finalStaminaCost,
      currentStamina: newStamina,
      maxStamina,
      environmentalInhalation,
      tileInfo: passCheck.tile ? {`;

  const replReturn = `    // V20: Check if landing on a settlement entrance
    const anchorAtEntrance = settlementZones.findAnchorByEntrance(targetX, targetY);
    let settlementPrompt = null;
    if (anchorAtEntrance) {
      settlementPrompt = {
        id: anchorAtEntrance.id,
        name: anchorAtEntrance.name,
        tier: anchorAtEntrance.tier || 1,
        regionSlug: anchorAtEntrance.region || anchorAtEntrance.regionSlug || 'central_plains'
      };
    }

    return {
      ok: true,
      direction: dirInfo.label,
      previousPosition: { tileX: currentX, tileY: currentY },
      newPosition: { zoneId, tileX: targetX, tileY: targetY, facing: dirInfo.facing },
      staminaCost: finalStaminaCost,
      currentStamina: newStamina,
      maxStamina,
      environmentalInhalation,
      settlementPrompt,
      tileInfo: passCheck.tile ? {`;

  if (content.includes(targetReturn) && !content.includes('settlementPrompt')) {
    content = content.replace(targetReturn, replReturn);
  }

  return content;
});

// ---------------------------------------------------------------------------
// 5. web-api/routes/world.js
// ---------------------------------------------------------------------------
patchFile('web-api/routes/world.js', (content) => {
  if (!content.includes("require('../../utils/settlementZones')")) {
    content = content.replace(
      `const { setPlayerAuthoritativePosition } = require('../../services/movementService');`,
      `const { setPlayerAuthoritativePosition } = require('../../services/movementService');\nconst settlementZones = require('../../utils/settlementZones');`
    );
  }

  // /zone/step-move response payload
  const targetStepMove = `        const responsePayload = {
            success: true,
            stepsTaken,
            totalStaminaCost: Math.round(totalStaminaCost * 100) / 100,
            currentStamina: Math.floor(player.currentStamina),
            maxStamina: Math.floor(player.maxStamina || getMaxStamina(player)),
            arrivedPosition: { tileX: currentX, tileY: currentY },
            authoritativePosition: { tileX: currentX, tileY: currentY },
            currentLocation: player.currentLocation,
            stoppedEarly,
            stopReason,
            encounter: encounterResult,
            exploredChunks: player.exploredChunks || []
        };`;

  const replStepMove = `        const anchorAtEntrance = settlementZones.findAnchorByEntrance(currentX, currentY);
        const responsePayload = {
            success: true,
            stepsTaken,
            totalStaminaCost: Math.round(totalStaminaCost * 100) / 100,
            currentStamina: Math.floor(player.currentStamina),
            maxStamina: Math.floor(player.maxStamina || getMaxStamina(player)),
            arrivedPosition: { tileX: currentX, tileY: currentY },
            authoritativePosition: { tileX: currentX, tileY: currentY },
            currentLocation: player.currentLocation,
            stoppedEarly,
            stopReason,
            encounter: encounterResult,
            exploredChunks: player.exploredChunks || [],
            settlementPrompt: anchorAtEntrance ? {
                id: anchorAtEntrance.id,
                name: anchorAtEntrance.name,
                tier: anchorAtEntrance.tier || 1,
                regionSlug: anchorAtEntrance.region || anchorAtEntrance.regionSlug || 'central_plains'
            } : null
        };`;

  if (content.includes(targetStepMove) && !content.includes('settlementPrompt: anchorAtEntrance')) {
    content = content.replace(targetStepMove, replStepMove);
  }

  return content;
});

// ---------------------------------------------------------------------------
// 6. utils/settlementEngine.js
// ---------------------------------------------------------------------------
patchFile('utils/settlementEngine.js', (content) => {
  const targetHeader = `const ANCHORS_PATH = path.join(__dirname, '../world-data/anchors.json');
const BLUEPRINTS_DIR = path.join(__dirname, '../world-data/settlements');`;

  const replHeader = `const ANCHORS_PATH = path.join(__dirname, '../world-data/anchors.json');
const BLUEPRINTS_DIR = path.join(__dirname, '../world-data/settlements');
const FACILITIES_V20_PATH = path.join(__dirname, '../world-data/settlement-facilities-v20.json');

let facilitiesV20Cache = null;
function loadFacilitiesV20() {
    if (facilitiesV20Cache) return facilitiesV20Cache;
    try {
        if (fs.existsSync(FACILITIES_V20_PATH)) {
            facilitiesV20Cache = JSON.parse(fs.readFileSync(FACILITIES_V20_PATH, 'utf8'));
        }
    } catch (err) {
        console.error('[SettlementEngine] Error loading settlement-facilities-v20.json:', err.message);
    }
    return facilitiesV20Cache;
}`;

  if (content.includes(targetHeader) && !content.includes('FACILITIES_V20_PATH')) {
    content = content.replace(targetHeader, replHeader);
  }

  // In getSettlementPanoramaData, update exit targetTile to v20.entrance
  const targetExit = `        {
            type: 'city_gate',
            label: \`🏮 Gerbang \${anchor.name} (Keluar ke Peta Dunia)\`,
            targetTile: { x: anchor.x, y: anchor.y },
            description: \`Melangkah keluar melintasi gerbang utama pemukiman menuju koordinat [\${anchor.x}, \${anchor.y}] di peta alam liar.\`
        }`;

  const replExit = `        {
            type: 'city_gate',
            label: \`🏮 Gerbang \${anchor.name} (Keluar ke Peta Dunia)\`,
            targetTile: (anchor.v20 && anchor.v20.entrance) ? { x: anchor.v20.entrance.x, y: anchor.v20.entrance.y } : { x: anchor.x, y: anchor.y },
            description: \`Melangkah keluar melintasi gerbang utama pemukiman menuju koordinat [\${(anchor.v20 && anchor.v20.entrance) ? anchor.v20.entrance.x : anchor.x}, \${(anchor.v20 && anchor.v20.entrance) ? anchor.v20.entrance.y : anchor.y}] di peta alam liar.\`
        }`;

  if (content.includes(targetExit) && !content.includes('anchor.v20.entrance')) {
    content = content.replace(targetExit, replExit);
  }

  return content;
});

console.log('All P4 patches applied.');
