import { test, expect, openHollywood } from '../fixtures/base.js';

const SCRIPT = [
  ['genre', 'ACTION'], ['setting', 'WILD_WEST'],
  ['protagonist', 'PROTAGONIST_COWBOY'], ['antagonist', 'ANTAGONIST_BANDIT'],
  ['supporting-character', 'SUPPORTINGCHARACTER_SIDEKICK'],
  ['theme-event', 'THEME_TREASURE_HUNT'], ['finale', 'FINALE_ANTAGONIST_GETS_KILLED'],
];

test('TC25-000001 the same balanced script has the same fit and grade for each agency in both Marketing views', async ({ steps, page }) => {
  await openHollywood(steps);
  await page.locator('#applyStartingTagsButton').click();
  await expect(page.locator('#excluded-count')).toHaveText('193');
  await steps.on('marketTab', 'Navigation').click();
  for (const [category, id] of SCRIPT) {
    const select = page.locator(`#inputs-${category}-advertisers select.tag-selector`);
    await select.focus();
    await select.selectOption(id);
  }
  await page.locator('#comScoreInput').fill('5');
  await page.locator('#artScoreInput').fill('5');
  await page.locator('#analyzeMovieButton').click();
  await expect(page.locator('#movieLeanDisplay')).toHaveText('Balanced');
  const cards = page.locator('.advertiser-card');
  await expect(cards).toHaveCount(8);
  const analyzed = await cards.evaluateAll(nodes => nodes.map(node => ({
    name: node.querySelector('.adv-name').textContent.trim(),
    score: node.querySelector('.score-value').textContent.trim(),
    grade: node.querySelector('.score-grade').textContent.trim(),
  })));
  expect(new Set(analyzed.map(entry => entry.name)).size).toBe(8);
  expect(new Set(analyzed.map(entry => entry.score)).size).toBeGreaterThan(1);
  for (const entry of analyzed) {
    expect(Number.isFinite(Number(entry.score))).toBe(true);
    expect(entry.grade).toMatch(/^(A\+?|B\+?|C\+?|D|F)$/);
  }

  await page.locator('#marketing-mode-targeted-button').click();
  for (const [category, id] of SCRIPT) {
    const select = page.locator(`#inputs-${category}-targeted select.tag-selector`);
    await select.focus();
    await select.selectOption(id);
  }
  await expect(page.locator('#globalElementPoolInput')).toHaveValue('5');
  const labels = page.locator('#targeted-advertiser-checkboxes label');
  await expect(labels).toHaveCount(8);
  const lockedNames = await page.locator('#selectors-container-targeted option:checked')
    .allTextContents();
  for (const entry of analyzed) {
    const label = labels.filter({ has: page.locator('span', { hasText: entry.name }) });
    await label.locator('input').check();
    await page.locator('#findCombinationsButton').click();
    const combinations = page.locator('#targetedResultsList .combination-card');
    await expect(combinations.first().locator('.targeted-reasoning')).toContainText(entry.name);
    expect(await combinations.count()).toBeGreaterThan(0);
    for (const combination of await combinations.all()) {
      await expect(combination.locator('.targeted-score-value')).toHaveText(entry.score);
      await expect(combination.locator('.targeted-score-grade')).toHaveText(entry.grade);
      const names = (await combination.locator('.targeted-tag-chip').allTextContents())
        .map(name => name.trim()).sort();
      expect(names).toEqual(lockedNames.map(name => name.trim()).sort());
    }
    await label.locator('input').uncheck();
  }
});
