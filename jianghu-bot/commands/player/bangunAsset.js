const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Player = require('../../models/Player');
const Asset = require('../../models/Asset');
const { checkMaterials, consumeMaterials } = require('../../utils/crafting');
const { logTransaction } = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bangun-asset')
    .setDescription('Bangun aset sendiri menggunakan material dari inventorymu (bukan beli pakai currency)')
    .addStringOption((o) => o.setName('nama-aset').setDescription('Nama aset yang mau dibangun').setRequired(true).setAutocomplete(true)),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused();
    const assets = await Asset.find({ guildId: interaction.guildId, buildable: true, name: new RegExp(focused, 'i') }).limit(25);
    return interaction.respond(assets.map((a) => ({ name: a.name, value: a.name })));
  },

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const namaAset = interaction.options.getString('nama-aset');

    const player = await Player.findOne({ discordId: interaction.user.id, guildId: interaction.guildId });
    if (!player) return interaction.editReply({ content: '❌ Kamu belum terdaftar.' });
    if (player.status !== 'active') return interaction.editReply({ content: `❌ Karaktermu berstatus **${player.status}**.` });

    const asset = await Asset.findOne({ guildId: interaction.guildId, name: new RegExp(`^${namaAset}$`, 'i') });
    if (!asset) return interaction.editReply({ content: `❌ Aset "${namaAset}" tidak ditemukan.` });
    if (!asset.buildable || !asset.buildRequirements || asset.buildRequirements.length < 5) {
      return interaction.editReply({ content: `❌ "${asset.name}" belum memiliki minimal 5 syarat material. Minta admin untuk mengaturnya.` });
    }

    if (!asset.buildable) {
      return interaction.editReply({ content: `❌ "${asset.name}" tidak bisa dibangun mandiri. Beli lewat shop kalau tersedia.` });
    }

    const fakeRecipe = { materials: asset.buildRequirements };
    const check = checkMaterials(player.inventory, fakeRecipe);
    if (!check.ok) {
      const missingLines = check.missing.map((m) => `**${m.itemName}**: butuh ${m.need}, kamu punya ${m.have}`).join('\n');
      return interaction.editReply({ content: `❌ Material tidak cukup untuk membangun **${asset.name}**:\n${missingLines}` });
    }

    player.inventory = consumeMaterials(player.inventory, fakeRecipe);

    const constructionCompleteAt = asset.constructionTimeHours > 0
      ? new Date(Date.now() + asset.constructionTimeHours * 60 * 60 * 1000)
      : null;

    const owned = player.assets.find((a) => a.assetId.equals(asset._id));
    if (owned) {
      owned.quantity += 1; // aset yang sudah ada sebelumnya (sudah selesai dibangun) tidak diulang timernya
    } else {
      player.assets.push({ assetId: asset._id, quantity: 1, lastClaimAt: null, constructionCompleteAt, status: 'pending', progressAccumulated: 0, lastProgressUpdate: new Date(), assignedWorkers: [] });
    }
    await player.save();

    await logTransaction(interaction.client, {
      guildId: interaction.guildId, type: 'player_build_asset', fromUserId: interaction.user.id,
      itemDescription: `Membangun ${asset.name} dari material`,
    });

    const matUsed = asset.buildRequirements.map((m) => `${m.quantity}x ${m.itemName}`).join(', ');
    const embed = new EmbedBuilder()
      .setColor(0x27ae60)
      .setTitle('🔨 Pembangunan Dimulai!')
      .setDescription(
        `Kamu berhasil membangun **${asset.name}**!\n\nMaterial terpakai: ${matUsed}` +
        (constructionCompleteAt ? `\n\n🚧 Butuh **${asset.constructionTimeHours} jam** sebelum bisa di-claim-profit/craft.` : '\n\n✅ Langsung bisa dipakai sekarang.')
      );
    return interaction.editReply({ embeds: [embed] });
  },
};

