const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const Asset = require('../../../models/Asset');
const { getRankStyle } = require('../../../utils/dramatic');
const { CURRENCY_LABEL, CURRENCY_EMOJI } = require('../../../utils/currency');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('list-asset')
    .setDescription('Lihat daftar keseluruhan aset'),

  async execute(interaction) {
    await interaction.deferReply();

    const assets = await Asset.find({ guildId: interaction.guildId }).sort({ rank: 1, name: 1 });

    if (!assets.length) {
      return interaction.editReply({ content: '❌ Tidak ada aset yang terdaftar.' });
    }

    const ASSETS_PER_PAGE = 5;
    const totalPages = Math.ceil(assets.length / ASSETS_PER_PAGE);
    let currentPage = 0;

    const generateEmbed = (page) => {
      const start = page * ASSETS_PER_PAGE;
      const end = start + ASSETS_PER_PAGE;
      const currentAssets = assets.slice(start, end);

      const embed = new EmbedBuilder()
        .setColor(0x27ae60)
        .setTitle('🏠 Daftar Keseluruhan Aset')
        .setFooter({ text: `Halaman ${page + 1} dari ${totalPages} | Total Aset: ${assets.length}` });

      for (const asset of currentAssets) {
        const style = asset.rank ? getRankStyle(asset.rank) : { emoji: '🏠', label: 'General', stars: '' };

        let desc = asset.description && asset.description !== '-' ? asset.description : 'Tidak ada deskripsi.';

        let details = `**Rank:** ${style.emoji} ${style.label} ${style.stars}\n`;

        if (asset.basePrice > 0) {
           details += `**Harga Dasar:** ${CURRENCY_EMOJI[asset.priceCurrency]} ${asset.basePrice} ${CURRENCY_LABEL[asset.priceCurrency]}\n`;
        }

        if (asset.dailyProfit > 0) {
          details += `**Income:** ${CURRENCY_EMOJI[asset.profitCurrency]} ${asset.dailyProfit} ${CURRENCY_LABEL[asset.profitCurrency]}/hari\n`;
        }

        if (asset.workerOutputItemId) {
           details += `**Output:** ${asset.workerOutputQuantity}x ${asset.workerOutputItemName}/hari\n`;
        }

        if (asset.isCraftingStation) {
           details += `**Tipe:** Crafting Station\n`;
        }

        details += `\n_${desc}_`;

        embed.addFields({
          name: `🏠 ${asset.name}`,
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
        if (i.user.id !== interaction.user.id) {
          return i.reply({ content: '❌ Anda tidak dapat menggunakan tombol ini.', flags: MessageFlags.Ephemeral });
        }

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
