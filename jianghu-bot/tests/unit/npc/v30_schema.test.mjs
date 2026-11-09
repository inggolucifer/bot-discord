import { describe, it, expect } from 'vitest';
import mongoose from 'mongoose';
import NpcAmbush from '../../../models/NpcAmbush';
import NpcPlayerRelation from '../../../models/NpcPlayerRelation';

describe('V30 Schema Validation Tests (H0)', () => {
  it('1. NpcAmbush accepts kind "vendetta" and "hostile", with reason string', () => {
    const doc1 = new NpcAmbush({
      hunterNpcId: new mongoose.Types.ObjectId(),
      targetPlayerId: new mongoose.Types.ObjectId(),
      tileX: 100,
      tileY: 100,
      kind: 'vendetta',
      reason: 'dendam'
    });
    expect(doc1.validateSync()).toBeUndefined();
    expect(doc1.kind).toBe('vendetta');
    expect(doc1.reason).toBe('dendam');

    const doc2 = new NpcAmbush({
      hunterNpcId: new mongoose.Types.ObjectId(),
      targetPlayerId: new mongoose.Types.ObjectId(),
      tileX: 100,
      tileY: 100,
      kind: 'hostile',
      reason: 'benci'
    });
    expect(doc2.validateSync()).toBeUndefined();
    expect(doc2.kind).toBe('hostile');
  });

  it('2. NpcAmbush defaults kind to "vendetta" and reason to ""', () => {
    const doc = new NpcAmbush({
      hunterNpcId: new mongoose.Types.ObjectId(),
      targetPlayerId: new mongoose.Types.ObjectId(),
      tileX: 100,
      tileY: 100
    });
    expect(doc.kind).toBe('vendetta');
    expect(doc.reason).toBe('');
    expect(doc.validateSync()).toBeUndefined();
  });

  it('3. NpcAmbush rejects kind outside enum', () => {
    const doc = new NpcAmbush({
      hunterNpcId: new mongoose.Types.ObjectId(),
      targetPlayerId: new mongoose.Types.ObjectId(),
      tileX: 100,
      tileY: 100,
      kind: 'invalid_kind'
    });
    const err = doc.validateSync();
    expect(err).toBeDefined();
    expect(err.errors.kind).toBeDefined();
  });

  it('4. NpcPlayerRelation supports lastAmbushAt field', () => {
    const now = new Date();
    const doc = new NpcPlayerRelation({
      playerId: new mongoose.Types.ObjectId(),
      npcId: new mongoose.Types.ObjectId(),
      lastAmbushAt: now
    });
    expect(doc.validateSync()).toBeUndefined();
    expect(doc.lastAmbushAt).toEqual(now);
  });
});
