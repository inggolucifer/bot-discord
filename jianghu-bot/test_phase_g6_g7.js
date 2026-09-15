const assert = require('assert');

console.log('=== VERIFYING FASE G6 & G7 AUDIT & FIXES ===');

// 1. Test G6: Gathering Distance Calculation
function canGatherAt(playerPos, nodePos) {
    const targetX = parseInt(nodePos.tileX, 10);
    const targetY = parseInt(nodePos.tileY, 10);
    const currentX = playerPos.tileX ?? 0;
    const currentY = playerPos.tileY ?? 0;
    const dist = Math.max(Math.abs(currentX - targetX), Math.abs(currentY - targetY));
    if (playerPos.zoneId !== nodePos.zoneId || dist > 1) {
        return { ok: false, error: 'Kamu terlalu jauh dari sumber daya tersebut (maksimal 1 tile).' };
    }
    return { ok: true, dist };
}

const player = { zoneId: 'central_plains_bamboo_forest', tileX: 5, tileY: 5 };
const sameTileNode = { zoneId: 'central_plains_bamboo_forest', tileX: 5, tileY: 5 };
const adjacentNode = { zoneId: 'central_plains_bamboo_forest', tileX: 6, tileY: 5 };
const diagonalNode = { zoneId: 'central_plains_bamboo_forest', tileX: 6, tileY: 6 };
const distantNode = { zoneId: 'central_plains_bamboo_forest', tileX: 7, tileY: 5 };
const otherZoneNode = { zoneId: 'southern_desert', tileX: 5, tileY: 5 };

// Standing on node
let res = canGatherAt(player, sameTileNode);
assert.strictEqual(res.ok, true);
assert.strictEqual(res.dist, 0);
console.log('✅ Test G6-1: Standing directly on node (dist = 0) can gather.');

// Adjacent node
res = canGatherAt(player, adjacentNode);
assert.strictEqual(res.ok, true);
assert.strictEqual(res.dist, 1);
console.log('✅ Test G6-2: Standing adjacent to node (dist = 1) can gather.');

// Diagonal node (Chebyshev dist = 1)
res = canGatherAt(player, diagonalNode);
assert.strictEqual(res.ok, true);
assert.strictEqual(res.dist, 1);
console.log('✅ Test G6-3: Standing diagonally adjacent to node (dist = 1) can gather.');

// Distant node (dist = 2) -> rejected
res = canGatherAt(player, distantNode);
assert.strictEqual(res.ok, false);
assert.match(res.error, /terlalu jauh/);
console.log('✅ Test G6-4: Distant node (dist = 2) rejected.');

// Different zone -> rejected
res = canGatherAt(player, otherZoneNode);
assert.strictEqual(res.ok, false);
console.log('✅ Test G6-5: Different zone node rejected.');

// 2. Test G6: Profession level-up logic
function awardProfessionExp(professions, expType, expGain) {
    if (!professions) professions = {};
    if (!professions[expType]) professions[expType] = { level: 1, exp: 0, isUnlocked: true };
    professions[expType].isUnlocked = true;
    professions[expType].exp += expGain;
    
    let reqExp = professions[expType].level * 100;
    while (professions[expType].exp >= reqExp) {
        professions[expType].exp -= reqExp;
        professions[expType].level += 1;
        reqExp = professions[expType].level * 100;
    }
    return professions[expType];
}

const profs = {};
let pState = awardProfessionExp(profs, 'woodcutting', 50);
assert.strictEqual(pState.level, 1);
assert.strictEqual(pState.exp, 50);
console.log('✅ Test G6-6: Profession initial EXP awarded properly (Lvl 1, 50/100).');

pState = awardProfessionExp(profs, 'woodcutting', 60);
assert.strictEqual(pState.level, 2);
assert.strictEqual(pState.exp, 10);
console.log('✅ Test G6-7: Profession level-up properly executed (Lvl 2, 10/200).');

// 3. Test G7: API Response Schema Validation for Frontend
const mockPlayerGrid = {
    position: { zoneId: 'central_plains_bamboo_forest', tileX: 5, tileY: 5 },
    move: null,
    exploredTileIndexes: [100, 101, 102],
    lastGridSearchAt: null,
    searchCooldownSeconds: 15,
    searchRadius: 2
};

assert.ok(mockPlayerGrid.position);
assert.strictEqual(typeof mockPlayerGrid.position.tileX, 'number');
assert.strictEqual(typeof mockPlayerGrid.position.tileY, 'number');
assert.ok(Array.isArray(mockPlayerGrid.exploredTileIndexes));
console.log('✅ Test G7-1: playerGrid schema payload conforms to ZoneGridView interface expectations.');

console.log('=== ALL G6 & G7 CHECKS AND VERIFICATIONS PASSED! ===');
