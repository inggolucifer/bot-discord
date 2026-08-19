#!/bin/bash
set -e

echo "=== Memulai instalasi fitur baru Jianghu World Bot ==="

cd /root/jianghu-bot || { echo "Folder /root/jianghu-bot tidak ditemukan! Pastikan kamu menjalankan script ini dari lokasi yang benar, atau edit path di baris ini."; exit 1; }

echo "--> Membuat folder yang diperlukan..."
mkdir -p commands/admin
mkdir -p commands/player
mkdir -p events
mkdir -p models
mkdir -p utils

echo "--> [BARU] Menulis models/Tournament.js"
cat > models/Tournament.js << 'JIANGHU_EOF_MARKER'
const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
  matchNumber: { type: Number, required: true }, // nomor urut match DALAM babak ini (1, 2, 3, ...)
  player1Id: { type: String, default: null },
  player1Name: { type: String, default: null },
  player2Id: { type: String, default: null },     // null = BYE (player1 otomatis menang tanpa lawan)
  player2Name: { type: String, default: null },
  winnerId: { type: String, default: null },
  status: { type: String, enum: ['pending', 'completed'], default: 'pending' },
}, { _id: false });

const roundSchema = new mongoose.Schema({
  roundNumber: { type: Number, required: true },
  roundLabel: { type: String, default: null }, // "Babak 1", "Semifinal", "Final", dst — diisi otomatis
  matches: { type: [matchSchema], default: [] },
}, { _id: false });

const tournamentSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  name: { type: String, required: true },

  status: { type: String, enum: ['registration', 'ongoing', 'finished', 'cancelled'], default: 'registration' },

  participants: [{
    discordId: { type: String, required: true },
    characterName: { type: String, required: true },
    eliminated: { type: Boolean, default: false },
  }],

  rounds: { type: [roundSchema], default: [] },

  winnerDiscordId: { type: String, default: null },
  winnerName: { type: String, default: null },

  createdBy: { type: String, required: true },
}, { timestamps: true });

tournamentSchema.index({ guildId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Tournament', tournamentSchema);

JIANGHU_EOF_MARKER

echo "--> [BARU] Menulis utils/leaderboardRoles.js"
cat > utils/leaderboardRoles.js << 'JIANGHU_EOF_MARKER'
// PENTING soal performa: fungsi ini TIDAK memakai polling/interval sama sekali.
// Dia hanya dipanggil sesaat setelah ada transaksi yang mengubah saldo player (lihat utils/logger.js).
// Di dalam, ada "early exit" dua lapis:
//   1. Kalau admin belum set role leaderboard sama sekali -> langsung return, tidak query apapun.
//   2. Kalau top-3 hasil hitung SAMA PERSIS dengan top-3 sebelumnya -> return, TIDAK ada 1 pun panggilan API Discord.
// Jadi di server yang rankingnya jarang berubah, fungsi ini nyaris tidak membebani bot/RAM sama sekali.

const GuildConfig = require('../models/GuildConfig');
const Player = require('../models/Player');

async function updateTop3LeaderboardRoles(client, guildId) {
  const config = await GuildConfig.findOne({ guildId });
  if (!config || !config.top3RoleIds?.some((r) => r)) return; // belum di-setup admin sama sekali

  const topPlayers = await Player.find({ guildId, status: 'active' })
    .sort({ totalWealth: -1 })
    .limit(3)
    .select('discordId totalWealth')
    .lean();

  const newHolders = [
    topPlayers[0]?.discordId || null,
    topPlayers[1]?.discordId || null,
    topPlayers[2]?.discordId || null,
  ];
  const oldHolders = config.top3RoleHolders?.length === 3 ? config.top3RoleHolders : [null, null, null];

  const unchanged = newHolders.every((v, i) => v === oldHolders[i]);
  if (unchanged) return; // tidak ada perubahan ranking -> tidak perlu sentuh Discord API sama sekali

  const guild = await client.guilds.fetch(guildId).catch(() => null);
  if (!guild) return;

  for (let i = 0; i < 3; i++) {
    if (oldHolders[i] === newHolders[i]) continue;
    const roleId = config.top3RoleIds[i];
    if (!roleId) continue;

    // Copot role dari pemegang lama (kalau ada) -- ini bagian "yang disalip kehilangan role"
    if (oldHolders[i]) {
      const oldMember = await guild.members.fetch(oldHolders[i]).catch(() => null);
      if (oldMember) await oldMember.roles.remove(roleId).catch(() => {});
    }
    // Pasang role ke pemegang baru
    if (newHolders[i]) {
      const newMember = await guild.members.fetch(newHolders[i]).catch(() => null);
      if (newMember) await newMember.roles.add(roleId).catch(() => {});
    }
  }

  config.top3RoleHolders = newHolders;
  await config.save();
}

module.exports = { updateTop3LeaderboardRoles };

JIANGHU_EOF_MARKER

echo "--> [BARU] Menulis utils/realmRole.js"
cat > utils/realmRole.js << 'JIANGHU_EOF_MARKER'
// Sama seperti leaderboardRoles.js: murni event-driven, dipanggil SEKALI setiap admin mengubah ranah
// seorang player (lewat /admin-edit-player) atau saat player baru /daftar. Tidak ada polling sama sekali.

const GuildConfig = require('../models/GuildConfig');

async function syncRealmRole(client, guildId, discordId, newRealmName) {
  const config = await GuildConfig.findOne({ guildId });
  if (!config || !config.realmRoles?.length) return; // belum ada mapping role ranah -> skip total

  const guild = await client.guilds.fetch(guildId).catch(() => null);
  if (!guild) return;
  const member = await guild.members.fetch(discordId).catch(() => null);
  if (!member) return;

  const target = config.realmRoles.find((r) => r.realmName.toLowerCase() === newRealmName.trim().toLowerCase());

  // Copot semua role ranah LAIN yang mungkin masih menempel (supaya tidak dobel-dobel role ranah)
  const otherRealmRoleIds = config.realmRoles
    .map((r) => r.roleId)
    .filter((rid) => rid !== target?.roleId && member.roles.cache.has(rid));
  if (otherRealmRoleIds.length) await member.roles.remove(otherRealmRoleIds).catch(() => {});

  // Pasang role ranah yang baru (kalau ada mapping-nya dan belum dipasang)
  if (target && !member.roles.cache.has(target.roleId)) {
    await member.roles.add(target.roleId).catch(() => {});
  }
}

module.exports = { syncRealmRole };

JIANGHU_EOF_MARKER

echo "--> [BARU] Menulis utils/logCleanup.js"
cat > utils/logCleanup.js << 'JIANGHU_EOF_MARKER'
// Auto-cleanup log lama supaya koleksi transactionlogs & adminlogs di MongoDB tidak membengkak
// tanpa batas. HANYA menghapus dokumen log (TransactionLog, AdminLog) dan riwayat barter yang
// sudah selesai/kadaluwarsa. TIDAK PERNAH menyentuh Player, Item, Pet, Asset, Shop, Tournament,
// atau LootPool yang belum diklaim -- data inti/gameplay 100% aman.
//
// Dijalankan lewat SATU setInterval ringan di index.js (bukan cron job terpisah / bukan library
// tambahan), jadi tidak menambah beban proses baru ke bot.

const GuildConfig = require('../models/GuildConfig');
const TransactionLog = require('../models/TransactionLog');
const AdminLog = require('../models/AdminLog');
const Barter = require('../models/Barter');

async function cleanupOldLogsForGuild(guildId, retentionDays) {
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

  const [txResult, adminResult, barterResult] = await Promise.all([
    TransactionLog.deleteMany({ guildId, createdAt: { $lt: cutoff } }),
    AdminLog.deleteMany({ guildId, createdAt: { $lt: cutoff } }),
    // Barter yang statusnya SUDAH SELESAI (bukan pending) dan sudah lama -> aman dihapus, tidak mempengaruhi gameplay aktif
    Barter.deleteMany({ guildId, status: { $ne: 'pending' }, updatedAt: { $lt: cutoff } }),
  ]);

  return {
    transactionLogs: txResult.deletedCount,
    adminLogs: adminResult.deletedCount,
    barters: barterResult.deletedCount,
  };
}

/** Dipanggil manual oleh /admin-clear-logs (immediate, untuk 1 guild saja) */
async function manualCleanup(guildId, retentionDays) {
  return cleanupOldLogsForGuild(guildId, retentionDays);
}

/** Dipanggil otomatis oleh scheduler di index.js untuk SEMUA guild yang bot ikuti */
async function runScheduledCleanup(client) {
  const configs = await GuildConfig.find({}).lean();
  let totalDeleted = 0;

  for (const config of configs) {
    try {
      const retentionDays = config.logRetentionDays || 30;
      const result = await cleanupOldLogsForGuild(config.guildId, retentionDays);
      const deleted = result.transactionLogs + result.adminLogs + result.barters;
      totalDeleted += deleted;

      await GuildConfig.updateOne({ guildId: config.guildId }, { $set: { lastLogCleanupAt: new Date() } });

      if (deleted > 0) {
        console.log(`[LOG-CLEANUP] Guild ${config.guildId}: ${result.transactionLogs} transaction log, ${result.adminLogs} admin log, ${result.barters} barter lama dihapus.`);
      }
    } catch (err) {
      console.error(`[LOG-CLEANUP] Gagal cleanup untuk guild ${config.guildId}:`, err.message);
    }
  }

  if (totalDeleted > 0) console.log(`[LOG-CLEANUP] Selesai. Total ${totalDeleted} dokumen log lama dibersihkan dari semua server.`);
}

module.exports = { manualCleanup, runScheduledCleanup };

JIANGHU_EOF_MARKER

echo "--> [BARU] Menulis utils/bracket.js"
cat > utils/bracket.js << 'JIANGHU_EOF_MARKER'
// Logika murni sistem gugur (single elimination). Tidak menyimpan state sendiri -- semua state
// disimpan di dokumen Tournament (MongoDB), fungsi-fungsi di sini cuma menghitung & memodifikasi
// objek yang dioper, pemanggil yang bertanggung jawab .save().

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const ROUND_LABELS_FROM_END = ['Final', 'Semifinal', 'Perempat Final'];

function labelForRound(roundNumber, totalRoundsGuess) {
  // totalRoundsGuess dihitung dari jumlah peserta babak ini; dipanggil ulang tiap generate babak
  const roundsLeft = totalRoundsGuess - roundNumber; // 0 = ini babak terakhir (final)
  if (roundsLeft >= 0 && roundsLeft < ROUND_LABELS_FROM_END.length) return ROUND_LABELS_FROM_END[roundsLeft];
  return `Babak ${roundNumber}`;
}

/** Hitung berapa banyak babak lagi dibutuhkan dari N pemain sampai tersisa 1 pemenang */
function totalRoundsNeeded(playerCount) {
  return Math.ceil(Math.log2(Math.max(playerCount, 1)));
}

/**
 * Buat babak pertama dari daftar peserta (di-acak). Kalau jumlah ganjil, satu peserta dapat BYE
 * (otomatis lolos tanpa lawan di babak ini).
 */
function generateFirstRound(participants) {
  const shuffled = shuffle(participants); // [{discordId, characterName}]
  const totalRounds = totalRoundsNeeded(shuffled.length);
  const matches = [];
  let matchNumber = 1;

  for (let i = 0; i < shuffled.length; i += 2) {
    const p1 = shuffled[i];
    const p2 = shuffled[i + 1] || null; // ganjil -> peserta terakhir dapat bye

    matches.push({
      matchNumber: matchNumber++,
      player1Id: p1.discordId,
      player1Name: p1.characterName,
      player2Id: p2 ? p2.discordId : null,
      player2Name: p2 ? p2.characterName : null,
      winnerId: p2 ? null : p1.discordId, // bye = otomatis menang
      status: p2 ? 'pending' : 'completed',
    });
  }

  return {
    roundNumber: 1,
    roundLabel: labelForRound(1, totalRounds),
    matches,
  };
}

/**
 * Dari babak yang SEMUA match-nya sudah completed, buat babak berikutnya dari para pemenang.
 * Mengembalikan null kalau pemenangnya cuma tersisa 1 (berarti turnamen SELESAI).
 */
function generateNextRound(previousRound, nextRoundNumber, originalParticipantCount) {
  const winners = previousRound.matches.map((m) => ({
    discordId: m.winnerId,
    characterName: m.winnerId === m.player1Id ? m.player1Name : m.player2Name,
  }));

  if (winners.length <= 1) return null; // sudah ada juara tunggal

  const totalRounds = totalRoundsNeeded(originalParticipantCount);
  const shuffled = shuffle(winners); // acak ulang lawan tiap babak biar tidak selalu ketemu bracket-neighbor yang sama
  const matches = [];
  let matchNumber = 1;

  for (let i = 0; i < shuffled.length; i += 2) {
    const p1 = shuffled[i];
    const p2 = shuffled[i + 1] || null;

    matches.push({
      matchNumber: matchNumber++,
      player1Id: p1.discordId,
      player1Name: p1.characterName,
      player2Id: p2 ? p2.discordId : null,
      player2Name: p2 ? p2.characterName : null,
      winnerId: p2 ? null : p1.discordId,
      status: p2 ? 'pending' : 'completed',
    });
  }

  return {
    roundNumber: nextRoundNumber,
    roundLabel: labelForRound(nextRoundNumber, totalRounds),
    matches,
  };
}

function isRoundComplete(round) {
  return round.matches.every((m) => m.status === 'completed');
}

module.exports = { generateFirstRound, generateNextRound, isRoundComplete, totalRoundsNeeded };

JIANGHU_EOF_MARKER

echo "--> [BARU] Menulis commands/admin/adminRemoveItem.js"
cat > commands/admin/adminRemoveItem.js << 'JIANGHU_EOF_MARKER'
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isAdmin } = require('../../utils/permissions');
const Player = require('../../models/Player');
const Item = require('../../models/Item');
const { logAdminAction } = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-remove-item')
    .setDescription('[ADMIN] Hapus item dari inventory player tertentu')
    .addUserOption((o) => o.setName('user').setDescription('Target player').setRequired(true))
    .addStringOption((o) => o.setName('nama').setDescription('Nama item').setRequired(true).setAutocomplete(true))
    .addIntegerOption((o) => o.setName('jumlah').setDescription('Jumlah yang dihapus (default: semua)').setMinValue(1)),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused();
    const targetId = interaction.options.getUser('user')?.id;
    if (!targetId) return interaction.respond([]);
    const player = await Player.findOne({ discordId: targetId, guildId: interaction.guildId });
    if (!player) return interaction.respond([]);
    const items = await Item.find({ _id: { $in: player.inventory.map((i) => i.itemId) }, name: new RegExp(focused, 'i') }).limit(25);
    return interaction.respond(items.map((i) => ({ name: i.name, value: i.name })));
  },

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    if (!(await isAdmin(interaction))) return interaction.editReply({ content: '❌ Kamu bukan admin.' });

    const target = interaction.options.getUser('user');
    const nama = interaction.options.getString('nama');
    const jumlahInput = interaction.options.getInteger('jumlah');

    const player = await Player.findOne({ discordId: target.id, guildId: interaction.guildId });
    if (!player) return interaction.editReply({ content: `❌ ${target.username} belum terdaftar.` });

    const item = await Item.findOne({ guildId: interaction.guildId, name: new RegExp(`^${nama}$`, 'i') });
    if (!item) return interaction.editReply({ content: `❌ Item "${nama}" tidak ditemukan.` });

    const owned = player.inventory.find((i) => i.itemId.equals(item._id));
    if (!owned) return interaction.editReply({ content: `❌ ${target.username} tidak memiliki item "${item.name}".` });

    const jumlahHapus = jumlahInput ? Math.min(jumlahInput, owned.quantity) : owned.quantity;
    owned.quantity -= jumlahHapus;
    if (owned.quantity <= 0) player.inventory = player.inventory.filter((i) => !i.itemId.equals(item._id));
    await player.save();

    await logAdminAction(interaction.client, {
      guildId: interaction.guildId, adminId: interaction.user.id, action: 'REMOVE_ITEM', targetUserId: target.id,
      details: `${jumlahHapus}x ${item.name}`,
    });

    return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xc0392b).setTitle('🗑️ Item Dihapus dari Inventory').setDescription(`${jumlahHapus}x **${item.name}** dihapus dari inventory ${target}.`)] });
  },
};

JIANGHU_EOF_MARKER

echo "--> [BARU] Menulis commands/admin/adminRemovePet.js"
cat > commands/admin/adminRemovePet.js << 'JIANGHU_EOF_MARKER'
const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { isAdmin } = require('../../utils/permissions');
const Player = require('../../models/Player');
const Pet = require('../../models/Pet');
const { logAdminAction } = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-remove-pet')
    .setDescription('[ADMIN] Hapus pet dari koleksi player tertentu')
    .addUserOption((o) => o.setName('user').setDescription('Target player').setRequired(true))
    .addStringOption((o) => o.setName('nama').setDescription('Nama pet').setRequired(true).setAutocomplete(true))
    .addStringOption((o) => o.setName('nickname').setDescription('Nickname spesifik (kalau player punya beberapa pet sama nama)')),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused();
    const targetId = interaction.options.getUser('user')?.id;
    if (!targetId) return interaction.respond([]);
    const player = await Player.findOne({ discordId: targetId, guildId: interaction.guildId });
    if (!player) return interaction.respond([]);
    const pets = await Pet.find({ _id: { $in: player.pets.map((p) => p.petId) }, name: new RegExp(focused, 'i') }).limit(25);
    return interaction.respond(pets.map((p) => ({ name: p.name, value: p.name })));
  },

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    if (!(await isAdmin(interaction))) return interaction.editReply({ content: '❌ Kamu bukan admin.' });

    const target = interaction.options.getUser('user');
    const nama = interaction.options.getString('nama');
    const nickname = interaction.options.getString('nickname');

    const player = await Player.findOne({ discordId: target.id, guildId: interaction.guildId });
    if (!player) return interaction.editReply({ content: `❌ ${target.username} belum terdaftar.` });

    const pet = await Pet.findOne({ guildId: interaction.guildId, name: new RegExp(`^${nama}$`, 'i') });
    if (!pet) return interaction.editReply({ content: `❌ Pet "${nama}" tidak ditemukan.` });

    const idx = player.pets.findIndex((p) => p.petId.equals(pet._id) && (nickname ? p.nickname === nickname : true));
    if (idx === -1) return interaction.editReply({ content: `❌ ${target.username} tidak memiliki pet "${pet.name}"${nickname ? ` dengan nickname "${nickname}"` : ''}.` });

    const removed = player.pets[idx];
    player.pets.splice(idx, 1);
    await player.save();

    await logAdminAction(interaction.client, {
      guildId: interaction.guildId, adminId: interaction.user.id, action: 'REMOVE_PET', targetUserId: target.id,
      details: `${pet.name}${removed.nickname ? ` (${removed.nickname})` : ''}`,
    });

    return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xc0392b).setTitle('🗑️ Pet Dihapus').setDescription(`**${pet.name}**${removed.nickname ? ` (${removed.nickname})` : ''} dihapus dari koleksi ${target}.`)] });
  },
};


JIANGHU_EOF_MARKER

echo "--> [BARU] Menulis commands/admin/adminRemoveAsset.js"
cat > commands/admin/adminRemoveAsset.js << 'JIANGHU_EOF_MARKER'
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isAdmin } = require('../../utils/permissions');
const Player = require('../../models/Player');
const Asset = require('../../models/Asset');
const { logAdminAction } = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-remove-asset')
    .setDescription('[ADMIN] Hapus kepemilikan aset dari player tertentu')
    .addUserOption((o) => o.setName('user').setDescription('Target player').setRequired(true))
    .addStringOption((o) => o.setName('nama').setDescription('Nama aset').setRequired(true).setAutocomplete(true))
    .addIntegerOption((o) => o.setName('jumlah').setDescription('Jumlah yang dihapus (default: semua)').setMinValue(1)),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused();
    const targetId = interaction.options.getUser('user')?.id;
    if (!targetId) return interaction.respond([]);
    const player = await Player.findOne({ discordId: targetId, guildId: interaction.guildId });
    if (!player) return interaction.respond([]);
    const assets = await Asset.find({ _id: { $in: player.assets.map((a) => a.assetId) }, name: new RegExp(focused, 'i') }).limit(25);
    return interaction.respond(assets.map((a) => ({ name: a.name, value: a.name })));
  },

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    if (!(await isAdmin(interaction))) return interaction.editReply({ content: '❌ Kamu bukan admin.' });

    const target = interaction.options.getUser('user');
    const nama = interaction.options.getString('nama');
    const jumlahInput = interaction.options.getInteger('jumlah');

    const player = await Player.findOne({ discordId: target.id, guildId: interaction.guildId });
    if (!player) return interaction.editReply({ content: `❌ ${target.username} belum terdaftar.` });

    const asset = await Asset.findOne({ guildId: interaction.guildId, name: new RegExp(`^${nama}$`, 'i') });
    if (!asset) return interaction.editReply({ content: `❌ Aset "${nama}" tidak ditemukan.` });

    const owned = player.assets.find((a) => a.assetId.equals(asset._id));
    if (!owned) return interaction.editReply({ content: `❌ ${target.username} tidak memiliki aset "${asset.name}".` });

    const jumlahHapus = jumlahInput ? Math.min(jumlahInput, owned.quantity) : owned.quantity;
    owned.quantity -= jumlahHapus;
    if (owned.quantity <= 0) player.assets = player.assets.filter((a) => !a.assetId.equals(asset._id));
    await player.save();

    await logAdminAction(interaction.client, {
      guildId: interaction.guildId, adminId: interaction.user.id, action: 'REMOVE_ASSET', targetUserId: target.id,
      details: `${jumlahHapus}x ${asset.name}`,
    });

    return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xc0392b).setTitle('🗑️ Aset Dihapus').setDescription(`${jumlahHapus}x **${asset.name}** dihapus dari kepemilikan ${target}.`)] });
  },
};

JIANGHU_EOF_MARKER

echo "--> [BARU] Menulis commands/admin/adminSetLogRetention.js"
cat > commands/admin/adminSetLogRetention.js << 'JIANGHU_EOF_MARKER'
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isAdmin } = require('../../utils/permissions');
const GuildConfig = require('../../models/GuildConfig');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-set-log-retention')
    .setDescription('[ADMIN] Atur berapa lama log transaksi/admin disimpan sebelum dihapus otomatis')
    .addIntegerOption((o) => o.setName('hari').setDescription('Jumlah hari (1-3650). Default: 30').setRequired(true).setMinValue(1).setMaxValue(3650)),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    if (!(await isAdmin(interaction))) return interaction.editReply({ content: '❌ Kamu bukan admin.' });

    const hari = interaction.options.getInteger('hari');
    let config = await GuildConfig.findOne({ guildId: interaction.guildId });
    if (!config) config = new GuildConfig({ guildId: interaction.guildId });
    config.logRetentionDays = hari;
    await config.save();

    const embed = new EmbedBuilder()
      .setColor(0x2980b9)
      .setTitle('✅ Retensi Log Diperbarui')
      .setDescription(
        `Log transaksi & log admin yang lebih tua dari **${hari} hari** akan otomatis dihapus tiap kali proses cleanup berjalan (sekali per 24 jam).\n\n` +
        `⚠️ Ini HANYA menghapus catatan log, TIDAK PERNAH menghapus data player/item/pet/asset/aset kepemilikan.`
      );
    return interaction.editReply({ embeds: [embed] });
  },
};

JIANGHU_EOF_MARKER

echo "--> [BARU] Menulis commands/admin/adminClearLogs.js"
cat > commands/admin/adminClearLogs.js << 'JIANGHU_EOF_MARKER'
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { isAdmin } = require('../../utils/permissions');
const GuildConfig = require('../../models/GuildConfig');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-clear-logs')
    .setDescription('[ADMIN] Hapus log lama SEKARANG JUGA (manual, di luar jadwal otomatis)'),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    if (!(await isAdmin(interaction))) return interaction.editReply({ content: '❌ Kamu bukan admin.' });

    const config = await GuildConfig.findOne({ guildId: interaction.guildId });
    const retentionDays = config?.logRetentionDays || 30;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`confirm_clear_logs_${retentionDays}`).setLabel(`Ya, Hapus Log Lebih Lama dari ${retentionDays} Hari`).setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('cancel_action').setLabel('Batal').setStyle(ButtonStyle.Secondary),
    );

    const embed = new EmbedBuilder()
      .setColor(0xc0392b)
      .setTitle('⚠️ Konfirmasi Hapus Log Manual')
      .setDescription(`Ini akan menghapus SEMUA log transaksi & log admin yang lebih tua dari **${retentionDays} hari** (sesuai pengaturan retensi saat ini). Data player/item/pet/asset TIDAK terpengaruh. Lanjutkan?`);

    return interaction.editReply({ embeds: [embed], components: [row] });
  },
};

JIANGHU_EOF_MARKER

echo "--> [BARU] Menulis commands/admin/adminLeaderboardRole.js"
cat > commands/admin/adminLeaderboardRole.js << 'JIANGHU_EOF_MARKER'
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isAdmin } = require('../../utils/permissions');
const GuildConfig = require('../../models/GuildConfig');
const { updateTop3LeaderboardRoles } = require('../../utils/leaderboardRoles');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-leaderboard-role')
    .setDescription('[ADMIN] Atur role otomatis untuk peringkat 1/2/3 terkaya')
    .addIntegerOption((o) => o.setName('peringkat').setDescription('Peringkat 1, 2, atau 3').setRequired(true).addChoices(
      { name: 'Peringkat 1 (Terkaya)', value: 1 }, { name: 'Peringkat 2', value: 2 }, { name: 'Peringkat 3', value: 3 },
    ))
    .addRoleOption((o) => o.setName('role').setDescription('Role yang dipasang otomatis (kosongkan untuk menghapus mapping)').setRequired(false)),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    if (!(await isAdmin(interaction))) return interaction.editReply({ content: '❌ Kamu bukan admin.' });

    const peringkat = interaction.options.getInteger('peringkat');
    const role = interaction.options.getRole('role');

    let config = await GuildConfig.findOne({ guildId: interaction.guildId });
    if (!config) config = new GuildConfig({ guildId: interaction.guildId });
    if (!config.top3RoleIds || config.top3RoleIds.length !== 3) config.top3RoleIds = [null, null, null];

    config.top3RoleIds[peringkat - 1] = role ? role.id : null;
    // Reset holder di posisi ini supaya di transaksi berikutnya bot cek ulang & pasang role dari awal
    if (!config.top3RoleHolders || config.top3RoleHolders.length !== 3) config.top3RoleHolders = [null, null, null];
    config.top3RoleHolders[peringkat - 1] = null;
    config.markModified('top3RoleIds');
    config.markModified('top3RoleHolders');
    await config.save();

    // Langsung coba sinkronisasi sekali supaya efeknya terasa instan (bukan nunggu transaksi berikutnya)
    await updateTop3LeaderboardRoles(interaction.client, interaction.guildId).catch(() => {});

    const embed = new EmbedBuilder()
      .setColor(0x2980b9)
      .setTitle('✅ Role Leaderboard Diperbarui')
      .setDescription(role
        ? `Peringkat **${peringkat}** terkaya sekarang otomatis dapat role ${role}.`
        : `Mapping role untuk peringkat **${peringkat}** dihapus.`);
    return interaction.editReply({ embeds: [embed] });
  },
};

JIANGHU_EOF_MARKER

echo "--> [BARU] Menulis commands/admin/adminRealmRoleSet.js"
cat > commands/admin/adminRealmRoleSet.js << 'JIANGHU_EOF_MARKER'
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isAdmin } = require('../../utils/permissions');
const GuildConfig = require('../../models/GuildConfig');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-realm-role-set')
    .setDescription('[ADMIN] Hubungkan nama ranah tertentu dengan sebuah role (otomatis dipasang/dicopot)')
    .addStringOption((o) => o.setName('nama-ranah').setDescription('Nama ranah PERSIS seperti yang diisi di /admin-edit-player, contoh: Mortal').setRequired(true))
    .addRoleOption((o) => o.setName('role').setDescription('Role yang dipasang otomatis untuk ranah ini').setRequired(true)),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    if (!(await isAdmin(interaction))) return interaction.editReply({ content: '❌ Kamu bukan admin.' });

    const namaRanah = interaction.options.getString('nama-ranah').trim();
    const role = interaction.options.getRole('role');

    let config = await GuildConfig.findOne({ guildId: interaction.guildId });
    if (!config) config = new GuildConfig({ guildId: interaction.guildId });

    const existing = config.realmRoles.find((r) => r.realmName.toLowerCase() === namaRanah.toLowerCase());
    if (existing) existing.roleId = role.id;
    else config.realmRoles.push({ realmName: namaRanah, roleId: role.id });
    await config.save();

    const embed = new EmbedBuilder()
      .setColor(0x2980b9)
      .setTitle('✅ Role Ranah Dihubungkan')
      .setDescription(`Player dengan ranah **"${namaRanah}"** (cocok tanpa memandang huruf besar/kecil) sekarang otomatis dapat role ${role}.\n\nPerubahan berlaku saat admin mengubah ranah player lewat \`/admin-edit-player\`, atau saat player baru \`/daftar\`.`);
    return interaction.editReply({ embeds: [embed] });
  },
};

JIANGHU_EOF_MARKER

echo "--> [BARU] Menulis commands/admin/adminRealmRoleRemove.js"
cat > commands/admin/adminRealmRoleRemove.js << 'JIANGHU_EOF_MARKER'
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isAdmin } = require('../../utils/permissions');
const GuildConfig = require('../../models/GuildConfig');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-realm-role-remove')
    .setDescription('[ADMIN] Hapus mapping role otomatis untuk ranah tertentu')
    .addStringOption((o) => o.setName('nama-ranah').setDescription('Nama ranah yang mappingnya mau dihapus').setRequired(true)),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    if (!(await isAdmin(interaction))) return interaction.editReply({ content: '❌ Kamu bukan admin.' });

    const namaRanah = interaction.options.getString('nama-ranah').trim();
    const config = await GuildConfig.findOne({ guildId: interaction.guildId });
    if (!config) return interaction.editReply({ content: '❌ Belum ada mapping role ranah sama sekali.' });

    const before = config.realmRoles.length;
    config.realmRoles = config.realmRoles.filter((r) => r.realmName.toLowerCase() !== namaRanah.toLowerCase());
    if (config.realmRoles.length === before) return interaction.editReply({ content: `❌ Tidak ada mapping untuk ranah "${namaRanah}".` });

    await config.save();
    return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xc0392b).setTitle('🗑️ Mapping Role Ranah Dihapus').setDescription(`Mapping untuk ranah **"${namaRanah}"** telah dihapus.`)] });
  },
};

JIANGHU_EOF_MARKER

echo "--> [BARU] Menulis commands/admin/adminRealmRoleList.js"
cat > commands/admin/adminRealmRoleList.js << 'JIANGHU_EOF_MARKER'
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isAdmin } = require('../../utils/permissions');
const GuildConfig = require('../../models/GuildConfig');

module.exports = {
  data: new SlashCommandBuilder().setName('admin-realm-role-list').setDescription('[ADMIN] Lihat semua mapping role ranah & role leaderboard'),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    if (!(await isAdmin(interaction))) return interaction.editReply({ content: '❌ Kamu bukan admin.' });

    const config = await GuildConfig.findOne({ guildId: interaction.guildId });

    const embed = new EmbedBuilder().setColor(0x8e5b3c).setTitle('📋 Role Otomatis — Ranah & Leaderboard');

    const realmLines = config?.realmRoles?.length
      ? config.realmRoles.map((r) => `**${r.realmName}** → <@&${r.roleId}>`).join('\n')
      : '_Belum ada mapping ranah._';
    embed.addFields({ name: '⚔️ Role Ranah', value: realmLines });

    const top3 = config?.top3RoleIds || [null, null, null];
    const top3Lines = [1, 2, 3].map((i) => `Peringkat ${i}: ${top3[i - 1] ? `<@&${top3[i - 1]}>` : '_(belum di-set)_'}`).join('\n');
    embed.addFields({ name: '🏆 Role Leaderboard Terkaya', value: top3Lines });

    return interaction.editReply({ embeds: [embed] });
  },
};

JIANGHU_EOF_MARKER

echo "--> [BARU] Menulis commands/admin/adminTournamentCreate.js"
cat > commands/admin/adminTournamentCreate.js << 'JIANGHU_EOF_MARKER'
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isAdmin } = require('../../utils/permissions');
const Tournament = require('../../models/Tournament');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-tournament-create')
    .setDescription('[ADMIN] Buat turnamen bracket baru (sistem gugur)')
    .addStringOption((o) => o.setName('nama').setDescription('Nama turnamen').setRequired(true).setMaxLength(64)),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    if (!(await isAdmin(interaction))) return interaction.editReply({ content: '❌ Kamu bukan admin.' });

    const nama = interaction.options.getString('nama').trim();
    const exists = await Tournament.findOne({ guildId: interaction.guildId, name: new RegExp(`^${nama}$`, 'i') });
    if (exists) return interaction.editReply({ content: `❌ Turnamen dengan nama "${nama}" sudah ada.` });

    await Tournament.create({ guildId: interaction.guildId, name: nama, createdBy: interaction.user.id });

    const embed = new EmbedBuilder()
      .setColor(0x9b59b6)
      .setTitle('🏆 Turnamen Dibuat!')
      .setDescription(
        `Turnamen **"${nama}"** berhasil dibuat, status: **Pendaftaran Dibuka**.\n\n` +
        `Langkah selanjutnya:\n` +
        `1. \`/admin-tournament-add-player nama-turnamen:${nama} user:@player\` — daftarkan peserta (ulangi untuk tiap peserta)\n` +
        `2. \`/admin-tournament-start nama-turnamen:${nama}\` — mulai turnamen setelah semua peserta terdaftar\n` +
        `3. \`/admin-tournament-set-winner\` — tentukan pemenang tiap match, bracket otomatis lanjut ke babak berikutnya`
      );
    return interaction.editReply({ embeds: [embed] });
  },
};

JIANGHU_EOF_MARKER

echo "--> [BARU] Menulis commands/admin/adminTournamentAddPlayer.js"
cat > commands/admin/adminTournamentAddPlayer.js << 'JIANGHU_EOF_MARKER'
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isAdmin } = require('../../utils/permissions');
const Tournament = require('../../models/Tournament');
const Player = require('../../models/Player');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-tournament-add-player')
    .setDescription('[ADMIN] Daftarkan player ke turnamen (masih fase pendaftaran)')
    .addStringOption((o) => o.setName('nama-turnamen').setDescription('Nama turnamen').setRequired(true).setAutocomplete(true))
    .addUserOption((o) => o.setName('user').setDescription('Player yang didaftarkan').setRequired(true)),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused();
    const list = await Tournament.find({ guildId: interaction.guildId, status: 'registration', name: new RegExp(focused, 'i') }).limit(25);
    return interaction.respond(list.map((t) => ({ name: t.name, value: t.name })));
  },

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    if (!(await isAdmin(interaction))) return interaction.editReply({ content: '❌ Kamu bukan admin.' });

    const namaTurnamen = interaction.options.getString('nama-turnamen');
    const target = interaction.options.getUser('user');

    const tournament = await Tournament.findOne({ guildId: interaction.guildId, name: new RegExp(`^${namaTurnamen}$`, 'i') });
    if (!tournament) return interaction.editReply({ content: `❌ Turnamen "${namaTurnamen}" tidak ditemukan.` });
    if (tournament.status !== 'registration') return interaction.editReply({ content: `❌ Turnamen ini sudah **${tournament.status}**, tidak bisa tambah peserta lagi.` });

    const player = await Player.findOne({ discordId: target.id, guildId: interaction.guildId });
    if (!player) return interaction.editReply({ content: `❌ ${target.username} belum terdaftar sebagai karakter.` });

    if (tournament.participants.some((p) => p.discordId === target.id)) {
      return interaction.editReply({ content: `❌ ${player.characterName} sudah terdaftar di turnamen ini.` });
    }

    tournament.participants.push({ discordId: target.id, characterName: player.characterName });
    await tournament.save();

    const embed = new EmbedBuilder()
      .setColor(0x27ae60)
      .setTitle('✅ Peserta Ditambahkan')
      .setDescription(`**${player.characterName}** bergabung ke turnamen **"${tournament.name}"**.\nTotal peserta sekarang: **${tournament.participants.length}**`);
    return interaction.editReply({ embeds: [embed] });
  },
};

JIANGHU_EOF_MARKER

echo "--> [BARU] Menulis commands/admin/adminTournamentRemovePlayer.js"
cat > commands/admin/adminTournamentRemovePlayer.js << 'JIANGHU_EOF_MARKER'
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isAdmin } = require('../../utils/permissions');
const Tournament = require('../../models/Tournament');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-tournament-remove-player')
    .setDescription('[ADMIN] Keluarkan player dari turnamen (masih fase pendaftaran)')
    .addStringOption((o) => o.setName('nama-turnamen').setDescription('Nama turnamen').setRequired(true).setAutocomplete(true))
    .addUserOption((o) => o.setName('user').setDescription('Player yang dikeluarkan').setRequired(true)),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused();
    const list = await Tournament.find({ guildId: interaction.guildId, status: 'registration', name: new RegExp(focused, 'i') }).limit(25);
    return interaction.respond(list.map((t) => ({ name: t.name, value: t.name })));
  },

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    if (!(await isAdmin(interaction))) return interaction.editReply({ content: '❌ Kamu bukan admin.' });

    const namaTurnamen = interaction.options.getString('nama-turnamen');
    const target = interaction.options.getUser('user');

    const tournament = await Tournament.findOne({ guildId: interaction.guildId, name: new RegExp(`^${namaTurnamen}$`, 'i') });
    if (!tournament) return interaction.editReply({ content: `❌ Turnamen "${namaTurnamen}" tidak ditemukan.` });
    if (tournament.status !== 'registration') return interaction.editReply({ content: `❌ Turnamen ini sudah **${tournament.status}**, tidak bisa ubah peserta lagi.` });

    const before = tournament.participants.length;
    tournament.participants = tournament.participants.filter((p) => p.discordId !== target.id);
    if (tournament.participants.length === before) return interaction.editReply({ content: `❌ ${target.username} tidak terdaftar di turnamen ini.` });

    await tournament.save();
    return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xc0392b).setTitle('🗑️ Peserta Dikeluarkan').setDescription(`${target} dikeluarkan dari turnamen **"${tournament.name}"**.`)] });
  },
};

JIANGHU_EOF_MARKER

echo "--> [BARU] Menulis commands/admin/adminTournamentList.js"
cat > commands/admin/adminTournamentList.js << 'JIANGHU_EOF_MARKER'
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isAdmin } = require('../../utils/permissions');
const Tournament = require('../../models/Tournament');

module.exports = {
  data: new SlashCommandBuilder().setName('admin-tournament-list').setDescription('[ADMIN] Lihat semua turnamen di server ini'),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    if (!(await isAdmin(interaction))) return interaction.editReply({ content: '❌ Kamu bukan admin.' });

    const list = await Tournament.find({ guildId: interaction.guildId }).sort({ createdAt: -1 }).limit(25);
    if (!list.length) return interaction.editReply({ content: 'Belum ada turnamen. Buat dengan `/admin-tournament-create`.' });

    const statusEmoji = { registration: '📋', ongoing: '⚔️', finished: '🏆', cancelled: '❌' };
    const lines = list.map((t) => `${statusEmoji[t.status]} **${t.name}** — ${t.status} (${t.participants.length} peserta)${t.winnerName ? ` — Juara: ${t.winnerName}` : ''}`);

    return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0x8e5b3c).setTitle('📋 Daftar Turnamen').setDescription(lines.join('\n'))] });
  },
};

JIANGHU_EOF_MARKER

echo "--> [BARU] Menulis commands/admin/adminTournamentStart.js"
cat > commands/admin/adminTournamentStart.js << 'JIANGHU_EOF_MARKER'
const { SlashCommandBuilder } = require('discord.js');
const { isAdmin } = require('../../utils/permissions');
const Tournament = require('../../models/Tournament');
const { generateFirstRound } = require('../../utils/bracket');
const { buildTournamentEmbed } = require('../../utils/embeds');
const { logAdminAction } = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-tournament-start')
    .setDescription('[ADMIN] Mulai turnamen (bracket babak 1 dibuat otomatis & diacak)')
    .addStringOption((o) => o.setName('nama-turnamen').setDescription('Nama turnamen').setRequired(true).setAutocomplete(true)),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused();
    const list = await Tournament.find({ guildId: interaction.guildId, status: 'registration', name: new RegExp(focused, 'i') }).limit(25);
    return interaction.respond(list.map((t) => ({ name: t.name, value: t.name })));
  },

  async execute(interaction) {
    await interaction.deferReply(); // publik -- pengumuman bracket harus terlihat semua orang
    if (!(await isAdmin(interaction))) return interaction.editReply({ content: '❌ Kamu bukan admin.' });

    const namaTurnamen = interaction.options.getString('nama-turnamen');
    const tournament = await Tournament.findOne({ guildId: interaction.guildId, name: new RegExp(`^${namaTurnamen}$`, 'i') });
    if (!tournament) return interaction.editReply({ content: `❌ Turnamen "${namaTurnamen}" tidak ditemukan.` });
    if (tournament.status !== 'registration') return interaction.editReply({ content: `❌ Turnamen ini sudah **${tournament.status}**.` });
    if (tournament.participants.length < 2) return interaction.editReply({ content: '❌ Minimal butuh 2 peserta untuk memulai turnamen.' });

    const firstRound = generateFirstRound(tournament.participants);
    tournament.rounds = [firstRound];
    tournament.status = 'ongoing';
    await tournament.save();

    await logAdminAction(interaction.client, {
      guildId: interaction.guildId, adminId: interaction.user.id, action: 'TOURNAMENT_START',
      details: `${tournament.name} (${tournament.participants.length} peserta)`,
    });

    return interaction.editReply({ embeds: [buildTournamentEmbed(tournament)] });
  },
};

JIANGHU_EOF_MARKER

echo "--> [BARU] Menulis commands/admin/adminTournamentSetWinner.js"
cat > commands/admin/adminTournamentSetWinner.js << 'JIANGHU_EOF_MARKER'
const { SlashCommandBuilder } = require('discord.js');
const { isAdmin } = require('../../utils/permissions');
const Tournament = require('../../models/Tournament');
const { generateNextRound, isRoundComplete } = require('../../utils/bracket');
const { buildTournamentEmbed } = require('../../utils/embeds');
const { logAdminAction } = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-tournament-set-winner')
    .setDescription('[ADMIN] Tentukan pemenang sebuah match (bracket otomatis lanjut kalau babak selesai)')
    .addStringOption((o) => o.setName('nama-turnamen').setDescription('Nama turnamen').setRequired(true).setAutocomplete(true))
    .addIntegerOption((o) => o.setName('match-nomor').setDescription('Nomor match di babak yang sedang berjalan').setRequired(true).setMinValue(1))
    .addUserOption((o) => o.setName('pemenang').setDescription('Player yang menang di match ini').setRequired(true)),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused();
    const list = await Tournament.find({ guildId: interaction.guildId, status: 'ongoing', name: new RegExp(focused, 'i') }).limit(25);
    return interaction.respond(list.map((t) => ({ name: t.name, value: t.name })));
  },

  async execute(interaction) {
    await interaction.deferReply(); // publik -- update bracket harus terlihat semua orang
    if (!(await isAdmin(interaction))) return interaction.editReply({ content: '❌ Kamu bukan admin.' });

    const namaTurnamen = interaction.options.getString('nama-turnamen');
    const matchNomor = interaction.options.getInteger('match-nomor');
    const pemenang = interaction.options.getUser('pemenang');

    const tournament = await Tournament.findOne({ guildId: interaction.guildId, name: new RegExp(`^${namaTurnamen}$`, 'i') });
    if (!tournament) return interaction.editReply({ content: `❌ Turnamen "${namaTurnamen}" tidak ditemukan.` });
    if (tournament.status !== 'ongoing') return interaction.editReply({ content: `❌ Turnamen ini berstatus **${tournament.status}**, tidak bisa set pemenang.` });

    const currentRound = tournament.rounds[tournament.rounds.length - 1];
    const match = currentRound.matches.find((m) => m.matchNumber === matchNomor);
    if (!match) return interaction.editReply({ content: `❌ Match nomor ${matchNomor} tidak ditemukan di babak saat ini (${currentRound.roundLabel}).` });
    if (match.status === 'completed') return interaction.editReply({ content: `❌ Match ${matchNomor} sudah selesai. Pemenang: ${match.winnerId === match.player1Id ? match.player1Name : match.player2Name}.` });

    if (pemenang.id !== match.player1Id && pemenang.id !== match.player2Id) {
      return interaction.editReply({ content: `❌ ${pemenang.username} bukan salah satu pemain di match ini (${match.player1Name} vs ${match.player2Name}).` });
    }

    match.winnerId = pemenang.id;
    match.status = 'completed';

    // Tandai yang kalah sebagai gugur di daftar peserta keseluruhan
    const loserId = pemenang.id === match.player1Id ? match.player2Id : match.player1Id;
    if (loserId) {
      const loserParticipant = tournament.participants.find((p) => p.discordId === loserId);
      if (loserParticipant) loserParticipant.eliminated = true;
    }

    let statusNote = `Match ${matchNomor} selesai. Pemenang: ${pemenang.username}.`;

    if (isRoundComplete(currentRound)) {
      const nextRound = generateNextRound(currentRound, currentRound.roundNumber + 1, tournament.participants.length);

      if (nextRound === null) {
        // Hanya tersisa 1 pemenang -> turnamen selesai
        const championId = currentRound.matches[0].winnerId;
        const championName = championId === currentRound.matches[0].player1Id ? currentRound.matches[0].player1Name : currentRound.matches[0].player2Name;
        tournament.status = 'finished';
        tournament.winnerDiscordId = championId;
        tournament.winnerName = championName;
        statusNote += ` 🏆 TURNAMEN SELESAI! Juara: ${championName}!`;
      } else {
        tournament.rounds.push(nextRound);
        statusNote += ` Babak "${currentRound.roundLabel}" selesai, lanjut ke "${nextRound.roundLabel}".`;
      }
    }

    await tournament.save();

    await logAdminAction(interaction.client, {
      guildId: interaction.guildId, adminId: interaction.user.id, action: 'TOURNAMENT_SET_WINNER',
      targetUserId: pemenang.id, details: `${tournament.name}: ${statusNote}`,
    });

    return interaction.editReply({ embeds: [buildTournamentEmbed(tournament)] });
  },
};

JIANGHU_EOF_MARKER

echo "--> [BARU] Menulis commands/admin/adminTournamentCancel.js"
cat > commands/admin/adminTournamentCancel.js << 'JIANGHU_EOF_MARKER'
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { isAdmin } = require('../../utils/permissions');
const Tournament = require('../../models/Tournament');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-tournament-cancel')
    .setDescription('[ADMIN] Batalkan turnamen yang sedang berjalan/pendaftaran')
    .addStringOption((o) => o.setName('nama-turnamen').setDescription('Nama turnamen').setRequired(true).setAutocomplete(true)),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused();
    const list = await Tournament.find({ guildId: interaction.guildId, status: { $in: ['registration', 'ongoing'] }, name: new RegExp(focused, 'i') }).limit(25);
    return interaction.respond(list.map((t) => ({ name: t.name, value: t.name })));
  },

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    if (!(await isAdmin(interaction))) return interaction.editReply({ content: '❌ Kamu bukan admin.' });

    const namaTurnamen = interaction.options.getString('nama-turnamen');
    const tournament = await Tournament.findOne({ guildId: interaction.guildId, name: new RegExp(`^${namaTurnamen}$`, 'i') });
    if (!tournament) return interaction.editReply({ content: `❌ Turnamen "${namaTurnamen}" tidak ditemukan.` });
    if (['finished', 'cancelled'].includes(tournament.status)) return interaction.editReply({ content: `❌ Turnamen ini sudah **${tournament.status}**.` });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`confirm_cancel_tournament_${tournament._id}`).setLabel('Ya, Batalkan Turnamen').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('cancel_action').setLabel('Batal').setStyle(ButtonStyle.Secondary),
    );

    return interaction.editReply({
      embeds: [new EmbedBuilder().setColor(0xc0392b).setTitle('⚠️ Konfirmasi Batalkan Turnamen').setDescription(`Yakin ingin membatalkan turnamen **"${tournament.name}"**? Semua progres bracket akan hilang.`)],
      components: [row],
    });
  },
};

JIANGHU_EOF_MARKER

echo "--> [BARU] Menulis commands/player/tournamentBracket.js"
cat > commands/player/tournamentBracket.js << 'JIANGHU_EOF_MARKER'
const { SlashCommandBuilder } = require('discord.js');
const Tournament = require('../../models/Tournament');
const { buildTournamentEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tournament-bracket')
    .setDescription('Lihat bracket sebuah turnamen')
    .addStringOption((o) => o.setName('nama-turnamen').setDescription('Nama turnamen').setRequired(true).setAutocomplete(true)),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused();
    const list = await Tournament.find({ guildId: interaction.guildId, name: new RegExp(focused, 'i') }).limit(25);
    return interaction.respond(list.map((t) => ({ name: `${t.name} (${t.status})`, value: t.name })));
  },

  async execute(interaction) {
    await interaction.deferReply(); // publik -- turnamen memang untuk ditonton semua orang

    const namaTurnamen = interaction.options.getString('nama-turnamen');
    const tournament = await Tournament.findOne({ guildId: interaction.guildId, name: new RegExp(`^${namaTurnamen}$`, 'i') });
    if (!tournament) return interaction.editReply({ content: `❌ Turnamen "${namaTurnamen}" tidak ditemukan.` });

    return interaction.editReply({ embeds: [buildTournamentEmbed(tournament)] });
  },
};

JIANGHU_EOF_MARKER

echo "--> [BARU] Menulis commands/player/leaderboard.js"
cat > commands/player/leaderboard.js << 'JIANGHU_EOF_MARKER'
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Player = require('../../models/Player');
const { CURRENCY_LABEL } = require('../../utils/currency');

const MEDAL = ['🥇', '🥈', '🥉'];

module.exports = {
  data: new SlashCommandBuilder().setName('leaderboard').setDescription('Lihat 10 player terkaya di server ini'),

  async execute(interaction) {
    await interaction.deferReply(); // publik -- leaderboard memang untuk dipamerkan

    const topPlayers = await Player.find({ guildId: interaction.guildId, status: 'active' })
      .sort({ totalWealth: -1 })
      .limit(10);

    if (!topPlayers.length) {
      return interaction.editReply({ content: 'Belum ada player terdaftar di server ini.' });
    }

    const lines = topPlayers.map((p, i) => {
      const rankLabel = MEDAL[i] || `**#${i + 1}**`;
      const detail = [
        p.currency.silver ? `${p.currency.silver} ${CURRENCY_LABEL.silver}` : null,
        p.currency.gold ? `${p.currency.gold} ${CURRENCY_LABEL.gold}` : null,
        p.currency.jade ? `${p.currency.jade} ${CURRENCY_LABEL.jade}` : null,
        p.currency.spirit ? `${p.currency.spirit} ${CURRENCY_LABEL.spirit}` : null,
      ].filter(Boolean).join(', ') || 'Tidak punya currency';
      return `${rankLabel} **${p.characterName}**\n　└ ${detail}`;
    });

    const embed = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setTitle('🏆 Leaderboard — 10 Player Terkaya')
      .setDescription(lines.join('\n\n'))
      .setFooter({ text: 'Kekayaan dihitung dari total semua currency (dikonversi ke setara Silver Tael).' });

    return interaction.editReply({ embeds: [embed] });
  },
};

JIANGHU_EOF_MARKER

echo "--> [BARU] Menulis migrate-wealth.js"
cat > migrate-wealth.js << 'JIANGHU_EOF_MARKER'
// Jalankan SEKALI SAJA setelah update fitur baru ini (leaderboard butuh field totalWealth
// yang baru ditambahkan). Script ini menghitung ulang totalWealth SEMUA player yang sudah
// terdaftar sebelumnya, supaya /leaderboard langsung akurat sejak awal (tidak perlu nunggu
// mereka bertransaksi dulu).
//
// Aman dijalankan berkali-kali (idempotent), TIDAK mengubah currency/inventory/apapun selain
// field totalWealth (yang memang murni hasil hitungan, bukan data manual).
//
// Cara pakai: node migrate-wealth.js

require('dotenv').config();
const mongoose = require('mongoose');
const Player = require('./models/Player');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('[MIGRATE-WEALTH] Terhubung ke database.\n');

    const players = await Player.find({});
    console.log(`[MIGRATE-WEALTH] Menghitung ulang totalWealth untuk ${players.length} player...`);

    let updated = 0;
    for (const player of players) {
      // .save() otomatis memicu pre-save hook yang menghitung ulang totalWealth dari currency saat ini
      await player.save();
      updated++;
    }

    console.log(`\n[MIGRATE-WEALTH] Selesai! ${updated} player berhasil diupdate totalWealth-nya.`);
    console.log('[MIGRATE-WEALTH] /leaderboard sekarang sudah akurat sejak awal.');
  } catch (err) {
    console.error('[MIGRATE-WEALTH] Gagal migrasi:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
})();

JIANGHU_EOF_MARKER

echo "--> [DIPERBARUI] Menulis models/Player.js"
cat > models/Player.js << 'JIANGHU_EOF_MARKER'
// Data karakter player, terikat permanen ke discordId + guildId
const mongoose = require('mongoose');
const { normalizeCurrency } = require('../utils/currencyNormalize');

const inventoryItemSchema = new mongoose.Schema({
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
  quantity: { type: Number, default: 1 },
}, { _id: false });

const petOwnedSchema = new mongoose.Schema({
  instanceId: { type: String, required: true }, // unique string
  petId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pet', required: true },
  nickname: { type: String, default: null },
  level: { type: Number, default: 1 },
  exp: { type: Number, default: 0 },
  hp: { type: Number, default: 50 },
  maxHp: { type: Number, default: 50 },
  atk: { type: Number, default: 10 },
  def: { type: Number, default: 5 },
  spd: { type: Number, default: 8 },
  hunger: { type: Number, default: 100 }, // 0-100
  element: { type: String, default: 'Netral' },
  wins: { type: Number, default: 0 },
  losses: { type: Number, default: 0 },
  lastFedAt: { type: Date, default: null },
  lastBattledAt: { type: Date, default: null },
  isLocked: { type: Boolean, default: false }, // true saat sedang battle
  affinity: { type: Number, default: 0 }, // max 100
}, { _id: false });

const assetOwnedSchema = new mongoose.Schema({
  assetId: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset', required: true },
  quantity: { type: Number, default: 1 },
  lastClaimAt: { type: Date, default: null },
  constructionCompleteAt: { type: Date, default: null },
  assignedWorkers: { type: [{ workerId: String }], default: [] },
  progressAccumulated: { type: Number, default: 0 },
  lastProgressUpdate: { type: Date, default: null },
  status: { type: String, enum: ['pending', 'building', 'active'], default: 'active' },
}, { _id: false });

const playerSchema = new mongoose.Schema({
  discordId: { type: String, required: true, index: true },
  guildId: { type: String, required: true, index: true },

  characterName: { type: String, required: true },

  realm: { type: String, default: 'Mortal' },
  stage: { type: String, default: '-' },

  age: { type: Number, default: 16 },
  gender: { type: String, enum: ['Laki-laki', 'Perempuan', null], default: null },

  sect: { type: String, default: 'Tanpa Sekte (Rogue Cultivator)' },

  characterImage: { type: String, default: null },

  currency: {
    silver: { type: Number, default: 0 },
    gold: { type: Number, default: 0 },
    jade: { type: Number, default: 0 },
    spirit: { type: Number, default: 0 },
  },

  inventory: { type: [inventoryItemSchema], default: [] },
  pets: {
    type: [petOwnedSchema],
    default: [],
    validate: {
      validator: function(v) { return v.length <= 6; },
      message: 'Maksimal 6 pet per player'
    }
  },
  assets: { type: [assetOwnedSchema], default: [] },

  customStatus: { type: String, default: null },

  status: {
    type: String,
    enum: ['active', 'frozen', 'dead'],
    default: 'active',
  },

  lastDailyClaim: { type: Date, default: null },
  registeredAt: { type: Date, default: Date.now },

  totalWealth: { type: Number, default: 0, index: true },
}, { timestamps: true });

playerSchema.index({ discordId: 1, guildId: 1 }, { unique: true });
playerSchema.index({ guildId: 1, "pets.instanceId": 1 }); // Index untuk pencarian pet instance yang efisien

// Setiap kali player disimpan: (1) currency dinormalisasi otomatis (100 Silver->1 Gold, dst),
// (2) totalWealth dihitung ulang dari currency yang SUDAH dinormalisasi.
playerSchema.pre('save', function (next) {
  normalizeCurrency(this.currency);
  const c = this.currency || {};
  this.totalWealth = (c.silver || 0) + (c.gold || 0) * 100 + (c.jade || 0) * 10000 + (c.spirit || 0) * 1000000;
  next();
});

module.exports = mongoose.model('Player', playerSchema);

JIANGHU_EOF_MARKER

echo "--> [DIPERBARUI] Menulis models/GuildConfig.js"
cat > models/GuildConfig.js << 'JIANGHU_EOF_MARKER'
// Menyimpan konfigurasi per-server (multi-server support)
const mongoose = require('mongoose');

const realmRoleSchema = new mongoose.Schema({
  realmName: { type: String, required: true },  // dicocokkan case-insensitive dengan field "realm" di Player
  roleId: { type: String, required: true },
}, { _id: false });

const guildConfigSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true, index: true },
  logChannelId: { type: String, default: null },      // channel log transaksi player
  adminLogChannelId: { type: String, default: null },  // channel log aksi admin
  adminRoleIds: { type: [String], default: [] },       // role yang dianggap admin bot

  // Whitelist channel: kalau kosong [] = bot bisa dipakai di SEMUA channel (default).
  allowedChannelIds: { type: [String], default: [] },

  // ===== Auto-cleanup log (supaya database tidak membengkak) =====
  // Log transaksi & log admin yang lebih tua dari X hari akan dihapus otomatis. Data inti (player/item/pet/asset/shop) TIDAK PERNAH ikut terhapus.
  logRetentionDays: { type: Number, default: 30, min: 1, max: 3650 },
  lastLogCleanupAt: { type: Date, default: null },

  // ===== Role otomatis untuk Ranah (Realm) =====
  // Setiap kali admin ubah ranah player, role lama (yang ada di daftar ini) dicopot, role baru yang cocok dipasang.
  realmRoles: { type: [realmRoleSchema], default: [] },

  // ===== Role otomatis Leaderboard Terkaya (Top 1/2/3) =====
  // top3RoleIds[0] = role utk peringkat 1, [1] = peringkat 2, [2] = peringkat 3
  top3RoleIds: { type: [String], default: [null, null, null] },
  // top3RoleHolders menyimpan SIAPA yang SEDANG pegang role itu, supaya saat ranking berubah,
  // bot tahu persis role siapa yang harus dicopot tanpa perlu scan seluruh member server (hemat resource).
  top3RoleHolders: { type: [String], default: [null, null, null] },
}, { timestamps: true });

module.exports = mongoose.model('GuildConfig', guildConfigSchema);

JIANGHU_EOF_MARKER

echo "--> [DIPERBARUI] Menulis utils/logger.js"
cat > utils/logger.js << 'JIANGHU_EOF_MARKER'
// Helper untuk mencatat transaksi & aksi admin ke DB + kirim ke channel log Discord
const TransactionLog = require('../models/TransactionLog');
const AdminLog = require('../models/AdminLog');
const GuildConfig = require('../models/GuildConfig');
const { EmbedBuilder } = require('discord.js');
const { updateTop3LeaderboardRoles } = require('./leaderboardRoles');

// Tipe transaksi yang benar-benar mengubah saldo player -> perlu dicek ulang untuk role leaderboard Top 1/2/3.
// Tipe di luar daftar ini (mis. hanya query/lihat) tidak akan memicu pengecekan sama sekali.
const WEALTH_AFFECTING_TYPES = new Set([
  'daily_claim', 'convert', 'transfer', 'barter', 'shop_purchase',
  'sell_to_system', 'asset_profit_claim', 'admin_grant', 'admin_revoke', 'loot_claim',
]);

async function logTransaction(client, { guildId, type, fromUserId = null, toUserId = null, currency = null, amount = 0, itemDescription = null, balanceAfter = null, note = null }) {
  const entry = await TransactionLog.create({ guildId, type, fromUserId, toUserId, currency, amount, itemDescription, balanceAfter, note });

  try {
    const config = await GuildConfig.findOne({ guildId });
    if (config?.logChannelId) {
      const channel = await client.channels.fetch(config.logChannelId).catch(() => null);
      if (channel) {
        const embed = new EmbedBuilder()
          .setColor(0x8e5b3c)
          .setTitle('📜 Log Transaksi')
          .addFields(
            { name: 'Tipe', value: type, inline: true },
            { name: 'Dari', value: fromUserId ? `<@${fromUserId}>` : '-', inline: true },
            { name: 'Ke', value: toUserId ? `<@${toUserId}>` : '-', inline: true },
          )
          .setTimestamp();
        if (currency && amount) embed.addFields({ name: 'Jumlah', value: `${amount} ${currency}`, inline: true });
        if (itemDescription) embed.addFields({ name: 'Detail', value: itemDescription });
        if (note) embed.addFields({ name: 'Catatan', value: note });
        await channel.send({ embeds: [embed] });
      }
    }
  } catch (e) {
    console.error('[LOGGER] Gagal kirim log transaksi ke channel:', e.message);
  }

  // Sinkronisasi role Top 1/2/3 terkaya HANYA untuk tipe transaksi yang benar-benar mengubah saldo.
  // Fungsi ini sendiri sudah punya early-exit kalau belum di-setup / ranking tidak berubah (lihat utils/leaderboardRoles.js),
  // jadi pemanggilan ini aman dan ringan, tidak membebani bot.
  if (WEALTH_AFFECTING_TYPES.has(type)) {
    updateTop3LeaderboardRoles(client, guildId).catch((e) => console.error('[LOGGER] Gagal sync role leaderboard:', e.message));
  }

  return entry;
}

async function logAdminAction(client, { guildId, adminId, action, targetUserId = null, details = null }) {
  const entry = await AdminLog.create({ guildId, adminId, action, targetUserId, details });

  try {
    const config = await GuildConfig.findOne({ guildId });
    const channelId = config?.adminLogChannelId || config?.logChannelId;
    if (channelId) {
      const channel = await client.channels.fetch(channelId).catch(() => null);
      if (channel) {
        const embed = new EmbedBuilder()
          .setColor(0xc0392b)
          .setTitle('🛡️ Log Aksi Admin')
          .addFields(
            { name: 'Admin', value: `<@${adminId}>`, inline: true },
            { name: 'Aksi', value: action, inline: true },
            { name: 'Target', value: targetUserId ? `<@${targetUserId}>` : '-', inline: true },
          )
          .setTimestamp();
        if (details) embed.addFields({ name: 'Detail', value: details });
        await channel.send({ embeds: [embed] });
      }
    }
  } catch (e) {
    console.error('[LOGGER] Gagal kirim log admin ke channel:', e.message);
  }
  return entry;
}

module.exports = { logTransaction, logAdminAction };

JIANGHU_EOF_MARKER

echo "--> [DIPERBARUI] Menulis utils/embeds.js"
cat > utils/embeds.js << 'JIANGHU_EOF_MARKER'
const { EmbedBuilder } = require('discord.js');
const { CURRENCY_EMOJI, CURRENCY_LABEL, formatCurrencyLine } = require('./currency');
const { getRankStyle, dramaticTitle } = require('./dramatic');
const { isUnderConstruction, formatRemainingTime } = require('./crafting');

function buildPlayerProfileEmbed(player, discordUser, itemDocs = [], petDocs = [], assetDocs = [], sectRole = null) {
  const embed = new EmbedBuilder()
    .setColor(0x8e5b3c)
    .setTitle(`📜 Profil: ${player.characterName}`)
    .setThumbnail(discordUser?.displayAvatarURL?.() || null)
    .addFields(
      { name: '⚔️ Ranah', value: `${player.realm}${player.stage && player.stage !== '-' ? ` — ${player.stage}` : ''}`, inline: true },
      { name: '🎂 Umur', value: `${player.age} tahun`, inline: true },
      { name: '⚧ Jenis Kelamin', value: player.gender || '_(belum diisi)_', inline: true },
      { name: '🏯 Sekte/Afiliasi', value: sectRole ? `${player.sect} (${sectRole})` : player.sect, inline: true },
      { name: '📌 Status', value: player.status === 'active' ? '✅ Aktif' : player.status === 'frozen' ? '🥶 Dibekukan' : '☠️ Meninggal', inline: true },
      { name: '💰 Currency', value: formatCurrencyLine(player.currency) },
    );

  if (player.characterImage) embed.setImage(player.characterImage);

  const invLine = itemDocs.length
    ? itemDocs.map((it) => {
        const s = getRankStyle(it.doc.rank);
        return `${s.emoji} **${it.doc.name}** _(${s.label} T${it.doc.tier})_ x${it.quantity}`;
      }).join('\n')
    : '_Kosong_';
  embed.addFields({ name: '🎒 Inventory', value: invLine.slice(0, 1024) });

  const assetLine = assetDocs.length
    ? assetDocs.map((a) => {
        const underConstruction = isUnderConstruction(a.owned);
        return `🏠 **${a.doc.name}** x${a.quantity}${underConstruction ? ` 🚧 _(dibangun, ${formatRemainingTime(a.owned.constructionCompleteAt)})_` : ''}`;
      }).join('\n')
    : '_Belum punya aset_';
  embed.addFields({ name: '🏠 Asset', value: assetLine.slice(0, 1024) });

  const petLine = petDocs.length
    ? petDocs.map((p) => {
        const s = getRankStyle(p.doc.rank);
        return `${s.emoji} **${p.nickname || p.doc.name}** _(${p.doc.name}, ${s.label} T${p.doc.tier})_`;
      }).join('\n')
    : '_Belum punya pet_';
  embed.addFields({ name: '🐾 Pet', value: petLine.slice(0, 1024) });

  embed.setFooter({ text: `Terdaftar sejak ${new Date(player.registeredAt).toLocaleDateString('id-ID')}` });
  return embed;
}

function buildItemEmbed(item) {
  const style = getRankStyle(item.rank);
  const embed = new EmbedBuilder()
    .setColor(style.color)
    .setTitle(dramaticTitle(item.name, item.rank))
    .addFields(
      { name: 'Rank', value: `${style.emoji} **${style.label}** ${style.stars}`, inline: true },
      { name: 'Tier', value: `${item.tier}`, inline: true },
    )
    .setDescription(`${item.description || '-'}\n\n_${style.flourish}_`);
  if (item.effect) embed.addFields({ name: 'Efek', value: item.effect });
  if (item.origin) embed.addFields({ name: 'Asal-usul', value: item.origin });
  if (item.basePrice > 0) {
    embed.addFields({ name: '💰 Harga Dasar', value: `${CURRENCY_EMOJI[item.priceCurrency]} ${item.basePrice} ${CURRENCY_LABEL[item.priceCurrency]}`, inline: true });
  }
  if (item.imageUrl) embed.setImage(item.imageUrl);
  return embed;
}

function buildPetEmbed(pet) {
  const style = getRankStyle(pet.rank);
  const embed = new EmbedBuilder()
    .setColor(style.color)
    .setTitle(dramaticTitle(pet.name, pet.rank))
    .addFields(
      { name: 'Rank', value: `${style.emoji} **${style.label}** ${style.stars}`, inline: true },
      { name: 'Tier', value: `${pet.tier}`, inline: true },
    )
    .setDescription(`${pet.description || '-'}\n\n_${style.flourish}_`);
  if (pet.effect) embed.addFields({ name: 'Efek', value: pet.effect });
  if (pet.origin) embed.addFields({ name: 'Asal-usul', value: pet.origin });
  if (pet.basePrice > 0) {
    embed.addFields({ name: '💰 Harga Dasar', value: `${CURRENCY_EMOJI[pet.priceCurrency]} ${pet.basePrice} ${CURRENCY_LABEL[pet.priceCurrency]}`, inline: true });
  }
  if (pet.imageUrl) embed.setImage(pet.imageUrl);
  return embed;
}

function buildAssetEmbed(asset) {
  const style = asset.rank ? getRankStyle(asset.rank) : null;
  const embed = new EmbedBuilder()
    .setColor(style ? style.color : 0x27ae60)
    .setTitle(style ? dramaticTitle(asset.name, asset.rank) : `🏠 ${asset.name}`)
    .setDescription(`${asset.description || '-'}${style ? `\n\n_${style.flourish}_` : ''}`);

  if (asset.dailyProfit > 0) {
    embed.addFields({ name: '💰 Profit Harian', value: `${CURRENCY_EMOJI[asset.profitCurrency]} ${asset.dailyProfit} ${CURRENCY_LABEL[asset.profitCurrency]}`, inline: true });
  }
  if (asset.workerOutputItemId && asset.workerOutputQuantity > 0) {
    embed.addFields({ name: '⛏️ Hasil Pekerja Harian', value: `${asset.workerOutputQuantity}x ${asset.workerOutputItemName}`, inline: true });
  }
  if (style) embed.addFields({ name: 'Rank', value: `${style.emoji} **${style.label}** ${style.stars}`, inline: true });
  if (asset.basePrice > 0) {
    embed.addFields({ name: '🛒 Harga Beli (Shop)', value: `${CURRENCY_EMOJI[asset.priceCurrency]} ${asset.basePrice} ${CURRENCY_LABEL[asset.priceCurrency]}`, inline: true });
  }
  if (asset.constructionTimeHours > 0) {
    embed.addFields({ name: '🚧 Waktu Pembangunan', value: `${asset.constructionTimeHours} jam`, inline: true });
  }
  if (asset.buildable && asset.buildRequirements?.length) {
    const buildMats = asset.buildRequirements.map((m) => `${m.quantity}x ${m.itemName}`).join(', ');
    embed.addFields({ name: '🔨 Bisa Dibangun Mandiri', value: `Butuh: ${buildMats}\nGunakan \`/bangun-asset\` atau \`/sekte-bangun-asset\`.` });
  }
  if (asset.isCraftingStation && asset.recipes.length) {
    const recipeLines = asset.recipes.map((r) => {
      const mats = r.materials.map((m) => `${m.quantity}x ${m.itemName}`).join(', ');
      return `**${r.recipeName}** → ${r.resultQuantity}x ${r.resultItemName} _(butuh: ${mats})_`;
    });
    embed.addFields({ name: '⚒️ Resep yang Bisa Dibuat', value: recipeLines.join('\n').slice(0, 1024) });
  }
  if (asset.imageUrl) embed.setImage(asset.imageUrl);
  return embed;
}

function buildTournamentEmbed(tournament) {
  const embed = new EmbedBuilder()
    .setColor(tournament.status === 'finished' ? 0xf1c40f : tournament.status === 'cancelled' ? 0x7f8c8d : 0x9b59b6)
    .setTitle(`🏆 Turnamen: ${tournament.name}`);

  if (tournament.status === 'registration') {
    const list = tournament.participants.length
      ? tournament.participants.map((p, i) => `${i + 1}. **${p.characterName}**`).join('\n')
      : '_Belum ada peserta_';
    embed.setDescription(`📋 **Status: Pendaftaran Dibuka**\n\nPeserta terdaftar (${tournament.participants.length}):\n${list}`);
    return embed;
  }

  if (tournament.status === 'cancelled') {
    embed.setDescription('❌ Turnamen ini telah dibatalkan.');
    return embed;
  }

  if (tournament.status === 'finished') {
    embed.setDescription(`🎉🏆 **JUARA: ${tournament.winnerName}** 🏆🎉\n\nSelamat kepada sang juara! Namanya akan dikenang di seluruh penjuru Jianghu!`);
  } else {
    embed.setDescription('⚔️ **Status: Sedang Berlangsung**');
  }

  for (const round of tournament.rounds) {
    const lines = round.matches.map((m) => {
      const p1 = m.player1Name || '_(kosong)_';
      const p2 = m.player2Name || '_BYE (otomatis lolos)_';
      if (m.status === 'completed') {
        const winnerName = m.winnerId === m.player1Id ? m.player1Name : m.player2Name;
        return `Match ${m.matchNumber}: ~~${m.player2Id ? `${p1} vs ${p2}` : p1}~~ → 🏅 **${winnerName}**`;
      }
      return `Match ${m.matchNumber}: **${p1}** 🆚 **${p2}** _(belum ada hasil)_`;
    });
    embed.addFields({ name: `📌 ${round.roundLabel}`, value: lines.join('\n').slice(0, 1024) });
  }

  return embed;
}

function buildSectEmbed(sect, resourceDocs = [], assetDocs = []) {
  const embed = new EmbedBuilder()
    .setColor(0x2c3e50)
    .setTitle(`🏯 Sekte: ${sect.name}`)
    .setDescription(sect.description || '-');

  if (sect.imageUrl) embed.setImage(sect.imageUrl);

  embed.addFields(
    { name: '👑 Ketua', value: sect.leaderId ? `<@${sect.leaderId}>` : '_(kosong)_', inline: true },
    { name: '🎖️ Wakil Ketua', value: sect.viceLeaderId ? `<@${sect.viceLeaderId}>` : '_(kosong)_', inline: true },
    { name: '💰 Kekayaan Sekte', value: formatCurrencyLine(sect.currency), inline: true },
    { name: '📿 Tetua', value: sect.elderIds.length ? sect.elderIds.map((id) => `<@${id}>`).join(', ') : '_(kosong)_' },
    { name: `👥 Anggota (${sect.memberIds.length})`, value: sect.memberIds.length ? sect.memberIds.map((id) => `<@${id}>`).join(', ').slice(0, 1000) : '_(kosong)_' },
  );

  const resourceLine = resourceDocs.length
    ? resourceDocs.map((r) => `• **${r.doc.name}** x${r.quantity}`).join('\n')
    : '_Belum ada sumber daya_';
  embed.addFields({ name: '📦 Sumber Daya Sekte', value: resourceLine.slice(0, 1024) });

  const assetLine = assetDocs.length
    ? assetDocs.map((a) => {
        const underConstruction = isUnderConstruction(a.owned);
        return `🏠 **${a.doc.name}** x${a.quantity}${underConstruction ? ` 🚧 _(dibangun, ${formatRemainingTime(a.owned.constructionCompleteAt)})_` : ''}`;
      }).join('\n')
    : '_Belum ada aset sekte_';
  embed.addFields({ name: '🏛️ Aset Sekte', value: assetLine.slice(0, 1024) });

  return embed;
}

module.exports = { buildPlayerProfileEmbed, buildItemEmbed, buildPetEmbed, buildAssetEmbed, buildTournamentEmbed, buildSectEmbed };


JIANGHU_EOF_MARKER

echo "--> [DIPERBARUI] Menulis events/interactionCreate.js"
cat > events/interactionCreate.js << 'JIANGHU_EOF_MARKER'
const { Events, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, MessageFlags } = require('discord.js');
const Item = require('../models/Item');
const Pet = require('../models/Pet');
const Asset = require('../models/Asset');
const Player = require('../models/Player');
const Tournament = require('../models/Tournament');
const Sect = require('../models/Sect');
const { isAdmin, isChannelAllowed } = require('../utils/permissions');
const PetBattle = require('../models/PetBattle');
const { simulateRound } = require('../services/petService');

const { logAdminAction } = require('../utils/logger');
const { syncRealmRole } = require('../utils/realmRole');
const { manualCleanup } = require('../utils/logCleanup');
const { executeSectWar } = require('../utils/sectWar');
const { CURRENCY_LABEL } = require('../utils/currency');

const VALID_RANKS = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythical'];
const VALID_CURRENCIES = ['silver', 'gold', 'jade', 'spirit'];

// Command yang SELALU boleh dipakai di channel manapun (dipakai admin untuk setup awal / manage channel whitelist)
const CHANNEL_CHECK_EXEMPT = ['admin-channel-add', 'admin-channel-remove', 'admin-channel-list'];

function normalizeRank(input) {
  const found = VALID_RANKS.find((r) => r.toLowerCase() === input.trim().toLowerCase());
  return found || null;
}

/** Parse teks gabungan seperti "Epic 5" -> { rank: 'Epic', tier: 5 } */
function parseRankTier(text) {
  const parts = text.trim().split(/\s+/);
  const tierRaw = parts[parts.length - 1];
  const tier = parseInt(tierRaw, 10);
  if (!Number.isInteger(tier) || tier < 1 || tier > 9) {
    return { error: `Format salah. Gunakan "Rank Tier", contoh: "Epic 5". Tier harus angka 1-9.` };
  }
  const rankRaw = parts.slice(0, -1).join(' ');
  const rank = normalizeRank(rankRaw);
  if (!rank) return { error: `Rank "${rankRaw}" tidak valid. Gunakan: ${VALID_RANKS.join(', ')}` };
  return { rank, tier };
}

/** Parse teks gabungan seperti "500 silver" -> { amount: 500, currency: 'silver' } */
function parseAmountCurrency(text) {
  const parts = text.trim().split(/\s+/);
  if (parts.length < 2) return { error: 'Format salah. Gunakan "angka currency", contoh: "500 silver".' };
  const amount = parseInt(parts[0], 10);
  const currency = parts[1].toLowerCase();
  if (!Number.isInteger(amount) || amount < 0) return { error: 'Jumlah harus angka >= 0.' };
  if (!VALID_CURRENCIES.includes(currency)) return { error: `Currency "${parts[1]}" tidak valid. Gunakan: ${VALID_CURRENCIES.join(', ')}` };
  return { amount, currency };
}

/** Parse "500 silver Epic" -> { amount, currency, rank (opsional) } untuk field harga aset */
function parseAmountCurrencyRank(text) {
  const parts = text.trim().split(/\s+/);
  if (parts.length < 2) return { error: 'Format salah. Gunakan "angka currency [rank]", contoh: "500 silver Epic".' };
  const amount = parseInt(parts[0], 10);
  const currency = parts[1].toLowerCase();
  if (!Number.isInteger(amount) || amount < 0) return { error: 'Jumlah harus angka >= 0.' };
  if (!VALID_CURRENCIES.includes(currency)) return { error: `Currency "${parts[1]}" tidak valid. Gunakan: ${VALID_CURRENCIES.join(', ')}` };
  let rank = null;
  if (parts[2]) {
    rank = normalizeRank(parts.slice(2).join(' '));
    if (!rank) return { error: `Rank "${parts.slice(2).join(' ')}" tidak valid. Gunakan: ${VALID_RANKS.join(', ')} (atau kosongkan).` };
  }
  return { amount, currency, rank };
}

/** Validasi nama ranah -- sekarang cukup teks bebas, TIDAK ada tier lagi (disederhanakan). */
function parseRealm(text) {
  const realm = text.trim();
  if (!realm) return { error: 'Nama ranah tidak boleh kosong.' };
  return { realm };
}

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {

    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === 'select_pet_battle') {
        const battleRecord = await PetBattle.findOne({ messageId: interaction.message.id });
        if (!battleRecord) return interaction.reply({ content: '❌ Data duel tidak ditemukan atau sudah kadaluarsa.', flags: MessageFlags.Ephemeral });
        if (battleRecord.opponentId !== interaction.user.id) return interaction.reply({ content: '❌ Kamu bukan target duel ini.', flags: MessageFlags.Ephemeral });
        if (battleRecord.status !== 'pending') return interaction.reply({ content: '❌ Duel ini sudah diproses.', flags: MessageFlags.Ephemeral });

        const p2InstanceId = interaction.values[0];
        const p2 = await Player.findOne({ discordId: interaction.user.id, guildId: interaction.guildId }).populate('pets.petId');
        const p1 = await Player.findOne({ discordId: battleRecord.challengerId, guildId: interaction.guildId }).populate('pets.petId');

        const pet2 = p2.pets.find(p => p.instanceId === p2InstanceId);
        const pet1 = p1.pets.find(p => p.instanceId === battleRecord.challengerPetInstanceId);

        if (!pet2 || !pet1) return interaction.reply({ content: '❌ Salah satu pet tidak valid.', flags: MessageFlags.Ephemeral });
        if (pet2.isLocked) return interaction.reply({ content: '❌ Pet kamu sedang dipakai di duel lain.', flags: MessageFlags.Ephemeral });

        pet2.isLocked = true;
        p2.markModified('pets');
        await p2.save();

        battleRecord.opponentPetInstanceId = pet2.instanceId;
        battleRecord.status = 'accepted';
        await battleRecord.save();

        await interaction.update({ content: `⚔️ **${p1.characterName}** (${pet1.nickname || pet1.petId.name}) VS **${p2.characterName}** (${pet2.nickname || pet2.petId.name}) dimulai!`, components: [] });

        // --- SIMULASI BATTLE ---
        let rounds = [];
        let p1Hp = pet1.hp;
        let p2Hp = pet2.hp;

        let winner = null;
        for (let i = 1; i <= 8; i++) { // Max 8 turn
          const result = simulateRound(pet1, pet2, pet1.nickname || pet1.petId.name, pet2.nickname || pet2.petId.name);
          rounds.push(`**Turn ${i}**: ${result.log}`);

          if (pet1.hp <= 0) { winner = 2; break; }
          if (pet2.hp <= 0) { winner = 1; break; }
        }

        if (!winner) {
          winner = pet1.hp >= pet2.hp ? 1 : 2; // Tie breaker by HP left
        }

        // Update stats
        if (winner === 1) {
          pet1.wins += 1;
          pet2.losses += 1;
        } else {
          pet2.wins += 1;
          pet1.losses += 1;
        }

        pet1.isLocked = false;
        pet2.isLocked = false;
        pet1.lastBattledAt = new Date();
        pet2.lastBattledAt = new Date();

        p1.markModified('pets');
        p2.markModified('pets');
        await p1.save();
        await p2.save();

        battleRecord.status = 'finished';
        await battleRecord.save();

        const winName = winner === 1 ? p1.characterName : p2.characterName;
        const winPet = winner === 1 ? (pet1.nickname || pet1.petId.name) : (pet2.nickname || pet2.petId.name);

        const embed = new EmbedBuilder()
          .setColor(0xe74c3c)
          .setTitle('⚔️ Hasil Duel Pet')
          .setDescription(rounds.join('\n'))
          .addFields({ name: '🏆 Pemenang', value: `**${winName}** dengan pet **${winPet}**!`});

        return interaction.followUp({ embeds: [embed] });
      }
    }

    // ================= SLASH COMMAND =================
    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);
      if (!command) return;

      // ---- Cek whitelist channel (admin selalu bebas, player harus di channel yang diizinkan) ----
      if (!CHANNEL_CHECK_EXEMPT.includes(interaction.commandName)) {
        const bypass = await isAdmin(interaction);
        if (!bypass) {
          const allowed = await isChannelAllowed(interaction);
          if (!allowed) {
            return interaction.reply({ content: '❌ Bot tidak aktif di channel ini. Hubungi admin untuk mengizinkan channel ini lewat `/admin-channel-add`.', flags: MessageFlags.Ephemeral });
          }
        }
      }


      // ---- Cek Kematian Player ----
      if (interaction.commandName !== 'restart-karakter' && interaction.commandName !== 'help') {
        const player = await Player.findOne({ discordId: interaction.user.id, guildId: interaction.guildId });
        if (player && player.status === 'dead') {
          return interaction.reply({
            content: '💀 Kamu telah meninggal. Cari pertolongan pemain lain yang memiliki kemampuan membangkitkanmu, atau restart akun dari awal dengan command: `/restart-karakter`',
            flags: MessageFlags.Ephemeral
          });
        }
      }

      try {
        await command.execute(interaction);
      } catch (err) {
        console.error(`[ERROR] Command ${interaction.commandName} gagal:`, err);
        const payload = { content: '❌ Terjadi kesalahan saat menjalankan command ini. Coba lagi atau hubungi admin.', flags: MessageFlags.Ephemeral };
        if (interaction.replied || interaction.deferred) await interaction.followUp(payload).catch(() => {});
        else await interaction.reply(payload).catch(() => {});
      }
      return;
    }

    // ================= AUTOCOMPLETE =================
    if (interaction.isAutocomplete()) {
      const command = interaction.client.commands.get(interaction.commandName);
      if (!command?.autocomplete) return;
      try {
        await command.autocomplete(interaction);
      } catch (err) {
        console.error(`[ERROR] Autocomplete ${interaction.commandName} gagal:`, err);
      }
      return;
    }

    // ================= BUTTON =================
    if (interaction.isButton()) {

      if (id.startsWith('release_confirm_')) {
        const instanceId = id.replace('release_confirm_', '');
        const player = await Player.findOne({ discordId: interaction.user.id, guildId: interaction.guildId }).populate('pets.petId');
        if (!player) return;

        const petIndex = player.pets.findIndex(p => p.instanceId === instanceId);
        if (petIndex === -1) return interaction.update({ content: '❌ Pet tidak ditemukan atau sudah dilepas.', components: [] });

        const pet = player.pets[petIndex];
        if (pet.isLocked) return interaction.update({ content: '❌ Pet ini sedang dalam battle!', components: [] });

        player.pets.splice(petIndex, 1);
        await player.save();

        return interaction.update({ content: `👋 Kamu telah melepaskan **${pet.nickname || pet.petId.name}** kembali ke alam liar. Ia tidak akan pernah kembali.`, components: [] });
      }

      if (id.startsWith('release_cancel_')) {
        return interaction.update({ content: '❌ Pelepasan pet dibatalkan.', components: [] });
      }

      const id = interaction.customId;

      // Tombol transfer & barter ditangani sendiri oleh collector di command masing-masing. Lewati di sini.
      if (id.startsWith('transfer_') || id.startsWith('barter_')) return;


      if (id.startsWith('hire_worker_')) {
        const workerId = id.replace('hire_worker_', '');

        // Cek kalau dia mau sewa diri sendiri
        if (workerId === interaction.user.id) {
           return interaction.reply({ content: '❌ Kamu tidak bisa menyewa dirimu sendiri.', flags: MessageFlags.Ephemeral });
        }

        const modal = new ModalBuilder().setCustomId(`modal_hire_worker_${workerId}`).setTitle('Sewa Worker');
        modal.addComponents(
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('hours').setLabel('Berapa jam ingin menyewa?').setStyle(TextInputStyle.Short).setRequired(true)),
        );
        return interaction.showModal(modal);
      }

      if (id === 'cancel_action') {
        return interaction.update({ content: '❎ Dibatalkan.', embeds: [], components: [] });
      }

      if (id === 'confirm_restart_karakter_yes') {
        const player = await Player.findOne({ discordId: interaction.user.id, guildId: interaction.guildId });
        if (!player || player.status !== 'dead') {
           return interaction.update({ content: '❌ Karakter tidak valid atau belum mati.', embeds: [], components: [] });
        }

        player.status = 'active';
        player.customStatus = null;
        player.inventory = [];
        player.pets = [];
        player.assets = [];
        player.currency = { silver: 0, gold: 0, jade: 0, spirit: 0 };
        player.realm = 'Mortal';
        player.stage = '-';
        player.sect = 'Tanpa Sekte (Rogue Cultivator)';
        player.age = 16;
        player.totalWealth = 0; // it gets recalculated anyway but let's reset it to be clean
        await player.save();

        await logAdminAction(interaction.client, {
          guildId: interaction.guildId,
          adminId: interaction.client.user.id,
          action: 'RESTART_CHARACTER',
          targetUserId: interaction.user.id,
          details: 'Pemain melakukan restart dari kematian.'
        });

        return interaction.update({ content: '✨ Karaktermu telah terlahir kembali! Semoga kehidupan kali ini lebih baik.', embeds: [], components: [] });
      }

      if (id === 'panel_help_admin') {
        const helpAdmin = interaction.client.commands.get('help-admin');
        return helpAdmin.execute(interaction);
      }

      if (id === 'panel_add_item') {
        if (!(await isAdmin(interaction))) return interaction.reply({ content: '❌ Kamu bukan admin.', flags: MessageFlags.Ephemeral });
        const modal = new ModalBuilder().setCustomId('modal_add_item').setTitle('Tambah Item Baru');
        modal.addComponents(
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('name').setLabel('Nama Item').setStyle(TextInputStyle.Short).setRequired(true)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('rankTier').setLabel('Rank & Tier (contoh: Epic 5)').setStyle(TextInputStyle.Short).setValue('Common 1').setRequired(true)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('priceInfo').setLabel('Harga Dasar & Currency (contoh: 500 silver)').setStyle(TextInputStyle.Short).setValue('0 silver').setRequired(true)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('description').setLabel('Deskripsi').setStyle(TextInputStyle.Paragraph).setRequired(true)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('category').setLabel('Kategori (weapon, material, dll)').setStyle(TextInputStyle.Short).setValue('none').setRequired(false)),
        );
        return interaction.showModal(modal);
      }

      if (id === 'panel_add_pet') {
        if (!(await isAdmin(interaction))) return interaction.reply({ content: '❌ Kamu bukan admin.', flags: MessageFlags.Ephemeral });
        const modal = new ModalBuilder().setCustomId('modal_add_pet').setTitle('Tambah Pet Baru');
        modal.addComponents(
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('name').setLabel('Nama Pet').setStyle(TextInputStyle.Short).setRequired(true)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('rankTier').setLabel('Rank & Tier (contoh: Epic 5)').setStyle(TextInputStyle.Short).setValue('Common 1').setRequired(true)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('priceInfo').setLabel('Harga Dasar & Currency (contoh: 500 silver)').setStyle(TextInputStyle.Short).setValue('0 silver').setRequired(true)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('description').setLabel('Deskripsi').setStyle(TextInputStyle.Paragraph).setRequired(true)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('imageUrl').setLabel('URL Gambar (opsional)').setStyle(TextInputStyle.Short).setRequired(false)),
        );
        return interaction.showModal(modal);
      }

      if (id === 'panel_add_asset') {
        if (!(await isAdmin(interaction))) return interaction.reply({ content: '❌ Kamu bukan admin.', flags: MessageFlags.Ephemeral });
        const modal = new ModalBuilder().setCustomId('modal_add_asset').setTitle('Buat Aset Baru');
        modal.addComponents(
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('name').setLabel('Nama Aset').setStyle(TextInputStyle.Short).setRequired(true)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('description').setLabel('Deskripsi').setStyle(TextInputStyle.Paragraph).setRequired(true)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('profitInfo').setLabel('Profit Harian & Currency (contoh: 50 silver)').setStyle(TextInputStyle.Short).setValue('0 silver').setRequired(true)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('priceInfo').setLabel('Harga Beli, Currency, Rank-opsional').setStyle(TextInputStyle.Short).setValue('0 silver').setRequired(true)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('imageUrl').setLabel('URL Gambar (opsional)').setStyle(TextInputStyle.Short).setRequired(false)),
        );
        return interaction.showModal(modal);
      }

      if (id.startsWith('confirm_delete_item_')) {
        if (!(await isAdmin(interaction))) return interaction.reply({ content: '❌ Kamu bukan admin.', flags: MessageFlags.Ephemeral });
        const itemId = id.replace('confirm_delete_item_', '');
        const item = await Item.findByIdAndDelete(itemId);
        await logAdminAction(interaction.client, { guildId: interaction.guildId, adminId: interaction.user.id, action: 'DELETE_ITEM', details: item?.name || itemId });
        return interaction.update({ content: `🗑️ Item **${item?.name || '(tidak diketahui)'}** telah dihapus.`, embeds: [], components: [] });
      }

      if (id.startsWith('confirm_delete_pet_')) {
        if (!(await isAdmin(interaction))) return interaction.reply({ content: '❌ Kamu bukan admin.', flags: MessageFlags.Ephemeral });
        const petId = id.replace('confirm_delete_pet_', '');
        const pet = await Pet.findByIdAndDelete(petId);
        await logAdminAction(interaction.client, { guildId: interaction.guildId, adminId: interaction.user.id, action: 'DELETE_PET', details: pet?.name || petId });
        return interaction.update({ content: `🗑️ Pet **${pet?.name || '(tidak diketahui)'}** telah dihapus.`, embeds: [], components: [] });
      }

      if (id.startsWith('confirm_delete_asset_')) {
        if (!(await isAdmin(interaction))) return interaction.reply({ content: '❌ Kamu bukan admin.', flags: MessageFlags.Ephemeral });
        const assetId = id.replace('confirm_delete_asset_', '');
        const asset = await Asset.findByIdAndDelete(assetId);
        await logAdminAction(interaction.client, { guildId: interaction.guildId, adminId: interaction.user.id, action: 'DELETE_ASSET', details: asset?.name || assetId });
        return interaction.update({ content: `🗑️ Aset **${asset?.name || '(tidak diketahui)'}** telah dihapus.`, embeds: [], components: [] });
      }

      if (id.startsWith('confirm_unregister_')) {
        if (!(await isAdmin(interaction))) return interaction.reply({ content: '❌ Kamu bukan admin.', flags: MessageFlags.Ephemeral });
        const discordId = id.replace('confirm_unregister_', '');
        const player = await Player.findOneAndDelete({ discordId, guildId: interaction.guildId });
        await logAdminAction(interaction.client, { guildId: interaction.guildId, adminId: interaction.user.id, action: 'FORCE_UNREGISTER', targetUserId: discordId, details: player?.characterName || '-' });
        return interaction.update({ content: `🗑️ Karakter **${player?.characterName || '(tidak diketahui)'}** telah dihapus permanen.`, embeds: [], components: [] });
      }

      if (id.startsWith('confirm_clear_logs_')) {
        if (!(await isAdmin(interaction))) return interaction.reply({ content: '❌ Kamu bukan admin.', flags: MessageFlags.Ephemeral });
        const retentionDays = parseInt(id.replace('confirm_clear_logs_', ''), 10) || 30;
        await interaction.deferUpdate();
        const result = await manualCleanup(interaction.guildId, retentionDays);
        await logAdminAction(interaction.client, {
          guildId: interaction.guildId, adminId: interaction.user.id, action: 'MANUAL_CLEAR_LOGS',
          details: `${result.transactionLogs} transaction log, ${result.adminLogs} admin log, ${result.barters} barter lama dihapus`,
        });
        return interaction.editReply({
          content: `✅ Cleanup selesai: **${result.transactionLogs}** log transaksi, **${result.adminLogs}** log admin, dan **${result.barters}** riwayat barter lama telah dihapus.`,
          embeds: [], components: [],
        });
      }

      if (id.startsWith('confirm_cancel_tournament_')) {
        if (!(await isAdmin(interaction))) return interaction.reply({ content: '❌ Kamu bukan admin.', flags: MessageFlags.Ephemeral });
        const tournamentId = id.replace('confirm_cancel_tournament_', '');
        const tournament = await Tournament.findByIdAndUpdate(tournamentId, { status: 'cancelled' }, { new: true });
        await logAdminAction(interaction.client, { guildId: interaction.guildId, adminId: interaction.user.id, action: 'TOURNAMENT_CANCEL', details: tournament?.name || tournamentId });
        return interaction.update({ content: `❌ Turnamen **${tournament?.name || '(tidak diketahui)'}** telah dibatalkan.`, embeds: [], components: [] });
      }

      if (id.startsWith('confirm_delete_sect_')) {
        if (!(await isAdmin(interaction))) return interaction.reply({ content: '❌ Kamu bukan admin.', flags: MessageFlags.Ephemeral });
        const sectId = id.replace('confirm_delete_sect_', '');
        const sect = await Sect.findByIdAndDelete(sectId);
        if (sect) {
          const allMemberIds = [sect.leaderId, sect.viceLeaderId, ...sect.elderIds, ...sect.memberIds].filter(Boolean);
          await Player.updateMany(
            { guildId: interaction.guildId, discordId: { $in: allMemberIds } },
            { $set: { sect: 'Tanpa Sekte (Rogue Cultivator)' } },
          );
        }
        await logAdminAction(interaction.client, { guildId: interaction.guildId, adminId: interaction.user.id, action: 'SECT_DELETE', details: sect?.name || sectId });
        return interaction.update({ content: `🗑️ Sekte **${sect?.name || '(tidak diketahui)'}** telah dibubarkan.`, embeds: [], components: [] });
      }

      if (id.startsWith('confirm_sekte_war_')) {
        if (!(await isAdmin(interaction))) return interaction.reply({ content: '❌ Kamu bukan admin.', flags: MessageFlags.Ephemeral });
        const [, , , winnerId, loserId] = id.split('_'); // confirm_sekte_war_<winnerId>_<loserId>
        await interaction.deferUpdate();

        const winner = await Sect.findById(winnerId);
        const loser = await Sect.findById(loserId);
        if (!winner || !loser) {
          return interaction.editReply({ content: '❌ Salah satu sekte sudah tidak ada lagi. Perang dibatalkan.', embeds: [], components: [] });
        }

        const [itemDocs, assetDocs] = await Promise.all([
          Item.find({ _id: { $in: loser.resources.map((r) => r.itemId) } }),
          Asset.find({ _id: { $in: loser.assets.map((a) => a.assetId) } }),
        ]);

        const { lootedResources, lootedAssets } = executeSectWar(winner, loser);
        await winner.save();
        await loser.save();

        await logAdminAction(interaction.client, {
          guildId: interaction.guildId, adminId: interaction.user.id, action: 'SECT_WAR',
          details: `${winner.name} mengalahkan ${loser.name}. Loot: ${lootedResources.length} jenis resource, ${lootedAssets.length} jenis aset.`,
        });

        const resourceLines = lootedResources.length
          ? lootedResources.map((r) => {
              const doc = itemDocs.find((d) => d._id.equals(r.itemId));
              return `• **${doc?.name || 'Item'}**: ${r.quantity}/${r.fullQuantity} dirampas`;
            }).join('\n')
          : '_Tidak ada resource yang berhasil dirampas (dadu tidak berpihak)_';

        const assetLines = lootedAssets.length
          ? lootedAssets.map((a) => {
              const doc = assetDocs.find((d) => d._id.equals(a.assetId));
              return `• **${doc?.name || 'Aset'}**: ${a.quantity}/${a.fullQuantity} dirampas`;
            }).join('\n')
          : '_Tidak ada aset yang berhasil dirampas (dadu tidak berpihak)_';

        const embed = new EmbedBuilder()
          .setColor(0xc0392b)
          .setTitle(`⚔️ Perang Sekte: ${winner.name} MENANG atas ${loser.name}!`)
          .setDescription(`${loser.name} hancur berkeping-keping! Seluruh kekayaannya musnah, keanggotaan tetap ada untuk membangun ulang dari nol.`)
          .addFields(
            { name: '📦 Resource Dirampas', value: resourceLines },
            { name: '🏛️ Aset Dirampas', value: assetLines },
          );

        return interaction.editReply({ content: null, embeds: [embed], components: [] });
      }

      return;
    }

    // ================= MODAL SUBMIT =================
    if (interaction.isModalSubmit()) {
      const id = interaction.customId;

      try {

        // ---- Sewa Worker ----
        if (id.startsWith('modal_hire_worker_')) {
          const workerId = id.replace('modal_hire_worker_', '');
          const hoursInput = interaction.fields.getTextInputValue('hours').trim();
          const hours = parseInt(hoursInput, 10);

          if (!Number.isInteger(hours) || hours <= 0) {
            return interaction.reply({ content: '❌ Durasi harus berupa angka bulat lebih dari 0.', flags: MessageFlags.Ephemeral });
          }

          const employer = await Player.findOne({ discordId: interaction.user.id, guildId: interaction.guildId });
          if (!employer) return interaction.reply({ content: '❌ Kamu belum terdaftar.', flags: MessageFlags.Ephemeral });

          const WorkerContract = require('../models/WorkerContract');
          const contract = await WorkerContract.findOne({ guildId: interaction.guildId, workerId });

          if (!contract || contract.status !== 'available') {
            return interaction.reply({ content: '❌ Worker ini sudah tidak tersedia atau sedang bekerja.', flags: MessageFlags.Ephemeral });
          }

          if (hours > contract.maxDurationHours) {
             return interaction.reply({ content: `❌ Worker ini hanya menawarkan maksimal ${contract.maxDurationHours} jam.`, flags: MessageFlags.Ephemeral });
          }

          const totalCost = contract.pricePerHour * hours;
          if (employer.currency.silver < totalCost) {
            return interaction.reply({ content: `❌ Uangmu tidak cukup. Biaya sewa adalah ${totalCost} Silver, saldomu ${employer.currency.silver} Silver.`, flags: MessageFlags.Ephemeral });
          }

          employer.currency.silver -= totalCost;
          await employer.save();

          // Uang masuk setelah kontrak selesai? Atau di awal? Sesuai requirement: "Uang penyewa dipotong di awal... Gaji diberikan setelah pekerjaan selesai".
          // Kita simpan durasinya, saat timer habis, uang baru diberikan ke worker.
          // Untuk saat ini kita assign saja statusnya. Gaji bisa kita berikan saat update.
          // We will store current employer ID so we know who to log the salary to
          contract.status = 'working';
          contract.currentEmployerId = interaction.user.id;
          contract.workingSince = new Date();
          contract.workingUntil = new Date(Date.now() + (hours * 3600000));
          await contract.save();

          const { refreshWorkerChannel } = require('../services/workerChannelService');
          await refreshWorkerChannel(interaction.client, interaction.guildId);

          const { logTransaction } = require('../utils/logger');
          await logTransaction(interaction.client, {
            guildId: interaction.guildId, type: 'hire_worker', fromUserId: interaction.user.id, toUserId: workerId,
            currency: 'silver', amount: totalCost,
            itemDescription: `Menyewa worker selama ${hours} jam`
          });

          // Salary will be transferred upon worker sync when the time has passed.


          return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x27ae60).setTitle('✅ Worker Berhasil Disewa').setDescription(`Kamu menyewa **${contract.workerName}** selama ${hours} jam dengan biaya **${totalCost} Silver**.\n\nSekarang kamu bisa memasukkannya ke dalam asetmu lewat command `/pindah-worker`.`)] });
        }

        // ---- Tambah Item ----
        if (id === 'modal_add_item') {
          if (!(await isAdmin(interaction))) return interaction.reply({ content: '❌ Kamu bukan admin.', flags: MessageFlags.Ephemeral });
          const name = interaction.fields.getTextInputValue('name').trim();
          const description = interaction.fields.getTextInputValue('description').trim();
          const categoryInput = interaction.fields.getTextInputValue('category')?.trim().toLowerCase() || 'none';
          const allowedCategories = ['weapon', 'cloth', 'herb', 'pill', 'consume', 'material', 'artifact', 'accessories', 'none'];
          const category = allowedCategories.includes(categoryInput) ? categoryInput : 'none';

          const rt = parseRankTier(interaction.fields.getTextInputValue('rankTier'));
          if (rt.error) return interaction.reply({ content: `❌ ${rt.error}`, flags: MessageFlags.Ephemeral });
          const pc = parseAmountCurrency(interaction.fields.getTextInputValue('priceInfo'));
          if (pc.error) return interaction.reply({ content: `❌ ${pc.error}`, flags: MessageFlags.Ephemeral });

          const exists = await Item.findOne({ guildId: interaction.guildId, name: new RegExp(`^${name}$`, 'i') });
          if (exists) return interaction.reply({ content: `❌ Item dengan nama "${name}" sudah ada.`, flags: MessageFlags.Ephemeral });

          await Item.create({
            guildId: interaction.guildId, name, rank: rt.rank, tier: rt.tier, description, category,
            basePrice: pc.amount, priceCurrency: pc.currency, createdBy: interaction.user.id,
          });
          await logAdminAction(interaction.client, { guildId: interaction.guildId, adminId: interaction.user.id, action: 'ADD_ITEM', details: name });

          return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x27ae60).setTitle('✅ Item Ditambahkan').setDescription(`**${name}** (${rt.rank} T${rt.tier}) berhasil dibuat.\nHarga dasar: ${pc.amount} ${pc.currency}`)] });
        }

        // ---- Edit Item ----
        if (id.startsWith('modal_edit_item_')) {
          if (!(await isAdmin(interaction))) return interaction.reply({ content: '❌ Kamu bukan admin.', flags: MessageFlags.Ephemeral });
          const itemId = id.replace('modal_edit_item_', '');
          const item = await Item.findById(itemId);
          if (!item) return interaction.reply({ content: '❌ Item tidak ditemukan (mungkin sudah dihapus).', flags: MessageFlags.Ephemeral });

          const name = interaction.fields.getTextInputValue('name').trim();
          const description = interaction.fields.getTextInputValue('description').trim();
          const categoryInput = interaction.fields.getTextInputValue('category')?.trim().toLowerCase() || 'none';
          const allowedCategories = ['weapon', 'cloth', 'herb', 'pill', 'consume', 'material', 'artifact', 'accessories', 'none'];
          const category = allowedCategories.includes(categoryInput) ? categoryInput : 'none';

          const rt = parseRankTier(interaction.fields.getTextInputValue('rankTier'));
          if (rt.error) return interaction.reply({ content: `❌ ${rt.error}`, flags: MessageFlags.Ephemeral });
          const pc = parseAmountCurrency(interaction.fields.getTextInputValue('priceInfo'));
          if (pc.error) return interaction.reply({ content: `❌ ${pc.error}`, flags: MessageFlags.Ephemeral });

          item.name = name; item.rank = rt.rank; item.tier = rt.tier; item.description = description; item.category = category;
          item.basePrice = pc.amount; item.priceCurrency = pc.currency;
          await item.save();
          await logAdminAction(interaction.client, { guildId: interaction.guildId, adminId: interaction.user.id, action: 'EDIT_ITEM', details: name });

          return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x2980b9).setTitle('✅ Item Diperbarui').setDescription(`**${name}** berhasil diupdate.`)] });
        }

        // ---- Tambah Pet ----
        if (id === 'modal_add_pet') {
          if (!(await isAdmin(interaction))) return interaction.reply({ content: '❌ Kamu bukan admin.', flags: MessageFlags.Ephemeral });
          const name = interaction.fields.getTextInputValue('name').trim();
          const description = interaction.fields.getTextInputValue('description').trim();
          const imageUrl = interaction.fields.getTextInputValue('imageUrl')?.trim() || null;

          const rt = parseRankTier(interaction.fields.getTextInputValue('rankTier'));
          if (rt.error) return interaction.reply({ content: `❌ ${rt.error}`, flags: MessageFlags.Ephemeral });
          const pc = parseAmountCurrency(interaction.fields.getTextInputValue('priceInfo'));
          if (pc.error) return interaction.reply({ content: `❌ ${pc.error}`, flags: MessageFlags.Ephemeral });

          const exists = await Pet.findOne({ guildId: interaction.guildId, name: new RegExp(`^${name}$`, 'i') });
          if (exists) return interaction.reply({ content: `❌ Pet dengan nama "${name}" sudah ada.`, flags: MessageFlags.Ephemeral });

          await Pet.create({
            guildId: interaction.guildId, name, rank: rt.rank, tier: rt.tier, description, imageUrl,
            basePrice: pc.amount, priceCurrency: pc.currency, createdBy: interaction.user.id,
          });
          await logAdminAction(interaction.client, { guildId: interaction.guildId, adminId: interaction.user.id, action: 'ADD_PET', details: name });

          return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x27ae60).setTitle('✅ Pet Ditambahkan').setDescription(`**${name}** (${rt.rank} T${rt.tier}) berhasil dibuat.\nHarga dasar: ${pc.amount} ${pc.currency}`)] });
        }

        // ---- Edit Pet ----
        if (id.startsWith('modal_edit_pet_')) {
          if (!(await isAdmin(interaction))) return interaction.reply({ content: '❌ Kamu bukan admin.', flags: MessageFlags.Ephemeral });
          const petId = id.replace('modal_edit_pet_', '');
          const pet = await Pet.findById(petId);
          if (!pet) return interaction.reply({ content: '❌ Pet tidak ditemukan.', flags: MessageFlags.Ephemeral });

          const name = interaction.fields.getTextInputValue('name').trim();
          const description = interaction.fields.getTextInputValue('description').trim();
          const imageUrl = interaction.fields.getTextInputValue('imageUrl')?.trim() || null;

          const rt = parseRankTier(interaction.fields.getTextInputValue('rankTier'));
          if (rt.error) return interaction.reply({ content: `❌ ${rt.error}`, flags: MessageFlags.Ephemeral });
          const pc = parseAmountCurrency(interaction.fields.getTextInputValue('priceInfo'));
          if (pc.error) return interaction.reply({ content: `❌ ${pc.error}`, flags: MessageFlags.Ephemeral });

          pet.name = name; pet.rank = rt.rank; pet.tier = rt.tier; pet.description = description; pet.imageUrl = imageUrl;
          pet.basePrice = pc.amount; pet.priceCurrency = pc.currency;
          await pet.save();
          await logAdminAction(interaction.client, { guildId: interaction.guildId, adminId: interaction.user.id, action: 'EDIT_PET', details: name });

          return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x2980b9).setTitle('✅ Pet Diperbarui').setDescription(`**${name}** berhasil diupdate.`)] });
        }

        // ---- Tambah Asset ----

        // ---- Edit Pet Stats ----
        if (id.startsWith('modal_edit_pet_stats_')) {
          if (!(await isAdmin(interaction))) return interaction.reply({ content: '❌ Kamu bukan admin.', flags: MessageFlags.Ephemeral });
          const petId = id.replace('modal_edit_pet_stats_', '');
          const pet = await Pet.findById(petId);
          if (!pet) return interaction.reply({ content: '❌ Pet tidak ditemukan.', flags: MessageFlags.Ephemeral });

          const baseStatsRaw = interaction.fields.getTextInputValue('baseStats').trim().split(',');
          if (baseStatsRaw.length !== 4) return interaction.reply({ content: '❌ Format Base Stats salah (HP,ATK,DEF,SPD).', flags: MessageFlags.Ephemeral });

          const baseHp = parseInt(baseStatsRaw[0]);
          const baseAtk = parseInt(baseStatsRaw[1]);
          const baseDef = parseInt(baseStatsRaw[2]);
          const baseSpd = parseInt(baseStatsRaw[3]);

          if (isNaN(baseHp) || isNaN(baseAtk) || isNaN(baseDef) || isNaN(baseSpd)) {
             return interaction.reply({ content: '❌ Base Stats harus berupa angka.', flags: MessageFlags.Ephemeral });
          }

          const element = interaction.fields.getTextInputValue('element').trim();
          const validElements = ['Api', 'Air', 'Tanah', 'Angin', 'Petir', 'Cahaya', 'Kegelapan', 'Netral'];
          if (!validElements.includes(element)) return interaction.reply({ content: '❌ Elemen tidak valid.', flags: MessageFlags.Ephemeral });

          const growthRate = parseFloat(interaction.fields.getTextInputValue('growthRate').trim());
          if (isNaN(growthRate) || growthRate < 0.1 || growthRate > 5.0) return interaction.reply({ content: '❌ Growth Rate tidak valid.', flags: MessageFlags.Ephemeral });

          const maxLevel = parseInt(interaction.fields.getTextInputValue('maxLevel').trim());
          if (isNaN(maxLevel) || maxLevel < 1 || maxLevel > 200) return interaction.reply({ content: '❌ Max Level tidak valid.', flags: MessageFlags.Ephemeral });

          pet.baseHp = baseHp;
          pet.baseAtk = baseAtk;
          pet.baseDef = baseDef;
          pet.baseSpd = baseSpd;
          pet.element = element;
          pet.growthRate = growthRate;
          pet.maxLevel = maxLevel;

          await pet.save();
          await logAdminAction(interaction.client, { guildId: interaction.guildId, adminId: interaction.user.id, action: 'EDIT_PET_STATS', details: pet.name });

          return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x2980b9).setTitle('✅ Stats Pet Diperbarui').setDescription(`Atribut untuk **${pet.name}** berhasil diupdate.`)] });
        }

        if (id === 'modal_add_asset') {
          if (!(await isAdmin(interaction))) return interaction.reply({ content: '❌ Kamu bukan admin.', flags: MessageFlags.Ephemeral });
          const name = interaction.fields.getTextInputValue('name').trim();
          const description = interaction.fields.getTextInputValue('description').trim();
          const imageUrl = interaction.fields.getTextInputValue('imageUrl')?.trim() || null;

          const profit = parseAmountCurrency(interaction.fields.getTextInputValue('profitInfo'));
          if (profit.error) return interaction.reply({ content: `❌ ${profit.error}`, flags: MessageFlags.Ephemeral });
          const price = parseAmountCurrencyRank(interaction.fields.getTextInputValue('priceInfo'));
          if (price.error) return interaction.reply({ content: `❌ ${price.error}`, flags: MessageFlags.Ephemeral });

          const exists = await Asset.findOne({ guildId: interaction.guildId, name: new RegExp(`^${name}$`, 'i') });
          if (exists) return interaction.reply({ content: `❌ Aset dengan nama "${name}" sudah ada.`, flags: MessageFlags.Ephemeral });

          await Asset.create({
            guildId: interaction.guildId, name, description, imageUrl,
            dailyProfit: profit.amount, profitCurrency: profit.currency,
            basePrice: price.amount, priceCurrency: price.currency, rank: price.rank,
            createdBy: interaction.user.id,
          });
          await logAdminAction(interaction.client, { guildId: interaction.guildId, adminId: interaction.user.id, action: 'ADD_ASSET', details: name });

          return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x27ae60).setTitle('✅ Aset Dibuat').setDescription(`**${name}** berhasil dibuat dengan profit harian ${profit.amount} ${profit.currency}, harga beli ${price.amount} ${price.currency}.`)] });
        }

        // ---- Edit Asset ----
        if (id.startsWith('modal_edit_asset_')) {
          if (!(await isAdmin(interaction))) return interaction.reply({ content: '❌ Kamu bukan admin.', flags: MessageFlags.Ephemeral });
          const assetId = id.replace('modal_edit_asset_', '');
          const asset = await Asset.findById(assetId);
          if (!asset) return interaction.reply({ content: '❌ Aset tidak ditemukan.', flags: MessageFlags.Ephemeral });

          const name = interaction.fields.getTextInputValue('name').trim();
          const description = interaction.fields.getTextInputValue('description').trim();
          const imageUrl = interaction.fields.getTextInputValue('imageUrl')?.trim() || null;

          const profit = parseAmountCurrency(interaction.fields.getTextInputValue('profitInfo'));
          if (profit.error) return interaction.reply({ content: `❌ ${profit.error}`, flags: MessageFlags.Ephemeral });
          const price = parseAmountCurrencyRank(interaction.fields.getTextInputValue('priceInfo'));
          if (price.error) return interaction.reply({ content: `❌ ${price.error}`, flags: MessageFlags.Ephemeral });

          asset.name = name; asset.description = description; asset.imageUrl = imageUrl;
          asset.dailyProfit = profit.amount; asset.profitCurrency = profit.currency;
          asset.basePrice = price.amount; asset.priceCurrency = price.currency; asset.rank = price.rank;
          await asset.save();
          await logAdminAction(interaction.client, { guildId: interaction.guildId, adminId: interaction.user.id, action: 'EDIT_ASSET', details: name });

          return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x2980b9).setTitle('✅ Aset Diperbarui').setDescription(`**${name}** berhasil diupdate.`)] });
        }

        // ---- Edit Player ----
        if (id.startsWith('modal_edit_player_')) {
          if (!(await isAdmin(interaction))) return interaction.reply({ content: '❌ Kamu bukan admin.', flags: MessageFlags.Ephemeral });
          const discordId = id.replace('modal_edit_player_', '');
          const player = await Player.findOne({ discordId, guildId: interaction.guildId });
          if (!player) return interaction.reply({ content: '❌ Player tidak ditemukan.', flags: MessageFlags.Ephemeral });

          const rt = parseRealm(interaction.fields.getTextInputValue('realm'));
          if (rt.error) return interaction.reply({ content: `❌ ${rt.error}`, flags: MessageFlags.Ephemeral });

          const stage = interaction.fields.getTextInputValue('stage')?.trim() || '-';
          const ageRaw = interaction.fields.getTextInputValue('age').trim();
          const genderRaw = interaction.fields.getTextInputValue('gender')?.trim() || '';
          const characterImage = interaction.fields.getTextInputValue('characterImage')?.trim() || null;

          const age = parseInt(ageRaw, 10);
          if (!Number.isInteger(age) || age < 0) return interaction.reply({ content: '❌ Umur harus angka valid.', flags: MessageFlags.Ephemeral });

          let gender = player.gender;
          if (genderRaw) {
            const normalized = ['Laki-laki', 'Perempuan'].find((g) => g.toLowerCase() === genderRaw.toLowerCase());
            if (!normalized) return interaction.reply({ content: '❌ Jenis kelamin harus "Laki-laki" atau "Perempuan" (atau kosongkan untuk tidak diubah).', flags: MessageFlags.Ephemeral });
            gender = normalized;
          }

          player.realm = rt.realm;
          player.stage = stage; player.age = age; player.gender = gender; player.characterImage = characterImage;
          await player.save();
          await logAdminAction(interaction.client, { guildId: interaction.guildId, adminId: interaction.user.id, action: 'EDIT_PLAYER', targetUserId: discordId, details: `Ranah: ${rt.realm}, Umur: ${age}` });

          // Sinkronisasi role ranah otomatis (copot role ranah lama, pasang role ranah baru kalau ada mapping-nya)
          syncRealmRole(interaction.client, interaction.guildId, discordId, rt.realm).catch((e) => console.error('[REALM-ROLE] Gagal sync:', e.message));

          return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x2980b9).setTitle('✅ Data Player Diperbarui').setDescription(`Profil **${player.characterName}** berhasil diupdate.`)] });
        }
      } catch (err) {
        console.error('[ERROR] Modal submit gagal:', err);
        const payload = { content: '❌ Terjadi kesalahan saat memproses form ini.', flags: MessageFlags.Ephemeral };
        if (interaction.replied || interaction.deferred) await interaction.followUp(payload).catch(() => {});
        else await interaction.reply(payload).catch(() => {});
      }
    }
  },
};


JIANGHU_EOF_MARKER

echo "--> [DIPERBARUI] Menulis commands/player/daftar.js"
cat > commands/player/daftar.js << 'JIANGHU_EOF_MARKER'
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Player = require('../../models/Player');
const { syncRealmRole } = require('../../utils/realmRole');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('daftar')
    .setDescription('Daftar karakter baru untuk memulai roleplay di Jianghu World')
    .addStringOption((opt) =>
      opt.setName('nama').setDescription('Nama karakter kamu').setRequired(true).setMaxLength(32)
    ),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const nama = interaction.options.getString('nama').trim();

    const existing = await Player.findOne({ discordId: interaction.user.id, guildId: interaction.guildId });
    if (existing) {
      return interaction.editReply({
        content: `❌ Kamu sudah terdaftar sebagai **${existing.characterName}**. Satu akun Discord hanya bisa punya 1 karakter. Hubungi admin jika ingin reset.`,
      });
    }

    // Cek nama karakter belum dipakai orang lain di server yang sama
    const nameTaken = await Player.findOne({ guildId: interaction.guildId, characterName: nama });
    if (nameTaken) {
      return interaction.editReply({ content: '❌ Nama karakter itu sudah dipakai player lain. Coba nama lain.' });
    }

    const player = await Player.create({
      discordId: interaction.user.id,
      guildId: interaction.guildId,
      characterName: nama,
    });

    // Ubah nickname Discord otomatis
    try {
      await interaction.member.setNickname(nama);
    } catch (e) {
      // Bot mungkin tidak punya izin (misalnya target adalah Server Owner). Tidak fatal.
      console.warn(`[DAFTAR] Gagal ubah nickname untuk ${interaction.user.id}:`, e.message);
    }

    // Pasang role ranah default kalau admin sudah mapping role untuk ranah awal ini
    syncRealmRole(interaction.client, interaction.guildId, interaction.user.id, player.realm).catch((e) => console.error('[REALM-ROLE] Gagal sync saat daftar:', e.message));

    const embed = new EmbedBuilder()
      .setColor(0x27ae60)
      .setTitle('✅ Pendaftaran Berhasil!')
      .setDescription(
        `Selamat datang di Jianghu, **${nama}**!\n\n` +
        `Karaktermu telah tercatat secara permanen dan terikat ke akun Discord-mu ini. ` +
        `Gunakan \`/profil\` untuk melihat data karaktermu, dan \`/daily\` untuk klaim hadiah harian.`
      )
      .setFooter({ text: 'Semoga perjalananmu di dunia persilatan penuh berkah.' });

    return interaction.editReply({ embeds: [embed] });
  },
};

JIANGHU_EOF_MARKER

echo "--> [DIPERBARUI] Menulis commands/player/help.js"
cat > commands/player/help.js << 'JIANGHU_EOF_MARKER'
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder().setName('help').setDescription('Lihat semua command player'),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const embed = new EmbedBuilder()
      .setColor(0x8e5b3c)
      .setTitle('📖 Daftar Command Player — Jianghu World')
      .addFields(
        { name: '🧍 Karakter', value: '`/daftar [nama]` — Daftar karakter baru\n`/profil [@user]` — Lihat profil karakter' },
        { name: '💰 Currency', value: '`/convert [dari] [ke] [jumlah]` — Konversi mata uang\n`/transfer-currency @user [jenis] [jumlah]` — Kirim currency (butuh konfirmasi)\n`/daily` — Klaim hadiah harian (reset 00:00 WIB)' },
        { name: '🤝 Barter', value: '`/barter-offer @user ...` — Ajukan tukar-menukar item/currency' },
        { name: '🎒 Item, Pet, Aset', value: '`/cek-item [nama]` — Lihat detail item\n`/cek-pet [nama]` — Lihat detail pet\n`/cek-asset [nama]` — Lihat detail aset\n`/claim-profit` — Klaim profit harian dari aset yang dimiliki' },
        { name: '🏪 Shop', value: '`/shop [kategori]` — Lihat daftar barang\n`/beli [kategori] [nama] [jumlah]` — Beli barang\n`/jual [kategori] [nama] [jumlah]` — Jual ke sistem (20% dari harga dasar)' },
        { name: '☠️ Loot', value: '`/loot [nama]` — Ambil harta dari karakter yang meninggal (jika ditujukan padamu)' },
        { name: '🏆 Turnamen & Leaderboard', value: '`/tournament-bracket [nama]` — Lihat bracket turnamen\n`/leaderboard` — Lihat 10 player terkaya' },
      )
      .setFooter({ text: 'Admin? Gunakan /help-admin untuk melihat command khusus admin.' });

    return interaction.editReply({ embeds: [embed] });
  },
};

JIANGHU_EOF_MARKER

echo "--> [DIPERBARUI] Menulis commands/admin/helpAdmin.js"
cat > commands/admin/helpAdmin.js << 'JIANGHU_EOF_MARKER'
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isAdmin } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder().setName('help-admin').setDescription('[ADMIN] Lihat semua command admin'),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    if (!(await isAdmin(interaction))) return interaction.editReply({ content: '❌ Kamu bukan admin.' });

    const embed = new EmbedBuilder()
      .setColor(0xc0392b)
      .setTitle('🛡️ Daftar Command Admin — Jianghu World')
      .addFields(
        { name: '🚀 Panel Cepat', value: '`/admin-panel` — Buka panel tombol untuk aksi cepat' },
        { name: '🗡️ Item', value: '`/admin-add-item` — Tambah item + harga (modal)\n`/admin-edit-item [nama]` — Edit item (modal)\n`/admin-delete-item [nama]` — Hapus item' },
        { name: '🐾 Pet', value: '`/admin-add-pet` — Tambah pet + harga (modal)\n`/admin-edit-pet [nama]` — Edit pet (modal)\n`/admin-delete-pet [nama]` — Hapus pet' },
        { name: '🏠 Asset', value: '`/admin-add-asset` — Buat aset + harga (modal)\n`/admin-edit-asset [nama]` — Edit aset (modal)\n`/admin-delete-asset [nama]` — Hapus aset' },
        { name: '🔒 Channel Whitelist', value: '`/admin-channel-add [channel]` — Izinkan bot di channel ini\n`/admin-channel-remove [channel]` — Cabut izin channel\n`/admin-channel-list` — Lihat semua channel yang diizinkan' },
        { name: '🧍 Player', value: '`/admin-edit-player @user` — Edit ranah/stage/umur/sekte/gambar (modal)\n`/admin-give-currency @user [jenis] [jumlah]`\n`/admin-give-item @user [nama] [jumlah]`\n`/admin-give-pet @user [nama] [nickname]`\n`/admin-give-asset @user [nama] [jumlah]`\n`/admin-remove-item @user [nama] [jumlah]`\n`/admin-remove-pet @user [nama]`\n`/admin-remove-asset @user [nama] [jumlah]`' },
        { name: '⚖️ Moderasi', value: '`/admin-freeze @user [alasan]` — Bekukan karakter\n`/admin-unfreeze @user` — Cabut pembekuan\n`/admin-kill @user @loot-untuk` — Tandai mati, pindah harta ke loot pool\n`/admin-force-unregister @user` — Hapus paksa karakter (perlu konfirmasi)' },
        { name: '🏪 Shop', value: '`/admin-shop-add [kategori] [nama] [harga] [currency] [stok]`\n`/admin-shop-remove [kategori] [nama]`' },
        { name: '🏆 Turnamen Bracket', value: '`/admin-tournament-create [nama]`\n`/admin-tournament-add-player [turnamen] @user`\n`/admin-tournament-remove-player [turnamen] @user`\n`/admin-tournament-start [turnamen]`\n`/admin-tournament-set-winner [turnamen] [match] @pemenang`\n`/admin-tournament-cancel [turnamen]`\n`/admin-tournament-list`' },
        { name: '👑 Role Otomatis', value: '`/admin-leaderboard-role [peringkat] @role` — Role Top 1/2/3 terkaya\n`/admin-realm-role-set [ranah] @role` — Role otomatis per ranah\n`/admin-realm-role-remove [ranah]`\n`/admin-realm-role-list` — Lihat semua mapping role' },
        { name: '🗑️ Manajemen Log', value: '`/admin-set-log-retention [hari]` — Atur usia log sebelum auto-terhapus\n`/admin-clear-logs` — Hapus log lama manual sekarang' },
        { name: '⚙️ Konfigurasi Server', value: '`/admin-set-log [channel-transaksi] [channel-admin]`\n`/admin-set-role @role` — Jadikan role tertentu sebagai admin bot' },
      )
      .setFooter({ text: 'Semua aksi admin otomatis tercatat di channel log admin.' });

    return interaction.editReply({ embeds: [embed] });
  },
};

JIANGHU_EOF_MARKER

echo "--> [DIPERBARUI] Menulis index.js"
cat > index.js << 'JIANGHU_EOF_MARKER'
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const { connectDB } = require('./config/database');
const { runScheduledCleanup } = require('./utils/logCleanup');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,   // wajib untuk ubah nickname & baca role member
    GatewayIntentBits.GuildMessages,
  ],
  partials: [Partials.GuildMember],
});

client.commands = new Collection();

// ====== Load semua command dari commands/player dan commands/admin ======
const commandFolders = ['player', 'admin'];
for (const folder of commandFolders) {
  const commandsPath = path.join(__dirname, 'commands', folder);
  const commandFiles = fs.readdirSync(commandsPath).filter((f) => f.endsWith('.js'));
  for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));
    if (!command?.data || !command?.execute) {
      console.warn(`[WARNING] Command di ${file} tidak punya "data" atau "execute", dilewati.`);
      continue;
    }
    client.commands.set(command.data.name, command);
  }
}
console.log(`[BOT] ${client.commands.size} command berhasil dimuat.`);

// ====== Load semua event dari folder events/ ======
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter((f) => f.endsWith('.js'));
for (const file of eventFiles) {
  const event = require(path.join(eventsPath, file));
  if (event.once) client.once(event.name, (...args) => event.execute(...args));
  else client.on(event.name, (...args) => event.execute(...args));
}

// ====== Jalankan bot ======
(async () => {
  await connectDB();
  await client.login(process.env.DISCORD_TOKEN);

  // ====== Jadwal auto-cleanup log (SATU interval ringan, bukan proses/cron terpisah) ======
  // Jalan pertama kali 2 menit setelah bot nyala (kasih waktu koneksi stabil dulu),
  // lalu berulang setiap 24 jam. Ini TIDAK membebani RAM karena hanya 1 timer aktif sepanjang hidup proses,
  // dan yang dikerjakan cuma query deleteMany terjadwal -- bukan loop/polling terus-menerus.
  setTimeout(() => {
    runScheduledCleanup(client).catch((e) => console.error('[LOG-CLEANUP] Gagal cleanup awal:', e.message));
    setInterval(() => {
      runScheduledCleanup(client).catch((e) => console.error('[LOG-CLEANUP] Gagal cleanup terjadwal:', e.message));
    }, 24 * 60 * 60 * 1000); // 24 jam
  }, 2 * 60 * 1000); // tunggu 2 menit setelah startup
})();

// Tangani error yang tidak tertangkap supaya bot tidak crash diam-diam
process.on('unhandledRejection', (err) => {
  console.error('[UNHANDLED REJECTION]', err);
});

JIANGHU_EOF_MARKER

echo ""
echo "=== Semua file berhasil ditulis. Menjalankan langkah selanjutnya... ==="

echo "--> Install/update dependency npm..."
npm install

echo "--> Menjalankan migrasi totalWealth (backfill data lama untuk leaderboard)..."
node migrate-wealth.js

echo "--> Mendaftarkan ulang slash command ke Discord (ada command baru)..."
node deploy-commands.js

echo "--> Restart bot via PM2..."
pm2 restart jianghu-bot

echo ""
echo "=== SELESAI! Semua fitur baru sudah aktif. Cek log dengan: pm2 logs jianghu-bot ==="
