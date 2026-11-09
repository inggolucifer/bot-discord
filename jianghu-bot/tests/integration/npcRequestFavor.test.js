const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const Player = require('../../models/Player');
const Npc = require('../../models/Npc');
const Item = require('../../models/Item');
const NpcPlayerRelation = require('../../models/NpcPlayerRelation');
const { evaluateAction } = require('../../services/npcActions');

describe('NPC request_favor Ghost Item & Inventory Invariants (P2 Integration)', () => {
  let mongoServer;
  let testItemValid;
  let testItemEquip;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    testItemValid = await Item.create({
      guildId: 'global',
      name: 'Pil Pemulih Roh',
      type: 'consumable',
      category: 'pill',
      tier: 1,
      description: 'Pil pemulih energi spiritual dasar.'
    });

    testItemEquip = await Item.create({
      guildId: 'global',
      name: 'Pedang Azure Purba',
      type: 'weapon',
      category: 'weapon',
      tier: 2,
      description: 'Pedang pusaka yang terpasang.'
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) await mongoServer.stop();
  });

  it('1. Item terpasang (!equippedSlot) TIDAK diambil oleh request_favor', async () => {
    const player = new Player({
      characterName: 'Penguji 1',
      discordId: 'favor_user_1',
      currentStamina: 50,
      stamina: 50,
      inventory: []
    });

    const npc = new Npc({
      name: 'Tetua Berzirah',
      inventory: [
        {
          itemId: testItemEquip._id,
          name: testItemEquip.name,
          quantity: 1,
          equippedSlot: 'weapon' // TERPASANG: Dilarang diambil
        },
        {
          itemId: testItemValid._id,
          name: testItemValid.name,
          quantity: 2,
          equippedSlot: null // BEBAS: Boleh diambil
        }
      ]
    });

    const relation = new NpcPlayerRelation({
      playerId: player._id,
      npcId: npc._id,
      affinity: 80
    });

    const res = await evaluateAction('request_favor', { player, npc, relation });

    expect(res.success).toBe(true);
    expect(res.resultData.receivedItem).toBe(testItemValid.name);
    // Item terpasang tetap ada di NPC dengan kuantitas utuh
    expect(npc.inventory.find(i => i.equippedSlot === 'weapon').quantity).toBe(1);
    // Item bebas berkurang 1 (dari 2 menjadi 1)
    expect(npc.inventory.find(i => !i.equippedSlot).quantity).toBe(1);
  });

  it('2. Item tanpa definisi di koleksi Item dilewati', async () => {
    const player = new Player({
      characterName: 'Penguji 2',
      discordId: 'favor_user_2',
      currentStamina: 50,
      stamina: 50,
      inventory: []
    });

    const npc = new Npc({
      name: 'Tetua Mistis',
      inventory: [
        {
          name: 'Barang Hantu Fiktif Yang Tidak Terdaftar Di Item DB',
          quantity: 1,
          equippedSlot: null
          // Tanpa itemId dan tidak ada di koleksi Item -> WAJIB DILEWATI
        },
        {
          name: testItemValid.name,
          quantity: 1,
          equippedSlot: null
          // Tanpa itemId pada slot NPC, tapi namanya terdaftar di DB -> BISA DISINKRONKAN
        }
      ]
    });

    const relation = new NpcPlayerRelation({
      playerId: player._id,
      npcId: npc._id,
      affinity: 75
    });

    const res = await evaluateAction('request_favor', { player, npc, relation });

    expect(res.success).toBe(true);
    expect(res.resultData.receivedItem).toBe(testItemValid.name);
    // Item hantu tidak diberikan ke pemain
    expect(player.inventory.some(i => i.name === 'Barang Hantu Fiktif Yang Tidak Terdaftar Di Item DB')).toBe(false);
  });

  it('3. Item pemain memiliki itemId yang VALID dan terdaftar di koleksi Item DB (tidak ada ObjectId baru)', async () => {
    const player = new Player({
      characterName: 'Penguji 3',
      discordId: 'favor_user_3',
      currentStamina: 50,
      stamina: 50,
      inventory: []
    });

    const npc = new Npc({
      name: 'Bibi Lan',
      inventory: [
        {
          itemId: testItemValid._id,
          name: testItemValid.name,
          quantity: 3,
          equippedSlot: null
        }
      ]
    });

    const relation = new NpcPlayerRelation({
      playerId: player._id,
      npcId: npc._id,
      affinity: 70
    });

    const res = await evaluateAction('request_favor', { player, npc, relation });

    expect(res.success).toBe(true);
    expect(player.inventory.length).toBe(1);

    const transferredItemId = player.inventory[0].itemId;
    expect(transferredItemId).not.toBeNull();
    expect(transferredItemId.toString()).toBe(testItemValid._id.toString());

    // Cek di database asli: dokumen Item harus benar-benar ada
    const dbItem = await Item.findById(transferredItemId);
    expect(dbItem).not.toBeNull();
    expect(dbItem.name).toBe(testItemValid.name);
  });

  it('4. Kuantitas item pada inventori NPC berkurang 1 dan stamina pemain dipotong 5', async () => {
    const player = new Player({
      characterName: 'Penguji 4',
      discordId: 'favor_user_4',
      currentStamina: 50,
      stamina: 50,
      inventory: []
    });

    const npc = new Npc({
      name: 'Paman Liu',
      inventory: [
        {
          itemId: testItemValid._id,
          name: testItemValid.name,
          quantity: 2,
          equippedSlot: null
        }
      ]
    });

    const relation = new NpcPlayerRelation({
      playerId: player._id,
      npcId: npc._id,
      affinity: 65
    });

    const res = await evaluateAction('request_favor', { player, npc, relation });

    expect(res.success).toBe(true);
    // Quantity NPC berkurang dari 2 menjadi 1
    expect(npc.inventory[0].quantity).toBe(1);
    // Stamina pemain dipotong 5 (dari 50 menjadi 45)
    expect(player.currentStamina).toBe(45);
  });

  it('5. Jika NPC tidak memiliki item yang valid, kembalikan reason npc_nothing_to_give', async () => {
    const player = new Player({
      characterName: 'Penguji 5',
      discordId: 'favor_user_5',
      currentStamina: 50,
      stamina: 50,
      inventory: []
    });

    const npc = new Npc({
      name: 'Pertapa Miskin',
      inventory: [
        {
          name: 'Benda Tak Dikenal 123',
          quantity: 1,
          equippedSlot: null
        }
      ]
    });

    const relation = new NpcPlayerRelation({
      playerId: player._id,
      npcId: npc._id,
      affinity: 65
    });

    const res = await evaluateAction('request_favor', { player, npc, relation });

    expect(res.success).toBe(false);
    expect(res.reason).toBe('npc_nothing_to_give');
    // Stamina pemain tidak berkurang
    expect(player.currentStamina).toBe(50);
    // Tidak ada item di inventori pemain
    expect(player.inventory.length).toBe(0);
  });
});
