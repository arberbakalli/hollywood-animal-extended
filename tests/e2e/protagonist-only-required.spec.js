import { test, expect, openHollywood } from '../fixtures/base.js';

// Reported 2026-10-08: pool 6 with five locked Theme & Event elements was refused
// with "Every script needs a Protagonist, an Antagonist and a Finale". Only the
// Protagonist is required (GAME_RULES.md section 1), so Generate must find one.
const THEMES = ['THEME_WAR_WITH_SORCERERS', 'THEME_AVENGING_LOVED_ONES', 'THEME_STRUGGLE_FOR_BETTER_LIFE',
  'EVENTS_SAVING_BELOVED', 'THEME_ALCOHOL_FREEDOM'];

test('TC01-000055 five locked Theme & Event elements at pool 6 generate scripts that each add a Protagonist', async ({ steps, page }) => {
  await openHollywood(steps);
  await steps.on('buildTab', 'Navigation').click();
  await page.locator('#globalElementPoolInput').fill('6');
  await page.locator('#globalElementPoolInput').press('Tab');
  await expect(page.locator('#genScoreInput')).toHaveValue('6');

  const rows = page.locator('#inputs-theme-event-generator select.tag-selector');
  for (let i = 0; i < THEMES.length; i++) {
    if (i > 0) await page.locator('#add-theme-event-generator-button').click();
    await rows.first().selectOption(THEMES[i]);
  }
  expect((await rows.evaluateAll(selects => selects.map(s => s.value))).sort()).toEqual([...THEMES].sort());

  await page.locator('#generateScriptsButton').click();

  await expect(page.locator('#generatorResultsList .gen-card').first()).toBeVisible({ timeout: 20000 });
  await expect(page.locator('#generatorFeedbackMessage')).not.toContainText('Every script needs');
  const cards = await page.evaluate(() => (globalThis.generatedScriptsCache || []).map(script => script.tags));
  expect(cards.length).toBeGreaterThan(0);
  for (const tags of cards) {
    const ids = tags.map(tag => tag.id);
    expect(ids).toEqual(expect.arrayContaining(THEMES));
    expect(tags.filter(tag => tag.category === 'Protagonist')).toHaveLength(1);
    expect(tags.filter(tag => !['Genre', 'Setting'].includes(tag.category))).toHaveLength(6);
  }
});
