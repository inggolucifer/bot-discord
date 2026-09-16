const Player = require('../models/Player');
const ExpeditionSession = require('../models/ExpeditionSession');
const Item = require('../models/Item');
const ActivityLog = require('../models/ActivityLog');
const { getCurrentStamina } = require('../utils/stamina');

const EXPEDITION_CATALOG = {
  'reruntuhan_kuno': {
    name: 'Reruntuhan Lembah Kuno',
    zoneId: 'expedition_ancient_ruins',
    dangerTier: 2,
    minRealmIndex: 1, // Memerlukan minimal Kondensasi Qi
    minRealmName: 'Kondensasi Qi (Qi Condensation)',
    durationMinutes: 10,
    staminaCostMultiplier: 1.5,
    lootTable: [
      { name: 'Pecahan Giok Kuno', rarity: 'uncommon', weight: 40 },
      { name: 'Rumput Rohانی Malam', rarity: 'rare', weight: 30 },
      { name: 'Batu Spiritual Murni', rarity: 'rare', weight: 20 },
      { name: 'Cincin Ruang Kuno (Rusak)', rarity: 'epic', weight: 10 }
    ]
  },
  'makam_pedang_terlarang': {
    name: 'Makam Pedang Terlarang',
    zoneId: 'expedition_sword_tomb',
    dangerTier: 4,
    minRealmIndex: 2, // Memerlukan minimal Pendirian Fondasi
    minRealmName: 'Pendirian Fondasi (Foundation Establishment)',
    durationMinutes: 15,
    staminaCostMultiplier: 2.0,
    lootTable: [
      { name: 'Pecahan Bilah Pedang Mistis', rarity: 'rare', weight: 50 },
      { name: 'Manual Pedang Patah', rarity: 'epic', weight: 30 },
      { name: 'Inti Roh Pedang Kuno', rarity: 'legendary', weight: 20 }
    ]
  }
};

function getPlayerRealmIndex(player) {
  const realmStr = String(player.systemCultivation?.realm || player.legacyRealm || '').toLowerCase();
  if (realmStr.includes('fondasi fana') || realmStr.includes('mortal')) return 0;
  if (realmStr.includes('kondensasi qi') || realmStr.includes('qi condensation')) return 1;
  if (realmStr.includes('pendirian fondasi') || realmStr.includes('foundation')) return 2;
  if (realmStr.includes('inti emas') || realmStr.includes('core formation')) return 3;
  if (realmStr.includes('jiwa baru lahir') || realmStr.includes('nascent soul')) return 4;
  return 1; // Default
}

class ExpeditionService {
  /**
   * Mengambil katalog ekspedisi
   */
  getDungeons() {
    return EXPEDITION_CATALOG;
  }

  /**
   * Memasuki zona ekspedisi dengan validasi Realm Gating
   */
  async startExpedition(discordId, guildId, dungeonSlug, options = {}) {
    const player = await Player.findOne({ discordId, guildId });
    if (!player) return { ok: false, error: 'Karakter belum terdaftar.' };

    const dungeon = EXPEDITION_CATALOG[dungeonSlug];
    if (!dungeon) {
      const choices = Object.keys(EXPEDITION_CATALOG).join(', ');
      return { ok: false, error: `Ekspedisi '${dungeonSlug}' tidak ditemukan. Pilihan: ${choices}.` };
    }

    // 1. Validasi Realm Gating
    const playerRealmIdx = getPlayerRealmIndex(player);
    if (playerRealmIdx < dungeon.minRealmIndex && !options.bypassRealmCheck) {
      return {
        ok: false,
        error: `Ranah kultivasimu belum mencukupi untuk menembus kabut beracun ${dungeon.name}! Membutuhkan ranah minimal **${dungeon.minRealmName}**.`
      };
    }

    // 2. Cek Sesi Aktif
    const activeSession = await ExpeditionSession.findOne({
      guildId,
      leaderDiscordId: discordId,
      status: 'active'
    });

    if (activeSession) {
      const now = new Date();
      if (now < activeSession.expiresAt) {
        return { 
          ok: false, 
          error: `Kamu masih memiliki ekspedisi aktif di ${activeSession.zoneId}. Selesaikan atau gunakan /ekspedisi keluar terlebih dahulu.` 
        };
      } else {
        activeSession.status = 'timed_out';
        await activeSession.save();
      }
    }

    // 3. Stamina Check
    const currentStamina = getCurrentStamina(player);
    if (currentStamina < 20) {
      return { ok: false, error: 'Stamina tidak mencukupi untuk ekspedisi (Butuh minimal 20 Stamina).' };
    }

    player.currentStamina = Math.max(0, currentStamina - 20);

    // 4. Buat Sesi Baru
    const now = new Date();
    const durationMin = options.overrideDurationMinutes != null ? options.overrideDurationMinutes : dungeon.durationMinutes;
    const expiresAt = new Date(now.getTime() + durationMin * 60 * 1000);

    const session = await ExpeditionSession.create({
      guildId,
      zoneId: dungeon.zoneId,
      leaderDiscordId: discordId,
      dangerTier: dungeon.dangerTier,
      minRealmIndex: dungeon.minRealmIndex,
      startedAt: now,
      expiresAt,
      staminaCostMultiplier: dungeon.staminaCostMultiplier,
      status: 'active'
    });

    // Pindahkan koordinat player ke zona ekspedisi
    if (!player.gridPosition) player.gridPosition = {};
    player.gridPosition.zoneId = dungeon.zoneId;
    player.gridPosition.tileX = 0;
    player.gridPosition.tileY = 0;
    player.gridPosition.interiorInstanceId = null;
    await player.save();

    await ActivityLog.create({
      guildId,
      discordId,
      actionType: 'expedition_loot',
      details: { dungeonName: dungeon.name, zoneId: dungeon.zoneId, action: 'start' },
      serverValidated: true
    });

    return {
      ok: true,
      sessionId: session._id,
      dungeonName: dungeon.name,
      zoneId: dungeon.zoneId,
      dangerTier: dungeon.dangerTier,
      expiresAt,
      remainingStamina: player.currentStamina
    };
  }

  /**
   * Menjelajahi petak ekspedisi untuk mencari peti harta / relik kuno
   */
  async searchLoot(discordId, guildId) {
    const player = await Player.findOne({ discordId, guildId });
    if (!player) return { ok: false, error: 'Karakter belum terdaftar.' };

    const session = await ExpeditionSession.findOne({
      guildId,
      leaderDiscordId: discordId,
      status: 'active'
    });

    if (!session) {
      return { ok: false, error: 'Kamu tidak sedang berada dalam ekspedisi aktif.' };
    }

    const now = new Date();
    if (now >= session.expiresAt) {
      session.status = 'timed_out';
      await session.save();
      // Kembalikan ke desa
      player.gridPosition.zoneId = 'xingcun_village';
      player.gridPosition.tileX = 16;
      player.gridPosition.tileY = 16;
      await player.save();
      return { ok: false, error: 'Waktu ekspedisi telah habis! Kabut beracun memaksamu mundur ke Desa Xingcun.' };
    }

    const currentStamina = getCurrentStamina(player);
    if (currentStamina < 10) {
      return { ok: false, error: 'Stamina tidak mencukupi untuk menyusuri relik tersembunyi (Butuh 10 Stamina).' };
    }

    player.currentStamina = Math.max(0, currentStamina - 10);

    // Cari dungeon catalog untuk loot table
    const dungeonEntry = Object.values(EXPEDITION_CATALOG).find(d => d.zoneId === session.zoneId);
    const lootList = dungeonEntry ? dungeonEntry.lootTable : [
      { name: 'Pecahan Batu Spiritual', rarity: 'uncommon', weight: 100 }
    ];

    const chosenLoot = lootList[Math.floor(Math.random() * lootList.length)];

    let lootItem = await Item.findOne({ guildId, name: chosenLoot.name });
    if (!lootItem) {
      lootItem = await Item.create({
        guildId,
        name: chosenLoot.name,
        type: 'material',
        rarity: chosenLoot.rarity,
        description: 'Harta peninggalan kuno dari dalam zona ekspedisi berbahaya.'
      });
    }

    const invSlot = player.inventory.find(i => i.itemId && i.itemId.toString() === lootItem._id.toString());
    if (invSlot) {
      invSlot.quantity += 1;
    } else {
      player.inventory.push({ itemId: lootItem._id, quantity: 1 });
    }

    session.collectedLoot.push({
      itemId: lootItem._id,
      itemName: chosenLoot.name,
      quantity: 1
    });

    await session.save();
    await player.save();

    await ActivityLog.create({
      guildId,
      discordId,
      actionType: 'expedition_loot',
      details: { zoneId: session.zoneId, lootName: chosenLoot.name, rarity: chosenLoot.rarity },
      serverValidated: true,
      itemOriginLogged: true
    });

    return {
      ok: true,
      lootName: chosenLoot.name,
      rarity: chosenLoot.rarity,
      remainingStamina: player.currentStamina,
      totalLootCount: session.collectedLoot.length
    };
  }

  /**
   * Keluar / mengevakuasi diri dari ekspedisi kembali ke pemukiman aman
   */
  async evacuateExpedition(discordId, guildId) {
    const player = await Player.findOne({ discordId, guildId });
    if (!player) return { ok: false, error: 'Karakter belum terdaftar.' };

    const session = await ExpeditionSession.findOne({
      guildId,
      leaderDiscordId: discordId,
      status: 'active'
    });

    if (session) {
      session.status = 'escaped';
      await session.save();
    }

    // Kembalikan ke titik spawn Desa Xingcun
    player.gridPosition.zoneId = 'xingcun_village';
    player.gridPosition.tileX = 16;
    player.gridPosition.tileY = 16;
    player.gridPosition.interiorInstanceId = null;
    await player.save();

    return {
      ok: true,
      settlement: 'Desa Xingcun',
      spawnCoords: { tileX: 16, tileY: 16 },
      lootsRetrieved: session ? session.collectedLoot.length : 0
    };
  }
}

module.exports = new ExpeditionService();
