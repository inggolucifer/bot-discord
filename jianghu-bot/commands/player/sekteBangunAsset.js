const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Sect = require('../../models/Sect');
const Asset = require('../../models/Asset');
const { checkMaterials, consumeMaterials } = require('../../utils/crafting');
const { logTransaction } = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sekte-bangun-asset')
    .setDescription('Bangun aset untuk sekte menggunakan sumber daya bersama sekte')
    .addStringOption((o) => o.setName('nama-sekte').setDescription('Nama sekte').setRequired(true).setAutocomplete(true))
    .addStringOption((o) => o.setName('nama-aset').setDescription('Nama aset yang mau dibangun').setRequired(true).setAutocomplete(true)),

  async autocomplete(interaction) {
    const focusedOpt = interaction.options.getFocused(true);
    if (focusedOpt.name === 'nama-sekte') {
      const list = await Sect.find({ guildId: interaction.guildId, name: new RegExp(focusedOpt.value, 'i') }).limit(25);
      return interaction.respond(list.map((s) => ({ name: s.name, value: s.name })));
    }
    const assets = await Asset.find({ guildId: interaction.guildId, buildable: true, name: new RegExp(focusedOpt.value, 'i') }).limit(25);
    return interaction.respond(assets.map((a) => ({ name: a.name, value: a.name })));
  },

  async execute(interaction) {
    await interaction.deferReply();

    const namaSekte = interaction.options.getString('nama-sekte');
    const namaAset = interaction.options.getString('nama-aset');

    const sect = await Sect.findOne({ guildId: interaction.guildId, name: new RegExp(`^${namaSekte}$`, 'i') });
    if (!sect) return interaction.editReply({ content: `❌ Sekte "${namaSekte}" tidak ditemukan.` });

    const role = sect.getRoleOf(interaction.user.id);
    if (!role) return interaction.editReply({ content: '❌ Kamu bukan anggota sekte ini.' });

    const asset = await Asset.findOne({ guildId: interaction.guildId, name: new RegExp(`^${namaAset}$`, 'i') });
    if (!asset) return interaction.editReply({ content: `❌ Aset "${namaAset}" tidak ditemukan.` });
    if (!asset.buildable || !asset.buildRequirements?.length) {
      return interaction.editReply({ content: `❌ "${asset.name}" tidak bisa dibangun mandiri.` });
    }

    const fakeRecipe = { materials: asset.buildRequirements };
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

    const matUsed = asset.buildRequirements.map((m) => `${m.quantity}x ${m.itemName}`).join(', ');
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

