import { describe, it, expect } from 'vitest';
import { getPlayerQuery } from '../../web-api/utils/playerLookup.js';

describe('Player Lookup Query Builder (V28 / A2)', () => {
  it('maps discordId snowflake in id to discordId query', () => {
    const q = getPlayerQuery({ id: '123456789012345678' });
    expect(q).toEqual({ discordId: '123456789012345678' });
  });

  it('maps discordId snowflake in userId to discordId query', () => {
    const q = getPlayerQuery({ userId: '123456789012345678' });
    expect(q).toEqual({ discordId: '123456789012345678' });
  });

  it('maps 24-hex ObjectId to $or [_id, discordId]', () => {
    const q = getPlayerQuery({ id: '507f1f77bcf86cd799439011' });
    expect(q).toEqual({
      $or: [
        { _id: '507f1f77bcf86cd799439011' },
        { discordId: '507f1f77bcf86cd799439011' }
      ]
    });
  });

  it('returns null for empty user object', () => {
    const q = getPlayerQuery({});
    expect(q).toBeNull();
  });

  it('returns null for null or undefined input', () => {
    expect(getPlayerQuery(null)).toBeNull();
    expect(getPlayerQuery(undefined)).toBeNull();
  });
});
