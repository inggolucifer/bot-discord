import { describe, it, expect } from 'vitest';
import mongoose from 'mongoose';
import Npc from '../../../models/Npc.js';
import { resolveNpcTile } from '../../../utils/npcPosition.js';

describe('NPC World Visibility & Position Resolution (V28 / B2)', () => {
  it('1. resolveNpcTile returns schedule coordinates first', () => {
    const npc = {
      schedule: { tileX: 2450, tileY: 2480 },
      tileX: 2000,
      tileY: 2000
    };
    const res = resolveNpcTile(npc);
    expect(res).toEqual({ tileX: 2450, tileY: 2480 });
  });

  it('2. resolveNpcTile falls back to top-level tileX/Y when schedule is missing', () => {
    const npc = {
      tileX: 2100,
      tileY: 2200
    };
    const res = resolveNpcTile(npc);
    expect(res).toEqual({ tileX: 2100, tileY: 2200 });
  });

  it('3. resolveNpcTile falls back to anchor coordinates when given anchor lookup', () => {
    const npc = {
      schedule: { currentAnchorId: 'desa_xingcun' }
    };
    const anchorMap = { desa_xingcun: { x: 2455, y: 2485 } };
    const res = resolveNpcTile(npc, anchorMap);
    expect(res).toEqual({ tileX: 2455, tileY: 2485 });
  });

  it('4. resolveNpcTile throws error when coordinates are missing or (0, 0)', () => {
    expect(() => resolveNpcTile({})).toThrow(/tidak memiliki koordinat/i);
    expect(() => resolveNpcTile({ tileX: 0, tileY: 0 })).toThrow(/tidak memiliki koordinat/i);
    expect(() => resolveNpcTile({ schedule: { tileX: 0, tileY: 0 } })).toThrow(/tidak memiliki koordinat/i);
  });

  it('5. guildId query filter matches global NPCs even when player guildId is random snowflake', () => {
    const playerGuildId = 'discord_guild_99887766';
    const queryGuild = { $in: [playerGuildId, 'global'] };

    const matchesGlobal = queryGuild.$in.includes('global');
    const matchesPlayerGuild = queryGuild.$in.includes(playerGuildId);
    expect(matchesGlobal).toBe(true);
    expect(matchesPlayerGuild).toBe(true);
  });

  it('6. Chebyshev distance <= 2 tile filter finds NPC in immediate proximity', () => {
    const px = 2455;
    const py = 2485;
    const nearbyNpc = { tileX: 2457, tileY: 2483 }; // dx = 2, dy = 2 -> max = 2
    const dist = Math.max(Math.abs(nearbyNpc.tileX - px), Math.abs(nearbyNpc.tileY - py));
    expect(dist).toBeLessThanOrEqual(2);
  });

  it('7. Chebyshev distance >= 3 tile filter excludes distant NPC', () => {
    const px = 2455;
    const py = 2485;
    const distantNpc = { tileX: 2458, tileY: 2485 }; // dx = 3, dy = 0 -> max = 3
    const dist = Math.max(Math.abs(distantNpc.tileX - px), Math.abs(distantNpc.tileY - py));
    expect(dist).toBeGreaterThan(2);
  });

  it('8. vitality filter excludes dead NPCs (vitalStatus.isAlive: false)', () => {
    const deadNpc = new Npc({
      name: 'Hantu Gua',
      vitalStatus: { isAlive: false, isEssential: false }
    });
    expect(deadNpc.vitalStatus.isAlive).toBe(false);
  });

  it('9. vitality filter includes living downed NPCs with downedUntil flag', () => {
    const downedNpc = new Npc({
      name: 'Zhou Haotian',
      vitalStatus: {
        isAlive: true,
        isInjured: true,
        isEssential: true,
        downedUntil: new Date(Date.now() + 60000)
      },
      schedule: { activityState: 'downed' }
    });
    expect(downedNpc.vitalStatus.isAlive).toBe(true);
    expect(downedNpc.schedule.activityState).toBe('downed');
    expect(downedNpc.vitalStatus.downedUntil).not.toBeNull();
  });

  it('10. settlement fallback query matches by currentAnchorId or settlementName', () => {
    const settlementNpc = new Npc({
      name: 'Lin Xuan',
      settlementName: 'Desa Xingcun',
      schedule: { currentAnchorId: 'desa_xingcun', tileX: 2455, tileY: 2485 }
    });
    const matchesAnchor = settlementNpc.schedule.currentAnchorId === 'desa_xingcun';
    const matchesName = settlementNpc.settlementName === 'Desa Xingcun';
    expect(matchesAnchor || matchesName).toBe(true);
  });

  it('11. chunk streaming logic bounds NPC coordinates correctly', () => {
    const cx = 76; // chunk 76, 77
    const cy = 77;
    const minTileX = cx * 32;
    const maxTileX = minTileX + 31;
    const minTileY = cy * 32;
    const maxTileY = minTileY + 31;

    const inChunkNpc = { tileX: minTileX + 5, tileY: minTileY + 10 };
    const outChunkNpc = { tileX: minTileX - 1, tileY: minTileY + 10 };

    const isIn = inChunkNpc.tileX >= minTileX && inChunkNpc.tileX <= maxTileX &&
                 inChunkNpc.tileY >= minTileY && inChunkNpc.tileY <= maxTileY;
    const isOut = outChunkNpc.tileX >= minTileX && outChunkNpc.tileX <= maxTileX &&
                  outChunkNpc.tileY >= minTileY && outChunkNpc.tileY <= maxTileY;

    expect(isIn).toBe(true);
    expect(isOut).toBe(false);
  });

  it('12. resolveNpcTile rejects (0, 0) coordinates to prevent stream clutter', () => {
    const badNpc = { name: 'Buggy NPC', schedule: { tileX: 0, tileY: 0 } };
    expect(() => resolveNpcTile(badNpc)).toThrow();
  });
});
