const { escapeRegex } = require('../../utils/escapeRegex');
const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { isAdmin } = require('../../utils/permissions');
const Player = require('../../models/Player');
const Asset = require('../../models/Asset');
const { logAdminAction } = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-asset-finish-construction')
    .setDescription('[ADMIN] Percepat/selesaikan langsung pembangunan aset milik seorang player')
    .addUserOption((o) => o.setName('user').setDescription('Pemilik aset').setRequired(true))
    .addStringOption((o) => o.setName('nama').setDescription('Nama aset yang sedang dibangun').setRequired(true).setAutocomplete(true)),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused();
    const targetId = interaction.options.get('user')?.value;
    if (!targetId) return interaction.respond([]);
    const player = await Player.findOne({ discordId: targetId, guildId: interaction.guildId });
    if (!player) return interaction.respond([]);
    const assets = await Asset.find({ _id: { $in: player.assets.map((a) => a.assetId) }, name: new RegExp(escapeRegex(focused), 'i') }).limit(25);
    return interaction.respond(assets.map((a) => ({ name: a.name, value: a.name })));
  },

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    if (!(await isAdmin(interaction))) return interaction.editReply({ content: '❌ Kamu bukan admin.' });

    const target = interaction.options.getUser('user');
    const nama = interaction.options.getString('nama');

    const player = await Player.findOne({ discordId: target.id, guildId: interaction.guildId });
    if (!player) return interaction.editReply({ content: `❌ ${target.username} belum terdaftar.` });

    const asset = await Asset.findOne({ guildId: interaction.guildId, name: new RegExp(`^${escapeRegex(nama)}$`, 'i') });
    if (!asset) return interaction.editReply({ content: `❌ Aset "${nama}" tidak ditemukan.` });

    const owned = player.assets.find((a) => a.assetId.equals(asset._id));
    if (!owned) return interaction.editReply({ content: `❌ ${target.username} tidak memiliki aset "${asset.name}".` });

    owned.constructionCompleteAt = null;
    await player.save();

    await logAdminAction(interaction.client, {
      guildId: interaction.guildId, adminId: interaction.user.id, action: 'FINISH_CONSTRUCTION', targetUserId: target.id, details: asset.name,
    });

    return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0x27ae60).setTitle('✅ Pembangunan Selesai').setDescription(`**${asset.name}** milik ${target} sekarang langsung bisa dipakai (berproduksi/craft).`)] });
  },
};

