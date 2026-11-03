const fs = require('fs');
const path = require('path');

const BOT_ROOT = path.resolve(__dirname, '../..');
const ANCHORS_PATH = path.join(BOT_ROOT, 'world-data/anchors.json');
const AUTHORED_PATH = path.join(BOT_ROOT, 'world-data/authored-props.json');
const BACKUP_PATH = path.join(BOT_ROOT, 'docs/v20/removed-authored.json');

console.log('[MIGRATE-HOUSES] Memulai migrasi rumah authored ke residences...');

const anchors = JSON.parse(fs.readFileSync(ANCHORS_PATH, 'utf8'));
const authored = JSON.parse(fs.readFileSync(AUTHORED_PATH, 'utf8'));

// Build lookup of anchors
const anchorMap = new Map();
for (const a of anchors) {
  anchorMap.set(a.id, a);
  if (!a.v20) a.v20 = {};
  if (!a.v20.residences) a.v20.residences = [];
}

const remainingProps = [];
const removedProps = [];
let migratedHouseCount = 0;
let removedPropCount = 0;
let removedLandmarkCount = 0;

for (const p of authored.props) {
  const aid = p.anchorId;
  const isSettlementAnchor = anchorMap.has(aid);

  if (p.kind === 'house' && isSettlementAnchor) {
    const a = anchorMap.get(aid);
    // Check if residence already exists for this prop (idempotency)
    const exists = a.v20.residences.some(r => r.fromAuthoredId === p.id);
    if (!exists) {
      const cleanId = p.id.replace(/^auth_/, '');
      const homeKind = p.defId.replace(/^hut_/, '').replace(/_(day|dusk)$/, '');
      a.v20.residences.push({
        id: `res_${aid}_${cleanId}`,
        fromAuthoredId: p.id,
        npcId: `npc_${aid}_${cleanId}`,
        homeKind,
        label: p.label || `Pondok ${homeKind}`
      });
    }
    migratedHouseCount++;
    removedProps.push({ ...p, reason: 'migrated_to_residences' });
  } else if (p.kind === 'prop' && isSettlementAnchor) {
    removedPropCount++;
    removedProps.push({ ...p, reason: 'settlement_prop_cleanup' });
  } else if (p.kind === 'landmark' && isSettlementAnchor) {
    removedLandmarkCount++;
    removedProps.push({ ...p, reason: 'settlement_landmark_cleanup' });
  } else {
    // Keep bridges and wilderness props
    remainingProps.push(p);
  }
}

console.log(`[MIGRATE-HOUSES] Hasil migrasi:
  - Rumah dimigrasi ke residences: ${migratedHouseCount}
  - Prop pemukiman dibersihkan: ${removedPropCount}
  - Landmark pemukiman dibersihkan: ${removedLandmarkCount}
  - Sisa objek di authored-props: ${remainingProps.length}`);

// Write backup if newly removed props exist, or if backup doesn't exist
if (removedProps.length > 0 || !fs.existsSync(BACKUP_PATH)) {
  fs.writeFileSync(BACKUP_PATH, JSON.stringify(removedProps, null, 2), 'utf8');
  console.log(`[MIGRATE-HOUSES] Cadangan objek terhapus ditulis ke docs/v20/removed-authored.json`);
} else {
  console.log(`[MIGRATE-HOUSES] Cadangan objek terhapus sudah ada di docs/v20/removed-authored.json, tidak ditimpa.`);
}

// Write updated anchors.json
fs.writeFileSync(ANCHORS_PATH, JSON.stringify(anchors, null, 2), 'utf8');
console.log(`[MIGRATE-HOUSES] anchors.json berhasil diperbarui.`);

// Write updated authored-props.json
authored.props = remainingProps;
fs.writeFileSync(AUTHORED_PATH, JSON.stringify(authored, null, 2), 'utf8');
console.log(`[MIGRATE-HOUSES] authored-props.json berhasil diperbarui.`);
