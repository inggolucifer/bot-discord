/**
 * Master Seeder & Snapshot Generator for Living NPC Ecosystem (V28 / B1)
 * Populates world anchors strictly matching residentsPerType and V1-V14 invariants.
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const { generateDeterministicNpc } = require('../../services/npcGenerator');
const { generateFamilyClan } = require('../../services/npcFamilyEngine');
const { isTileWalkable } = require('../v28/lib/invariants');
const { makeRng } = require('../../utils/npcRng');

const rootDir = path.resolve(__dirname, '../../');
const worldDataDir = path.join(rootDir, 'world-data');

function findWalkableTileNear(anchorX, anchorY, usedTiles, rng) {
  for (let r = 2; r <= 10; r++) {
    const candidates = [];
    for (let dx = -r; dx <= r; dx++) {
      for (let dy = -r; dy <= r; dy++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) === r) {
          const x = anchorX + dx;
          const y = anchorY + dy;
          const key = `${x},${y}`;
          if (!usedTiles.has(key) && isTileWalkable(x, y)) {
            candidates.push({ x, y, key });
          }
        }
      }
    }
    if (candidates.length > 0) {
      const idx = Math.floor(rng() * candidates.length);
      const picked = candidates[idx];
      usedTiles.add(picked.key);
      return { tileX: picked.x, tileY: picked.y };
    }
  }

  // Fallback search up to radius 20
  for (let r = 11; r <= 20; r++) {
    for (let dx = -r; dx <= r; dx++) {
      for (let dy = -r; dy <= r; dy++) {
        const x = anchorX + dx;
        const y = anchorY + dy;
        const key = `${x},${y}`;
        if (!usedTiles.has(key) && isTileWalkable(x, y)) {
          usedTiles.add(key);
          return { tileX: x, tileY: y };
        }
      }
    }
  }

  throw new Error(`Cannot find walkable tile near anchor (${anchorX}, ${anchorY})`);
}

function getRealmForNpc(baseRealm, rng, isLeader = false) {
  if (isLeader) {
    const boost = rng() < 0.5 ? 1 : 2;
    return Math.max(0, Math.min(8, baseRealm + boost));
  }
  const roll = rng();
  let offset = 0;
  if (roll < 0.60) offset = 0;
  else if (roll < 0.85) offset = 1;
  else if (roll < 0.90) offset = 2;
  else offset = -1;
  return Math.max(0, Math.min(8, baseRealm + offset));
}

function buildEcosystemDataset(options = {}) {
  const anchors = JSON.parse(fs.readFileSync(path.join(worldDataDir, 'anchors.json'), 'utf-8'));
  const popConfig = JSON.parse(fs.readFileSync(path.join(worldDataDir, 'npc-population-v28.json'), 'utf-8'));
  const facilitiesData = JSON.parse(fs.readFileSync(path.join(worldDataDir, 'settlement-facilities-v20.json'), 'utf-8'));
  const regionLadder = JSON.parse(fs.readFileSync(path.join(worldDataDir, 'region-ladder-v23.json'), 'utf-8'));
  const essentialNames = JSON.parse(fs.readFileSync(path.join(worldDataDir, 'npc-essential-v27.json'), 'utf-8'));

  const rng = makeRng(options.seed || 'jianghu_v28_seed_master');

  const allNpcs = [];
  const allFamilies = [];
  const usedTiles = new Set();
  const usedNames = new Set();

  // Essential story characters mapping
  const ESSENTIAL_MAPPINGS = [
    { name: 'Zhou Haotian', anchorId: 'tianjing', role: 'sect_leader', title: 'Grandmaster Tianjing', targetStage: 9 },
    { name: 'Murong Xue', anchorId: 'kota_canghai', role: 'cultivator', title: 'Nona Muda Klan Murong', targetStage: 5 },
    { name: 'Nangong Lie', anchorId: 'pulau_penyu_raksasa', role: 'cultivator', title: 'Pendekar Pedang Penyu', targetStage: 6 },
    { name: 'Duanmu Wan', anchorId: 'sekte_awan_pedang', role: 'sect_disciple', title: 'Murid Inti Awan Pedang', targetStage: 4 },
    { name: 'Ouyang Tie', anchorId: 'kota_leiyin', role: 'blacksmith', title: 'Empu Tempa Ouyang', targetStage: 7 },
    { name: 'Baili Ming', anchorId: 'pos_perbatasan_qinghe', role: 'guard', title: 'Kapten Penjaga Perbatasan', targetStage: 6 },
    { name: 'Sima Feng', anchorId: 'kota_jinling', role: 'cultivator', title: 'Sarjana Angin Sima', targetStage: 5 },
    { name: 'Zhao Ling', anchorId: 'xitong_city', role: 'cultivator', title: 'Pendekar Bebas XiTong', targetStage: 4 },
    { name: 'Xi Hua', anchorId: 'sekte_pedang_langit', role: 'sect_leader', title: 'Tetua Pedang Langit', targetStage: 8 },
    { name: 'Lin Xuan', anchorId: 'desa_xingcun', role: 'cultivator', title: 'Tetua Desa Xingcun', targetStage: 6 },
    { name: 'Feng Wuchen', anchorId: 'kota_fengyang', role: 'cultivator', title: 'Pendekar Angin Fengyang', targetStage: 5 },
    { name: 'Ye Chen', anchorId: 'luoyang_kecil', role: 'cultivator', title: 'Pangeran Pedang Luoyang', targetStage: 7 },
    { name: 'Chu Tianhe', anchorId: 'kuil_lonceng_emas', role: 'sect_leader', title: 'Biksu Kepala Lonceng Emas', targetStage: 8 },
    { name: 'Shangguan Feiyan', anchorId: 'kota_yunxi', role: 'cultivator', title: 'Pendekar Bayangan Yunxi', targetStage: 5 }
  ];

  // 4 Fallback Backup NPCs (isEssential: false)
  const BACKUP_FALLBACKS = [
    { name: 'Shuang Ke', anchorId: 'sekte_awan_pedang', role: 'cultivator', title: 'Pendekar Pedang Bayangan', targetStage: 5 },
    { name: 'Wu Binglin', anchorId: 'desa_xingcun', role: 'alchemist', title: 'Saudagar Herba Gunung', targetStage: 4 },
    { name: 'Yin Ci', anchorId: 'xitong_city', role: 'cultivator', title: 'Penjaga Paviliun Kitab', targetStage: 6 },
    { name: 'Li Keke', anchorId: 'desa_bamboo_grove', role: 'alchemist', title: 'Murid Alkimia Bunga Persik', targetStage: 4 }
  ];

  // 8 Major Clans
  const MAJOR_CLANS = [
    { surname: 'Murong', anchorId: 'kota_canghai', size: 4 },
    { surname: 'Ouyang', anchorId: 'kota_leiyin', size: 4 },
    { surname: 'Sima', anchorId: 'kota_jinling', size: 4 },
    { surname: 'Dugu', anchorId: 'kota_canghai', size: 3 },
    { surname: 'Nangong', anchorId: 'pulau_penyu_raksasa', size: 3 },
    { surname: 'Shangguan', anchorId: 'kota_yunxi', size: 3 },
    { surname: 'Zhuge', anchorId: 'desa_heiyan', size: 3 },
    { surname: 'Baili', anchorId: 'pos_perbatasan_qinghe', size: 3 }
  ];

  const anchorNpcQueue = new Map();
  anchors.forEach(a => anchorNpcQueue.set(a.id, []));

  // 1. Assign Essential Story NPCs
  for (const ess of ESSENTIAL_MAPPINGS) {
    const targetAnchor = anchors.find(a => a.id === ess.anchorId) || anchors[0];
    const regTier = regionLadder.regions[targetAnchor.region]?.tier ?? 1;
    const baseRealm = Math.max(0, regTier - 1);
    const realmIndex = getRealmForNpc(baseRealm, rng, ess.role === 'sect_leader');

    const npcDoc = generateDeterministicNpc({
      name: ess.name,
      role: ess.role,
      title: ess.title,
      anchorId: targetAnchor.id,
      settlementName: targetAnchor.name,
      regionSlug: targetAnchor.region || 'central_plains',
      targetRealmIndex: realmIndex,
      targetStage: ess.targetStage || 5,
      isEssential: true,
      essentialRole: '',
      zoneId: 'tianyuan_world_map'
    }, `seed_essential_${ess.name}`);

    npcDoc._id = new mongoose.Types.ObjectId();
    usedNames.add(npcDoc.name);
    anchorNpcQueue.get(targetAnchor.id).push(npcDoc);
  }

  // 2. Assign Backup Fallback NPCs
  for (const fb of BACKUP_FALLBACKS) {
    const targetAnchor = anchors.find(a => a.id === fb.anchorId) || anchors[0];
    const regTier = regionLadder.regions[targetAnchor.region]?.tier ?? 1;
    const baseRealm = Math.max(0, regTier - 1);
    const realmIndex = getRealmForNpc(baseRealm, rng, false);

    const npcDoc = generateDeterministicNpc({
      name: fb.name,
      role: fb.role,
      title: fb.title,
      anchorId: targetAnchor.id,
      settlementName: targetAnchor.name,
      regionSlug: targetAnchor.region || 'central_plains',
      targetRealmIndex: realmIndex,
      targetStage: fb.targetStage || 4,
      isEssential: false,
      essentialRole: fb.role,
      zoneId: 'tianyuan_world_map'
    }, `seed_fallback_${fb.name}`);

    npcDoc._id = new mongoose.Types.ObjectId();
    usedNames.add(npcDoc.name);
    anchorNpcQueue.get(targetAnchor.id).push(npcDoc);
  }

  // 3. Generate Major Clans
  for (let cIdx = 0; cIdx < MAJOR_CLANS.length; cIdx++) {
    const clanConfig = MAJOR_CLANS[cIdx];
    const targetAnchor = anchors.find(a => a.id === clanConfig.anchorId) || anchors[0];
    const regTier = regionLadder.regions[targetAnchor.region]?.tier ?? 1;
    const baseRealm = Math.max(0, regTier - 1);

    const clanData = generateFamilyClan({
      clanSurname: clanConfig.surname,
      anchorId: targetAnchor.id,
      settlementName: targetAnchor.name,
      regionSlug: targetAnchor.region || 'central_plains',
      size: clanConfig.size,
      seed: `clan_seed_${clanConfig.surname}_${cIdx}`
    });

    allFamilies.push(clanData.familyDoc);
    for (const memberDoc of clanData.npcDocs) {
      // Fix name collisions if any
      let uniqueName = memberDoc.name;
      let counter = 1;
      while (usedNames.has(uniqueName)) {
        uniqueName = `${memberDoc.name} ${counter++}`;
      }
      memberDoc.name = uniqueName;
      usedNames.add(uniqueName);

      // Align realm to region tier
      memberDoc.cultivation.realmIndex = getRealmForNpc(baseRealm, rng, false);
      memberDoc.vitalStatus.isEssential = false;
      memberDoc.vitalStatus.essentialRole = '';
      memberDoc.zoneId = 'tianyuan_world_map';

      anchorNpcQueue.get(targetAnchor.id).push(memberDoc);
    }
  }

  // 4. Fill anchor populations strictly up to residentsPerType quota
  const rolesListCity = ['cultivator', 'guard', 'merchant', 'artisan', 'scholar'];
  const rolesListSect = ['sect_disciple', 'sect_elder', 'cultivator', 'guard'];

  for (let aIdx = 0; aIdx < anchors.length; aIdx++) {
    const anchor = anchors[aIdx];
    const quota = popConfig.residentsPerType[anchor.type] || 0;
    if (quota <= 0) continue; // Skip secret_realm, danger_zone

    const regTier = regionLadder.regions[anchor.region]?.tier ?? 1;
    const baseRealm = Math.max(0, regTier - 1);

    const profKey = anchor.v20?.facilitiesProfile || (anchor.type === 'capital_city' ? 'capital' : anchor.type);
    const facilities = facilitiesData.profiles[profKey]?.facilities || [];

    const existingQueue = anchorNpcQueue.get(anchor.id) || [];

    // Ensure core roles if facilities present and not already added
    const neededCoreRoles = [];
    if ((facilities.includes('inn') || facilities.includes('tavern')) && !existingQueue.some(n => n.vitalStatus?.essentialRole === 'innkeeper')) {
      neededCoreRoles.push({ role: 'innkeeper', facility: 'inn' });
    }
    if (facilities.includes('workshop') && !existingQueue.some(n => n.vitalStatus?.essentialRole === 'blacksmith')) {
      neededCoreRoles.push({ role: 'blacksmith', facility: 'workshop' });
    }
    if (facilities.includes('market') && !existingQueue.some(n => n.vitalStatus?.essentialRole === 'alchemist')) {
      neededCoreRoles.push({ role: 'alchemist', facility: 'market' });
    }

    for (const cr of neededCoreRoles) {
      if (existingQueue.length >= quota) break;
      let seedCounter = 0;
      let doc;
      do {
        doc = generateDeterministicNpc({
          role: cr.role,
          anchorId: anchor.id,
          facility: cr.facility,
          settlementName: anchor.name,
          regionSlug: anchor.region || 'central_plains',
          targetRealmIndex: getRealmForNpc(baseRealm, rng, false),
          targetStage: 3 + (seedCounter % 4),
          isEssential: false,
          essentialRole: cr.role,
          zoneId: 'tianyuan_world_map'
        }, `core_${anchor.id}_${cr.role}_${seedCounter++}`);
      } while (usedNames.has(doc.name));

      doc._id = new mongoose.Types.ObjectId();
      usedNames.add(doc.name);
      existingQueue.push(doc);
    }

    // Fill remaining residents to reach quota exactly
    let fillIndex = 0;
    while (existingQueue.length < quota) {
      const isSect = anchor.type === 'sect';
      const rolePool = isSect ? rolesListSect : rolesListCity;
      const role = rolePool[fillIndex % rolePool.length];

      let seedCounter = fillIndex;
      let doc;
      do {
        doc = generateDeterministicNpc({
          role,
          anchorId: anchor.id,
          facility: isSect ? 'sect_hall' : (role === 'guard' ? 'gate' : 'residences'),
          settlementName: anchor.name,
          regionSlug: anchor.region || 'central_plains',
          targetRealmIndex: getRealmForNpc(baseRealm, rng, role === 'sect_elder'),
          targetStage: 2 + (fillIndex % 6),
          isEssential: false,
          essentialRole: '',
          zoneId: 'tianyuan_world_map'
        }, `resident_${anchor.id}_${fillIndex}_${seedCounter++}`);
      } while (usedNames.has(doc.name));

      doc._id = new mongoose.Types.ObjectId();
      usedNames.add(doc.name);
      existingQueue.push(doc);
      fillIndex++;
    }

    // If existingQueue exceeded quota (e.g. clan + story), slice to quota while preserving story NPCs
    let finalAnchorNpcs = existingQueue;
    if (finalAnchorNpcs.length > quota) {
      const storyNpcs = finalAnchorNpcs.filter(n => n.vitalStatus?.isEssential);
      const otherNpcs = finalAnchorNpcs.filter(n => !n.vitalStatus?.isEssential);
      finalAnchorNpcs = [...storyNpcs, ...otherNpcs.slice(0, quota - storyNpcs.length)];
    }

    // 5. Place each NPC at a unique walkable tile near anchor
    for (const npc of finalAnchorNpcs) {
      const { tileX, tileY } = findWalkableTileNear(anchor.x || 2455, anchor.y || 2485, usedTiles, rng);
      npc.tileX = tileX;
      npc.tileY = tileY;
      npc.zoneId = 'tianyuan_world_map';
      npc.guildId = 'global';

      if (!npc.schedule) npc.schedule = {};
      npc.schedule.currentAnchorId = anchor.id;
      npc.schedule.homeAnchorId = anchor.id;
      npc.schedule.tileX = tileX;
      npc.schedule.tileY = tileY;
      npc.schedule.activityState = 'idle';
      npc.schedule.targetDestination = null;

      // Ensure essential flag matches official list
      npc.vitalStatus.isEssential = essentialNames.includes(npc.name);
      npc.vitalStatus.isAlive = true;
      npc.vitalStatus.isInjured = false;
      npc.vitalStatus.injurySeverity = 0;
      npc.vitalStatus.downedUntil = null;

      // Ensure age <= maxAge
      if (npc.lifespan.currentAge > npc.lifespan.maxAge) {
        npc.lifespan.currentAge = Math.min(npc.lifespan.maxAge - 5, Math.max(18, Math.floor(npc.lifespan.maxAge * 0.4)));
      }

      allNpcs.push(npc);
    }
  }

  return {
    anchorsCount: anchors.length,
    npcs: allNpcs,
    families: allFamilies
  };
}

async function seedNpcLivingEcosystem(options = {}) {
  const snapshotPath = path.join(worldDataDir, 'npc-ecosystem-snapshot-v27.json');
  const forceRegenerate = process.argv.includes('--regenerate') || options.regenerate === true;

  let dataset;
  if (fs.existsSync(snapshotPath) && !forceRegenerate) {
    console.log(`[SeedNpc] Loading existing snapshot from ${snapshotPath}...`);
    dataset = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
  } else {
    console.log(`[SeedNpc] Generating new deterministic ecosystem dataset...`);
    dataset = buildEcosystemDataset();
    fs.writeFileSync(snapshotPath, JSON.stringify(dataset, null, 2), 'utf-8');
    console.log(`[SeedNpc] Snapshot saved to ${snapshotPath} (${dataset.npcs.length} NPCs, ${dataset.families.length} families).`);
  }

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri && !options.db) {
    console.log(`[SeedNpc] No MONGODB_URI provided. Snapshot verified on disk.`);
    return dataset;
  }

  console.log(`[SeedNpc] Connecting to MongoDB to upsert NPC ecosystem...`);
  const shouldDisconnect = !mongoose.connection || mongoose.connection.readyState !== 1;
  if (shouldDisconnect && mongoUri) {
    await mongoose.connect(mongoUri);
  }

  const Npc = require('../../models/Npc');
  const NpcFamily = require('../../models/NpcFamily');

  const npcOps = dataset.npcs.map(npc => {
    const { _id, ...rest } = npc;
    return {
      updateOne: {
        filter: { _id: new mongoose.Types.ObjectId(_id) },
        update: { $set: rest },
        upsert: true
      }
    };
  });

  const familyOps = dataset.families.map(fam => {
    const { _id, ...rest } = fam;
    return {
      updateOne: {
        filter: { _id: new mongoose.Types.ObjectId(_id) },
        update: { $set: rest },
        upsert: true
      }
    };
  });

  if (npcOps.length > 0) {
    const res = await Npc.bulkWrite(npcOps);
    console.log(`[SeedNpc] NPC bulkWrite complete: ${res.upsertedCount} inserted, ${res.modifiedCount} modified.`);
  }

  if (familyOps.length > 0) {
    const resFam = await NpcFamily.bulkWrite(familyOps);
    console.log(`[SeedNpc] Family bulkWrite complete: ${resFam.upsertedCount} inserted, ${resFam.modifiedCount} modified.`);
  }

  if (shouldDisconnect && mongoUri) {
    await mongoose.disconnect();
  }

  return dataset;
}

if (require.main === module) {
  seedNpcLivingEcosystem()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('[SeedNpc] Fatal error:', err);
      process.exit(1);
    });
}

module.exports = {
  buildEcosystemDataset,
  seedNpcLivingEcosystem,
  findWalkableTileNear
};
