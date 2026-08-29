const { escapeRegex } = require('../../utils/escapeRegex');
const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { isAdmin } = require('../../utils/permissions');
const Shop = require('../../models/Shop');
const Item = require('../../models/Item');
const Pet = require('../../models/Pet');
const Asset = require('../../models/Asset');
const { logAdminAction } = require('../../utils/logger');

const MODEL_MAP = { item: Item, pet: Pet, asset: Asset };

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-shop-remove')
    .setDescription('[ADMIN] Hapus barang dari shop')
    .addStringOption((o) => o.setName('kategori').setDescription('Kategori').setRequired(true).addChoices(
      { name: 'Item', value: 'item' }, { name: 'Pet', value: 'pet' }, { name: 'Asset', value: 'asset' },
    ))
    .addStringOption((o) => o.setName('nama').setDescription('Nama barang').setRequired(true)),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    if (!(await isAdmin(interaction))) return interaction.editReply({ content: '❌ Kamu bukan admin.' });
    const kategori = interaction.options.getString('kategori');
    const nama = interaction.options.getString('nama');

    const Model = MODEL_MAP[kategori];
    const doc = await Model.findOne({ name: new RegExp(`^${escapeRegex(nama)}$`, 'i') });
    if (!doc) return interaction.editReply({ content: `❌ "${nama}" tidak ditemukan.` });

    const result = await Shop.findOneAndDelete({ category: kategori, refId: doc._id });
    if (!result) return interaction.editReply({ content: `❌ "${doc.name}" tidak ada di shop.` });

    await logAdminAction(interaction.client, { adminId: interaction.user.id, action: 'SHOP_REMOVE', details: `${doc.name} (${kategori})` });
    return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xc0392b).setTitle('🗑️ Dihapus dari Shop').setDescription(`**${doc.name}** sudah tidak dijual lagi.`)] });
  },
};
