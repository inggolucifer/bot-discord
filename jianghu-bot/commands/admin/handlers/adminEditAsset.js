const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, MessageFlags } = require('discord.js');
const { isAdmin } = require('../../../utils/permissions');
const Asset = require('../../../models/Asset');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-edit-asset')
    .setDescription('[ADMIN] Edit aset lewat form (modal)')
    .addStringOption((o) => o.setName('nama').setDescription('Nama aset').setRequired(true).setAutocomplete(true)),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused();
    const assets = await Asset.find({ guildId: interaction.guildId, name: new RegExp(focused, 'i') }).limit(25);
    await interaction.respond(assets.map((a) => ({ name: a.name, value: a.name })));
  },

  async execute(interaction) {
    if (!(await isAdmin(interaction))) return interaction.reply({ content: '❌ Kamu bukan admin.', flags: MessageFlags.Ephemeral });
    const nama = interaction.options.getString('nama');
    const asset = await Asset.findOne({ guildId: interaction.guildId, name: new RegExp(`^${nama}$`, 'i') });
    if (!asset) return interaction.reply({ content: `❌ Aset "${nama}" tidak ditemukan.`, flags: MessageFlags.Ephemeral });

    const modal = new ModalBuilder().setCustomId(`modal_edit_asset_${asset._id}`).setTitle(`Edit: ${asset.name}`.slice(0, 45));
    modal.addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('name').setLabel('Nama Aset').setStyle(TextInputStyle.Short).setValue(asset.name).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('description').setLabel('Deskripsi').setStyle(TextInputStyle.Paragraph).setValue(asset.description || '').setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('profitInfo').setLabel('Profit Harian & Currency').setStyle(TextInputStyle.Short).setValue(`${asset.dailyProfit} ${asset.profitCurrency}`).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('priceInfo').setLabel('Harga Beli, Currency, Rank-opsional').setStyle(TextInputStyle.Short).setValue(`${asset.basePrice} ${asset.priceCurrency}${asset.rank ? ' ' + asset.rank : ''}`).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('imageUrl').setLabel('URL Gambar').setStyle(TextInputStyle.Short).setValue(asset.imageUrl || '').setRequired(false)),
    );
    await interaction.showModal(modal);
  },
};
