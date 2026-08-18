const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, MessageFlags } = require('discord.js');
const { isAdmin } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder().setName('admin-add-asset').setDescription('[ADMIN] Buat aset baru lewat form (modal)'),

  async execute(interaction) {
    if (!(await isAdmin(interaction))) return interaction.reply({ content: '❌ Kamu bukan admin.', flags: MessageFlags.Ephemeral });

    const modal = new ModalBuilder().setCustomId('modal_add_asset').setTitle('Buat Aset Baru');
    modal.addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('name').setLabel('Nama Aset').setStyle(TextInputStyle.Short).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('description').setLabel('Deskripsi').setStyle(TextInputStyle.Paragraph).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('profitInfo').setLabel('Profit Harian & Currency (contoh: 50 silver)').setStyle(TextInputStyle.Short).setValue('0 silver').setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('priceInfo').setLabel('Harga Beli, Currency, Rank-opsional').setStyle(TextInputStyle.Short)
        .setPlaceholder('contoh: 500 silver Epic (rank boleh dikosongkan)').setValue('0 silver').setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('imageUrl').setLabel('URL Gambar (opsional)').setStyle(TextInputStyle.Short).setRequired(false)),
    );
    await interaction.showModal(modal);
  },
};
