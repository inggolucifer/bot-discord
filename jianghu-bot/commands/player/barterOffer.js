const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Player = require('../../models/Player');
const Item = require('../../models/Item');
const Barter = require('../../models/Barter');
const { CURRENCIES, CURRENCY_LABEL } = require('../../utils/currency');
const { logTransaction } = require('../../utils/logger');

async function findOwnedItem(player, guildId, itemName) {
  if (!itemName) return null;
  const itemDoc = await Item.findOne({ guildId, name: new RegExp(`^${itemName}$`, 'i') });
  if (!itemDoc) return { error: `Item "${itemName}" tidak ditemukan.` };
  const owned = player.inventory.find((i) => i.itemId.equals(itemDoc._id));
  if (!owned) return { error: `Kamu tidak memiliki item "${itemDoc.name}".` };
  return { itemDoc, owned };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('barter-offer')
    .setDescription('Ajukan barter (tukar item/currency) ke player lain')
    .addUserOption((o) => o.setName('user').setDescription('Player tujuan barter').setRequired(true))
    .addStringOption((o) => o.setName('offer-item').setDescription('Nama item yang kamu tawarkan (opsional)'))
    .addIntegerOption((o) => o.setName('offer-item-jumlah').setDescription('Jumlah item yang ditawarkan').setMinValue(1))
    .addStringOption((o) => o.setName('offer-currency').setDescription('Jenis currency yang ditawarkan').addChoices(...CURRENCIES.map((c) => ({ name: CURRENCY_LABEL[c], value: c }))))
    .addIntegerOption((o) => o.setName('offer-currency-jumlah').setDescription('Jumlah currency yang ditawarkan').setMinValue(1))
    .addStringOption((o) => o.setName('request-item').setDescription('Nama item yang kamu minta (opsional)'))
    .addIntegerOption((o) => o.setName('request-item-jumlah').setDescription('Jumlah item yang diminta').setMinValue(1))
    .addStringOption((o) => o.setName('request-currency').setDescription('Jenis currency yang diminta').addChoices(...CURRENCIES.map((c) => ({ name: CURRENCY_LABEL[c], value: c }))))
    .addIntegerOption((o) => o.setName('request-currency-jumlah').setDescription('Jumlah currency yang diminta').setMinValue(1)),

  async execute(interaction) {
    // PENTING: pesan barter ini HARUS terlihat oleh penerima (butuh klik tombol Accept/Decline),
    // jadi defer TIDAK BOLEH ephemeral di sini (beda dengan kebanyakan command lain).
    await interaction.deferReply();

    const target = interaction.options.getUser('user');
    if (target.id === interaction.user.id) return interaction.editReply({ content: '❌ Tidak bisa barter dengan diri sendiri.' });
    if (target.bot) return interaction.editReply({ content: '❌ Tidak bisa barter dengan bot.' });

    const offerItemName = interaction.options.getString('offer-item');
    const offerItemQty = interaction.options.getInteger('offer-item-jumlah') || 1;
    const offerCurrency = interaction.options.getString('offer-currency');
    const offerCurrencyQty = interaction.options.getInteger('offer-currency-jumlah') || 0;
    const requestItemName = interaction.options.getString('request-item');
    const requestItemQty = interaction.options.getInteger('request-item-jumlah') || 1;
    const requestCurrency = interaction.options.getString('request-currency');
    const requestCurrencyQty = interaction.options.getInteger('request-currency-jumlah') || 0;

    if (!offerItemName && !offerCurrency && !requestItemName && !requestCurrency) {
      return interaction.editReply({ content: '❌ Kamu harus mengisi minimal satu barang/currency untuk ditawarkan atau diminta.' });
    }

    const sender = await Player.findOne({ discordId: interaction.user.id, guildId: interaction.guildId });
    if (!sender) return interaction.editReply({ content: '❌ Kamu belum terdaftar.' });
    if (sender.status !== 'active') return interaction.editReply({ content: `❌ Karaktermu berstatus **${sender.status}**.` });

    const receiver = await Player.findOne({ discordId: target.id, guildId: interaction.guildId });
    if (!receiver) return interaction.editReply({ content: `❌ ${target.username} belum terdaftar.` });
    if (receiver.status !== 'active') return interaction.editReply({ content: `❌ Karakter penerima berstatus **${receiver.status}**.` });

    // Validasi sender benar-benar punya apa yang ditawarkan
    let offerItemDoc = null;
    if (offerItemName) {
      const res = await findOwnedItem(sender, interaction.guildId, offerItemName);
      if (res.error) return interaction.editReply({ content: `❌ ${res.error}` });
      if (res.owned.quantity < offerItemQty) return interaction.editReply({ content: `❌ Item "${res.itemDoc.name}" kamu hanya ${res.owned.quantity}, tidak cukup untuk ${offerItemQty}.` });
      offerItemDoc = res.itemDoc;
    }
    if (offerCurrency && sender.currency[offerCurrency] < offerCurrencyQty) {
      return interaction.editReply({ content: `❌ ${CURRENCY_LABEL[offerCurrency]} kamu tidak cukup.` });
    }

    let requestItemDoc = null;
    if (requestItemName) {
      requestItemDoc = await Item.findOne({ guildId: interaction.guildId, name: new RegExp(`^${requestItemName}$`, 'i') });
      if (!requestItemDoc) return interaction.editReply({ content: `❌ Item "${requestItemName}" tidak ditemukan.` });
    }

    const barter = await Barter.create({
      guildId: interaction.guildId,
      fromUserId: interaction.user.id,
      toUserId: target.id,
      offerItems: offerItemDoc ? [{ itemId: offerItemDoc._id, quantity: offerItemQty }] : [],
      offerCurrency: offerCurrency ? { [offerCurrency]: offerCurrencyQty } : {},
      requestItems: requestItemDoc ? [{ itemId: requestItemDoc._id, quantity: requestItemQty }] : [],
      requestCurrency: requestCurrency ? { [requestCurrency]: requestCurrencyQty } : {},
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    const describeOffer = [];
    if (offerItemDoc) describeOffer.push(`${offerItemQty}x **${offerItemDoc.name}**`);
    if (offerCurrency) describeOffer.push(`**${offerCurrencyQty} ${CURRENCY_LABEL[offerCurrency]}**`);
    const describeRequest = [];
    if (requestItemDoc) describeRequest.push(`${requestItemQty}x **${requestItemDoc.name}**`);
    if (requestCurrency) describeRequest.push(`**${requestCurrencyQty} ${CURRENCY_LABEL[requestCurrency]}**`);

    const embed = new EmbedBuilder()
      .setColor(0x9b59b6)
      .setTitle('🤝 Penawaran Barter')
      .setDescription(`${interaction.user} ingin barter dengan ${target}`)
      .addFields(
        { name: `${interaction.user.username} menawarkan`, value: describeOffer.join('\n') || '_(tidak ada)_' },
        { name: `${interaction.user.username} meminta`, value: describeRequest.join('\n') || '_(tidak ada)_' },
      )
      .setFooter({ text: 'Kedaluwarsa dalam 5 menit.' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`barter_accept_${barter._id}`).setLabel('Terima').setStyle(ButtonStyle.Success).setEmoji('✅'),
      new ButtonBuilder().setCustomId(`barter_decline_${barter._id}`).setLabel('Tolak').setStyle(ButtonStyle.Danger).setEmoji('❌'),
    );

    const message = await interaction.editReply({ content: `${target}`, embeds: [embed], components: [row] });
    barter.messageId = message.id;
    await barter.save();

    const collector = message.createMessageComponentCollector({ time: 5 * 60 * 1000, max: 1 });

    collector.on('collect', async (btn) => {
      if (btn.user.id !== target.id) {
        return btn.reply({ content: '❌ Hanya penerima barter yang bisa merespon.', ephemeral: false });
      }

      const freshBarter = await Barter.findById(barter._id);
      if (!freshBarter || freshBarter.status !== 'pending') {
        return btn.update({ content: '❌ Barter ini sudah tidak berlaku.', embeds: [], components: [] });
      }

      if (btn.customId.startsWith('barter_decline')) {
        freshBarter.status = 'declined';
        await freshBarter.save();
        return btn.update({ content: `❌ ${target.username} menolak barter ini.`, embeds: [], components: [] });
      }

      // === PROSES ACCEPT: validasi ulang semua syarat sebelum eksekusi (anti-cheat/double spend) ===
      const freshSender = await Player.findOne({ discordId: interaction.user.id, guildId: interaction.guildId });
      const freshReceiver = await Player.findOne({ discordId: target.id, guildId: interaction.guildId });

      if (!freshSender || freshSender.status !== 'active' || !freshReceiver || freshReceiver.status !== 'active') {
        return btn.update({ content: '❌ Barter gagal: status salah satu karakter berubah.', embeds: [], components: [] });
      }

      // Cek currency sender (offer) & receiver (request)
      for (const [cur, amt] of Object.entries(freshBarter.offerCurrency.toObject ? freshBarter.offerCurrency.toObject() : freshBarter.offerCurrency)) {
        if (amt > 0 && freshSender.currency[cur] < amt) {
          return btn.update({ content: `❌ Barter gagal: ${interaction.user.username} tidak lagi punya cukup ${cur}.`, embeds: [], components: [] });
        }
      }
      for (const [cur, amt] of Object.entries(freshBarter.requestCurrency.toObject ? freshBarter.requestCurrency.toObject() : freshBarter.requestCurrency)) {
        if (amt > 0 && freshReceiver.currency[cur] < amt) {
          return btn.update({ content: `❌ Barter gagal: ${target.username} tidak punya cukup ${cur} yang diminta.`, embeds: [], components: [] });
        }
      }
      // Cek item sender (offer)
      for (const oi of freshBarter.offerItems) {
        const owned = freshSender.inventory.find((i) => i.itemId.equals(oi.itemId));
        if (!owned || owned.quantity < oi.quantity) {
          return btn.update({ content: `❌ Barter gagal: item yang ditawarkan ${interaction.user.username} sudah tidak cukup.`, embeds: [], components: [] });
        }
      }
      // Cek item receiver (request)
      for (const ri of freshBarter.requestItems) {
        const owned = freshReceiver.inventory.find((i) => i.itemId.equals(ri.itemId));
        if (!owned || owned.quantity < ri.quantity) {
          return btn.update({ content: `❌ Barter gagal: item yang diminta tidak dimiliki ${target.username}.`, embeds: [], components: [] });
        }
      }

      // Eksekusi: pindahkan currency
      const addCurrency = (offerObj) => Object.entries(offerObj.toObject ? offerObj.toObject() : offerObj);
      for (const [cur, amt] of addCurrency(freshBarter.offerCurrency)) {
        if (amt > 0) { freshSender.currency[cur] -= amt; freshReceiver.currency[cur] += amt; }
      }
      for (const [cur, amt] of addCurrency(freshBarter.requestCurrency)) {
        if (amt > 0) { freshReceiver.currency[cur] -= amt; freshSender.currency[cur] += amt; }
      }
      // Eksekusi: pindahkan item offer (sender -> receiver)
      for (const oi of freshBarter.offerItems) {
        const senderOwned = freshSender.inventory.find((i) => i.itemId.equals(oi.itemId));
        senderOwned.quantity -= oi.quantity;
        if (senderOwned.quantity <= 0) freshSender.inventory = freshSender.inventory.filter((i) => !i.itemId.equals(oi.itemId));
        const recvOwned = freshReceiver.inventory.find((i) => i.itemId.equals(oi.itemId));
        if (recvOwned) recvOwned.quantity += oi.quantity;
        else freshReceiver.inventory.push({ itemId: oi.itemId, quantity: oi.quantity });
      }
      // Eksekusi: pindahkan item request (receiver -> sender)
      for (const ri of freshBarter.requestItems) {
        const recvOwned = freshReceiver.inventory.find((i) => i.itemId.equals(ri.itemId));
        recvOwned.quantity -= ri.quantity;
        if (recvOwned.quantity <= 0) freshReceiver.inventory = freshReceiver.inventory.filter((i) => !i.itemId.equals(ri.itemId));
        const senderOwned = freshSender.inventory.find((i) => i.itemId.equals(ri.itemId));
        if (senderOwned) senderOwned.quantity += ri.quantity;
        else freshSender.inventory.push({ itemId: ri.itemId, quantity: ri.quantity });
      }

      await freshSender.save();
      await freshReceiver.save();
      freshBarter.status = 'accepted';
      await freshBarter.save();

      await logTransaction(btn.client, {
        guildId: interaction.guildId,
        type: 'barter',
        fromUserId: interaction.user.id,
        toUserId: target.id,
        note: `Barter selesai antara ${interaction.user.tag} dan ${target.tag}`,
      });

      const doneEmbed = new EmbedBuilder().setColor(0x27ae60).setTitle('✅ Barter Berhasil').setDescription('Item & currency telah dipertukarkan.');
      return btn.update({ content: null, embeds: [doneEmbed], components: [] });
    });

    collector.on('end', async (collected) => {
      if (collected.size === 0) {
        await Barter.findByIdAndUpdate(barter._id, { status: 'expired' });
        await interaction.editReply({ content: '⌛ Penawaran barter kedaluwarsa (5 menit).', embeds: [], components: [] }).catch(() => {});
      }
    });
  },
};
