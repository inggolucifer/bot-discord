/**
 * ASSET PIPELINE: REAL ASSET IMAGE GENERATOR (scripts/assets/generateImages.js)
 * Generates authentic Song Dynasty / Wuxia Xieyi (Shuimo) game assets
 * strictly replicating the art style of reference media (media_1791531947793.jpg):
 * - Slate-blue and jade bamboo clumps with delicate segmented stalks and drooping leaf cascades.
 * - Soft ethereal foot mist (fogFoot) pooling at the base and feathering into xuan paper.
 * - Rounded ink-wash boulders and rocks nestled at the roots.
 * - Karst pillars and mountain ridges with layered vertical brushwork.
 * - Traditional Jiangnan curved eaves, timber pavilions, and sect gates.
 * - Authentic dry-brush splatter monster ink rings.
 * - Meandering cyan-slate river autotiles with sandy ochre banks.
 */

const { SHUIMO_PALETTE } = require('./normalizePalette');

/**
 * Generates SVG markup for a bamboo clump sprite matching the reference image.
 */
function generateBambooSvg(id, width, height, cw, ch, tone = 'mist', density = 'dense', seed = 1) {
  // Palette resolution based on tone
  let leafColor1, leafColor2, stalkColor, stalkDark;
  if (tone === 'jade') {
    leafColor1 = '#3D6B50';
    leafColor2 = '#274A36';
    stalkColor = '#2F523E';
    stalkDark = '#1B3326';
  } else if (tone === 'dark') {
    leafColor1 = '#2A4238';
    leafColor2 = '#1A2E26';
    stalkColor = '#20332A';
    stalkDark = '#121E19';
  } else { // 'mist' (slate-blue matching the user screenshot)
    leafColor1 = '#4A6B6B';
    leafColor2 = '#365252';
    stalkColor = '#3A5454';
    stalkDark = '#233636';
  }

  const numStalks = density === 'dense' ? (cw === 1 ? 5 : 9) : (cw === 1 ? 3 : 6);
  const footY = height * 0.92;
  const stalks = [];
  const leaves = [];
  const rocks = [];

  // Deterministic pseudo-random helper
  let s = (seed * 9301 + 49297) % 233280;
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };

  // Base rocks (like in the screenshot at the foot of bamboo)
  const numRocks = cw * 2 + 1;
  for (let r = 0; r < numRocks; r++) {
    const rx = width * 0.15 + (r / numRocks) * (width * 0.7) + (rnd() - 0.5) * 15;
    const ry = footY - 8 + rnd() * 10;
    const rradX = 10 + rnd() * 12;
    const rradY = 6 + rnd() * 6;
    rocks.push(`
      <ellipse cx="${rx.toFixed(1)}" cy="${ry.toFixed(1)}" rx="${rradX.toFixed(1)}" ry="${rradY.toFixed(1)}"
        fill="#556868" stroke="#253535" stroke-width="1.8" opacity="0.85" />
      <ellipse cx="${(rx - 2).toFixed(1)}" cy="${(ry - 2).toFixed(1)}" rx="${(rradX * 0.6).toFixed(1)}" ry="${(rradY * 0.5).toFixed(1)}"
        fill="#778C8C" opacity="0.4" />
    `);
  }

  // Bamboo stalks
  for (let i = 0; i < numStalks; i++) {
    const stalkBaseX = width * 0.2 + (i / Math.max(1, numStalks - 1)) * (width * 0.6) + (rnd() - 0.5) * 12;
    const stalkTopX = stalkBaseX + (rnd() - 0.5) * 24;
    const stalkTopY = height * 0.08 + rnd() * (height * 0.15);
    const stalkThick = 2.2 + rnd() * 1.5;

    // Curved stalk line
    const cpx = (stalkBaseX + stalkTopX) / 2 + (rnd() - 0.5) * 14;
    const cpy = (footY + stalkTopY) / 2;

    stalks.push(`
      <path d="M ${stalkBaseX.toFixed(1)} ${footY.toFixed(1)} Q ${cpx.toFixed(1)} ${cpy.toFixed(1)} ${stalkTopX.toFixed(1)} ${stalkTopY.toFixed(1)}"
        stroke="${stalkColor}" stroke-width="${stalkThick.toFixed(1)}" stroke-linecap="round" fill="none" />
    `);

    // Stalk joint nodes (horizontal ink ticks)
    const numNodes = 6 + Math.floor(rnd() * 3);
    for (let n = 1; n < numNodes; n++) {
      const t = n / numNodes;
      const nx = (1 - t) * (1 - t) * stalkBaseX + 2 * (1 - t) * t * cpx + t * t * stalkTopX;
      const ny = (1 - t) * (1 - t) * footY + 2 * (1 - t) * t * cpy + t * t * stalkTopY;
      stalks.push(`
        <ellipse cx="${nx.toFixed(1)}" cy="${ny.toFixed(1)}" rx="${(stalkThick * 1.2).toFixed(1)}" ry="1.2"
          fill="${stalkDark}" />
      `);

      // Drooping lanceolate bamboo leaves around each node
      const numLeavesAtNode = 3 + Math.floor(rnd() * 3);
      for (let l = 0; l < numLeavesAtNode; l++) {
        const leafAngle = (rnd() > 0.5 ? 1 : -1) * (20 + rnd() * 45) * (Math.PI / 180);
        const leafLen = 14 + rnd() * 18;
        const lx1 = nx + Math.sin(leafAngle) * leafLen * 0.5;
        const ly1 = ny + Math.cos(leafAngle) * leafLen * 0.5;
        const lx2 = nx + Math.sin(leafAngle) * leafLen;
        const ly2 = ny + Math.cos(leafAngle) * leafLen + 6; // Droop downward

        leaves.push(`
          <path d="M ${nx.toFixed(1)} ${ny.toFixed(1)} Q ${lx1.toFixed(1)} ${ly1.toFixed(1)} ${lx2.toFixed(1)} ${ly2.toFixed(1)} Q ${(lx1 - 3).toFixed(1)} ${(ly1 + 2).toFixed(1)} ${nx.toFixed(1)} ${ny.toFixed(1)}"
            fill="${rnd() > 0.35 ? leafColor1 : leafColor2}" opacity="${(0.75 + rnd() * 0.22).toFixed(2)}" />
        `);
      }
    }
  }

  // Soft Foot Mist Gradient pooling at bottom
  const mistGradient = `
    <defs>
      <linearGradient id="mist_${id}" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#F4F0E8" stop-opacity="0" />
        <stop offset="40%" stop-color="#F4F0E8" stop-opacity="0.35" />
        <stop offset="75%" stop-color="#EFEAD9" stop-opacity="0.75" />
        <stop offset="100%" stop-color="#F4F0E8" stop-opacity="0" />
      </linearGradient>
    </defs>
    <rect x="0" y="${(height * 0.72).toFixed(1)}" width="${width}" height="${(height * 0.28).toFixed(1)}"
      fill="url(#mist_${id})" />
  `;

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      ${mistGradient}
      <g id="rocks">${rocks.join('')}</g>
      <g id="stalks">${stalks.join('')}</g>
      <g id="leaves">${leaves.join('')}</g>
    </svg>
  `;
}

/**
 * Generates SVG markup for ancient pine, willow, and peach trees.
 */
function generateTreeSvg(id, width, height, cw, ch, species = 'pine', seed = 1) {
  let s = (seed * 8753 + 2459) % 233280;
  const rnd = () => { s = (s * 8753 + 2459) % 233280; return s / 233280; };

  const footX = width * 0.5;
  const footY = height * 0.92;
  const foliage = [];
  const mistDefs = `
    <defs>
      <linearGradient id="mist_${id}" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#F4F0E8" stop-opacity="0" />
        <stop offset="60%" stop-color="#F4F0E8" stop-opacity="0.55" />
        <stop offset="100%" stop-color="#F4F0E8" stop-opacity="0" />
      </linearGradient>
    </defs>
  `;

  // Trunk drawing with calligraphic organic curve
  const trunkTopX = footX + (rnd() - 0.5) * 35;
  const trunkTopY = height * 0.35 + rnd() * (height * 0.1);
  const trunkCtrlX = footX + (rnd() - 0.5) * 40;
  const trunkCtrlY = (footY + trunkTopY) * 0.5;

  const trunkPath = `
    <path d="M ${(footX - 10).toFixed(1)} ${footY.toFixed(1)}
             Q ${trunkCtrlX.toFixed(1)} ${trunkCtrlY.toFixed(1)} ${(trunkTopX - 4).toFixed(1)} ${trunkTopY.toFixed(1)}
             L ${(trunkTopX + 4).toFixed(1)} ${trunkTopY.toFixed(1)}
             Q ${(trunkCtrlX + 8).toFixed(1)} ${trunkCtrlY.toFixed(1)} ${(footX + 10).toFixed(1)} ${footY.toFixed(1)} Z"
          fill="#242B28" stroke="#161B19" stroke-width="1.5" />
  `;

  if (species.includes('pine')) {
    // Ancient pine: horizontal tiered needle fan clouds
    const numTiers = 5;
    for (let t = 0; t < numTiers; t++) {
      const ratio = t / (numTiers - 1);
      const ty = trunkTopY - 15 + ratio * (height * 0.35);
      const tx = footX + (rnd() - 0.5) * (width * 0.3);
      const tierW = (width * 0.35) * (0.8 + rnd() * 0.4);
      const tierH = 18 + rnd() * 12;

      foliage.push(`
        <ellipse cx="${tx.toFixed(1)}" cy="${ty.toFixed(1)}" rx="${tierW.toFixed(1)}" ry="${tierH.toFixed(1)}"
          fill="#2C483D" opacity="0.88" />
        <ellipse cx="${(tx - 4).toFixed(1)}" cy="${(ty - 3).toFixed(1)}" rx="${(tierW * 0.8).toFixed(1)}" ry="${(tierH * 0.7).toFixed(1)}"
          fill="#3F6354" opacity="0.75" />
      `);
    }
  } else if (species.includes('willow')) {
    // Weeping willow: draping strands
    for (let w = 0; w < 16; w++) {
      const wx = width * 0.2 + (w / 15) * (width * 0.6);
      const wy = trunkTopY - 10 + rnd() * 20;
      const strandH = 45 + rnd() * 50;
      foliage.push(`
        <path d="M ${wx.toFixed(1)} ${wy.toFixed(1)} Q ${(wx + (rnd() - 0.5) * 15).toFixed(1)} ${(wy + strandH * 0.5).toFixed(1)} ${(wx + (rnd() - 0.5) * 10).toFixed(1)} ${(wy + strandH).toFixed(1)}"
          stroke="#4D7860" stroke-width="1.8" fill="none" opacity="0.82" stroke-linecap="round" />
      `);
    }
  } else if (species.includes('spirit') || species.includes('peach')) {
    // Spirit peach: radiant pink/white cloud clumps
    for (let c = 0; c < 8; c++) {
      const cx = width * 0.25 + rnd() * (width * 0.5);
      const cy = height * 0.2 + rnd() * (height * 0.35);
      foliage.push(`
        <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(18 + rnd() * 16).toFixed(1)}"
          fill="#F5D0D5" opacity="0.85" />
        <circle cx="${(cx + 2).toFixed(1)}" cy="${(cy + 2).toFixed(1)}" r="${(12 + rnd() * 10).toFixed(1)}"
          fill="#E8A7B2" opacity="0.7" />
      `);
    }
  } else {
    // Generic forest tree / frost cypress
    for (let c = 0; c < 6; c++) {
      const cx = width * 0.3 + rnd() * (width * 0.4);
      const cy = height * 0.25 + rnd() * (height * 0.3);
      foliage.push(`
        <ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${(22 + rnd() * 18).toFixed(1)}" ry="${(15 + rnd() * 12).toFixed(1)}"
          fill="#3E5C50" opacity="0.85" />
      `);
    }
  }

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      ${mistDefs}
      ${trunkPath}
      <g id="foliage">${foliage.join('')}</g>
      <rect x="0" y="${(height * 0.78).toFixed(1)}" width="${width}" height="${(height * 0.22).toFixed(1)}"
        fill="url(#mist_${id})" />
    </svg>
  `;
}

/**
 * Generates SVG markup for karst rock pillars and mountain peaks.
 */
function generateMountainSvg(id, width, height, cw, ch, isPillar = false, seed = 1) {
  let s = (seed * 6271 + 1193) % 233280;
  const rnd = () => { s = (s * 6271 + 1193) % 233280; return s / 233280; };

  const footY = height * 0.94;
  const mistDefs = `
    <defs>
      <linearGradient id="mt_grad_${id}" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#344342" />
        <stop offset="45%" stop-color="#4F6464" />
        <stop offset="100%" stop-color="#2D3B3A" />
      </linearGradient>
      <linearGradient id="mist_${id}" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#F4F0E8" stop-opacity="0" />
        <stop offset="60%" stop-color="#F4F0E8" stop-opacity="0.65" />
        <stop offset="100%" stop-color="#F4F0E8" stop-opacity="0" />
      </linearGradient>
    </defs>
  `;

  let bodyPath = '';
  if (isPillar) {
    // Tall karst limestone pillar
    const topY = height * 0.12;
    const topW = width * 0.45;
    const baseW = width * 0.65;
    bodyPath = `
      <polygon points="${(width/2 - topW/2).toFixed(1)},${topY.toFixed(1)} ${(width/2 + topW/2).toFixed(1)},${topY.toFixed(1)} ${(width/2 + baseW/2).toFixed(1)},${footY.toFixed(1)} ${(width/2 - baseW/2).toFixed(1)},${footY.toFixed(1)}"
        fill="url(#mt_grad_${id})" stroke="#1E2827" stroke-width="2.2" />
      <line x1="${(width/2 - topW/6).toFixed(1)}" y1="${topY.toFixed(1)}" x2="${(width/2 - topW/6).toFixed(1)}" y2="${footY.toFixed(1)}"
        stroke="#1E2827" stroke-width="1.8" opacity="0.65" />
      <line x1="${(width/2 + topW/5).toFixed(1)}" y1="${topY.toFixed(1)}" x2="${(width/2 + topW/5).toFixed(1)}" y2="${footY.toFixed(1)}"
        stroke="#6C8585" stroke-width="1.5" opacity="0.5" />
    `;
  } else {
    // Layered mountain ridge / crag
    const peakX = width * 0.5 + (rnd() - 0.5) * 30;
    const peakY = height * 0.15;
    bodyPath = `
      <polygon points="${peakX.toFixed(1)},${peakY.toFixed(1)} ${(width * 0.9).toFixed(1)},${footY.toFixed(1)} ${(width * 0.1).toFixed(1)},${footY.toFixed(1)}"
        fill="url(#mt_grad_${id})" stroke="#1E2827" stroke-width="2.5" />
      <path d="M ${peakX.toFixed(1)} ${peakY.toFixed(1)} Q ${(peakX - 10).toFixed(1)} ${(height * 0.5).toFixed(1)} ${(width * 0.45).toFixed(1)} ${footY.toFixed(1)}"
        stroke="#1E2827" stroke-width="2.0" fill="none" opacity="0.8" />
      <polygon points="${peakX.toFixed(1)},${peakY.toFixed(1)} ${(width * 0.45).toFixed(1)},${footY.toFixed(1)} ${(width * 0.1).toFixed(1)},${footY.toFixed(1)}"
        fill="#263433" opacity="0.45" />
    `;
  }

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      ${mistDefs}
      ${bodyPath}
      <rect x="0" y="${(height * 0.75).toFixed(1)}" width="${width}" height="${(height * 0.25).toFixed(1)}"
        fill="url(#mist_${id})" />
    </svg>
  `;
}

/**
 * Generates SVG markup for Wuxia structures (farm huts, pavilions, sect gates, pagodas).
 */
function generateBuildingSvg(id, width, height, cw, ch, type = 'hut', seed = 1) {
  const footY = height * 0.92;
  const wallW = width * 0.75;
  const wallH = height * 0.45;
  const wallX = (width - wallW) / 2;
  const wallY = footY - wallH;

  const roofY = wallY;
  const eaveOverhang = width * 0.15;

  let details = '';
  if (type.includes('sect') || type.includes('gate')) {
    // Imperial / Sect gate with majestic curved roof and vermilion columns
    details = `
      <!-- Stone foundation -->
      <rect x="${(wallX - 8).toFixed(1)}" y="${(footY - 12).toFixed(1)}" width="${(wallW + 16).toFixed(1)}" height="12" fill="#4B5654" stroke="#252F2D" stroke-width="1.8" />
      <!-- Gate archway opening -->
      <path d="M ${(wallX + wallW * 0.3).toFixed(1)} ${footY.toFixed(1)} L ${(wallX + wallW * 0.3).toFixed(1)} ${(wallY + wallH * 0.35).toFixed(1)} Q ${(width / 2).toFixed(1)} ${(wallY + wallH * 0.15).toFixed(1)} ${(wallX + wallW * 0.7).toFixed(1)} ${(wallY + wallH * 0.35).toFixed(1)} L ${(wallX + wallW * 0.7).toFixed(1)} ${footY.toFixed(1)} Z"
        fill="#141A19" stroke="#9B3A2E" stroke-width="2.0" />
      <!-- Red Columns -->
      <rect x="${(wallX + 4).toFixed(1)}" y="${wallY.toFixed(1)}" width="10" height="${wallH.toFixed(1)}" fill="#9B3A2E" />
      <rect x="${(wallX + wallW - 14).toFixed(1)}" y="${wallY.toFixed(1)}" width="10" height="${wallH.toFixed(1)}" fill="#9B3A2E" />
      <!-- Sweeping upturned roof -->
      <path d="M ${(wallX - eaveOverhang).toFixed(1)} ${(roofY + 8).toFixed(1)} Q ${(width / 2).toFixed(1)} ${(roofY - 24).toFixed(1)} ${(wallX + wallW + eaveOverhang).toFixed(1)} ${(roofY + 8).toFixed(1)} L ${(wallX + wallW + eaveOverhang - 8).toFixed(1)} ${roofY.toFixed(1)} Q ${(width / 2).toFixed(1)} ${(roofY - 32).toFixed(1)} ${(wallX - eaveOverhang + 8).toFixed(1)} ${roofY.toFixed(1)} Z"
        fill="#2A3533" stroke="#161F1E" stroke-width="2.2" />
      <!-- Golden Plaque -->
      <rect x="${(width / 2 - 16).toFixed(1)}" y="${(roofY - 14).toFixed(1)}" width="32" height="12" fill="#D97706" stroke="#92400E" stroke-width="1.2" />
    `;
  } else if (type.includes('pavilion')) {
    // Open tea pavilion with lanterns
    details = `
      <rect x="${(wallX - 4).toFixed(1)}" y="${(footY - 8).toFixed(1)}" width="${(wallW + 8).toFixed(1)}" height="8" fill="#586361" />
      <line x1="${(wallX + 8).toFixed(1)}" y1="${wallY.toFixed(1)}" x2="${(wallX + 8).toFixed(1)}" y2="${footY.toFixed(1)}" stroke="#3D291D" stroke-width="4" />
      <line x1="${(wallX + wallW - 8).toFixed(1)}" y1="${wallY.toFixed(1)}" x2="${(wallX + wallW - 8).toFixed(1)}" y2="${footY.toFixed(1)}" stroke="#3D291D" stroke-width="4" />
      <path d="M ${(wallX - eaveOverhang).toFixed(1)} ${(roofY + 5).toFixed(1)} Q ${(width / 2).toFixed(1)} ${(roofY - 20).toFixed(1)} ${(wallX + wallW + eaveOverhang).toFixed(1)} ${(roofY + 5).toFixed(1)} L ${(width / 2).toFixed(1)} ${(roofY - 26).toFixed(1)} Z"
        fill="#2B3635" stroke="#182120" stroke-width="1.8" />
      <!-- Hanging Lantern -->
      <circle cx="${(width / 2).toFixed(1)}" cy="${(wallY + 12).toFixed(1)}" r="6" fill="#F59E0B" />
    `;
  } else {
    // Thatched rustic farmer's cottage
    details = `
      <rect x="${wallX.toFixed(1)}" y="${wallY.toFixed(1)}" width="${wallW.toFixed(1)}" height="${wallH.toFixed(1)}" fill="#E5DFCE" stroke="#3D2E24" stroke-width="1.8" />
      <rect x="${(wallX + wallW * 0.4).toFixed(1)}" y="${(wallY + wallH * 0.4).toFixed(1)}" width="${(wallW * 0.2).toFixed(1)}" height="${(wallH * 0.6).toFixed(1)}" fill="#4A3B2C" />
      <!-- Thatched roof -->
      <polygon points="${(wallX - 12).toFixed(1)},${(roofY + 4).toFixed(1)} ${(width / 2).toFixed(1)},${(roofY - 22).toFixed(1)} ${(wallX + wallW + 12).toFixed(1)},${(roofY + 4).toFixed(1)}"
        fill="#826F52" stroke="#4A3E2D" stroke-width="2.0" />
    `;
  }

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      ${details}
    </svg>
  `;
}

/**
 * Generates SVG markup for authentic Xieyi dry-brush monster rings.
 */
function generateMonsterRingSvg(id, width, height, tier = 1, isBoss = false) {
  const cx = width / 2;
  const cy = height / 2;
  const r = width * 0.38;

  let strokeColor = '#1A2322';
  let glowColor = 'rgba(74, 107, 107, 0.4)';
  if (tier === 2) { strokeColor = '#0D9488'; glowColor = 'rgba(13, 148, 136, 0.4)'; }
  else if (tier === 3) { strokeColor = '#D97706'; glowColor = 'rgba(217, 119, 6, 0.4)'; }
  else if (tier === 4) { strokeColor = '#DC2626'; glowColor = 'rgba(220, 38, 38, 0.5)'; }
  else if (tier >= 5 || isBoss) { strokeColor = '#9333EA'; glowColor = 'rgba(147, 51, 234, 0.6)'; }

  // Calligraphic circle with broken dry-brush feibai gaps
  const circle1 = `
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${strokeColor}" stroke-width="4.5"
      stroke-dasharray="${(r * 1.5).toFixed(1)} ${(r * 0.4).toFixed(1)} ${(r * 2.2).toFixed(1)} ${(r * 0.6).toFixed(1)}"
      stroke-linecap="round" opacity="0.88" />
    <circle cx="${cx}" cy="${cy}" r="${(r - 4).toFixed(1)}" fill="none" stroke="${strokeColor}" stroke-width="2.0"
      stroke-dasharray="25 15 40 20" opacity="0.65" />
    <circle cx="${cx}" cy="${cy}" r="${(r * 0.7).toFixed(1)}" fill="${glowColor}" />
  `;

  const bossSpikes = isBoss ? `
    <polygon points="${cx},${cy - r - 12} ${cx + 8},${cy - r + 4} ${cx - 8},${cy - r + 4}" fill="#DC2626" />
    <polygon points="${cx},${cy + r + 12} ${cx + 8},${cy + r - 4} ${cx - 8},${cy + r - 4}" fill="#DC2626" />
    <polygon points="${cx - r - 12},${cy} ${cx - r + 4},${cy + 8} ${cx - r + 4},${cy - 8}" fill="#DC2626" />
    <polygon points="${cx + r + 12},${cy} ${cx + r - 4},${cy + 8} ${cx + r - 4},${cy - 8}" fill="#DC2626" />
  ` : '';

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      ${circle1}
      ${bossSpikes}
    </svg>
  `;
}

/**
 * Generates SVG markup for 16-bitmask river autotiles matching the reference image.
 * Reference: soft pale cyan-slate water wash with sandy ochre banks.
 */
function generateRiverAutotileSvg(id, width, height, bitmask) {
  const n = Boolean(bitmask & 1);
  const e = Boolean(bitmask & 2);
  const s = Boolean(bitmask & 4);
  const w = Boolean(bitmask & 8);

  const waterColor = '#8EA8AE';
  const waterDeep = '#718D94';
  const sandBank = '#C2B199';

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <!-- Sandy bank base -->
      <rect x="0" y="0" width="${width}" height="${height}" fill="${sandBank}" opacity="0.65" />
      <!-- Water flow stream center -->
      <circle cx="${width / 2}" cy="${height / 2}" r="${width * 0.32}" fill="${waterColor}" />
      ${n ? `<rect x="${width * 0.2}" y="0" width="${width * 0.6}" height="${height * 0.55}" fill="${waterColor}" />` : ''}
      ${s ? `<rect x="${width * 0.2}" y="${height * 0.45}" width="${width * 0.6}" height="${height * 0.55}" fill="${waterColor}" />` : ''}
      ${w ? `<rect x="0" y="${height * 0.2}" width="${width * 0.55}" height="${height * 0.6}" fill="${waterColor}" />` : ''}
      ${e ? `<rect x="${width * 0.45}" y="${height * 0.2}" width="${width * 0.55}" height="${height * 0.6}" fill="${waterColor}" />` : ''}
      <!-- Internal gentle water wave ripple -->
      <ellipse cx="${width * 0.5}" cy="${height * 0.5}" rx="${width * 0.2}" ry="${height * 0.08}" fill="${waterDeep}" opacity="0.4" />
    </svg>
  `;
}

/**
 * Generates SVG markup for 16-bitmask road autotiles.
 */
function generateRoadAutotileSvg(id, width, height, bitmask) {
  const n = Boolean(bitmask & 1);
  const e = Boolean(bitmask & 2);
  const s = Boolean(bitmask & 4);
  const w = Boolean(bitmask & 8);
  const pathColor = '#C8BEA8';

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <circle cx="${width / 2}" cy="${height / 2}" r="${width * 0.22}" fill="${pathColor}" opacity="0.85" />
      ${n ? `<rect x="${width * 0.3}" y="0" width="${width * 0.4}" height="${height * 0.55}" fill="${pathColor}" opacity="0.85" />` : ''}
      ${s ? `<rect x="${width * 0.3}" y="${height * 0.45}" width="${width * 0.4}" height="${height * 0.55}" fill="${pathColor}" opacity="0.85" />` : ''}
      ${w ? `<rect x="0" y="${height * 0.3}" width="${width * 0.55}" height="${height * 0.4}" fill="${pathColor}" opacity="0.85" />` : ''}
      ${e ? `<rect x="${width * 0.45}" y="${height * 0.3}" width="${width * 0.55}" height="${height * 0.4}" fill="${pathColor}" opacity="0.85" />` : ''}
    </svg>
  `;
}

/**
 * Master dispatcher to generate the appropriate SVG string for any asset in the catalog.
 */
function generateAssetSvg(asset) {
  const { id, category, width, height, cw, ch } = asset;

  if (category === 'bamboo') {
    const tone = id.includes('jade') ? 'jade' : id.includes('dark') ? 'dark' : 'mist';
    const density = id.includes('sparse') ? 'sparse' : 'dense';
    return generateBambooSvg(id, width, height, cw, ch, tone, density);
  }

  if (category === 'tree') {
    const species = id.includes('pine') ? 'pine' : id.includes('willow') ? 'willow' : id.includes('peach') ? 'spirit' : 'cypress';
    return generateTreeSvg(id, width, height, cw, ch, species);
  }

  if (category === 'rock') {
    return generateMountainSvg(id, width, height, cw, ch, false);
  }

  if (category === 'mountain') {
    const isPillar = id.includes('pillar');
    return generateMountainSvg(id, width, height, cw, ch, isPillar);
  }

  if (category === 'building') {
    const bType = id.includes('sect') ? 'sect' : id.includes('pavilion') ? 'pavilion' : 'hut';
    return generateBuildingSvg(id, width, height, cw, ch, bType);
  }

  if (category === 'marker') {
    let tier = 1;
    if (id.includes('tier2')) tier = 2;
    else if (id.includes('tier3')) tier = 3;
    else if (id.includes('tier4')) tier = 4;
    else if (id.includes('tier5')) tier = 5;
    const isBoss = id.includes('boss');
    return generateMonsterRingSvg(id, width, height, tier, isBoss);
  }

  if (category === 'autotile') {
    const hex = id.slice(-2);
    const bitmask = parseInt(hex, 16) || 0;
    if (id.includes('river')) return generateRiverAutotileSvg(id, width, height, bitmask);
    return generateRoadAutotileSvg(id, width, height, bitmask);
  }

  // Fallback
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <rect width="${width}" height="${height}" fill="#4A6B6B" opacity="0.5" />
    </svg>
  `;
}

module.exports = {
  generateAssetSvg,
  generateBambooSvg,
  generateTreeSvg,
  generateMountainSvg,
  generateBuildingSvg,
  generateMonsterRingSvg,
  generateRiverAutotileSvg,
  generateRoadAutotileSvg
};
