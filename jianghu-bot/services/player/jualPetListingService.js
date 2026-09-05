const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Player = require('../../models/Player');
const Pet = require('../../models/Pet');
const PlayerListing = require('../../models/PlayerListing');
const { CURRENCIES, CURRENCY_LABEL } = require('../../utils/currency');
const { logTransaction } = require('../../utils/logger');
const { escapeRegex } = require('../../utils/escapeRegex');

const MAX_LISTING_PER_PLAYER = 10;
const LISTING_FEE_RATE = 0.05;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('jual-pet-listing')
    .setDescription(`Listing jual pet ke sesama pemain (biaya ${LISTING_FEE_RATE * 100}% dipotong saat laku)`)
    .addStringOption((o) => o.setName('nama-pet').setDescription('Nama pet yang mau dijual').setRequired(true).setAutocomplete(true))
    .addStringOption((o) => o.setName('instance-id').setDescription('Instance ID pet').setRequired(true))
    .addIntegerOption((o) => o.setName('harga-total').setDescription('Harga total pet ini').setRequired(true).setMinValue(1))
    .addStringOption((o) => o.setName('currency').setDescription('Jenis currency').setRequired(true).addChoices(...CURRENCIES.map((c) => ({ name: CURRENCY_LABEL[c], value: c })))),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused();
    const player = await Player.findOne({ discordId: interaction.user.id, guildId: interaction.guildId });
    if (!player) return interaction.respond([]);
    const pets = await Pet.find({ _id: { $in: player.pets.map((p) => p.petId) }, name: new RegExp(escapeRegex(focused), 'i') }).limit(25);
    return interaction.respond(pets.map((p) => ({ name: p.name, value: p.name })));
  },

  async execute(interaction) {
    await interaction.deferReply();

    const namaPet = interaction.options.getString('nama-pet');
    const instanceId = interaction.options.getString('instance-id');
    const hargaTotal = interaction.options.getInteger('harga-total');
    const currency = interaction.options.getString('currency');

    const player = await Player.findOne({ discordId: interaction.user.id, guildId: interaction.guildId });
    if (!player) return interaction.editReply({ content: '❌ Kamu belum terdaftar.' });

    const activeCount = await PlayerListing.countDocuments({ guildId: interaction.guildId, sellerId: interaction.user.id, status: 'active' });
    if (activeCount >= MAX_LISTING_PER_PLAYER) {
      return interaction.editReply({ content: `❌ Kamu sudah punya ${activeCount} listing aktif (maksimal ${MAX_LISTING_PER_PLAYER}).` });
    }

    const pet = await Pet.findOne({ name: new RegExp(`^\\s*${escapeRegex(namaPet)}\\s*$`, 'i') });
    if (!pet) return interaction.editReply({ content: `❌ Pet "${namaPet}" tidak ditemukan di sistem.` });

    const ownedIndex = player.pets.findIndex((p) => p.instanceId === instanceId && p.petId.equals(pet._id));
    if (ownedIndex === -1) {
      return interaction.editReply({ content: `❌ Pet "${pet.name}" dengan Instance ID \`${instanceId}\` tidak ditemukan di dalam inventarismu.` });
    }

    if (player.pets[ownedIndex].isLocked) {
      return interaction.editReply({ content: `❌ Pet "${pet.name}" sedang terkunci (mungkin sedang battle) dan tidak bisa dijual.` });
    }

    // Hapus pet dari inventaris player
    player.pets.splice(ownedIndex, 1);
    await player.save();

    const listing = await PlayerListing.create({
      guildId: interaction.guildId,
      sellerId: interaction.user.id,
      sellerName: player.characterName,
      type: 'pet',
      refId: pet._id,
      itemName: pet.name,
      quantity: 1, // Pet selalu dijual 1 per 1 (per instance)
      pricePerUnit: hargaTotal,
      currency,
    });

    await logTransaction(interaction.client, {
      guildId: interaction.guildId, type: 'player_listing_create', fromUserId: interaction.user.id,
      itemDescription: `Listing 1x Pet ${pet.name} (ID: ${instanceId}) @ ${hargaTotal} ${currency}`,
    });

    const kode = listing._id.toString().slice(-6).toUpperCase();
    const perkiraanDiterima = Math.floor(hargaTotal * (1 - LISTING_FEE_RATE));

    const embed = new EmbedBuilder()
      .setColor(0x9b59b6)
      .setTitle('📋 Listing Pet Dibuat!')
      .setDescription(
        `**1x ${pet.name}** dipasang di player shop seharga **${hargaTotal} ${CURRENCY_LABEL[currency]}**.\n\n` +
        `Kode listing: \`${kode}\` (dipakai orang lain untuk beli via \`/market beli\`)\n` +
        `Kalau laku, kamu terima **${perkiraanDiterima} ${CURRENCY_LABEL[currency]}** (setelah dipotong biaya listing 5%).`
      );
    return interaction.editReply({ embeds: [embed] });
  },
};
