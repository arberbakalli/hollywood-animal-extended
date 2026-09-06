import { test, expect } from '../fixtures/base.js';

// A genre mix is set in 5% increments, each genre holding at least 5%, and the
// whole mix always totalling 100%. Before this was fixed, Genre had no add
// control at all, so a mix could never be built and the percent slider — which
// only appears past one genre — was unreachable.

const percent = async (steps, elementName) =>
  Number(await steps.on(elementName, 'ScriptEvaluation').getInputValue());

test.describe('Script Evaluation — genre mix', () => {
  test.beforeEach(async ({ steps }) => {
    await steps.navigateTo('/', { waitUntil: 'domcontentloaded' });
    await steps.on('genreAddButton', 'ScriptEvaluation').waitForState('attached');
    await steps.on('evaluateTab', 'Navigation').click();
  });

  // Two rules that one list used to conflate, so narrowing it for the second
  // silently broke the first: every category renders a picker, but only these
  // three accept more than one selection.
  test('only Genre, Supporting Character and Theme & Event accept multiples', async ({ steps }) => {
    await steps.on('categoryGroups', 'ScriptEvaluation').verifyCount({ exactly: 7 });
    await steps.on('addButtons', 'ScriptEvaluation').verifyCount({ exactly: 3 });

    await steps.on('genreAddButton', 'ScriptEvaluation').verifyState('visible');
    await steps.on('supportingCharacterAddButton', 'ScriptEvaluation').verifyState('visible');
    await steps.on('themeEventAddButton', 'ScriptEvaluation').verifyState('visible');

    await steps.on('settingAddButton', 'ScriptEvaluation').verifyState('detached');
    await steps.on('protagonistAddButton', 'ScriptEvaluation').verifyState('detached');
    await steps.on('antagonistAddButton', 'ScriptEvaluation').verifyState('detached');
    await steps.on('finaleAddButton', 'ScriptEvaluation').verifyState('detached');
  });

  test('a single genre holds the whole mix and hides the control', async ({ steps }) => {
    await steps.on('genreRows', 'ScriptEvaluation').verifyCount({ exactly: 1 });

    expect(await percent(steps, 'genreRow1Percent')).toBe(100);
    await steps.on('genrePercentWrappers', 'ScriptEvaluation').first().verifyState('hidden');
  });

  test('adding a second genre splits the mix evenly and reveals the control', async ({ steps }) => {
    await steps.on('genreAddButton', 'ScriptEvaluation').click();

    await steps.on('genreRows', 'ScriptEvaluation').verifyCount({ exactly: 2 });
    await steps.on('genrePercentWrappers', 'ScriptEvaluation').first().verifyState('visible');

    expect(await percent(steps, 'genreRow1Percent')).toBe(50);
    expect(await percent(steps, 'genreRow2Percent')).toBe(50);
  });

  test('a third genre still totals 100 in whole steps of five', async ({ steps }) => {
    await steps.on('genreAddButton', 'ScriptEvaluation').click();
    await steps.on('genreAddButton', 'ScriptEvaluation').click();
    await steps.on('genreRows', 'ScriptEvaluation').verifyCount({ exactly: 3 });

    const shares = [
      await percent(steps, 'genreRow1Percent'),
      await percent(steps, 'genreRow2Percent'),
      await percent(steps, 'genreRow3Percent'),
    ];

    expect(shares.reduce((sum, share) => sum + share, 0)).toBe(100);
    for (const share of shares) {
      expect(share % 5).toBe(0);
      expect(share).toBeGreaterThanOrEqual(5);
    }
  });

  test('the slider is constrained to five-point steps from a floor of five', async ({ steps }) => {
    await steps.on('genreAddButton', 'ScriptEvaluation').click();

    await steps.expect('genreRow1Slider', 'ScriptEvaluation').attributes.get('min').toBe('5');
    await steps.expect('genreRow1Slider', 'ScriptEvaluation').attributes.get('step').toBe('5');
    await steps.expect('genreRow1Percent', 'ScriptEvaluation').attributes.get('min').toBe('5');
    await steps.expect('genreRow1Percent', 'ScriptEvaluation').attributes.get('step').toBe('5');
  });

  // The core rule: moving one genre pushes the remainder onto the others.
  test('raising one genre lowers the other so the mix still totals 100', async ({ steps }) => {
    await steps.on('genreAddButton', 'ScriptEvaluation').click();
    expect(await percent(steps, 'genreRow2Percent')).toBe(50);

    await steps.setSliderValue('genreRow1Slider', 'ScriptEvaluation', 70);

    expect(await percent(steps, 'genreRow1Percent')).toBe(70);
    expect(await percent(steps, 'genreRow2Percent')).toBe(30);
  });

  // The boundary case: one genre cannot take the whole mix while another exists.
  test('a genre cannot squeeze the others below five percent', async ({ steps }) => {
    await steps.on('genreAddButton', 'ScriptEvaluation').click();

    await steps.setSliderValue('genreRow1Slider', 'ScriptEvaluation', 100);

    expect(await percent(steps, 'genreRow1Percent')).toBe(95);
    expect(await percent(steps, 'genreRow2Percent')).toBe(5);
  });
});
