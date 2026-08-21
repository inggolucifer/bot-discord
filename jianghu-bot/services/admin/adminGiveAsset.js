const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { isAdmin } = require('../../utils/permissions');
const Player = require('../../models/Player');
const Asset = require('../../models/Asset');
const { logAdminAction } = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-give-asset')
    .setDescription('[ADMIN] Beri kepemilikan aset ke player')
    .addUserOption((o) => o.setName('user').setDescription('Target player').setRequired(true))
    .addStringOption((o) => o.setName('nama').setDescription('Nama aset').setRequired(true).setAutocomplete(true))
    .addIntegerOption((o) => o.setName('jumlah').setDescription('Jumlah (default 1)').setMinValue(1))
    .addBooleanOption((o) => o.setName('skip-pembangunan').setDescription('Lewati waktu pembangunan (langsung jadi/selesai)? Default: tidak')),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused();
    const assets = await Asset.find({ guildId: interaction.guildId, name: new RegExp(focused, 'i') }).limit(25);
    await interaction.respond(assets.map((a) => ({ name: a.name, value: a.name })));
  },

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    if (!(await isAdmin(interaction))) return interaction.editReply({ content: '❌ Kamu bukan admin.' });

    const target = interaction.options.getUser('user');
    const nama = interaction.options.getString('nama');
    const jumlah = interaction.options.getInteger('jumlah') || 1;
    const skipPembangunan = interaction.options.getBoolean('skip-pembangunan') || false;

    const player = await Player.findOne({ discordId: target.id, guildId: interaction.guildId });
    if (!player) return interaction.editReply({ content: `❌ ${target.username} belum terdaftar.` });
    const asset = await Asset.findOne({ guildId: interaction.guildId, name: new RegExp(`^${nama}$`, 'i') });
    if (!asset) return interaction.editReply({ content: `❌ Aset "${nama}" tidak ditemukan.` });

    const currentTotalAssets = player.assets.reduce((sum, a) => sum + (a.quantity || 1), 0);
    const maxAssetSlots = player.assetSlots || 1;
    if (currentTotalAssets + jumlah > maxAssetSlots) {
      return interaction.editReply({ content: `❌ Lahan aset target tidak cukup. Saat ini: ${currentTotalAssets}/${maxAssetSlots}. Butuh ${jumlah} slot lagi. Target harus menambah slotnya.` });
    }

    const owned = player.assets.find((a) => a.assetId.equals(asset._id));
    if (owned) {
      owned.quantity += jumlah;
    } else {
      const constructionCompleteAt = (!skipPembangunan && asset.constructionTimeHours > 0)
        ? new Date(Date.now() + asset.constructionTimeHours * 60 * 60 * 1000)
        : null;
      player.assets.push({ assetId: asset._id, quantity: jumlah, lastClaimAt: null, constructionCompleteAt });
    }
    await player.save();

    await logAdminAction(interaction.client, {
      guildId: interaction.guildId, adminId: interaction.user.id, action: 'GIVE_ASSET', targetUserId: target.id,
      details: `${jumlah}x ${asset.name}${skipPembangunan ? ' (skip pembangunan)' : ''}`,
    });

    return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0x2980b9).setTitle('✅ Aset Diberikan').setDescription(`${target} sekarang memiliki **${jumlah}x ${asset.name}**.`)] });
  },
};

