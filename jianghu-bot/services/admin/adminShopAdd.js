const { escapeRegex } = require('../../utils/escapeRegex');
const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { isAdmin } = require('../../utils/permissions');
const Shop = require('../../models/Shop');
const Item = require('../../models/Item');
const Pet = require('../../models/Pet');
const Asset = require('../../models/Asset');
const { CURRENCIES, CURRENCY_LABEL } = require('../../utils/currency');
const { logAdminAction } = require('../../utils/logger');

const MODEL_MAP = { item: Item, pet: Pet, asset: Asset };
const REF_MODEL_MAP = { item: 'Item', pet: 'Pet', asset: 'Asset' };

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-shop-add')
    .setDescription('[ADMIN] Tambahkan item/pet/asset ke shop')
    .addStringOption((o) => o.setName('kategori').setDescription('Kategori').setRequired(true).addChoices(
      { name: 'Item', value: 'item' }, { name: 'Pet', value: 'pet' }, { name: 'Asset', value: 'asset' },
    ))
    .addStringOption((o) => o.setName('nama').setDescription('Nama barang (harus sudah dibuat lebih dulu)').setRequired(true))
    .addIntegerOption((o) => o.setName('harga').setDescription('Harga').setRequired(true).setMinValue(1))
    .addStringOption((o) => o.setName('currency').setDescription('Jenis currency harga').setRequired(true).addChoices(...CURRENCIES.map((c) => ({ name: CURRENCY_LABEL[c], value: c }))))
    .addIntegerOption((o) => o.setName('stok').setDescription('Stok (-1 = unlimited, default unlimited)')),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    if (!(await isAdmin(interaction))) return interaction.editReply({ content: '❌ Kamu bukan admin.' });

    const kategori = interaction.options.getString('kategori');
    const nama = interaction.options.getString('nama');
    const harga = interaction.options.getInteger('harga');
    const currency = interaction.options.getString('currency');
    const stok = interaction.options.getInteger('stok') ?? -1;

    const Model = MODEL_MAP[kategori];
    const doc = await Model.findOne({ guildId: interaction.guildId, name: new RegExp(`^${escapeRegex(nama)}$`, 'i') });
    if (!doc) return interaction.editReply({ content: `❌ "${nama}" belum ada di database ${kategori}. Buat dulu dengan /admin-add-${kategori}.` });

    let listing = await Shop.findOne({ guildId: interaction.guildId, category: kategori, refId: doc._id });
    if (listing) {
      listing.price = harga; listing.priceCurrency = currency; listing.stock = stok; listing.isActive = true;
    } else {
      listing = new Shop({
        guildId: interaction.guildId, category: kategori, refId: doc._id, refModel: REF_MODEL_MAP[kategori],
        price: harga, priceCurrency: currency, stock: stok, addedBy: interaction.user.id,
      });
    }
    await listing.save();

    await logAdminAction(interaction.client, { guildId: interaction.guildId, adminId: interaction.user.id, action: 'SHOP_ADD', details: `${doc.name} (${kategori}) - ${harga} ${currency}, stok: ${stok === -1 ? 'unlimited' : stok}` });

    return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0x16a085).setTitle('🏪 Ditambahkan ke Shop').setDescription(`**${doc.name}** — ${harga} ${CURRENCY_LABEL[currency]} — Stok: ${stok === -1 ? 'Unlimited' : stok}`)] });
  },
};
