const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { processLuminanceKey } = require('./assets/luminanceKey');

const uploadDir = 'C:/Users/User/.gemini/antigravity-ide/brain/820a74ec-a0f1-4b89-8c19-ae3daa271077/.user_uploaded';
const testDir = path.resolve(__dirname, '../review/test_cavities');
if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });

async function testKeying(filename, label, options) {
  const filePath = path.join(uploadDir, filename);
  const { data, info } = await sharp(filePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const keyed = processLuminanceKey(data, info.width, info.height, options);

  const outPng = path.join(testDir, `${label}.png`);
  await sharp(keyed, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toFile(outPng);

  console.log(`Saved ${outPng}`);
}

async function run() {
  // Test pine
  await testKeying('media_1792737500001.jpg', 'pine_cavities_true_28_min15', {
    colorDistThreshold: 28,
    allowInternalCavities: true,
    minCavitySize: 15,
    featherMargin: 18
  });

  // Test frost cypress
  await testKeying('media_1792737500051.jpg', 'cypress_cavities_true_28_min15', {
    colorDistThreshold: 28,
    allowInternalCavities: true,
    minCavitySize: 15,
    featherMargin: 18
  });

  // Test tea pavilion
  await testKeying('media_1792738883726.jpg', 'pavilion_cavities_true_28_min10', {
    colorDistThreshold: 28,
    allowInternalCavities: true,
    minCavitySize: 10,
    featherMargin: 18
  });
  await testKeying('media_1792738883726.jpg', 'pavilion_cavities_true_35_min5', {
    colorDistThreshold: 35,
    allowInternalCavities: true,
    minCavitySize: 5,
    featherMargin: 18
  });
}

run().catch(console.error);
