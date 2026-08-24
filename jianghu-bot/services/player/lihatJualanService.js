const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const PlayerListing = require('../../models/PlayerListing');

module.exports = {
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const listings = await PlayerListing.find({
      guildId: interaction.guildId,
      sellerId: interaction.user.id,
      status: 'active'
    }).sort({ createdAt: -1 });

    if (!listings || listings.length === 0) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x3498db)
            .setTitle('🛒 Toko Pemain (Jualan Saya)')
            .setDescription('Kamu tidak memiliki listing aktif di pasar pemain saat ini.')
        ]
      });
    }

    const itemsPerPage = 5;
    const totalPages = Math.ceil(listings.length / itemsPerPage);
    let currentPage = 0;

    const generateEmbed = (page) => {
      const start = page * itemsPerPage;
      const end = start + itemsPerPage;
      const currentListings = listings.slice(start, end);

      const embed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle('🛒 Toko Pemain (Jualan Saya)')
        .setDescription('Berikut adalah daftar listing aktif milikmu di pasar pemain. Gunakan kode listing untuk membatalkannya dengan `/market batal`.')
        .setFooter({ text: `Halaman ${page + 1} dari ${totalPages} • Total: ${listings.length} jualan` });

      currentListings.forEach((listing) => {
        const kode = listing._id.toString().slice(-6).toUpperCase();
        const emojiCurrency = {
          silver: '🪙',
          gold: '💰',
          jade: '💎',
          spirit: '🔮'
        }[listing.currency] || '🪙';

        embed.addFields({
          name: `${kode} - ${listing.itemName} (${listing.type})`,
          value: `Jumlah: **${listing.quantity}**\nHarga/unit: **${listing.pricePerUnit}** ${emojiCurrency} ${listing.currency}`,
          inline: false
        });
      });

      return embed;
    };

    const getButtons = (page) => {
      return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('prev_page')
          .setLabel('⬅️ Sebelumnya')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(page === 0),
        new ButtonBuilder()
          .setCustomId('next_page')
          .setLabel('Selanjutnya ➡️')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(page === totalPages - 1)
      );
    };

    const response = await interaction.editReply({
      embeds: [generateEmbed(currentPage)],
      components: totalPages > 1 ? [getButtons(currentPage)] : []
    });

    if (totalPages > 1) {
      const collector = response.createMessageComponentCollector({ time: 60000 });

      collector.on('collect', async (i) => {
        if (i.customId === 'prev_page') {
          currentPage--;
        } else if (i.customId === 'next_page') {
          currentPage++;
        }

        await i.update({
          embeds: [generateEmbed(currentPage)],
          components: [getButtons(currentPage)]
        });
      });

      collector.on('end', () => {
        interaction.editReply({ components: [] }).catch(() => {});
      });
    }
  }
};
