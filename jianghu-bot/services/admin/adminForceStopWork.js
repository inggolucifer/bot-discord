const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { isAdmin } = require('../../utils/permissions');
const Player = require('../../models/Player');
const WorkerContract = require('../../models/WorkerContract');
const Asset = require('../../models/Asset');
const { calculateProgress } = require('../../utils/assetProgress');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-force-stop-work')
    .setDescription('[ADMIN] Paksa berhenti kerja/reset status pekerja dari seorang pemain')
    .addUserOption((o) => o.setName('user').setDescription('Pemain').setRequired(true)),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    if (!(await isAdmin(interaction))) return interaction.editReply({ content: '❌ Kamu bukan admin.' });

    const targetUser = interaction.options.getUser('user');

    // 1. Cari pemain
    const player = await Player.findOne({ discordId: targetUser.id, guildId: interaction.guildId });
    if (!player) return interaction.editReply({ content: `❌ Pemain **${targetUser.username}** tidak ditemukan di database.` });

    let summary = [];

    // 2. Hapus status WorkerContract jika ada dan sedang 'working'
    const contract = await WorkerContract.findOne({ guildId: interaction.guildId, workerId: targetUser.id });
    if (contract) {
      if (contract.status === 'working') {
        contract.status = 'available';
        contract.currentAssetId = null;
        contract.currentEmployerId = null;
        contract.workingSince = null;
        contract.workingUntil = null;
        await contract.save();
        summary.push('✅ Status WorkerContract direset menjadi available.');
      }
    }

    // 3. Cari dan hapus pemain dari assignedWorkers di semua aset (milik siapapun)
    const allPlayers = await Player.find({ guildId: interaction.guildId });
    let removedFromAssets = 0;

    for (const p of allPlayers) {
      let isPlayerModified = false;
      for (const owned of p.assets) {
        if (owned.assignedWorkers && owned.assignedWorkers.length > 0) {
          const myIndex = owned.assignedWorkers.findIndex(w => w.workerId === targetUser.id);
          if (myIndex !== -1) {
            // Kalkulasi dan simpan progress sebelum dihapus (penting!)
            owned.progressAccumulated = (owned.progressAccumulated || 0) + calculateProgress(owned);
            owned.lastProgressUpdate = new Date();

            owned.assignedWorkers.splice(myIndex, 1);
            isPlayerModified = true;
            removedFromAssets++;
          }
        }
      }

      if (isPlayerModified) {
        await p.save();
      }
    }

    if (removedFromAssets > 0) {
      summary.push(`✅ Dihapus dari tugas kerja di ${removedFromAssets} aset.`);
    }

    // 4. Hapus customStatus
    if (player.customStatus && player.customStatus.toLowerCase().includes('kerja')) {
       player.customStatus = null;
       await player.save();
       summary.push('✅ customStatus pemain dibersihkan.');
    } else {
       // Save anyway just in case some logic changed custom status above (though it shouldn't have)
       // Or if we want to ensure customStatus is cleared regardless
       player.customStatus = null;
       await player.save();
       if (!summary.some(s => s.includes('customStatus'))) {
           summary.push('✅ customStatus pemain dibersihkan.');
       }
    }

    if (summary.length === 0) {
        summary.push('ℹ️ Pemain tidak sedang bekerja atau ditugaskan di aset mana pun.');
    }

    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle('🔧 Force Stop Work')
      .setDescription(`Status kerja **${player.characterName}** (<@${targetUser.id}>) telah direset.\n\n${summary.join('\n')}`);

    return interaction.editReply({ embeds: [embed] });
  },
};
