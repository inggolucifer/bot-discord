const sharp = require('sharp');
const path = require('path');
const uploadDir = 'C:/Users/User/.gemini/antigravity-ide/brain/820a74ec-a0f1-4b89-8c19-ae3daa271077/.user_uploaded';

async function identify() {
  const files = [
    'media_1792740719838.jpg',
    'media_1792740719905.jpg',
    'media_1792740719951.jpg',
    'media_1792740719967.jpg'
  ];

  for (const f of files) {
    const { data, info } = await sharp(path.join(uploadDir, f)).raw().toBuffer({ resolveWithObject: true });
    // Sample center area: 100x100
    let totalR = 0, totalG = 0, totalB = 0, count = 0;
    const cx = Math.floor(info.width / 2);
    const cy = Math.floor(info.height / 2);
    for (let dy = -50; dy < 50; dy++) {
      for (let dx = -50; dx < 50; dx++) {
        const idx = ((cy + dy) * info.width + (cx + dx)) * info.channels;
        totalR += data[idx];
        totalG += data[idx + 1];
        totalB += data[idx + 2];
        count++;
      }
    }
    console.log(f, info.width + 'x' + info.height, 'Center avg RGB:', Math.round(totalR / count), Math.round(totalG / count), Math.round(totalB / count));
  }
}
identify();
