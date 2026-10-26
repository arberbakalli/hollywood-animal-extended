import { test, expect, openHollywood } from '../fixtures/base.js';

for (const width of [1280, 390]) {
  test(`TC38-000001 Locked Elements headings and initial story hint agree at ${width}px`, async ({ steps, page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    const response = await page.request.get('/index.html');
    expect(response.ok()).toBe(true);
    const initialHint = (await response.text()).match(/<p id="genTagsRequiredDisplay"[^>]*>([\s\S]*?)<\/p>/)[1];
    expect(initialHint.trim()).toBe('Requires ~5 Story Elements (excluding Genre &amp; Setting).');
    await openHollywood(steps);
    await expect(page.locator('#genTagsRequiredDisplay'))
      .toHaveText('Requires ~5 Story Elements (excluding Genre & Setting).');

    const contexts = [
      ['buildTab', 'Navigation', '#generator-locked-header .collapsible-title', 'Locked Elements'],
      ['evaluateTab', 'Navigation', '#graves-builder-header h3', 'Locked Elements'],
      ['marketTab', 'Navigation', '#advertisers-builder-header h3', 'Locked Elements'],
      ['buildForTargetModeButton', 'MarketingRelease', '.targeted-tag-builder .targeted-field-label', 'Locked Elements (Optional)'],
    ];
    for (const [button, section, selector, title] of contexts) {
      await steps.on(button, section).click();
      const heading = page.locator(selector);
      await expect(heading).toBeVisible();
      await expect(heading).toHaveText(title);
      await heading.scrollIntoViewIfNeeded();
      const bounds = await heading.boundingBox();
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
      await page.screenshot({ path: testInfo.outputPath(`${button}-${width}.png`) });
    }
  });
}
