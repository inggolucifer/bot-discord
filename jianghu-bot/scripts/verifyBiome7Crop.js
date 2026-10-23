const sharp = require('sharp');
const path = require('path');
const atlasDir = path.resolve('web-dashboard/public/assets/atlas');
const reviewDir = path.resolve('review');

async function verifyBiome7() {
  const biome7Path = path.join(atlasDir, 'biome_nature_7.webp');
  
  // Crop the tree and rock rows: y from 1400 to 1939, x from 0 to 2048
  const crop = await sharp(biome7Path)
    .extract({ left: 0, top: 1400, width: 2048, height: 539 })
    .png()
    .toBuffer();

  // Composite over dark background
  await sharp({
    create: { width: 2048, height: 539, channels: 4, background: { r: 24, g: 38, b: 28, alpha: 1 } }
  })
    .composite([{ input: crop, left: 0, top: 0 }])
    .png()
    .toFile(path.join(reviewDir, 'biome7_crop_trees_rocks_dark_bg.png'));

  // Also crop specifically cypress and pine area: x: 800 to 2048, y: 1440 to 1640
  const treeCrop = await sharp(biome7Path)
    .extract({ left: 800, top: 1440, width: 1248, height: 180 })
    .png()
    .toBuffer();

  await sharp({
    create: { width: 1248, height: 180, channels: 4, background: { r: 24, g: 38, b: 28, alpha: 1 } }
  })
    .composite([{ input: treeCrop, left: 0, top: 0 }])
    .png()
    .toFile(path.join(reviewDir, 'biome7_trees_cypress_pine_dark_bg.png'));

  console.log('Generated review crops for biome_nature_7!');
}

verifyBiome7().catch(console.error);
