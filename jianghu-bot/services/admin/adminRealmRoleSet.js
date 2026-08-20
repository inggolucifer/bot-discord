const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { isAdmin } = require('../../utils/permissions');
const GuildConfig = require('../../models/GuildConfig');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-realm-role-set')
    .setDescription('[ADMIN] Hubungkan nama ranah tertentu dengan sebuah role (otomatis dipasang/dicopot)')
    .addStringOption((o) => o.setName('nama-ranah').setDescription('Nama ranah PERSIS seperti yang diisi di /admin-edit-player, contoh: Mortal').setRequired(true))
    .addRoleOption((o) => o.setName('role').setDescription('Role yang dipasang otomatis untuk ranah ini').setRequired(true)),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    if (!(await isAdmin(interaction))) return interaction.editReply({ content: '❌ Kamu bukan admin.' });

    const namaRanah = interaction.options.getString('nama-ranah').trim();
    const role = interaction.options.getRole('role');

    let config = await GuildConfig.findOne({ guildId: interaction.guildId });
    if (!config) config = new GuildConfig({ guildId: interaction.guildId });

    const existing = config.realmRoles.find((r) => r.realmName.toLowerCase() === namaRanah.toLowerCase());
    if (existing) existing.roleId = role.id;
    else config.realmRoles.push({ realmName: namaRanah, roleId: role.id });
    await config.save();

    const embed = new EmbedBuilder()
      .setColor(0x2980b9)
      .setTitle('✅ Role Ranah Dihubungkan')
      .setDescription(`Player dengan ranah **"${namaRanah}"** (cocok tanpa memandang huruf besar/kecil) sekarang otomatis dapat role ${role}.\n\nPerubahan berlaku saat admin mengubah ranah player lewat \`/admin-edit-player\`, atau saat player baru \`/daftar\`.`);
    return interaction.editReply({ embeds: [embed] });
  },
};

