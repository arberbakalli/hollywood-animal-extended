import { test, expect } from '../fixtures/base.js';
import { DropdownSelectType } from '@civitas-cerebrum/element-interactions';

test.describe('Script Lab — generator', () => {
  test.beforeEach(async ({ steps }) => {
    await steps.navigateTo('/', { waitUntil: 'domcontentloaded' });
    // The tag selectors are built by the app at runtime; their presence is the
    // readiness signal that its event listeners are bound.
    await steps.on('lockedSupportingCharacterSelect', 'ScriptLab').waitForState('attached');
    await steps.on('buildTab', 'Navigation').click();
  });

  // Given the app is open
  // When the user opens the Build tab
  // Then the Script Lab panel is shown
  test('Build tab reveals the Script Lab panel', async ({ steps }) => {
    await steps.on('panel', 'ScriptLab').verifyState('visible');
    await steps.on('generateButton', 'ScriptLab').verifyText('Generate Scripts');
  });

  // Given the user is on Script Lab with default targets
  // When they generate
  // Then the results section appears with at least one script card
  test('generating with default targets produces script cards', async ({ steps }) => {
    await steps.on('resultsSection', 'ScriptLab').verifyState('hidden');

    await steps.on('generateButton', 'ScriptLab').click();

    await steps.on('resultsSection', 'ScriptLab').verifyState('visible');
    await steps.on('generatedCards', 'ScriptLab').verifyCount({ greaterThan: 0 });
    await steps.on('generatedTagChips', 'ScriptLab').verifyCount({ greaterThan: 0 });
  });

  // Given the user is on Script Lab
  // When they move the compatibility slider to its maximum
  // Then the paired number input reflects the same value
  test('compatibility slider drives the paired number input', async ({ steps }) => {
    await steps.setSliderValue('compatibilitySlider', 'ScriptLab', 5);

    await steps.expect('compatibilityInput', 'ScriptLab').value.toMatch(/^5(\.0)?$/);
  });

  // Given the excluded-elements section is open
  // When the user bans a supporting character
  // Then the excluded counter increments
  test('banning a tag increments the excluded counter', async ({ steps }) => {
    await steps.on('excludedCountBadge', 'ScriptLab').verifyText('0');

    await steps.selectDropdown('excludedSupportingCharacterSelect', 'ScriptLab', {
      type: DropdownSelectType.VALUE,
      value: 'SUPPORTINGCHARACTER_SIDEKICK',
    });

    await steps.on('excludedCountBadge', 'ScriptLab').verifyText('1');
  });

  // Given a tag has been banned
  // When the user resets the bans
  // Then the counter returns to zero
  test('Reset Bans clears the excluded counter', async ({ steps }) => {
    await steps.selectDropdown('excludedSupportingCharacterSelect', 'ScriptLab', {
      type: DropdownSelectType.VALUE,
      value: 'SUPPORTINGCHARACTER_SIDEKICK',
    });
    await steps.on('excludedCountBadge', 'ScriptLab').verifyText('1');

    await steps.on('resetBansButton', 'ScriptLab').click();

    await steps.on('excludedCountBadge', 'ScriptLab').verifyText('0');
  });

  // Given Custom is the active tag-availability profile
  // When the user switches to Starting Tags
  // Then the active state moves with them
  test('tag-availability profile switches between Starting and Custom', async ({ steps }) => {
    await steps.expect('customProfile', 'ScriptLab').attributes.get('class').toContain('active');

    await steps.on('startingTagsProfile', 'ScriptLab').click();

    await steps.expect('startingTagsProfile', 'ScriptLab').attributes.get('class').toContain('active');
    await steps.expect('customProfile', 'ScriptLab').attributes.get('class').not.toContain('active');
  });

  // Given the user has generated scripts
  // When they pin the first result
  // Then it appears in the Script Library with save/load available
  test('pinning a generated script populates the Script Library', async ({ steps }) => {
    await steps.on('generateButton', 'ScriptLab').click();
    await steps.on('generatedCards', 'ScriptLab').verifyCount({ greaterThan: 0 });

    await steps.on('generatedPinButtons', 'ScriptLab').first().click();

    await steps.on('pinnedSection', 'ScriptLab').verifyState('visible');
    await steps.on('pinnedCards', 'ScriptLab').verifyCount({ greaterThan: 0 });
    await steps.on('savePinnedButton', 'ScriptLab').verifyState('visible');
    await steps.on('loadPinnedButton', 'ScriptLab').verifyState('visible');
  });

  // Every category the data defines must offer a picker, not just the
  // multi-select ones. Regression: only 2 of 7 rendered.
  test('every story element category offers a picker', async ({ steps }) => {
    await steps.on('lockedCategoryGroups', 'ScriptLab').verifyCount({ exactly: 7 });

    await steps.on('lockedGenreSelect', 'ScriptLab').verifyState('visible');
    await steps.on('lockedSettingSelect', 'ScriptLab').verifyState('visible');
    await steps.on('lockedProtagonistSelect', 'ScriptLab').verifyState('visible');
    await steps.on('lockedAntagonistSelect', 'ScriptLab').verifyState('visible');
    await steps.on('lockedFinaleSelect', 'ScriptLab').verifyState('visible');
  });

  // Row ids must be numbered within their own category and context. Regression:
  // a counter shared across all six panels made these shift unpredictably.
  test('tag selector row ids are numbered per category and context', async ({ steps }) => {
    await steps.expect('lockedSupportingCharacterSelect', 'ScriptLab')
      .attributes.get('id').toBe('tag-selector-row-generator-supporting-character-1-select');

    await steps.expect('lockedGenreSelect', 'ScriptLab')
      .attributes.get('id').toBe('tag-selector-row-generator-genre-1-select');

    await steps.expect('supportingCharacterSelect', 'ScriptEvaluation')
      .attributes.get('id').toBe('tag-selector-row-synergy-supporting-character-1-select');
  });

  // Negative control for the generation test above: with the results section
  // suppressed, that test's assertion must fail. Proves it observes real
  // rendered state rather than passing vacuously.
  test('negative control: results assertion fails when the section is suppressed', async ({ steps, page }) => {
    await page.addStyleTag({ content: '#results-generator { display: none !important; }' });

    await steps.on('generateButton', 'ScriptLab').click();

    let assertionFailed = false;
    try {
      await steps.on('resultsSection', 'ScriptLab').timeout(3000).verifyState('visible');
    } catch {
      assertionFailed = true;
    }
    expect(assertionFailed).toBe(true);
  });
});
