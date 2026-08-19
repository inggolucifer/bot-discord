const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { isAdmin } = require('../../../utils/permissions');
const Asset = require('../../../models/Asset');
const Item = require('../../../models/Item');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-asset-build-req-set')
    .setDescription('[ADMIN] Atur material yang dibutuhkan supaya aset ini bisa dibangun mandiri oleh player/sekte')
    .addStringOption((o) => o.setName('nama-aset').setDescription('Nama aset').setRequired(true).setAutocomplete(true))
    .addStringOption((o) => o.setName('bahan-1').setDescription('Nama item bahan #1').setRequired(true))
    .addIntegerOption((o) => o.setName('jumlah-1').setDescription('Jumlah bahan #1').setRequired(true).setMinValue(1))
    .addStringOption((o) => o.setName('bahan-2').setDescription('Nama item bahan #2').setRequired(true))
    .addIntegerOption((o) => o.setName('jumlah-2').setDescription('Jumlah bahan #2').setRequired(true).setMinValue(1))
    .addStringOption((o) => o.setName('bahan-3').setDescription('Nama item bahan #3').setRequired(true))
    .addIntegerOption((o) => o.setName('jumlah-3').setDescription('Jumlah bahan #3').setRequired(true).setMinValue(1))
    .addStringOption((o) => o.setName('bahan-4').setDescription('Nama item bahan #4').setRequired(true))
    .addIntegerOption((o) => o.setName('jumlah-4').setDescription('Jumlah bahan #4').setRequired(true).setMinValue(1))
    .addStringOption((o) => o.setName('bahan-5').setDescription('Nama item bahan #5').setRequired(true))
    .addIntegerOption((o) => o.setName('jumlah-5').setDescription('Jumlah bahan #5').setRequired(true).setMinValue(1))
    .addStringOption((o) => o.setName('bahan-6').setDescription('Nama item bahan #6 (opsional)'))
    .addIntegerOption((o) => o.setName('jumlah-6').setDescription('Jumlah bahan #6').setMinValue(1)),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused();
    const assets = await Asset.find({ guildId: interaction.guildId, name: new RegExp(focused, 'i') }).limit(25);
    return interaction.respond(assets.map((a) => ({ name: a.name, value: a.name })));
  },

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    if (!(await isAdmin(interaction))) return interaction.editReply({ content: '❌ Kamu bukan admin.' });

    const namaAset = interaction.options.getString('nama-aset');
    const asset = await Asset.findOne({ guildId: interaction.guildId, name: new RegExp(`^${namaAset}$`, 'i') });
    if (!asset) return interaction.editReply({ content: `❌ Aset "${namaAset}" tidak ditemukan.` });

    const materials = [];
    for (let i = 1; i <= 6; i++) {
      const bahanNama = interaction.options.getString(`bahan-${i}`);
      const bahanJumlah = interaction.options.getInteger(`jumlah-${i}`);
      if (!bahanNama) continue;
      if (!bahanJumlah) return interaction.editReply({ content: `❌ Jumlah untuk bahan-${i} belum diisi.` });

      const matItem = await Item.findOne({ guildId: interaction.guildId, name: new RegExp(`^${bahanNama}$`, 'i') });
      if (!matItem) return interaction.editReply({ content: `❌ Item bahan "${bahanNama}" tidak ditemukan. Buat dulu lewat /admin-add-item.` });

      materials.push({ itemId: matItem._id, itemName: matItem.name, quantity: bahanJumlah });
    }

    if (materials.length < 5) return interaction.editReply({ content: '❌ Minimal harus ada 5 bahan untuk membangun aset.' });

    asset.buildable = true;
    asset.buildRequirements = materials;
    await asset.save();

    const matLines = materials.map((m) => `${m.quantity}x ${m.itemName}`).join(', ');
    const embed = new EmbedBuilder()
      .setColor(0x27ae60)
      .setTitle('🔨 Syarat Bangun Mandiri Diatur')
      .setDescription(`**${asset.name}** sekarang bisa dibangun mandiri oleh player (\`/bangun-asset\`) atau sekte (\`/sekte-bangun-asset\`) dengan material:\n${matLines}`);
    return interaction.editReply({ embeds: [embed] });
  },
};

