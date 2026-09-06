import { test, expect, openHollywood } from '../fixtures/base.js';
import { DropdownSelectType } from '@civitas-cerebrum/element-interactions';

const SIDEKICK = 'SUPPORTINGCHARACTER_SIDEKICK';

test.describe('Script Lab — generator', () => {
  test.beforeEach(async ({ steps }) => {
    await openHollywood(steps);
    await steps.on('buildTab', 'Navigation').click();
  });

  // Given the app is open
  // When the user opens the Build tab
  // Then the Script Lab panel is shown
  test('TC01-000001 Build tab reveals the Script Lab panel', async ({ steps }) => {
    await steps.on('panel', 'ScriptLab').verifyState('visible');
    await steps.on('generateButton', 'ScriptLab').verifyText('Generate Scripts');
  });

  // Given Locked Elements starts expanded
  // When the user collapses it
  // Then the section state and controls agree
  test('TC01-000002 collapsing Locked Elements hides its selectors', async ({ steps }) => {
    await steps.on('lockedContent', 'ScriptLab').verifyState('visible');
    await steps.expect('lockedSectionToggle', 'ScriptLab').attributes.get('aria-expanded').toBe('true');

    await steps.on('lockedSectionToggle', 'ScriptLab').click();

    await steps.expect('lockedSectionToggle', 'ScriptLab').attributes.get('aria-expanded').toBe('false');
    await steps.on('lockedContent', 'ScriptLab').verifyState('hidden');
  });

  // Given the user is on Script Lab with default targets
  // When they generate
  // Then the results section appears with at least one script card
  test('TC01-000003 generating with default targets produces script cards', async ({ steps }) => {
    await steps.on('resultsSection', 'ScriptLab').verifyState('hidden');

    await steps.on('generateButton', 'ScriptLab').click();

    await steps.on('resultsSection', 'ScriptLab').verifyState('visible');
    await steps.on('generatedCards', 'ScriptLab').verifyCount({ greaterThan: 0 });
    await steps.on('generatedTagChips', 'ScriptLab').verifyCount({ greaterThan: 0 });
  });

  // Given a supporting character is locked
  // When scripts are generated
  // Then every rendered script card keeps that locked pick
  test('TC01-000004 locking Sidekick constrains generated scripts', async ({ steps, page }) => {
    await steps.selectDropdown('lockedSupportingCharacterSelect', 'ScriptLab', {
      type: DropdownSelectType.VALUE,
      value: SIDEKICK,
    });

    await steps.on('generateButton', 'ScriptLab').click();

    await steps.on('generatedCards', 'ScriptLab').verifyCount({ greaterThan: 0 });
    const cardTexts = await page
      .locator('#generatorResultsList .gen-card')
      .evaluateAll(cards => cards.map(card => card.textContent || ''));
    for (const text of cardTexts) {
      expect(text).toContain('Sidekick');
    }
  });

  // Given the user is on Script Lab
  // When they move the compatibility slider to its maximum
  // Then the paired number input reflects the same value
  test('TC01-000005 compatibility slider drives the paired number input', async ({ steps }) => {
    await steps.setSliderValue('compatibilitySlider', 'ScriptLab', 5);

    await steps.expect('compatibilityInput', 'ScriptLab').value.toMatch(/^5(\.0)?$/);
  });

  // Given the target movie score controls are synced
  // When the user raises the score
  // Then the required-elements hint follows the same scoring table
  test('TC01-000006 raising the target movie score updates the required-elements hint', async ({ steps }) => {
    await steps.on('requiredTagsHint', 'ScriptLab').verifyTextContains('~5');

    await steps.setSliderValue('movieScoreSlider', 'ScriptLab', 8);

    await steps.expect('movieScoreInput', 'ScriptLab').value.toBe('8');
    await steps.on('requiredTagsHint', 'ScriptLab').verifyTextContains('~8');
  });

  // Given the excluded-elements section is open
  // When the user bans a supporting character
  // Then the excluded counter increments
  test('TC01-000007 banning a tag increments the excluded counter', async ({ steps }) => {
    await steps.on('excludedCountBadge', 'ScriptLab').verifyText('0');

    await steps.selectDropdown('excludedSupportingCharacterSelect', 'ScriptLab', {
      type: DropdownSelectType.VALUE,
      value: SIDEKICK,
    });

    await steps.on('excludedCountBadge', 'ScriptLab').verifyText('1');
  });

  // Given a tag has been banned
  // When the user resets the bans
  // Then the counter returns to zero
  test('TC01-000008 Reset Bans clears the excluded counter', async ({ steps }) => {
    await steps.selectDropdown('excludedSupportingCharacterSelect', 'ScriptLab', {
      type: DropdownSelectType.VALUE,
      value: SIDEKICK,
    });
    await steps.on('excludedCountBadge', 'ScriptLab').verifyText('1');

    await steps.on('resetBansButton', 'ScriptLab').click();

    await steps.on('excludedCountBadge', 'ScriptLab').verifyText('0');
  });

  // Given Custom is the active tag-availability profile
  // When the user switches to Starting Tags
  // Then the active state moves with them
  test('TC01-000009 tag-availability profile switches between Starting and Custom', async ({ steps }) => {
    await steps.expect('customProfile', 'ScriptLab').attributes.get('class').toContain('active');

    await steps.on('startingTagsProfile', 'ScriptLab').click();

    await steps.expect('startingTagsProfile', 'ScriptLab').attributes.get('class').toContain('active');
    await steps.expect('customProfile', 'ScriptLab').attributes.get('class').not.toContain('active');
  });

  // Given the user has generated scripts
  // When they pin the first result
  // Then it appears in the Script Library with save/load available
  test('TC01-000010 pinning a generated script populates the Script Library', async ({ steps }) => {
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
  test('TC01-000011 every story element category offers a picker', async ({ steps }) => {
    await steps.on('lockedCategoryGroups', 'ScriptLab').verifyCount({ exactly: 7 });

    await steps.on('lockedGenreSelect', 'ScriptLab').verifyState('visible');
    await steps.on('lockedSettingSelect', 'ScriptLab').verifyState('visible');
    await steps.on('lockedProtagonistSelect', 'ScriptLab').verifyState('visible');
    await steps.on('lockedAntagonistSelect', 'ScriptLab').verifyState('visible');
    await steps.on('lockedFinaleSelect', 'ScriptLab').verifyState('visible');
  });

  // Given Supporting Character is a multi-select category
  // When the user adds another row
  // Then the category has two dropdowns in the locked context
  test('TC01-000012 adding a second Supporting Character row creates another picker', async ({ steps }) => {
    await steps.on('lockedSupportingCharacterSelect', 'ScriptLab').verifyCount({ exactly: 1 });

    await steps.on('addLockedSupportingCharacterRow', 'ScriptLab').click();

    await steps.on('lockedSupportingCharacterSelect', 'ScriptLab').verifyCount({ exactly: 2 });
  });

  // Given a category search box exists
  // When the user searches for Sidekick
  // Then only matching dropdown options stay visible
  test('TC01-000013 filtering a category search narrows selectable options', async ({ steps, page }) => {
    await steps.on('lockedSupportingCharacterSearch', 'ScriptLab').fill('Sidekick');

    await expect(page.locator('#search-supporting-character-generator-input')).toHaveClass(/has-matches/);
    const visibleOptions = await page
      .locator('#inputs-supporting-character-generator select.tag-selector option:not(:first-child)')
      .evaluateAll(options => options
        .filter(option => !option.hidden)
        .map(option => option.textContent.trim()));

    expect(visibleOptions.length).toBeGreaterThan(0);
    expect(visibleOptions.every(option => option.toLowerCase().includes('sidekick'))).toBe(true);
  });

  // Row ids must be numbered within their own category and context. Regression:
  // a counter shared across all six panels made these shift unpredictably.
  test('TC01-000014 tag selector row ids are numbered per category and context', async ({ steps }) => {
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
  test('TC01-000015 negative control: results assertion fails when the section is suppressed', async ({ steps, page }) => {
    // The one raw selector in the suite. It is a mutation target, not a locator —
    // the point is to break the page, and the assertion below still resolves
    // through the repository. Keep it in step with the resultsSection entry.
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
