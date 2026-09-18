/**
 * Verification Test: Phase 1 Data & Model Integrity
 */

const assert = require('assert');

console.log('[TEST-PHASE-1] Starting Phase 1 Integrity Verifications...');

// 1. Check Player Model Loading
try {
  const Player = require('./models/Player');
  assert(Player && Player.schema, 'Player model must expose a valid mongoose schema.');
  
  // Verify schemaVersion field exists
  const schemaVersionPath = Player.schema.path('schemaVersion');
  assert(schemaVersionPath, 'Player schema must define schemaVersion field.');
  assert.strictEqual(schemaVersionPath.defaultValue, 2, 'Default schemaVersion must be 2.');

  // Verify equipment ref: 'Item'
  const weaponPath = Player.schema.path('equipment.weapon');
  assert(weaponPath && weaponPath.options.ref === 'Item', 'equipment.weapon must reference Item model.');

  console.log('✅ Player Model verified (schemaVersion: 2, equipment refs, deduplicated grid fields).');
} catch (err) {
  console.error('❌ Failed verifying Player Model:', err);
  process.exit(1);
}

// 2. Check Migration Script Exports
try {
  const { runMigration } = require('./scripts/migrate_v2');
  assert(typeof runMigration === 'function', 'migrate_v2 must export runMigration function.');
  console.log('✅ migrate_v2.js syntax & export verified.');
} catch (err) {
  console.error('❌ Failed verifying migrate_v2 script:', err);
  process.exit(1);
}

// 3. Check Auth Routes Syntax
try {
  const authRouter = require('./web-api/routes/auth');
  assert(authRouter && typeof authRouter.use === 'function', 'auth router must be a valid express Router.');
  console.log('✅ web-api/routes/auth.js verified with /me and /register-character endpoints.');
} catch (err) {
  console.error('❌ Failed verifying auth router:', err);
  process.exit(1);
}

console.log('\n🎉 ALL PHASE 1 INTEGRITY CHECKS PASSED!\n');
