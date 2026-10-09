/**
 * TEST SUITE: POLISH & REGION CALLIGRAPHY ARRIVAL BANNER (FASE 16)
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`[FAIL] ${name}: ${err.message}`);
    failed++;
  }
}

console.log('\n=== TEST SUITE: POLISH & REGION CALLIGRAPHY ARRIVAL BANNER (FASE 16) ===\n');

// 1. Verify RegionCalligraphyBanner.tsx exists
test('RegionCalligraphyBanner.tsx component exists', () => {
  const filePath = path.join(__dirname, '..', 'web-dashboard', 'src', 'components', 'map', 'RegionCalligraphyBanner.tsx');
  assert(fs.existsSync(filePath), 'RegionCalligraphyBanner.tsx must exist');
});

// 2. Verify RegionCalligraphyBanner is wired into ZoneGridView.tsx
test('RegionCalligraphyBanner is imported and rendered in ZoneGridView.tsx', () => {
  const gridPath = path.join(__dirname, '..', 'web-dashboard', 'src', 'components', 'map', 'ZoneGridView.tsx');
  const content = fs.readFileSync(gridPath, 'utf8');
  assert(content.includes('import RegionCalligraphyBanner'), 'ZoneGridView must import RegionCalligraphyBanner');
  assert(content.includes('<RegionCalligraphyBanner'), 'ZoneGridView must render <RegionCalligraphyBanner />');
  assert(content.includes('activeRegionBanner'), 'ZoneGridView must manage activeRegionBanner state');
});

// 3. Verify all 29 Canonical Regions have Chinese Calligraphy names and Danger Tiers
test('All 29 canonical regions define chineseName and valid dangerTier (1-6)', () => {
  const regionsPath = path.join(__dirname, '..', 'world-data', 'regions.json');
  const regions = JSON.parse(fs.readFileSync(regionsPath, 'utf8'));
  assert.strictEqual(regions.length, 29, 'Must have exactly 29 canonical regions');
  for (const r of regions) {
    assert(r.chineseName && r.chineseName.trim().length > 0, `Region ${r.id} must have chineseName`);
    assert(typeof r.dangerTier === 'number' && r.dangerTier >= 1 && r.dangerTier <= 6, `Region ${r.id} must have dangerTier between 1 and 6`);
  }
});

// 4. Verify sound synthesizer includes playGuzheng audio cue
test('Sound synthesizer library has playGuzheng support for calligraphy arrival', () => {
  const soundPath = path.join(__dirname, '..', 'web-dashboard', 'src', 'lib', 'soundSynthesizer.ts');
  const content = fs.readFileSync(soundPath, 'utf8');
  assert(content.includes('playGuzheng'), 'soundSynthesizer must provide playGuzheng method');
});

// 5. Verify WorldCanvas L8 weather rendering (rain, snow, miasma)
test('WorldCanvas implements L8 weather layer overlay', () => {
  const canvasPath = path.join(__dirname, '..', 'web-dashboard', 'src', 'components', 'map', 'WorldCanvas.tsx');
  const content = fs.readFileSync(canvasPath, 'utf8');
  assert(content.includes('L8: WEATHER OVERLAY') && content.includes("weather === 'rain'"), 'WorldCanvas must support L8 weather overlay');
});

console.log('\n========================================');
console.log(`HASIL: ${passed} LULUS, ${failed} GAGAL`);
console.log('========================================\n');

if (failed > 0) process.exit(1);
