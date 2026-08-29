const { escapeRegex } = require('../../utils/escapeRegex');
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Player = require('../../models/Player');
const Item = require('../../models/Item');
const { logTransaction } = require('../../utils/logger');

async function findOwnedItem(player, guildId, itemName) {
  if (!itemName) return null;
  const itemDoc = await Item.findOne({ name: new RegExp(`^${escapeRegex(itemName)}$`, 'i') });
  if (!itemDoc) return { error: `Item "${itemName}" tidak ditemukan.` };
  const owned = player.inventory.find((i) => i.itemId.equals(itemDoc._id));
  if (!owned) return { error: `Kamu tidak memiliki item "${itemDoc.name}".` };
  return { itemDoc, owned };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('transfer-item')
    .setDescription('Transfer item ke player lain (butuh konfirmasi penerima, pajak 1 Silver per item)')
    .addUserOption((opt) => opt.setName('user').setDescription('Penerima').setRequired(true))
    .addStringOption((opt) => opt.setName('nama-item').setDescription('Nama item yang ingin dikirim').setRequired(true).setAutocomplete(true))
    .addIntegerOption((opt) => opt.setName('jumlah').setDescription('Jumlah item').setRequired(true).setMinValue(1)),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused();
    const player = await Player.findOne({ discordId: interaction.user.id, guildId: interaction.guildId });
    if (!player) return interaction.respond([]);
    const items = await Item.find({ _id: { $in: player.inventory.map((i) => i.itemId) }, name: new RegExp(escapeRegex(focused), 'i') }).limit(25);
    return interaction.respond(items.map((i) => ({ name: i.name, value: i.name })));
  },

  async execute(interaction) {
    await interaction.deferReply();

    const target = interaction.options.getUser('user');
    const itemName = interaction.options.getString('nama-item');
    const jumlah = interaction.options.getInteger('jumlah');
    const pajak = jumlah; // 1 Silver per item

    if (target.id === interaction.user.id) {
      return interaction.editReply({ content: '❌ Tidak bisa transfer ke diri sendiri.' });
    }
    if (target.bot) {
      return interaction.editReply({ content: '❌ Tidak bisa transfer ke bot.' });
    }

    const sender = await Player.findOne({ discordId: interaction.user.id, guildId: interaction.guildId });
    if (!sender) return interaction.editReply({ content: '❌ Kamu belum terdaftar.' });
    if (sender.status !== 'active') return interaction.editReply({ content: `❌ Karaktermu berstatus **${sender.status}**, tidak bisa transfer.` });

    if (sender.currency.silver < pajak) {
      return interaction.editReply({ content: `❌ Saldo Silver kamu tidak cukup untuk membayar pajak kirim. (Butuh: **${pajak} Silver**, Saldo: **${sender.currency.silver} Silver**)` });
    }

    const receiver = await Player.findOne({ discordId: target.id, guildId: interaction.guildId });
    if (!receiver) return interaction.editReply({ content: `❌ ${target.username} belum terdaftar sebagai karakter.` });
    if (receiver.status !== 'active') return interaction.editReply({ content: `❌ Karakter penerima berstatus **${receiver.status}**, tidak bisa menerima transfer.` });

    const res = await findOwnedItem(sender, interaction.guildId, itemName);
    if (res.error) return interaction.editReply({ content: `❌ ${res.error}` });
    if (res.owned.quantity < jumlah) return interaction.editReply({ content: `❌ Item "${res.itemDoc.name}" kamu hanya ${res.owned.quantity}, tidak cukup untuk mengirim ${jumlah}.` });
    const itemDoc = res.itemDoc;

    const embed = new EmbedBuilder()
      .setColor(0xf39c12)
      .setTitle('📦 Permintaan Transfer Item')
      .setDescription(
        `${interaction.user} ingin mengirim **${jumlah}x ${itemDoc.name}** kepada ${target}.\n\n` +
        `Pajak pengiriman ini adalah **${pajak} Silver** dan akan ditanggung oleh ${interaction.user}.\n\n` +
        `${target}, apakah kamu menerima?`
      )
      .setFooter({ text: 'Permintaan ini kedaluwarsa dalam 5 menit.' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`transfer_item_accept_${interaction.user.id}_${target.id}_${itemDoc._id}_${jumlah}`).setLabel('Terima').setStyle(ButtonStyle.Success).setEmoji('✅'),
      new ButtonBuilder().setCustomId(`transfer_item_decline_${interaction.user.id}_${target.id}`).setLabel('Tolak').setStyle(ButtonStyle.Danger).setEmoji('❌'),
    );

    const message = await interaction.editReply({ content: `${target}`, embeds: [embed], components: [row] });

    const collector = message.createMessageComponentCollector({ time: 5 * 60 * 1000, max: 1 });

    collector.on('collect', async (btnInteraction) => {
      if (btnInteraction.user.id !== target.id) {
        return btnInteraction.reply({ content: '❌ Hanya penerima yang bisa merespon permintaan ini.' });
      }

      if (btnInteraction.customId.startsWith('transfer_item_decline')) {
        await btnInteraction.update({ content: `❌ ${target.username} menolak transfer item ini.`, embeds: [], components: [] });
        return;
      }

      const freshSender = await Player.findOne({ discordId: interaction.user.id, guildId: interaction.guildId });
      const freshReceiver = await Player.findOne({ discordId: target.id, guildId: interaction.guildId });

      if (!freshSender || freshSender.status !== 'active') {
        return btnInteraction.update({ content: '❌ Transfer gagal: status pengirim berubah.', embeds: [], components: [] });
      }
      if (!freshReceiver || freshReceiver.status !== 'active') {
        return btnInteraction.update({ content: '❌ Transfer gagal: status penerima berubah.', embeds: [], components: [] });
      }

      if (freshSender.currency.silver < pajak) {
        return btnInteraction.update({ content: `❌ Transfer gagal: Saldo Silver ${interaction.user.username} tidak cukup untuk membayar pajak saat ini.`, embeds: [], components: [] });
      }

      const senderItem = freshSender.inventory.find(i => i.itemId.equals(itemDoc._id));
      if (!senderItem || senderItem.quantity < jumlah) {
        return btnInteraction.update({ content: `❌ Transfer gagal: Jumlah item ${itemDoc.name} milik ${interaction.user.username} tidak cukup.`, embeds: [], components: [] });
      }

      // Potong saldo pengirim
      freshSender.currency.silver -= pajak;

      // Transfer item
      senderItem.quantity -= jumlah;
      if (senderItem.quantity === 0) {
        freshSender.inventory = freshSender.inventory.filter(i => !i.itemId.equals(itemDoc._id));
      }

      const receiverItem = freshReceiver.inventory.find(i => i.itemId.equals(itemDoc._id));
      if (receiverItem) {
        receiverItem.quantity += jumlah;
      } else {
        freshReceiver.inventory.push({ itemId: itemDoc._id, quantity: jumlah });
      }

      await freshSender.save();
      await freshReceiver.save();

      await logTransaction(btnInteraction.client, {
        guildId: interaction.guildId,
        type: 'transfer', // Reusing transfer type
        fromUserId: interaction.user.id,
        toUserId: target.id,
        itemDescription: `Transfer ${jumlah}x ${itemDoc.name} dari ${interaction.user.tag} ke ${target.tag} (Pajak ${pajak} Silver ditanggung pengirim)`,
      });

      const doneEmbed = new EmbedBuilder()
        .setColor(0x27ae60)
        .setTitle('✅ Transfer Item Berhasil')
        .setDescription(`**${jumlah}x ${itemDoc.name}** berhasil dikirim dari ${interaction.user} ke ${target}.\n\n${interaction.user} telah membayar pajak pengiriman sebesar **${pajak} Silver**.`);

      await btnInteraction.update({ content: null, embeds: [doneEmbed], components: [] });
    });

    collector.on('end', async (collected) => {
      if (collected.size === 0) {
        await interaction.editReply({ content: '⌛ Permintaan transfer item kedaluwarsa (5 menit).', embeds: [], components: [] }).catch(() => {});
      }
    });
  },
};
