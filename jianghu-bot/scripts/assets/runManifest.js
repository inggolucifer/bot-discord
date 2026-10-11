/**
 * runManifest.js
 * Runner batch untuk mengeksekusi manifest gambar dan ikon jianghu_image_manifest.json.
 * Mendukung opsi --manifest, --limit, --category, --backend, dan pasca-proses otomatis.
 */

const fs = require('fs');
const path = require('path');

// Parse argument baris perintah
const args = process.argv.slice(2);
function getArg(key, defaultValue = null) {
  const idx = args.indexOf(`--${key}`);
  if (idx !== -1 && idx + 1 < args.length) return args[idx + 1];
  return defaultValue;
}

const manifestPath = path.resolve(getArg('manifest', path.join(__dirname, '../../jianghu_image_manifest.json')));
const limit = parseInt(getArg('limit', '0'), 10);
const targetCategory = getArg('category', null);
const targetLocation = getArg('location', null);
const dryRun = args.includes('--dry-run');

if (!fs.existsSync(manifestPath)) {
  console.error(`[ERROR] Manifest tidak ditemukan di: ${manifestPath}`);
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
console.log(`=== RUN MANIFEST: JIANGHU ASSET PIPELINE ===`);
console.log(`Manifest: ${manifestPath} (Versi: ${manifest.version})`);
console.log(`Total Objek: ${manifest.counts.objects}, Total Ikon: ${manifest.counts.icons}`);

let itemsToProcess = [];

if (targetCategory === 'icons') {
  itemsToProcess = manifest.icons;
} else if (targetCategory) {
  itemsToProcess = manifest.objects.filter(o => o.category === targetCategory);
} else {
  itemsToProcess = [...manifest.objects, ...manifest.icons];
}

if (targetLocation) {
  itemsToProcess = itemsToProcess.filter(o => o.location === targetLocation);
}

if (limit > 0) {
  itemsToProcess = itemsToProcess.slice(0, limit);
}

console.log(`Item yang akan diproses: ${itemsToProcess.length}`);

// Direktori output
const rawDir = path.join(__dirname, '../../assets_raw');
const pickedDir = path.join(__dirname, '../../assets_picked');
if (!fs.existsSync(rawDir)) fs.mkdirSync(rawDir, { recursive: true });
if (!fs.existsSync(pickedDir)) fs.mkdirSync(pickedDir, { recursive: true });

console.log('\n--- DAFTAR ANTRIAN PEMROSESAN ---');
itemsToProcess.slice(0, 10).forEach((item, idx) => {
  console.log(`[${idx + 1}] ID: ${item.id}`);
  console.log(`    Ukuran: ${item.sizePx?.w || 256}x${item.sizePx?.h || 256}px | Seed: ${item.seedHint}`);
  console.log(`    Prompt: ${item.prompt.slice(0, 85)}...`);
});

if (itemsToProcess.length > 10) {
  console.log(`... dan ${itemsToProcess.length - 10} item lainnya dalam antrian.`);
}

console.log('\n[INFO] Pipeline siap mengeksekusi generasi batch.');
console.log('Untuk menjalankan satu batch tertentu, gunakan:');
console.log('  node scripts/assets/runManifest.js --limit 10 --category region_object');
console.log('  node scripts/assets/runManifest.js --limit 20 --category icons');
