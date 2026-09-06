import { test } from '../fixtures/base.js';
import { DropdownSelectType } from '@civitas-cerebrum/element-interactions';

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
    await steps.navigateTo('/', { waitUntil: 'domcontentloaded' });
    await steps.on('supportingCharacterSelect', 'ColmanGraves').waitForState('attached');
    await steps.on('evaluateTab', 'Navigation').click();
    await steps.on('gravesModeButton', 'ScriptEvaluation').click();
    await steps.on('panel', 'ColmanGraves').waitForState('visible');
  });

  test('all seven story element categories are offered', async ({ steps }) => {
    await steps.on('allTagSelects', 'ColmanGraves').verifyCount({ exactly: 7 });
  });

  // The happy flow: submit a valid script and read the verdict.
  test('submitting a valid script produces a verdict and scores', async ({ steps }) => {
    await steps.on('resultsSection', 'ColmanGraves').verifyState('hidden');

    await buildValidScript(steps);
    await steps.on('evaluateButton', 'ColmanGraves').click();

    await steps.on('resultsSection', 'ColmanGraves').verifyState('visible');
    await steps.on('verdict', 'ColmanGraves').verifyText();
    await steps.expect('verdict', 'ColmanGraves').text.not.toBe('-');
    await steps.on('averageFit', 'ColmanGraves').verifyTextContains('/ 5.0');
    await steps.on('commercialScore', 'ColmanGraves').verifyText();
    await steps.on('artisticScore', 'ColmanGraves').verifyText();
    await steps.on('verdictText', 'ColmanGraves').verifyText();
    await steps.on('audienceDisplay', 'ColmanGraves').verifyText();
  });

  // Guard: a script missing a required category is refused by name.
  test('a script missing required categories names what is missing', async ({ steps }) => {
    await steps.selectDropdown('supportingCharacterSelect', 'ColmanGraves', FIRST_OPTION);

    await steps.on('evaluateButton', 'ColmanGraves').click();

    await steps.on('feedbackMessage', 'ColmanGraves').verifyState('visible');
    await steps.on('feedbackMessage', 'ColmanGraves').verifyTextContains('Genre');
    await steps.on('resultsSection', 'ColmanGraves').verifyState('hidden');
  });

  // Guard: the required categories alone are only three elements.
  test('fewer than five elements is refused with the count', async ({ steps }) => {
    for (const select of ['genreSelect', 'settingSelect', 'protagonistSelect']) {
      await steps.selectDropdown(select, 'ColmanGraves', FIRST_OPTION);
    }

    await steps.on('evaluateButton', 'ColmanGraves').click();

    await steps.on('feedbackMessage', 'ColmanGraves').verifyTextContains('at least 5 story elements');
    await steps.on('feedbackMessage', 'ColmanGraves').verifyTextContains('You selected 3');
    await steps.on('resultsSection', 'ColmanGraves').verifyState('hidden');
  });

  test('best matches open and the analysis modes switch', async ({ steps }) => {
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

    await steps.on('swapSuggestionsTab', 'ColmanGraves').click();
    await steps.on('bestMatchesPanel', 'ColmanGraves').verifyState('visible');

    await steps.on('pairwiseTab', 'ColmanGraves').click();
    await steps.on('bestMatchesPanel', 'ColmanGraves').verifyState('visible');
  });

  test('resetting clears the submission and hides the verdict', async ({ steps }) => {
    await buildValidScript(steps);
    await steps.on('evaluateButton', 'ColmanGraves').click();
    await steps.on('resultsSection', 'ColmanGraves').verifyState('visible');

    await steps.on('resetButton', 'ColmanGraves').click();

    await steps.on('resultsSection', 'ColmanGraves').verifyState('hidden');
    await steps.expect('genreSelect', 'ColmanGraves').value.toBe('');
  });
});
