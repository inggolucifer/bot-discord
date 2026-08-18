const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isAdmin } = require('../../utils/permissions');
const Player = require('../../models/Player');
const { CURRENCIES, CURRENCY_LABEL } = require('../../utils/currency');
const { logTransaction, logAdminAction } = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-give-currency')
    .setDescription('[ADMIN] Beri atau kurangi currency player')
    .addUserOption((o) => o.setName('user').setDescription('Target player').setRequired(true))
    .addStringOption((o) => o.setName('jenis').setDescription('Jenis currency').setRequired(true).addChoices(...CURRENCIES.map((c) => ({ name: CURRENCY_LABEL[c], value: c }))))
    .addIntegerOption((o) => o.setName('jumlah').setDescription('Jumlah (boleh negatif untuk mengurangi)').setRequired(true)),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    if (!(await isAdmin(interaction))) return interaction.editReply({ content: '❌ Kamu bukan admin.' });

    const target = interaction.options.getUser('user');
    const jenis = interaction.options.getString('jenis');
    const jumlah = interaction.options.getInteger('jumlah');

    const player = await Player.findOne({ discordId: target.id, guildId: interaction.guildId });
    if (!player) return interaction.editReply({ content: `❌ ${target.username} belum terdaftar.` });

    player.currency[jenis] = Math.max(0, player.currency[jenis] + jumlah);
    await player.save();

    await logTransaction(interaction.client, {
      guildId: interaction.guildId, type: jumlah >= 0 ? 'admin_grant' : 'admin_revoke',
      toUserId: target.id, currency: jenis, amount: Math.abs(jumlah), balanceAfter: player.currency,
      note: `Admin ${interaction.user.tag} ${jumlah >= 0 ? 'memberi' : 'mengurangi'} ${Math.abs(jumlah)} ${jenis}`,
    });
    await logAdminAction(interaction.client, {
      guildId: interaction.guildId, adminId: interaction.user.id, action: 'GIVE_CURRENCY', targetUserId: target.id,
      details: `${jumlah >= 0 ? '+' : ''}${jumlah} ${jenis} (saldo sekarang: ${player.currency[jenis]})`,
    });

    const embed = new EmbedBuilder().setColor(0x2980b9).setTitle('✅ Currency Diperbarui')
      .setDescription(`${target} sekarang punya **${player.currency[jenis]} ${CURRENCY_LABEL[jenis]}**.`);
    return interaction.editReply({ embeds: [embed] });
  },
};
