const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));

  // Setup authentication
  await page.addInitScript(() => {
    localStorage.setItem('jianghu_token', 'mock_token');
    localStorage.setItem('jianghu_user', JSON.stringify({id: 'mock_user', username: 'Mock User', avatar: ''}));
  });

  for (const slot of [1, 2, 3, 4]) {
    console.log(`\nTesting with current slots = ${slot}`);

    // Unroute previous handlers just in case
    await page.unroute('**/api/player/assets');

    await page.route('**/api/player/assets', async route => {
      console.log('Intercepted API call for slot:', slot);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          assets: [],
          assetSlots: slot
        }),
        headers: {
          'Access-Control-Allow-Origin': '*'
        }
      });
    });

    await page.goto('http://localhost:3000/assets');
    await page.waitForLoadState('networkidle');

    // Wait a moment for React state to settle
    await page.waitForTimeout(1000);

    const button = page.locator('button:has-text("Slot Lahan")');
    if (await button.isVisible()) {
      await button.click();
      await page.waitForTimeout(1000); // wait for modal to animate
      await page.screenshot({ path: `../../verification/assets_modal_prod_slot${slot}.png` });
      console.log(`Saved screenshot for slot ${slot}`);
    } else {
      console.log('Button not visible!');
    }
  }

  await browser.close();
})();
