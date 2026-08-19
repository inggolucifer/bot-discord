const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, MessageFlags } = require('discord.js');
const { isAdmin } = require('../../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder().setName('admin-add-pet').setDescription('[ADMIN] Tambah pet baru lewat form (modal)'),

  async execute(interaction) {
    if (!(await isAdmin(interaction))) return interaction.reply({ content: '❌ Kamu bukan admin.', flags: MessageFlags.Ephemeral });

    const modal = new ModalBuilder().setCustomId('modal_add_pet').setTitle('Tambah Pet Baru');
    modal.addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('name').setLabel('Nama Pet').setStyle(TextInputStyle.Short).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('rankTier').setLabel('Rank & Tier (contoh: Epic 5)').setStyle(TextInputStyle.Short)
        .setPlaceholder('Common/Uncommon/Rare/Epic/Legendary/Mythical + Tier 1-9').setValue('Common 1').setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('priceInfo').setLabel('Harga Dasar & Currency (contoh: 500 silver)').setStyle(TextInputStyle.Short)
        .setPlaceholder('angka + silver/gold/jade/spirit. Isi 0 kalau tidak dijual.').setValue('0 silver').setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('description').setLabel('Deskripsi').setStyle(TextInputStyle.Paragraph).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('imageUrl').setLabel('URL Gambar (opsional)').setStyle(TextInputStyle.Short).setRequired(false)),
    );
    await interaction.showModal(modal);
  },
};
