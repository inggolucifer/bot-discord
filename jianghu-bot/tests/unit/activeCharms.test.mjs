import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BOT_ROOT = path.resolve(__dirname, '../..');

const Player = require('../../models/Player');
const { calculateEffectiveAmbushRisk } = require('../../utils/monsterSpawnEngine');

describe('V25 K4 — Active Charms Functionality & Ambush Mitigation', () => {
  it('1. Player model schema allows repellent_charm and attraction_charm in activeBuffs enum', () => {
    const buffTypeSchema = Player.schema.path('activeBuffs').schema.path('buffType');
    const enumValues = buffTypeSchema.enumValues || [];
    expect(enumValues).toContain('repellent_charm');
    expect(enumValues).toContain('attraction_charm');
  });

  it('2. Baseline ambush risk without charms remains unchanged', () => {
    const baseRisk = 0.10;
    const rate = calculateEffectiveAmbushRisk(baseRisk, {});
    expect(rate).toBe(0.10);
  });

  it('3. Repellent charm reduces ambush rate by 50%', () => {
    const baseRisk = 0.10;
    const rate = calculateEffectiveAmbushRisk(baseRisk, { repellentActive: true, repellentRate: 0.50 });
    expect(rate).toBe(0.05);
  });

  it('4. Attraction charm increases ambush rate by 75%', () => {
    const baseRisk = 0.10;
    const rate = calculateEffectiveAmbushRisk(baseRisk, { attractionActive: true, attractionRate: 0.75 });
    expect(rate).toBe(0.175);
  });

  it('5. Repellent with custom bonus value calculates properly', () => {
    const baseRisk = 0.08;
    const rate = calculateEffectiveAmbushRisk(baseRisk, { repellentActive: true, repellentRate: 0.25 });
    expect(rate).toBe(0.06); // 0.08 * 0.75
  });

  it('6. world.js and models do not contain ghost field activeCharms', () => {
    const worldCode = fs.readFileSync(path.join(BOT_ROOT, 'web-api/routes/world.js'), 'utf8');
    const playerCode = fs.readFileSync(path.join(BOT_ROOT, 'models/Player.js'), 'utf8');
    expect(worldCode.includes('player.activeCharms')).toBe(false);
    expect(worldCode.includes('player.charms')).toBe(false);
    expect(playerCode.includes('activeCharms')).toBe(false);
  });

  it('7. inventory.js handles repellent_charm and attraction_charm with mutual exclusivity', () => {
    const invCode = fs.readFileSync(path.join(BOT_ROOT, 'web-api/routes/inventory.js'), 'utf8');
    expect(invCode.includes("item.effectType === 'repellent_charm' || item.effectType === 'attraction_charm'")).toBe(true);
    expect(invCode.includes("targetType = isRepellent ? 'repellent_charm' : 'attraction_charm'")).toBe(true);
  });

  it('8. Simulation review/v25_raw/charms_sim.json exists and allPass is true', () => {
    const simPath = path.join(BOT_ROOT, 'review/v25_raw/charms_sim.json');
    expect(fs.existsSync(simPath)).toBe(true);
    const data = JSON.parse(fs.readFileSync(simPath, 'utf8'));
    expect(data.allPass).toBe(true);
    expect(data.repellent.toleranceMet).toBe(true);
    expect(data.attraction.toleranceMet).toBe(true);
  });
});
