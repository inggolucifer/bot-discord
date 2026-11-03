const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../../utils/proceduralWorldEngine.js');
let content = fs.readFileSync(filePath, 'utf8');

// Normalize to LF for matching
content = content.replace(/\r\n/g, '\n');

// 1. ANCHOR_SETTLEMENTS mapping
const targetAnchorMap = `  activeEventCount: a.activeEventCount || 0\n}));`;
const replAnchorMap = `  activeEventCount: a.activeEventCount || 0,\n  v20: a.v20\n}));`;

if (content.includes(targetAnchorMap)) {
  content = content.replace(targetAnchorMap, replAnchorMap);
  console.log('1. Updated ANCHOR_SETTLEMENTS mapping');
} else {
  console.log('1. ANCHOR_SETTLEMENTS mapping already updated or not found');
}

// 2. getTileAt settlement logic
const oldSettlementBlock = `  if (isSettlementTile) {
    const sX = settlementInfo.tileX !== undefined ? settlementInfo.tileX : settlementInfo.x;
    const sY = settlementInfo.tileY !== undefined ? settlementInfo.tileY : settlementInfo.y;
    const isOrigin = tileX === sX && tileY === sY;
    const isDanger = settlementInfo.type === 'danger_zone';

    return {
      tileX,
      tileY,
      terrainType: isDanger ? 'swamp' : 'settlement',
      tileType: settlementInfo.type === 'scenic_courtyard' ? 'poi' : 'settlement',
      isSolid: false,
      settlementName: settlementInfo.name,
      chineseName: settlementInfo.chineseName,
      isSettlementOrigin: isOrigin,
      settlementData: isOrigin ? settlementInfo : null,
      label: isOrigin ? settlementInfo.name : null,
      baseTemperature: 22,
      spiritualQiDensity: (settlementInfo.type === 'sect' ? 50 : 25) * (region.qiDensityModifier || 1.0),
      ambientDangerTier: isDanger ? 4 : (settlementInfo.tier || 1),
      regionId: region.id,
      regionName: region.name,
      territoryType: isDanger ? 'danger_zone' : (settlementInfo.type === 'sect' ? 'sect_territory' : 'settlement'),
      dangerTier: isDanger ? 4 : (settlementInfo.tier || 1),
      ambushRiskRate: isDanger ? 0.3 : 0,
      factionName: settlementInfo.type === 'sect' ? settlementInfo.name : null,
      staminaCost: getTerrainStaminaCost('settlement')
    };
  }`;

const newSettlementBlock = `  if (isSettlementTile) {
    const sX = settlementInfo.tileX !== undefined ? settlementInfo.tileX : settlementInfo.x;
    const sY = settlementInfo.tileY !== undefined ? settlementInfo.tileY : settlementInfo.y;
    const isOrigin = tileX === sX && tileY === sY;
    const isDanger = settlementInfo.type === 'danger_zone';

    // V20: Forecourt & entrance logic
    // Bottom row (y === sY + spanHeight - 1) is forecourt (walkable)
    // Upper rows (y < sY + spanHeight - 1) are solid (collision marker)
    const spanH = settlementInfo.spanHeight || 2;
    const isForecourt = spanH > 1 ? (tileY === sY + spanH - 1) : true;
    const isSolid = !isForecourt;

    // Entrance tile coordinate
    const entX = settlementInfo.v20?.entrance?.x ?? (sX + Math.floor(settlementInfo.spanWidth / 2));
    const entY = settlementInfo.v20?.entrance?.y ?? (sY + spanH - 1);
    const isEntrance = (tileX === entX && tileY === entY);

    return {
      tileX,
      tileY,
      terrainType: isDanger ? 'swamp' : 'settlement',
      tileType: settlementInfo.type === 'scenic_courtyard' ? 'poi' : 'settlement',
      isSolid,
      isSettlementEntrance: isEntrance,
      settlementName: settlementInfo.name,
      chineseName: settlementInfo.chineseName,
      isSettlementOrigin: isOrigin,
      settlementData: (isOrigin || isEntrance) ? settlementInfo : null,
      label: isOrigin ? settlementInfo.name : null,
      baseTemperature: 22,
      spiritualQiDensity: (settlementInfo.type === 'sect' ? 50 : 25) * (region.qiDensityModifier || 1.0),
      ambientDangerTier: isDanger ? 4 : (settlementInfo.tier || 1),
      regionId: region.id,
      regionName: region.name,
      territoryType: isDanger ? 'danger_zone' : (settlementInfo.type === 'sect' ? 'sect_territory' : 'settlement'),
      dangerTier: isDanger ? 4 : (settlementInfo.tier || 1),
      ambushRiskRate: isDanger ? 0.3 : 0,
      factionName: settlementInfo.type === 'sect' ? settlementInfo.name : null,
      staminaCost: getTerrainStaminaCost('settlement')
    };
  }`;

if (content.includes(oldSettlementBlock)) {
  content = content.replace(oldSettlementBlock, newSettlementBlock);
  console.log('2. Updated getTileAt settlement logic');
} else {
  console.error('2. oldSettlementBlock not found!');
  process.exit(1);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Saved updated proceduralWorldEngine.js');
