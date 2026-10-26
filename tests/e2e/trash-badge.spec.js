import { test, expect, openHollywood } from '../fixtures/base.js';

// GAME_RULES section 11 (owner, 2026-10-09): a trash element shows a
// "Trash element" label wherever the freshness pill shows. It is informative
// only: no click action, no score effect, and the dropdown text is unchanged.
const TRASH = 'THEME_WAR_WITH_SORCERERS';
const PLAIN = 'THEME_TREASURE_HUNT';

const CONTEXTS = [
  ['generator', '#tab-generator-button', null],
  ['graves', '#tab-evaluate-button', null],
  ['advertisers', '#tab-advertisers-button', '#marketing-mode-advertisers-button'],
  ['targeted', '#tab-advertisers-button', '#marketing-mode-targeted-button'],
];

for (const [context, tab, mode] of CONTEXTS) {
  test(`TC39-000001 the ${context} Theme & Event row labels a trash element and only a trash element`, async ({ steps, page }) => {
    await openHollywood(steps);
    await page.locator(tab).click();
    if (mode) await page.locator(mode).click();
    const row = page.locator(`#inputs-theme-event-${context} .select-row`).first();
    const select = row.locator('select.tag-selector');
    const badge = row.locator('[data-role="trash-badge"]');

    await select.selectOption(TRASH);
    await expect(badge).toBeVisible();
    await expect(badge).toHaveText('Trash element');
    await expect(row.locator('[data-role="freshness-pill"]')).toBeVisible();
    await expect(select.locator(`option[value="${TRASH}"]`)).toHaveText('Wizard War');

    await select.selectOption(PLAIN);
    await expect(badge).toBeHidden();
  });
}

test('TC39-000002 generated cards label the trash element chip and no other chip', async ({ steps, page }) => {
  await openHollywood(steps);
  await page.locator('#tab-generator-button').click();
  await page.locator('#inputs-theme-event-generator select.tag-selector').first().selectOption(TRASH);
  await page.locator('#generateScriptsButton').click();
  const cards = page.locator('#generatorResultsList .gen-card');
  await expect(cards.first()).toBeVisible({ timeout: 20000 });

  const perCard = await cards.evaluateAll(nodes => nodes.map(card =>
    [...card.querySelectorAll('[data-role="trash-badge"]')].map(badge => badge.dataset.tagId)));
  expect(perCard.length).toBeGreaterThan(0);
  const trashIds = await page.evaluate(() => Object.values(GAME_DATA.tags).filter(tag => tag.trash).map(tag => tag.id));
  for (const [index, ids] of perCard.entries()) {
    const chipIds = await cards.nth(index).locator('.gen-tag-chip [data-tag-id]').evaluateAll(n => n.map(e => e.dataset.tagId));
    expect(ids).toContain(TRASH);
    expect(ids.every(id => trashIds.includes(id))).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
    expect(chipIds).toContain(TRASH);
  }
  await expect(cards.first().locator('[data-role="trash-badge"]').first()).toHaveText('Trash element');
});

test('TC39-000003 the label has no click action and the page fits a phone', async ({ steps, page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await openHollywood(steps);
  await page.locator('#tab-generator-button').click();
  const row = page.locator('#inputs-theme-event-generator .select-row').first();
  await row.locator('select.tag-selector').selectOption(TRASH);
  const badge = row.locator('[data-role="trash-badge"]');
  await expect(badge).toBeVisible();
  expect(await badge.evaluate(el => el.tagName)).not.toBe('BUTTON');
  const before = await page.evaluate(() => localStorage.getItem('hac.freshnessStates.v1'));
  await badge.click();
  expect(await page.evaluate(() => localStorage.getItem('hac.freshnessStates.v1'))).toBe(before);
  await expect(row.locator('select.tag-selector')).toHaveValue(TRASH);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBe(0);
  const bounds = await badge.boundingBox();
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(390);
});
