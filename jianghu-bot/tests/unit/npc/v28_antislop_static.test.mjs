import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const NPC_COMPONENTS_DIR = path.resolve(__dirname, '../../../web-dashboard/src/components/npc');
const NPC_MODAL_PATH = path.resolve(__dirname, '../../../web-dashboard/src/components/modals/NpcInteractionModal.tsx');

function getAllNpcComponentFiles() {
  const files = [];
  if (fs.existsSync(NPC_COMPONENTS_DIR)) {
    const list = fs.readdirSync(NPC_COMPONENTS_DIR);
    for (const f of list) {
      if (f.endsWith('.tsx') || f.endsWith('.ts')) {
        files.push(path.join(NPC_COMPONENTS_DIR, f));
      }
    }
  }
  if (fs.existsSync(NPC_MODAL_PATH)) {
    files.push(NPC_MODAL_PATH);
  }
  return files;
}

describe('V28 Anti-AI-Slop Static Verification Suite', () => {
  const files = getAllNpcComponentFiles();

  it('1. No raw emoji or Extended_Pictographic characters in NPC UI code or text', () => {
    // Exclude CSS files, comments, or standard ASCII
    const emojiRegex = /\p{Extended_Pictographic}/u;
    const violations = [];

    for (const filePath of files) {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        // Strip out single-line comment if it is an ESLint or documentation note
        if (emojiRegex.test(line)) {
          violations.push(`${path.basename(filePath)}:${idx + 1}: ${line.trim()}`);
        }
      });
    }

    expect(violations, `Found emoji characters in NPC UI files:\n${violations.slice(0, 10).join('\n')}`).toEqual([]);
  });

  it('2. No backdrop-blur, glowing neon box-shadow, or pulse/ping decorative animations', () => {
    const forbiddenPatterns = [
      /backdrop-blur/i,
      /shadow-\[0_0_/i,
      /animate-pulse/i,
      /animate-ping/i,
      /bg-gradient-to-(r|l|t|b|tr|tl|br|bl)/i
    ];

    const violations = [];
    for (const filePath of files) {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        for (const pattern of forbiddenPatterns) {
          if (pattern.test(line)) {
            violations.push(`${path.basename(filePath)}:${idx + 1} matches ${pattern}: ${line.trim()}`);
          }
        }
      });
    }

    expect(violations, `Found forbidden glowing/blur/gradient patterns:\n${violations.slice(0, 10).join('\n')}`).toEqual([]);
  });

  it('3. No excessive rounded borders (rounded-xl, rounded-2xl, rounded-full except 8px dots)', () => {
    const forbiddenRounding = [/rounded-xl/i, /rounded-2xl/i, /rounded-3xl/i];
    const violations = [];

    for (const filePath of files) {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        for (const pattern of forbiddenRounding) {
          if (pattern.test(line)) {
            violations.push(`${path.basename(filePath)}:${idx + 1} matches ${pattern}: ${line.trim()}`);
          }
        }
      });
    }

    expect(violations, `Found forbidden large rounded borders:\n${violations.slice(0, 10).join('\n')}`).toEqual([]);
  });

  it('4. npcTheme.css is defined and contains required design tokens', () => {
    const themeCssPath = path.join(NPC_COMPONENTS_DIR, 'npcTheme.css');
    expect(fs.existsSync(themeCssPath)).toBe(true);

    const themeContent = fs.readFileSync(themeCssPath, 'utf8');
    const requiredTokens = [
      '--npc-ink',
      '--npc-parchment',
      '--npc-night',
      '--npc-line',
      '--npc-cream',
      '--npc-mute',
      '--npc-seal',
      '--npc-jade',
      '--npc-btn',
      '--npc-btn-ink',
      '--npc-btn-off',
      '--npc-btn-off-ink',
      '--npc-wash-1',
      '--npc-radius'
    ];

    for (const token of requiredTokens) {
      expect(themeContent).toContain(token);
    }
  });
});
