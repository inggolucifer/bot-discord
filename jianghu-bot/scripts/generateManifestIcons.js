const sharp = require('sharp');
const path = require('path');

const iconsDir = path.resolve(__dirname, '../web-dashboard/public/icons');

const svg192 = `<svg width="192" height="192" xmlns="http://www.w3.org/2000/svg">
  <rect width="192" height="192" fill="#0a0f18"/>
  <circle cx="96" cy="96" r="64" fill="none" stroke="#c5a880" stroke-width="4"/>
  <text x="96" y="116" font-size="60" font-family="serif" fill="#c5a880" text-anchor="middle" font-weight="bold">JH</text>
</svg>`;

const svg512 = `<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#0a0f18"/>
  <circle cx="256" cy="256" r="170" fill="none" stroke="#c5a880" stroke-width="10"/>
  <text x="256" y="310" font-size="160" font-family="serif" fill="#c5a880" text-anchor="middle" font-weight="bold">JH</text>
</svg>`;

async function main() {
  await sharp(Buffer.from(svg192)).png().toFile(path.join(iconsDir, 'icon-192x192.png'));
  await sharp(Buffer.from(svg512)).png().toFile(path.join(iconsDir, 'icon-512x512.png'));
  console.log('✅ [MANIFEST-ICONS] Valid 192x192 and 512x512 PNG icons generated successfully!');
}

main().catch(err => {
  console.error('Failed to generate icons:', err);
  process.exit(1);
});
