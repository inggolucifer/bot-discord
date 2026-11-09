/**
 * Anti-Slop Scanner (V30)
 * Scans web-dashboard/src/components/npc/*.tsx for disallowed UI tokens.
 */
const fs = require('fs');
const path = require('path');

const targetDir = path.resolve(__dirname, '../../web-dashboard/src/components/npc');

if (!fs.existsSync(targetDir)) {
  console.error('[ANTISLOP ERROR] Directory not found:', targetDir);
  process.exit(1);
}

const files = fs.readdirSync(targetDir).filter(f => f.endsWith('.tsx'));
const violations = [];

const EMOJI_REGEX = /\p{Extended_Pictographic}/u;
const ROUNDED_REGEX = /\brounded-(?:xl|2xl|3xl)\b/;
const BLUR_CLASS_REGEX = /\b(?:backdrop-blur|blur-)\S*/;
const SHADOW_COLOR_REGEX = /shadow-\[[^\]]*(?:#[0-9a-fA-F]{3,8}|rgba?|hsla?)[^\]]*\]/;
const FENG_SHUI_REGEX = /feng\s*shui/i;

for (const file of files) {
  const filePath = path.join(targetDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    const lineNum = index + 1;
    const trimmed = line.trim();

    if (EMOJI_REGEX.test(trimmed)) {
      violations.push({ file, lineNum, rule: 'Emoji', text: trimmed });
    }
    if (line.includes('backdrop-blur') || BLUR_CLASS_REGEX.test(trimmed)) {
      violations.push({ file, lineNum, rule: 'Blur class', text: trimmed });
    }
    if (SHADOW_COLOR_REGEX.test(trimmed)) {
      violations.push({ file, lineNum, rule: 'Colored shadow', text: trimmed });
    }
    if (trimmed.includes('bg-gradient')) {
      violations.push({ file, lineNum, rule: 'bg-gradient', text: trimmed });
    }
    if (/linear-gradient\(/i.test(trimmed)) {
      // Check if it's within maskImage / mask-image / WebkitMaskImage context
      const prevLine = index > 0 ? lines[index - 1] : '';
      const isMask = /mask(?:Image|-image)/i.test(trimmed) || /mask(?:Image|-image)/i.test(prevLine);
      if (!isMask) {
        violations.push({ file, lineNum, rule: 'Disallowed linear-gradient', text: trimmed });
      }
    }
    if (ROUNDED_REGEX.test(trimmed)) {
      violations.push({ file, lineNum, rule: 'rounded-xl/2xl/3xl', text: trimmed });
    }
    if (FENG_SHUI_REGEX.test(trimmed)) {
      violations.push({ file, lineNum, rule: 'Feng Shui', text: trimmed });
    }
  });
}

if (violations.length > 0) {
  console.error(`[ANTISLOP FAILED] Found ${violations.length} violations:`);
  violations.forEach(v => {
    console.error(`  - ${v.file}:${v.lineNum} [${v.rule}]: ${v.text}`);
  });
  process.exit(1);
} else {
  console.log(`[ANTISLOP PASSED] All ${files.length} NPC components are clean of slop tokens.`);
  process.exit(0);
}
