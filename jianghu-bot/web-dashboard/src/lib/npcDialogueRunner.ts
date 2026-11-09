/**
 * Pure Deterministic Dialogue Runner (V28)
 * Framework-agnostic typewriter state machine. Zero React dependencies.
 */

export interface DialogueLine {
  speaker: 'player' | 'npc';
  text: string;
  speakerName?: string;
}

export interface DialogueRunnerState {
  lines: DialogueLine[];
  lineIndex: number;
  charProgress: number;
  isTyping: boolean;
  choicesVisible: boolean;
  completed: boolean;
}

export function createRunner(lines: DialogueLine[] = []): DialogueRunnerState {
  const safeLines = Array.isArray(lines) ? lines : [];
  const firstLine = safeLines[0];
  const hasText = !!(firstLine && firstLine.text && firstLine.text.length > 0);

  return {
    lines: safeLines,
    lineIndex: 0,
    charProgress: 0,
    isTyping: hasText,
    choicesVisible: safeLines.length <= 1 && !hasText,
    completed: safeLines.length === 0
  };
}

export function currentSpeaker(state: DialogueRunnerState): 'player' | 'npc' | null {
  if (!state.lines || state.lines.length === 0) return null;
  const current = state.lines[state.lineIndex];
  return current ? current.speaker : null;
}

export function isLastLine(state: DialogueRunnerState): boolean {
  if (!state.lines || state.lines.length === 0) return true;
  return state.lineIndex >= state.lines.length - 1;
}

export function getVisibleText(state: DialogueRunnerState): string {
  if (!state.lines || state.lines.length === 0) return '';
  const current = state.lines[state.lineIndex];
  if (!current || !current.text) return '';
  const len = Math.floor(state.charProgress);
  return current.text.slice(0, Math.max(0, len));
}

export function tick(state: DialogueRunnerState, dtMs: number, cps: number = 45): DialogueRunnerState {
  if (state.completed || !state.isTyping) {
    return state;
  }

  const current = state.lines[state.lineIndex];
  if (!current || !current.text) {
    const last = isLastLine(state);
    return {
      ...state,
      isTyping: false,
      choicesVisible: last,
      completed: last
    };
  }

  const safeCps = Number.isFinite(cps) && cps > 0 ? cps : 45;
  const added = (Math.max(0, dtMs) / 1000) * safeCps;
  const targetLen = current.text.length;
  const newProgress = Math.min(targetLen, state.charProgress + added);
  const stillTyping = newProgress < targetLen;
  const last = isLastLine(state);

  return {
    ...state,
    charProgress: newProgress,
    isTyping: stillTyping,
    choicesVisible: last && !stillTyping,
    completed: last && !stillTyping && state.completed
  };
}

export function advance(state: DialogueRunnerState): DialogueRunnerState {
  if (state.completed || !state.lines || state.lines.length === 0) {
    return { ...state, completed: true, choicesVisible: true };
  }

  const current = state.lines[state.lineIndex];
  const targetLen = current?.text ? current.text.length : 0;

  // 1. If currently typing: instantly finish typing current line
  if (state.isTyping) {
    const last = isLastLine(state);
    return {
      ...state,
      charProgress: targetLen,
      isTyping: false,
      choicesVisible: last
    };
  }

  // 2. If finished typing: advance to next line or complete
  if (isLastLine(state)) {
    return {
      ...state,
      completed: true,
      choicesVisible: true
    };
  }

  const nextIndex = state.lineIndex + 1;
  const nextLine = state.lines[nextIndex];
  const hasNextText = !!(nextLine && nextLine.text && nextLine.text.length > 0);

  return {
    ...state,
    lineIndex: nextIndex,
    charProgress: hasNextText ? 0 : 0,
    isTyping: hasNextText,
    choicesVisible: nextIndex >= state.lines.length - 1 && !hasNextText
  };
}
