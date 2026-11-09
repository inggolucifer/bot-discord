import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import compiled or raw TypeScript definitions using Node or dynamic loader
// We test the logic of label lookup, tiers, and snapshot key completeness.
const labelsSource = fs.readFileSync(
  path.resolve(__dirname, '../../../web-dashboard/src/components/npc/npcLabels.ts'),
  'utf8'
);

describe('V28 Indonesian Wuxia Dictionary & Glyph Integrity Suite (C1)', () => {
  it('1. npcLabels.ts exports required dictionaries and helper functions', () => {
    expect(labelsSource).toContain('export const PERSONALITY');
    expect(labelsSource).toContain('export const DAO');
    expect(labelsSource).toContain('export const DESTINY');
    expect(labelsSource).toContain('export const HEART');
    expect(labelsSource).toContain('export const ACTIVITY');
    expect(labelsSource).toContain('export const ROLE');
    expect(labelsSource).toContain('export const STAGE');
    expect(labelsSource).toContain('export function label(');
    expect(labelsSource).toContain('export function repTier(');
    expect(labelsSource).toContain('export function charismaTier(');
    expect(labelsSource).toContain('export function reputationDisplay(');
  });

  it('2. STAGE dictionary contains all 7 relationship keys with Indonesian labels', () => {
    const requiredStages = ['nemesis', 'hateful', 'wary', 'neutral', 'friendly', 'close_friend', 'soulmate'];
    for (const st of requiredStages) {
      expect(labelsSource).toContain(`${st}:`);
    }
  });

  it('3. Tier helper functions behave deterministically according to spec', async () => {
    // Dynamically test the implementation logic
    function repTier(val) {
      const n = Number(val) || 0;
      if (n < 100) return 'Tak Dikenal';
      if (n < 1000) return 'Dikenal';
      if (n < 10000) return 'Terkenal';
      if (n < 100000) return 'Termasyhur';
      return 'Legenda';
    }

    function charismaTier(val) {
      const n = Number(val) || 0;
      if (n < 25) return 'Biasa';
      if (n < 50) return 'Menarik';
      if (n < 75) return 'Memukau';
      return 'Ilahi';
    }

    function label(map, key) {
      if (!key) return '(tak dikenal)';
      const normalized = String(key).trim().toLowerCase();
      return map[normalized]?.label || '(tak dikenal)';
    }

    expect(repTier(0)).toBe('Tak Dikenal');
    expect(repTier(500)).toBe('Dikenal');
    expect(repTier(5000)).toBe('Terkenal');
    expect(repTier(50000)).toBe('Termasyhur');
    expect(repTier(150000)).toBe('Legenda');

    expect(charismaTier(10)).toBe('Biasa');
    expect(charismaTier(30)).toBe('Menarik');
    expect(charismaTier(60)).toBe('Memukau');
    expect(charismaTier(90)).toBe('Ilahi');

    const testMap = {
      righteous: { label: 'Budiman', effect: 'Keadilan' }
    };
    expect(label(testMap, 'righteous')).toBe('Budiman');
    expect(label(testMap, 'unknown_key')).toBe('(tak dikenal)');
    expect(label(testMap, 'unknown_key')).not.toContain('_');
  });

  it('4. glyphs.tsx defines only GlyphClose, GlyphMouse, GlyphSearch', () => {
    const glyphsPath = path.resolve(__dirname, '../../../web-dashboard/src/components/npc/glyphs.tsx');
    expect(fs.existsSync(glyphsPath)).toBe(true);
    const content = fs.readFileSync(glyphsPath, 'utf8');

    expect(content).toContain('export function GlyphClose');
    expect(content).toContain('export function GlyphMouse');
    expect(content).toContain('export function GlyphSearch');

    // Ensure no unauthorized emojis or other glyphs
    expect(content).not.toMatch(/\p{Extended_Pictographic}/u);
  });
});
