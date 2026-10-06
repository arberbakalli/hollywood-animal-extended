import { test, expect, openHollywood } from '../fixtures/base.js';

// Between 801 and 1100px the header's controls ran past the right edge: the
// Testing Features link (and at 801px the language picker) made the whole page
// scroll sideways by up to 234px (review 2026-10-06, R12).
test('TC36-000001 the header fits every width without sideways scrolling', async ({ steps, page }) => {
  for (const width of [1366, 1280, 1100, 1024, 900, 801, 800, 768, 600, 390]) {
    await page.setViewportSize({ width, height: 800 });
    await openHollywood(steps);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `sideways scroll at ${width}px`).toBe(0);
    for (const id of ['#testingFeaturesLink', '#language-controls', '#global-element-pool-control']) {
      const right = await page.locator(id).evaluate(node => node.getBoundingClientRect().right);
      expect(right, `${id} inside the viewport at ${width}px`).toBeLessThanOrEqual(width);
    }
  }
});
