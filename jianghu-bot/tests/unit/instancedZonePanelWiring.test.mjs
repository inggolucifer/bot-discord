import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BOT_ROOT = path.resolve(__dirname, '../..');

describe('V25 K3 — Instanced Zone UI Wiring', () => {
  it('1. InstancedZonePanel.tsx exists and is defined', () => {
    const panelPath = path.join(BOT_ROOT, 'web-dashboard/src/components/world/InstancedZonePanel.tsx');
    expect(fs.existsSync(panelPath)).toBe(true);
    const content = fs.readFileSync(panelPath, 'utf8');
    expect(content.includes('export const InstancedZonePanel')).toBe(true);
  });

  it('2. InstancedZonePanel supports all 4 zone types', () => {
    const panelPath = path.join(BOT_ROOT, 'web-dashboard/src/components/world/InstancedZonePanel.tsx');
    const content = fs.readFileSync(panelPath, 'utf8');
    expect(content.includes('spirit_valley')).toBe(true);
    expect(content.includes('land_of_spirits')).toBe(true);
    expect(content.includes('defense_circle')).toBe(true);
    expect(content.includes('elemental_land')).toBe(true);
  });

  it('3. ZoneGridView.tsx imports and renders InstancedZonePanel', () => {
    const zgvPath = path.join(BOT_ROOT, 'web-dashboard/src/components/map/ZoneGridView.tsx');
    const content = fs.readFileSync(zgvPath, 'utf8');
    expect(content.includes('import InstancedZonePanel')).toBe(true);
    expect(content.includes('<InstancedZonePanel')).toBe(true);
    expect(content.includes('instancedSession')).toBe(true);
  });

  it('4. NearbyPanel onAction handles enter for zone and hazard', () => {
    const zgvPath = path.join(BOT_ROOT, 'web-dashboard/src/components/map/ZoneGridView.tsx');
    const content = fs.readFileSync(zgvPath, 'utf8');
    expect(content.includes("item.type === 'zone' || item.type === 'hazard'")).toBe(true);
    expect(content.includes('/instanced-zones/enter')).toBe(true);
  });

  it('5. Auto-resumes active expedition on component mount', () => {
    const zgvPath = path.join(BOT_ROOT, 'web-dashboard/src/components/map/ZoneGridView.tsx');
    const content = fs.readFileSync(zgvPath, 'utf8');
    expect(content.includes('/instanced-zones/session')).toBe(true);
  });
});
