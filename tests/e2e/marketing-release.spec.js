import { test, expect } from '../fixtures/base.js';

const screenings = async (steps, elementName) => {
  const text = await steps.on(elementName, 'MarketingRelease').getText();
  return Number(text.replace(/[^0-9]/g, ''));
};

test.describe('Marketing and Release — distribution calculator', () => {
  test.beforeEach(async ({ steps }) => {
    await steps.navigateTo('/', { waitUntil: 'domcontentloaded' });
    // Gate on the panel this suite uses; the app builds each context's
    // selectors separately and 'targeted' is the last to finish.
    await steps.on('supportingCharacterSelect', 'MarketingRelease').waitForState('attached');
    await steps.on('marketTab', 'Navigation').click();
  });

  // Given the Market tab is open
  // Then the distribution calculator is available before any analysis
  test('the distribution calculator is shown before any analysis', async ({ steps }) => {
    await steps.on('panel', 'MarketingRelease').verifyState('visible');
    await steps.on('distributionCard', 'MarketingRelease').verifyState('visible');
    await steps.on('resultsSection', 'MarketingRelease').verifyState('hidden');
  });

  // Week cards must be addressable. Regression: they carried no id at all.
  test('week cards expose stable ids and their week number', async ({ steps }) => {
    await steps.on('weekCards', 'MarketingRelease').verifyCount({ exactly: 8 });

    await steps.on('weekOneCard', 'MarketingRelease').verifyState('visible');
    await steps.on('weekEightCard', 'MarketingRelease').verifyState('visible');

    await steps.expect('weekOneCard', 'MarketingRelease').attributes.get('data-week').toBe('1');
    await steps.expect('weekEightCard', 'MarketingRelease').attributes.get('data-week').toBe('8');
    await steps.on('weekOneValue', 'MarketingRelease').verifyText();
  });

  // Given the default commercial score
  // Then attendance falls across the eight-week run
  test('screening projections decline across the run', async ({ steps }) => {
    const week1 = await screenings(steps, 'weekOneValue');
    const week8 = await screenings(steps, 'weekEightValue');

    expect(week1).toBeGreaterThan(week8);
  });

  // The Behemoth policy documents a +25% week-one boost.
  test('the Behemoth bonus raises the week one projection', async ({ steps }) => {
    const before = await screenings(steps, 'weekOneValue');

    await steps.on('behemothToggle', 'MarketingRelease').check();

    await expect
      .poll(async () => screenings(steps, 'weekOneValue'))
      .toBeGreaterThan(before);
  });

  // Given the user raises the target commercial score
  // Then the calculator echoes it and recalculates
  test('the calculator follows the commercial score', async ({ steps }) => {
    await steps.setSliderValue('commercialScoreSlider', 'MarketingRelease', 8);

    await steps.on('distributionCommercialScore', 'MarketingRelease').verifyTextContains('8');
  });
});

test.describe('Marketing and Release — Build for Target', () => {
  test.beforeEach(async ({ steps }) => {
    await steps.navigateTo('/', { waitUntil: 'domcontentloaded' });
    await steps.on('supportingCharacterSelect', 'MarketingRelease').waitForState('attached');
    await steps.on('marketTab', 'Navigation').click();
    await steps.on('buildForTargetModeButton', 'MarketingRelease').click();
    await steps.on('allTagSelects', 'BuildForTarget').waitForState('visible');
  });

  test('Build for Target offers audiences, advertisers and tag pickers', async ({ steps }) => {
    await steps.on('panel', 'BuildForTarget').verifyState('visible');

    await steps.on('audienceCheckboxes', 'BuildForTarget').verifyCount({ greaterThan: 0 });
    await steps.on('advertiserCheckboxes', 'BuildForTarget').verifyCount({ greaterThan: 0 });
    await steps.on('allTagSelects', 'BuildForTarget').verifyCount({ exactly: 7 });
    await steps.on('resultsPanel', 'BuildForTarget').verifyState('hidden');
  });

  // Given no audience and no advertiser is chosen
  // When the user searches for combinations
  // Then the app explains what is missing instead of failing silently
  test('searching with no audience or advertiser explains what is missing', async ({ steps }) => {
    await steps.on('findCombinationsButton', 'BuildForTarget').click();

    await steps.on('feedbackMessage', 'BuildForTarget').verifyState('visible');
    await steps.on('feedbackMessage', 'BuildForTarget')
      .verifyTextContains('at least one audience or advertiser');
    await steps.on('resultsPanel', 'BuildForTarget').verifyState('hidden');
  });

  // Given an audience is chosen
  // When the user searches for combinations
  // Then results are produced
  test('choosing an audience produces top combinations', async ({ steps }) => {
    await steps.on('audienceCheckboxes', 'BuildForTarget').first().check();

    await steps.on('findCombinationsButton', 'BuildForTarget').click();

    await steps.on('resultsPanel', 'BuildForTarget').verifyState('visible');
    await steps.on('resultsList', 'BuildForTarget').verifyText();
  });

  // Given the user has made selections
  // When they reset
  // Then the panel returns to its empty state
  test('resetting clears audiences and hides results', async ({ steps }) => {
    await steps.on('audienceCheckboxes', 'BuildForTarget').first().check();
    await steps.on('findCombinationsButton', 'BuildForTarget').click();
    await steps.on('resultsPanel', 'BuildForTarget').verifyState('visible');

    await steps.on('resetButton', 'BuildForTarget').click();

    await steps.on('resultsPanel', 'BuildForTarget').verifyState('hidden');
    await steps.on('audienceCheckboxes', 'BuildForTarget').first().verifyState('visible');
  });
});
