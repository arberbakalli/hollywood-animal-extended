import { test, expect, openHollywood } from '../fixtures/base.js';

for (const context of ['generator', 'graves', 'advertisers', 'targeted']) {
  test(`TC29-000001 ${context}: clearing a Genre share leaves a valid 100-percent mix`, async ({ steps, page }) => {
    await openHollywood(steps);
    if (context === 'graves') await page.locator('#tab-evaluate-button').click();
    if (context === 'advertisers' || context === 'targeted') {
      await steps.on('marketTab', 'Navigation').click();
    }
    if (context === 'targeted') await page.locator('#marketing-mode-targeted-button').click();

    const group = page.locator(`#inputs-genre-${context}`);
    const first = group.locator('select.tag-selector').first();
    await first.focus();
    await first.selectOption('ACTION');
    await page.locator(`#add-genre-${context}-button`).click();
    const empty = group.locator('select.tag-selector')
      .filter({ has: page.locator('option:checked[value=""]') });
    await empty.focus();
    await empty.selectOption('COMEDY');

    const action = group.locator('[data-role="tag-selector-row"]')
      .filter({ has: page.locator('option:checked[value="ACTION"]') });
    await action.locator('.percent-input').fill('');
    await action.locator('.percent-input').press('Tab');

    const shares = await group.locator('.percent-input')
      .evaluateAll(inputs => inputs.map(input => input.valueAsNumber));
    expect(shares).toHaveLength(2);
    for (const share of shares) {
      expect(Number.isFinite(share)).toBe(true);
      expect(share).toBeGreaterThanOrEqual(5);
      expect(share % 5).toBe(0);
    }
    expect(shares.reduce((sum, share) => sum + share, 0)).toBe(100);

    const selected = await page.evaluate(ctx => collectTagInputs(ctx), context);
    const genres = selected.filter(tag => tag.category === 'Genre');
    expect(genres.map(tag => tag.id).sort()).toEqual(['ACTION', 'COMEDY']);
    expect(genres.reduce((sum, genre) => sum + genre.percent, 0)).toBe(1);
  });
}
