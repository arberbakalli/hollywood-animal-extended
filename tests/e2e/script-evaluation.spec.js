import { test } from '../fixtures/base.js';
import { DropdownSelectType } from '@civitas-cerebrum/element-interactions';

// Index 1 is the first real option; index 0 is the "-- Select X --" placeholder.
// Picking by position rather than tag id keeps these smoke tests working when
// the game data changes.
const FIRST_OPTION = { type: DropdownSelectType.INDEX, index: 1 };

const buildScript = async (steps, page) => {
  for (const select of ['genreSelect', 'settingSelect', 'protagonistSelect',
                        'antagonistSelect', 'supportingCharacterSelect']) {
    await steps.selectDropdown(select, page, FIRST_OPTION);
  }
};

test.describe('Script Evaluation — Compatibility Numbers', () => {
  test.beforeEach(async ({ steps }) => {
    await steps.navigateTo('/', { waitUntil: 'domcontentloaded' });
    await steps.on('supportingCharacterSelect', 'ScriptEvaluation').waitForState('attached');
    await steps.on('evaluateTab', 'Navigation').click();
  });

  // The happy flow: pick elements, score them, read the result.
  // A smoke test — it asserts the flow completes and renders, not that any
  // particular number is correct.
  test('building a script and checking compatibility renders a full result', async ({ steps }) => {
    await steps.on('resultsSection', 'ScriptEvaluation').verifyState('hidden');

    await buildScript(steps, 'ScriptEvaluation');
    await steps.on('checkCompatibilityButton', 'ScriptEvaluation').click();

    await steps.on('resultsSection', 'ScriptEvaluation').verifyState('visible');
    await steps.on('averageCompatibility', 'ScriptEvaluation').verifyTextContains('/ 5.0');
    await steps.on('scriptSynergyTotal', 'ScriptEvaluation').verifyText();
    await steps.on('breakdownBaseScore', 'ScriptEvaluation').verifyText();
    await steps.on('breakdownCommercialBonus', 'ScriptEvaluation').verifyText();
    await steps.on('breakdownArtisticBonus', 'ScriptEvaluation').verifyText();
    await steps.on('totalCommercialScore', 'ScriptEvaluation').verifyText();
    await steps.on('totalArtisticScore', 'ScriptEvaluation').verifyText();
    await steps.on('conflictsList', 'ScriptEvaluation').verifyText();
  });

  // Guard: the app must say what it needs rather than fail silently.
  test('checking compatibility with nothing selected asks for a tag', async ({ steps }) => {
    await steps.on('checkCompatibilityButton', 'ScriptEvaluation').click();

    await steps.on('feedbackMessage', 'ScriptEvaluation').verifyState('visible');
    await steps.on('resultsSection', 'ScriptEvaluation').verifyState('hidden');
  });

  test('quick search offers matching story elements', async ({ steps }) => {
    await steps.on('quickSearch', 'ScriptEvaluation').fill('Sidekick');

    await steps.on('quickSearchResults', 'ScriptEvaluation').verifyState('visible');
    await steps.on('quickSearchResultItems', 'ScriptEvaluation').verifyCount({ greaterThan: 0 });
    await steps.on('quickSearchResultItems', 'ScriptEvaluation').first().verifyTextContains('Sidekick');
  });

  // The hand-off between the two product areas — the flow most likely to break
  // quietly, since it crosses a tab boundary and re-initialises selectors.
  test('transferring to Marketing and Release carries the script over', async ({ steps }) => {
    await buildScript(steps, 'ScriptEvaluation');
    await steps.on('checkCompatibilityButton', 'ScriptEvaluation').click();
    await steps.on('resultsSection', 'ScriptEvaluation').verifyState('visible');

    await steps.on('transferToMarketButton', 'ScriptEvaluation').click();

    await steps.on('panel', 'MarketingRelease').verifyState('visible');
    await steps.on('distributionCard', 'MarketingRelease').verifyState('visible');
    await steps.expect('genreSelect', 'MarketingRelease').value.not.toBe('');
    await steps.expect('supportingCharacterSelect', 'MarketingRelease').value.not.toBe('');
  });

  test('resetting clears the selection and hides the results', async ({ steps }) => {
    await buildScript(steps, 'ScriptEvaluation');
    await steps.on('checkCompatibilityButton', 'ScriptEvaluation').click();
    await steps.on('resultsSection', 'ScriptEvaluation').verifyState('visible');

    await steps.on('resetButton', 'ScriptEvaluation').click();

    await steps.on('resultsSection', 'ScriptEvaluation').verifyState('hidden');
    await steps.expect('genreSelect', 'ScriptEvaluation').value.toBe('');
  });
});
