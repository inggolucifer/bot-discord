/**
 * Family Clan & Genealogy Engine for Jianghu Bot V27
 * Directed Acyclic Graph (DAG) family relations. Zero circular parentage.
 */

const mongoose = require('mongoose');
const { makeRng, rangeInt } = require('../utils/npcRng');
const { generateDeterministicNpc } = require('./npcGenerator');

function generateFamilyClan({
  clanSurname = 'Murong',
  anchorId = 'kota_canghai',
  settlementName = 'Kota Canghai',
  regionSlug = 'donghai_coastal_plain',
  size = 4,
  seed = 'clan_seed'
} = {}) {
  const rng = makeRng(seed);
  const familyId = new mongoose.Types.ObjectId();
  const patriarchId = new mongoose.Types.ObjectId();
  const matriarchId = new mongoose.Types.ObjectId();

  const members = [];
  const npcDocs = [];

  // 1. Patriarch (Gen 1)
  const patriarchAge = rangeInt(rng, 45, 65);
  const patriarchDoc = generateDeterministicNpc({
    surname: clanSurname,
    gender: 'male',
    role: 'cultivator',
    title: `Patriark Klan ${clanSurname}`,
    anchorId,
    settlementName,
    regionSlug,
    targetRealmIndex: 1,
    targetStage: rangeInt(rng, 3, 7),
    currentAge: patriarchAge,
    familyId,
    partnerId: matriarchId
  }, `${seed}_patriarch`);

  patriarchDoc._id = patriarchId;
  npcDocs.push(patriarchDoc);
  members.push({ npcId: patriarchId, role: 'patriarch', generation: 1 });

  // 2. Matriarch (Gen 1)
  const matriarchAge = Math.max(38, patriarchAge + rangeInt(rng, -5, 3));
  const matriarchDoc = generateDeterministicNpc({
    gender: 'female',
    role: 'cultivator',
    title: `Nyonya Klan ${clanSurname}`,
    anchorId,
    settlementName,
    regionSlug,
    targetRealmIndex: 1,
    targetStage: rangeInt(rng, 1, 5),
    currentAge: matriarchAge,
    familyId,
    partnerId: patriarchId
  }, `${seed}_matriarch`);

  matriarchDoc._id = matriarchId;
  npcDocs.push(matriarchDoc);
  members.push({ npcId: matriarchId, role: 'spouse', generation: 1 });

  // 3. Children (Gen 2)
  const numChildren = Math.max(1, size - 2);
  const maxChildAge = Math.min(patriarchAge, matriarchAge) - 18; // strictly at least 18 years younger

  for (let i = 0; i < numChildren; i++) {
    const childId = new mongoose.Types.ObjectId();
    const childGender = rng() < 0.5 ? 'male' : 'female';
    const childAge = Math.max(16, rangeInt(rng, 18, Math.max(19, maxChildAge - i * 2)));

    const childDoc = generateDeterministicNpc({
      surname: clanSurname,
      gender: childGender,
      role: 'cultivator',
      title: `Tuan/Nona Muda Klan ${clanSurname}`,
      anchorId,
      settlementName,
      regionSlug,
      targetRealmIndex: 0,
      targetStage: rangeInt(rng, 2, 8),
      currentAge: childAge,
      familyId,
      masterId: patriarchId // Patriarch acts as first martial master
    }, `${seed}_child_${i}`);

    childDoc._id = childId;
    npcDocs.push(childDoc);
    members.push({ npcId: childId, role: 'child', generation: 2 });
  }

  const familyDoc = {
    _id: familyId,
    familyName: `Klan ${clanSurname}`,
    headNpcId: patriarchId,
    members,
    homeAnchorId: anchorId,
    clanPrestige: 100 + members.length * 20
  };

  return {
    familyDoc,
    npcDocs
  };
}

module.exports = {
  generateFamilyClan
};
