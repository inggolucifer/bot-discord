const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isAdmin } = require('../../utils/permissions');
const GuildConfig = require('../../models/GuildConfig');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-realm-role-remove')
    .setDescription('[ADMIN] Hapus mapping role otomatis untuk ranah tertentu')
    .addStringOption((o) => o.setName('nama-ranah').setDescription('Nama ranah yang mappingnya mau dihapus').setRequired(true)),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    if (!(await isAdmin(interaction))) return interaction.editReply({ content: '❌ Kamu bukan admin.' });

    const namaRanah = interaction.options.getString('nama-ranah').trim();
    const config = await GuildConfig.findOne({ guildId: interaction.guildId });
    if (!config) return interaction.editReply({ content: '❌ Belum ada mapping role ranah sama sekali.' });

    const before = config.realmRoles.length;
    config.realmRoles = config.realmRoles.filter((r) => r.realmName.toLowerCase() !== namaRanah.toLowerCase());
    if (config.realmRoles.length === before) return interaction.editReply({ content: `❌ Tidak ada mapping untuk ranah "${namaRanah}".` });

    await config.save();
    return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xc0392b).setTitle('🗑️ Mapping Role Ranah Dihapus').setDescription(`Mapping untuk ranah **"${namaRanah}"** telah dihapus.`)] });
  },
};

