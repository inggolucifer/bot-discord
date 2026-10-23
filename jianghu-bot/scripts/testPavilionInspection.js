const sharp = require('sharp');
const path = require('path');
const uploadDir = 'C:/Users/User/.gemini/antigravity-ide/brain/820a74ec-a0f1-4b89-8c19-ae3daa271077/.user_uploaded';

async function checkTeaset() {
  const { data, info } = await sharp(path.join(uploadDir, 'media_1792738883726.jpg')).raw().toBuffer({ resolveWithObject: true });
  console.log('Sample table area:');
  for (let y = 520; y <= 540; y += 5) {
    for (let x = 380; x <= 420; x += 10) {
      const idx = (y * info.width + x) * 3;
      console.log(`  (${x},${y}): RGB=[${data[idx]},${data[idx+1]},${data[idx+2]}]`);
    }
  }
}
checkTeaset();
