const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const Item = require('../../../models/Item');
const { getRankStyle } = require('../../../utils/dramatic');
const { CURRENCY_LABEL, CURRENCY_EMOJI } = require('../../../utils/currency');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('list-item')
    .setDescription('Lihat daftar keseluruhan item'),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const items = await Item.find({}).sort({ rank: 1, name: 1 });

    if (!items.length) {
      return interaction.editReply({ content: '❌ Tidak ada item yang terdaftar.' });
    }

    const ITEMS_PER_PAGE = 5;
    const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);
    let currentPage = 0;

    const generateEmbed = (page) => {
      const start = page * ITEMS_PER_PAGE;
      const end = start + ITEMS_PER_PAGE;
      const currentItems = items.slice(start, end);

      const embed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle('📜 Daftar Keseluruhan Item')
        .setFooter({ text: `Halaman ${page + 1} dari ${totalPages} | Total Item: ${items.length}` });

      for (const item of currentItems) {
        const style = getRankStyle(item.rank);

        let desc = item.description && item.description !== '-' ? item.description : 'Tidak ada deskripsi.';

        let details = `**Rank:** ${style.emoji} ${style.label} ${style.stars} | **Tier:** ${item.tier}\n`;
        details += `**Kategori:** ${item.category}\n`;
        if (item.basePrice > 0) {
           details += `**Harga Dasar:** ${CURRENCY_EMOJI[item.priceCurrency]} ${item.basePrice} ${CURRENCY_LABEL[item.priceCurrency]}\n`;
        }
        details += `\n_${desc}_`;

        embed.addFields({
          name: `📦 ${item.name}`,
          value: details.substring(0, 1024)
        });
      }

      return embed;
    };

    const generateButtons = (page) => {
      const row = new ActionRowBuilder();

      row.addComponents(
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

      return row;
    };

    const message = await interaction.editReply({
      embeds: [generateEmbed(currentPage)],
      components: totalPages > 1 ? [generateButtons(currentPage)] : []
    });

    if (totalPages > 1) {
      const collector = message.createMessageComponentCollector({ time: 300000 }); // 5 menit

      collector.on('collect', async (i) => {
        if (i.customId === 'prev_page' && currentPage > 0) {
          currentPage--;
        } else if (i.customId === 'next_page' && currentPage < totalPages - 1) {
          currentPage++;
        }

        await i.update({
          embeds: [generateEmbed(currentPage)],
          components: [generateButtons(currentPage)]
        });
      });

      collector.on('end', () => {
        message.edit({ components: [] }).catch(() => {});
      });
    }
  }
};
