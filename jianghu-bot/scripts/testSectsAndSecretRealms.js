/**
 * TEST SUITE: SECTS, SECRET REALMS & TRAVEL (FASE 15)
 * Verifies 8 Great Sect Gates, 4 Secret Realm Dungeons,
 * landmark synchronization, and canonical ferry travel parity.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const proceduralWorldEngine = require('../utils/proceduralWorldEngine');
const worldRegionEngine = require('../utils/worldRegionEngine');

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

console.log('\n=== TEST SUITE: SECTS, SECRET REALMS & TRAVEL (FASE 15) ===\n');

const ANCHORS_PATH = path.join(__dirname, '../world-data/anchors.json');
const anchors = JSON.parse(fs.readFileSync(ANCHORS_PATH, 'utf8'));

// 1. 8 Great Sect Gates
const EXPECTED_SECTS = [
    { id: 'sekte_awan_pedang', name: 'Sekte Awan Pedang', region: 'azure_mountain_range' },
    { id: 'sekte_pedang_langit', name: 'Sekte Pedang Langit', region: 'central_plains' },
    { id: 'kuil_lonceng_emas', name: 'Kuil Lonceng Emas', region: 'hermit_highlands' },
    { id: 'lembah_racun_bayangan', name: 'Lembah Racun Bayangan', region: 'southern_demon_domain' },
    { id: 'istana_giok_laut_timur', name: 'Istana Giok Laut Timur', region: 'eastern_sea' },
    { id: 'sekte_petir_ilahiah', name: 'Sekte Petir Ilahiah', region: 'thundersteppe' },
    { id: 'sekte_pasir_suci', name: 'Sekte Pasir Suci', region: 'western_sacred_desert' },
    { id: 'istana_es_abadi', name: 'Istana Es Abadi', region: 'northern_desolate' }
];

it('All 8 Great Sect Gates exist in anchors.json with valid non-solid placement', () => {
    EXPECTED_SECTS.forEach(s => {
        const found = anchors.find(a => a.id === s.id);
        assert(found, `Sect ${s.id} must exist in anchors.json`);
        assert.strictEqual(found.type, 'sect', `Sect ${s.id} type must be 'sect'`);
        assert.strictEqual(found.region, s.region, `Sect ${s.id} region must be ${s.region}`);

        const tile = proceduralWorldEngine.getTileAt(found.x, found.y);
        assert(!tile.isSolid, `Sect ${s.id} at (${found.x}, ${found.y}) must not be solid`);
        const reg = worldRegionEngine.getRegionAt(found.x, found.y);
        assert.strictEqual(reg.id, s.region, `Sect ${s.id} coordinates must resolve to region ${s.region}`);
    });
});

// 2. 4 Secret Realm Dungeons
const EXPECTED_SECRET_REALMS = [
    { id: 'gua_purba_bunga_aprikot', tier: 1 },
    { id: 'makam_kaisar_pedang_purba', tier: 3 },
    { id: 'reruntuhan_abadi_tianyuan', tier: 4 },
    { id: 'sarang_naga_karang_timur', tier: 3 }
];

it('All 4 Secret Realm Dungeons exist in anchors.json with non-solid entrypoints', () => {
    EXPECTED_SECRET_REALMS.forEach(sr => {
        const found = anchors.find(a => a.id === sr.id);
        assert(found, `Secret Realm ${sr.id} must exist in anchors.json`);
        assert.strictEqual(found.type, 'secret_realm', `Secret Realm ${sr.id} type must be 'secret_realm'`);
        assert.strictEqual(found.tier, sr.tier, `Secret Realm ${sr.id} tier must be ${sr.tier}`);

        const tile = proceduralWorldEngine.getTileAt(found.x, found.y);
        assert(!tile.isSolid, `Secret Realm ${sr.id} at (${found.x}, ${found.y}) must be walkable`);
    });
});

// 3. Ferry Travel Parity
it('Ferry routes destination coordinates match authoritative canonical coordinates', () => {
    const ferryFile = fs.readFileSync(path.join(__dirname, '../web-api/routes/ferry.js'), 'utf8');
    assert(ferryFile.includes('tileX: 3920, tileY: 2700'), 'Donghai Port ferry destination must be (3920, 2700)');
    assert(ferryFile.includes('tileX: 2050, tileY: 2650'), 'Xingcun ferry destination must be (2050, 2650)');
    assert(ferryFile.includes('tileX: 4350, tileY: 2750'), 'Turtle Island ferry destination must be (4350, 2750)');
    assert(!ferryFile.includes('tileX: 4200, tileY: 2700'), 'Old isolated deep water coordinate 4200 must be eliminated');
});

// 4. Zero-Portal Mandate for Travel Hubs
it('Zero-Portal Policy: Travel occurs exclusively via physical docks, caravan routes, and city gates', () => {
    anchors.forEach(a => {
        assert(!a.type.includes('portal'), `Anchor ${a.id} must not be a magical portal`);
        assert(!a.type.includes('teleport'), `Anchor ${a.id} must not be a teleport waypoint`);
    });
});

console.log('\n========================================');
console.log(`HASIL: ${passedTests} LULUS, ${failedTests} GAGAL`);
console.log('========================================\n');

if (failedTests > 0) {
    process.exit(1);
}
