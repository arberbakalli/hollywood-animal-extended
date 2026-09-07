import { test, expect, openHollywood } from '../fixtures/base.js';

test.describe('Distribution Calculator — Behemoth Policy Feature', () => {
  test.beforeEach(async ({ steps }) => {
    await openHollywood(steps);
  });

  test.describe('Behemoth toggle visibility and interaction', () => {
    test('TC-BEH-001: Behemoth toggle appears in Distribution Calculator', async ({ page }) => {
      await page.click('button:has-text("Marketing & Release")');

      const behemothToggle = await page.locator('#behemothToggle');
      await expect(behemothToggle).toBeVisible();
    });

    test('TC-BEH-002: Behemoth label shows budget requirement ($1M)', async ({ page }) => {
      await page.click('button:has-text("Marketing & Release")');

      const label = await page.locator('.distribution-toggle-label--behemoth');
      await expect(label).toContainText('budget over $1M');
    });

    test('TC-BEH-003: Tooltip explains Behemoth effect', async ({ page }) => {
      await page.click('button:has-text("Marketing & Release")');

      const toggle = await page.locator('[title*="Behemoth adds 25%"]');
      const title = await toggle.getAttribute('title');
      expect(title).toContain('25%');
      expect(title).toContain('week 1');
    });
  });

  test.describe('Behemoth effect on distribution', () => {
    test('TC-BEH-004: Week 1 increases 25% when Behemoth active and score >= 9', async ({ page }) => {
      await page.click('button:has-text("Marketing & Release")');

      // Set commercial score to 9.0
      await page.fill('#comScoreInput', '9.0');

      // Get week 1 demand without Behemoth
      const week1Before = await page.getAttribute('#dist-week-1-value', 'data-demand');
      const demandBefore = parseInt(week1Before);

      // Enable Behemoth
      await page.check('#behemothToggle');

      // Get week 1 demand with Behemoth
      const week1After = await page.getAttribute('#dist-week-1-value', 'data-demand');
      const demandAfter = parseInt(week1After);

      // Week 1 should increase by 25% (multiply by 1.25)
      const expectedIncrease = Math.ceil(demandBefore * 1.25);
      expect(demandAfter).toBe(expectedIncrease);
    });

    test('TC-BEH-005: Decay rate improves (0.85 vs 0.8) when score > 9 and Behemoth active', async ({ page }) => {
      await page.click('button:has-text("Marketing & Release")');

      // Set commercial score to 10.0 (above Behemoth threshold of 9)
      await page.fill('#comScoreInput', '10.0');

      // Get week 2-3 values without Behemoth
      const week2Before = await page.getAttribute('#dist-week-2-value', 'data-demand');
      const week3Before = await page.getAttribute('#dist-week-3-value', 'data-demand');

      // Enable Behemoth
      await page.check('#behemothToggle');

      // Get week 2-3 values with Behemoth
      const week2After = await page.getAttribute('#dist-week-2-value', 'data-demand');
      const week3After = await page.getAttribute('#dist-week-3-value', 'data-demand');

      // Week 3 with Behemoth decay (0.85) should be higher than without (0.8)
      expect(parseInt(week3After)).toBeGreaterThan(parseInt(week3Before));
    });

    test('TC-BEH-006: Behemoth has no effect when score <= 9', async ({ page }) => {
      await page.click('button:has-text("Marketing & Release")');

      // Set commercial score to 8.5 (below threshold)
      await page.fill('#comScoreInput', '8.5');

      // Get values without Behemoth
      const week1Before = await page.getAttribute('#dist-week-1-value', 'data-demand');
      const week3Before = await page.getAttribute('#dist-week-3-value', 'data-demand');

      // Enable Behemoth
      await page.check('#behemothToggle');

      // Get values with Behemoth (should be same)
      const week1After = await page.getAttribute('#dist-week-1-value', 'data-demand');
      const week3After = await page.getAttribute('#dist-week-3-value', 'data-demand');

      // Should be unchanged because score is below threshold
      expect(week1After).toBe(week1Before);
      expect(week3After).toBe(week3Before);
    });

    test('TC-BEH-007: Behemoth stacks with Striking Image and Artistic Ability', async ({ page }) => {
      await page.click('button:has-text("Marketing & Release")');

      // Set high commercial score
      await page.fill('#comScoreInput', '9.5');

      // Enable all three bonuses
      await page.check('#strikingImageToggle');
      await page.check('#artisticAbilityToggle');
      await page.check('#behemothToggle');

      // Week 1 should have opening boost (2x) AND Behemoth boost (1.25x)
      const week1Value = await page.getAttribute('#dist-week-1-value', 'data-demand');
      const demand = parseInt(week1Value);

      // Base week 1 for score 9.5: 9.5 * 2 * 1000 = 19000
      // With both bonuses: 19000 * 2 * 1.25 = 47500
      expect(demand).toBe(47500);
    });
  });

  test.describe('Behemoth persistence', () => {
    test('TC-BEH-008: Behemoth state persists when changing commercial score', async ({ page }) => {
      await page.click('button:has-text("Marketing & Release")');

      // Enable Behemoth
      await page.check('#behemothToggle');

      // Change commercial score
      await page.fill('#comScoreInput', '9.5');

      // Verify toggle still checked
      const toggleChecked = await page.isChecked('#behemothToggle');
      expect(toggleChecked).toBe(true);
    });

    test('TC-BEH-009: Toggling Behemoth off removes bonus immediately', async ({ page }) => {
      await page.click('button:has-text("Marketing & Release")');

      await page.fill('#comScoreInput', '10.0');
      await page.check('#behemothToggle');

      const weekWith = await page.getAttribute('#dist-week-1-value', 'data-demand');

      // Disable Behemoth
      await page.uncheck('#behemothToggle');

      const weekWithout = await page.getAttribute('#dist-week-1-value', 'data-demand');

      expect(parseInt(weekWithout)).toBeLessThan(parseInt(weekWith));
    });
  });
});
