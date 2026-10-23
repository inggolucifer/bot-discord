const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { processLuminanceKey } = require('./assets/luminanceKey');
const { calculateTrimBounds } = require('./assets/trimPadding');

const uploadDir = 'C:/Users/User/.gemini/antigravity-ide/brain/820a74ec-a0f1-4b89-8c19-ae3daa271077/.user_uploaded';
const testDir = path.resolve(__dirname, '../review/test_cavities');

const BATCH4 = {
  road_inn: {
    file: 'media_1792740719838.jpg',
    allowInternalCavities: true,
    minCavitySize: 15,
    colorDistThreshold: 28
  },
  stone_torii: {
    file: 'media_1792740719905.jpg',
    allowInternalCavities: true, // Archways must be transparent!
    minCavitySize: 10,
    colorDistThreshold: 32
  },
  sect_gate: {
    file: 'media_1792740719951.jpg',
    allowInternalCavities: true, // Gateway opening must be transparent!
    minCavitySize: 10,
    colorDistThreshold: 32
  },
  pagoda_tower: {
    file: 'media_1792740719967.jpg',
    allowInternalCavities: false, // Tower body is solid
    minCavitySize: 100,
    colorDistThreshold: 26
  }
};

async function testAll() {
  for (const [key, cfg] of Object.entries(BATCH4)) {
    console.log(`Processing ${key} (${cfg.file})...`);
    const rawPath = path.join(uploadDir, cfg.file);
    const { data, info } = await sharp(rawPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

    const keyed = processLuminanceKey(data, info.width, info.height, {
      colorDistThreshold: cfg.colorDistThreshold,
      allowInternalCavities: cfg.allowInternalCavities,
      minCavitySize: cfg.minCavitySize,
      featherMargin: 18
    });

    const bounds = calculateTrimBounds(keyed, info.width, info.height, 10, 4);

    const trimmedPng = await sharp(keyed, { raw: { width: info.width, height: info.height, channels: 4 } })
      .extract({ left: bounds.minX, top: bounds.minY, width: bounds.width, height: bounds.height })
      .png()
      .toBuffer();

    const outPng = path.join(testDir, `batch4_${key}.png`);
    fs.writeFileSync(outPng, trimmedPng);

    // Composite over dark test ground
    const meta = await sharp(trimmedPng).metadata();
    await sharp({
      create: { width: meta.width, height: meta.height, channels: 4, background: { r: 24, g: 38, b: 28, alpha: 1 } }
    })
      .composite([{ input: trimmedPng, left: 0, top: 0 }])
      .png()
      .toFile(path.join(testDir, `preview_batch4_${key}.png`));

    console.log(`  -> Trimmed to ${bounds.width}x${bounds.height}, preview saved.`);
  }
}

testAll().catch(console.error);
