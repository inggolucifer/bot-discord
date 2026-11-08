import { describe, it, expect } from 'vitest';
import {
  getAffinityStage,
  resolveHonorific,
  resolveGreeting,
  resolveDialogue
} from '../../../services/npcDialogueEngine.js';

describe('V27 Dynamic VN Dialogue Engine Suite', () => {
  const dummyPlayer = { characterName: 'Pendekar Ling', gender: 'male' };
  const righteousNpc = { name: 'Tetua Yue', personality: { primary: 'righteous' } };
  const ruthlessNpc = { name: 'Dugu Ba', personality: { primary: 'ruthless' } };
  const pragmaticNpc = { name: 'Saudagar Jin', personality: { primary: 'pragmatic' } };

  it('resolves greetings across 7 affinity stages without unreplaced placeholders', () => {
    const affinities = [-80, -30, -5, 10, 35, 65, 95];
    const stages = ['nemesis', 'hateful', 'wary', 'neutral', 'friendly', 'close_friend', 'soulmate'];

    for (let i = 0; i < affinities.length; i++) {
      const aff = affinities[i];
      const stage = getAffinityStage(aff);
      expect(stage).toBe(stages[i]);

      const greeting = resolveGreeting(righteousNpc, dummyPlayer, aff);
      expect(greeting).toBeDefined();
      expect(greeting.length).toBeGreaterThan(10);
      expect(greeting).not.toMatch(/\{[a-zA-Z0-9_]+\}/);
    }
  });

  it('resolves dialogue for all 15 interaction actions with ZERO placeholder leaks', () => {
    const actions = [
      'chat', 'inquire', 'spar', 'duel', 'gift',
      'bribe', 'recruit', 'confess', 'propose', 'divorce',
      'adopt', 'steal', 'threaten', 'request_favor', 'break_relations'
    ];

    const npcs = [righteousNpc, ruthlessNpc, pragmaticNpc];

    for (const action of actions) {
      for (const npc of npcs) {
        const text = resolveDialogue(npc, dummyPlayer, action, 'success', {
          itemName: 'Pedang Giok Hijau',
          amount: 100,
          affinity: 20
        });

        expect(text).toBeDefined();
        expect(text.length).toBeGreaterThan(5);
        // Verify ZERO unreplaced placeholders leaked into dialogue
        expect(text).not.toMatch(/\{[a-zA-Z0-9_]+\}/);
      }
    }
  });

  it('adapts tone based on NPC personality', () => {
    const righteousChat = resolveDialogue(righteousNpc, dummyPlayer, 'chat', 'success');
    expect(righteousChat).toContain('kebajikan');

    const ruthlessThreat = resolveDialogue(ruthlessNpc, dummyPlayer, 'threaten', 'failure');
    expect(ruthlessThreat).toContain('cecunguk kecil');
  });
});
