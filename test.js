const fs = require('fs');
const path = require('path');

const services = {};
const adminPath = path.join(__dirname, 'jianghu-bot', 'services', 'admin');
const files = fs.readdirSync(adminPath).filter(f => f.endsWith('.js'));

const routeMap = {
  'itemadd': 'adminAddItem',
  'itemedit': 'adminEditItem',
  'itemdelete': 'adminDeleteItem',
  'itemremove': 'adminRemoveItem',
  'itemsetimage': 'adminItemSetImage',
  'petadd': 'adminAddPet',
  'petedit': 'adminEditPet',
  'petdelete': 'adminDeletePet',
  'petremove': 'adminRemovePet',
  'petstats': 'adminPetStats',
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
  'assetsetworkerinput': 'adminAssetSetWorkerInput',
  'assetremoveworker': 'adminAssetRemoveWorker',
  'shopadd': 'adminShopAdd',
  'shopremove': 'adminShopRemove',
  'playeredit': 'adminEditPlayer',
  'playergivecurrency': 'adminGiveCurrency',
  'playergiveitem': 'adminGiveItem',
  'playergivepet': 'adminGivePet',
  'playergiveasset': 'adminGiveAsset',
  'playerfreeze': 'adminFreeze',
  'playerunfreeze': 'adminUnfreeze',
  'playerkill': 'adminKill',
  'playerforceunregister': 'adminForceUnregister',
  'playerforcestopwork': 'adminForceStopWork',
  'playersetstatus': 'adminSetStatus',
  'channeladd': 'adminChannelAdd',
  'channelremove': 'adminChannelRemove',
  'channellist': 'adminChannelList',
  'sektecreate': 'adminSekteCreate',
  'sektedelete': 'adminSekteDelete',
  'sekteassign': 'adminSekteAssign',
  'sekteremovemember': 'adminSekteRemoveMember',
  'sektegiveasset': 'adminSekteGiveAsset',
  'sektegiveresource': 'adminSekteGiveResource',
  'sektewar': 'adminSekteWar',
  'tournamentcreate': 'adminTournamentCreate',
  'tournamentstart': 'adminTournamentStart',
  'tournamentcancel': 'adminTournamentCancel',
  'tournamentlist': 'adminTournamentList',
  'tournamentaddplayer': 'adminTournamentAddPlayer',
  'tournamentremoveplayer': 'adminTournamentRemovePlayer',
  'tournamentsetwinner': 'adminTournamentSetWinner',
  'lelangconfig': 'adminLelangConfig',
  'lelangbuat': 'adminLelangBuat',
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

const missing = [];
for (const [key, filename] of Object.entries(routeMap)) {
  const filePath = path.join(adminPath, `${filename}.js`);
  if (!fs.existsSync(filePath)) {
    missing.push(filename);
  }
}
console.log("Missing files:", missing);
