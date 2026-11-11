const fs = require('fs');
const path = require('path');
const { checkInvariants } = require('./lib/invariants');

async function runAudit() {
  const rootDir = path.resolve(__dirname, '../../');
  const snapshotPath = path.join(rootDir, 'world-data/npc-ecosystem-snapshot-v27.json');
  const anchorsPath = path.join(rootDir, 'world-data/anchors.json');
  const configPath = path.join(rootDir, 'world-data/npc-population-v28.json');

  if (!fs.existsSync(snapshotPath)) {
    console.error('[AuditNpcWorld] Snapshot file not found:', snapshotPath);
    process.exit(1);
  }

  const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
  const anchors = JSON.parse(fs.readFileSync(anchorsPath, 'utf8'));
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

  console.log(`[AuditNpcWorld] Auditing ${snapshot.npcs.length} NPCs across ${anchors.length} anchors...`);
  const result = checkInvariants({
    npcs: snapshot.npcs,
    families: snapshot.families,
    anchors,
    config
  });

  const outDir = path.join(rootDir, 'review/v28_raw');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const auditPath = path.join(outDir, 'npc_audit.json');
  fs.writeFileSync(auditPath, JSON.stringify(result, null, 2), 'utf8');
  console.log(`[AuditNpcWorld] Results saved to ${auditPath}`);
  console.log(`[AuditNpcWorld] Stats:`, result.stats);

  if (result.violations.length > 0) {
    console.error(`[AuditNpcWorld] FAILED: ${result.violations.length} violations detected!`);
    result.violations.slice(0, 10).forEach((v, idx) => {
      console.error(`  ${idx + 1}. [${v.code}] ${v.message}`);
    });
    process.exit(1);
  } else {
    console.log(`[AuditNpcWorld] PASSED: 0 violations! All invariants V1-V19 satisfied.`);
    process.exit(0);
  }
}

if (require.main === module) {
  runAudit().catch(err => {
    console.error('[AuditNpcWorld] Unhandled exception:', err);
    process.exit(1);
  });
}

module.exports = { runAudit };
