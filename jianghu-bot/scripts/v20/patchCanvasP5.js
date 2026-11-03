const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../../web-dashboard/src');

function patch(rel, fn) {
  const p = path.join(ROOT, rel);
  let c = fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
  const u = fn(c);
  if (c === u) {
    console.log(`[P5] ${rel}: No change needed or already patched.`);
  } else {
    fs.writeFileSync(p, u, 'utf8');
    console.log(`[P5] ${rel}: Successfully patched.`);
  }
}

// 1. proceduralObjects.ts fallback
patch('lib/proceduralObjects.ts', content => {
  const targetAtlas = `  const atlasName = getAtlasNameForDefId(defId);
  const drawn = atlasLoader.drawAtlasFrame(ctx, atlasName, defId, screenX, screenY, dw, dh, alpha, flipX);
  if (drawn) {
    return;
  }`;

  const replAtlas = `  const atlasName = getAtlasNameForDefId(defId);
  let drawn = atlasLoader.drawAtlasFrame(ctx, atlasName, defId, screenX, screenY, dw, dh, alpha, flipX);
  if (drawn) {
    return;
  }

  // V20: For settlement markers with frameDefId fallback
  if (!drawn && canon?.frameDefId) {
    const fallbackAtlas = getAtlasNameForDefId(canon.frameDefId);
    drawn = atlasLoader.drawAtlasFrame(ctx, fallbackAtlas, canon.frameDefId, screenX, screenY, dw, dh, alpha, flipX);
    if (drawn) return;
  }`;

  if (content.includes(targetAtlas) && !content.includes('// V20: For settlement markers with frameDefId fallback')) {
    content = content.replace(targetAtlas, replAtlas);
  }

  return content;
});

// 2. WorldCanvas.tsx settlement label plaque
patch('components/map/WorldCanvas.tsx', content => {
  const targetLabel = `          // Building Label
          const t = tileMap.get(\`\${instance.x},\${instance.y}\`) || chunkManager.getTile(instance.x, instance.y);
          if (t && t.buildingName && (camera.zoom >= 0.65 || t.isSettlementOrigin)) {
            const bLabel = t.buildingName;
            ctx.font = \`bold \${Math.max(7, 8.5 * camera.zoom)}px sans-serif\`;
            ctx.textAlign = 'center';
            const textW = ctx.measureText(bLabel).width;
            const pillW = textW + 8 * camera.zoom;
            const pillH = 11 * camera.zoom;
            const pillX = footX - pillW / 2;
            const pillY = footY + 4 * camera.zoom;

            ctx.fillStyle = 'rgba(10, 14, 23, 0.85)';
            ctx.fillRect(pillX, pillY, pillW, pillH);
            ctx.strokeStyle = '#D97706';
            ctx.lineWidth = 1;
            ctx.strokeRect(pillX, pillY, pillW, pillH);
            ctx.fillStyle = '#FEF08A';
            ctx.fillText(bLabel, pillX + pillW / 2, pillY + pillH - 2.5 * camera.zoom);
          }`;

  const replLabel = `          // Building & V20 Settlement Marker Label
          const t = tileMap.get(\`\${instance.x},\${instance.y}\`) || chunkManager.getTile(instance.x, instance.y);
          const isMarker = Boolean(instance.tags?.includes('settlement_marker') || t?.isSettlementOrigin);
          const labelText = isMarker ? (instance.customLabel || t?.settlementName || t?.buildingName) : (t?.buildingName);

          if (labelText && (camera.zoom >= 0.65 || isMarker)) {
            const bLabel = labelText;
            const fontSize = Math.max(isMarker ? 9 : 7, (isMarker ? 11 : 8.5) * camera.zoom);
            ctx.font = \`bold \${fontSize}px sans-serif\`;
            ctx.textAlign = 'center';
            const textW = ctx.measureText(bLabel).width;
            const pillW = textW + (isMarker ? 16 : 8) * camera.zoom;
            const pillH = (isMarker ? 16 : 11) * camera.zoom;
            const pillX = footX - pillW / 2;
            const pillY = footY + (isMarker ? 6 : 4) * camera.zoom;

            ctx.fillStyle = isMarker ? 'rgba(15, 10, 5, 0.92)' : 'rgba(10, 14, 23, 0.85)';
            ctx.fillRect(pillX, pillY, pillW, pillH);
            ctx.strokeStyle = isMarker ? '#C5A880' : '#D97706';
            ctx.lineWidth = isMarker ? 1.5 : 1;
            ctx.strokeRect(pillX, pillY, pillW, pillH);
            ctx.fillStyle = isMarker ? '#F5E6C8' : '#FEF08A';
            ctx.fillText(bLabel, pillX + pillW / 2, pillY + pillH - (isMarker ? 4 : 2.5) * camera.zoom);
          }`;

  if (content.includes(targetLabel) && !content.includes('// Building & V20 Settlement Marker Label')) {
    content = content.replace(targetLabel, replLabel);
  }

  return content;
});

console.log('Canvas P5 patches finished.');
