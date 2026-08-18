const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Shop = require('../../models/Shop');
const Item = require('../../models/Item');
const Pet = require('../../models/Pet');
const Asset = require('../../models/Asset');
const PlayerListing = require('../../models/PlayerListing');
const { CURRENCY_LABEL } = require('../../utils/currency');

const MODEL_MAP = { Item, Pet, Asset };

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shop')
    .setDescription('Lihat daftar barang di toko (system shop atau player shop)')
    .addStringOption((o) => o.setName('sumber').setDescription('Lihat toko sistem atau toko sesama pemain? (default: Sistem)').addChoices(
      { name: 'System Shop', value: 'sistem' }, { name: 'Player Shop', value: 'pemain' },
    ))
    .addStringOption((o) => o.setName('kategori').setDescription('Kategori (hanya berlaku untuk System Shop)').addChoices(
      { name: 'Item', value: 'item' }, { name: 'Pet', value: 'pet' }, { name: 'Asset', value: 'asset' },
    )),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: false });

    const sumber = interaction.options.getString('sumber') || 'sistem';

    if (sumber === 'pemain') {
      const listings = await PlayerListing.find({ guildId: interaction.guildId, status: 'active' }).sort({ createdAt: -1 }).limit(25);
      if (!listings.length) {
        return interaction.editReply({ content: '❌ Belum ada listing aktif dari pemain. Jadilah yang pertama dengan `/jual-listing`!' });
      }

      const lines = listings.map((l) => {
        const kode = l._id.toString().slice(-6).toUpperCase();
        return `\`${kode}\` **${l.quantity}x ${l.itemName}** — 💰 ${l.pricePerUnit} ${CURRENCY_LABEL[l.currency]}/unit (total ${l.pricePerUnit * l.quantity}) — dijual oleh **${l.sellerName}**`;
      });

      const embed = new EmbedBuilder()
        .setColor(0x9b59b6)
        .setTitle('👤 Player Shop — Listing Jualan Pemain')
        .setDescription(lines.join('\n'))
        .setFooter({ text: 'Gunakan /beli-listing [kode-listing] untuk membeli.' });
      return interaction.editReply({ embeds: [embed] });
    }

    // sumber === 'sistem'
    const kategori = interaction.options.getString('kategori');
    const query = { guildId: interaction.guildId, isActive: true };
    if (kategori) query.category = kategori;

    const listings = await Shop.find(query).limit(25);
    if (!listings.length) {
      return interaction.editReply({ content: kategori ? `❌ Belum ada ${kategori} di shop.` : '❌ Shop masih kosong.' });
    }

    const lines = [];
    for (const listing of listings) {
      const Model = MODEL_MAP[listing.refModel];
      const doc = await Model.findById(listing.refId);
      if (!doc) continue;
      const stockText = listing.stock === -1 ? 'Unlimited' : `Stok: ${listing.stock}`;
      lines.push(`**${doc.name}** _(${listing.category})_ — 💰 ${listing.price} ${CURRENCY_LABEL[listing.priceCurrency]} — ${stockText}`);
    }

    const embed = new EmbedBuilder()
      .setColor(0x16a085)
      .setTitle('🏪 System Shop — Toko Jianghu World')
      .setDescription(lines.join('\n') || 'Kosong')
      .setFooter({ text: 'Gunakan /beli [kategori] [nama] [jumlah] untuk membeli. Lihat /shop sumber:Player Shop untuk listing pemain.' });

    return interaction.editReply({ embeds: [embed] });
  },
};

