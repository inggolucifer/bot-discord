const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Player = require('../../models/Player');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ubah-umur')
    .setDescription('Ubah umur karaktermu sendiri')
    .addIntegerOption((o) => o.setName('umur-baru').setDescription('Umur baru karaktermu').setRequired(true).setMinValue(1).setMaxValue(9999)),

  async execute(interaction) {
    await interaction.deferReply();

    const umurBaru = interaction.options.getInteger('umur-baru');

    const player = await Player.findOne({ discordId: interaction.user.id, guildId: interaction.guildId });
    if (!player) return interaction.editReply({ content: '❌ Kamu belum terdaftar. Gunakan `/daftar` dulu.' });
    if (player.status !== 'active') return interaction.editReply({ content: `❌ Karaktermu berstatus **${player.status}**, tidak bisa mengubah data.` });

    const umurLama = player.age;
    player.age = umurBaru;
    await player.save();

    const embed = new EmbedBuilder()
      .setColor(0x2980b9)
      .setTitle('🎂 Umur Diperbarui')
      .setDescription(`Umur **${player.characterName}** diubah dari ${umurLama} tahun menjadi **${umurBaru} tahun**.`);
    return interaction.editReply({ embeds: [embed] });
  },
};

