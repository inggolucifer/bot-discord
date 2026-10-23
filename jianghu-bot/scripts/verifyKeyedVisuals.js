const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const testDir = path.resolve(__dirname, '../review/test_cavities');

async function testCompositeAgainstBackground(pngName, outName) {
  const pngPath = path.join(testDir, pngName);
  const meta = await sharp(pngPath).metadata();

  // Create dark background (game map ground color: wuxia dark ink green / dirt)
  const bg = await sharp({
    create: {
      width: meta.width,
      height: meta.height,
      channels: 4,
      background: { r: 24, g: 38, b: 28, alpha: 1 } // Dark forest earth
    }
  })
    .composite([{ input: pngPath, left: 0, top: 0 }])
    .png()
    .toFile(path.join(testDir, outName));

  console.log(`Generated preview on dark background: ${outName}`);
}

async function run() {
  await testCompositeAgainstBackground('pavilion_cavities_true_28_min10.png', 'preview_pavilion_dark_bg.png');
  await testCompositeAgainstBackground('pine_cavities_true_28_min15.png', 'preview_pine_dark_bg.png');
  await testCompositeAgainstBackground('cypress_cavities_true_28_min15.png', 'preview_cypress_dark_bg.png');
}

run();
