/**
 * scripts/cleanLegacyAtlasFrames.js
 * Cleans trapped solid white canvas holes in legacy atlas pages:
 * - settlement_0.webp: structure_prof_fishing_bamboo_raft_spirit_net_dock, structure_prof_farming_spirit_herb_nursery_trellis
 * - settlement_2.webp: building_forge_workshop, building_ferry_dock
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const atlasDir = path.resolve(__dirname, '../web-dashboard/public/assets/atlas');

const TARGETS = [
  {
    page: 'settlement_0',
    frames: [
      'structure_prof_fishing_bamboo_raft_spirit_net_dock',
      'structure_prof_farming_spirit_herb_nursery_trellis',
      'structure_prof_cooking_immortal_delicacy_hearth_oven',
      'structure_prof_mining_spirit_ore_crushing_stamp_mill'
    ]
  },
  {
    page: 'settlement_2',
    frames: [
      'building_forge_workshop',
      'building_ferry_dock'
    ]
  }
];

async function cleanLegacyPage(target) {
  const pageJsonPath = path.join(atlasDir, `${target.page}.json`);
  const pageWebpPath = path.join(atlasDir, `${target.page}.webp`);
  
  if (!fs.existsSync(pageJsonPath) || !fs.existsSync(pageWebpPath)) return;
  
  const manifest = JSON.parse(fs.readFileSync(pageJsonPath, 'utf8'));
  const fileBuffer = fs.readFileSync(pageWebpPath);
  const img = sharp(fileBuffer);
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  
  console.log(`Cleaning legacy frames in ${target.page}...`);
  let punchedTotal = 0;
  
  for (const fId of target.frames) {
    const fData = manifest.frames[fId];
    if (!fData) continue;
    
    const { x, y, w, h } = fData.frame;
    let framePunched = 0;
    
    for (let r = 0; r < h; r++) {
      for (let c = 0; c < w; c++) {
        const pIdx = ((y + r) * info.width + (x + c)) * info.channels;
        const red = data[pIdx];
        const green = data[pIdx + 1];
        const blue = data[pIdx + 2];
        const alpha = data[pIdx + 3];
        
        if (alpha > 0) {
          const minRgb = Math.min(red, green, blue);
          const maxRgb = Math.max(red, green, blue);
          const diff = maxRgb - minRgb;
          
          // Pure flat white canvas background in legacy sprites
          if (minRgb >= 242 && diff <= 12) {
            data[pIdx + 3] = 0; // Transparent!
            framePunched++;
          } else if (minRgb >= 225 && minRgb < 242 && diff <= 14) {
            const ramp = (242 - minRgb) / (242 - 225);
            data[pIdx + 3] = Math.round(alpha * ramp);
            framePunched++;
          }
        }
      }
    }
    
    console.log(`- Frame ${fId}: punched ${framePunched} trapped white pixels`);
    punchedTotal += framePunched;
  }
  
  const updatedWebp = await sharp(data, {
    raw: {
      width: info.width,
      height: info.height,
      channels: info.channels
    }
  })
    .webp({ quality: 90, effort: 6 })
    .toBuffer();
    
  fs.writeFileSync(pageWebpPath, updatedWebp);
  console.log(`[PASS] Re-saved ${target.page}.webp (${punchedTotal} pixels cleaned)\n`);
}

async function main() {
  for (const t of TARGETS) {
    await cleanLegacyPage(t);
  }
}

main().catch(console.error);
