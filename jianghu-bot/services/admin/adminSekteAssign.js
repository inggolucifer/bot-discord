const { escapeRegex } = require('../../utils/escapeRegex');
const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { isAdmin } = require('../../utils/permissions');
const Sect = require('../../models/Sect');
const Player = require('../../models/Player');
const { syncPlayerSectLabel } = require('../../utils/sectSync');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-sekte-assign')
    .setDescription('[ADMIN] Angkat/pindahkan player ke sebuah jabatan di sekte')
    .addStringOption((o) => o.setName('nama-sekte').setDescription('Nama sekte').setRequired(true).setAutocomplete(true))
    .addUserOption((o) => o.setName('user').setDescription('Player yang diangkat').setRequired(true))
    .addStringOption((o) => o.setName('posisi').setDescription('Jabatan di sekte').setRequired(true).addChoices(
      { name: 'Ketua', value: 'Ketua' }, { name: 'Wakil Ketua', value: 'Wakil Ketua' },
      { name: 'Tetua', value: 'Tetua' }, { name: 'Anggota', value: 'Anggota' },
    )),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused();
    const list = await Sect.find({ guildId: interaction.guildId, name: new RegExp(escapeRegex(focused), 'i') }).limit(25);
    return interaction.respond(list.map((s) => ({ name: s.name, value: s.name })));
  },

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    if (!(await isAdmin(interaction))) return interaction.editReply({ content: '❌ Kamu bukan admin.' });

    const namaSekte = interaction.options.getString('nama-sekte');
    const target = interaction.options.getUser('user');
    const posisi = interaction.options.getString('posisi');

    const sect = await Sect.findOne({ guildId: interaction.guildId, name: new RegExp(`^\\s*${escapeRegex(namaSekte)}\\s*$`, 'i') });
    if (!sect) return interaction.editReply({ content: `❌ Sekte "${namaSekte}" tidak ditemukan.` });

    const player = await Player.findOne({ discordId: target.id, guildId: interaction.guildId });
    if (!player) return interaction.editReply({ content: `❌ ${target.username} belum terdaftar sebagai karakter.` });

    // Bersihkan dulu dari posisi lama DI SEKTE MANAPUN (satu player cuma boleh 1 sekte pada satu waktu)
    const allSects = await Sect.find({ guildId: interaction.guildId, $or: [{ leaderId: target.id }, { viceLeaderId: target.id }, { elderIds: target.id }, { memberIds: target.id }] });
    for (const s of allSects) {
      if (s.leaderId === target.id) s.leaderId = null;
      if (s.viceLeaderId === target.id) s.viceLeaderId = null;
      s.elderIds = s.elderIds.filter((id) => id !== target.id);
      s.memberIds = s.memberIds.filter((id) => id !== target.id);
      if (!s._id.equals(sect._id)) await s.save();
    }

    // Pasang ke posisi baru
    if (posisi === 'Ketua') {
      if (sect.leaderId && sect.leaderId !== target.id) {
        return interaction.editReply({ content: `❌ Sekte ini sudah punya Ketua (<@${sect.leaderId}>). Copot dulu posisinya sebelum mengangkat ketua baru.` });
      }
      sect.leaderId = target.id;
    } else if (posisi === 'Wakil Ketua') {
      if (sect.viceLeaderId && sect.viceLeaderId !== target.id) {
        return interaction.editReply({ content: `❌ Sekte ini sudah punya Wakil Ketua (<@${sect.viceLeaderId}>). Copot dulu posisinya sebelum mengangkat yang baru.` });
      }
      sect.viceLeaderId = target.id;
    } else if (posisi === 'Tetua') {
      if (!sect.elderIds.includes(target.id)) sect.elderIds.push(target.id);
    } else {
      if (!sect.memberIds.includes(target.id)) sect.memberIds.push(target.id);
    }
    await sect.save();

    await syncPlayerSectLabel(interaction.guildId, target.id, sect.name);

    const embed = new EmbedBuilder()
      .setColor(0x27ae60)
      .setTitle('✅ Jabatan Sekte Diperbarui')
      .setDescription(`${target} sekarang menjabat sebagai **${posisi}** di sekte **${sect.name}**.`);
    return interaction.editReply({ embeds: [embed] });
  },
};

