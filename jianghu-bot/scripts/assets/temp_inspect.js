const sharp = require('sharp');
const { processLuminanceKey } = require('./luminanceKey');

const files = [
  'media_1792304657936.jpg',
  'media_1792304657995.jpg',
  'media_1792304658060.jpg',
  'media_1792304658154.jpg',
  'media_1792304658198.jpg'
];

async function testAll() {
  for (const f of files) {
    const p = 'C:/Users/User/.gemini/antigravity-ide/brain/5f45876c-f5a0-489a-9c9a-51feae0b2915/.user_uploaded/' + f;
    const { data, info } = await sharp(p).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    for (const thresh of [48, 52]) {
      const keyed = processLuminanceKey(data, info.width, info.height, {
        colorDistThreshold: thresh,
        allowInternalCavities: false,
        featherMargin: 20
      });
      const trimmed = await sharp(keyed, {
        raw: { width: info.width, height: info.height, channels: 4 }
      }).trim().toBuffer({ resolveWithObject: true });
      console.log(f, `thresh ${thresh}: trimmed ${trimmed.info.width}x${trimmed.info.height} (orig ${info.width}x${info.height})`);
    }
  }
}
testAll().catch(console.error);
