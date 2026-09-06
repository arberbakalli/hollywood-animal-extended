import { test, expect, openHollywood } from '../fixtures/base.js';
import { DropdownSelectType } from '@civitas-cerebrum/element-interactions';

const scoreIn = async (steps, elementName) => {
  const text = await steps.on(elementName, 'ScriptEvaluation').getText();
  return Number(text.match(/-?\d+(?:\.\d+)?/)?.[0]);
};

// Index 1 is the first real option; index 0 is the "-- Select X --" placeholder.
// Picking by position rather than tag id keeps these smoke tests working when
// the game data changes.
const FIRST_OPTION = { type: DropdownSelectType.INDEX, index: 1 };
const SIDEKICK = 'SUPPORTINGCHARACTER_SIDEKICK';
const AMERICAN_CIVIL_WAR = 'AMERICAN_CIVIL_WAR';
const ALIEN = 'ANTAGONIST_ALIEN';

const buildScript = async (steps, page) => {
  for (const select of ['genreSelect', 'settingSelect', 'protagonistSelect',
                        'antagonistSelect', 'supportingCharacterSelect']) {
    await steps.selectDropdown(select, page, FIRST_OPTION);
  }
};

test.describe('Script Evaluation — Compatibility Numbers', () => {
  test.beforeEach(async ({ steps }) => {
    await openHollywood(steps);
    await steps.on('evaluateTab', 'Navigation').click();
  });

  // The happy flow: pick elements, score them, read the result.
  // A smoke test — it asserts the flow completes and renders, not that any
  // particular number is correct.
  // Careful here: index.html already ships "0.0 / 5.0", "0.00", "0" and
  // "No conflicts found.", so merely asserting those nodes are non-empty passes
  // against a page that computed nothing. Every assertion below is one the
  // static document fails.
  test('TC02-000001 building a script and checking compatibility renders a full result', async ({ steps }) => {
    await steps.on('resultsSection', 'ScriptEvaluation').verifyState('hidden');
    // renderSynergyResults creates this label; it is absent from the markup.
    await steps.on('scoreCapLabel', 'ScriptEvaluation').verifyState('detached');

    await buildScript(steps, 'ScriptEvaluation');
    await steps.on('checkCompatibilityButton', 'ScriptEvaluation').click();

    await steps.on('resultsSection', 'ScriptEvaluation').verifyState('visible');
    await steps.on('scoreCapLabel', 'ScriptEvaluation').verifyTextContains('Scoring Elements');
    await steps.on('scoreCapLabel', 'ScriptEvaluation').verifyTextContains('Max Score Capped');
    // The renderer writes "No severe conflicts found."; the markup says
    // "No conflicts found.", so this fails unless the conflicts pass ran.
    await steps.expect('conflictsList', 'ScriptEvaluation').text.not.toContain('No conflicts found.');

    expect(await scoreIn(steps, 'averageCompatibility')).toBeGreaterThan(0);
  });

  // The synergy total ships as 0.00 in the markup, so moving off it is proof the
  // matrix was actually computed. The commercial and artistic movie scores are
  // deliberately not asserted non-zero: a weak script legitimately floors at 0.0,
  // and pinning them here would assert a rule the app does not have.
  test('TC02-000002 scoring a script moves the synergy total off zero', async ({ steps }) => {
    expect(await scoreIn(steps, 'scriptSynergyTotal')).toBe(0);

    await buildScript(steps, 'ScriptEvaluation');
    await steps.on('checkCompatibilityButton', 'ScriptEvaluation').click();
    await steps.on('scoreCapLabel', 'ScriptEvaluation').verifyState('visible');

    expect(await scoreIn(steps, 'scriptSynergyTotal')).not.toBe(0);
  });

  // Guard: the app must say what it needs rather than fail silently.
  test('TC02-000003 checking compatibility with nothing selected asks for a tag', async ({ steps }) => {
    await steps.on('checkCompatibilityButton', 'ScriptEvaluation').click();

    await steps.on('feedbackMessage', 'ScriptEvaluation').verifyState('visible');
    await steps.on('resultsSection', 'ScriptEvaluation').verifyState('hidden');
  });

  test('TC02-000004 quick search offers matching story elements', async ({ steps }) => {
    await steps.on('quickSearch', 'ScriptEvaluation').fill('Sidekick');

    await steps.on('quickSearchResults', 'ScriptEvaluation').verifyState('visible');
    await steps.on('quickSearchResultItems', 'ScriptEvaluation').verifyCount({ greaterThan: 0 });
    await steps.on('quickSearchResultItems', 'ScriptEvaluation').first().verifyTextContains('Sidekick');
  });

  test('TC02-000005 clicking a quick-search result adds it to the selection', async ({ steps }) => {
    await steps.on('quickSearch', 'ScriptEvaluation').fill('Sidekick');
    await steps.on('quickSearchResultItems', 'ScriptEvaluation').first().click();

    await steps.expect('supportingCharacterSelect', 'ScriptEvaluation').value.toBe(SIDEKICK);
    await steps.on('quickSearchResults', 'ScriptEvaluation').verifyState('hidden');
  });

  test('TC02-000006 clashing elements are reported in the conflicts panel', async ({ steps }) => {
    await steps.selectDropdown('settingSelect', 'ScriptEvaluation', {
      type: DropdownSelectType.VALUE,
      value: AMERICAN_CIVIL_WAR,
    });
    await steps.selectDropdown('antagonistSelect', 'ScriptEvaluation', {
      type: DropdownSelectType.VALUE,
      value: ALIEN,
    });

    await steps.on('checkCompatibilityButton', 'ScriptEvaluation').click();

    await steps.on('resultsSection', 'ScriptEvaluation').verifyState('visible');
    await steps.on('conflictsList', 'ScriptEvaluation').verifyTextContains('American Civil War');
    await steps.on('conflictsList', 'ScriptEvaluation').verifyTextContains('Alien');
  });

  // The hand-off between the two product areas — the flow most likely to break
  // quietly, since it crosses a tab boundary and re-initialises selectors.
  test('TC02-000007 transferring to Marketing and Release carries the script over', async ({ steps }) => {
    await buildScript(steps, 'ScriptEvaluation');
    await steps.on('checkCompatibilityButton', 'ScriptEvaluation').click();
    await steps.on('resultsSection', 'ScriptEvaluation').verifyState('visible');

    await steps.on('transferToMarketButton', 'ScriptEvaluation').click();

    await steps.on('panel', 'MarketingRelease').verifyState('visible');
    await steps.on('distributionCard', 'MarketingRelease').verifyState('visible');
    await steps.expect('genreSelect', 'MarketingRelease').value.not.toBe('');
    await steps.expect('supportingCharacterSelect', 'MarketingRelease').value.not.toBe('');
  });

  test('TC02-000008 saving an evaluated script adds it to Script Library', async ({ steps }) => {
    await buildScript(steps, 'ScriptEvaluation');
    await steps.on('checkCompatibilityButton', 'ScriptEvaluation').click();
    await steps.on('resultsSection', 'ScriptEvaluation').verifyState('visible');

    await steps.on('saveToLibraryButton', 'ScriptEvaluation').click();

    await steps.on('feedbackMessage', 'ScriptEvaluation')
      .verifyTextContains('Saved to your script library');
    await steps.on('buildTab', 'Navigation').click();
    await steps.on('pinnedSection', 'ScriptLab').verifyState('visible');
    await steps.on('pinnedCards', 'ScriptLab').verifyCount({ greaterThan: 0 });
  });

  test('TC02-000009 resetting clears the selection and hides the results', async ({ steps }) => {
    await buildScript(steps, 'ScriptEvaluation');
    await steps.on('checkCompatibilityButton', 'ScriptEvaluation').click();
    await steps.on('resultsSection', 'ScriptEvaluation').verifyState('visible');

    await steps.on('resetButton', 'ScriptEvaluation').click();

    await steps.on('resultsSection', 'ScriptEvaluation').verifyState('hidden');
    await steps.expect('genreSelect', 'ScriptEvaluation').value.toBe('');
  });
});
