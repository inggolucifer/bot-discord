import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import Npc from '../../../models/Npc.js';
import { checkInvariants, isTileWalkable } from '../../../scripts/v28/lib/invariants.js';
import { findWalkableTileNear } from '../../../scripts/v27/seedNpcLivingEcosystem.js';
import { ensureNpcWorld } from '../../../services/npcBootstrap.js';
import { makeRng } from '../../../utils/npcRng.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../../');

describe('NPC World Seed & Invariants V1-V14 (V28 / B1)', () => {
  const snapshotPath = path.join(rootDir, 'world-data/npc-ecosystem-snapshot-v27.json');
  const anchorsPath = path.join(rootDir, 'world-data/anchors.json');
  const configPath = path.join(rootDir, 'world-data/npc-population-v28.json');
  const essentialPath = path.join(rootDir, 'world-data/npc-essential-v27.json');

  const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
  const anchors = JSON.parse(fs.readFileSync(anchorsPath, 'utf8'));
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const essentialNames = JSON.parse(fs.readFileSync(essentialPath, 'utf8'));

  const invariantResult = checkInvariants({
    npcs: snapshot.npcs,
    families: snapshot.families,
    anchors,
    config
  });

  it('1. loads npc-population-v28.json config with required anchor quotas', () => {
    expect(config.residentsPerType).toBeDefined();
    expect(config.residentsPerType.hamlet).toBe(4);
    expect(config.residentsPerType.village).toBe(8);
    expect(config.residentsPerType.town).toBe(16);
    expect(config.residentsPerType.major_city).toBe(40);
    expect(config.residentsPerType.capital_city).toBe(80);
    expect(config.residentsPerType.sect).toBe(30);
    expect(config.residentsPerType.secret_realm).toBe(0);
    expect(config.residentsPerType.danger_zone).toBe(0);
  });

  it('2. runs checkInvariants with 0 violations', () => {
    expect(invariantResult.violations).toEqual([]);
  });

  it('3. [V1] all essential story NPCs exist in ecosystem', () => {
    expect(essentialNames.length).toBeGreaterThanOrEqual(14);
    for (const name of essentialNames) {
      const found = snapshot.npcs.find(n => n.name === name);
      expect(found).toBeDefined();
    }
  });

  it('4. [V1] all essential story NPCs are alive', () => {
    for (const name of essentialNames) {
      const found = snapshot.npcs.find(n => n.name === name);
      expect(found.vitalStatus?.isAlive).toBe(true);
    }
  });

  it('5. [V1] all essential story NPCs are marked isEssential: true', () => {
    for (const name of essentialNames) {
      const found = snapshot.npcs.find(n => n.name === name);
      expect(found.vitalStatus?.isEssential).toBe(true);
    }
  });

  it('6. [V2] exactly all listed NPCs have isEssential: true (no other NPC is marked essential)', () => {
    const essentials = snapshot.npcs.filter(n => n.vitalStatus?.isEssential);
    expect(essentials.length).toBe(essentialNames.length);
    for (const ess of essentials) {
      expect(essentialNames).toContain(ess.name);
    }
  });

  it('7. [V3] all NPC names are strictly unique across entire ecosystem', () => {
    const names = snapshot.npcs.map(n => n.name);
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(snapshot.npcs.length);
  });

  it('8. [V4] every NPC satisfies currentAge <= maxAge', () => {
    for (const npc of snapshot.npcs) {
      expect(npc.lifespan.currentAge).toBeLessThanOrEqual(npc.lifespan.maxAge);
      expect(npc.lifespan.currentAge).toBeGreaterThanOrEqual(18);
    }
  });

  it('9. [V5] zero spatial collisions: no two live NPCs share the same tile', () => {
    const locations = snapshot.npcs.map(n => `${n.tileX},${n.tileY}`);
    const uniqueLocations = new Set(locations);
    expect(uniqueLocations.size).toBe(snapshot.npcs.length);
  });

  it('10. [V6] all NPC coordinates are on walkable tiles', () => {
    for (const npc of snapshot.npcs) {
      const walkable = isTileWalkable(npc.tileX, npc.tileY);
      expect(walkable).toBe(true);
    }
  });

  it('11. [V7] top-level tileX/tileY strictly matches schedule.tileX/tileY', () => {
    for (const npc of snapshot.npcs) {
      expect(npc.tileX).toBe(npc.schedule.tileX);
      expect(npc.tileY).toBe(npc.schedule.tileY);
    }
  });

  it('12. [V7] no NPC is placed at (0, 0)', () => {
    for (const npc of snapshot.npcs) {
      expect(npc.tileX).not.toBe(0);
      expect(npc.tileY).not.toBe(0);
    }
  });

  it('13. [V8] cultivation realm is clamped within [base-1, base+3] of region tier', () => {
    const regionLadder = JSON.parse(fs.readFileSync(path.join(rootDir, 'world-data/region-ladder-v23.json'), 'utf8'));
    const anchorMap = new Map(anchors.map(a => [a.id, a]));

    for (const npc of snapshot.npcs) {
      const anchor = anchorMap.get(npc.schedule.currentAnchorId);
      const regTier = regionLadder.regions[anchor.region]?.tier ?? 1;
      const baseRealm = Math.max(0, regTier - 1);
      const realm = npc.cultivation.realmIndex;
      expect(realm).toBeGreaterThanOrEqual(Math.max(0, baseRealm - 1));
      expect(realm).toBeLessThanOrEqual(Math.min(8, baseRealm + 3));
    }
  });

  it('14. [V9] zero NPCs are placed in secret_realm or danger_zone anchors', () => {
    const forbiddenTypes = new Set(['secret_realm', 'danger_zone']);
    const anchorMap = new Map(anchors.map(a => [a.id, a]));

    for (const npc of snapshot.npcs) {
      const anchor = anchorMap.get(npc.schedule.currentAnchorId);
      expect(forbiddenTypes.has(anchor.type)).toBe(false);
    }
  });

  it('15. [V10] total ecosystem population is in [650, 900] range', () => {
    expect(snapshot.npcs.length).toBeGreaterThanOrEqual(650);
    expect(snapshot.npcs.length).toBeLessThanOrEqual(900);
    expect(snapshot.npcs.length).toBe(764);
  });

  it('16. [V11] all populated anchors have residents equal to configured quota', () => {
    const counts = {};
    snapshot.npcs.forEach(n => {
      counts[n.schedule.currentAnchorId] = (counts[n.schedule.currentAnchorId] || 0) + 1;
    });

    for (const anchor of anchors) {
      const quota = config.residentsPerType[anchor.type];
      if (quota > 0) {
        expect(counts[anchor.id]).toBe(quota);
      } else {
        expect(counts[anchor.id]).toBeUndefined();
      }
    }
  });

  it('17. [V12] all family clan members link to valid existing NPC ObjectIds', () => {
    const npcIdSet = new Set(snapshot.npcs.map(n => n._id.toString()));
    expect(snapshot.families.length).toBe(8);
    for (const fam of snapshot.families) {
      expect(fam.members.length).toBeGreaterThanOrEqual(3);
      for (const m of fam.members) {
        expect(npcIdSet.has(m.npcId.toString())).toBe(true);
      }
    }
  });

  it('18. [V13] all 764 NPC documents pass validateSync() on Npc Mongoose model', { timeout: 30000 }, () => {
    for (const npc of snapshot.npcs) {
      const doc = new Npc(npc);
      const err = doc.validateSync();
      expect(err).toBeUndefined();
    }
  });

  it('19. [V14] every NPC has zoneId: tianyuan_world_map and guildId: global', () => {
    for (const npc of snapshot.npcs) {
      expect(npc.zoneId).toBe('tianyuan_world_map');
      expect(npc.guildId).toBe('global');
    }
  });

  it('20. 4 fallback backup NPCs (Shuang Ke, Wu Binglin, Yin Ci, Li Keke) exist with isEssential: true (V29 Essential Story NPCs)', () => {
    const backupNames = ['Shuang Ke', 'Wu Binglin', 'Yin Ci', 'Li Keke'];
    for (const name of backupNames) {
      const found = snapshot.npcs.find(n => n.name === name);
      expect(found).toBeDefined();
      expect(found.vitalStatus.isEssential).toBe(true);
    }
  });

  it('21. ensureNpcWorld respects NPC_SEED_ON_BOOT="false"', async () => {
    process.env.NPC_SEED_ON_BOOT = 'false';
    const res = await ensureNpcWorld({ Npc, NpcFamily: null });
    expect(res.skipped).toBe(true);
    delete process.env.NPC_SEED_ON_BOOT;
  });

  it('22. findWalkableTileNear finds distinct walkable tile near coordinate', () => {
    const rng = makeRng('unit_test_tile');
    const used = new Set(['2455,2485']);
    const tile = findWalkableTileNear(2455, 2485, used, rng);
    expect(tile.tileX).toBeDefined();
    expect(tile.tileY).toBeDefined();
    expect(isTileWalkable(tile.tileX, tile.tileY)).toBe(true);
    expect(used.has(`${tile.tileX},${tile.tileY}`)).toBe(true);
  });
});
