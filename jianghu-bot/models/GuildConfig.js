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
  adminRoleIds: { type: [String], default: [] },
  workerChannelId: { type: String, default: null },
  auctionChannelId: { type: String, default: null },       // Channel untuk menampilkan lelang aktif
  auctionRequestChannelId: { type: String, default: null }, // Channel khusus admin untuk review request lelang

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

