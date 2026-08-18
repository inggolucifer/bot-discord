const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Player = require('../../models/Player');
const Asset = require('../../models/Asset');
const { calculateProgress } = require('../../utils/assetProgress');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sewa-worker-sistem')
    .setDescription('Sewa NPC Worker untuk menjalankan/membangun asetmu (5 Silver/jam)')
    .addStringOption((o) => o.setName('aset').setDescription('Nama aset milikmu').setRequired(true).setAutocomplete(true))
    .addIntegerOption((o) => o.setName('durasi').setDescription('Durasi sewa (dalam jam)').setRequired(true).setMinValue(1)),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused();
    const player = await Player.findOne({ discordId: interaction.user.id, guildId: interaction.guildId });
    if (!player) return interaction.respond([]);
    const assets = await Asset.find({ _id: { $in: player.assets.map((a) => a.assetId) }, name: new RegExp(focused, 'i') }).limit(25);
    return interaction.respond(assets.map((a) => ({ name: a.name, value: a.name })));
  },

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const assetName = interaction.options.getString('aset');
    const durasi = interaction.options.getInteger('durasi');

    const player = await Player.findOne({ discordId: interaction.user.id, guildId: interaction.guildId });
    if (!player) return interaction.editReply({ content: '❌ Kamu belum terdaftar.' });

    const assetDoc = await Asset.findOne({ guildId: interaction.guildId, name: new RegExp(`^${assetName}$`, 'i') });
    if (!assetDoc) return interaction.editReply({ content: '❌ Aset tidak ditemukan.' });

    const ownedAsset = player.assets.find((a) => a.assetId.equals(assetDoc._id));
    if (!ownedAsset) return interaction.editReply({ content: '❌ Kamu tidak memiliki aset tersebut.' });

    const totalCost = durasi * 5;
    if (player.currency.silver < totalCost) {
      return interaction.editReply({ content: `❌ Silver kamu tidak cukup. Butuh ${totalCost} Silver, saldomu ${player.currency.silver} Silver.` });
    }

    player.currency.silver -= totalCost;

    // Flush current progress first
    ownedAsset.progressAccumulated += calculateProgress(ownedAsset);
    ownedAsset.lastProgressUpdate = new Date();

    if (!ownedAsset.assignedWorkers) ownedAsset.assignedWorkers = [];
    ownedAsset.assignedWorkers.push({
      workerId: `NPC_${Date.now()}`,
      endTime: new Date(Date.now() + durasi * 3600000)
    });

    if (ownedAsset.status === 'pending') ownedAsset.status = 'building';

    await player.save();

    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle('✅ NPC Worker Disewa')
      .setDescription(`Kamu telah menyewa NPC Worker untuk bekerja di **${assetDoc.name}** selama **${durasi} jam** dengan biaya **${totalCost} Silver**.`);

    return interaction.editReply({ embeds: [embed] });
  },
};
