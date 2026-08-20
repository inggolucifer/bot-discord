const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const Player = require('../../models/Player');
const Item = require('../../models/Item');
const Auction = require('../../models/Auction');
const GuildConfig = require('../../models/GuildConfig');
const TransactionLog = require('../../models/TransactionLog');

module.exports = {
  async autocomplete(interaction) {
    const focused = interaction.options.getFocused(true);
    if (focused.name === 'nama-item') {
      const discordId = interaction.user.id;
      const guildId = interaction.guildId;
      const player = await Player.findOne({ discordId, guildId }).populate('inventory.itemId').lean();

      if (!player) return interaction.respond([]);

      const invItems = player.inventory
        .filter(inv => inv.itemId && inv.itemId.name.toLowerCase().includes(focused.value.toLowerCase()))
        .map(inv => ({ name: `${inv.itemId.name} (x${inv.quantity})`, value: inv.itemId.name }))
        .slice(0, 25);

      return interaction.respond(invItems);
    }
  },

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const discordId = interaction.user.id;
    const guildId = interaction.guildId;
    const itemName = interaction.options.getString('nama-item');
    const quantity = interaction.options.getInteger('jumlah');
    const startingBid = interaction.options.getInteger('starting-bid');

    const config = await GuildConfig.findOne({ guildId });
    if (!config || !config.auctionRequestChannelId) {
      return interaction.editReply('❌ Sistem lelang belum dikonfigurasi oleh Admin. Hubungi Admin untuk mengatur `request-channel`.');
    }

    const player = await Player.findOne({ discordId, guildId }).populate('inventory.itemId');
    if (!player) return interaction.editReply('❌ Kamu belum terdaftar.');

    const inventoryEntry = player.inventory.find(i => i.itemId && i.itemId.name.toLowerCase() === itemName.toLowerCase());
    if (!inventoryEntry || inventoryEntry.quantity < quantity) {
      return interaction.editReply(`❌ Kamu tidak memiliki item "${itemName}" sebanyak ${quantity}.`);
    }

    const item = inventoryEntry.itemId;

    // Kurangi dari inventory
    inventoryEntry.quantity -= quantity;
    if (inventoryEntry.quantity <= 0) {
      player.inventory = player.inventory.filter(i => i.itemId._id.toString() !== item._id.toString());
    }
    await player.save();

    // Buat lelang pending
    // Waktu expires belum di-set valid karena baru berjalan saat di-approve. Set dummynya 24 jam.
    const auction = new Auction({
      guildId,
      sellerId: player._id,
      itemId: item._id,
      quantity,
      startingBid,
      highestBid: 0,
      highestBidderId: null,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Akan direset saat approve
      status: 'pending',
      taxRate: 0.1 // 10%
    });

    await auction.save();

    // Log
    await TransactionLog.create({
      guildId,
      type: 'LELANG_REQUEST',
      description: `[${player.characterName}] request lelang ${quantity}x ${item.name} start bid ${startingBid} Silver.`,
    });

    // Kirim request ke channel admin
    const requestChannel = interaction.guild.channels.cache.get(config.auctionRequestChannelId);
    if (requestChannel) {
      const embed = new EmbedBuilder()
        .setTitle('📢 REQUEST LELANG BARU')
        .setDescription(`**Pemain:** <@${discordId}> (${player.characterName})\n**Item:** ${item.name} (x${quantity})\n**Harga Awal (Silver):** ${startingBid}\n**ID Lelang:** ${auction._id}`)
        .setColor('#FFFF00');

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`approve_auction_${auction._id}`)
          .setLabel('Setujui (Approve)')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`reject_auction_${auction._id}`)
          .setLabel('Tolak (Reject)')
          .setStyle(ButtonStyle.Danger)
      );

      await requestChannel.send({ embeds: [embed], components: [row] });
    }

    return interaction.editReply(`✅ Request lelang untuk **${item.name} (x${quantity})** telah dikirim ke admin. Item telah ditarik dari inventory kamu.`);
  }
};
