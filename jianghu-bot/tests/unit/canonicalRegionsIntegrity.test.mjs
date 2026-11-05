import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Canonical Region Integrity (V24 H6)', () => {
  const regionsPath = path.resolve(__dirname, '../../world-data/regions.json');
  const regions = JSON.parse(fs.readFileSync(regionsPath, 'utf8'));
  const validRegionIds = new Set(regions.map(r => r.id));

  it('world-data/regions.json contains exactly 29 canonical regions', () => {
    expect(regions.length).toBe(29);
    expect(validRegionIds.has('central_plains')).toBe(true);
    expect(validRegionIds.has('nine_springs_delta')).toBe(true);
    expect(validRegionIds.has('azure_mountain_range')).toBe(true);
    expect(validRegionIds.has('void_rift')).toBe(true);
    expect(validRegionIds.has('frostmoon_sea')).toBe(true);
    expect(validRegionIds.has('floating_wind_isles')).toBe(true);
  });

  it('docs/SISTEM_ZONA_V23.md mentions valid canonical region IDs without hallucinations', () => {
    const docPath = path.resolve(__dirname, '../../docs/SISTEM_ZONA_V23.md');
    if (fs.existsSync(docPath)) {
      const content = fs.readFileSync(docPath, 'utf8');
      expect(content.includes('lost_desert')).toBe(false);
      expect(content.includes('everfrost_glacier')).toBe(false);
      expect(content.includes('primordial_abyss')).toBe(false);
      expect(content.includes('chaos_origin')).toBe(false);
    }
  });

  it('review/report_v23.md mentions valid canonical region IDs without hallucinations', () => {
    const reportPath = path.resolve(__dirname, '../../review/report_v23.md');
    if (fs.existsSync(reportPath)) {
      const content = fs.readFileSync(reportPath, 'utf8');
      expect(content.includes('everfrost_glacier')).toBe(false);
      expect(content.includes('lost_desert')).toBe(false);
    }
  });
});
