import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BOT_ROOT = path.resolve(__dirname, '../..');

describe('V25 K6 — Canonical Region IDs in Documentation & Reports', () => {
  const regions = JSON.parse(fs.readFileSync(path.join(BOT_ROOT, 'world-data/regions.json'), 'utf8'));
  const canonicalIds = new Set(regions.map(r => r.id));

  const hallucinatedList = [
    'kunlun_foothills',
    'hundred_thousand_hills',
    'lei_ze_wasteland',
    'everfrost_glacier',
    'lost_desert',
    'primordial_abyss',
    'chaos_origin'
  ];

  it('1. docs/SISTEM_ZONA_V23.md contains zero hallucinated region names', () => {
    const docPath = path.join(BOT_ROOT, 'docs/SISTEM_ZONA_V23.md');
    const content = fs.readFileSync(docPath, 'utf8');
    for (const token of hallucinatedList) {
      expect(content.includes(token), `Found hallucinated token ${token} in docs`).toBe(false);
    }
  });

  it('2. scripts/v23/gateRunner.js contains zero hallucinated region names', () => {
    const scriptPath = path.join(BOT_ROOT, 'scripts/v23/gateRunner.js');
    const content = fs.readFileSync(scriptPath, 'utf8');
    for (const token of hallucinatedList) {
      expect(content.includes(token), `Found hallucinated token ${token} in gateRunner`).toBe(false);
    }
  });

  it('3. review/report_v23.md contains zero hallucinated region names', () => {
    const repPath = path.join(BOT_ROOT, 'review/report_v23.md');
    const content = fs.readFileSync(repPath, 'utf8');
    for (const token of hallucinatedList) {
      expect(content.includes(token), `Found hallucinated token ${token} in report_v23`).toBe(false);
    }
  });

  it('4. All region tokens referenced in docs/SISTEM_ZONA_V23.md table are canonical', () => {
    const docPath = path.join(BOT_ROOT, 'docs/SISTEM_ZONA_V23.md');
    const content = fs.readFileSync(docPath, 'utf8');
    // Extract code spans in the role table
    const tableRegex = /\|[^|]+\|[^|]+\|[^|]+\|([^|]+)\|/g;
    let match;
    const foundTokens = [];
    while ((match = tableRegex.exec(content)) !== null) {
      const col = match[1];
      const tokenMatches = col.match(/`([a-z0-9_]+)`/g);
      if (tokenMatches) {
        for (const tm of tokenMatches) {
          foundTokens.push(tm.replace(/`/g, ''));
        }
      }
    }
    expect(foundTokens.length).toBeGreaterThan(0);
    for (const t of foundTokens) {
      expect(canonicalIds.has(t), `Token ${t} is not in regions.json`).toBe(true);
    }
  });

  it('5. Legacy blocker phrase is not present in web-api/routes/world.js', () => {
    const worldCode = fs.readFileSync(path.join(BOT_ROOT, 'web-api/routes/world.js'), 'utf8');
    expect(worldCode.includes('Jalur terhalang rintangan tebing batu yang mustahil ditembus')).toBe(false);
  });
});
