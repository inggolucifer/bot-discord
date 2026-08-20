const Sect = require('../models/Sect');

async function getPlayerSect(guildId, discordId) {
  return await Sect.findOne({
    guildId: guildId,
    $or: [
      { leaderId: discordId },
      { viceLeaderId: discordId },
      { elderIds: discordId },
      { memberIds: discordId }
    ]
  });
}

module.exports = { getPlayerSect };
