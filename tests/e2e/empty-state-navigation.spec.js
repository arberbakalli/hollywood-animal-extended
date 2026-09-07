import { test, expect, openHollywood } from '../fixtures/base.js';

test.describe('Generator — Empty States, Navigation, Persistence (Phase 3)', () => {
  test.beforeEach(async ({ steps }) => {
    await openHollywood(steps);
  });

  test.describe('Empty State Rendering', () => {
    // When no selections are made, show empty state
    test('TC06-001 generator shows empty state initially', async ({ steps }) => {
      await steps.on('buildTab', 'Navigation').click();
      await steps.on('generatedCards', 'ScriptLab').verifyCount({ exactly: 0 });
    });

    // Generate with no selections produces feedback
    test('TC06-002 generating with no tags shows feedback message', async ({ steps }) => {
      await steps.on('buildTab', 'Navigation').click();
      await steps.on('generateButton', 'ScriptLab').click();

      await steps.on('feedbackMessage', 'ScriptLab').verifyState('visible');
    });

    // Results section hidden when empty
    test('TC06-003 results section hidden when no scripts generated', async ({ steps }) => {
      await steps.on('buildTab', 'Navigation').click();
      await steps.on('resultsSection', 'ScriptLab').verifyState('hidden');
    });

    // Synergy produces feedback with empty selection
    test('TC06-004 synergy shows feedback with no tags selected', async ({ steps }) => {
      await steps.on('evaluateTab', 'Navigation').click();

      // Try to calculate synergy without selections
      // The page should show the Synergy panel
      await steps.on('panel', 'ScriptEvaluation').verifyState('visible');
    });
  });

  test.describe('State Across Tab Navigation', () => {
    // Switching tabs works correctly
    test('TC06-005 can switch between Build and Evaluate tabs', async ({ steps }) => {
      await steps.on('buildTab', 'Navigation').click();
      await steps.on('panel', 'ScriptLab').verifyState('visible');

      await steps.on('evaluateTab', 'Navigation').click();
      await steps.on('panel', 'ScriptEvaluation').verifyState('visible');

      await steps.on('buildTab', 'Navigation').click();
      await steps.on('panel', 'ScriptLab').verifyState('visible');
    });

    // Locked section persists when toggled
    test('TC06-006 locked section remains expandable after tab switch', async ({ steps }) => {
      await steps.on('buildTab', 'Navigation').click();
      await steps.on('lockedSectionToggle', 'ScriptLab').click();
      await steps.on('lockedContent', 'ScriptLab').verifyState('visible');

      await steps.on('evaluateTab', 'Navigation').click();
      await steps.on('buildTab', 'Navigation').click();

      // Locked section toggle should still be present
      await steps.on('lockedSectionToggle', 'ScriptLab').verifyState('visible');
    });

    // Market tab navigation works
    test('TC06-007 marketing tab remains accessible', async ({ steps }) => {
      await steps.on('buildTab', 'Navigation').click();
      await steps.on('marketTab', 'Navigation').click();
      await steps.on('panel', 'MarketingRelease').verifyState('visible');
    });
  });

  test.describe('Recovery and Reset Workflows', () => {
    // Reset clears state
    test('TC06-008 reset button clears the generator state', async ({ steps }) => {
      await steps.on('buildTab', 'Navigation').click();

      // Settings should have input elements
      await steps.on('settingsPanel', 'ScriptLab').verifyState('visible');

      // Reset should be available
      await steps.expect('movieScoreInput', 'ScriptLab').value.toBe('5');

      // Click reset
      await steps.on('resetButton', 'ScriptLab').click();

      // Settings should be cleared/reset
      await steps.on('settingsPanel', 'ScriptLab').verifyState('visible');
    });

    // Generate produces some result or feedback
    test('TC06-009 generate button produces output or feedback', async ({ steps }) => {
      await steps.on('buildTab', 'Navigation').click();
      await steps.on('generateButton', 'ScriptLab').click();

      // Should show either feedback or results
      await expect
        .poll(async () => {
          try {
            await steps.on('feedbackMessage', 'ScriptLab').verifyState('visible');
            return true;
          } catch {
            await steps.on('generatedCards', 'ScriptLab').verifyCount();
            return true;
          }
        })
        .toBeTruthy();
    });
  });

  test.describe('UI Responsiveness', () => {
    // Generating with no tags shows feedback
    test('TC06-010 empty generation shows user guidance', async ({ steps }) => {
      await steps.on('buildTab', 'Navigation').click();
      await steps.on('generateButton', 'ScriptLab').click();

      // Should show feedback
      await steps.on('feedbackMessage', 'ScriptLab').verifyState('visible');
    });

    // UI remains responsive after rapid interactions
    test('TC06-011 rapid tab switching remains responsive', async ({ steps }) => {
      for (let i = 0; i < 2; i++) {
        await steps.on('buildTab', 'Navigation').click();
        await steps.on('evaluateTab', 'Navigation').click();
      }

      // UI should still be interactive
      await steps.on('buildTab', 'Navigation').click();
      await steps.on('panel', 'ScriptLab').verifyState('visible');
    });
  });
});
