const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Player = require('../../../models/Player');
const { CURRENCIES, CURRENCY_LABEL } = require('../../../utils/currency');
const { logTransaction } = require('../../../utils/logger');
const { getPlayerSect } = require('../../../utils/sectUtils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sekte-donasi')
    .setDescription('Donasikan currency ke kekayaan sekte (TIDAK bisa diklaim balik pribadi)')
    .addStringOption((o) => o.setName('jenis').setDescription('Jenis currency').setRequired(true).addChoices(...CURRENCIES.map((c) => ({ name: CURRENCY_LABEL[c], value: c }))))
    .addIntegerOption((o) => o.setName('jumlah').setDescription('Jumlah yang didonasikan').setRequired(true).setMinValue(1)),

  async execute(interaction) {
    await interaction.deferReply();

    const jenis = interaction.options.getString('jenis') || interaction.options.getString('currency');
    const jumlah = interaction.options.getInteger('jumlah');

    const player = await Player.findOne({ discordId: interaction.user.id, guildId: interaction.guildId });
    if (!player) return interaction.editReply({ content: '❌ Kamu belum terdaftar.' });
    if (player.status !== 'active') return interaction.editReply({ content: `❌ Karaktermu berstatus **${player.status}**.` });

    const sect = await getPlayerSect(interaction.guildId, interaction.user.id);
    if (!sect) return interaction.editReply({ content: '❌ Kamu tidak sedang bergabung dalam sekte manapun.' });

    const { payCurrency } = require('../../../utils/currency');
    if (!payCurrency(player.currency, jumlah, jenis)) {
      return interaction.editReply({ content: `❌ Uang kamu tidak cukup. Butuh setara dengan ${jumlah} ${CURRENCY_LABEL[jenis]}.` });
    }

    await player.save();

    sect.currency[jenis] += jumlah;
    await sect.save();

    await logTransaction(interaction.client, {
      guildId: interaction.guildId, type: 'sect_donate', fromUserId: interaction.user.id,
      currency: jenis, amount: jumlah, balanceAfter: player.currency,
      note: `${interaction.user.tag} donasi ${jumlah} ${jenis} ke sekte ${sect.name}`,
    });

    const embed = new EmbedBuilder()
      .setColor(0x2c3e50)
      .setTitle('🙏 Donasi Diterima Sekte')
      .setDescription(`Kamu mendonasikan **${jumlah} ${CURRENCY_LABEL[jenis]}** ke kekayaan sekte **${sect.name}**.\n\n_Donasi ini menjadi milik sekte sepenuhnya dan tidak bisa ditarik kembali secara pribadi._`);
    return interaction.editReply({ embeds: [embed] });
  },
};
