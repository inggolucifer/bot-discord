/**
 * TEST SUITE: SETTLEMENT PANORAMA V2 (FASE 13)
 * Verifies settlement blueprints, settlementEngine resolution,
 * Zero-Portal Policy, NPC strip format, and §6.4 compliance.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const settlementEngine = require('../utils/settlementEngine');

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

console.log('\n=== TEST SUITE: SETTLEMENT PANORAMA V2 (FASE 13) ===\n');

// 1. Blueprint files integrity
const BLUEPRINTS_DIR = path.join(__dirname, '../world-data/settlements');
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

// 2. Parallax speeds and building structure
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

// 3. Settlement resolution across anchors
it('SettlementEngine resolves villages to village blueprint', () => {
    const xingcun = settlementEngine.getSettlementPanoramaData('Desa Xingcun');
    assert.strictEqual(xingcun.settlement.name, 'Desa Xingcun');
    assert.strictEqual(xingcun.backdropId, 'backdrop_misty_bamboo_village');
    assert(xingcun.buildings.some(b => b.id === 'village_inn' || b.id === 'inn'), 'Village must have inn');
    assert(xingcun.buildings.some(b => b.id === 'market'), 'Village must have market');
});

it('SettlementEngine resolves cities to city blueprint', () => {
    const tianjing = settlementEngine.getSettlementPanoramaData('Tianjing');
    assert.strictEqual(tianjing.settlement.name, 'Tianjing');
    assert.strictEqual(tianjing.backdropId, 'backdrop_imperial_palace_mountains');
    assert(tianjing.buildings.some(b => b.id === 'market'), 'City must have market');
    assert(tianjing.buildings.some(b => b.id === 'manual_pavilion'), 'City must have manual pavilion');
});

it('SettlementEngine resolves ports to port blueprint with dock exit', () => {
    const donghai = settlementEngine.getSettlementPanoramaData('Dermaga Donghai');
    assert.strictEqual(donghai.settlement.name, 'Dermaga Donghai');
    assert.strictEqual(donghai.backdropId, 'backdrop_misty_ocean_port');
    assert(donghai.buildings.some(b => b.id === 'dock'), 'Port must have dock building');
    assert(donghai.exits.some(e => e.type === 'dock'), 'Port exits must include dock');
});

it('SettlementEngine resolves outposts to outpost blueprint', () => {
    const outpost = settlementEngine.getSettlementPanoramaData('Pos Perbatasan Qinghe');
    assert.strictEqual(outpost.backdropId, 'backdrop_rugged_mountain_pass');
    assert(outpost.buildings.some(b => b.id === 'barracks' || b.id === 'inn'), 'Outpost must have barracks/inn');
});

// 4. Strict Zero-Portal Policy Verification
it('Zero-Portal Policy: All settlements have a physical city_gate exit matching exact anchor coordinates', () => {
    const anchors = settlementEngine.loadAnchors();
    assert(anchors.length > 0, 'Anchors must be loaded');
    anchors.forEach(anchor => {
        const data = settlementEngine.getSettlementPanoramaData(anchor.name);
        const gate = data.exits.find(e => e.type === 'city_gate');
        assert(gate, `${anchor.name} must have a city_gate exit`);
        assert.strictEqual(gate.targetTile.x, anchor.x, `${anchor.name} gate x must match anchor x`);
        assert.strictEqual(gate.targetTile.y, anchor.y, `${anchor.name} gate y must match anchor y`);
        assert(!data.exits.some(e => e.type.includes('portal') || e.type.includes('teleport')), `${anchor.name} must have no magical portals`);
    });
});

// 5. NPC Strip and Quest Tracking Verification
it('SettlementEngine generates canonical NPC strip with relationship, realm, and quest indicators', () => {
    const data = settlementEngine.getSettlementPanoramaData('Desa Xingcun');
    assert(Array.isArray(data.npcStrip) && data.npcStrip.length >= 3, 'Must have at least 3 NPCs');
    data.npcStrip.forEach(npc => {
        assert(typeof npc.name === 'string', 'NPC must have name');
        assert(typeof npc.title === 'string', 'NPC must have title');
        assert(typeof npc.realm === 'string', 'NPC must have realm');
        assert(typeof npc.relationship === 'string', 'NPC must have relationship');
        assert(typeof npc.relationshipPoints === 'number', 'NPC must have relationshipPoints');
        assert(typeof npc.greeting === 'string', 'NPC must have greeting');
        assert(typeof npc.hasQuest === 'boolean', 'NPC must have hasQuest boolean');
    });
});

it('SettlementEngine provides quest tracking object with distance in cells', () => {
    const fakePlayer = { x: 2000, y: 2600 };
    const data = settlementEngine.getSettlementPanoramaData('Desa Xingcun', fakePlayer);
    assert(data.tracking, 'Tracking object must exist');
    assert(typeof data.tracking.title === 'string', 'Tracking must have title');
    assert(typeof data.tracking.targetLocation === 'string', 'Tracking must have targetLocation');
    assert(typeof data.tracking.distanceCells === 'number', 'distanceCells must be numeric');
    // Distance from (2000, 2600) to Xingcun (2050, 2650) is sqrt(50^2 + 50^2) = ~71
    assert.strictEqual(data.tracking.distanceCells, 71, 'distanceCells must match Euclidean distance');
});

// 6. Time of day and weather responsiveness
it('SettlementEngine returns valid timeOfDay and weather values', () => {
    const data = settlementEngine.getSettlementPanoramaData('Tianjing');
    assert(['dawn', 'day', 'dusk', 'night'].includes(data.timeOfDay), 'timeOfDay must be dawn/day/dusk/night');
    assert(typeof data.weather === 'string', 'weather must be defined');
});

console.log('\n========================================');
console.log(`HASIL: ${passedTests} LULUS, ${failedTests} GAGAL`);
console.log('========================================\n');

if (failedTests > 0) {
    process.exit(1);
}
