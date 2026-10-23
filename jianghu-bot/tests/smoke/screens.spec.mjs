/**
 * tests/smoke/screens.spec.mjs
 * Fase C Smoke Test Suite: 12 Major Jianghu Dashboard Screens
 * Validates zero unhandled console errors, zero page crashes, and healthy responses.
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.DASHBOARD_URL || 'http://localhost:3000';

const SCREENS = [
  { name: '1. Peta Dunia Makro', path: '/world' },
  { name: '2. Mikro-Grid Eksplorasi', path: '/world?mode=grid' },
  { name: '3. Interior Properti / Bangunan', path: '/world?view=interior' },
  { name: '4. Panorama Pemukiman (Xingcun)', path: '/world?settlement=Desa%20Xingcun' },
  { name: '5. Lembar Status Pendekar (Profile)', path: '/profile' },
  { name: '6. Tas Inventori & Gudang', path: '/inventory' },
  { name: '7. Pasar & Pelelangan', path: '/market' },
  { name: '8. Balai Sekte & Ujian Masuk', path: '/sect' },
  { name: '9. Labirin Gua Kuno (Dungeon)', path: '/dungeon' },
  { name: '10. Dermaga Penyeberangan Feri', path: '/ferry' },
  { name: '11. Barter Antar Pemain', path: '/barter' },
  { name: '12. Pohon Kemahiran & Kungfu', path: '/cultivation' }
];

test.describe('Dashboard Smoke Audit (12 Major Screens)', () => {
  for (const screen of SCREENS) {
    test(`Screen Audit: ${screen.name}`, async ({ page }) => {
      const consoleErrors = [];
      const failedRequests = [];

      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      page.on('pageerror', error => {
        consoleErrors.push(error.message);
      });

      page.on('response', res => {
        if (res.status() >= 500) {
          failedRequests.push(`${res.url()} [${res.status()}]`);
        }
      });

      // Navigate to target screen
      const response = await page.goto(`${BASE_URL}${screen.path}`, {
        waitUntil: 'domcontentloaded',
        timeout: 15000
      });

      expect(response).toBeTruthy();
      expect(response.status()).toBeLessThan(500);

      // Wait 1.5 seconds for React hydration and micro-interactions
      await page.waitForTimeout(1500);

      // Check for zero server errors (5xx)
      expect(failedRequests).toEqual([]);

      // Filter out non-fatal or expected third-party noise if any
      const fatalErrors = consoleErrors.filter(err =>
        !err.includes('favicon.ico') &&
        !err.includes('AudioContext') &&
        !err.includes('ERR_CONNECTION_REFUSED')
      );

      expect(fatalErrors).toEqual([]);
    });
  }
});
