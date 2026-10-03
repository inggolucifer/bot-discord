#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const IGNORED_DIRS = new Set([
  'node_modules',
  '.next',
  '.git',
  'dist',
  'coverage',
  '.nyc_output'
]);

function walkJsFiles(dir, fileList = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!IGNORED_DIRS.has(entry.name)) {
        walkJsFiles(path.join(dir, entry.name), fileList);
      }
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      fileList.push(path.join(dir, entry.name));
    }
  }
  return fileList;
}

console.log('[SYNTAX-CHECK] Memindai seluruh berkas JavaScript di proyek...');
const files = walkJsFiles(ROOT);
console.log(`[SYNTAX-CHECK] Ditemukan ${files.length} berkas .js. Menjalankan node --check...`);

let failedCount = 0;
const failures = [];

for (const file of files) {
  try {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
  } catch (err) {
    failedCount++;
    const relPath = path.relative(ROOT, file);
    failures.push({ file: relPath, error: err.stderr ? err.stderr.toString().trim() : err.message });
  }
}

if (failedCount > 0) {
  console.error(`\n❌ [SYNTAX-CHECK FAILED] Terdeteksi ${failedCount} berkas bermasalah sintaks:`);
  for (const fail of failures) {
    console.error(`\n- ${fail.file}:\n${fail.error}`);
  }
  process.exit(1);
} else {
  console.log(`\n✅ [SYNTAX-CHECK PASSED] Seluruh ${files.length} berkas JavaScript valid tanpa error sintaks.`);
  process.exit(0);
}
