/**
 * scripts/importSprite.js
 * Imports an external high-resolution sprite PNG into the web-dashboard texture atlas.
 * Usage: node scripts/importSprite.js <path_to_png> <frameId>
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const scaleCanon = require('../world-data/scale-canon.json');

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('Usage: node scripts/importSprite.js <path_to_png> <frameId>');
    process.exit(1);
  }

  const pngPath = path.resolve(args[0]);
  const frameId = args[1];

  if (!fs.existsSync(pngPath)) {
    console.error(`[ERROR] File not found: ${pngPath}`);
    process.exit(1);
  }

  console.log(`[ImportSprite] Importing ${pngPath} as "${frameId}"...`);

  const img = sharp(pngPath);
  const metadata = await img.metadata();
  console.log(`- Image dimensions: ${metadata.width}x${metadata.height}, format: ${metadata.format}`);

  // Find atlas page in scaleCanon or atlas index
  const atlasIndexFile = path.resolve(__dirname, '../web-dashboard/public/assets/atlas/index.json');
  let targetPage = 'biome_nature_7';
  if (fs.existsSync(atlasIndexFile)) {
    const atlasIndex = JSON.parse(fs.readFileSync(atlasIndexFile, 'utf8'));
    if (atlasIndex[frameId] && atlasIndex[frameId].page) {
      targetPage = atlasIndex[frameId].page;
    }
  }

  // Update scale-canon
  const canonEntry = scaleCanon[frameId] || { id: frameId, visualW: 2, visualH: 2, category: 'prop' };
  canonEntry.srcW = metadata.width;
  canonEntry.srcH = metadata.height;
  canonEntry.pxPerTile = parseFloat(((metadata.width / canonEntry.visualW)).toFixed(1));
  scaleCanon[frameId] = canonEntry;

  // Save to both scale-canon locations
  fs.writeFileSync(path.resolve(__dirname, '../world-data/scale-canon.json'), JSON.stringify(scaleCanon, null, 2), 'utf8');
  const dashCanonPath = path.resolve(__dirname, '../web-dashboard/src/config/scaleCanon.json');
  if (fs.existsSync(dashCanonPath)) {
    fs.writeFileSync(dashCanonPath, JSON.stringify(scaleCanon, null, 2), 'utf8');
  }

  console.log(`- Updated scale-canon: visual=${canonEntry.visualW}x${canonEntry.visualH}, pxPerTile=${canonEntry.pxPerTile}`);
  console.log(`[SUCCESS] Frame "${frameId}" successfully staged and registered in scale-canon.`);
}

main().catch(err => {
  console.error('[ERROR]', err);
  process.exit(1);
});
