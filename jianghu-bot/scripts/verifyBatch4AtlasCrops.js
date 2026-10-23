const sharp = require('sharp');
const path = require('path');
const atlasDir = path.resolve('web-dashboard/public/assets/atlas');
const reviewDir = path.resolve('review');

async function verifyBuildings() {
  // 1. core_1: sect_gate_3x2 at [14, 4, 483, 380] and stone_torii_1x1 at [2, 848, 188, 182]
  const sectGateBuf = await sharp(path.join(atlasDir, 'core_1.webp'))
    .extract({ left: 14, top: 4, width: 483, height: 380 })
    .png()
    .toBuffer();
  await sharp({
    create: { width: 483, height: 380, channels: 4, background: { r: 24, g: 38, b: 28, alpha: 1 } }
  })
    .composite([{ input: sectGateBuf, left: 0, top: 0 }])
    .png()
    .toFile(path.join(reviewDir, 'preview_core1_sect_gate.png'));

  const stoneToriiBuf = await sharp(path.join(atlasDir, 'core_1.webp'))
    .extract({ left: 2, top: 848, width: 188, height: 182 })
    .png()
    .toBuffer();
  await sharp({
    create: { width: 188, height: 182, channels: 4, background: { r: 24, g: 38, b: 28, alpha: 1 } }
  })
    .composite([{ input: stoneToriiBuf, left: 0, top: 0 }])
    .png()
    .toFile(path.join(reviewDir, 'preview_core1_stone_torii.png'));

  // 2. settlement_2: building_inn_roadside at [1373, 776, 437, 380]
  const roadInnBuf = await sharp(path.join(atlasDir, 'settlement_2.webp'))
    .extract({ left: 1373, top: 776, width: 437, height: 380 })
    .png()
    .toBuffer();
  await sharp({
    create: { width: 437, height: 380, channels: 4, background: { r: 24, g: 38, b: 28, alpha: 1 } }
  })
    .composite([{ input: roadInnBuf, left: 0, top: 0 }])
    .png()
    .toFile(path.join(reviewDir, 'preview_settlement2_road_inn.png'));

  // 3. core_0: pagoda_2x2 at [1557, 1290, 182, 380]
  const pagodaBuf = await sharp(path.join(atlasDir, 'core_0.webp'))
    .extract({ left: 1557, top: 1290, width: 182, height: 380 })
    .png()
    .toBuffer();
  await sharp({
    create: { width: 182, height: 380, channels: 4, background: { r: 24, g: 38, b: 28, alpha: 1 } }
  })
    .composite([{ input: pagodaBuf, left: 0, top: 0 }])
    .png()
    .toFile(path.join(reviewDir, 'preview_core0_pagoda.png'));

  console.log('All building review crops generated!');
}

verifyBuildings().catch(console.error);
