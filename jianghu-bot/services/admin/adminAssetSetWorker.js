const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { isAdmin } = require('../../utils/permissions');
const Asset = require('../../models/Asset');
const Item = require('../../models/Item');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-asset-set-worker')
    .setDescription('[ADMIN] Jadikan aset sebagai tipe Pekerja (hasilkan material harian, mis. lahan batu bata)')
    .addStringOption((o) => o.setName('nama-aset').setDescription('Nama aset').setRequired(true).setAutocomplete(true))
    .addStringOption((o) => o.setName('item-hasil').setDescription('Nama item yang dihasilkan per hari').setRequired(true))
    .addIntegerOption((o) => o.setName('jumlah-hasil').setDescription('Jumlah dihasilkan per hari (default 1)').setMinValue(1)),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused();
    const assets = await Asset.find({ guildId: interaction.guildId, name: new RegExp(focused, 'i') }).limit(25);
    return interaction.respond(assets.map((a) => ({ name: a.name, value: a.name })));
  },

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    if (!(await isAdmin(interaction))) return interaction.editReply({ content: '❌ Kamu bukan admin.' });

    const namaAset = interaction.options.getString('nama-aset');
    const namaHasil = interaction.options.getString('item-hasil');
    const jumlahHasil = interaction.options.getInteger('jumlah-hasil') || 1;

    const asset = await Asset.findOne({ guildId: interaction.guildId, name: new RegExp(`^${namaAset}$`, 'i') });
    if (!asset) return interaction.editReply({ content: `❌ Aset "${namaAset}" tidak ditemukan.` });

    const item = await Item.findOne({ guildId: interaction.guildId, name: new RegExp(`^${namaHasil}$`, 'i') });
    if (!item) return interaction.editReply({ content: `❌ Item "${namaHasil}" tidak ditemukan. Buat dulu lewat /admin-add-item.` });

    asset.workerOutputItemId = item._id;
    asset.workerOutputItemName = item.name;
    asset.workerOutputQuantity = jumlahHasil;
    await asset.save();

    const embed = new EmbedBuilder()
      .setColor(0x27ae60)
      .setTitle('⛏️ Aset Pekerja Diatur')
      .setDescription(`**${asset.name}** sekarang menghasilkan **${jumlahHasil}x ${item.name}** setiap hari saat di-claim-profit (bisa berbarengan dengan income currency & crafting kalau ada).`);
    return interaction.editReply({ embeds: [embed] });
  },
};

