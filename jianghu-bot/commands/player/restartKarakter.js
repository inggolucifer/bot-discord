const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const Player = require('../../models/Player');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('restart-karakter')
    .setDescription('Restart karakter yang sudah mati (Reset semua data kecuali discordId dan guildId)'),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const player = await Player.findOne({ discordId: interaction.user.id, guildId: interaction.guildId });
    if (!player) return interaction.editReply({ content: '❌ Kamu belum terdaftar.' });

    if (player.status !== 'dead') {
      return interaction.editReply({ content: '❌ Karaktermu masih hidup! Command ini hanya untuk karakter yang sudah meninggal.' });
    }

    const embed = new EmbedBuilder()
      .setColor(0xe74c3c)
      .setTitle('⚠️ Konfirmasi Restart Karakter')
      .setDescription('Apakah kamu yakin ingin me-restart karaktermu dari awal?\n\n**PERINGATAN:**\nSemua inventory, pets, aset, dan currency akan hilang. Umur akan di-reset, dan status akan kembali aktif. Nama karakter tetap dipertahankan.\n\nTindakan ini **TIDAK BISA DIBATALKAN**.');

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('confirm_restart_karakter_yes').setLabel('Ya, Restart').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('cancel_action').setLabel('Batal').setStyle(ButtonStyle.Secondary)
    );

    return interaction.editReply({ embeds: [embed], components: [row] });
  }
};
