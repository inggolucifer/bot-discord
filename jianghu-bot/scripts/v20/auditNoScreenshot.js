const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../../..');

console.log('[AUDIT] Memeriksa ketiadaan sistem screenshot dan debug hooks...');

const FORBIDDEN_REGEX = /playwright|puppeteer|page\.screenshot|captureWorld|__debugViewport|__chunksReady|__debugRoadCells|__debugObjectsDrawn|GroundBisectFlags|ground=only|noroad=|nofarm=/i;

// Get all tracked files in git
const trackedFiles = execSync('git ls-files', { cwd: ROOT, encoding: 'utf8' })
  .trim()
  .split(/\r?\n/)
  .filter(f => {
    // Exclude docs/v20, plan artifacts, images, and this audit script itself
    if (f.startsWith('jianghu-bot/docs/v20/')) return false;
    if (f.includes('package-lock.json')) return false;
    if (f.includes('auditNoScreenshot.js')) return false;
    if (f.includes('patchWebDebugHooks.js')) return false;
    if (f.includes('cleanWorldCanvas.js')) return false;
    if (f.endsWith('.png') || f.endsWith('.webp') || f.endsWith('.jpg') || f.endsWith('.zip')) return false;
    return true;
  });

let violationCount = 0;
const violations = [];

for (const relPath of trackedFiles) {
  const fullPath = path.join(ROOT, relPath);
  let content = '';
  try {
    content = fs.readFileSync(fullPath, 'utf8');
  } catch (_) {
    continue;
  }

  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (FORBIDDEN_REGEX.test(line)) {
      violationCount++;
      violations.push({
        file: relPath,
        lineNum: i + 1,
        line: line.trim().slice(0, 140)
      });
    }
  }
}

if (violationCount > 0) {
  console.error(`\n❌ [AUDIT FAILED] Ditemukan ${violationCount} sisa screenshot / debug hooks:`);
  for (const v of violations) {
    console.error(`  - ${v.file}:${v.lineNum} -> ${v.line}`);
  }
  process.exit(1);
} else {
  console.log(`\n✅ [AUDIT PASSED] 0 temuan screenshot / debug hooks di ${trackedFiles.length} file ter-track.`);
  process.exit(0);
}
