const { EmbedBuilder } = require('discord.js');
const Shop = require('../../models/Shop');
const Item = require('../../models/Item');
const Pet = require('../../models/Pet');
const Asset = require('../../models/Asset');
const PlayerListing = require('../../models/PlayerListing');
const { CURRENCY_LABEL } = require('../../utils/currency');

const MODEL_MAP = { item: Item, pet: Pet, asset: Asset };

module.exports = {
  async execute(interaction) {
    await interaction.deferReply();

    const sumber = interaction.options.getString('sumber') || 'sistem';

    if (sumber === 'pemain') {
      const listings = await PlayerListing.find({ guildId: interaction.guildId, status: 'active' }).sort({ createdAt: -1 }).limit(25);
      if (!listings.length) {
        return interaction.editReply({ content: '❌ Belum ada listing aktif dari pemain. Jadilah yang pertama dengan `/market`!' });
      }

      const lines = listings.map((l) => {
        const kode = l._id.toString().slice(-6).toUpperCase();
        return `\`${kode}\` **${l.quantity}x ${l.itemName}** — 💰 ${l.pricePerUnit} ${CURRENCY_LABEL[l.currency]}/unit (total ${l.pricePerUnit * l.quantity}) — dijual oleh **${l.sellerName}**`;
      });

      const embed = new EmbedBuilder()
        .setColor(0x9b59b6)
        .setTitle('👤 Player Shop — Listing Jualan Pemain')
        .setDescription(lines.join('\n'))
        .setFooter({ text: 'Gunakan /market beli [kode-listing] untuk membeli.' });
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
      const Model = MODEL_MAP[listing.category];
      const doc = await Model.findById(listing.refId);
      if (!doc) continue;
      const stockText = listing.stock === -1 ? 'Unlimited' : `Stok: ${listing.stock}`;
      lines.push(`**${doc.name}** _(${listing.category})_ — 💰 ${listing.price} ${CURRENCY_LABEL[listing.priceCurrency]} — ${stockText}`);
    }

    const embed = new EmbedBuilder()
      .setColor(0x16a085)
      .setTitle('🏪 System Shop — Toko Jianghu World')
      .setDescription(lines.join('\n') || 'Kosong')
      .setFooter({ text: 'Gunakan /shop beli [kategori] [nama] [jumlah] untuk membeli. Lihat /shop lihat sumber:Player Shop untuk listing pemain.' });

    return interaction.editReply({ embeds: [embed] });
  },
};
