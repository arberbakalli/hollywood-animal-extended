import { test, expect, openHollywood } from '../fixtures/base.js';

const EXPECTED_CATEGORY_HEADERS = [
  'GENRE',
  'SETTING',
  'PROTAGONIST',
  'ANTAGONIST',
  'SUPPORTING CHARACTER',
  'THEME & EVENT',
  'FINALE',
];

const GENRES = [
  'Action',
  'Adventure',
  'Comedy',
  'Detective',
  'Drama',
  'Historical',
  'Horror',
  'Romance',
  'Science-Fiction',
  'Slapstick Comedy',
  'Thriller',
];

const openBuildForTarget = async (steps) => {
  await openHollywood(steps);
  await steps.on('marketTab', 'Navigation').click();
  await steps.on('buildForTargetModeButton', 'MarketingRelease').click();
};

const showCompatibility = async (page) => {
  await page.locator('#showAudienceCompatibilityButton').click();
  await expect(page.locator('#audience-compatibility-panel')).toBeVisible();
  await expect(page.locator('.compatibility-table')).toBeVisible();
};

const elementCell = (page, name) =>
  page.locator('.compatibility-table td.element-name').filter({ hasText: new RegExp(`^${name}$`) });

const genreCell = (page, name) =>
  page.locator('.compatibility-table td.element-name.category-genre').filter({ hasText: new RegExp(`^${name}$`) });

const genreRow = (page, genreClass) =>
  page.locator(`.compatibility-table tbody tr:has(td.element-name.${genreClass})`);

const expectedScoreClass = (score) => {
  if (score >= 4.0) return 'excellent';
  if (score >= 1.0) return 'good';
  if (score > -1.0) return 'neutral';
  if (score >= -3.0) return 'bad';
  return 'disastrous';
};

test.describe('Audience Compatibility (Marketing Tab)', () => {
  test.beforeEach(async ({ steps }) => {
    await openBuildForTarget(steps);
  });

  test('TC11-000001 Show Compatibility button is always visible', async ({ page }) => {
    await expect(page.locator('#showAudienceCompatibilityButton')).toBeVisible();
  });

  test('TC11-000002 clicking button without selections shows all element categories', async ({ page }) => {
    await showCompatibility(page);

    await expect(page.locator('.compatibility-category-header')).toHaveText(EXPECTED_CATEGORY_HEADERS);
    await expect(elementCell(page, 'Action')).toBeVisible();
  });

  test('TC11-000003 all genre rows display with individual color classes', async ({ page }) => {
    await showCompatibility(page);

    await expect(elementCell(page, 'Action')).toHaveClass(/genre-action/);
    await expect(elementCell(page, 'Comedy')).toHaveClass(/genre-comedy/);
    await expect(elementCell(page, 'Drama')).toHaveClass(/genre-drama/);
    await expect(elementCell(page, 'Science-Fiction')).toHaveClass(/genre-science-fiction/);
  });

  test('TC11-000004 all 11 genres are present in show-all mode', async ({ page }) => {
    await showCompatibility(page);

    for (const genre of GENRES) {
      await expect(genreCell(page, genre)).toBeVisible();
    }
  });

  test('TC11-000005 categories are separated by semantic headers in game order', async ({ page }) => {
    await showCompatibility(page);

    await expect(page.locator('.compatibility-category-header')).toHaveText(EXPECTED_CATEGORY_HEADERS);
  });

  test('TC11-000006 demographic columns display correct labels', async ({ page }) => {
    await showCompatibility(page);

    await expect(page.locator('.compatibility-table thead th')).toHaveText([
      'Element',
      'TF',
      'TM',
      'YF',
      'YM',
      'AF',
      'AM',
    ]);
  });

  test('TC11-000007 score cells use one-decimal formatting', async ({ page }) => {
    await showCompatibility(page);

    const scoreText = await page.locator('.score-cell').first().textContent();
    expect(scoreText).toMatch(/^-?\d+\.\d+$/);
  });

  test('TC11-000008 selected Genre rows keep their genre-specific color class', async ({ page }) => {
    await page.locator('#inputs-genre-targeted select.tag-selector').selectOption('ACTION');
    await showCompatibility(page);

    await expect(page.locator('.compatibility-table tbody tr')).toHaveCount(1);
    await expect(elementCell(page, 'Action')).toHaveClass(/genre-action/);
  });

  test('TC11-000009 changing selections updates the visible compatibility rows', async ({ page }) => {
    await showCompatibility(page);
    const allRows = await page.locator('.compatibility-table tbody tr').count();

    await page.locator('#inputs-genre-targeted select.tag-selector').selectOption('ACTION');

    await expect(page.locator('.compatibility-table tbody tr')).toHaveCount(1);
    expect(await page.locator('.compatibility-table tbody tr').count()).toBeLessThan(allRows);
    await expect(elementCell(page, 'Action')).toBeVisible();
  });

  test('TC11-000010 exclusion list filters banned elements out of show-all mode', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem('hac.excludedTags.v1', JSON.stringify([{ id: 'ACTION', category: 'Genre' }]));
    });

    await showCompatibility(page);

    await expect(elementCell(page, 'Action')).toHaveCount(0);
    await expect(elementCell(page, 'Comedy')).toBeVisible();
  });

  test('TC11-000011 score cells map known tag scores to the expected color class', async ({ page }) => {
    await showCompatibility(page);

    const actionTeenFemaleScore = await page.evaluate(() => GAME_DATA.tags.ACTION.weights.TF);
    const expectedClass = expectedScoreClass(actionTeenFemaleScore);
    const actionRow = genreRow(page, 'genre-action');
    const teenFemaleScoreCell = actionRow.locator('.score-cell').nth(0);

    await expect(teenFemaleScoreCell).toHaveText(actionTeenFemaleScore.toFixed(1));
    await expect(teenFemaleScoreCell).toHaveClass(new RegExp(expectedClass));
  });

  test('TC11-000012 genre element names align with six demographic scores', async ({ page }) => {
    await showCompatibility(page);

    const actionRow = genreRow(page, 'genre-action');
    await expect(actionRow.locator('.score-cell')).toHaveCount(6);
  });
});
