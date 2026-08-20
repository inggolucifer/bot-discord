const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Player = require('../../../models/Player');
const Item = require('../../../models/Item');
const { logTransaction } = require('../../../utils/logger');
const { getPlayerSect } = require('../../../utils/sectUtils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sekte-deposit-resource')
    .setDescription('Setorkan item dari inventorymu ke stok sumber daya sekte')
    .addStringOption((o) => o.setName('nama-item').setDescription('Nama item yang mau disetor').setRequired(true).setAutocomplete(true))
    .addIntegerOption((o) => o.setName('jumlah').setDescription('Jumlah').setRequired(true).setMinValue(1)),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused();
    const player = await Player.findOne({ discordId: interaction.user.id, guildId: interaction.guildId });
    if (!player) return interaction.respond([]);
    const items = await Item.find({ _id: { $in: player.inventory.map((i) => i.itemId) }, name: new RegExp(focused, 'i') }).limit(25);
    return interaction.respond(items.map((i) => ({ name: i.name, value: i.name })));
  },

  async execute(interaction) {
    await interaction.deferReply();

    const namaItem = interaction.options.getString('nama-item');
    const jumlah = interaction.options.getInteger('jumlah');

    const player = await Player.findOne({ discordId: interaction.user.id, guildId: interaction.guildId });
    if (!player) return interaction.editReply({ content: '❌ Kamu belum terdaftar.' });
    if (player.status !== 'active') return interaction.editReply({ content: `❌ Karaktermu berstatus **${player.status}**.` });

    const sect = await getPlayerSect(interaction.guildId, interaction.user.id);
    if (!sect) return interaction.editReply({ content: '❌ Kamu tidak sedang bergabung dalam sekte manapun.' });

    const item = await Item.findOne({ guildId: interaction.guildId, name: new RegExp(`^${namaItem}$`, 'i') });
    if (!item) return interaction.editReply({ content: `❌ Item "${namaItem}" tidak ditemukan.` });

    const owned = player.inventory.find((i) => i.itemId.equals(item._id));
    if (!owned || owned.quantity < jumlah) {
      return interaction.editReply({ content: `❌ Item "${item.name}" kamu tidak cukup. Kamu punya ${owned?.quantity || 0}.` });
    }

    owned.quantity -= jumlah;
    if (owned.quantity <= 0) player.inventory = player.inventory.filter((i) => !i.itemId.equals(item._id));
    await player.save();

    const sectOwned = sect.resources.find((r) => r.itemId.equals(item._id));
    if (sectOwned) sectOwned.quantity += jumlah; else sect.resources.push({ itemId: item._id, quantity: jumlah });
    await sect.save();

    await logTransaction(interaction.client, {
      guildId: interaction.guildId, type: 'sect_deposit', fromUserId: interaction.user.id,
      itemDescription: `${jumlah}x ${item.name} disetor ke sekte ${sect.name}`,
    });

    return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0x27ae60).setTitle('✅ Setoran Berhasil').setDescription(`Kamu menyetor **${jumlah}x ${item.name}** ke sumber daya sekte **${sect.name}**.`)] });
  },
};
