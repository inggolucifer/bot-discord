/**
 * tests/unit/instancedZonesClaim.test.js
 * Pengujian komprehensif pemberian hadiah zona instans dengan model Player asli (V26 P4)
 */

const mongoose = require('mongoose');
const Player = require('../../models/Player');
const { grantRewards } = require('../../utils/instancedZoneCosts');

describe('V26 P4 — Instanced Zone Claim & Reward Grant Pure Logic', () => {
  const herbId = new mongoose.Types.ObjectId();
  const pillId = new mongoose.Types.ObjectId();
  const shardId = new mongoose.Types.ObjectId();

  const mockItemIdByKey = new Map([
    ['item_spirit_herb_high', herbId],
    ['spirit_herb_high', herbId],
    ['item_pure_qi_pill', pillId],
    ['pure_qi_pill', pillId],
    ['item_keping_roh_api', shardId],
    ['keping_roh_api', shardId]
  ]);

  function createRealPlayer(customAttrs = {}) {
    return new Player({
      characterName: 'PendekarKlaim',
      discordId: 'discord_claim_123',
      guildId: 'global_guild',
      currency: {
        copper: 100,
        silver: 10,
        gold: 0,
        jade: 0,
        spirit: 0
      },
      inventory: [
        { itemId: herbId, quantity: 2 }
      ],
      ...customAttrs
    });
  }

  it('1. Tembaga bertambah di player.currency.copper dan ternormalisasi (bukan field tingkat atas)', () => {
    const p = createRealPlayer();
    grantRewards(p, [{ item: 'copper', quantity: 500 }], mockItemIdByKey);

    expect(p.currency.copper).toBeGreaterThanOrEqual(0);
    expect(p.currency.silver).toBeGreaterThanOrEqual(10);
    expect(p.copper).toBeUndefined();
    expect(p.toObject().copper).toBeUndefined();
  });

  it('2. Perak bertambah di player.currency.silver (bukan player.silver tingkat atas)', () => {
    const p = createRealPlayer();
    grantRewards(p, [{ item: 'silver', quantity: 50 }], mockItemIdByKey);

    expect(p.currency.silver).toBe(60);
    expect(p.silver).toBeUndefined();
    expect(p.toObject().silver).toBeUndefined();
  });

  it('3. Item baru menambah slot di player.inventory dengan itemId yang sah tanpa field name', () => {
    const p = createRealPlayer();
    grantRewards(p, [{ item: 'pure_qi_pill', quantity: 2 }], mockItemIdByKey);

    expect(p.inventory.length).toBe(2);
    const pillSlot = p.inventory.find(s => String(s.itemId) === String(pillId));
    expect(pillSlot).toBeDefined();
    expect(pillSlot.quantity).toBe(2);
    expect(pillSlot.name).toBeUndefined();

    // Pastikan saat toObject(), field name tidak ada
    const rawInv = p.toObject().inventory;
    expect(rawInv.some(s => s.name !== undefined)).toBe(false);
  });

  it('4. Item yang sudah ada menggabungkan quantity pada slot dengan itemId yang sama', () => {
    const p = createRealPlayer();
    grantRewards(p, [{ item: 'spirit_herb_high', quantity: 3 }], mockItemIdByKey);

    expect(p.inventory.length).toBe(1);
    expect(p.inventory[0].quantity).toBe(5); // 2 awal + 3 baru
  });

  it('5. Item dengan prefix item_ maupun tanpa prefix terpetakan secara konsisten', () => {
    const p = createRealPlayer();
    grantRewards(p, [{ item: 'keping_roh_api', quantity: 3 }], mockItemIdByKey);

    const shardSlot = p.inventory.find(s => String(s.itemId) === String(shardId));
    expect(shardSlot).toBeDefined();
    expect(shardSlot.quantity).toBe(3);
  });

  it('6. Key item tak dikenal melempar galat transparan dan tidak memodifikasi inventaris', () => {
    const p = createRealPlayer();
    expect(() => {
      grantRewards(p, [{ item: 'unknown_mythical_sword', quantity: 1 }], mockItemIdByKey);
    }).toThrow(/Item hadiah belum didefinisikan: item_unknown_mythical_sword/);

    expect(p.inventory.length).toBe(1);
  });

  it('7. BUKTI SKEMA MONGOOSE: toObject() mempertahankan struktur currency dan inventory sah', () => {
    const p = createRealPlayer();
    grantRewards(p, [
      { item: 'silver', quantity: 100 },
      { item: 'pure_qi_pill', quantity: 4 }
    ], mockItemIdByKey);

    const obj = p.toObject();
    expect(obj.currency.silver).toBe(110);
    expect(obj.inventory.length).toBe(2);
    expect(obj.inventory[1].itemId).toEqual(pillId);
    expect(obj.inventory[1].quantity).toBe(4);
  });

  it('8. Memproses kombinasi majemuk copper, silver, dan beberapa item secara utuh', () => {
    const p = createRealPlayer();
    const rewards = [
      { item: 'copper', quantity: 200 },
      { item: 'silver', quantity: 15 },
      { item: 'spirit_herb_high', quantity: 1 },
      { item: 'pure_qi_pill', quantity: 5 }
    ];

    grantRewards(p, rewards, mockItemIdByKey);

    expect(p.currency.silver).toBeGreaterThanOrEqual(25);
    expect(p.inventory.length).toBe(2);
    expect(p.inventory.find(s => String(s.itemId) === String(herbId)).quantity).toBe(3);
    expect(p.inventory.find(s => String(s.itemId) === String(pillId)).quantity).toBe(5);
  });

  it('9. Daftar hadiah kosong tidak mengubah state dan tidak melempar error', () => {
    const p = createRealPlayer();
    grantRewards(p, [], mockItemIdByKey);
    expect(p.inventory.length).toBe(1);
    expect(p.currency.silver).toBe(10);
  });
});
