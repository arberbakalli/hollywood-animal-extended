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
  ['antagonistSelect', 'ANTAGONIST_TRIBAL_CHIEF'],
  ['supportingCharacterSelect', 'SUPPORTINGCHARACTER_LOVE_INTEREST'],
  ['themeEventSelect', 'THEME_TREASURE_HUNT'],
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

// Max Element Pool defaults to 5 and a complete script carries exactly 5 story
// elements — Genre and Setting are exempt — so a finished script sits at its
// budget and Best Additions is correctly empty. Raising the pool is what gives
// it room to suggest, so any test that wants additions from a complete script
// has to ask for that room first.
const makeRoomForAdditions = async (steps) => {
  await steps.setSliderValue('elementPoolSlider', 'Navigation', 10);
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
    value: 'ANTAGONIST_TRIBAL_CHIEF',
  });
  // Add first Supporting Character
  await steps.selectDropdown('supportingCharacterSelect', 'ColmanGraves', {
    type: DropdownSelectType.VALUE,
    value: 'SUPPORTINGCHARACTER_LOVE_INTEREST',
  });
  // Add second Supporting Character via the "+" button
  await steps.on('supportingCharacterAddButton', 'ColmanGraves').click();
  // Select a different one for the second row
  await steps.selectDropdown('supportingCharacterSelectRow2', 'ColmanGraves', {
    type: DropdownSelectType.VALUE,
    value: 'SUPPORTINGCHARACTER_CONCERNED_WIFE',
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

// Build a script with full single-select categories.
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
    value: 'ANTAGONIST_TRIBAL_CHIEF',
  });
  await steps.selectDropdown('finaleSelect', 'ColmanGraves', {
    type: DropdownSelectType.VALUE,
    value: 'FINALE_PROTAGONIST_TAKES_ANTAGONIST_WITH_THEM',
  });
  // Two Genres are allowed, but Genre itself is not capped at two.
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
    value: 'SUPPORTINGCHARACTER_LOVE_INTEREST',
  });
  await steps.selectDropdown('themeEventSelect', 'ColmanGraves', {
    type: DropdownSelectType.VALUE,
    value: 'THEME_TREASURE_HUNT',
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

  test('TC03-000033 Graves explains that Script Lab exclusions hide unavailable Settings', async ({ steps, page }) => {
    await steps.on('buildTab', 'Navigation').click();
    await steps.selectDropdown('excludedSettingSelect', 'ScriptLab', {
      type: DropdownSelectType.VALUE,
      value: 'WILD_WEST',
    });

    await steps.on('evaluateTab', 'Navigation').click();

    await steps.on('exclusionNotice', 'ColmanGraves').verifyState('visible');
    await steps.on('exclusionSummary', 'ColmanGraves')
      .verifyTextContains('Script Lab is hiding suggestions');
    await expect(page.locator('#inputs-setting-graves select.tag-selector option[value="WILD_WEST"]'))
      .toBeDisabled();
  });

  test('TC03-000034 banning an element removes it from the Graves script and says so', async ({ steps }) => {
    await steps.selectDropdown('supportingCharacterSelect', 'ColmanGraves', {
      type: DropdownSelectType.VALUE,
      value: 'SUPPORTINGCHARACTER_RIVAL',
    });
    await steps.expect('supportingCharacterSelect', 'ColmanGraves').value.toBe('SUPPORTINGCHARACTER_RIVAL');

    await steps.on('buildTab', 'Navigation').click();
    await steps.selectDropdown('excludedSupportingCharacterSelect', 'ScriptLab', {
      type: DropdownSelectType.VALUE,
      value: 'SUPPORTINGCHARACTER_RIVAL',
    });
    await steps.on('evaluateTab', 'Navigation').click();

    await steps.expect('supportingCharacterSelect', 'ColmanGraves').value.toBe('');
    await steps.on('feedbackMessage', 'ColmanGraves')
      .verifyTextContains('Removed from this script because they are now excluded: Rival.');
  });

  // The starting-tags-only checkbox was removed from this panel: exclusions are
  // owned by Script Lab alone, so Graves no longer offers a second place to
  // narrow the candidate pool. Category and fit remain.
  test('TC03-000007 best-match filters expose category and fit controls', async ({ steps, page }) => {
    await steps.on('matchCategoryFilter', 'ColmanGraves').verifyState('visible');
    await steps.on('minimumFitFilter', 'ColmanGraves').verifyState('visible');
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

  // Guard: the required categories are three tags but only ONE story element -
  // Genre and Setting are context and spend no budget (GAME_RULES.md section 1).
  test('TC03-000004 fewer than five elements is refused with the count', async ({ steps }) => {
    for (const select of ['genreSelect', 'settingSelect', 'protagonistSelect']) {
      await steps.selectDropdown(select, 'ColmanGraves', FIRST_OPTION);
    }

    await steps.on('evaluateButton', 'ColmanGraves').click();

    await steps.on('feedbackMessage', 'ColmanGraves').verifyTextContains('at least 5 story elements');
    await steps.on('feedbackMessage', 'ColmanGraves').verifyTextContains('You selected 1');
    await steps.on('resultsSection', 'ColmanGraves').verifyState('hidden');
  });

  test('TC03-000005 best matches open and the analysis modes switch', async ({ steps, page }) => {
    await makeRoomForAdditions(steps);
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
    expect(await page.locator('#gravesBestMatchesList .best-match-slot-group').count()).toBeGreaterThan(0);

    await steps.on('pairwiseTab', 'ColmanGraves').click();
    await steps.expect('pairwiseTab', 'ColmanGraves').attributes.get('class').toContain('active');
    await steps.on('bestMatchRows', 'ColmanGraves').verifyCount({ greaterThan: 0 });
    expect(await page.locator('#gravesBestMatchesList .best-match-pair-label').count()).toBeGreaterThan(0);
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

  // Genre and Setting are exempt from the story element budget, so a complete
  // script sits at the budget with the pool at its default of 5 and Best
  // Additions has nothing it may offer. No fit threshold and no category can
  // change that, so the empty state has to name the budget rather than send the
  // user round the filters.
  test('TC03-000029 Best Additions explains when the element budget is full', async ({ steps, page }) => {
    await buildValidScript(steps);
    await steps.on('evaluateButton', 'ColmanGraves').click();
    await steps.on('resultsSection', 'ColmanGraves').verifyState('visible');

    // Deliberately NOT calling makeRoomForAdditions: the default pool is the
    // condition under test.
    await steps.expect('elementPoolInput', 'Navigation').value.toBe('5');

    await steps.on('generateBestMatchesButton', 'ColmanGraves').click();
    await steps.on('bestMatchesPanel', 'ColmanGraves').verifyState('visible');

    await steps.on('bestMatchRows', 'ColmanGraves').verifyCount({ exactly: 0 });

    const message = await page.locator('#gravesBestMatchesList .empty-state').textContent();
    expect(message).toContain('already uses all 5 story elements');
    expect(message).toContain('Max Element Pool');
    expect(message).toContain('Swap Suggestions');
    expect(message).toContain('Genre and Setting do not count');
  });

  // The auto-widening retry walks the fit filter down looking for rows. When it
  // finds none it must put the control back, or the next search runs under a
  // threshold the user never picked.
  test('TC03-000030 a failed search restores the minimum fit the user chose', async ({ steps, page }) => {
    await buildValidScript(steps);
    await steps.on('evaluateButton', 'ColmanGraves').click();
    await steps.on('resultsSection', 'ColmanGraves').verifyState('visible');

    await steps.selectDropdown('minimumFitFilter', 'ColmanGraves', {
      type: DropdownSelectType.VALUE,
      value: '4.0',
    });

    // At the default pool this finds nothing at any threshold, so the retry
    // exhausts every value on its way down.
    await steps.on('generateBestMatchesButton', 'ColmanGraves').click();
    await steps.on('bestMatchRows', 'ColmanGraves').verifyCount({ exactly: 0 });

    await steps.expect('minimumFitFilter', 'ColmanGraves').value.toBe('4.0');
  });

  // Swap Suggestions covers every selected element, not just the weakest, so the
  // list spans categories. The invariant is per slot rather than global: a slot
  // may only be replaced by a candidate of its own category — you cannot swap a
  // Setting for a Finale — and each slot names its category in its own heading.
  test('TC03-000027 every Swap Suggestion matches the category of the slot it replaces', async ({ steps, page }) => {
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

    await steps.on('bestMatchRows', 'ColmanGraves').verifyCount({ greaterThan: 0 });

    const slots = await page.locator('#gravesBestMatchesList .best-match-slot-group').evaluateAll(
      (groups) => groups.map((group) => ({
        // The heading reads "<name> (<Category>). Replacing it with..."
        heading: group.querySelector('.best-match-slot-note')?.textContent ?? '',
        rowCategories: [...group.querySelectorAll('[data-role="graves-best-match"]')]
          .map((row) => row.getAttribute('data-category')),
      }))
    );

    expect(slots.length).toBeGreaterThan(0);

    for (const slot of slots) {
      const slotCategory = slot.heading.match(/\(([^)]+)\)/)?.[1];
      expect(slotCategory, `slot heading did not name a category: ${slot.heading}`).toBeTruthy();
      expect(slot.rowCategories.length).toBeGreaterThan(0);
      expect(
        slot.rowCategories.every((category) => category === slotCategory),
        `slot "${slotCategory}" offered candidates from ${[...new Set(slot.rowCategories)].join(', ')}`
      ).toBe(true);
    }
  });

  // Bug discovered: Best Additions suggests categories at their cardinality limit.
  // This test verifies the bug: suggestions must only be for categories that can accept more.
  test('TC03-000028 Best Additions respects per-category selection limits', async ({ steps, page }) => {
    await makeRoomForAdditions(steps);
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
    await steps.on('bestAdditionsTab', 'ColmanGraves').click();
    await steps.expect('bestAdditionsTab', 'ColmanGraves').attributes.get('class').toContain('active');
    await expect(page.locator('#gravesBestMatchesList [data-role="graves-best-match"]').first()).toBeVisible();

    // Verify no single-select categories are suggested. Genre is intentionally
    // allowed to keep growing as a percentage split.
    await steps.on('bestMatchRows', 'ColmanGraves').verifyCount({ greaterThan: 0 });

    const categories = await page.locator('#gravesBestMatchesList [data-category]').evaluateAll(
      (els) => els.map((el) => el.getAttribute('data-category'))
    );
    const forbiddenCategories = ['Setting', 'Protagonist', 'Antagonist', 'Finale'];
    const forbiddenFound = categories.filter(c => forbiddenCategories.includes(c));
    expect(forbiddenFound).toHaveLength(0);
  });

  test('TC03-000008 adding a suggested Theme & Event joins the Graves script', async ({ steps }) => {
    await makeRoomForAdditions(steps);
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
    const gravesCommercial = await steps.on('commercialScore', 'ColmanGraves').getText();
    const gravesArtistic = await steps.on('artisticScore', 'ColmanGraves').getText();

    await steps.on('transferToMarketButton', 'ColmanGraves').click();

    await steps.on('panel', 'MarketingRelease').verifyState('visible');
    await steps.expect('genreSelect', 'MarketingRelease').value.toBe('THRILLER');
    await steps.expect('commercialScoreInput', 'MarketingRelease').value.toBe(gravesCommercial);
    await steps.expect('artisticScoreInput', 'MarketingRelease').value.toBe(gravesArtistic);
    await steps.on('resultsSection', 'MarketingRelease').verifyState('visible');
    await steps.on('recommendedAdvertisers', 'MarketingRelease').verifyText();
  });

  test('TC03-000012 best-match category filter restricts suggestions', async ({ steps, page }) => {
    await makeRoomForAdditions(steps);
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

  test('TC03-000031 Show more states remaining suggestions and preserves existing rows', async ({ steps, page }) => {
    await steps.selectDropdown('genreSelect', 'ColmanGraves', {
      type: DropdownSelectType.VALUE,
      value: 'ACTION',
    });
    await steps.selectDropdown('minimumFitFilter', 'ColmanGraves', {
      type: DropdownSelectType.VALUE,
      value: '0',
    });

    await steps.on('generateBestMatchesButton', 'ColmanGraves').click();

    const rows = page.locator('#gravesBestMatchesList [data-role="graves-best-match"]');
    await expect(rows).toHaveCount(10);
    const firstPage = await rows.evaluateAll(items => items.map(item => item.textContent));

    const showMore = page.locator('#graves-show-more-btn');
    await expect(showMore).toBeVisible();
    await expect(showMore).toContainText(/Show more suggestions \(\d+ more available\)/);
    const remainingBefore = Number((await showMore.textContent()).match(/\((\d+) more available\)/)[1]);
    expect(remainingBefore).toBeGreaterThan(0);

    await showMore.click();

    await expect.poll(() => rows.count()).toBeGreaterThan(10);
    const afterClick = await rows.evaluateAll(items => items.map(item => item.textContent));
    expect(afterClick.slice(0, firstPage.length)).toEqual(firstPage);
  });

  // TC03-000014 removed: it drove the starting-tags-only checkbox, which no
  // longer exists. Script Lab's exclusion list is the single place that narrows
  // the candidate pool, so Graves has no starter-deck filter left to assert.

  test('TC03-000032 Pair Analysis groups pairs by band and collapses counts', async ({ steps, page }) => {
    await buildValidScript(steps);
    await steps.on('evaluateButton', 'ColmanGraves').click();

    await steps.on('resultsSection', 'ColmanGraves').verifyState('visible');
    await expect(page.locator('#gravesPairsDisplay')).toBeVisible();

    const bandTitles = page.locator('#gravesPairsDisplay .graves-pairs-band-title');
    await expect(bandTitles.first()).toBeVisible();
    const titles = await bandTitles.allTextContents();
    expect(titles.some(title => /Successful combinations \(\d+\)/.test(title))).toBe(true);
    expect(titles.some(title => /Common combinations \(\d+\)/.test(title))).toBe(true);

    const firstBand = page.locator('#gravesPairsDisplay .graves-pairs-band').first();
    const firstTitle = firstBand.locator('.graves-pairs-band-title');
    await expect(firstTitle).toHaveAttribute('aria-expanded', 'true');

    await firstTitle.click();

    await expect(firstBand).toHaveClass(/collapsed/);
    await expect(firstTitle).toHaveAttribute('aria-expanded', 'false');
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
  /**
   * Regression, reported 2026-09-23: a legal nine-element script was refused as
   * "You selected 11". Both Graves guards counted raw tags, so Genre and Setting
   * — context that spends no budget (GAME_RULES.md section 1) — were charged
   * against the 5..10 story-element bounds.
   *
   * This is the reporter's script shape exactly: 11 tags, 9 story elements.
   */
  const THEMES = [
    'THEME_TREASURE_HUNT',
    'THEME_LOVE_TRIANGLE',
    'THEME_LONG_JOURNEY',
    'THEME_A_CURSE',
    'THEME_STRUGGLE_FOR_BETTER_LIFE',
    'THEME_WAR_IS_HELL',
    'THEME_UNREQUITED_LOVE',
  ];

  // Only row 1 and row 2 are named in the element repository, so further rows
  // are reached positionally inside the category container.
  const buildScriptWithThemes = async (steps, page, themeCount) => {
    for (const [select, value] of [
      ['genreSelect', 'THRILLER'],
      ['settingSelect', 'MODERN_AMERICAN_CITY'],
      ['protagonistSelect', 'PROTAGONIST_COWBOY'],
      ['antagonistSelect', 'ANTAGONIST_HEARTLESS_BUREAUCRAT'],
      ['supportingCharacterSelect', 'SUPPORTINGCHARACTER_PARENT_FIGURE'],
      ['finaleSelect', 'FINALE_ANTAGONIST_GETS_PUNISHED'],
    ]) {
      await steps.selectDropdown(select, 'ColmanGraves', {
        type: DropdownSelectType.VALUE,
        value,
      });
    }

    // Adding a row re-renders the category container and clears values already
    // set, so every row is created first and only then filled.
    for (let index = 1; index < themeCount; index += 1) {
      await steps.on('themeEventAddButton', 'ColmanGraves').click();
    }

    const rows = page.locator('#inputs-theme-event-graves select.tag-selector');
    await expect(rows).toHaveCount(themeCount);

    for (let index = 0; index < themeCount; index += 1) {
      await rows.nth(index).selectOption(THEMES[index]);
    }

    // Guard the helper itself: a half-filled script would make the bounds test
    // pass for the wrong reason.
    expect(await rows.evaluateAll(nodes => nodes.map(node => node.value)))
      .toEqual(THEMES.slice(0, themeCount));
  };

  test('TC03-000035 a nine-element script is evaluated, not refused for its tag count', async ({ steps, page }) => {
    // 5 themes + Protagonist + Antagonist + Supporting Character + Finale = 9
    // story elements, carried by 11 tags once Genre and Setting are counted.
    await buildScriptWithThemes(steps, page, 5);

    await steps.on('evaluateButton', 'ColmanGraves').click();

    await steps.on('resultsSection', 'ColmanGraves').verifyState('visible');

    const feedback = await steps.on('feedbackMessage', 'ColmanGraves').getText();
    expect(feedback).not.toContain('evaluates up to 10');
  });

  /**
   * The upper bound had no e2e coverage at all, while colman-graves.feature
   * marked the scenario [automated]. Eleven genuine story elements: seven
   * themes plus the four mandatory-or-chosen singles.
   */
  test('TC03-000036 eleven story elements is refused with the story-element count', async ({ steps, page }) => {
    await buildScriptWithThemes(steps, page, 7);

    await steps.on('evaluateButton', 'ColmanGraves').click();

    await steps.on('feedbackMessage', 'ColmanGraves').verifyTextContains('evaluates up to 10 story elements');
    await steps.on('feedbackMessage', 'ColmanGraves').verifyTextContains('You selected 11');
    await steps.on('resultsSection', 'ColmanGraves').verifyState('hidden');
  });
});
