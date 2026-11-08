/**
 * Master Seeder & Snapshot Generator for Living NPC Ecosystem (V27)
 * Populates all 52 anchors with 3 live core roles and families.
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const { generateDeterministicNpc } = require('../../services/npcGenerator');
const { generateFamilyClan } = require('../../services/npcFamilyEngine');

function buildEcosystemDataset() {
  const worldDataDir = path.resolve(__dirname, '../../world-data');
  const anchors = JSON.parse(fs.readFileSync(path.join(worldDataDir, 'anchors.json'), 'utf-8'));

  const allNpcs = [];
  const allFamilies = [];
  const anchorRoleMap = {};

  const MAJOR_CLANS = [
    { surname: 'Murong', anchorId: 'kota_canghai' },
    { surname: 'Ouyang', anchorId: 'kota_leiyin' },
    { surname: 'Sima', anchorId: 'kota_changan' },
    { surname: 'Dugu', anchorId: 'kota_lingxiao' },
    { surname: 'Nangong', anchorId: 'pulau_penyu_raksasa' },
    { surname: 'Shangguan', anchorId: 'kota_wanxiang' },
    { surname: 'Zhuge', anchorId: 'desa_heiyan' },
    { surname: 'Baili', anchorId: 'pos_lembah_angin' }
  ];

  // 1. Generate Clans for Major Settlements
  for (let i = 0; i < MAJOR_CLANS.length; i++) {
    const clanConfig = MAJOR_CLANS[i];
    const targetAnchor = anchors.find(a => a.id === clanConfig.anchorId) || anchors[0];

    const clanData = generateFamilyClan({
      clanSurname: clanConfig.surname,
      anchorId: targetAnchor.id,
      settlementName: targetAnchor.name,
      regionSlug: targetAnchor.region || 'donghai_coastal_plain',
      size: 4,
      seed: `clan_seed_${clanConfig.surname}_${i}`
    });

    allFamilies.push(clanData.familyDoc);
    for (const memberDoc of clanData.npcDocs) {
      memberDoc.tileX = targetAnchor.x || 2050;
      memberDoc.tileY = targetAnchor.y || 2650;
      allNpcs.push(memberDoc);
    }
  }

  // 2. Populate All 52 Anchors with 3 Core Roles + Residents
  for (let idx = 0; idx < anchors.length; idx++) {
    const anchor = anchors[idx];
    anchorRoleMap[anchor.id] = [];

    // Core 3 Roles: Innkeeper, Blacksmith, Alchemist
    const coreRoles = [
      { role: 'innkeeper', facility: 'inn' },
      { role: 'blacksmith', facility: 'workshop' },
      { role: 'alchemist', facility: 'market' }
    ];

    for (let rIdx = 0; rIdx < coreRoles.length; rIdx++) {
      const cr = coreRoles[rIdx];
      const npcDoc = generateDeterministicNpc({
        role: cr.role,
        anchorId: anchor.id,
        facility: cr.facility,
        settlementName: anchor.name,
        regionSlug: anchor.region || 'central_plains',
        tileX: anchor.x || 2050,
        tileY: anchor.y || 2650,
        targetRealmIndex: 0,
        targetStage: 3 + rIdx,
        isEssential: true,
        essentialRole: cr.role
      }, `anchor_${anchor.id}_core_${cr.role}_${idx}`);

      allNpcs.push(npcDoc);
      anchorRoleMap[anchor.id].push(cr.role);
    }

    // Additional Population based on anchor tier & type
    let extraCount = 1;
    if (anchor.type === 'capital_city') extraCount = 5;
    else if (anchor.type === 'major_city' || anchor.type === 'town') extraCount = 3;
    else if (anchor.type === 'sect') extraCount = 4;
    else if (anchor.type === 'village') extraCount = 1;

    for (let eIdx = 0; eIdx < extraCount; eIdx++) {
      const isSect = anchor.type === 'sect';
      const role = isSect ? 'sect_disciple' : (eIdx % 2 === 0 ? 'cultivator' : 'guard');
      const realm = isSect ? 1 : (eIdx === 0 ? 0 : 1);

      const extraNpc = generateDeterministicNpc({
        role,
        anchorId: anchor.id,
        facility: isSect ? 'sect_hall' : (role === 'guard' ? 'gate' : 'tavern'),
        settlementName: anchor.name,
        regionSlug: anchor.region || 'central_plains',
        tileX: anchor.x || 2050,
        tileY: anchor.y || 2650,
        targetRealmIndex: realm,
        targetStage: 2 + eIdx,
        isEssential: false
      }, `anchor_${anchor.id}_extra_${eIdx}`);

      allNpcs.push(extraNpc);
    }
  }

  return {
    anchorsCount: anchors.length,
    npcs: allNpcs,
    families: allFamilies,
    anchorRoleMap
  };
}

async function seedDatabase() {
  const ecosystem = buildEcosystemDataset();
  const snapshotPath = path.resolve(__dirname, '../../world-data/npc-ecosystem-snapshot-v27.json');

  // Save snapshot file
  fs.writeFileSync(snapshotPath, JSON.stringify(ecosystem, null, 2), 'utf-8');
  console.log(`[V27 Seeder] Snapshot saved to ${snapshotPath}. Total NPCs: ${ecosystem.npcs.length}, Families: ${ecosystem.families.length}`);

  // If running directly with mongo connection
  if (process.env.MONGODB_URI) {
    console.log('[V27 Seeder] Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    const Npc = require('../../models/Npc');
    const NpcFamily = require('../../models/NpcFamily');

    console.log('[V27 Seeder] Upserting NPCs into database...');
    for (const npcData of ecosystem.npcs) {
      await Npc.findOneAndUpdate(
        { name: npcData.name },
        npcData,
        { upsert: true, new: true }
      );
    }

    for (const famData of ecosystem.families) {
      await NpcFamily.findOneAndUpdate(
        { familyName: famData.familyName },
        famData,
        { upsert: true, new: true }
      );
    }
    console.log('[V27 Seeder] Database sync completed successfully!');
    await mongoose.disconnect();
  }

  return ecosystem;
}

if (require.main === module) {
  seedDatabase().catch(err => {
    console.error('[V27 Seeder Error]', err);
    process.exit(1);
  });
}

module.exports = {
  buildEcosystemDataset,
  seedDatabase
};
