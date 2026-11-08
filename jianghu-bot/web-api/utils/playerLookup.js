const Player = require('../../models/Player');

/**
 * Builds a deterministic MongoDB query for identifying a player
 * across JWT tokens containing either discordId (snowflake) or ObjectId.
 * 
 * @param {Object} reqUser - req.user from JWT auth token
 * @returns {Object|null} MongoDB filter object or null if invalid
 */
function getPlayerQuery(reqUser) {
  if (!reqUser || typeof reqUser !== 'object') return null;
  const rawId = reqUser.id || reqUser.userId || reqUser.discordId || reqUser._id;
  if (!rawId) return null;

  const idStr = String(rawId).trim();
  if (!idStr) return null;

  // 24-character hex string can match either MongoDB _id or a discordId
  if (/^[0-9a-fA-F]{24}$/.test(idStr)) {
    return {
      $or: [
        { _id: idStr },
        { discordId: idStr }
      ]
    };
  }

  return { discordId: idStr };
}

/**
 * Loads a Player document securely from database given req.user
 * 
 * @param {Object} reqUser - req.user from JWT auth token
 * @returns {Promise<Object|null>} Player document or null
 */
async function loadPlayer(reqUser) {
  const query = getPlayerQuery(reqUser);
  if (!query) return null;
  return await Player.findOne(query);
}

module.exports = {
  getPlayerQuery,
  loadPlayer
};
