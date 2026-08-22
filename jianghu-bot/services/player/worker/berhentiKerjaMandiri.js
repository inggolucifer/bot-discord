const { MessageFlags } = require('discord.js');
const Player = require('../../../models/Player');
const { calculateProgress } = require('../../../utils/assetProgress');

module.exports = {
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const player = await Player.findOne({ discordId: interaction.user.id, guildId: interaction.guildId });
    if (!player) return interaction.editReply({ content: '❌ Kamu belum terdaftar.' });

    let found = false;
    for (const owned of player.assets) {
      if (owned.assignedWorkers) {
        const myIndex = owned.assignedWorkers.findIndex(w => w.workerId === interaction.user.id);
        if (myIndex !== -1) {
          owned.progressAccumulated = (owned.progressAccumulated || 0) + calculateProgress(owned);
          owned.lastProgressUpdate = new Date();
          owned.assignedWorkers.splice(myIndex, 1);
          found = true;
        }
      }
    }

    if (!found) {
      return interaction.editReply({ content: '❌ Kamu tidak sedang bekerja secara mandiri di aset mana pun milikmu.' });
    }

    player.customStatus = null;
    await player.save();

    return interaction.editReply({ content: '✅ Kamu berhenti bekerja di asetmu.' });
  }
};
