const { escapeRegex } = require('../../utils/escapeRegex');
const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { isAdmin } = require('../../utils/permissions');
const Asset = require('../../models/Asset');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-asset-set-construction')
    .setDescription('[ADMIN] Atur waktu pembangunan (jam) untuk sebuah jenis aset')
    .addStringOption((o) => o.setName('nama').setDescription('Nama aset').setRequired(true).setAutocomplete(true))
    .addIntegerOption((o) => o.setName('jam').setDescription('Waktu pembangunan dalam jam (0 = langsung jadi)').setRequired(true).setMinValue(0)),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused();
    const assets = await Asset.find({ name: new RegExp(escapeRegex(focused), 'i') }).limit(25);
    return interaction.respond(assets.map((a) => ({ name: a.name, value: a.name })));
  },

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    if (!(await isAdmin(interaction))) return interaction.editReply({ content: '❌ Kamu bukan admin.' });

    const nama = interaction.options.getString('nama');
    const jam = interaction.options.getInteger('jam');

    const asset = await Asset.findOne({ name: new RegExp(`^\\s*${escapeRegex(nama)}\\s*$`, 'i') });
    if (!asset) return interaction.editReply({ content: `❌ Aset "${nama}" tidak ditemukan.` });

    asset.constructionTimeHours = jam;
    await asset.save();

    const embed = new EmbedBuilder()
      .setColor(0x2980b9)
      .setTitle('✅ Waktu Pembangunan Diperbarui')
      .setDescription(`Aset **${asset.name}** sekarang butuh **${jam} jam** untuk selesai dibangun setiap kali ada player/sekte yang baru pertama kali memilikinya.`);
    return interaction.editReply({ embeds: [embed] });
  },
};

