const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Sect = require('../../../models/Sect');
const Asset = require('../../../models/Asset');
const { checkMaterials, consumeMaterials } = require('../../../utils/crafting');
const { logTransaction } = require('../../../utils/logger');
const { getPlayerSect } = require('../../../utils/sectUtils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sekte-bangun-asset')
    .setDescription('Bangun aset untuk sekte menggunakan sumber daya bersama sekte')
    .addStringOption((o) => o.setName('nama-aset').setDescription('Nama aset yang mau dibangun').setRequired(true).setAutocomplete(true)),

  async autocomplete(interaction) {
    const focusedOpt = interaction.options.getFocused(true);
    if (focusedOpt.name === 'nama-aset') {
      const assets = await Asset.find({ buildable: true, name: new RegExp(focusedOpt.value, 'i') }).limit(25);
      return interaction.respond(assets.map((a) => ({ name: a.name, value: a.name })));
    }
    return interaction.respond([]);
  },

  async execute(interaction) {
    await interaction.deferReply();

    const namaAset = interaction.options.getString('nama-aset');

    const sect = await getPlayerSect(interaction.guildId, interaction.user.id);
    if (!sect) return interaction.editReply({ content: '❌ Kamu tidak sedang bergabung dalam sekte manapun.' });

    const role = sect.getRoleOf(interaction.user.id);
    if (role !== 'Ketua' && role !== 'Wakil Ketua') {
      return interaction.editReply({ content: '❌ Hanya Ketua/Wakil Sekte yang bisa melakukan ini!' });
    }

    const asset = await Asset.findOne({ name: new RegExp(`^${namaAset}$`, 'i') });
    if (!asset) return interaction.editReply({ content: `❌ Aset "${namaAset}" tidak ditemukan.` });
    if (!asset.buildable) {
      return interaction.editReply({ content: `❌ "${asset.name}" tidak bisa dibangun mandiri.` });
    }

    const fakeRecipe = { materials: asset.buildRequirements || [] };
    const check = checkMaterials(sect.resources, fakeRecipe);
    if (!check.ok) {
      const missingLines = check.missing.map((m) => `**${m.itemName}**: butuh ${m.need}, stok sekte ${m.have}`).join('\n');
      return interaction.editReply({ content: `❌ Sumber daya sekte tidak cukup untuk membangun **${asset.name}**:\n${missingLines}` });
    }

    sect.resources = consumeMaterials(sect.resources, fakeRecipe);

    const constructionCompleteAt = asset.constructionTimeHours > 0
      ? new Date(Date.now() + asset.constructionTimeHours * 60 * 60 * 1000)
      : null;

    const owned = sect.assets.find((a) => a.assetId.equals(asset._id));
    if (owned) owned.quantity += 1;
    else sect.assets.push({ assetId: asset._id, quantity: 1, lastClaimAt: null, constructionCompleteAt });
    await sect.save();

    await logTransaction(interaction.client, {
      guildId: interaction.guildId, type: 'sect_build_asset', fromUserId: interaction.user.id,
      itemDescription: `Sekte ${sect.name} membangun ${asset.name}`,
    });

    const matUsed = asset.buildRequirements?.length > 0
      ? asset.buildRequirements.map((m) => `${m.quantity}x ${m.itemName}`).join(', ')
      : 'Tidak ada material yang diperlukan';

    const embed = new EmbedBuilder()
      .setColor(0x27ae60)
      .setTitle('🔨 Sekte Membangun Aset!')
      .setDescription(
        `Sekte **${sect.name}** berhasil membangun **${asset.name}**!\n\nMaterial terpakai dari stok sekte: ${matUsed}` +
        (constructionCompleteAt ? `\n\n🚧 Butuh **${asset.constructionTimeHours} jam** sebelum bisa diklaim/dipakai.` : '\n\n✅ Langsung bisa dipakai sekarang.')
      );
    return interaction.editReply({ embeds: [embed] });
  },
};
