const { Events, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, MessageFlags } = require('discord.js');
const Item = require('../models/Item');
const Pet = require('../models/Pet');
const Asset = require('../models/Asset');
const Player = require('../models/Player');
const Tournament = require('../models/Tournament');
const Sect = require('../models/Sect');
const { isAdmin, isChannelAllowed } = require('../utils/permissions');
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

