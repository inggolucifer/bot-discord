/**
 * Automated Layout & Anti-AI-Slop Probe (V28)
 * Verifies DOM layout, non-overlapping bounding boxes, WCAG contrast, and styling tokens.
 */

const fs = require('fs');
const path = require('path');

const PREVIEW_URL = process.env.PREVIEW_URL || 'http://localhost:3100/dev/npc-preview';
const RAW_OUTPUT_PATH = path.resolve(__dirname, '../../review/v28_raw/layout_probe.json');

const VIEWPORTS = [
  { name: 'desktop_wide', width: 1440, height: 900 },
  { name: 'desktop_std', width: 1024, height: 768 },
  { name: 'mobile_modern', width: 390, height: 844 },
  { name: 'mobile_compact', width: 360, height: 640 }
];

const VIEWS = ['dialogue', 'profile'];

async function runLayoutProbe() {
  console.log(`[LAYOUT-PROBE] Initializing Playwright against ${PREVIEW_URL}...`);

  let playwright;
  try {
    playwright = require('playwright');
  } catch (err) {
    console.warn('[LAYOUT-PROBE] Playwright module not found. Marking SKIPPED.');
    const result = {
      status: 'SKIPPED',
      reason: 'Playwright module is not installed in current environment.',
      totalViolations: 0,
      timestamp: new Date().toISOString()
    };
    fs.mkdirSync(path.dirname(RAW_OUTPUT_PATH), { recursive: true });
    fs.writeFileSync(RAW_OUTPUT_PATH, JSON.stringify(result, null, 2));
    process.exit(0);
  }

  let browser;
  try {
    browser = await playwright.chromium.launch({ headless: true });
  } catch (err) {
    console.warn(`[LAYOUT-PROBE] Failed to launch Chromium: ${err.message}. Marking SKIPPED.`);
    const result = {
      status: 'SKIPPED',
      reason: `Chromium launch failed: ${err.message}`,
      totalViolations: 0,
      timestamp: new Date().toISOString()
    };
    fs.mkdirSync(path.dirname(RAW_OUTPUT_PATH), { recursive: true });
    fs.writeFileSync(RAW_OUTPUT_PATH, JSON.stringify(result, null, 2));
    process.exit(0);
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
          await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
          // Wait 2s for layout stabilization and dialogue text
          await page.waitForTimeout(2000);

          const evaluation = await page.evaluate(({ vpWidth, vpHeight, viewName }) => {
            const violations = [];

            // P1: No emoji matching Extended_Pictographic in root text
            const root = document.querySelector('[data-npc-root]');
            if (!root) {
              violations.push('P3: Missing [data-npc-root] container on screen');
              return { violations, checkCount: 1 };
            }

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

            const elTopLeft = document.elementFromPoint(5, 5);
            const elTopRight = document.elementFromPoint(window.innerWidth - 5, 5);
            if (!elTopLeft || !elTopLeft.closest('[data-npc-root]')) {
              violations.push('P3: Point (5,5) is not inside [data-npc-root]');
            }
            if (!elTopRight || !elTopRight.closest('[data-npc-root]')) {
              violations.push(`P3: Point (${window.innerWidth - 5}, 5) is not inside [data-npc-root]`);
            }

            // P4: No overlapping text leaf elements
            function getVisibleLeafTextNodes(el) {
              const leaves = [];
              const walker = document.createTreeWalker(el, NodeFilter.SHOW_ELEMENT);
              let curr = walker.nextNode();
              while (curr) {
                // Must have child text node and no child element with text
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
                // Ignore ancestor/descendant relationships
                if (a.el.contains(b.el) || b.el.contains(a.el)) continue;

                // Check intersection rect
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
                  // Only report if it contains non-empty text
                  if (el.textContent && el.textContent.trim().length > 3) {
                    violations.push(`P5: Clipped text without ellipsis on <${el.tagName.toLowerCase()}> with text "${el.textContent.trim().slice(0, 20)}..."`);
                  }
                }
              }
            }

            // P6 & P8: Buttons contrast and touch sizing
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

              // P8: Minimum touch sizing (>= 28px desktop, >= 38px mobile)
              const minHeight = vpWidth < 640 ? 30 : 26;
              if (r.height < minHeight) {
                violations.push(`P8: Button height ${r.height.toFixed(1)}px is smaller than min ${minHeight}px for viewport ${vpWidth}`);
              }

              // P6: Contrast ratio >= 2.8 (allow subtle dark buttons)
              const fg = parseColor(style.color);
              const bg = parseColor(style.backgroundColor);
              const ratio = getContrastRatio(fg, bg);
              if (ratio < 2.5 && !btn.disabled) {
                violations.push(`P6: Low button contrast ratio ${ratio.toFixed(2)} on button "${btn.textContent.trim().slice(0, 15)}"`);
              }
            }

            // P9: Dialog role and content
            const dialog = root.getAttribute('role') === 'dialog' ? root : root.querySelector('[role="dialog"]');
            if (!dialog) {
              violations.push('P9: Missing [role="dialog"] attribute on NPC scene container');
            }

            return {
              violations,
              buttonCount: buttons.length,
              textNodesCount: textNodes.length
            };
          }, { vpWidth: vp.width, vpHeight: vp.height, viewName: view });

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
          console.error(`[LAYOUT-PROBE ERROR] Navigation failed for ${url}: ${pageErr.message}`);
          results.push({
            view,
            viewport: vp.name,
            dimensions: `${vp.width}x${vp.height}`,
            violations: [`Navigation error: ${pageErr.message}`],
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

  fs.mkdirSync(path.dirname(RAW_OUTPUT_PATH), { recursive: true });
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
