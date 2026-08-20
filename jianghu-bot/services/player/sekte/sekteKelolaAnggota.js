const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const Sect = require('../../../models/Sect');
const Player = require('../../../models/Player');
const { syncPlayerSectLabel } = require('../../../utils/sectSync');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sekte-kelola-anggota')
    .setDescription('[KETUA SEKTE] Angkat/pindahkan anggota sekte milikmu ke jabatan Wakil Ketua/Tetua/Anggota')
    .addUserOption((o) => o.setName('user').setDescription('Player yang diangkat').setRequired(true))
    .addStringOption((o) => o.setName('posisi').setDescription('Jabatan baru').setRequired(true).addChoices(
      { name: 'Wakil Ketua', value: 'Wakil Ketua' }, { name: 'Tetua', value: 'Tetua' }, { name: 'Anggota', value: 'Anggota' },
    )),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const target = interaction.options.getUser('user');
    const posisi = interaction.options.getString('posisi');

    const mySect = await Sect.findOne({ guildId: interaction.guildId, leaderId: interaction.user.id });
    if (!mySect) return interaction.editReply({ content: '❌ Kamu bukan Ketua sekte manapun. Command ini khusus Ketua Sekte.' });

    if (target.id === interaction.user.id) {
      return interaction.editReply({ content: '❌ Tidak bisa mengubah jabatanmu sendiri (Ketua). Hubungi admin kalau ingin mundur/ganti Ketua.' });
    }

    const targetPlayer = await Player.findOne({ discordId: target.id, guildId: interaction.guildId });
    if (!targetPlayer) return interaction.editReply({ content: `❌ ${target.username} belum terdaftar sebagai karakter.` });

    // Cek target sedang di sekte lain atau tidak -- kalau di sekte lain, tolak (harus keluar dulu / kick dulu dari sekte lama)
    const targetOtherSect = await Sect.findOne({
      guildId: interaction.guildId,
      _id: { $ne: mySect._id },
      $or: [{ leaderId: target.id }, { viceLeaderId: target.id }, { elderIds: target.id }, { memberIds: target.id }],
    });
    if (targetOtherSect) {
      return interaction.editReply({ content: `❌ ${target.username} sudah tergabung di sekte lain (**${targetOtherSect.name}**). Minta admin pindahkan lewat /admin-sekte-assign kalau memang disengaja.` });
    }

    if (posisi === 'Wakil Ketua') {
      if (mySect.viceLeaderId && mySect.viceLeaderId !== target.id) {
        return interaction.editReply({ content: `❌ Sekte ini sudah punya Wakil Ketua (<@${mySect.viceLeaderId}>). Turunkan dulu jabatannya sebelum mengangkat yang baru.` });
      }
      mySect.viceLeaderId = target.id;
      mySect.elderIds = mySect.elderIds.filter((id) => id !== target.id);
      mySect.memberIds = mySect.memberIds.filter((id) => id !== target.id);
    } else if (posisi === 'Tetua') {
      if (mySect.viceLeaderId === target.id) mySect.viceLeaderId = null;
      mySect.memberIds = mySect.memberIds.filter((id) => id !== target.id);
      if (!mySect.elderIds.includes(target.id)) mySect.elderIds.push(target.id);
    } else {
      if (mySect.viceLeaderId === target.id) mySect.viceLeaderId = null;
      mySect.elderIds = mySect.elderIds.filter((id) => id !== target.id);
      if (!mySect.memberIds.includes(target.id)) mySect.memberIds.push(target.id);
    }
    await mySect.save();

    await syncPlayerSectLabel(interaction.guildId, target.id, mySect.name);

    const embed = new EmbedBuilder()
      .setColor(0x27ae60)
      .setTitle('✅ Jabatan Sekte Diperbarui')
      .setDescription(`${target} sekarang menjabat sebagai **${posisi}** di sekte **${mySect.name}**.`);
    return interaction.editReply({ embeds: [embed] });
  },
};

