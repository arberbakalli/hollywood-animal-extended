import { test, expect, openHollywood } from '../fixtures/base.js';

test.describe('Search Field Persistence Bug', () => {
  test.beforeEach(async ({ steps, page }) => {
    await openHollywood(steps);
    await steps.on('buildTab', 'Navigation').click();
  });

  test('BUG-001: Search field in Finale stays visible while typing (should not hide)', async ({ steps, page }) => {
    // The bug: when user searches in Finale category with >5 items,
    // the search input field hides as they type, even though no selection is made.

    // Finalize has "Protagonist Dies Heroically" and other items.
    // User expects to search and filter while the search field remains visible.

    // Navigate to a context where Finale appears with search (typically synergy context)
    await steps.on('evaluateTab', 'Navigation').click();

    // Wait for the panel to load
    await steps.on('panel', 'ScriptEvaluation').verifyState('visible');

    // Find the Finale search input (if Finale has > 5 items, search should exist)
    const searchInputSelector = '#search-finale-synergy-input';
    const searchInput = page.locator(searchInputSelector);

    // Verify search input is initially visible
    await expect(searchInput).toBeVisible();

    // Focus and start typing
    await searchInput.focus();
    await searchInput.type('protagonist');

    // BUG: Search field should stay visible while typing
    // Even if no items match, the search input should remain on screen
    await expect(searchInput).toBeVisible({ timeout: 5000 });

    // Continue typing to complete the phrase
    await searchInput.type(' dies heroically');

    // Search field must still be visible
    await expect(searchInput).toBeVisible({ timeout: 5000 });

    // User should be able to clear the search by selecting all and typing
    await searchInput.selectText();
    await searchInput.type('');

    // Search field should remain visible even when empty
    await expect(searchInput).toBeVisible();
  });

  test('BUG-002: Search fields visible in all multi-select categories', async ({ steps, page }) => {
    // Ensure search fields for multi-select categories stay visible
    // when user has not selected anything yet

    await steps.on('buildTab', 'Navigation').click();

    // Open the excluded section (multi-select, always shows search for large categories)
    const excludedToggle = page.locator('#toggleExcludedElementsButton');
    await excludedToggle.click();

    // Wait for excluded content to show
    await page.locator('#excluded-content').waitFor({ state: 'visible' });

    // Genre is a large category that should have search
    const genreSearchInput = page.locator('#search-genre-excluded-input');

    // Should be visible even with no selections
    await expect(genreSearchInput).toBeVisible();

    // Type in it
    await genreSearchInput.focus();
    await genreSearchInput.type('action');

    // Must stay visible
    await expect(genreSearchInput).toBeVisible({ timeout: 5000 });
  });

  test('BUG-003: Search wrapper does not hide when search has no matches', async ({ steps, page }) => {
    // Even when search returns no matches, the search input should remain visible
    // so user can modify their search or clear it

    await steps.on('evaluateTab', 'Navigation').click();
    await steps.on('panel', 'ScriptEvaluation').verifyState('visible');

    // Type in a search with something unlikely to match
    const searchInput = page.locator('#search-finale-synergy-input');
    await searchInput.focus();
    await searchInput.type('xyzabc123notaword');

    // Search input should still be visible even with no matches
    await expect(searchInput).toBeVisible({ timeout: 5000 });

    // The wrapper containing the search input should also be visible
    const searchWrapper = page.locator('#search-finale-synergy-wrapper');
    await expect(searchWrapper).toBeVisible({ timeout: 5000 });
  });
});
