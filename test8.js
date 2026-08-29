const adminPath = require('path').join(__dirname, 'jianghu-bot', 'services', 'admin');
const files = require('fs').readdirSync(adminPath).filter(f => f.endsWith('.js'));
const routeMapValues = [
  'adminAddItem', 'adminEditItem', 'adminDeleteItem', 'adminRemoveItem', 'adminItemSetImage',
  'adminAddPet', 'adminEditPet', 'adminDeletePet', 'adminRemovePet', 'adminPetStats',
  'adminAddAsset', 'adminEditAsset', 'adminDeleteAsset', 'adminRemoveAsset', 'adminAssetSetConstruction',
  'adminAssetFinishConstruction', 'adminAssetSetBuildRequirement', 'adminAssetRemoveBuildRequirement',
  'adminAssetAddRecipe', 'adminAssetRemoveRecipe', 'adminAssetSetWorker', 'adminAssetSetWorkerInput',
  'adminAssetRemoveWorker', 'adminShopAdd', 'adminShopRemove', 'adminEditPlayer', 'adminGiveCurrency',
  'adminGiveItem', 'adminGivePet', 'adminGiveAsset', 'adminFreeze', 'adminUnfreeze', 'adminKill',
  'adminForceUnregister', 'adminForceStopWork', 'adminSetStatus', 'adminChannelAdd', 'adminChannelRemove',
  'adminChannelList', 'adminSekteCreate', 'adminSekteDelete', 'adminSekteAssign', 'adminSekteRemoveMember',
  'adminSekteGiveAsset', 'adminSekteGiveResource', 'adminSekteWar', 'adminTournamentCreate',
  'adminTournamentStart', 'adminTournamentCancel', 'adminTournamentList', 'adminTournamentAddPlayer',
  'adminTournamentRemovePlayer', 'adminTournamentSetWinner', 'adminLelangConfig', 'adminLelangBuat',
  'adminRealmRoleSet', 'adminRealmRoleRemove', 'adminRealmRoleList', 'adminLeaderboardRole',
  'adminSetLog', 'adminSetLogRetention', 'adminClearLogs', 'adminSetRole', 'adminSetWorkerChannel'
];

let isMissing = false;
files.forEach(f => {
  const name = f.replace('.js', '');
  if (!routeMapValues.includes(name) && name !== 'helpAdmin' && name !== 'adminPanel') {
    console.log(`Not in map: ${f}`);
    isMissing = true;
  }
});
if(!isMissing) console.log("All command files mapped");
