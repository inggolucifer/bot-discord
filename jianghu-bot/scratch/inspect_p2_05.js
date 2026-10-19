const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const uploadDir = 'C:\\Users\\User\\.gemini\\antigravity-ide\\brain\\5f45876c-f5a0-489a-9c9a-51feae0b2915\\.user_uploaded';
const files = [
  'media_1792412968395.jpg',
  'media_1792412968456.jpg',
  'media_1792412968513.jpg',
  'media_1792412968556.jpg',
  'media_1792412968576.jpg'
];

async function inspect() {
  for (const f of files) {
    const full = path.join(uploadDir, f);
    const meta = await sharp(full).metadata();
    const stats = await sharp(full).stats();
    console.log('File:', f);
    console.log(' Dimensions:', meta.width, 'x', meta.height);
    console.log(' Channels mean:', stats.channels.map(c => Math.round(c.mean)));
    console.log(' Dominant:', stats.dominant);
  }
}
inspect().catch(console.error);
