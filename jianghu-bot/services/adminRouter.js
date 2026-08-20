const fs = require('fs');
const path = require('path');

const services = {};
const adminPath = path.join(__dirname, 'admin');
const files = fs.readdirSync(adminPath).filter(f => f.endsWith('.js'));

// Explicitly map combinations of group + subcommand to the corresponding service file
const routeMap = {
  // ITEM
  'itemadd': 'adminAddItem',
  'itemedit': 'adminEditItem',
  'itemdelete': 'adminDeleteItem',
  'itemremove': 'adminRemoveItem',
  'itemsetimage': 'adminItemSetImage',

  // PET
  'petadd': 'adminAddPet',
  'petedit': 'adminEditPet',
  'petdelete': 'adminDeletePet',
  'petremove': 'adminRemovePet',
  'petstats': 'adminPetStats',

  // ASSET
  'assetadd': 'adminAddAsset',
  'assetedit': 'adminEditAsset',
  'assetdelete': 'adminDeleteAsset',
  'assetremove': 'adminRemoveAsset',
  'assetsetconstruction': 'adminAssetSetConstruction',
  'assetfinishconstruction': 'adminAssetFinishConstruction',
  'assetsetbuildrequirement': 'adminAssetSetBuildRequirement',
  'assetremovebuildrequirement': 'adminAssetRemoveBuildRequirement',
  'assetaddrecipe': 'adminAssetAddRecipe',
  'assetremoverecipe': 'adminAssetRemoveRecipe',
  'assetsetworker': 'adminAssetSetWorker',
  'assetremoveworker': 'adminAssetRemoveWorker',

  // SHOP
  'shopadd': 'adminShopAdd',
  'shopremove': 'adminShopRemove',

  // PLAYER
  'playeredit': 'adminEditPlayer',
  'playergivecurrency': 'adminGiveCurrency',
  'playergiveitem': 'adminGiveItem',
  'playergivepet': 'adminGivePet',
  'playergiveasset': 'adminGiveAsset',
  'playerfreeze': 'adminFreeze',
  'playerunfreeze': 'adminUnfreeze',
  'playerkill': 'adminKill',
  'playerforceunregister': 'adminForceUnregister',
  'playersetstatus': 'adminSetStatus',

  // CHANNEL
  'channeladd': 'adminChannelAdd',
  'channelremove': 'adminChannelRemove',
  'channellist': 'adminChannelList',

  // SEKTE
  'sektecreate': 'adminSekteCreate',
  'sektedelete': 'adminSekteDelete',
  'sekteassign': 'adminSekteAssign',
  'sekteremovemember': 'adminSekteRemoveMember',
  'sektegiveasset': 'adminSekteGiveAsset',
  'sektegiveresource': 'adminSekteGiveResource',
  'sektewar': 'adminSekteWar',

  // TOURNAMENT
  'tournamentcreate': 'adminTournamentCreate',
  'tournamentstart': 'adminTournamentStart',
  'tournamentcancel': 'adminTournamentCancel',
  'tournamentlist': 'adminTournamentList',
  'tournamentaddplayer': 'adminTournamentAddPlayer',
  'tournamentremoveplayer': 'adminTournamentRemovePlayer',
  'tournamentsetwinner': 'adminTournamentSetWinner',

  // LELANG
  'lelangconfig': 'adminLelangConfig',
  'lelangbuat': 'adminLelangBuat',

  // NO GROUP
  'realmroleset': 'adminRealmRoleSet',
  'realmroleremove': 'adminRealmRoleRemove',
  'realmrolelist': 'adminRealmRoleList',
  'leaderboardrole': 'adminLeaderboardRole',
  'setlog': 'adminSetLog',
  'setlogretention': 'adminSetLogRetention',
  'clearlogs': 'adminClearLogs',
  'setrole': 'adminSetRole',
  'setworkerchannel': 'adminSetWorkerChannel',
};

// Load all mapped files
for (const [key, filename] of Object.entries(routeMap)) {
  const filePath = path.join(adminPath, `${filename}.js`);
  if (fs.existsSync(filePath)) {
    services[key] = require(filePath);
  }
}

module.exports = {
  async autocomplete(interaction) {
    const group = interaction.options.getSubcommandGroup(false);
    const sub = interaction.options.getSubcommand();

    let key = group ? `${group}${sub.replace(/-/g, '')}`.toLowerCase() : sub.replace(/-/g, '').toLowerCase();
    const target = services[key];

    if (target && target.autocomplete) {
      return target.autocomplete(interaction);
    }
  },

  async execute(interaction) {
    const group = interaction.options.getSubcommandGroup(false);
    const sub = interaction.options.getSubcommand();

    let key = group ? `${group}${sub.replace(/-/g, '')}`.toLowerCase() : sub.replace(/-/g, '').toLowerCase();
    const target = services[key];

    if (target && target.execute) {
      return target.execute(interaction);
    } else {
        if(sub === 'help-admin' || sub === 'help') {
            const help = require('./admin/helpAdmin');
            return help.execute(interaction);
        }
        await interaction.deferReply({ ephemeral: true }).catch(() => {});
        return interaction.editReply({ content: `❌ Command admin \`${group ? group + ' ' : ''}${sub}\` tidak ditemukan atau belum diimplementasi (router error).` });
    }
  }
};
