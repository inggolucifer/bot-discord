/**
 * test_phase_blueprint_integrity.js
 * Root test runner for Settlement Panorama V2 blueprints integrity.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

let passedTests = 0;
let failedTests = 0;

function it(name, fn) {
    try {
        fn();
        console.log(`[PASS] ${name}`);
        passedTests++;
    } catch (err) {
        console.error(`[FAIL] ${name}: ${err.message}`);
        failedTests++;
    }
}

console.log('\n=== RUNNING SETTLEMENT BLUEPRINTS INTEGRITY AUDIT ===\n');

const BLUEPRINTS_DIR = path.join(__dirname, 'world-data/settlements');
const REQUIRED_BLUEPRINTS = ['village', 'city', 'port', 'outpost', 'sect'];

REQUIRED_BLUEPRINTS.forEach(bpName => {
    it(`Blueprint ${bpName}_blueprint.json exists and is valid JSON`, () => {
        const filePath = path.join(BLUEPRINTS_DIR, `${bpName}_blueprint.json`);
        assert(fs.existsSync(filePath), `File ${filePath} must exist`);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        assert(data.blueprintType === bpName, `blueprintType must match ${bpName}`);
        assert(typeof data.backdropId === 'string' && data.backdropId.length > 0, 'backdropId must be non-empty string');
        assert(typeof data.palette === 'string', 'palette must exist');
        assert(Array.isArray(data.layers) && data.layers.length >= 3, 'Must have at least 3 parallax layers');
        assert(Array.isArray(data.buildings) && data.buildings.length >= 3, 'Must have at least 3 buildings');
    });
});

it('All blueprints contain 3 parallax layers with expected speed ratios (far: 0.2, mid: 0.5, ground: 1.0)', () => {
    REQUIRED_BLUEPRINTS.forEach(bpName => {
        const data = JSON.parse(fs.readFileSync(path.join(BLUEPRINTS_DIR, `${bpName}_blueprint.json`), 'utf8'));
        const far = data.layers.find(l => l.layer === 'far');
        const mid = data.layers.find(l => l.layer === 'mid');
        const ground = data.layers.find(l => l.layer === 'ground');
        assert(far && far.speed === 0.2, `${bpName} far layer speed must be 0.2`);
        assert(mid && mid.speed === 0.5, `${bpName} mid layer speed must be 0.5`);
        assert(ground && ground.speed === 1.0, `${bpName} ground layer speed must be 1.0`);
    });
});

it('All buildings have calligraphic bannerText, openStatus, and services array', () => {
    REQUIRED_BLUEPRINTS.forEach(bpName => {
        const data = JSON.parse(fs.readFileSync(path.join(BLUEPRINTS_DIR, `${bpName}_blueprint.json`), 'utf8'));
        data.buildings.forEach(b => {
            assert(typeof b.id === 'string', 'Building must have id');
            assert(typeof b.name === 'string', 'Building must have name');
            assert(typeof b.chineseName === 'string', 'Building must have chineseName');
            assert(typeof b.bannerText === 'string' && b.bannerText.includes('·'), `Building ${b.id} must have calligraphy bannerText`);
            assert(Array.isArray(b.services) && b.services.length > 0, `Building ${b.id} must declare services`);
            assert(b.openStatus === 'open' || b.openStatus === 'closed', `Building ${b.id} must declare openStatus`);
        });
    });
});

console.log(`\nResults: ${passedTests} passed, ${failedTests} failed.`);
if (failedTests > 0) {
    process.exit(1);
}
