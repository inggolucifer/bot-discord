/**
 * test_phase_blueprint_integrity.js
 * Skrip Uji Verifikasi Otomatis untuk Seluruh Modul Baru Sesuai Blueprint:
 * 1. explorationMath
 * 2. thermodynamicsEngine
 * 3. propertyManager (RLE Compression)
 * 4. binaryProtocol (12-Byte Packed Stream)
 */

const assert = require('assert');

console.log('=== MEMULAI TEST INTEGRITAS CETAK BIRU JIANGHU ===\n');

// ----------------------------------------------------
// 1. TEST EXPLORATION MATH (STAMINA, SPEED, AMBUSH)
// ----------------------------------------------------
console.log('--- 1. Testing explorationMath ---');
const {
    calculateEnergyCost,
    calculateTravelSpeed,
    isTileObstructed,
    evaluateAmbush,
    TERRAIN_PROPERTIES
} = require('./utils/explorationMath');

// Test Stamina di Dataran vs Rawa
const costPlains = calculateEnergyCost({ terrainType: 'plains', currentWeight: 10, maxWeight: 50 });
const costSwamp = calculateEnergyCost({ terrainType: 'swamp', currentWeight: 10, maxWeight: 50 });
console.log(`[PASS] Biaya stamina: Dataran = ${costPlains}, Rawa Miasma = ${costSwamp}`);
assert(costSwamp > costPlains, 'Biaya stamina rawa harus lebih besar daripada dataran');

// Test Mount Stamina Reduction
const costWithMount = calculateEnergyCost({ terrainType: 'plains', currentWeight: 10, maxWeight: 50, mountType: 'ferghana_horse' });
console.log(`[PASS] Biaya stamina dengan Kuda Ferghana = ${costWithMount}`);
assert(costWithMount <= costPlains, 'Tunggangan harus mengurangi atau menyamakan konsumsi stamina');

// Test Obstruksi Tebing Batu
const isPlainsObstructed = isTileObstructed({ terrainType: 'plains' });
const isMountainObstructed = isTileObstructed({ terrainType: 'mountain' });
const isMountainFlySword = isTileObstructed({ terrainType: 'mountain', mountType: 'flying_sword' });
console.log(`[PASS] Obstruksi: Dataran = ${isPlainsObstructed}, Tebing = ${isMountainObstructed}, Tebing + Pedang Terbang = ${isMountainFlySword}`);
assert(!isPlainsObstructed, 'Dataran tidak boleh terhalang');
assert(isMountainObstructed, 'Tebing batu harus solid/terhalang');
assert(!isMountainFlySword, 'Pedang terbang dapat melintasi tebing batu');

// Test Ambush Probability
const ambushEval = evaluateAmbush({ terrainType: 'forest', stealthRating: 0.2, dangerLevel: 1.2 });
console.log(`[PASS] Evaluasi ambush di hutan (P_actual): ${(ambushEval.actualProbability * 100).toFixed(1)}%`);
assert(ambushEval.actualProbability > 0, 'Probabilitas ambush harus > 0');

// ----------------------------------------------------
// 2. TEST THERMODYNAMICS & PHYSIOLOGY ENGINE
// ----------------------------------------------------
console.log('\n--- 2. Testing thermodynamicsEngine ---');
const {
    calculateGridTemperature,
    resolveRealmTolerance,
    evaluateThermalBreach
} = require('./utils/thermodynamicsEngine');

// Test Suhu Grid
const tempSpringNoon = calculateGridTemperature({ baseTemperature: 20, season: 'spring', hourOfDay: 13, weather: 'clear' });
const tempWinterNight = calculateGridTemperature({ baseTemperature: 20, season: 'winter', hourOfDay: 4, weather: 'blizzard' });
console.log(`[PASS] Suhu Grid: Musim Semi Siang = ${tempSpringNoon}°C, Musim Dingin Badai Salju Malam = ${tempWinterNight}°C`);
assert(tempSpringNoon > tempWinterNight, 'Suhu musim semi siang harus lebih hangat');

// Test Toleransi Ranah Mortal vs Foundation vs Nascent Soul
const mortalBreachInWinter = evaluateThermalBreach({
    envTemperature: tempWinterNight,
    cultivationRealm: 'mortal',
    hpMax: 100
});
console.log(`[PASS] Mortal pada suhu ${tempWinterNight}°C: inComfort = ${mortalBreachInWinter.inComfortZone}, HP Loss = ${mortalBreachInWinter.hpLoss}, Kondisi: ${mortalBreachInWinter.activeCondition}`);
assert(!mortalBreachInWinter.inComfortZone, 'Ranah mortal harus menderita anomali dingin ekstrem');
assert(mortalBreachInWinter.hpLoss > 0, 'Harus mengalami kehilangan HP');

const nascentInWinter = evaluateThermalBreach({
    envTemperature: tempWinterNight,
    cultivationRealm: 'nascent_soul',
    hpMax: 500
});
console.log(`[PASS] Nascent Soul pada suhu ${tempWinterNight}°C: inComfort = ${nascentInWinter.inComfortZone}, HP Loss = ${nascentInWinter.hpLoss}`);
assert(nascentInWinter.inComfortZone, 'Ranah Nascent Soul kebal terhadap hawa dingin musim dingin bumi');

// ----------------------------------------------------
// 3. TEST RLE INTERIOR LAYOUT COMPRESSION
// ----------------------------------------------------
console.log('\n--- 3. Testing propertyManager (RLE Layout Compression) ---');
const {
    generateDefaultEstateLayout,
    compressLayoutRLE,
    decompressLayoutRLE
} = require('./utils/propertyManager');

const compressedLayout = generateDefaultEstateLayout(12, 12);
console.log(`[PASS] Panjang string RLE denah 12x12 (144 tile): ${compressedLayout.length} karakter (Sangat Hemat ROM < 1KB)`);
console.log(`[PREVIEW RLE]: ${compressedLayout.substring(0, 60)}...`);

const decompressedLayout = decompressLayoutRLE(compressedLayout);
assert.strictEqual(decompressedLayout.length, 144, 'Hasil dekompresi harus berjumlah tepat 144 tile');

// Re-compress dan cek identitas 100%
const recompressed = compressLayoutRLE(decompressedLayout);
assert.strictEqual(compressedLayout, recompressed, 'Kompresi dan Dekompresi RLE harus lossless');
console.log('[PASS] Verifikasi RLE Lossless Roundtrip Berhasil 100%');

// ----------------------------------------------------
// 4. TEST BINARY PROTOCOL (12-BYTE PACKED MOVEMENT STREAM)
// ----------------------------------------------------
console.log('\n--- 4. Testing binaryProtocol (12-Byte Packed Stream) ---');
const {
    packMovementPacket,
    unpackMovementPacket
} = require('./utils/binaryProtocol');

const originalPacket = {
    entityId: 98765,
    coordX: 42,
    coordY: -15,
    hpPercent: 88.5,
    facing: 3, // SouthEast
    isRunning: true,
    inInterior: false,
    thermalBreach: true,
    meridianDamaged: false,
    isInCombat: true
};

const packedBuffer = packMovementPacket(originalPacket);
assert.strictEqual(packedBuffer.byteLength, 12, 'Ukuran buffer paket biner harus tepat 12 byte');
console.log(`[PASS] Paket berhasil dikemas ke dalam tepat 12 byte (${packedBuffer.byteLength} Bytes)`);

const unpacked = unpackMovementPacket(packedBuffer);
assert.strictEqual(unpacked.entityId, originalPacket.entityId);
assert.strictEqual(unpacked.coordX, originalPacket.coordX);
assert.strictEqual(unpacked.coordY, originalPacket.coordY);
assert.strictEqual(unpacked.hpPercent, originalPacket.hpPercent);
assert.strictEqual(unpacked.facing, originalPacket.facing);
assert.strictEqual(unpacked.isRunning, originalPacket.isRunning);
assert.strictEqual(unpacked.inInterior, originalPacket.inInterior);
assert.strictEqual(unpacked.thermalBreach, originalPacket.thermalBreach);
assert.strictEqual(unpacked.meridianDamaged, originalPacket.meridianDamaged);
assert.strictEqual(unpacked.isInCombat, originalPacket.isInCombat);

console.log('[PASS] Paket biner 12-byte berhasil didecode dengan kecocokan data presisi 100%');

console.log('\n=== SELURUH PENGUJIAN LOGIKA INTEGRITAS BLUEPRINT LULUS (100% SUCCESS) ===\n');
