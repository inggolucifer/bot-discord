const sectAccessConfig = require('../config/sectAccess');

function getPlayerSectRank(sect, discordId) {
    if (!sect) return null;
    return sect.getRoleOf(discordId);
}

function can(rank, permission) {
    if (!rank) return false;
    const permissions = sectAccessConfig.permissions[rank] || [];
    if (permissions.includes('*')) return true;
    return permissions.includes(permission);
}

module.exports = {
    getPlayerSectRank,
    can
};
