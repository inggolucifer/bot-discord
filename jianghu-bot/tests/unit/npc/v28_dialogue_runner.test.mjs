import { describe, it, expect } from 'vitest';
import {
  createRunner,
  tick,
  advance,
  isLastLine,
  currentSpeaker,
  getVisibleText
} from '../../../web-dashboard/src/lib/npcDialogueRunner.ts';

describe('V28 Pure Dialogue Runner State Machine Suite (C2)', () => {
  const sampleLines = [
    { speaker: 'npc', text: 'Salam, rekan pendekar. Angin senja terasa dingin hari ini.' },
    { speaker: 'player', text: 'Salam tetua. Bolehkah saya memohon petunjuk kultivasi?' },
    { speaker: 'npc', text: 'Tentu. Dantian yang tenang adalah kunci ketajaman pedang.' }
  ];

  it('1. createRunner initializes correctly with multiple lines', () => {
    const state = createRunner(sampleLines);
    expect(state.lineIndex).toBe(0);
    expect(state.charProgress).toBe(0);
    expect(state.isTyping).toBe(true);
    expect(state.choicesVisible).toBe(false);
    expect(state.completed).toBe(false);
    expect(currentSpeaker(state)).toBe('npc');
    expect(getVisibleText(state)).toBe('');
  });

  it('2. tick advances charProgress proportionally to dtMs and cps', () => {
    let state = createRunner(sampleLines);
    // 500ms at 45 cps = 22.5 characters -> floor = 22
    state = tick(state, 500, 45);
    expect(state.charProgress).toBeCloseTo(22.5, 1);
    expect(state.isTyping).toBe(true);
    expect(getVisibleText(state).length).toBe(22);
  });

  it('3. tick completes current line typing when time exceeds line length', () => {
    let state = createRunner(sampleLines);
    const lineLen = sampleLines[0].text.length;
    // 2000ms at 45 cps = 90 characters (> lineLen)
    state = tick(state, 2000, 45);
    expect(state.charProgress).toBe(lineLen);
    expect(state.isTyping).toBe(false);
    expect(getVisibleText(state)).toBe(sampleLines[0].text);
    // Not last line yet, so choicesVisible is false
    expect(state.choicesVisible).toBe(false);
  });

  it('4. advance instantly finishes typing if clicked while still typing', () => {
    let state = createRunner(sampleLines);
    state = tick(state, 100, 45); // Partial text
    expect(state.isTyping).toBe(true);

    state = advance(state); // Clicked!
    expect(state.isTyping).toBe(false);
    expect(getVisibleText(state)).toBe(sampleLines[0].text);
    expect(state.lineIndex).toBe(0); // Still on first line
  });

  it('5. advance moves to next line when clicked after typing completes', () => {
    let state = createRunner(sampleLines);
    state = tick(state, 3000, 45); // Finish line 0
    expect(state.isTyping).toBe(false);

    state = advance(state); // Move to line 1
    expect(state.lineIndex).toBe(1);
    expect(state.isTyping).toBe(true);
    expect(currentSpeaker(state)).toBe('player');
    expect(getVisibleText(state)).toBe('');
  });

  it('6. on the last line, choicesVisible becomes true when typing finishes', () => {
    let state = createRunner(sampleLines);
    // Fast forward to last line (index 2)
    state = advance(advance(state)); // Finish line 0 -> line 1
    state = advance(advance(state)); // Finish line 1 -> line 2
    expect(state.lineIndex).toBe(2);
    expect(isLastLine(state)).toBe(true);
    expect(state.choicesVisible).toBe(false);

    // Finish typing last line
    state = tick(state, 3000, 45);
    expect(state.isTyping).toBe(false);
    expect(state.choicesVisible).toBe(true);
  });

  it('7. advance on completed last line marks completed', () => {
    let state = createRunner(sampleLines);
    // Jump to last line and finish
    state.lineIndex = 2;
    state.isTyping = false;
    state.charProgress = sampleLines[2].text.length;
    state.choicesVisible = true;

    state = advance(state);
    expect(state.completed).toBe(true);
    expect(state.choicesVisible).toBe(true);
  });

  it('8. safe handling of empty lines array', () => {
    const emptyState = createRunner([]);
    expect(emptyState.completed).toBe(true);
    expect(emptyState.choicesVisible).toBe(true);
    expect(currentSpeaker(emptyState)).toBe(null);
    expect(getVisibleText(emptyState)).toBe('');

    const ticked = tick(emptyState, 1000);
    expect(ticked.completed).toBe(true);

    const advanced = advance(emptyState);
    expect(advanced.completed).toBe(true);
  });

  it('9. safe handling of empty line text', () => {
    const state = createRunner([{ speaker: 'npc', text: '' }]);
    expect(state.isTyping).toBe(false);
    expect(state.choicesVisible).toBe(true);
    expect(getVisibleText(state)).toBe('');
  });

  it('10. cps = 0 or negative does not divide by zero or break state', () => {
    let state = createRunner(sampleLines);
    expect(() => {
      state = tick(state, 500, 0);
    }).not.toThrow();
    expect(Number.isFinite(state.charProgress)).toBe(true);

    expect(() => {
      state = tick(state, 500, -10);
    }).not.toThrow();
    expect(Number.isFinite(state.charProgress)).toBe(true);
  });

  it('11. state transitions are completely deterministic', () => {
    const runA = tick(createRunner(sampleLines), 400, 50);
    const runB = tick(createRunner(sampleLines), 400, 50);
    expect(runA.charProgress).toBe(runB.charProgress);
    expect(runA.isTyping).toBe(runB.isTyping);
    expect(runA.lineIndex).toBe(runB.lineIndex);
  });
});
