import { test, expect, openHollywood } from '../fixtures/base.js';

test('TC30-000001 Analyze Script ranks displayed advertisers by descending fit', async ({ steps, page }) => {
  await openHollywood(steps);
  await steps.on('marketTab', 'Navigation').click();
  const protagonist = page.locator('#inputs-protagonist-advertisers select.tag-selector');
  await protagonist.focus();
  await protagonist.selectOption('PROTAGONIST_COWBOY');
  await page.locator('#analyzeMovieButton').click();

  const cards = page.locator('#results-advertisers .advertiser-card');
  await expect(cards).toHaveCount(8);
  const scores = (await cards.locator('.score-value').allTextContents()).map(Number);
  expect(scores.every(Number.isFinite)).toBe(true);
  expect(new Set(scores).size).toBeGreaterThan(1);
  expect(scores).toEqual([...scores].sort((a, b) => b - a));
});
