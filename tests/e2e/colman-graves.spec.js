import { test, expect, openHollywood } from '../fixtures/base.js';
import { DropdownSelectType } from '@civitas-cerebrum/element-interactions';

const scoreIn = async (steps, elementName) => {
  const text = await steps.on(elementName, 'ColmanGraves').getText();
  return Number(text.match(/-?\d+(?:\.\d+)?/)?.[0]);
};

const FIRST_OPTION = { type: DropdownSelectType.INDEX, index: 1 };

const VALID_GRAVES_SCRIPT = [
  ['genreSelect', 'THRILLER'],
  ['settingSelect', 'MODERN_AMERICAN_CITY'],
  ['protagonistSelect', 'PROTAGONIST_DETECTIVE'],
  ['antagonistSelect', 'ANTAGONIST_OLD_FRIEND_ENEMY'],
  ['supportingCharacterSelect', 'SUPPORTINGCHARACTER_KEY_WITNESS'],
  ['themeEventSelect', 'THEME_WRONGFULLY_ACCUSED'],
  ['finaleSelect', 'FINALE_PROTAGONIST_TAKES_ANTAGONIST_WITH_THEM'],
];

const buildValidScript = async (steps) => {
  for (const [select, value] of VALID_GRAVES_SCRIPT) {
    await steps.selectDropdown(select, 'ColmanGraves', {
      type: DropdownSelectType.VALUE,
      value,
    });
  }
};

// Build a script with multiple Supporting Characters for swap testing
const buildMultiSupportingScript = async (steps) => {
  await steps.selectDropdown('genreSelect', 'ColmanGraves', {
    type: DropdownSelectType.VALUE,
    value: 'THRILLER',
  });
  await steps.selectDropdown('settingSelect', 'ColmanGraves', {
    type: DropdownSelectType.VALUE,
    value: 'MODERN_AMERICAN_CITY',
  });
  await steps.selectDropdown('protagonistSelect', 'ColmanGraves', {
    type: DropdownSelectType.VALUE,
    value: 'PROTAGONIST_DETECTIVE',
  });
  await steps.selectDropdown('antagonistSelect', 'ColmanGraves', {
    type: DropdownSelectType.VALUE,
    value: 'ANTAGONIST_OLD_FRIEND_ENEMY',
  });
  // Add first Supporting Character
  await steps.selectDropdown('supportingCharacterSelect', 'ColmanGraves', {
    type: DropdownSelectType.VALUE,
    value: 'SUPPORTINGCHARACTER_KEY_WITNESS',
  });
  // Add second Supporting Character via the "+" button
  await steps.on('supportingCharacterAddButton', 'ColmanGraves').click();
  // Select a different one for the second row
  await steps.selectDropdown('supportingCharacterSelectRow2', 'ColmanGraves', {
    type: DropdownSelectType.VALUE,
    value: 'SUPPORTINGCHARACTER_WORRIED_WIFE',
  });
  await steps.selectDropdown('themeEventSelect', 'ColmanGraves', {
    type: DropdownSelectType.VALUE,
    value: 'THEME_WRONGFULLY_ACCUSED',
  });
  await steps.selectDropdown('finaleSelect', 'ColmanGraves', {
    type: DropdownSelectType.VALUE,
    value: 'FINALE_PROTAGONIST_TAKES_ANTAGONIST_WITH_THEM',
  });
};

// Build a script at the cardinality limit (can't add more of certain categories)
const buildCardinalityLimitScript = async (steps) => {
  // Single-select categories: 1 each
  await steps.selectDropdown('settingSelect', 'ColmanGraves', {
    type: DropdownSelectType.VALUE,
    value: 'MODERN_AMERICAN_CITY',
  });
  await steps.selectDropdown('protagonistSelect', 'ColmanGraves', {
    type: DropdownSelectType.VALUE,
    value: 'PROTAGONIST_DETECTIVE',
  });
  await steps.selectDropdown('antagonistSelect', 'ColmanGraves', {
    type: DropdownSelectType.VALUE,
    value: 'ANTAGONIST_OLD_FRIEND_ENEMY',
  });
  await steps.selectDropdown('finaleSelect', 'ColmanGraves', {
    type: DropdownSelectType.VALUE,
    value: 'FINALE_PROTAGONIST_TAKES_ANTAGONIST_WITH_THEM',
  });
  // Two Genres (the max)
  await steps.selectDropdown('genreSelect', 'ColmanGraves', {
    type: DropdownSelectType.VALUE,
    value: 'THRILLER',
  });
  await steps.on('genreAddButton', 'ColmanGraves').click();
  await steps.selectDropdown('genreSelectRow2', 'ColmanGraves', {
    type: DropdownSelectType.VALUE,
    value: 'DRAMA',
  });
  // Supporting Character and Theme & Event: 1 each (not at limit)
  await steps.selectDropdown('supportingCharacterSelect', 'ColmanGraves', {
    type: DropdownSelectType.VALUE,
    value: 'SUPPORTINGCHARACTER_KEY_WITNESS',
  });
  await steps.selectDropdown('themeEventSelect', 'ColmanGraves', {
    type: DropdownSelectType.VALUE,
    value: 'THEME_WRONGFULLY_ACCUSED',
  });
};

test.describe('Script Evaluation — Colman Graves', () => {
  test.beforeEach(async ({ steps }) => {
    await openHollywood(steps);
    await steps.on('evaluateTab', 'Navigation').click();
    await steps.on('panel', 'ColmanGraves').waitForState('visible');
  });

  test('TC03-000001 all seven story element categories are offered', async ({ steps }) => {
    await steps.on('allTagSelects', 'ColmanGraves').verifyCount({ exactly: 7 });
  });

  test('TC03-000007 best-match filters expose category, fit and starter controls', async ({ steps, page }) => {
    await steps.on('matchCategoryFilter', 'ColmanGraves').verifyState('visible');
    await steps.on('minimumFitFilter', 'ColmanGraves').verifyState('visible');
    await steps.on('startingTagsOnlyCheckbox', 'ColmanGraves').verifyState('visible');
    await steps.on('exclusionNotice', 'ColmanGraves').verifyState('hidden');

    const categoryOptions = await page.locator('#gravesBestCategoryFilter option').allTextContents();
    for (const category of ['Genre', 'Setting', 'Protagonist', 'Antagonist', 'Supporting Character', 'Theme & Event', 'Finale']) {
      expect(categoryOptions).toContain(category);
    }

    const fitValues = await page.locator('#gravesBestScoreFilter option').evaluateAll(options =>
      options.map(option => option.value));
    expect(fitValues).toEqual(['0', '3.0', '3.5', '4.0', '4.5', '5.0']);
  });

  // The happy flow: submit a valid script and read the verdict.
  test('TC03-000002 submitting a valid script produces a verdict and scores', async ({ steps }) => {
    await steps.on('resultsSection', 'ColmanGraves').verifyState('hidden');

    await buildValidScript(steps);
    await steps.on('evaluateButton', 'ColmanGraves').click();

    await steps.on('resultsSection', 'ColmanGraves').verifyState('visible');
    // The markup ships "-" for the verdict and "0.0 / 5.0" for the fit, so those
    // two need a value assertion rather than a presence one. The analysis text,
    // method list and audience are statically empty, so non-empty is real proof.
    await steps.expect('verdict', 'ColmanGraves').text.not.toBe('-');
    await steps.on('verdictText', 'ColmanGraves').verifyText();
    await steps.on('methodList', 'ColmanGraves').verifyText();
    await steps.on('audienceDisplay', 'ColmanGraves').verifyText();

    expect(await scoreIn(steps, 'averageFit')).toBeGreaterThan(0);
    expect(await scoreIn(steps, 'breakdownBaseScore')).not.toBe(0);
    expect(await scoreIn(steps, 'breakdownCommercialBonus')).not.toBe(0);
    expect(await scoreIn(steps, 'breakdownArtisticBonus')).not.toBe(0);
    expect(await scoreIn(steps, 'commercialScore')).toBeGreaterThan(0);
    expect(await scoreIn(steps, 'artisticScore')).toBeGreaterThan(0);
    await steps.on('scoreCapLabel', 'ColmanGraves').verifyTextContains('Max Score Capped');
    await steps.on('scoreCapLabel', 'ColmanGraves').verifyTextContains('Scoring Elements');
  });

  // Guard: a script missing a required category is refused by name.
  test('TC03-000003 a script missing required categories names what is missing', async ({ steps }) => {
    await steps.selectDropdown('supportingCharacterSelect', 'ColmanGraves', FIRST_OPTION);

    await steps.on('evaluateButton', 'ColmanGraves').click();

    await steps.on('feedbackMessage', 'ColmanGraves').verifyState('visible');
    await steps.on('feedbackMessage', 'ColmanGraves').verifyTextContains('Genre');
    await steps.on('resultsSection', 'ColmanGraves').verifyState('hidden');
  });

  // Guard: the required categories alone are only three elements.
  test('TC03-000004 fewer than five elements is refused with the count', async ({ steps }) => {
    for (const select of ['genreSelect', 'settingSelect', 'protagonistSelect']) {
      await steps.selectDropdown(select, 'ColmanGraves', FIRST_OPTION);
    }

    await steps.on('evaluateButton', 'ColmanGraves').click();

    await steps.on('feedbackMessage', 'ColmanGraves').verifyTextContains('at least 5 story elements');
    await steps.on('feedbackMessage', 'ColmanGraves').verifyTextContains('You selected 3');
    await steps.on('resultsSection', 'ColmanGraves').verifyState('hidden');
  });

  test('TC03-000005 best matches open and the analysis modes switch', async ({ steps, page }) => {
    await buildValidScript(steps);
    await steps.on('evaluateButton', 'ColmanGraves').click();
    await steps.on('resultsSection', 'ColmanGraves').verifyState('visible');

    // The filter defaults to 4.0+, which an arbitrary script may have no
    // candidate for. Widen it so the panel has something to rank.
    await steps.selectDropdown('minimumFitFilter', 'ColmanGraves', {
      type: DropdownSelectType.VALUE,
      value: '0',
    });
    await steps.on('generateBestMatchesButton', 'ColmanGraves').click();

    await steps.on('bestMatchesPanel', 'ColmanGraves').verifyState('visible');
    await steps.on('bestMatchRows', 'ColmanGraves').verifyCount({ greaterThan: 0 });
    await steps.on('bestMatchAddButtons', 'ColmanGraves').verifyCount({ greaterThan: 0 });
    expect(await page.locator('#gravesBestMatchesList [data-action="add-graves-best-match"]').count())
      .toBe(await page.locator('#gravesBestMatchesList [data-role="graves-best-match"]').count());

    // The panel is already visible by now, so re-asserting that proves nothing.
    // Each mode re-renders the list, so assert the tab took AND the list survived.
    await steps.on('swapSuggestionsTab', 'ColmanGraves').click();
    await steps.expect('swapSuggestionsTab', 'ColmanGraves').attributes.get('class').toContain('active');
    await steps.expect('bestAdditionsTab', 'ColmanGraves').attributes.get('class').not.toContain('active');
    await steps.on('bestMatchRows', 'ColmanGraves').verifyCount({ greaterThan: 0 });

    await steps.on('pairwiseTab', 'ColmanGraves').click();
    await steps.expect('pairwiseTab', 'ColmanGraves').attributes.get('class').toContain('active');
    await steps.on('bestMatchRows', 'ColmanGraves').verifyCount({ greaterThan: 0 });
  });

  test('TC03-000011 best matches can start from one seed element', async ({ steps }) => {
    await steps.selectDropdown('genreSelect', 'ColmanGraves', FIRST_OPTION);
    await steps.selectDropdown('minimumFitFilter', 'ColmanGraves', {
      type: DropdownSelectType.VALUE,
      value: '0',
    });

    await steps.on('generateBestMatchesButton', 'ColmanGraves').click();

    await steps.on('bestMatchesPanel', 'ColmanGraves').verifyState('visible');
    await steps.on('bestMatchRows', 'ColmanGraves').verifyCount({ greaterThan: 0 });
    await steps.on('feedbackMessage', 'ColmanGraves').verifyState('hidden');
  });

  // Bug discovered: Swap Suggestions identifies the weakest element but then
  // suggests additions instead of replacements. This test verifies the bug:
  // suggestions must be candidates that can actually swap for the weak slot.
  test('TC03-000027 Swap Suggestions gives candidates that can replace the weakest element', async ({ steps, page }) => {
    await buildMultiSupportingScript(steps);
    await steps.on('evaluateButton', 'ColmanGraves').click();
    await steps.on('resultsSection', 'ColmanGraves').verifyState('visible');

    await steps.selectDropdown('minimumFitFilter', 'ColmanGraves', {
      type: DropdownSelectType.VALUE,
      value: '0',
    });
    await steps.on('generateBestMatchesButton', 'ColmanGraves').click();
    await steps.on('bestMatchesPanel', 'ColmanGraves').verifyState('visible');

    // Switch to Swap Suggestions mode
    await steps.on('swapSuggestionsTab', 'ColmanGraves').click();
    await steps.expect('swapSuggestionsTab', 'ColmanGraves').attributes.get('class').toContain('active');

    // Verify suggestions exist and check their categories
    await steps.on('bestMatchRows', 'ColmanGraves').verifyCount({ greaterThan: 0 });
    // The test will fail if suggestions are not Supporting Characters (categories differ)
    const categories = await page.locator('#gravesBestMatchesList [data-category]').evaluateAll(
      (els) => els.map((el) => el.getAttribute('data-category'))
    );
    expect(categories.length).toBeGreaterThan(0);
    // For Swap Suggestions, all should be Supporting Character (same as weakest slot)
    expect(categories.every((c) => c === 'Supporting Character' || c === 'SUPPORTINGCHARACTER')).toBe(true);
  });

  // Bug discovered: Best Additions suggests categories at their cardinality limit.
  // This test verifies the bug: suggestions must only be for categories that can accept more.
  test('TC03-000028 Best Additions respects per-category selection limits', async ({ steps, page }) => {
    await buildCardinalityLimitScript(steps);

    // Verify the script was built correctly with 2 genres
    const genreRows = await page.locator('#inputs-genre-graves .select-row').count();
    expect(genreRows).toBe(2);

    await steps.on('evaluateButton', 'ColmanGraves').click();
    await steps.on('resultsSection', 'ColmanGraves').verifyState('visible');

    await steps.selectDropdown('minimumFitFilter', 'ColmanGraves', {
      type: DropdownSelectType.VALUE,
      value: '0',
    });
    await steps.on('generateBestMatchesButton', 'ColmanGraves').click();
    await steps.on('bestMatchesPanel', 'ColmanGraves').verifyState('visible');

    // Explicitly set and verify Best Additions mode is active
    // (module state from other tests might have changed it)
    await page.evaluate(() => window.HACGravesBestMatches?.setBestMatchMode?.('additions'));
    await page.evaluate(() => window.HACGravesBestMatches?.renderBestMatches?.());
    await page.waitForTimeout(500); // Wait for re-render after mode change
    await steps.on('bestAdditionsTab', 'ColmanGraves').click();
    await page.waitForTimeout(500); // Wait for any animation/render
    await steps.expect('bestAdditionsTab', 'ColmanGraves').attributes.get('class').toContain('active');

    // Verify no Genre or single-select categories are suggested
    await steps.on('bestMatchRows', 'ColmanGraves').verifyCount({ greaterThan: 0 });
    const categories = await page.locator('#gravesBestMatchesList [data-category]').evaluateAll(
      (els) => els.map((el) => el.getAttribute('data-category'))
    );
    const forbiddenCategories = ['Genre', 'Setting', 'Protagonist', 'Antagonist', 'Finale'];
    const forbiddenFound = categories.filter(c => forbiddenCategories.includes(c));
    expect(forbiddenFound).toHaveLength(0);
  });

  test('TC03-000008 adding a suggested Theme & Event joins the Graves script', async ({ steps }) => {
    await buildValidScript(steps);
    await steps.on('evaluateButton', 'ColmanGraves').click();
    await steps.on('resultsSection', 'ColmanGraves').verifyState('visible');
    await steps.selectDropdown('matchCategoryFilter', 'ColmanGraves', {
      type: DropdownSelectType.VALUE,
      value: 'Theme & Event',
    });
    await steps.selectDropdown('minimumFitFilter', 'ColmanGraves', {
      type: DropdownSelectType.VALUE,
      value: '0',
    });

    await steps.on('generateBestMatchesButton', 'ColmanGraves').click();
    await steps.on('bestMatchAddButtons', 'ColmanGraves').first().click();

    await steps.expect('themeEventSelect', 'ColmanGraves').value.not.toBe('');
  });

  test('TC03-000015 saving an evaluated script adds it to Script Library', async ({ steps }) => {
    await buildValidScript(steps);
    await steps.on('evaluateButton', 'ColmanGraves').click();
    await steps.on('resultsSection', 'ColmanGraves').verifyState('visible');

    await steps.on('saveToLibraryButton', 'ColmanGraves').click();

    await steps.on('feedbackMessage', 'ColmanGraves')
      .verifyTextContains('Saved to your script library');
    await steps.on('buildTab', 'Navigation').click();
    await steps.on('pinnedSection', 'ScriptLab').verifyState('visible');
    await steps.on('pinnedCards', 'ScriptLab').verifyCount({ greaterThan: 0 });
  });

  test('TC03-000016 transferring a Graves script opens Marketing with analysis', async ({ steps }) => {
    await buildValidScript(steps);
    await steps.on('evaluateButton', 'ColmanGraves').click();
    await steps.on('resultsSection', 'ColmanGraves').verifyState('visible');

    await steps.on('transferToMarketButton', 'ColmanGraves').click();

    await steps.on('panel', 'MarketingRelease').verifyState('visible');
    await steps.expect('genreSelect', 'MarketingRelease').value.toBe('THRILLER');
    await steps.on('resultsSection', 'MarketingRelease').verifyState('visible');
    await steps.on('recommendedAdvertisers', 'MarketingRelease').verifyText();
  });

  test('TC03-000012 best-match category filter restricts suggestions', async ({ steps, page }) => {
    await buildValidScript(steps);
    await steps.selectDropdown('matchCategoryFilter', 'ColmanGraves', {
      type: DropdownSelectType.VALUE,
      value: 'Supporting Character',
    });
    await steps.selectDropdown('minimumFitFilter', 'ColmanGraves', {
      type: DropdownSelectType.VALUE,
      value: '0',
    });

    await steps.on('generateBestMatchesButton', 'ColmanGraves').click();

    await steps.on('bestMatchRows', 'ColmanGraves').verifyCount({ greaterThan: 0 });
    const categories = await page.locator('#gravesBestMatchesList [data-role="graves-best-match"]')
      .evaluateAll(rows => rows.map(row => row.dataset.category));
    expect(categories.every(category => category === 'Supporting Character')).toBe(true);
  });

  test('TC03-000013 best-match minimum fit filter restricts scores', async ({ steps, page }) => {
    await steps.selectDropdown('genreSelect', 'ColmanGraves', FIRST_OPTION);
    await steps.selectDropdown('minimumFitFilter', 'ColmanGraves', {
      type: DropdownSelectType.VALUE,
      value: '4.5',
    });

    await steps.on('generateBestMatchesButton', 'ColmanGraves').click();

    await steps.on('bestMatchRows', 'ColmanGraves').verifyCount({ greaterThan: 0 });
    const scores = await page.locator('#gravesBestMatchesList [data-role="graves-best-match"]')
      .evaluateAll(rows => rows.map(row => Number(row.dataset.score)));
    expect(scores.every(score => score >= 4.5)).toBe(true);
  });

  test('TC03-000014 starting-tags-only filter restricts suggestions to the starter deck', async ({ steps, page }) => {
    await steps.selectDropdown('genreSelect', 'ColmanGraves', FIRST_OPTION);
    await steps.selectDropdown('minimumFitFilter', 'ColmanGraves', {
      type: DropdownSelectType.VALUE,
      value: '0',
    });
    await steps.on('startingTagsOnlyCheckbox', 'ColmanGraves').check();

    await steps.on('generateBestMatchesButton', 'ColmanGraves').click();

    await steps.on('bestMatchRows', 'ColmanGraves').verifyCount({ greaterThan: 0 });
    const [suggestedIds, starterIds] = await page.evaluate(() => [
      Array.from(document.querySelectorAll('#gravesBestMatchesList [data-role="graves-best-match"]'))
        .map(row => row.dataset.tagId),
      Array.from(HACAvailabilityFilter.getStarterAvailableIds()),
    ]);
    const starterSet = new Set(starterIds);
    expect(suggestedIds.every(id => starterSet.has(id))).toBe(true);
  });

  test('TC03-000006 resetting clears the submission and hides the verdict', async ({ steps }) => {
    await buildValidScript(steps);
    await steps.on('evaluateButton', 'ColmanGraves').click();
    await steps.on('resultsSection', 'ColmanGraves').verifyState('visible');

    await steps.on('resetButton', 'ColmanGraves').click();

    await steps.on('resultsSection', 'ColmanGraves').verifyState('hidden');
    await steps.expect('genreSelect', 'ColmanGraves').value.toBe('');
  });

  test('TC03-000010 switching away from Graves does not hide focused controls from accessibility', async ({ steps, page }) => {
    const ariaWarnings = [];
    page.on('console', message => {
      if (message.text().includes('Blocked aria-hidden')) {
        ariaWarnings.push(message.text());
      }
    });

    await page.locator('#generateBestMatchesButton').focus();
    await steps.on('marketTab', 'Navigation').click();
    await expect(page.locator('#tab-advertisers')).toBeVisible();

    const hiddenFocusedPanelId = await page.evaluate(() => {
      const activeElement = document.activeElement;
      const hiddenPanel = activeElement && activeElement.closest('.tab-content[aria-hidden="true"]');
      return hiddenPanel ? hiddenPanel.id : null;
    });

    expect(hiddenFocusedPanelId).toBeNull();
    expect(ariaWarnings).toEqual([]);
  });
});
