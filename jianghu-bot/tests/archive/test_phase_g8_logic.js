const assert = require('assert');

console.log('=== VERIFYING FASE G8: GRID-BASED BARTER & NPC PROXIMITY LOGIC ===');

// 1. Chebyshev distance function used in routes
function getChebyshevDistance(posA, posB) {
    return Math.max(
        Math.abs((posA.tileX || 0) - (posB.tileX || 0)),
        Math.abs((posA.tileY || 0) - (posB.tileY || 0))
    );
}

function validateGridProximity(player1, player2, maxDist = 2) {
    if (player1.gridPosition?.zoneId || player2.gridPosition?.zoneId) {
        if (player1.gridPosition?.zoneId !== player2.gridPosition?.zoneId) {
            return { ok: false, error: 'Kalian tidak berada di zona grid yang sama.' };
        }
        const dist = getChebyshevDistance(player1.gridPosition, player2.gridPosition);
        if (dist > maxDist) {
            return { ok: false, error: `Jarak terlalu jauh untuk barter (jarak: ${dist} tile, maksimal: ${maxDist} tile).` };
        }
        return { ok: true, dist };
    }
    
    // Legacy fallback
    if (player1.currentLocation?.regionSlug !== player2.currentLocation?.regionSlug ||
        player1.currentLocation?.settlementName !== player2.currentLocation?.settlementName) {
        return { ok: false, error: 'Kalian tidak berada di lokasi yang sama.' };
    }
    return { ok: true, legacy: true };
}

// 2. Proximity validation tests
const p1 = { gridPosition: { zoneId: 'central_plains_bamboo_forest', tileX: 5, tileY: 5 } };
const p2_close1 = { gridPosition: { zoneId: 'central_plains_bamboo_forest', tileX: 6, tileY: 6 } };
const p2_boundary = { gridPosition: { zoneId: 'central_plains_bamboo_forest', tileX: 7, tileY: 7 } };
const p2_tooFar1 = { gridPosition: { zoneId: 'central_plains_bamboo_forest', tileX: 8, tileY: 5 } };
const p2_diffZone = { gridPosition: { zoneId: 'southern_desert_dune', tileX: 5, tileY: 5 } };

// Test 1: dist = 1 <= 2 -> OK
let res = validateGridProximity(p1, p2_close1);
assert.strictEqual(res.ok, true);
assert.strictEqual(res.dist, 1);
console.log('✅ Test 1 Passed: Close players (dist = 1) accepted.');

// Test 2: boundary dist = 2 <= 2 -> OK
res = validateGridProximity(p1, p2_boundary);
assert.strictEqual(res.ok, true);
assert.strictEqual(res.dist, 2);
console.log('✅ Test 2 Passed: Boundary distance (dist = 2) accepted.');

// Test 3: dist = 3 > 2 -> REJECTED
res = validateGridProximity(p1, p2_tooFar1);
assert.strictEqual(res.ok, false);
assert.match(res.error, /Jarak terlalu jauh/);
console.log('✅ Test 3 Passed: Player too far (dist = 3) rejected with error message.');

// Test 4: different zoneId -> REJECTED
res = validateGridProximity(p1, p2_diffZone);
assert.strictEqual(res.ok, false);
assert.match(res.error, /tidak berada di zona grid yang sama/);
console.log('✅ Test 4 Passed: Players in different zones rejected.');

// 3. NPC Proximity Validation Test
function validateNpcProximity(player, npc, maxDist = 2) {
    if (player.gridPosition?.zoneId) {
        const zoneId = player.gridPosition.zoneId;
        const px = player.gridPosition.tileX || 0;
        const py = player.gridPosition.tileY || 0;

        let npcZone = npc.zoneId;
        let npcX = npc.tileX;
        let npcY = npc.tileY;

        if (npcZone != null && npcX != null && npcY != null) {
            if (npcZone !== zoneId) {
                return { ok: false, error: 'NPC berada di zona yang berbeda.' };
            }
            const dist = Math.max(Math.abs(px - npcX), Math.abs(py - npcY));
            if (dist > maxDist) {
                return { ok: false, error: `Kamu terlalu jauh dari NPC ini (jarak: ${dist} tile, maksimal: ${maxDist} tile).` };
            }
            return { ok: true, dist };
        }
    }

    const location = player.currentLocation || { settlementName: 'Desa Xingcun', buildingName: null };
    if (npc.settlementName !== location.settlementName || (npc.buildingName || null) !== (location.buildingName || null)) {
        return { ok: false, error: 'Kamu tidak berada di lokasi yang sama dengan NPC ini.' };
    }

    return { ok: true, legacy: true };
}

const npcClose = { zoneId: 'central_plains_bamboo_forest', tileX: 6, tileY: 5, name: 'Tetua Roh' };
const npcFar = { zoneId: 'central_plains_bamboo_forest', tileX: 12, tileY: 15, name: 'Pendekar Pengasingan' };
const npcOtherZone = { zoneId: 'snowy_mountain', tileX: 5, tileY: 5, name: 'Petapa Salju' };

// Test 5: NPC within range (dist = 1) -> OK
res = validateNpcProximity(p1, npcClose);
assert.strictEqual(res.ok, true);
assert.strictEqual(res.dist, 1);
console.log('✅ Test 5 Passed: NPC nearby (dist = 1) accepted for talk/quest.');

// Test 6: NPC too far (dist = 10) -> REJECTED
res = validateNpcProximity(p1, npcFar);
assert.strictEqual(res.ok, false);
assert.match(res.error, /Kamu terlalu jauh dari NPC ini/);
console.log('✅ Test 6 Passed: Distant NPC rejected for talk/quest.');

// Test 7: NPC in different zone -> REJECTED
res = validateNpcProximity(p1, npcOtherZone);
assert.strictEqual(res.ok, false);
assert.match(res.error, /NPC berada di zona yang berbeda/);
console.log('✅ Test 7 Passed: NPC in different zone rejected.');

// Test 8: Legacy fallback when player has no gridPosition
const legacyPlayer = { currentLocation: { settlementName: 'Desa Xingcun', buildingName: 'Kedai Arak' } };
const legacyNpc = { settlementName: 'Desa Xingcun', buildingName: 'Kedai Arak' };
const legacyNpcOther = { settlementName: 'Kota Luoyang', buildingName: null };

res = validateNpcProximity(legacyPlayer, legacyNpc);
assert.strictEqual(res.ok, true);
assert.strictEqual(res.legacy, true);
console.log('✅ Test 8 Passed: Legacy settlement proximity fallback works.');

res = validateNpcProximity(legacyPlayer, legacyNpcOther);
assert.strictEqual(res.ok, false);
console.log('✅ Test 9 Passed: Legacy different settlement rejected.');

console.log('=== ALL FASE G8 CHEBYSHEV & PROXIMITY UNIT TESTS PASSED! ===');
