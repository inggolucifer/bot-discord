const fs = require('fs');
const path = require('path');

// Read region-ladder-v23.json to determine max realmIndex N
const regionLadderPath = path.resolve(__dirname, '../../world-data/region-ladder-v23.json');
const regionLadder = JSON.parse(fs.readFileSync(regionLadderPath, 'utf8'));

// Extract maximum requiredRealmIndex across all regions
let maxRealmIndex = 0;
for (const region of Object.values(regionLadder.regions || {})) {
  if (typeof region.requiredRealmIndex === 'number' && region.requiredRealmIndex > maxRealmIndex) {
    maxRealmIndex = region.requiredRealmIndex;
  }
}

const FORBIDDEN_WORDS = [
  'Nascent Soul',
  'Late',
  'Early',
  'Middle',
  'Realm',
  'Reputation',
  'Position',
  'Insight',
  'Travel Speed',
  'Focus'
];

describe('P6 NPC Labels & Indonesian Realm Formatting Unit Tests', () => {
  let formatRealm;
  let activityLabel;

  beforeAll(async () => {
    const modulePath = path.resolve(__dirname, '../../web-dashboard/src/components/npc/npcLabels.ts');
    const mod = await import(modulePath);
    formatRealm = mod.formatRealm;
    activityLabel = mod.activityLabel;
  });

  it('1. formatRealm is defined and exported as function', () => {
    expect(typeof formatRealm).toBe('function');
  });

  it('2. Setiap realmIndex 0..N (N dari region-ladder-v23.json) menghasilkan string murni tanpa kata terlarang', () => {
    const stages = ['early', 'middle', 'late', 'peak', undefined];

    for (let r = 0; r <= Math.max(maxRealmIndex, 8); r++) {
      for (const st of stages) {
        const formatted = formatRealm(r, st);
        expect(typeof formatted).toBe('string');
        expect(formatted.length).toBeGreaterThan(0);

        for (const word of FORBIDDEN_WORDS) {
          const regex = new RegExp(`\\b${word}\\b`, 'i');
          expect(regex.test(formatted)).toBe(false);
        }
      }
    }
  });

  it('3. Translates "Nascent Soul (VI) Akhir" and English inputs properly into Indonesian', () => {
    const res1 = formatRealm(4, 'late');
    expect(res1).toBe('Jiwa Baru Lahir Tahap Akhir');

    const res2 = formatRealm('Nascent Soul (VI) Akhir');
    expect(res2).toContain('Jiwa Baru Lahir');
    expect(res2).not.toContain('Nascent Soul');
    expect(res2).not.toContain('(VI)');

    const res3 = formatRealm(0, 'early');
    expect(res3).toBe('Fondasi Fana Tahap Awal');

    const res4 = formatRealm(3, 'peak');
    expect(res4).toBe('Inti Emas Tahap Puncak');
  });

  it('4. activityLabel maps all living NPC states accurately without English words', () => {
    expect(typeof activityLabel).toBe('function');

    const expectations = [
      { state: 'traveling', journeyTo: 'Desa Xingcun', expected: 'Sedang dalam perjalanan ke Desa Xingcun' },
      { state: 'visiting', expected: 'Sedang bertamu' },
      { state: 'hunting', expected: 'Sedang memburu seseorang' },
      { state: 'working', expected: 'Sedang bekerja' },
      { state: 'sleeping', expected: 'Sedang tidur' },
      { state: 'socializing', expected: 'Sedang bersantai' },
      { state: 'training', expected: 'Sedang berlatih' },
      { state: 'meditating', expected: 'Sedang bermeditasi' },
      { state: 'idle', expected: 'Sedang senggang' }
    ];

    for (const item of expectations) {
      const label = activityLabel(item.state, item.journeyTo);
      expect(label).toBe(item.expected);
      for (const word of FORBIDDEN_WORDS) {
        const regex = new RegExp(`\\b${word}\\b`, 'i');
        expect(regex.test(label)).toBe(false);
      }
    }
  });
});
