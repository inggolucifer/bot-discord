const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { isAdmin } = require('../../utils/permissions');
const Sect = require('../../models/Sect');
const Item = require('../../models/Item');
const Asset = require('../../models/Asset');
const { rollPartialLoot } = require('../../utils/dice');
const { logAdminAction } = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-sekte-war')
    .setDescription('[ADMIN] Perang sekte: pemenang loot sebagian aset sekte kalah (acak)')
    .addStringOption((o) => o.setName('sekte-menang').setDescription('Sekte yang menang').setRequired(true).setAutocomplete(true))
    .addStringOption((o) => o.setName('sekte-kalah').setDescription('Sekte yang kalah (akan hancur, kembali ke 0)').setRequired(true).setAutocomplete(true)),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused();
    const list = await Sect.find({ guildId: interaction.guildId, name: new RegExp(focused, 'i') }).limit(25);
    return interaction.respond(list.map((s) => ({ name: s.name, value: s.name })));
  },

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    if (!(await isAdmin(interaction))) return interaction.editReply({ content: '❌ Kamu bukan admin.' });

    const namaMenang = interaction.options.getString('sekte-menang');
    const namaKalah = interaction.options.getString('sekte-kalah');

    if (namaMenang.toLowerCase() === namaKalah.toLowerCase()) {
      return interaction.editReply({ content: '❌ Sekte pemenang dan yang kalah tidak boleh sama.' });
    }

    const winner = await Sect.findOne({ guildId: interaction.guildId, name: new RegExp(`^${namaMenang}$`, 'i') });
    if (!winner) return interaction.editReply({ content: `❌ Sekte "${namaMenang}" tidak ditemukan.` });
    const loser = await Sect.findOne({ guildId: interaction.guildId, name: new RegExp(`^${namaKalah}$`, 'i') });
    if (!loser) return interaction.editReply({ content: `❌ Sekte "${namaKalah}" tidak ditemukan.` });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`confirm_sekte_war_${winner._id}_${loser._id}`).setLabel(`Ya, ${winner.name} Menang atas ${loser.name}`).setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('cancel_action').setLabel('Batal').setStyle(ButtonStyle.Secondary),
    );

    const embed = new EmbedBuilder()
      .setColor(0xc0392b)
      .setTitle('⚔️ Konfirmasi Hasil Perang Sekte')
      .setDescription(
        `**${winner.name}** akan dinyatakan MENANG atas **${loser.name}**.\n\n` +
        `Yang akan terjadi:\n` +
        `• ${winner.name} loot SEBAGIAN aset & resource ${loser.name} secara acak (roll dadu per item)\n` +
        `• ${loser.name} HANCUR: seluruh aset, resource, dan currency-nya musnah/dirampas, kembali ke 0\n` +
        `• Keanggotaan sekte ${loser.name} TETAP ADA (bisa membangun ulang dari nol)\n\n` +
        `Lanjutkan?`
      );

    return interaction.editReply({ embeds: [embed], components: [row] });
  },
};

