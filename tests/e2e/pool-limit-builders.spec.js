import { test, expect, openHollywood } from '../fixtures/base.js';

// Owner ruling 2026-10-09: Colman Graves' Evaluate Script and Marketing & Release's Analyze Script follow
// the Max Element Pool like every other builder (GAME_RULES section 2).
const SCRIPT = [
  ['genre', 'ACTION'], ['setting', 'WILD_WEST'], ['protagonist', 'PROTAGONIST_COWBOY'],
  ['antagonist', 'ANTAGONIST_BANDIT'], ['supporting-character', 'SUPPORTINGCHARACTER_SIDEKICK'],
  ['theme-event', 'THEME_TREASURE_HUNT'], ['finale', 'FINALE_ANTAGONIST_GETS_KILLED'],
];
const SIXTH = 'THEME_LOVE_TRIANGLE';

async function setPool(page, value) {
  await page.locator('#globalElementPoolInput').fill(String(value));
  await page.locator('#globalElementPoolInput').press('Tab');
  await expect(page.locator('#globalElementPoolInput')).toHaveValue(String(value));
}

async function buildSix(page, context) {
  for (const [category, id] of SCRIPT) {
    await page.locator(`#inputs-${category}-${context} select.tag-selector`).first().selectOption(id);
  }
  await page.locator(`#add-theme-event-${context}-button`).click();
  await page.locator(`#inputs-theme-event-${context} select.tag-selector`).first().selectOption(SIXTH);
}

test('TC20-000012 Evaluate refuses six story elements at pool 5 and evaluates them at pool 6', async ({ steps, page }) => {
  await openHollywood(steps);
  await page.locator('#tab-evaluate-button').click();
  await buildSix(page, 'graves');
  await setPool(page, 5);
  await page.locator('#evaluateGravesButton').click();
  await expect(page.locator('#gravesFeedbackMessage')).toContainText('Max Element Pool is set to 5, but you selected 6');
  await expect(page.locator('#results-graves')).toBeHidden();

  await setPool(page, 6);
  await page.locator('#evaluateGravesButton').click();
  await expect(page.locator('#results-graves')).toBeVisible();
  await expect(page.locator('#gravesFeedbackMessage')).not.toContainText('Max Element Pool');
});

test('TC20-000013 Analyze accepts a script exactly at the pool and refuses one above it', async ({ steps, page }) => {
  await openHollywood(steps);
  await page.locator('#tab-advertisers-button').click();
  await buildSix(page, 'advertisers');
  await setPool(page, 6);
  await page.locator('#analyzeMovieButton').click();
  await expect(page.locator('#results-advertisers')).toBeVisible();

  await setPool(page, 5);
  await page.locator('#analyzeMovieButton').click();
  await expect(page.locator('#advertisersFeedbackMessage')).toContainText('Max Element Pool is set to 5, but you selected 6');
  await expect(page.locator('#results-advertisers')).toBeHidden();
});
