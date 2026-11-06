/**
 * tests/unit/coreItemsV26.test.js
 * Verifikasi definisi item inti, material zona instans, dan katalog toko (V26 P1)
 */

// describe, it, expect disediakan secara otomatis sebagai globals oleh Vitest (globals: true)
const { CORE_ITEMS_DEFINITIONS } = require('../../services/coreItems');
const { SHOP_ITEM_KEYS } = require('../../services/coreShop');

const VALID_CURRENCIES = ['copper', 'silver', 'gold', 'jade', 'spirit'];

const EXPECTED_P1_2_ITEMS = [
  'item_spirit_key',
  'item_spirit_fruit',
  'item_spirit_stone_low',
  'item_spirit_herb_high',
  'item_pure_qi_pill'
];

const EXPECTED_ELEMENT_SHARDS = [
  'keping_roh_api',
  'keping_roh_air',
  'keping_roh_kayu',
  'keping_roh_logam',
  'keping_roh_tanah'
];

describe('V26 P1 — Core Items Definitions & Shop Listings Integrity', () => {
  it('1. CORE_ITEMS_DEFINITIONS diekspor dan berupa array tidak kosong', () => {
    expect(Array.isArray(CORE_ITEMS_DEFINITIONS)).toBe(true);
    expect(CORE_ITEMS_DEFINITIONS.length).toBeGreaterThan(0);
  });

  it('2. Semua itemKey di CORE_ITEMS_DEFINITIONS bersifat unik (zero duplicate)', () => {
    const keys = CORE_ITEMS_DEFINITIONS.map(i => i.itemKey).filter(Boolean);
    const set = new Set(keys);
    expect(keys.length).toBe(set.size);
  });

  it('3. Setiap itemKey di daftar P1.2 ada tepat satu kali', () => {
    for (const key of EXPECTED_P1_2_ITEMS) {
      const matches = CORE_ITEMS_DEFINITIONS.filter(i => i.itemKey === key);
      expect(matches.length).toBe(1);
    }
  });

  it('4. Setiap entri memiliki field wajib: name, category, type, buyPrice, dan priceCurrency yang valid', () => {
    for (const item of CORE_ITEMS_DEFINITIONS) {
      expect(item.name).toBeDefined();
      expect(typeof item.name).toBe('string');
      expect(item.category).toBeDefined();
      expect(typeof item.category).toBe('string');
      expect(item.type).toBeDefined();
      expect(typeof item.type).toBe('string');
      expect(item.buyPrice).toBeDefined();
      expect(typeof item.buyPrice).toBe('number');
      expect(VALID_CURRENCIES).toContain(item.priceCurrency);
    }
  });

  it('5. Setiap shardKey di engine instans memiliki pasangan item_<shardKey> di CORE_ITEMS_DEFINITIONS', () => {
    for (const shard of EXPECTED_ELEMENT_SHARDS) {
      const expectedKey = `item_${shard}`;
      const item = CORE_ITEMS_DEFINITIONS.find(i => i.itemKey === expectedKey);
      expect(item).toBeDefined();
      expect(item.category).toBe('material');
      expect(item.type).toBe('material');
      expect(item.tier).toBeGreaterThanOrEqual(1);
    }
  });

  it('6. Kunci Roh (item_spirit_key) terdefinisi dengan harga 3 Gold', () => {
    const keyItem = CORE_ITEMS_DEFINITIONS.find(i => i.itemKey === 'item_spirit_key');
    expect(keyItem).toBeDefined();
    expect(keyItem.name).toBe('Kunci Roh');
    expect(keyItem.category).toBe('material');
    expect(keyItem.buyPrice).toBe(3);
    expect(keyItem.priceCurrency).toBe('gold');
    expect(keyItem.tier).toBe(2);
    expect(keyItem.isTradeable).toBe(true);
  });

  it('7. Pil Intisari Qi (item_pure_qi_pill) memiliki category pill', () => {
    const pill = CORE_ITEMS_DEFINITIONS.find(i => i.itemKey === 'item_pure_qi_pill');
    expect(pill).toBeDefined();
    expect(pill.name).toBe('Pil Intisari Qi');
    expect(pill.category).toBe('pill');
  });

  it('8. SHOP_ITEM_KEYS memuat 5 item kunci yang wajib dijual di katalog toko', () => {
    expect(SHOP_ITEM_KEYS).toEqual([
      'item_monster_repellent_charm',
      'item_monster_attraction_charm',
      'item_spirit_key',
      'item_spirit_fruit',
      'item_spirit_stone_low'
    ]);
  });
});
