const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Player = require('../../models/Player');
const { CURRENCIES, CURRENCY_LABEL } = require('../../utils/currency');
const { logTransaction } = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('transfer-currency')
    .setDescription('Transfer currency ke player lain (butuh konfirmasi penerima)')
    .addUserOption((opt) => opt.setName('user').setDescription('Penerima').setRequired(true))
    .addStringOption((opt) =>
      opt.setName('jenis').setDescription('Jenis currency').setRequired(true)
        .addChoices(...CURRENCIES.map((c) => ({ name: CURRENCY_LABEL[c], value: c })))
    )
    .addIntegerOption((opt) => opt.setName('jumlah').setDescription('Jumlah').setRequired(true).setMinValue(1)),

  async execute(interaction) {
    // PENTING: pesan transfer ini HARUS terlihat oleh penerima (butuh klik tombol Accept/Decline),
    // jadi defer TIDAK BOLEH ephemeral di sini (beda dengan kebanyakan command lain).
    await interaction.deferReply();

    const target = interaction.options.getUser('user');
    const jenis = interaction.options.getString('jenis');
    const jumlah = interaction.options.getInteger('jumlah');

    if (target.id === interaction.user.id) {
      return interaction.editReply({ content: '❌ Tidak bisa transfer ke diri sendiri.' });
    }
    if (target.bot) {
      return interaction.editReply({ content: '❌ Tidak bisa transfer ke bot.' });
    }

    const sender = await Player.findOne({ discordId: interaction.user.id, guildId: interaction.guildId });
    if (!sender) return interaction.editReply({ content: '❌ Kamu belum terdaftar.' });
    if (sender.status !== 'active') return interaction.editReply({ content: `❌ Karaktermu berstatus **${sender.status}**, tidak bisa transfer.` });

    const receiver = await Player.findOne({ discordId: target.id, guildId: interaction.guildId });
    if (!receiver) return interaction.editReply({ content: `❌ ${target.username} belum terdaftar sebagai karakter.` });
    if (receiver.status !== 'active') return interaction.editReply({ content: `❌ Karakter penerima berstatus **${receiver.status}**, tidak bisa menerima transfer.` });

    if (sender.currency[jenis] < jumlah) {
      return interaction.editReply({ content: `❌ ${CURRENCY_LABEL[jenis]} kamu tidak cukup. Saldo: ${sender.currency[jenis]}.` });
    }

    const embed = new EmbedBuilder()
      .setColor(0xf39c12)
      .setTitle('💸 Permintaan Transfer Currency')
      .setDescription(
        `${interaction.user} ingin mengirim **${jumlah} ${CURRENCY_LABEL[jenis]}** kepada ${target}.\n\n` +
        `${target}, apakah kamu menerima?`
      )
      .setFooter({ text: 'Permintaan ini kedaluwarsa dalam 5 menit.' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`transfer_accept_${interaction.user.id}_${target.id}_${jenis}_${jumlah}`).setLabel('Terima').setStyle(ButtonStyle.Success).setEmoji('✅'),
      new ButtonBuilder().setCustomId(`transfer_decline_${interaction.user.id}_${target.id}`).setLabel('Tolak').setStyle(ButtonStyle.Danger).setEmoji('❌'),
    );

    const message = await interaction.editReply({ content: `${target}`, embeds: [embed], components: [row] });

    const collector = message.createMessageComponentCollector({ time: 5 * 60 * 1000, max: 1 });

    collector.on('collect', async (btnInteraction) => {
      if (btnInteraction.user.id !== target.id) {
        return btnInteraction.reply({ content: '❌ Hanya penerima yang bisa merespon permintaan ini.' });
      }

      if (btnInteraction.customId.startsWith('transfer_decline')) {
        await btnInteraction.update({ content: `❌ ${target.username} menolak transfer ini.`, embeds: [], components: [] });
        return;
      }

      // Re-fetch data terbaru untuk hindari race-condition / double transfer
      const freshSender = await Player.findOne({ discordId: interaction.user.id, guildId: interaction.guildId });
      const freshReceiver = await Player.findOne({ discordId: target.id, guildId: interaction.guildId });

      if (!freshSender || freshSender.currency[jenis] < jumlah || freshSender.status !== 'active') {
        return btnInteraction.update({ content: '❌ Transfer gagal: saldo pengirim tidak cukup atau statusnya berubah.', embeds: [], components: [] });
      }
      if (!freshReceiver || freshReceiver.status !== 'active') {
        return btnInteraction.update({ content: '❌ Transfer gagal: status penerima berubah.', embeds: [], components: [] });
      }

      const taxRate = 0.08;
      const taxAmount = Math.ceil(jumlah * taxRate);
      const amountReceived = jumlah - taxAmount;

      freshSender.currency[jenis] -= jumlah;
      freshReceiver.currency[jenis] += amountReceived;
      await freshSender.save();
      await freshReceiver.save();

      await logTransaction(btnInteraction.client, {
        guildId: interaction.guildId,
        type: 'transfer',
        fromUserId: interaction.user.id,
        toUserId: target.id,
        currency: jenis,
        amount: jumlah,
        balanceAfter: { sender: freshSender.currency, receiver: freshReceiver.currency },
        note: `Transfer ${jumlah} ${jenis} dari ${interaction.user.tag} ke ${target.tag} (pajak ${taxAmount} ${jenis})`,
      });

      const doneEmbed = new EmbedBuilder()
        .setColor(0x27ae60)
        .setTitle('✅ Transfer Berhasil')
        .setDescription(`**${jumlah} ${CURRENCY_LABEL[jenis]}** berhasil dikirim dari ${interaction.user} ke ${target}.\n\nSetelah dipotong pajak transfer sebesar 8% (**${taxAmount} ${CURRENCY_LABEL[jenis]}**), penerima mendapatkan **${amountReceived} ${CURRENCY_LABEL[jenis]}**.`);

      await btnInteraction.update({ content: null, embeds: [doneEmbed], components: [] });
    });

    collector.on('end', async (collected) => {
      if (collected.size === 0) {
        await interaction.editReply({ content: '⌛ Permintaan transfer kedaluwarsa (5 menit).', embeds: [], components: [] }).catch(() => {});
      }
    });
  },
};
