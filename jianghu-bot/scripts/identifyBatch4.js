const sharp = require('sharp');
const path = require('path');
const uploadDir = 'C:/Users/User/.gemini/antigravity-ide/brain/820a74ec-a0f1-4b89-8c19-ae3daa271077/.user_uploaded';

async function check() {
  const files = [
    'media_1792740719838.jpg',
    'media_1792740719905.jpg',
    'media_1792740719951.jpg',
    'media_1792740719967.jpg'
  ];
  for (const f of files) {
    const meta = await sharp(path.join(uploadDir, f)).metadata();
    console.log(f, meta.width + 'x' + meta.height);
  }
}
check();
