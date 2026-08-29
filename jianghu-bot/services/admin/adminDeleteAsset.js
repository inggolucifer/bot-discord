const { escapeRegex } = require('../../utils/escapeRegex');
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { isAdmin } = require('../../utils/permissions');
const Asset = require('../../models/Asset');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-delete-asset')
    .setDescription('[ADMIN] Hapus aset dari database')
    .addStringOption((o) => o.setName('nama').setDescription('Nama aset').setRequired(true).setAutocomplete(true)),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused();
    const assets = await Asset.find({ guildId: interaction.guildId, name: new RegExp(escapeRegex(focused), 'i') }).limit(25);
    await interaction.respond(assets.map((a) => ({ name: a.name, value: a.name })));
  },

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    if (!(await isAdmin(interaction))) return interaction.editReply({ content: '❌ Kamu bukan admin.' });
    const nama = interaction.options.getString('nama');
    const asset = await Asset.findOne({ guildId: interaction.guildId, name: new RegExp(`^${escapeRegex(nama)}$`, 'i') });
    if (!asset) return interaction.editReply({ content: `❌ Aset "${nama}" tidak ditemukan.` });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`confirm_delete_asset_${asset._id}`).setLabel('Ya, Hapus').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('cancel_action').setLabel('Batal').setStyle(ButtonStyle.Secondary),
    );
    const embed = new EmbedBuilder().setColor(0xc0392b).setTitle('⚠️ Konfirmasi Hapus Aset').setDescription(`Yakin ingin menghapus aset **${asset.name}**? Aset yang sudah dimiliki player TIDAK ikut terhapus dari kepemilikan mereka, tapi referensinya akan rusak.`);
    return interaction.editReply({ embeds: [embed], components: [row] });
  },
};
