const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, MessageFlags } = require('discord.js');
const { isAdmin } = require('../../utils/permissions');
const Item = require('../../models/Item');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-edit-item')
    .setDescription('[ADMIN] Edit item lewat form (modal)')
    .addStringOption((o) => o.setName('nama').setDescription('Nama item yang mau diedit').setRequired(true).setAutocomplete(true)),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused();
    const items = await Item.find({ guildId: interaction.guildId, name: new RegExp(focused, 'i') }).limit(25);
    await interaction.respond(items.map((i) => ({ name: i.name, value: i.name })));
  },

  async execute(interaction) {
    if (!(await isAdmin(interaction))) return interaction.reply({ content: '❌ Kamu bukan admin.', flags: MessageFlags.Ephemeral });

    const nama = interaction.options.getString('nama');
    const item = await Item.findOne({ guildId: interaction.guildId, name: new RegExp(`^${nama}$`, 'i') });
    if (!item) return interaction.reply({ content: `❌ Item "${nama}" tidak ditemukan.`, flags: MessageFlags.Ephemeral });

    const modal = new ModalBuilder().setCustomId(`modal_edit_item_${item._id}`).setTitle(`Edit: ${item.name}`.slice(0, 45));

    modal.addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('name').setLabel('Nama Item').setStyle(TextInputStyle.Short).setValue(item.name).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('rankTier').setLabel('Rank & Tier (contoh: Epic 5)').setStyle(TextInputStyle.Short).setValue(`${item.rank} ${item.tier}`).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('priceInfo').setLabel('Harga Dasar & Currency (contoh: 500 silver)').setStyle(TextInputStyle.Short).setValue(`${item.basePrice} ${item.priceCurrency}`).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('description').setLabel('Deskripsi').setStyle(TextInputStyle.Paragraph).setValue(item.description || '').setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('category').setLabel('Kategori (weapon, material, dll)').setStyle(TextInputStyle.Short).setValue(item.category || 'none').setRequired(false)),
    );

    await interaction.showModal(modal);
  },
};
