const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { isAdmin } = require('../../utils/permissions');
const Player = require('../../models/Player');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-force-unregister')
    .setDescription('[ADMIN] Hapus paksa pendaftaran karakter player (data akan hilang permanen)')
    .addUserOption((o) => o.setName('user').setDescription('Target player').setRequired(true)),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    if (!(await isAdmin(interaction))) return interaction.editReply({ content: '❌ Kamu bukan admin.' });
    const target = interaction.options.getUser('user');
    const player = await Player.findOne({ discordId: target.id, guildId: interaction.guildId });
    if (!player) return interaction.editReply({ content: `❌ ${target.username} belum terdaftar.` });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`confirm_unregister_${target.id}`).setLabel('Ya, Hapus Permanen').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('cancel_action').setLabel('Batal').setStyle(ButtonStyle.Secondary),
    );
    const embed = new EmbedBuilder().setColor(0xc0392b).setTitle('⚠️ Konfirmasi Force-Unregister')
      .setDescription(`Yakin ingin menghapus PERMANEN karakter **${player.characterName}** milik ${target}? Semua currency, item, pet, dan aset akan hilang. Aksi ini TIDAK bisa dibatalkan.`);
    return interaction.editReply({ embeds: [embed], components: [row] });
  },
};
