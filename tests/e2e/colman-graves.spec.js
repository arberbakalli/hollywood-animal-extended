import { test, expect, openHollywood } from '../fixtures/base.js';
import { DropdownSelectType } from '@civitas-cerebrum/element-interactions';

const scoreIn = async (steps, elementName) => {
  const text = await steps.on(elementName, 'ColmanGraves').getText();
  return Number(text.match(/-?\d+(?:\.\d+)?/)?.[0]);
};

const FIRST_OPTION = { type: DropdownSelectType.INDEX, index: 1 };

// Graves rejects a script unless Genre, Setting and Protagonist are all present
// AND there are at least five elements in total. These five satisfy both.
const REQUIRED_PLUS_TWO = [
  'genreSelect', 'settingSelect', 'protagonistSelect',
  'antagonistSelect', 'supportingCharacterSelect',
];

const buildValidScript = async (steps) => {
  for (const select of REQUIRED_PLUS_TWO) {
    await steps.selectDropdown(select, 'ColmanGraves', FIRST_OPTION);
  }
};

test.describe('Script Evaluation — Colman Graves', () => {
  test.beforeEach(async ({ steps }) => {
    await openHollywood(steps);
    await steps.on('evaluateTab', 'Navigation').click();
    await steps.on('gravesModeButton', 'ScriptEvaluation').click();
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

  test('TC03-000006 resetting clears the submission and hides the verdict', async ({ steps }) => {
    await buildValidScript(steps);
    await steps.on('evaluateButton', 'ColmanGraves').click();
    await steps.on('resultsSection', 'ColmanGraves').verifyState('visible');

    await steps.on('resetButton', 'ColmanGraves').click();

    await steps.on('resultsSection', 'ColmanGraves').verifyState('hidden');
    await steps.expect('genreSelect', 'ColmanGraves').value.toBe('');
  });
});
