const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { isAdmin } = require('../../../utils/permissions');
const Player = require('../../../models/Player');
const Asset = require('../../../models/Asset');
const { logAdminAction } = require('../../../utils/logger');

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

