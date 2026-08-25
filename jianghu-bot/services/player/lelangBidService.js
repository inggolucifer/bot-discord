const { MessageFlags, EmbedBuilder } = require('discord.js');
const Player = require('../../models/Player');
const Auction = require('../../models/Auction');
const TransactionLog = require('../../models/TransactionLog');

module.exports = {
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const discordId = interaction.user.id;
    const guildId = interaction.guildId;
    const auctionId = interaction.options.getString('id-lelang');
    const bidAmount = interaction.options.getInteger('jumlah-bid');

    let auction;
    try {
      auction = await Auction.findById(auctionId).populate('itemId');
    } catch (err) {
      return interaction.editReply('❌ ID Lelang tidak valid.');
    }

    if (!auction) {
      return interaction.editReply('❌ Lelang tidak ditemukan.');
    }

    if (auction.status !== 'active') {
      return interaction.editReply('❌ Lelang ini tidak sedang aktif (mungkin sudah selesai, ditolak, atau dibatalkan).');
    }

    if (new Date() >= auction.expiresAt) {
      return interaction.editReply('❌ Waktu lelang sudah habis (sedang diproses).');
    }

    const player = await Player.findOne({ discordId, guildId });
    if (!player) return interaction.editReply('❌ Kamu belum terdaftar.');

    if (auction.sellerId && auction.sellerId.toString() === player._id.toString()) {
      return interaction.editReply('❌ Kamu tidak bisa melakukan bid pada barang yang kamu jual sendiri.');
    }

    // Cek minimal bid
    const minBid = auction.highestBid > 0 ? auction.highestBid + 1 : auction.startingBid;
    if (bidAmount < minBid) {
      return interaction.editReply(`❌ Bid harus lebih besar dari tertinggi saat ini! Minimal bid: **${minBid} Silver**.`);
    }

    // Cek uang player (kita asumsikan bid memakai Silver)
    // Untuk ini, kita asumsikan Player.totalWealth >= bidAmount agar lebih simple, tapi idealnya memotong Silver aslinya
    // Tapi karena ada normalisasi, kita harus memotong dari total wealth dengan aman.
    if (player.totalWealth < bidAmount) {
      return interaction.editReply(`❌ Kekayaanmu tidak cukup. Kamu hanya memiliki total setara **${player.totalWealth} Silver**, sedangkan bid kamu adalah **${bidAmount} Silver**.`);
    }

    // Refund highest bidder sebelumnya
    if (auction.highestBidderId) {
      const prevBidder = await Player.findById(auction.highestBidderId);
      if (prevBidder) {
        prevBidder.currency.silver += auction.highestBid;
        await prevBidder.save(); // normalisasi otomatis jalan

        await TransactionLog.create({
          guildId,
          type: 'auction_refund',
          description: `Refund bid lelang ${auctionId} sebesar ${auction.highestBid} Silver ke [${prevBidder.characterName}] karena bid dikalahkan.`,
        });
      }
    }

    // Potong uang bidder baru
    // Kita distribusikan mundur secara manual.
    let remainingToPay = bidAmount;
    if (player.currency.silver >= remainingToPay) {
      player.currency.silver -= remainingToPay;
    } else {
        // Ambil kekayaan jadi total silver, lalu kurangi, lalu re-calculate
        let total = (player.currency.silver || 0) +
                    (player.currency.gold || 0) * 100 +
                    (player.currency.jade || 0) * 10000 +
                    (player.currency.spirit || 0) * 1000000;

        total -= remainingToPay;

        player.currency.spirit = Math.floor(total / 1000000);
        total %= 1000000;
        player.currency.jade = Math.floor(total / 10000);
        total %= 10000;
        player.currency.gold = Math.floor(total / 100);
        player.currency.silver = total % 100;
    }
    await player.save();

    // Update lelang
    auction.highestBid = bidAmount;
    auction.highestBidderId = player._id;
    await auction.save();

    await TransactionLog.create({
      guildId,
      type: 'auction_bid',
      description: `[${player.characterName}] bid ${bidAmount} Silver pada lelang ${auctionId}.`,
    });

    // Update pesan di channel lelang jika ada
    if (auction.messageId) {
      const GuildConfig = require('../../models/GuildConfig');
      const config = await GuildConfig.findOne({ guildId });
      if (config && config.auctionChannelId) {
        const auctionChannel = interaction.guild.channels.cache.get(config.auctionChannelId);
        if (auctionChannel) {
          try {
            const msgToEdit = await auctionChannel.messages.fetch(auction.messageId);
            if (msgToEdit && msgToEdit.embeds.length > 0) {
              const oldEmbed = msgToEdit.embeds[0];
              const newEmbed = EmbedBuilder.from(oldEmbed)
                .setDescription(`Sistem mengadakan lelang untuk item berikut:\n\n**Barang:** ${auction.itemId.name} (x${auction.quantity})\n**Harga Awal:** ${auction.startingBid} Silver\n**Bid Tertinggi Saat Ini:** ${auction.highestBid} Silver (Oleh: <@${discordId}>)\n\nGunakan \`/lelang bid id-lelang:${auction._id} jumlah-bid:[...]\` untuk menawar!\n*Berakhir: <t:${Math.floor(auction.expiresAt.getTime() / 1000)}:R>*`)
                .setColor('#00FF00'); // berubah hijau tanda ada penawar
              await msgToEdit.edit({ embeds: [newEmbed] });
            }
          } catch (e) {
            console.error('Gagal update pesan lelang:', e);
          }
        }
      }
    }

    return interaction.editReply(`✅ Berhasil melakukan bid sebesar **${bidAmount} Silver** pada lelang **${auction.itemId.name}**.`);
  }
};
