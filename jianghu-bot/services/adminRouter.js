const fs = require('fs');
const path = require('path');
const { MessageFlags } = require('discord.js');
const Law = require('../models/Law');
const Manual = require('../models/Manual');


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
  'assetsetworkerinput': 'adminAssetSetWorkerInput',
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
  'playerforcestopwork': 'adminForceStopWork',
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
  // LAW
  'lawcreate': 'handleCreateLaw',
  'lawlist': 'handleListLaw',
  // MANUAL
  'manualcreate': 'handleCreateManual',
  'manuallist': 'handleListManual',

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
    const sub = interaction.options.getSubcommand(false);
    if (!sub) return;


    let key = group ? `${group}${sub.replace(/-/g, '')}`.toLowerCase() : sub.replace(/-/g, '').toLowerCase();

    // Inline handlers for Law and Manual
    if (key === 'lawcreate' || key === 'lawlist' || key === 'manualcreate' || key === 'manuallist') {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral }).catch(() => {});
        if (key === 'lawcreate') return handleCreateLaw(interaction);
        if (key === 'lawlist') return handleListLaw(interaction);
        if (key === 'manualcreate') return handleCreateManual(interaction);
        if (key === 'manuallist') return handleListManual(interaction);
    }

    const target = services[key];

    if (target && target.autocomplete) {
      return target.autocomplete(interaction);
    }
  },

  async execute(interaction) {
    const group = interaction.options.getSubcommandGroup(false);
    const sub = interaction.options.getSubcommand(false);
    if (!sub) return;

    let key = group ? `${group}${sub.replace(/-/g, '')}`.toLowerCase() : sub.replace(/-/g, '').toLowerCase();
    const target = services[key];

    if (target && target.execute) {
      return target.execute(interaction);
    } else {
        if(sub === 'help-admin' || sub === 'help') {
            const help = require('./admin/helpAdmin');
            return help.execute(interaction);
        }

        // Inline handlers logic checking in execute
        if (key === 'lawcreate' || key === 'lawlist' || key === 'manualcreate' || key === 'manuallist') {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral }).catch(() => {});
            if (key === 'lawcreate') return await handleCreateLaw(interaction);
            if (key === 'lawlist') return await handleListLaw(interaction);
            if (key === 'manualcreate') return await handleCreateManual(interaction);
            if (key === 'manuallist') return await handleListManual(interaction);
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral }).catch(() => {});
        return interaction.editReply({ content: `❌ Command admin \`${group ? group + ' ' : ''}${sub}\` tidak ditemukan atau belum diimplementasi (router error).` });
    }
  }
};



async function handleCreateLaw(interaction) {
    const name = interaction.options.getString('nama');
    const element = interaction.options.getString('elemen');
    const desc = interaction.options.getString('deskripsi');
    const hpMult = interaction.options.getNumber('hp_mult') || 0;
    const atkMult = interaction.options.getNumber('atk_mult') || 0;
    const hpFlat = interaction.options.getNumber('hp_flat') || 0;
    const atkFlat = interaction.options.getNumber('atk_flat') || 0;

    await Law.create({
        guildId: interaction.guildId,
        name,
        element,
        description: desc,
        multiplierBonus: { hp: hpMult, atk: atkMult, def: 0, spd: 0 },
        flatBonus: { hp: hpFlat, atk: atkFlat, def: 0, spd: 0 },
        createdBy: interaction.user.id
    });
    return interaction.editReply(`✅ Law ${name} berhasil dibuat.`);
}

async function handleListLaw(interaction) {
    const laws = await Law.find({ guildId: interaction.guildId });
    if(laws.length === 0) return interaction.editReply('Kosong');
    let str = 'Laws:\n';
    laws.forEach(l => str += `- ${l.name} (${l.element})\n`);
    return interaction.editReply(str);
}

async function handleCreateManual(interaction) {
    const name = interaction.options.getString('nama');
    const desc = interaction.options.getString('deskripsi');
    const max = interaction.options.getInteger('max_level') || 10;
    const hrs = interaction.options.getInteger('waktu_jam') || 20;
    const cost = interaction.options.getInteger('biaya') || 5;
    const hpFlatLvl = interaction.options.getNumber('hp_flat_lvl') || 0;
    const atkMultLvl = interaction.options.getNumber('atk_mult_lvl') || 0;

    await Manual.create({
        guildId: interaction.guildId,
        name,
        description: desc,
        maxLevel: max,
        timeToComprehendHours: hrs,
        baseCost: cost,
        flatBonusPerLevel: { hp: hpFlatLvl, atk: 0, def: 0, spd: 0 },
        multiplierBonusPerLevel: { hp: 0, atk: atkMultLvl, def: 0, spd: 0 },
        createdBy: interaction.user.id
    });
    return interaction.editReply(`✅ Manual ${name} berhasil dibuat.`);
}

async function handleListManual(interaction) {
    const manuals = await Manual.find({ guildId: interaction.guildId });
    if(manuals.length === 0) return interaction.editReply('Kosong');
    let str = 'Manuals:\n';
    manuals.forEach(m => str += `- ${m.name}\n`);
    return interaction.editReply(str);
}
