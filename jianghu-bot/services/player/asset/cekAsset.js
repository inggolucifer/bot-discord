const { escapeRegex } = require('../../../utils/escapeRegex');
const { SlashCommandBuilder } = require('discord.js');
const Asset = require('../../../models/Asset');
const { buildAssetEmbed } = require('../../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cek-asset')
    .setDescription('Lihat detail sebuah aset')
    .addStringOption((opt) => opt.setName('nama').setDescription('Nama aset').setRequired(true).setAutocomplete(true)),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused();
    const assets = await Asset.find({ name: new RegExp(escapeRegex(focused), 'i') }).limit(25);
    await interaction.respond(assets.map((a) => ({ name: a.name, value: a.name })));
  },

  async execute(interaction) {
    await interaction.deferReply();

    const nama = interaction.options.getString('nama');
    const asset = await Asset.findOne({ guildId: interaction.guildId, name: new RegExp("^\\s*" + escapeRegex(nama) + "\\s*$", "i") });
    if (!asset) return interaction.editReply({ content: `❌ Aset "${nama}" tidak ditemukan.` });

    // Attempt to see if player owns it to provide real-time status in the embed
    const Player = require('../../../models/Player');
    const player = await Player.findOne({ discordId: interaction.user.id, guildId: interaction.guildId });
    let embed = buildAssetEmbed(asset);

    if (player) {
        const ownedAsset = player.assets.find(a => a.assetId.equals(asset._id));
        if (ownedAsset) {
            let status = '🟢 Aktif';
            if (ownedAsset.status === 'building' || ownedAsset.status === 'pending') {
                status = '🚧 Sedang Dibangun';
            } else if (ownedAsset.isDamaged) {
                status = '🔴 RUSAK (' + (ownedAsset.damageType === 'bandit' ? 'Diserang Bandit' : 'Terkena Bencana') + ')';
            } else if (ownedAsset.isHalted) {
                status = '🟡 Terhenti (Kurang Material/Pekerja)';
            }

            let guardInfo = (ownedAsset.guardEndTime && ownedAsset.guardEndTime.getTime() > Date.now())
                ? `<t:${Math.floor(ownedAsset.guardEndTime.getTime()/1000)}:R>`
                : 'Tidak Ada';

            embed.addFields({
                name: 'Tinjauan Aset (Milikmu)',
                value: `**Status:** ${status}\n**Penjaga (Guard):** ${guardInfo}`
            });
        }
    }
    return interaction.editReply({ embeds: [buildAssetEmbed(asset)] });
  },
};
