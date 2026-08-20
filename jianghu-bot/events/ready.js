const { Events, ActivityType } = require('discord.js');

const Auction = require('../models/Auction');
const Player = require('../models/Player');
const GuildConfig = require('../models/GuildConfig');
const TransactionLog = require('../models/TransactionLog');
const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    console.log(`[BOT] Login berhasil sebagai ${client.user.tag}`);
    console.log(`[BOT] Aktif di ${client.guilds.cache.size} server.`);
    client.user.setActivity('Jianghu World 江湖世界', { type: ActivityType.Watching });

    // Loop pengecekan lelang setiap 1 menit
    setInterval(async () => {
      try {
        const now = new Date();
        const expiredAuctions = await Auction.find({ status: 'active', expiresAt: { $lte: now } })
          .populate('itemId sellerId highestBidderId');

        for (const auction of expiredAuctions) {
          auction.status = 'finished';
          await auction.save();

          const guild = client.guilds.cache.get(auction.guildId);
          const config = await GuildConfig.findOne({ guildId: auction.guildId });
          let auctionChannel = null;

          if (guild && config && config.auctionChannelId) {
            auctionChannel = guild.channels.cache.get(config.auctionChannelId);
          }

          if (auction.highestBidderId) {
            // Ada pemenang
            const winner = await Player.findById(auction.highestBidderId._id);
            if (winner) {
              const invIndex = winner.inventory.findIndex(i => i.itemId.toString() === auction.itemId._id.toString());
              if (invIndex >= 0) {
                winner.inventory[invIndex].quantity += auction.quantity;
              } else {
                winner.inventory.push({ itemId: auction.itemId._id, quantity: auction.quantity });
              }
              await winner.save();

              await TransactionLog.create({
                guildId: auction.guildId,
                type: 'LELANG_WIN',
                description: `[${winner.characterName}] menang lelang ${auction.itemId.name} (x${auction.quantity}) seharga ${auction.highestBid} Silver.`,
              });

              if (auction.sellerId) {
                // Beri uang ke penjual dikurangi pajak
                const seller = await Player.findById(auction.sellerId._id);
                if (seller) {
                  const profit = Math.floor(auction.highestBid * (1 - auction.taxRate));
                  seller.currency.silver += profit;
                  await seller.save();

                  await TransactionLog.create({
                    guildId: auction.guildId,
                    type: 'LELANG_PROFIT',
                    description: `[${seller.characterName}] mendapat ${profit} Silver (setelah pajak) dari hasil lelang ${auction.itemId.name}.`,
                  });
                }
              }
            }

            if (auctionChannel) {
              const embed = new EmbedBuilder()
                .setTitle('🎉 LELANG SELESAI')
                .setDescription(`Barang **${auction.itemId.name}** (x${auction.quantity}) berhasil terjual kepada <@${auction.highestBidderId.discordId}>!\n\n**Harga Terjual:** ${auction.highestBid} Silver\n**Penjual:** ${auction.sellerId ? `<@${auction.sellerId.discordId}>` : 'Sistem'}`)
                .setColor('#00FF00');
              await auctionChannel.send({ embeds: [embed] });

              if (auction.messageId) {
                  try {
                      const msg = await auctionChannel.messages.fetch(auction.messageId);
                      if(msg) {
                          const originalEmbed = msg.embeds[0];
                          const newEmbed = EmbedBuilder.from(originalEmbed)
                            .setColor('#808080')
                            .setTitle('🔒 LELANG SELESAI')
                            .setDescription(`Lelang ini telah dimenangkan oleh <@${auction.highestBidderId.discordId}> dengan harga ${auction.highestBid} Silver.`);
                          await msg.edit({ embeds: [newEmbed], components: [] });
                      }
                  } catch (e) { console.error('Failed to update old auction msg', e); }
              }
            }

          } else {
            // Tidak ada penawar
            if (auction.sellerId) {
              const seller = await Player.findById(auction.sellerId._id);
              if (seller) {
                const invIndex = seller.inventory.findIndex(i => i.itemId.toString() === auction.itemId._id.toString());
                if (invIndex >= 0) {
                  seller.inventory[invIndex].quantity += auction.quantity;
                } else {
                  seller.inventory.push({ itemId: auction.itemId._id, quantity: auction.quantity });
                }
                await seller.save();
              }
            }

            if (auctionChannel) {
              const embed = new EmbedBuilder()
                .setTitle('⚖️ LELANG BERAKHIR TANPA PEMENANG')
                .setDescription(`Barang **${auction.itemId.name}** (x${auction.quantity}) tidak ada yang menawar. Barang dikembalikan ke penjual.`)
                .setColor('#FF0000');
              await auctionChannel.send({ embeds: [embed] });

              if (auction.messageId) {
                  try {
                      const msg = await auctionChannel.messages.fetch(auction.messageId);
                      if(msg) {
                          const originalEmbed = msg.embeds[0];
                          const newEmbed = EmbedBuilder.from(originalEmbed)
                            .setColor('#808080')
                            .setTitle('🔒 LELANG BERAKHIR')
                            .setDescription('Lelang berakhir tanpa penawar.');
                          await msg.edit({ embeds: [newEmbed], components: [] });
                      }
                  } catch (e) { console.error('Failed to update old auction msg', e); }
              }
            }
          }
        }
      } catch (error) {
        console.error('Error saat resolve auction loop:', error);
      }
    }, 60000); // Setiap 1 menit
  },
};
