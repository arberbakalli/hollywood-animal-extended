import { test, expect, openHollywood } from '../fixtures/base.js';

// A genre mix is set in 5% increments, each genre holding at least 5%, and the
// whole mix always totalling 100%. Before this was fixed, Genre had no add
// control at all, so a mix could never be built and the percent slider — which
// only appears past one genre — was unreachable.

const percent = async (steps, elementName) =>
  Number(await steps.on(elementName, 'ColmanGraves').getInputValue());

test.describe('Colman Graves — genre mix', () => {
  test.beforeEach(async ({ steps }) => {
    await openHollywood(steps);
    await steps.on('evaluateTab', 'Navigation').click();
  });

  // Two rules that one list used to conflate, so narrowing it for the second
  // silently broke the first: every category renders a picker, but only these
  // three accept more than one selection.
  test('TC06-000001 only Genre, Supporting Character and Theme & Event accept multiples', async ({ steps }) => {
    await steps.on('categoryGroups', 'ColmanGraves').verifyCount({ exactly: 7 });
    await steps.on('addButtons', 'ColmanGraves').verifyCount({ exactly: 3 });

    await steps.on('genreAddButton', 'ColmanGraves').verifyState('visible');
    await steps.on('supportingCharacterAddButton', 'ColmanGraves').verifyState('visible');
    await steps.on('themeEventAddButton', 'ColmanGraves').verifyState('visible');

    await steps.on('settingAddButton', 'ColmanGraves').verifyState('detached');
    await steps.on('protagonistAddButton', 'ColmanGraves').verifyState('detached');
    await steps.on('antagonistAddButton', 'ColmanGraves').verifyState('detached');
    await steps.on('finaleAddButton', 'ColmanGraves').verifyState('detached');
  });

  test('TC06-000002 a single genre holds the whole mix and hides the control', async ({ steps }) => {
    await steps.on('genreRows', 'ColmanGraves').verifyCount({ exactly: 1 });

    expect(await percent(steps, 'genreRow1Percent')).toBe(100);
    await steps.on('genrePercentWrappers', 'ColmanGraves').first().verifyState('hidden');
  });

  test('TC06-000003 adding a second genre splits the mix evenly and reveals the control', async ({ steps }) => {
    await steps.on('genreAddButton', 'ColmanGraves').click();

    await steps.on('genreRows', 'ColmanGraves').verifyCount({ exactly: 2 });
    await steps.on('genrePercentWrappers', 'ColmanGraves').first().verifyState('visible');

    expect(await percent(steps, 'genreRow1Percent')).toBe(50);
    expect(await percent(steps, 'genreRow2Percent')).toBe(50);
  });

  test('TC06-000004 a third genre still totals 100 in whole steps of five', async ({ steps }) => {
    await steps.on('genreAddButton', 'ColmanGraves').click();
    await steps.on('genreAddButton', 'ColmanGraves').click();
    await steps.on('genreRows', 'ColmanGraves').verifyCount({ exactly: 3 });

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

  test('TC06-000005 the slider is constrained to five-point steps from a floor of five', async ({ steps }) => {
    await steps.on('genreAddButton', 'ColmanGraves').click();

    await steps.expect('genreRow1Slider', 'ColmanGraves').attributes.get('min').toBe('5');
    await steps.expect('genreRow1Slider', 'ColmanGraves').attributes.get('step').toBe('5');
    await steps.expect('genreRow1Percent', 'ColmanGraves').attributes.get('min').toBe('5');
    await steps.expect('genreRow1Percent', 'ColmanGraves').attributes.get('step').toBe('5');
  });

  // The core rule: moving one genre pushes the remainder onto the others.
  test('TC06-000006 raising one genre lowers the other so the mix still totals 100', async ({ steps }) => {
    await steps.on('genreAddButton', 'ColmanGraves').click();
    expect(await percent(steps, 'genreRow2Percent')).toBe(50);

    await steps.setSliderValue('genreRow1Slider', 'ColmanGraves', 70);

    expect(await percent(steps, 'genreRow1Percent')).toBe(70);
    expect(await percent(steps, 'genreRow2Percent')).toBe(30);
  });

  // The boundary case: one genre cannot take the whole mix while another exists.
  test('TC06-000007 a genre cannot squeeze the others below five percent', async ({ steps }) => {
    await steps.on('genreAddButton', 'ColmanGraves').click();

    await steps.setSliderValue('genreRow1Slider', 'ColmanGraves', 100);

    expect(await percent(steps, 'genreRow1Percent')).toBe(95);
    expect(await percent(steps, 'genreRow2Percent')).toBe(5);
  });

  test('TC06-000008 removing genre rows re-enables those genre options', async ({ steps, page }) => {
    const genres = ['ACTION', 'ADVENTURE', 'COMEDY', 'DETECTIVE', 'DRAMA'];

    for (const genre of genres) {
      await page.locator('#inputs-genre-graves .genre-row:first-child select.tag-selector').selectOption(genre);
      if (genre !== genres[genres.length - 1]) {
        await steps.on('genreAddButton', 'ColmanGraves').click();
      }
    }

    await page.locator('#inputs-genre-graves .genre-row').evaluateAll(rows => {
      rows.slice(0, 4).forEach(row => row.querySelector('.remove-btn').click());
    });

    const states = await page.locator('#inputs-genre-graves select.tag-selector').first().evaluate((select, genreIds) =>
      genreIds.map(id => {
        const option = Array.from(select.options).find(opt => opt.value === id);
        return {
          id,
          disabled: option.disabled,
          selectedElsewhere: option.dataset.selectedElsewhere,
          selected: select.value === id,
        };
      }), genres);

    expect(states).toEqual([
      { id: 'ACTION', disabled: false, selectedElsewhere: 'false', selected: true },
      { id: 'ADVENTURE', disabled: false, selectedElsewhere: 'false', selected: false },
      { id: 'COMEDY', disabled: false, selectedElsewhere: 'false', selected: false },
      { id: 'DETECTIVE', disabled: false, selectedElsewhere: 'false', selected: false },
      { id: 'DRAMA', disabled: false, selectedElsewhere: 'false', selected: false },
    ]);
  });
});
