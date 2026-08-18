const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Item = require('../../models/Item');
const Shop = require('../../models/Shop');
const PlayerListing = require('../../models/PlayerListing');
const { getRankStyle } = require('../../utils/dramatic');
const { CURRENCY_LABEL } = require('../../utils/currency');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cari-item')
    .setDescription('Cari item (research) — cek apakah tersedia di system shop atau player shop')
    .addStringOption((o) => o.setName('kata-kunci').setDescription('Nama atau sebagian nama item yang dicari').setRequired(true)),

  async execute(interaction) {
    await interaction.deferReply();

    const kataKunci = interaction.options.getString('kata-kunci').trim();
    const items = await Item.find({ guildId: interaction.guildId, name: new RegExp(kataKunci, 'i') }).limit(10);

    if (!items.length) {
      return interaction.editReply({ content: `❌ Tidak ada item yang cocok dengan "${kataKunci}".` });
    }

    const embed = new EmbedBuilder()
      .setColor(0x16a085)
      .setTitle(`🔍 Hasil Riset: "${kataKunci}"`)
      .setFooter({ text: `${items.length} item ditemukan` });

    for (const item of items) {
      const style = getRankStyle(item.rank);
      const lines = [];

      const shopListing = await Shop.findOne({ guildId: interaction.guildId, category: 'item', refId: item._id, isActive: true });
      if (shopListing) {
        const stockText = shopListing.stock === -1 ? 'unlimited' : `${shopListing.stock} stok`;
        lines.push(`🏪 System Shop: **${shopListing.price} ${CURRENCY_LABEL[shopListing.priceCurrency]}** (${stockText})`);
      }

      const playerListings = await PlayerListing.find({ guildId: interaction.guildId, itemId: item._id, status: 'active' }).sort({ pricePerUnit: 1 });
      if (playerListings.length) {
        const cheapest = playerListings[0];
        lines.push(`👤 Player Shop: **${playerListings.length} listing aktif**, termurah **${cheapest.pricePerUnit} ${CURRENCY_LABEL[cheapest.currency]}/unit** dari ${cheapest.sellerName} (kode: \`${cheapest._id.toString().slice(-6).toUpperCase()}\`)`);
      }

      if (!lines.length) lines.push('_Tidak dijual di manapun saat ini._');

      embed.addFields({
        name: `${style.emoji} ${item.name} (${style.label} T${item.tier})`,
        value: lines.join('\n'),
      });
    }

    return interaction.editReply({ embeds: [embed] });
  },
};

