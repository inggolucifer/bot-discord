const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { processLuminanceKey } = require('./assets/luminanceKey');
const { calculateTrimBounds } = require('./assets/trimPadding');

const uploadDir = 'C:/Users/User/.gemini/antigravity-ide/brain/820a74ec-a0f1-4b89-8c19-ae3daa271077/.user_uploaded';
const testDir = path.resolve(__dirname, '../review/test_cavities');

const BATCH3 = {
  bamboo: {
    file: 'media_1792738883104.jpg',
    allowInternalCavities: true,
    minCavitySize: 15,
    colorDistThreshold: 28
  },
  rock_cleft: {
    file: 'media_1792738883589.jpg',
    allowInternalCavities: true,
    minCavitySize: 20,
    colorDistThreshold: 26
  },
  farm_hut: {
    file: 'media_1792738883679.jpg',
    allowInternalCavities: false, // House is solid!
    minCavitySize: 100,
    colorDistThreshold: 26
  },
  tea_pavilion: {
    file: 'media_1792738883726.jpg',
    allowInternalCavities: true, // Pavilion has open pillars!
    minCavitySize: 5,
    colorDistThreshold: 35
  },
  rock_boulder: {
    file: 'media_1792738883856.jpg',
    allowInternalCavities: true,
    minCavitySize: 20,
    colorDistThreshold: 26
  }
};

async function processAll() {
  for (const [key, cfg] of Object.entries(BATCH3)) {
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

    const outPng = path.join(testDir, `batch3_${key}.png`);
    fs.writeFileSync(outPng, trimmedPng);

    // Also composite on dark background
    const meta = await sharp(trimmedPng).metadata();
    await sharp({
      create: { width: meta.width, height: meta.height, channels: 4, background: { r: 24, g: 38, b: 28, alpha: 1 } }
    })
      .composite([{ input: trimmedPng, left: 0, top: 0 }])
      .png()
      .toFile(path.join(testDir, `preview_batch3_${key}.png`));

    console.log(`Processed ${key} -> trimmed ${bounds.width}x${bounds.height}`);
  }
}

processAll().catch(console.error);
