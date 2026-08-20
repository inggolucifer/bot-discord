const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags } = require('discord.js');
const { isAdmin } = require('../utils/permissions');
const Item = require('../models/Item');
const Pet = require('../models/Pet');
const Asset = require('../models/Asset');
const Player = require('../models/Player');
const Tournament = require('../models/Tournament');
const Sect = require('../models/Sect');
const { logAdminAction, logTransaction } = require('../utils/logger');
const { manualCleanup } = require('../utils/logCleanup');
const { executeSectWar } = require('../utils/sectWar');

async function handleButton(interaction) {
  const id = interaction.customId;

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

  if (id.startsWith('approve_auction_')) {
    if (!(await isAdmin(interaction))) return interaction.reply({ content: '❌ Kamu bukan admin.', flags: MessageFlags.Ephemeral });
    const auctionId = id.replace('approve_auction_', '');
    const Auction = require('../models/Auction');
    const GuildConfig = require('../models/GuildConfig');

    const auction = await Auction.findById(auctionId).populate('itemId sellerId');
    if (!auction) return interaction.reply({ content: '❌ Lelang tidak ditemukan.', flags: MessageFlags.Ephemeral });
    if (auction.status !== 'pending') return interaction.reply({ content: '❌ Lelang ini sudah tidak pending.', flags: MessageFlags.Ephemeral });

    const config = await GuildConfig.findOne({ guildId: interaction.guildId });
    if (!config || !config.auctionChannelId) {
      return interaction.reply({ content: '❌ Channel lelang belum diset, tidak bisa approve.', flags: MessageFlags.Ephemeral });
    }

    const auctionChannel = interaction.guild.channels.cache.get(config.auctionChannelId);
    if (!auctionChannel) {
      return interaction.reply({ content: '❌ Channel lelang tidak ditemukan di server.', flags: MessageFlags.Ephemeral });
    }

    // Set expiration 24 jam dari sekarang
    auction.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    auction.status = 'active';
    await auction.save();

    const embed = new EmbedBuilder()
      .setTitle('📢 LELANG PEMAIN BARU!')
      .setDescription(`Pemain <@${auction.sellerId.discordId}> mengadakan lelang untuk item berikut:\n\n**Barang:** ${auction.itemId.name} (x${auction.quantity})\n**Harga Awal:** ${auction.startingBid} Silver\n\nGunakan \`/lelang bid id-lelang:${auction._id} jumlah-bid:[...]\` untuk menawar!\n*Berakhir: <t:${Math.floor(auction.expiresAt.getTime() / 1000)}:R>*`)
      .setColor('#FFA500')
      .addFields({ name: 'ID Lelang', value: auction._id.toString() });

    const msg = await auctionChannel.send({ embeds: [embed] });
    auction.messageId = msg.id;
    await auction.save();

    return interaction.update({ content: `✅ Lelang untuk **${auction.itemId.name}** disetujui dan dikirim ke <#${config.auctionChannelId}>.`, embeds: [], components: [] });
  }

  if (id.startsWith('reject_auction_')) {
    if (!(await isAdmin(interaction))) return interaction.reply({ content: '❌ Kamu bukan admin.', flags: MessageFlags.Ephemeral });
    const auctionId = id.replace('reject_auction_', '');
    const Auction = require('../models/Auction');
    const Player = require('../models/Player');

    const auction = await Auction.findById(auctionId).populate('itemId sellerId');
    if (!auction) return interaction.reply({ content: '❌ Lelang tidak ditemukan.', flags: MessageFlags.Ephemeral });
    if (auction.status !== 'pending') return interaction.reply({ content: '❌ Lelang ini sudah tidak pending.', flags: MessageFlags.Ephemeral });

    auction.status = 'rejected';
    await auction.save();

    // Kembalikan item
    if (auction.sellerId) {
      const player = await Player.findById(auction.sellerId._id);
      if (player) {
        const invIndex = player.inventory.findIndex(i => i.itemId.toString() === auction.itemId._id.toString());
        if (invIndex >= 0) {
          player.inventory[invIndex].quantity += auction.quantity;
        } else {
          player.inventory.push({ itemId: auction.itemId._id, quantity: auction.quantity });
        }
        await player.save();
      }
    }

    return interaction.update({ content: `❌ Lelang untuk **${auction.itemId?.name || 'Item'}** telah ditolak. Barang dikembalikan ke pemain.`, embeds: [], components: [] });
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

}

module.exports = { handleButton };
