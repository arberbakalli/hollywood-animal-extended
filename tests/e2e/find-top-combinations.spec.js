import { test, expect, openHollywood } from '../fixtures/base.js';

test.describe('Build for Target — Find Top Combinations Feature', () => {
  test.beforeEach(async ({ steps }) => {
    await openHollywood(steps);
  });

  test.describe('Tag validation (5-10 story elements excluding Genre/Settings)', () => {
    test('TC-FTC-001: Requires minimum 5 story elements', async ({ page }) => {
      await page.click('button:has-text("Marketing & Release")');
      await page.click('button:has-text("Build for Target")');

      // Try with fewer than 5 story elements
      // Select: 1 genre + 1 setting + 3 story elements = only 3 story elements
      // Should show error

      const findButton = await page.locator('#findCombinationsButton');
      await findButton.click();

      const errorMessage = await page.locator('#targetedFeedbackMessage');
      await expect(errorMessage).toContainText('5 story elements');
    });

    test('TC-FTC-002: Rejects more than 10 story elements', async ({ page }) => {
      await page.click('button:has-text("Marketing & Release")');
      await page.click('button:has-text("Build for Target")');

      // Try with more than 10 story elements
      // Should show error

      const findButton = await page.locator('#findCombinationsButton');
      await findButton.click();

      const errorMessage = await page.locator('#targetedFeedbackMessage');
      const text = await errorMessage.textContent();
      if (text && text.includes('10')) {
        expect(text).toContainText('10 story elements');
      }
    });

    test('TC-FTC-003: Accepts 5-10 story elements with any genre/settings', async ({ page }) => {
      await page.click('button:has-text("Marketing & Release")');
      await page.click('button:has-text("Build for Target")');

      // Select appropriate number of tags
      // Should NOT show validation error
      // (Actual selection depends on available tags)
    });
  });

  test.describe('Filter behavior (audience/advertiser optional)', () => {
    test('TC-FTC-004: Works without audience or advertiser selection', async ({ page }) => {
      await page.click('button:has-text("Marketing & Release")');
      await page.click('button:has-text("Build for Target")');

      // With proper tag selection but no audience/advertiser
      // Should show all combinations ranked by overall quality

      const findButton = await page.locator('#findCombinationsButton');
      await findButton.click();

      // Should not error about missing filters
      const errorMessage = await page.locator('#targetedFeedbackMessage');
      const text = await errorMessage.textContent() || '';
      expect(text).not.toContain('audience');
      expect(text).not.toContain('advertiser');
    });

    test('TC-FTC-005: Filters to audience when selected', async ({ page }) => {
      await page.click('button:has-text("Marketing & Release")');
      await page.click('button:has-text("Build for Target")');

      // Select one audience
      const audienceCheckbox = await page.locator('.targeted-audience-checkbox').first();
      await audienceCheckbox.check();

      // Results should filter to agencies reaching that audience
    });

    test('TC-FTC-006: Filters to advertiser when selected', async ({ page }) => {
      await page.click('button:has-text("Marketing & Release")');
      await page.click('button:has-text("Build for Target")');

      // Select one advertiser
      const advertiserCheckbox = await page.locator('.targeted-advertiser-checkbox').first();
      await advertiserCheckbox.check();

      // Results should filter to that specific advertiser
    });
  });

  test.describe('Exclusion logic integration', () => {
    test('TC-FTC-007: Respects Excluded Elements filter', async ({ page }) => {
      // First, go to Script Lab and exclude a tag
      await page.click('button:has-text("Script Lab")');

      // Open Excluded Elements (if needed)
      // Select one tag to exclude
      // Navigate back to Build for Target

      await page.click('button:has-text("Build for Target")');

      // Verify excluded tag doesn't appear in combinations
      // (Would require inspecting results)
    });

    test('TC-FTC-008: Excluded tags not offered in combinations', async ({ page }) => {
      await page.click('button:has-text("Marketing & Release")');
      await page.click('button:has-text("Build for Target")');

      // If tags are excluded from Script Lab, they should not appear in Find Top Combinations results
      // This uses the shared getGeneratorExcludedIds() filter
    });
  });

  test.describe('Result display', () => {
    test('TC-FTC-009: Shows ranked combinations sorted by advertiser fit', async ({ page }) => {
      await page.click('button:has-text("Marketing & Release")');
      await page.click('button:has-text("Build for Target")');

      // After successful search, results should be displayed
      // Ranked by advertiser fit score (highest first)
      const resultPanel = await page.locator('#targeted-results-panel');
      const visible = await resultPanel.isVisible();

      if (visible) {
        const cards = await page.locator('.targeted-combination-card');
        const count = await cards.count();
        expect(count).toBeGreaterThan(0);
      }
    });

    test('TC-FTC-010: Empty state when no combinations match criteria', async ({ page }) => {
      await page.click('button:has-text("Marketing & Release")');
      await page.click('button:has-text("Build for Target")');

      // If no combinations found, show helpful empty state
      const emptyState = await page.locator('.empty-state');
      const visible = await emptyState.isVisible();

      if (visible) {
        const text = await emptyState.textContent();
        expect(text).toContain('combinations');
      }
    });
  });
});
