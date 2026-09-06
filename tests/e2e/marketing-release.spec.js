import { test, expect, openHollywood } from '../fixtures/base.js';
import { DropdownSelectType } from '@civitas-cerebrum/element-interactions';

const FIRST_OPTION = { type: DropdownSelectType.INDEX, index: 1 };
const SIDEKICK = 'SUPPORTINGCHARACTER_SIDEKICK';

const buildMarketingScript = async (steps) => {
  for (const select of ['genreSelect', 'supportingCharacterSelect', 'themeEventSelect']) {
    await steps.selectDropdown(select, 'MarketingRelease', FIRST_OPTION);
  }
};

const screenings = async (steps, elementName) => {
  const text = await steps.on(elementName, 'MarketingRelease').getText();
  return Number(text.replace(/[^0-9]/g, ''));
};

test.describe('Marketing and Release — distribution calculator', () => {
  test.beforeEach(async ({ steps }) => {
    await openHollywood(steps);
    // This suite drives the distribution toggles and sliders, whose listeners are
    // bound late in initializeApp — long after the selectors exist.
    await steps.on('marketTab', 'Navigation').click();
  });

  // Given the Market tab is open
  // Then the distribution calculator is available before any analysis
  test('TC04-000001 the distribution calculator is shown before any analysis', async ({ steps }) => {
    await steps.on('panel', 'MarketingRelease').verifyState('visible');
    await steps.on('distributionCard', 'MarketingRelease').verifyState('visible');
    await steps.on('resultsSection', 'MarketingRelease').verifyState('hidden');
  });

  // Week cards must be addressable. Regression: they carried no id at all.
  test('TC04-000002 week cards expose stable ids and their week number', async ({ steps }) => {
    await steps.on('weekCards', 'MarketingRelease').verifyCount({ exactly: 8 });

    await steps.on('weekOneCard', 'MarketingRelease').verifyState('visible');
    await steps.on('weekEightCard', 'MarketingRelease').verifyState('visible');

    await steps.expect('weekOneCard', 'MarketingRelease').attributes.get('data-week').toBe('1');
    await steps.expect('weekEightCard', 'MarketingRelease').attributes.get('data-week').toBe('8');
    await steps.on('weekOneValue', 'MarketingRelease').verifyText();
  });

  // Given the default commercial score
  // Then attendance falls across the eight-week run
  test('TC04-000003 screening projections decline across the run', async ({ steps }) => {
    const week1 = await screenings(steps, 'weekOneValue');
    const week8 = await screenings(steps, 'weekEightValue');

    expect(week1).toBeGreaterThan(week8);
  });

  // The Behemoth policy documents a +25% week-one boost.
  test('TC04-000004 the Behemoth bonus raises the week one projection', async ({ steps }) => {
    const before = await screenings(steps, 'weekOneValue');

    await steps.on('behemothToggle', 'MarketingRelease').check();

    await expect
      .poll(async () => screenings(steps, 'weekOneValue'))
      .toBeGreaterThan(before);
  });

  // Given the user raises the target commercial score
  // Then the calculator echoes it and recalculates
  test('TC04-000005 the calculator follows the commercial score', async ({ steps }) => {
    const before = await screenings(steps, 'weekOneValue');

    await steps.setSliderValue('commercialScoreSlider', 'MarketingRelease', 8);

    await steps.on('distributionCommercialScore', 'MarketingRelease').verifyTextContains('8');
    // Echoing the label is not the same as recalculating the grid.
    await expect
      .poll(async () => screenings(steps, 'weekOneValue'))
      .not.toBe(before);
  });

  test('TC04-000006 setting the movie scores updates their paired inputs', async ({ steps }) => {
    await steps.setSliderValue('commercialScoreSlider', 'MarketingRelease', 8);
    await steps.setSliderValue('artisticScoreSlider', 'MarketingRelease', 3);

    await steps.expect('commercialScoreInput', 'MarketingRelease').value.toMatch(/^8(\.0)?$/);
    await steps.expect('artisticScoreInput', 'MarketingRelease').value.toMatch(/^3(\.0)?$/);
  });

  test('TC04-000007 changing owned theatres recalculates screening projections', async ({ steps }) => {
    const before = await screenings(steps, 'weekOneValue');

    await steps.on('ownedScreeningsInput', 'MarketingRelease').fill('5000');

    await expect
      .poll(async () => screenings(steps, 'weekOneValue'))
      .toBeLessThan(before);
  });

  test('TC04-000008 the Striking Image bonus raises the week one projection', async ({ steps }) => {
    const before = await screenings(steps, 'weekOneValue');

    await steps.on('strikingImageToggle', 'MarketingRelease').check();

    await expect
      .poll(async () => screenings(steps, 'weekOneValue'))
      .toBeGreaterThan(before);
  });

  test('TC04-000009 the Artistic Ability bonus raises the week one projection', async ({ steps }) => {
    const before = await screenings(steps, 'weekOneValue');

    await steps.on('artisticAbilityToggle', 'MarketingRelease').check();

    await expect
      .poll(async () => screenings(steps, 'weekOneValue'))
      .toBeGreaterThan(before);
  });

  test('TC04-000010 analysing a script produces a marketing profile', async ({ steps }) => {
    await steps.setSliderValue('commercialScoreSlider', 'MarketingRelease', 8);
    await steps.setSliderValue('artisticScoreSlider', 'MarketingRelease', 3);
    await buildMarketingScript(steps);

    await steps.on('analyzeScriptButton', 'MarketingRelease').click();

    await steps.on('resultsSection', 'MarketingRelease').verifyState('visible');
    await steps.on('targetAudience', 'MarketingRelease').verifyText();
    await steps.on('holidayRelease', 'MarketingRelease').verifyText();
    await steps.on('movieLean', 'MarketingRelease').verifyText('Commercial');
    await steps.on('recommendedAdvertisers', 'MarketingRelease').verifyTextContains('Top Pick');
    await steps.on('campaignDuration', 'MarketingRelease').verifyTextContains('Total Duration');
  });

  test('TC04-000011 saving an analysed script adds it to Script Library', async ({ steps }) => {
    await buildMarketingScript(steps);
    await steps.on('analyzeScriptButton', 'MarketingRelease').click();
    await steps.on('resultsSection', 'MarketingRelease').verifyState('visible');

    await steps.on('saveToLibraryButton', 'MarketingRelease').click();

    await steps.on('feedbackMessage', 'MarketingRelease')
      .verifyTextContains('Saved to your script library');
    await steps.on('buildTab', 'Navigation').click();
    await steps.on('pinnedSection', 'ScriptLab').verifyState('visible');
    await steps.on('pinnedCards', 'ScriptLab').verifyCount({ greaterThan: 0 });
  });

  test('TC04-000012 resetting clears the marketing selection', async ({ steps }) => {
    await buildMarketingScript(steps);
    await steps.expect('genreSelect', 'MarketingRelease').value.not.toBe('');

    await steps.on('resetButton', 'MarketingRelease').click();

    await steps.expect('genreSelect', 'MarketingRelease').value.toBe('');
    await steps.on('resultsSection', 'MarketingRelease').verifyState('hidden');
  });
});

test.describe('Marketing and Release — Build for Target', () => {
  test.beforeEach(async ({ steps }) => {
    await openHollywood(steps);
    await steps.on('marketTab', 'Navigation').click();
    await steps.on('buildForTargetModeButton', 'MarketingRelease').click();
    await steps.on('allTagSelects', 'BuildForTarget').waitForState('visible');
  });

  test('TC05-000001 Build for Target offers audiences, advertisers and tag pickers', async ({ steps }) => {
    await steps.on('panel', 'BuildForTarget').verifyState('visible');

    await steps.on('audienceCheckboxes', 'BuildForTarget').verifyCount({ greaterThan: 0 });
    await steps.on('advertiserCheckboxes', 'BuildForTarget').verifyCount({ greaterThan: 0 });
    await steps.on('allTagSelects', 'BuildForTarget').verifyCount({ exactly: 7 });
    await steps.on('resultsPanel', 'BuildForTarget').verifyState('hidden');
  });

  // Given no audience and no advertiser is chosen
  // When the user searches for combinations
  // Then the app explains what is missing instead of failing silently
  test('TC05-000002 searching with no audience or advertiser explains what is missing', async ({ steps }) => {
    await steps.on('findCombinationsButton', 'BuildForTarget').click();

    await steps.on('feedbackMessage', 'BuildForTarget').verifyState('visible');
    await steps.on('feedbackMessage', 'BuildForTarget')
      .verifyTextContains('at least one audience or advertiser');
    await steps.on('resultsPanel', 'BuildForTarget').verifyState('hidden');
  });

  // Given an audience is chosen
  // When the user searches for combinations
  // Then results are produced
  test('TC05-000003 choosing an audience produces top combinations', async ({ steps }) => {
    await steps.on('audienceCheckboxes', 'BuildForTarget').first().check();

    await steps.on('findCombinationsButton', 'BuildForTarget').click();

    await steps.on('resultsPanel', 'BuildForTarget').verifyState('visible');
    await steps.on('resultsList', 'BuildForTarget').verifyText();
  });

  test('TC05-000004 narrowing the search with an optional tag keeps that tag in results', async ({ steps }) => {
    await steps.on('audienceCheckboxes', 'BuildForTarget').first().check();
    await steps.selectDropdown('supportingCharacterSelect', 'BuildForTarget', {
      type: DropdownSelectType.VALUE,
      value: SIDEKICK,
    });

    await steps.on('findCombinationsButton', 'BuildForTarget').click();

    await steps.on('resultsPanel', 'BuildForTarget').verifyState('visible');
    await steps.on('resultsList', 'BuildForTarget').verifyTextContains('Sidekick');
  });

  test('TC05-000005 more than six optional tags is refused with the selected count', async ({ steps }) => {
    await steps.on('audienceCheckboxes', 'BuildForTarget').first().check();
    for (const select of [
      'genreSelect',
      'settingSelect',
      'protagonistSelect',
      'antagonistSelect',
      'supportingCharacterSelect',
      'themeEventSelect',
      'finaleSelect',
    ]) {
      await steps.selectDropdown(select, 'BuildForTarget', FIRST_OPTION);
    }

    await steps.on('findCombinationsButton', 'BuildForTarget').click();

    await steps.on('feedbackMessage', 'BuildForTarget').verifyTextContains('Pick 6 or fewer optional tags');
    await steps.on('feedbackMessage', 'BuildForTarget').verifyTextContains('You selected 7');
    await steps.on('resultsPanel', 'BuildForTarget').verifyState('hidden');
  });

  test('TC05-000006 selecting an advertiser targets that agency directly', async ({ steps, page }) => {
    const advertiserName = (await page
      .locator('#targeted-advertiser-checkboxes .targeted-checkbox-item')
      .first()
      .innerText()).trim();

    await steps.on('advertiserCheckboxes', 'BuildForTarget').first().check();
    await steps.on('findCombinationsButton', 'BuildForTarget').click();

    await steps.on('checkedAdvertiserCheckboxes', 'BuildForTarget').verifyCount({ exactly: 1 });
    await steps.on('resultsPanel', 'BuildForTarget').verifyState('visible');
    await steps.on('resultsList', 'BuildForTarget').verifyTextContains(advertiserName);
  });

  test('TC05-000007 switching back to Analyze Script shows the marketing panel', async ({ steps }) => {
    await steps.on('analyzeScriptModeButton', 'BuildForTarget').click();

    await steps.on('panel', 'MarketingRelease').verifyState('visible');
    await steps.on('panel', 'BuildForTarget').verifyState('hidden');
  });

  // Given the user has made selections
  // When they reset
  // Then the panel returns to its empty state
  test('TC05-000008 resetting clears audiences and hides results', async ({ steps }) => {
    await steps.on('audienceCheckboxes', 'BuildForTarget').first().check();
    await steps.on('checkedAudienceCheckboxes', 'BuildForTarget').verifyCount({ exactly: 1 });
    await steps.on('findCombinationsButton', 'BuildForTarget').click();
    await steps.on('resultsPanel', 'BuildForTarget').verifyState('visible');

    await steps.on('resetButton', 'BuildForTarget').click();

    await steps.on('resultsPanel', 'BuildForTarget').verifyState('hidden');
    // The checkbox stays visible either way; what reset must do is uncheck it.
    await steps.on('checkedAudienceCheckboxes', 'BuildForTarget').verifyCount({ exactly: 0 });
  });
});
