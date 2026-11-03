const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../../..');
const BOT_ROOT = path.resolve(__dirname, '../..');
const DOCS_V20 = path.join(BOT_ROOT, 'docs/v20');

const isApply = process.argv.includes('--apply');
const isP9 = process.argv.includes('--p9');

console.log(`[CLEANUP] Menjalankan pembersihan proyek (${isApply ? 'APPLY MODE' : 'DRY RUN'})...`);

// Items for Phase 1 (8.1)
const P1_ITEMS = [
  // Root jianghu-bot files
  'jianghu-bot/scratch_cleaned_pillar.png',
  'jianghu-bot/scratch_cropped.png',
  'jianghu-bot/scratch_edge.png',
  'jianghu-bot/scratch_refined_pillar.jpg',
  'jianghu-bot/test_poll_dock.jpg',
  'jianghu-bot/audit_plots_report.csv',
  // World-data _unused
  'jianghu-bot/world-data/_unused',
  // Root repo files & directories
  'V9_PACK.zip',
  'V10_PACK.zip',
  'v10_pack',
  'v9_extracted',
  // Review folder
  'jianghu-bot/review'
];

// Helper to check git tracked
function getTrackedFiles() {
  return execSync('git ls-files', { cwd: ROOT, encoding: 'utf8' }).trim().split(/\r?\n/);
}

const allTracked = getTrackedFiles();
const cleanupPlan = [];

// 1. Process P1 items
for (const item of P1_ITEMS) {
  const fullPath = path.join(ROOT, item);
  const exists = fs.existsSync(fullPath);
  const trackedMatches = allTracked.filter(f => f === item || f.startsWith(item + '/'));
  let totalBytes = 0;
  for (const f of trackedMatches) {
    try {
      totalBytes += fs.statSync(path.join(ROOT, f)).size;
    } catch (_) {}
  }
  cleanupPlan.push({
    target: item,
    phase: 'P1',
    existsOnDisk: exists,
    trackedFilesCount: trackedMatches.length,
    totalBytes,
    action: trackedMatches.length > 0 ? 'git rm' : (exists ? 'fs rm' : 'none')
  });
}

// 2. Process all .bak files tracked
const bakFiles = allTracked.filter(f => f.endsWith('.bak') || f.includes('.bak.'));
for (const b of bakFiles) {
  let bBytes = 0;
  try {
    bBytes = fs.statSync(path.join(ROOT, b)).size;
  } catch (_) {}
  cleanupPlan.push({
    target: b,
    phase: 'P1-bak',
    existsOnDisk: fs.existsSync(path.join(ROOT, b)),
    trackedFilesCount: 1,
    totalBytes: bBytes,
    action: 'git rm'
  });
}

// Write cleanup plan
if (!fs.existsSync(DOCS_V20)) fs.mkdirSync(DOCS_V20, { recursive: true });
fs.writeFileSync(path.join(DOCS_V20, 'cleanup-plan.json'), JSON.stringify(cleanupPlan, null, 2), 'utf8');
console.log(`[CLEANUP] Rencana pembersihan ditulis ke docs/v20/cleanup-plan.json (${cleanupPlan.length} entri).`);

const totalP1Bytes = cleanupPlan.reduce((acc, x) => acc + x.totalBytes, 0);
const totalP1Files = cleanupPlan.reduce((acc, x) => acc + x.trackedFilesCount, 0);
console.log(`[CLEANUP] Total potensi pembersihan P1: ${totalP1Files} file ter-track, ${(totalP1Bytes / 1024 / 1024).toFixed(2)} MB.`);

if (!isApply) {
  console.log('[CLEANUP] Dry run selesai. Jalankan dengan --apply untuk mengeksekusi penghapusan.');
  process.exit(0);
}

// APPLY EXECUTION
console.log('[CLEANUP] Mengeksekusi penghapusan file...');

// 1. Git rm review folder
try {
  console.log('[CLEANUP] git rm -r -f jianghu-bot/review...');
  execSync('git rm -r -f jianghu-bot/review', { cwd: ROOT, stdio: 'inherit' });
} catch (e) {
  console.warn('[CLEANUP] Warning review git rm:', e.message);
}

// 2. Git rm bak files
for (const b of bakFiles) {
  try {
    execSync(`git rm -f "${b}"`, { cwd: ROOT, stdio: 'pipe' });
  } catch (_) {}
}

// 3. Git rm other P1 tracked items
for (const item of P1_ITEMS) {
  if (item === 'jianghu-bot/review') continue;
  try {
    execSync(`git rm -r -f "${item}"`, { cwd: ROOT, stdio: 'pipe' });
  } catch (_) {}
}

// 4. Clean untracked scratch folder & loose files on disk
const scratchDir = path.join(BOT_ROOT, 'scratch');
if (fs.existsSync(scratchDir)) {
  console.log('[CLEANUP] Menghapus folder scratch/...');
  fs.rmSync(scratchDir, { recursive: true, force: true });
}

for (const item of P1_ITEMS) {
  const fullPath = path.join(ROOT, item);
  if (fs.existsSync(fullPath)) {
    fs.rmSync(fullPath, { recursive: true, force: true });
  }
}

console.log('[CLEANUP] Eksekusi P1 selesai dengan sukses.');
