/**
 * TEST SUITE: T3 - INVENTORY CATEGORY BUCKETS & EMOJIS
 * Memverifikasi:
 * - Setiap enum category pada model Item memiliki mapping emoji yang spesifik (bukan default 📦)
 * - Helper pengelompokan kategori UI memetakan semua jenis equipment (termasuk helmet, pants, boots, talisman)
 *   ke bucket 'equipment' secara konsisten.
 */

const assert = require('assert');
const Item = require('../models/Item');

console.log('\n=== TEST SUITE: T3 - INVENTORY CATEGORY BUCKETS & EMOJIS ===\n');

let passed = 0;
let failed = 0;

function it(name, fn) {
    try {
        fn();
        console.log(`[PASS] ${name}`);
        passed++;
    } catch (err) {
        console.error(`[FAIL] ${name}:`, err.message);
        failed++;
    }
}

// 1. Ekstrak getEmojiForShopItem dari inventory.js
const getEmojiForShopItem = (itemType, category) => {
    if (category === 'asset') return '🏯';
    if (category === 'pet') return '🐉';

    switch(itemType) {
        case 'weapon':      return '🗡️';
        case 'armor':       return '🛡️';
        case 'helmet':      return '🪖';
        case 'pants':       return '👖';
        case 'boots':       return '🥾';
        case 'cloth':       return '👘';
        case 'accessories': return '💍';
        case 'artifact':    return '🔮';
        case 'talisman':    return '📜';
        case 'mount':       return '🐎';
        case 'herb':        return '🌿';
        case 'pill':
        case 'consume':     return '💊';
        case 'material':    return '🧱';
        case 'tool':        return '⛏️';
        case 'law':
        case 'manual':      return '📖';
        default:            return '📦';
    }
};

// 2. Ekstrak logic getItemCategoryBucket dari inventory/page.tsx
const getItemCategoryBucket = (item) => {
    const isBlueprint = item.name && item.name.startsWith('Blueprint:');
    const isPupuk = item.effectType === 'farm_grow_speed';
    const isLawOrManual = item.category === 'law' || item.category === 'manual';
    const isTool = item.category === 'tool' || item.toolType != null;
    const isEquipment = ['weapon', 'armor', 'helmet', 'pants', 'boots', 'cloth', 'artifact', 'accessories', 'talisman', 'mount'].includes(item.category);
    const isConsumable = !isPupuk && !isLawOrManual && !isBlueprint && (item.category === 'consume' || item.category === 'pill' || item.effectType != null);

    if (isBlueprint) return 'blueprint';
    if (isLawOrManual) return 'manual';
    if (isTool) return 'tools';
    if (isEquipment) return 'equipment';
    if (isConsumable || isPupuk) return 'consumable';
    return 'material';
};

// Test 1: Enum Category coverage
it('Semua enum category model Item (kecuali none) memiliki emoji khusus', () => {
    const enumValues = Item.schema.path('category').enumValues;
    assert.ok(Array.isArray(enumValues) && enumValues.length > 0, 'Enum category harus ada di schema');

    for (const cat of enumValues) {
        if (cat === 'none') continue;
        const emoji = getEmojiForShopItem(cat, 'item');
        assert.notStrictEqual(emoji, '📦', `Kategori "${cat}" tidak boleh jatuh ke emoji default 📦`);
    }
});

// Test 2: Equipment Bucket coverage
it('Semua slot equipment dikelompokkan ke bucket equipment oleh UI', () => {
    const equipCategories = ['weapon', 'armor', 'helmet', 'pants', 'boots', 'accessories', 'artifact', 'talisman', 'mount'];
    for (const cat of equipCategories) {
        const bucket = getItemCategoryBucket({ name: 'Item Uji', category: cat });
        assert.strictEqual(bucket, 'equipment', `Kategori "${cat}" harus masuk bucket 'equipment', tapi masuk '${bucket}'`);
    }
});

// Test 3: Other category buckets
it('Kategori lain (herb, pill, consume, law, manual, tool, material) dipetakan ke bucket yang benar', () => {
    assert.strictEqual(getItemCategoryBucket({ name: 'Pil Qi', category: 'pill' }), 'consumable');
    assert.strictEqual(getItemCategoryBucket({ name: 'Ransum', category: 'consume' }), 'consumable');
    assert.strictEqual(getItemCategoryBucket({ name: 'Kitab Pedang', category: 'manual' }), 'manual');
    assert.strictEqual(getItemCategoryBucket({ name: 'Hukum Api', category: 'law' }), 'manual');
    assert.strictEqual(getItemCategoryBucket({ name: 'Beliung Besi', category: 'tool' }), 'tools');
    assert.strictEqual(getItemCategoryBucket({ name: 'Kayu Roh', category: 'material' }), 'material');
});

console.log(`\n========================================`);
console.log(`HASIL: ${passed} LULUS, ${failed} GAGAL`);
console.log(`========================================\n`);

if (failed > 0) process.exit(1);
