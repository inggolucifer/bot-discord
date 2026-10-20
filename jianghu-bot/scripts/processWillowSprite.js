const sharp = require('../node_modules/sharp');
const path = require('path');
const fs = require('fs');

const inputJpg = 'C:\\Users\\User\\.gemini\\antigravity-ide\\brain\\a11b968d-071b-47e3-b590-a01952040a09\\willow_tree_sprite_1792512583404.jpg';
const outputPng = path.join(__dirname, '../willow_transparent.png');

async function processImage() {
  const { data, info } = await sharp(inputJpg)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  console.log(`Input size: ${width}x${height}, channels: ${channels}`);

  // Background removal: white (#ffffff) to transparent
  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // If close to white (brightness threshold)
    const minVal = Math.min(r, g, b);
    const maxVal = Math.max(r, g, b);
    
    // Pure white or very light background
    if (minVal > 245) {
      data[i + 3] = 0; // Completely transparent
    } else if (minVal > 230 && (maxVal - minVal) < 15) {
      // Soft antialiased edge for neutral off-whites
      const factor = (245 - minVal) / 15;
      data[i + 3] = Math.round(255 * factor);
    }
  }

  // Save full transparent version
  await sharp(data, { raw: { width, height, channels } })
    .png()
    .toFile(outputPng);
  console.log('Saved transparent png to', outputPng);

  // Resize to 192x192 with trim
  const trimmed = await sharp(outputPng)
    .trim()
    .resize(184, 184, { fit: 'inside' })
    .extend({
      top: 4,
      bottom: 4,
      left: 4,
      right: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .resize(192, 192, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .png()
    .toBuffer();

  const sprite192Path = path.join(__dirname, '../willow_192.png');
  fs.writeFileSync(sprite192Path, trimmed);
  console.log('Saved 192x192 sprite to', sprite192Path);
}

processImage().catch(console.error);
