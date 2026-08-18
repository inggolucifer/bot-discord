const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const { isAdmin } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-add-item')
    .setDescription('[ADMIN] Tambah item baru lewat form (modal)'),

  async execute(interaction) {
    if (!(await isAdmin(interaction))) return interaction.reply({ content: '❌ Kamu bukan admin.', ephemeral: true });

    const modal = new ModalBuilder().setCustomId('modal_add_item').setTitle('Tambah Item Baru');

    const nameInput = new TextInputBuilder().setCustomId('name').setLabel('Nama Item').setStyle(TextInputStyle.Short).setRequired(true);
    const rankTierInput = new TextInputBuilder().setCustomId('rankTier').setLabel('Rank & Tier (contoh: Epic 5)').setStyle(TextInputStyle.Short)
      .setPlaceholder('Common/Uncommon/Rare/Epic/Legendary/Mythical + Tier 1-9').setValue('Common 1').setRequired(true);
    const priceInput = new TextInputBuilder().setCustomId('priceInfo').setLabel('Harga Dasar & Currency (contoh: 500 silver)').setStyle(TextInputStyle.Short)
      .setPlaceholder('angka + silver/gold/jade/spirit. Isi 0 kalau tidak dijual.').setValue('0 silver').setRequired(true);
    const descInput = new TextInputBuilder().setCustomId('description').setLabel('Deskripsi').setStyle(TextInputStyle.Paragraph).setRequired(true);
    const imageInput = new TextInputBuilder().setCustomId('imageUrl').setLabel('URL Gambar (opsional)').setStyle(TextInputStyle.Short).setRequired(false);

    modal.addComponents(
      new ActionRowBuilder().addComponents(nameInput),
      new ActionRowBuilder().addComponents(rankTierInput),
      new ActionRowBuilder().addComponents(priceInput),
      new ActionRowBuilder().addComponents(descInput),
      new ActionRowBuilder().addComponents(imageInput),
    );

    await interaction.showModal(modal);
  },
};
