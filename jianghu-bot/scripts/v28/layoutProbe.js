/**
 * Automated Layout & Anti-AI-Slop Probe (V29)
 * Verifies DOM layout, non-overlapping bounding boxes, WCAG contrast, Indonesian localization, and styling tokens.
 */

const fs = require('fs');
const path = require('path');

const targetArg = process.argv[2] || process.env.PREVIEW_URL || 'http://localhost:3100';
const PREVIEW_URL = targetArg.includes('/dev/npc-preview')
  ? targetArg
  : `${targetArg.replace(/\/$/, '')}/dev/npc-preview`;

const RAW_DIR = path.resolve(__dirname, '../../review/v29_raw');
const RAW_OUTPUT_PATH = path.join(RAW_DIR, 'layout_probe.json');

const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'desktop', width: 1440, height: 900 }
];

const VIEWS = ['dialogue', 'profile'];

const FORBIDDEN_ENGLISH_WORDS = [
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

async function runLayoutProbe() {
  console.log(`[LAYOUT-PROBE V29] Initializing Playwright against ${PREVIEW_URL}...`);
  fs.mkdirSync(RAW_DIR, { recursive: true });

  let playwright;
  try {
    playwright = require('playwright');
  } catch (err) {
    console.error('[LAYOUT-PROBE ERROR] Playwright module not found. Exiting with code 1.');
    process.exit(1);
  }

  let browser;
  try {
    try {
      browser = await playwright.chromium.launch({ headless: true });
    } catch (e1) {
      try {
        browser = await playwright.chromium.launch({ headless: true, channel: 'chrome' });
      } catch (e2) {
        browser = await playwright.chromium.launch({ headless: true, channel: 'msedge' });
      }
    }
  } catch (err) {
    console.error(`[LAYOUT-PROBE ERROR] Failed to launch Chromium/Chrome: ${err.message}. Exiting with code 1.`);
    process.exit(1);
  }

  const results = [];
  let totalViolations = 0;

  try {
    for (const view of VIEWS) {
      for (const vp of VIEWPORTS) {
        const url = `${PREVIEW_URL}?view=${view}`;
        console.log(`\n--- Testing [${view}] at viewport ${vp.name} (${vp.width}x${vp.height}) ---`);

        const context = await browser.newContext({
          viewport: { width: vp.width, height: vp.height }
        });
        const page = await context.newPage();

        try {
          await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
          // Wait for [data-npc-root] selector up to 30s
          await page.waitForSelector('[data-npc-root]', { timeout: 30000 });
          // Wait 1.5s for layout stabilization and typewriter completion
          await page.waitForTimeout(1500);

          // Take screenshot according to naming convention
          const screenshotName = `${view === 'dialogue' ? 'dlg' : 'prof'}_${vp.name}.png`;
          const screenshotPath = path.join(RAW_DIR, screenshotName);
          await page.screenshot({ path: screenshotPath, fullPage: true });
          console.log(`Screenshot saved to ${screenshotName}`);

          const evaluation = await page.evaluate(({ vpWidth, vpHeight, viewName, forbiddenWords }) => {
            const violations = [];

            // P3 check container presence
            const root = document.querySelector('[data-npc-root]');
            if (!root) {
              violations.push('P3: Missing [data-npc-root] container on screen');
              return { violations, checkCount: 1 };
            }

            // P1: No emoji matching Extended_Pictographic in root text
            const emojiRegex = /\p{Extended_Pictographic}/u;
            const textContent = root.textContent || '';
            if (emojiRegex.test(textContent)) {
              violations.push('P1: Found raw emoji/Extended_Pictographic in visible UI text');
            }

            // P2: No horizontal scroll
            if (document.documentElement.scrollWidth > window.innerWidth) {
              violations.push(`P2: Horizontal overflow detected: scrollWidth (${document.documentElement.scrollWidth}) > innerWidth (${window.innerWidth})`);
            }

            // P3: Covers screen
            const rootRect = root.getBoundingClientRect();
            if (rootRect.width < window.innerWidth || rootRect.height < window.innerHeight) {
              violations.push(`P3: [data-npc-root] does not fully cover screen (${rootRect.width}x${rootRect.height} vs ${window.innerWidth}x${window.innerHeight})`);
            }

            // P10: elementFromPoint at (5,5) and (lebar-5, tinggi-5) belongs to [data-npc-root]
            const elTopLeft = document.elementFromPoint(5, 5);
            const elBottomRight = document.elementFromPoint(window.innerWidth - 5, window.innerHeight - 5);
            if (!elTopLeft || !elTopLeft.closest('[data-npc-root]')) {
              violations.push(`P10: Top-left point (5,5) is not inside [data-npc-root] (found: ${elTopLeft ? elTopLeft.tagName : 'null'})`);
            }
            if (!elBottomRight || !elBottomRight.closest('[data-npc-root]')) {
              violations.push(`P10: Bottom-right point (${window.innerWidth - 5}, ${window.innerHeight - 5}) is not inside [data-npc-root] (found: ${elBottomRight ? elBottomRight.tagName : 'null'})`);
            }

            // P4: No overlapping text leaf elements
            function getVisibleLeafTextNodes(el) {
              const leaves = [];
              const walker = document.createTreeWalker(el, NodeFilter.SHOW_ELEMENT);
              let curr = walker.nextNode();
              while (curr) {
                let hasDirectText = false;
                for (const child of curr.childNodes) {
                  if (child.nodeType === Node.TEXT_NODE && child.textContent.trim().length > 0) {
                    hasDirectText = true;
                    break;
                  }
                }
                if (hasDirectText) {
                  const style = window.getComputedStyle(curr);
                  const r = curr.getBoundingClientRect();
                  if (style.display !== 'none' && style.visibility !== 'hidden' && r.width > 0 && r.height > 0) {
                    leaves.push({ el: curr, rect: r, text: curr.textContent.trim() });
                  }
                }
                curr = walker.nextNode();
              }
              return leaves;
            }

            const textNodes = getVisibleLeafTextNodes(root);
            for (let i = 0; i < textNodes.length; i++) {
              for (let j = i + 1; j < textNodes.length; j++) {
                const a = textNodes[i];
                const b = textNodes[j];
                if (a.el.contains(b.el) || b.el.contains(a.el)) continue;

                const xOverlap = Math.max(0, Math.min(a.rect.right, b.rect.right) - Math.max(a.rect.left, b.rect.left));
                const yOverlap = Math.max(0, Math.min(a.rect.bottom, b.rect.bottom) - Math.max(a.rect.top, b.rect.top));
                const area = xOverlap * yOverlap;

                if (area > 4) {
                  violations.push(`P4: Overlapping text detected between "${a.text.slice(0, 15)}" and "${b.text.slice(0, 15)}" (overlap area: ${area.toFixed(1)}px²)`);
                }
              }
            }

            // P5: No clipped text without ellipsis
            const allElements = root.querySelectorAll('*');
            for (const el of allElements) {
              const style = window.getComputedStyle(el);
              if (style.overflow === 'hidden' || style.overflowX === 'hidden' || style.overflow === 'clip') {
                if (el.scrollWidth > el.clientWidth + 2 && !el.hasAttribute('data-ellipsis') && style.textOverflow !== 'ellipsis') {
                  if (el.textContent && el.textContent.trim().length > 3) {
                    violations.push(`P5: Clipped text without ellipsis on <${el.tagName.toLowerCase()}> with text "${el.textContent.trim().slice(0, 20)}..."`);
                  }
                }
              }
            }

            // P6, P7, P8, P12: Buttons checks
            function parseColor(str) {
              const m = str.match(/\d+/g);
              if (!m || m.length < 3) return [0, 0, 0];
              return [parseInt(m[0]), parseInt(m[1]), parseInt(m[2])];
            }

            function getLuminance(rgb) {
              const a = rgb.map(v => {
                v /= 255;
                return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
              });
              return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
            }

            function getContrastRatio(fgRgb, bgRgb) {
              const l1 = getLuminance(fgRgb);
              const l2 = getLuminance(bgRgb);
              const lighter = Math.max(l1, l2);
              const darker = Math.min(l1, l2);
              return (lighter + 0.05) / (darker + 0.05);
            }

            const buttons = root.querySelectorAll('button');
            for (const btn of buttons) {
              const style = window.getComputedStyle(btn);
              const r = btn.getBoundingClientRect();
              if (style.display === 'none' || style.visibility === 'hidden' || r.width === 0) continue;

              // P7: Forbidden button styling
              if (style.backdropFilter && style.backdropFilter !== 'none') {
                violations.push(`P7: Forbidden backdrop-filter on button: ${style.backdropFilter}`);
              }
              if (style.boxShadow && style.boxShadow !== 'none') {
                const blurMatch = style.boxShadow.match(/(\d+)px/g);
                if (blurMatch && blurMatch[2] && parseInt(blurMatch[2]) > 12) {
                  violations.push(`P7: Glowing box-shadow with blur > 12px on button: ${style.boxShadow}`);
                }
              }
              const radiusVal = parseInt(style.borderRadius) || 0;
              if (radiusVal > 8 && !btn.hasAttribute('data-dot')) {
                violations.push(`P7: Button border radius ${radiusVal}px exceeds 8px`);
              }

              // P8: Minimum touch sizing
              const minHeight = vpWidth < 640 ? 30 : 26;
              if (r.height < minHeight) {
                violations.push(`P8: Button height ${r.height.toFixed(1)}px is smaller than min ${minHeight}px for viewport ${vpWidth}`);
              }

              // P6: Contrast ratio >= 2.5
              const fg = parseColor(style.color);
              const bg = parseColor(style.backgroundColor);
              const ratio = getContrastRatio(fg, bg);
              if (ratio < 2.5 && !btn.disabled) {
                violations.push(`P6: Low button contrast ratio ${ratio.toFixed(2)} on button "${btn.textContent.trim().slice(0, 15)}"`);
              }

              // P12: Check no button has background rgb(207, 207, 207)
              if (style.backgroundColor === 'rgb(207, 207, 207)' || (bg[0] === 207 && bg[1] === 207 && bg[2] === 207)) {
                violations.push(`P12: Button "${btn.textContent.trim().slice(0, 15)}" has forbidden gray background rgb(207, 207, 207)`);
              }
            }

            // P9: Dialog role attribute
            const dialog = root.getAttribute('role') === 'dialog' ? root : root.querySelector('[role="dialog"]');
            if (!dialog) {
              violations.push('P9: Missing [role="dialog"] attribute on NPC scene container');
            }

            // P11: English forbidden terms check on root text
            const fullText = root.innerText || root.textContent || '';
            for (const fw of forbiddenWords) {
              const regex = new RegExp(`\\b${fw}\\b`, 'i');
              if (regex.test(fullText)) {
                violations.push(`P11: Found forbidden English text "${fw}" in NPC view`);
              }
            }

            return {
              violations,
              buttonCount: buttons.length,
              textNodesCount: textNodes.length
            };
          }, { vpWidth: vp.width, vpHeight: vp.height, viewName: view, forbiddenWords: FORBIDDEN_ENGLISH_WORDS });

          console.log(`Evaluated ${evaluation.textNodesCount} text nodes, ${evaluation.buttonCount} buttons.`);
          if (evaluation.violations.length === 0) {
            console.log(`✓ [${view} @ ${vp.name}] PASSED: 0 violations.`);
          } else {
            console.error(`✗ [${view} @ ${vp.name}] ${evaluation.violations.length} violations:`);
            evaluation.violations.forEach(v => console.error(`  - ${v}`));
            totalViolations += evaluation.violations.length;
          }

          results.push({
            view,
            viewport: vp.name,
            dimensions: `${vp.width}x${vp.height}`,
            violations: evaluation.violations,
            status: evaluation.violations.length === 0 ? 'PASS' : 'FAIL'
          });
        } catch (pageErr) {
          console.error(`[LAYOUT-PROBE ERROR] Test failed for ${url}: ${pageErr.message}`);
          results.push({
            view,
            viewport: vp.name,
            dimensions: `${vp.width}x${vp.height}`,
            violations: [`Page error: ${pageErr.message}`],
            status: 'FAIL'
          });
          totalViolations++;
        } finally {
          await context.close();
        }
      }
    }
  } finally {
    await browser.close();
  }

  const finalReport = {
    status: totalViolations === 0 ? 'PASS' : 'FAIL',
    totalViolations,
    combinationsTested: results.length,
    results,
    timestamp: new Date().toISOString()
  };

  fs.writeFileSync(RAW_OUTPUT_PATH, JSON.stringify(finalReport, null, 2));

  console.log(`\n======================================================`);
  console.log(`[LAYOUT-PROBE COMPLETE] Total Violations: ${totalViolations}`);
  console.log(`Report written to ${RAW_OUTPUT_PATH}`);
  console.log(`======================================================`);

  if (totalViolations > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runLayoutProbe().catch(err => {
  console.error('[FATAL PROBE ERROR]', err);
  process.exit(1);
});
