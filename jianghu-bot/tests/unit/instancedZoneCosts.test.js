/**
 * tests/unit/instancedZoneCosts.test.js
 * Pengujian komprehensif modul biaya masuk zona instans dengan model Mongoose Player ASLI (V26 P2)
 */

const mongoose = require('mongoose');
const Player = require('../../models/Player');
const {
  requiredItems,
  countOwned,
  checkEntryCost,
  applyEntryCost
} = require('../../utils/instancedZoneCosts');

describe('V26 P2 — Instanced Zone Pure Cost Logic & Real Mongoose Model Verification', () => {
  const spiritKeyId = new mongoose.Types.ObjectId();
  const spiritFruitId = new mongoose.Types.ObjectId();
  const spiritStoneId = new mongoose.Types.ObjectId();

  const mockItemIdByKey = new Map([
    ['item_spirit_key', spiritKeyId],
    ['item_spirit_fruit', spiritFruitId],
    ['item_spirit_stone_low', spiritStoneId]
  ]);

  function createRealPlayer(customAttrs = {}) {
    return new Player({
      characterName: 'PendekarAsli',
      discordId: 'real_discord_123',
      guildId: 'global_guild',
      currentStamina: 100,
      inventory: [
        { itemId: spiritKeyId, quantity: 2 },
        { itemId: spiritFruitId, quantity: 10 },
        { itemId: spiritStoneId, quantity: 500 }
      ],
      ...customAttrs
    });
  }

  it('1. requiredItems memetakan cost.item, cost.spiritFruits, dan cost.spiritStones secara tepat', () => {
    const cost = {
      stamina: 10,
      item: 'item_spirit_key',
      spiritFruits: 5,
      spiritStones: 500
    };
    const reqs = requiredItems(cost);
    expect(reqs).toEqual([
      { itemKey: 'item_spirit_key', quantity: 1 },
      { itemKey: 'item_spirit_fruit', quantity: 5 },
      { itemKey: 'item_spirit_stone_low', quantity: 500 }
    ]);
  });

  it('2. countOwned menghitung kuantitas item dari inventaris Player asli dengan benar', () => {
    const p = createRealPlayer();
    expect(countOwned(p, spiritKeyId)).toBe(2);
    expect(countOwned(p, spiritFruitId)).toBe(10);
    expect(countOwned(p, spiritStoneId)).toBe(500);
    expect(countOwned(p, new mongoose.Types.ObjectId())).toBe(0);
  });

  it('3. checkEntryCost lulus ketika stamina cukup', () => {
    const p = createRealPlayer({ currentStamina: 50 });
    const res = checkEntryCost(p, { stamina: 10 }, mockItemIdByKey);
    expect(res.ok).toBe(true);
  });

  it('4. checkEntryCost gagal ketika stamina kurang dan menyebutkan jumlah', () => {
    const p = createRealPlayer({ currentStamina: 5 });
    const res = checkEntryCost(p, { stamina: 10 }, mockItemIdByKey);
    expect(res.ok).toBe(false);
    expect(res.error).toContain('Stamina tidak mencukupi');
    expect(res.error).toContain('memerlukan 10');
    expect(res.error).toContain('dimiliki 5');
  });

  it('5. checkEntryCost lulus ketika kunci roh cukup', () => {
    const p = createRealPlayer();
    const res = checkEntryCost(p, { item: 'item_spirit_key' }, mockItemIdByKey);
    expect(res.ok).toBe(true);
  });

  it('6. checkEntryCost gagal ketika kunci roh kurang', () => {
    const p = createRealPlayer({ inventory: [] });
    const res = checkEntryCost(p, { item: 'item_spirit_key' }, mockItemIdByKey);
    expect(res.ok).toBe(false);
    expect(res.error).toContain('item_spirit_key tidak mencukupi');
    expect(res.error).toContain('kurang 1');
  });

  it('7. checkEntryCost lulus ketika buah roh (spiritFruits) cukup', () => {
    const p = createRealPlayer();
    const res = checkEntryCost(p, { spiritFruits: 5 }, mockItemIdByKey);
    expect(res.ok).toBe(true);
  });

  it('8. checkEntryCost gagal ketika buah roh kurang', () => {
    const p = createRealPlayer({ inventory: [{ itemId: spiritFruitId, quantity: 2 }] });
    const res = checkEntryCost(p, { spiritFruits: 5 }, mockItemIdByKey);
    expect(res.ok).toBe(false);
    expect(res.error).toContain('item_spirit_fruit tidak mencukupi');
    expect(res.error).toContain('kurang 3');
  });

  it('9. checkEntryCost lulus ketika batu roh (spiritStones) cukup', () => {
    const p = createRealPlayer();
    const res = checkEntryCost(p, { spiritStones: 500 }, mockItemIdByKey);
    expect(res.ok).toBe(true);
  });

  it('10. checkEntryCost gagal ketika batu roh kurang', () => {
    const p = createRealPlayer({ inventory: [{ itemId: spiritStoneId, quantity: 100 }] });
    const res = checkEntryCost(p, { spiritStones: 500 }, mockItemIdByKey);
    expect(res.ok).toBe(false);
    expect(res.error).toContain('item_spirit_stone_low tidak mencukupi');
    expect(res.error).toContain('kurang 400');
  });

  it('11. checkEntryCost memvalidasi biaya majemuk (kombinasi item + stamina)', () => {
    const p = createRealPlayer({ currentStamina: 100 });
    const res = checkEntryCost(p, { stamina: 10, item: 'item_spirit_key', spiritFruits: 2 }, mockItemIdByKey);
    expect(res.ok).toBe(true);
  });

  it('12. countOwned menggabungkan slot terbagi di dua entri inventaris', () => {
    const p = createRealPlayer({
      inventory: [
        { itemId: spiritKeyId, quantity: 2 },
        { itemId: spiritKeyId, quantity: 3 }
      ]
    });
    expect(countOwned(p, spiritKeyId)).toBe(5);
    const res = checkEntryCost(p, { item: 'item_spirit_key' }, mockItemIdByKey);
    expect(res.ok).toBe(true);
  });

  it('13. checkEntryCost gagal transparan jika itemKey hilang dari peta itemIdByKey', () => {
    const p = createRealPlayer();
    const res = checkEntryCost(p, { item: 'item_non_existent' }, mockItemIdByKey);
    expect(res.ok).toBe(false);
    expect(res.error).toBe('Item item_non_existent belum tersedia di dunia.');
  });

  it('14. applyEntryCost mengurangi stamina dan item secara benar serta menghapus slot yang 0', () => {
    const p = createRealPlayer({
      currentStamina: 100,
      inventory: [
        { itemId: spiritKeyId, quantity: 1 },
        { itemId: spiritFruitId, quantity: 5 }
      ]
    });

    applyEntryCost(p, { stamina: 25, item: 'item_spirit_key', spiritFruits: 3 }, mockItemIdByKey);

    expect(p.currentStamina).toBe(75);
    expect(p.inventory.length).toBe(1);
    expect(String(p.inventory[0].itemId)).toBe(String(spiritFruitId));
    expect(p.inventory[0].quantity).toBe(2);
    expect(countOwned(p, spiritKeyId)).toBe(0);
  });

  it('15. currentStamina turun dan tidak pernah jatuh di bawah 0', () => {
    const p = createRealPlayer({ currentStamina: 10, inventory: [] });
    applyEntryCost(p, { stamina: 10 }, mockItemIdByKey);
    expect(p.currentStamina).toBe(0);
  });

  it('16. BUKTI SKEMA MONGOOSE: penugasan silver dan spiritStones tingkat atas DIBUANG DIAM-DIAM oleh Mongoose toObject()', () => {
    const p = createRealPlayer();
    p.silver = 5;
    p.spiritStones = 5;
    p.currency.silver = 50;

    const raw = p.toObject();
    expect(raw.silver).toBeUndefined();
    expect(raw.spiritStones).toBeUndefined();
    expect(raw.currency.silver).toBe(50);
  });

  it('17. applyEntryCost melempar Error jika biaya tidak mencukupi', () => {
    const p = createRealPlayer({ currentStamina: 5, inventory: [] });
    expect(() => {
      applyEntryCost(p, { stamina: 20 }, mockItemIdByKey);
    }).toThrow(/Stamina tidak mencukupi/);
  });
});
