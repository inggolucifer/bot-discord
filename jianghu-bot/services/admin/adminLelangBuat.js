const { EmbedBuilder, MessageFlags } = require('discord.js');
const Item = require('../../models/Item');
const Auction = require('../../models/Auction');
const GuildConfig = require('../../models/GuildConfig');

module.exports = {
  async autocomplete(interaction) {
    const focused = interaction.options.getFocused(true);
    if (focused.name === 'nama-item') {
      const items = await Item.find({ name: { $regex: focused.value, $options: 'i' } }).limit(25).lean();
      return interaction.respond(items.map(i => ({ name: i.name, value: i.name })));
    }
  },

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const guildId = interaction.guildId;
    const itemName = interaction.options.getString('nama-item');
    const quantity = interaction.options.getInteger('jumlah');
    const startingBid = interaction.options.getInteger('starting-bid');

    const config = await GuildConfig.findOne({ guildId });
    if (!config || !config.auctionChannelId) {
      return interaction.editReply('❌ Channel lelang belum di-set. Gunakan `/admin lelang config` terlebih dahulu.');
    }

    const item = await Item.findOne({ name: new RegExp(`^${itemName}$`, 'i') });
    if (!item) {
      return interaction.editReply(`❌ Item "${itemName}" tidak ditemukan di database.`);
    }

    // Set expiration 24 hours from now
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const auction = new Auction({
      guildId,
      sellerId: null, // Sistem
      itemId: item._id,
      quantity,
      startingBid,
      highestBid: 0,
      highestBidderId: null,
      expiresAt,
      status: 'active',
      taxRate: 0 // Lelang sistem tidak ada pajak
    });

    await auction.save();

    // Send to auction channel
    const auctionChannel = interaction.guild.channels.cache.get(config.auctionChannelId);
    if (auctionChannel) {
      const embed = new EmbedBuilder()
        .setTitle('📢 LELANG SISTEM BARU!')
        .setDescription(`Sistem mengadakan lelang untuk item berikut:\n\n**Barang:** ${item.name} (x${quantity})\n**Harga Awal:** ${startingBid} Silver\n\nGunakan \`/lelang bid\` untuk menawar!\n*Lelang ini akan berakhir 24 jam dari sekarang.*`)
        .setColor('#FFA500')
        .addFields({ name: 'ID Lelang', value: auction._id.toString() });

      const msg = await auctionChannel.send({ embeds: [embed] });
      auction.messageId = msg.id;
      await auction.save();
    } else {
      return interaction.editReply('⚠️ Lelang dibuat di database, tapi channel lelang tidak ditemukan di server ini.');
    }

    return interaction.editReply(`✅ Lelang sistem untuk **${item.name} (x${quantity})** berhasil dibuat! ID Lelang: ${auction._id}`);
  }
};
