const sharp = require('sharp');
const path = require('path');

const uploadDir = 'C:\\Users\\User\\.gemini\\antigravity-ide\\brain\\5f45876c-f5a0-489a-9c9a-51feae0b2915\\.user_uploaded';
const files = [
  'media_1792412968395.jpg',
  'media_1792412968456.jpg',
  'media_1792412968513.jpg',
  'media_1792412968556.jpg',
  'media_1792412968576.jpg'
];

async function analyze() {
  for (const f of files) {
    const full = path.join(uploadDir, f);
    const { data, info } = await sharp(full).raw().toBuffer({ resolveWithObject: true });
    
    // Check non-white pixels
    let nonWhiteCount = 0;
    let rSum = 0, gSum = 0, bSum = 0;
    let redCount = 0, greenCount = 0, yellowCount = 0, blueCount = 0, stoneGrayCount = 0;
    
    for (let i = 0; i < data.length; i += info.channels) {
      const r = data[i], g = data[i+1], b = data[i+2];
      // background is near white: r > 240, g > 240, b > 240
      if (r > 240 && g > 240 && b > 240) continue;
      
      nonWhiteCount++;
      rSum += r; gSum += g; bSum += b;
      
      // detect colors
      if (r > 150 && g < 80 && b < 80) redCount++; // bright red (berries, battle flag)
      if (g > r + 20 && g > b + 20) greenCount++; // vegetation/moss/leaves
      if (r > 180 && g > 150 && b < 100) yellowCount++; // golden glow/lantern/sand
      if (Math.abs(r - g) < 15 && Math.abs(g - b) < 15) stoneGrayCount++; // gray stone/metal
    }
    
    const avgR = Math.round(rSum / (nonWhiteCount || 1));
    const avgG = Math.round(gSum / (nonWhiteCount || 1));
    const avgB = Math.round(bSum / (nonWhiteCount || 1));
    
    console.log(`=== ${f} (${info.width}x${info.height}) ===`);
    console.log(`  Subject Pixels: ${nonWhiteCount}`);
    console.log(`  Avg Subject RGB: [${avgR}, ${avgG}, ${avgB}]`);
    console.log(`  Red pixels: ${redCount}`);
    console.log(`  Green pixels: ${greenCount}`);
    console.log(`  Yellow/Gold: ${yellowCount}`);
    console.log(`  Stone Gray: ${stoneGrayCount}`);
  }
}
analyze().catch(console.error);
