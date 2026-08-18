const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { isAdmin } = require('../../utils/permissions');
const Item = require('../../models/Item');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-delete-item')
    .setDescription('[ADMIN] Hapus item')
    .addStringOption((o) => o.setName('nama').setDescription('Nama item').setRequired(true).setAutocomplete(true)),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused();
    const items = await Item.find({ guildId: interaction.guildId, name: new RegExp(focused, 'i') }).limit(25);
    await interaction.respond(items.map((i) => ({ name: i.name, value: i.name })));
  },

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    if (!(await isAdmin(interaction))) return interaction.editReply({ content: '❌ Kamu bukan admin.' });
    const nama = interaction.options.getString('nama');
    const item = await Item.findOne({ guildId: interaction.guildId, name: new RegExp(`^${nama}$`, 'i') });
    if (!item) return interaction.editReply({ content: `❌ Item "${nama}" tidak ditemukan.` });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`confirm_delete_item_${item._id}`).setLabel('Ya, Hapus').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('cancel_action').setLabel('Batal').setStyle(ButtonStyle.Secondary),
    );
    const embed = new EmbedBuilder().setColor(0xc0392b).setTitle('⚠️ Konfirmasi Hapus Item').setDescription(`Yakin ingin menghapus item **${item.name}**? Item yang sudah dimiliki player TIDAK akan ikut terhapus dari inventory mereka, tapi referensinya akan rusak. Pastikan item ini sudah tidak dipakai siapa pun.`);
    return interaction.editReply({ embeds: [embed], components: [row] });
  },
};
