import { test, expect, openHollywood } from '../fixtures/base.js';

for (const [commercial, artistic, lean, sparkScore] of [
  // One decimal, rounded half up (owner ruling 2026-10-01, edit approved).
  [5, 5, 'Balanced', '3.0'],
  [8, 5, 'Commercial', '3.3'],
  [5, 8, 'Artistic', '2.8'],
]) {
  test(`TC23-000001 ${lean} movie lean is displayed above advertisers and changes specialist fit`, async ({ steps, page }) => {
    await openHollywood(steps);
    await steps.on('marketTab', 'Navigation').click();
    const protagonist = page.locator('#inputs-protagonist-advertisers select');
    await protagonist.focus();
    await protagonist.selectOption('PROTAGONIST_COWBOY');
    await page.locator('#comScoreInput').fill(String(commercial));
    await page.locator('#artScoreInput').fill(String(artistic));
    await page.locator('#analyzeMovieButton').click();
    const leanDisplay = page.locator('#movieLeanDisplay');
    await expect(leanDisplay).toHaveText(lean);
    const cards = page.locator('.advertiser-card');
    await expect(cards).toHaveCount(8);
    // Cowboy's YM/YF/AM/AF weights are 5/2/4/1: Spark starts at 3.00,
    // with the app's established +0.25 / -0.20 specialist adjustment.
    await expect(cards.filter({ has: page.locator('.adv-name', { hasText: /^Spark$/ }) })
      .locator('.score-value')).toHaveText(sparkScore);
    // Both boxes in one frame: Analyze smooth-scrolls, and two separate reads
    // mid-scroll disagree (owner-approved measurement change, 2026-10-06).
    const { leanBottom, cardTop } = await page.evaluate(() => ({
      leanBottom: document.getElementById('movieLeanDisplay').getBoundingClientRect().bottom,
      cardTop: document.querySelector('.advertiser-card').getBoundingClientRect().top,
    }));
    expect(cardTop).toBeGreaterThanOrEqual(leanBottom);
  });
}

test('TC23-000002 Graves-to-Marketing transfer preserves unequal genres and conflict-driven zero scores', async ({ steps, page }) => {
  await openHollywood(steps);
  await steps.on('evaluateTab', 'Navigation').click();
  const tags = [
    { id: 'ACTION', category: 'Genre', percent: 0.8 },
    { id: 'COMEDY', category: 'Genre', percent: 0.2 },
    ...[
      ['FANTASY_KINGDOM', 'Setting'], ['PROTAGONIST_OUTCAST', 'Protagonist'],
      ['ANTAGONIST_ROBBER_WITH_A_HUNDRED_DICKS', 'Antagonist'], ['FINALE_COUPLE_GETS_MARRIED', 'Finale'],
      ['SUPPORTINGCHARACTER_FEMME_FATALE', 'Supporting Character'],
      ['SUPPORTINGCHARACTER_LOVE_INTEREST', 'Supporting Character'],
    ].map(([id, category]) => ({ id, category, percent: 1 })),
  ];
  await page.evaluate(tags => restoreSelection('graves', tags), tags);
  await page.locator('#evaluateGravesButton').click();
  await expect(page.locator('#gravesTotalComScore')).toHaveText('0');
  await expect(page.locator('#gravesTotalArtScore')).toHaveText('0');
  await page.locator('#transferGravesTagsButton').click();
  await expect(page.locator('#tab-advertisers')).toBeVisible();
  await expect(page.locator('#results-advertisers')).toBeVisible();
  const transferred = await page.evaluate(() => collectTagInputs('advertisers'));
  expect(transferred.sort((a, b) => a.id.localeCompare(b.id)))
    .toEqual(tags.sort((a, b) => a.id.localeCompare(b.id)));
  await expect(page.locator('#comScoreInput')).toHaveValue('0');
  await expect(page.locator('#artScoreInput')).toHaveValue('0');
});
