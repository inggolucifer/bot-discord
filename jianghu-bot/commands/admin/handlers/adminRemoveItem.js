const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { isAdmin } = require('../../../utils/permissions');
const Player = require('../../../models/Player');
const Item = require('../../../models/Item');
const { logAdminAction } = require('../../../utils/logger');

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

