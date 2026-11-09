import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('V30 Wander Seed & Invariants (V16-V17)', () => {
  const snapshotPath = path.resolve(__dirname, '../../../world-data/npc-ecosystem-snapshot-v27.json');
  const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
  const npcs = snapshot.npcs || snapshot;

  it('V16: Wanderer percentage should be between 8% and 20%', () => {
    const wanderers = npcs.filter(n => n.schedule && n.schedule.wanderLevel > 0);
    const pct = (wanderers.length / npcs.length) * 100;
    expect(pct).toBeGreaterThanOrEqual(8);
    expect(pct).toBeLessThanOrEqual(20);
  });

  it('V17: Essential NPCs must NEVER wander (wanderLevel === 0 and targetDestination not journey)', () => {
    const essentialWanderers = npcs.filter(n => 
      n.vitalStatus?.isEssential && 
      (n.schedule?.wanderLevel > 0 || n.schedule?.targetDestination?.type === 'journey')
    );
    expect(essentialWanderers).toHaveLength(0);
  });
});
