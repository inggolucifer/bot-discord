const { escapeRegex } = require('../../utils/escapeRegex');
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { isAdmin } = require('../../utils/permissions');
const Pet = require('../../models/Pet');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-delete-pet')
    .setDescription('[ADMIN] Hapus pet dari database')
    .addStringOption((o) => o.setName('nama').setDescription('Nama pet').setRequired(true).setAutocomplete(true)),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused();
    const pets = await Pet.find({ guildId: interaction.guildId, name: new RegExp(escapeRegex(focused), 'i') }).limit(25);
    await interaction.respond(pets.map((p) => ({ name: p.name, value: p.name })));
  },

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    if (!(await isAdmin(interaction))) return interaction.editReply({ content: '❌ Kamu bukan admin.' });
    const nama = interaction.options.getString('nama');
    const pet = await Pet.findOne({ guildId: interaction.guildId, name: new RegExp(`^\\s*${escapeRegex(nama)}\\s*$`, 'i') });
    if (!pet) return interaction.editReply({ content: `❌ Pet "${nama}" tidak ditemukan.` });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`confirm_delete_pet_${pet._id}`).setLabel('Ya, Hapus').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('cancel_action').setLabel('Batal').setStyle(ButtonStyle.Secondary),
    );
    const embed = new EmbedBuilder().setColor(0xc0392b).setTitle('⚠️ Konfirmasi Hapus Pet').setDescription(`Yakin ingin menghapus pet **${pet.name}**? Pet yang sudah dimiliki player TIDAK ikut terhapus dari koleksi mereka, tapi referensinya akan rusak.`);
    return interaction.editReply({ embeds: [embed], components: [row] });
  },
};
