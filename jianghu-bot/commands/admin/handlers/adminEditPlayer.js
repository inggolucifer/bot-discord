const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, MessageFlags } = require('discord.js');
const { isAdmin } = require('../../../utils/permissions');
const Player = require('../../../models/Player');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-edit-player')
    .setDescription('[ADMIN] Edit data karakter player (ranah, umur, gender, gambar) lewat form')
    .addUserOption((o) => o.setName('user').setDescription('Player yang mau diedit').setRequired(true)),

  async execute(interaction) {
    // PENTING: TIDAK boleh deferReply() di sini karena showModal() harus jadi respons PERTAMA
    // terhadap interaction (Discord API melarang showModal setelah deferReply/reply).
    if (!(await isAdmin(interaction))) return interaction.reply({ content: '❌ Kamu bukan admin.', flags: MessageFlags.Ephemeral });

    const target = interaction.options.getUser('user');
    const player = await Player.findOne({ discordId: target.id, guildId: interaction.guildId });
    if (!player) return interaction.reply({ content: `❌ ${target.username} belum terdaftar.`, flags: MessageFlags.Ephemeral });

    const modal = new ModalBuilder().setCustomId(`modal_edit_player_${target.id}`).setTitle(`Edit: ${player.characterName}`.slice(0, 45));
    modal.addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('realm').setLabel('Ranah (nama saja, tanpa tier)').setStyle(TextInputStyle.Short).setValue(player.realm).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('stage').setLabel('Stage (mis. Menengah/Puncak, opsional)').setStyle(TextInputStyle.Short).setValue(player.stage || '-').setRequired(false)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('age').setLabel('Umur').setStyle(TextInputStyle.Short).setValue(String(player.age)).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('gender').setLabel('Jenis Kelamin (Laki-laki/Perempuan)').setStyle(TextInputStyle.Short).setValue(player.gender || '').setRequired(false)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('characterImage').setLabel('URL Gambar Karakter').setStyle(TextInputStyle.Short).setValue(player.characterImage || '').setRequired(false)),
    );
    await interaction.showModal(modal);
  },
};

