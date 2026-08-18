const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isAdmin } = require('../../utils/permissions');
const Sect = require('../../models/Sect');
const Asset = require('../../models/Asset');
const { logAdminAction } = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-sekte-give-asset')
    .setDescription('[ADMIN] Beri kepemilikan aset ke sebuah sekte')
    .addStringOption((o) => o.setName('nama-sekte').setDescription('Nama sekte').setRequired(true).setAutocomplete(true))
    .addStringOption((o) => o.setName('nama-aset').setDescription('Nama aset').setRequired(true).setAutocomplete(true))
    .addIntegerOption((o) => o.setName('jumlah').setDescription('Jumlah (default 1)').setMinValue(1))
    .addBooleanOption((o) => o.setName('skip-pembangunan').setDescription('Lewati waktu pembangunan? Default: tidak')),

  async autocomplete(interaction) {
    const focusedOpt = interaction.options.getFocused(true);
    if (focusedOpt.name === 'nama-sekte') {
      const list = await Sect.find({ guildId: interaction.guildId, name: new RegExp(focusedOpt.value, 'i') }).limit(25);
      return interaction.respond(list.map((s) => ({ name: s.name, value: s.name })));
    }
    const assets = await Asset.find({ guildId: interaction.guildId, name: new RegExp(focusedOpt.value, 'i') }).limit(25);
    return interaction.respond(assets.map((a) => ({ name: a.name, value: a.name })));
  },

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    if (!(await isAdmin(interaction))) return interaction.editReply({ content: '❌ Kamu bukan admin.' });

    const namaSekte = interaction.options.getString('nama-sekte');
    const namaAset = interaction.options.getString('nama-aset');
    const jumlah = interaction.options.getInteger('jumlah') || 1;
    const skipPembangunan = interaction.options.getBoolean('skip-pembangunan') || false;

    const sect = await Sect.findOne({ guildId: interaction.guildId, name: new RegExp(`^${namaSekte}$`, 'i') });
    if (!sect) return interaction.editReply({ content: `❌ Sekte "${namaSekte}" tidak ditemukan.` });

    const asset = await Asset.findOne({ guildId: interaction.guildId, name: new RegExp(`^${namaAset}$`, 'i') });
    if (!asset) return interaction.editReply({ content: `❌ Aset "${namaAset}" tidak ditemukan.` });

    const owned = sect.assets.find((a) => a.assetId.equals(asset._id));
    if (owned) {
      owned.quantity += jumlah;
    } else {
      const constructionCompleteAt = (!skipPembangunan && asset.constructionTimeHours > 0)
        ? new Date(Date.now() + asset.constructionTimeHours * 60 * 60 * 1000)
        : null;
      sect.assets.push({ assetId: asset._id, quantity: jumlah, lastClaimAt: null, constructionCompleteAt });
    }
    await sect.save();

    await logAdminAction(interaction.client, { guildId: interaction.guildId, adminId: interaction.user.id, action: 'SECT_GIVE_ASSET', details: `${sect.name}: +${jumlah} ${asset.name}` });

    return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0x2980b9).setTitle('✅ Aset Sekte Ditambahkan').setDescription(`Sekte **${sect.name}** sekarang memiliki **${jumlah}x ${asset.name}**.`)] });
  },
};

