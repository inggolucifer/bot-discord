const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Player = require('../../models/Player');
const { syncRealmRole } = require('../../utils/realmRole');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('daftar')
    .setDescription('Daftar karakter baru untuk memulai roleplay di Jianghu World')
    .addStringOption((opt) =>
      opt.setName('nama').setDescription('Nama karakter kamu').setRequired(true).setMaxLength(32)
    )
    .addStringOption((opt) =>
      opt.setName('jenis-kelamin').setDescription('Jenis kelamin karakter').setRequired(true)
        .addChoices({ name: 'Laki-laki', value: 'Laki-laki' }, { name: 'Perempuan', value: 'Perempuan' })
    )
    .addIntegerOption((opt) =>
      opt.setName('umur').setDescription('Umur karakter (default: 16)').setRequired(false).setMinValue(1).setMaxValue(9999)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: false });

    const nama = interaction.options.getString('nama').trim();
    const jenisKelamin = interaction.options.getString('jenis-kelamin');
    const umur = interaction.options.getInteger('umur') || 16;

    const existing = await Player.findOne({ discordId: interaction.user.id, guildId: interaction.guildId });
    if (existing) {
      return interaction.editReply({
        content: `❌ Kamu sudah terdaftar sebagai **${existing.characterName}**. Satu akun Discord hanya bisa punya 1 karakter. Hubungi admin jika ingin reset.`,
      });
    }

    // Cek nama karakter belum dipakai orang lain di server yang sama
    const nameTaken = await Player.findOne({ guildId: interaction.guildId, characterName: nama });
    if (nameTaken) {
      return interaction.editReply({ content: '❌ Nama karakter itu sudah dipakai player lain. Coba nama lain.' });
    }

    const player = await Player.create({
      discordId: interaction.user.id,
      guildId: interaction.guildId,
      characterName: nama,
      gender: jenisKelamin,
      age: umur,
    });

    // Ubah nickname Discord otomatis
    try {
      await interaction.member.setNickname(nama);
    } catch (e) {
      // Bot mungkin tidak punya izin (misalnya target adalah Server Owner). Tidak fatal.
      console.warn(`[DAFTAR] Gagal ubah nickname untuk ${interaction.user.id}:`, e.message);
    }

    // Pasang role ranah default kalau admin sudah mapping role untuk ranah awal ini
    syncRealmRole(interaction.client, interaction.guildId, interaction.user.id, player.realm).catch((e) => console.error('[REALM-ROLE] Gagal sync saat daftar:', e.message));

    const embed = new EmbedBuilder()
      .setColor(0x27ae60)
      .setTitle('✅ Pendaftaran Berhasil!')
      .setDescription(
        `Selamat datang di Jianghu, **${nama}**!\n\n` +
        `Karaktermu telah tercatat secara permanen dan terikat ke akun Discord-mu ini. ` +
        `Gunakan \`/profil\` untuk melihat data karaktermu, dan \`/daily\` untuk klaim hadiah harian.\n\n` +
        `Mau ubah umur nanti? Tinggal pakai \`/ubah-umur\` kapan saja.`
      )
      .setFooter({ text: 'Semoga perjalananmu di dunia persilatan penuh berkah.' });

    return interaction.editReply({ embeds: [embed] });
  },
};

