import { test, expect, openHollywood } from '../fixtures/base.js';

// Max Element Pool and Target Movie Score are two views of one choice: a score
// of N needs N-1 story elements. Score 10 is the exception — 9 elements reach it
// when every pick lands, 10 only improves the odds, so the pool may sit at
// either. The mapping itself is unit-tested in tests/slider-syncing.test.js;
// these drive the real controls so the wiring is covered too.

const fillPercent = (page, selector) =>
  page.locator(selector).evaluate(el => el.style.getPropertyValue('--slider-fill-percent').trim());

test.describe('Slider syncing — Max Element Pool and Target Movie Score', () => {
  test.beforeEach(async ({ steps }) => {
    await openHollywood(steps);
    await steps.on('buildTab', 'Navigation').click();
  });

  test('TC10-000001 the shipped defaults open already in sync', async ({ steps }) => {
    await steps.expect('elementPoolInput', 'Navigation').value.toBe('5');
    await steps.expect('movieScoreInput', 'ScriptLab').value.toBe('6');
  });

  test('TC10-000002 raising the pool raises the target score', async ({ steps }) => {
    await steps.setSliderValue('elementPoolSlider', 'Navigation', 8);

    await steps.expect('movieScoreInput', 'ScriptLab').value.toBe('9');
    await steps.expect('movieScoreSlider', 'ScriptLab').value.toBe('9');
  });

  // Regression: the thumb moved but the coloured fill stayed where it was, so
  // the control read as out of sync even though the numbers were right.
  test('TC10-000003 lowering the pool lowers the score and its fill follows', async ({ steps, page }) => {
    await steps.setSliderValue('elementPoolSlider', 'Navigation', 10);
    await steps.setSliderValue('elementPoolSlider', 'Navigation', 6);

    await steps.expect('movieScoreInput', 'ScriptLab').value.toBe('7');
    expect(await fillPercent(page, '#genScoreSlider')).toBe('25%');
  });

  test('TC10-000004 raising the target score raises the pool', async ({ steps }) => {
    await steps.setSliderValue('movieScoreSlider', 'ScriptLab', 9);

    await steps.expect('elementPoolInput', 'Navigation').value.toBe('8');
  });

  // Score 10 maps down to 9, not 10: nine elements is the achievable target and
  // the tenth is an optional edge the player may still choose.
  test('TC10-000005 the maximum score asks for nine elements, not ten', async ({ steps, page }) => {
    await steps.setSliderValue('movieScoreSlider', 'ScriptLab', 10);

    await steps.expect('elementPoolInput', 'Navigation').value.toBe('9');
    expect(await fillPercent(page, '#globalElementPoolSlider')).toBe('80%');
  });

  test('TC10-000006 a pool of ten still targets score ten', async ({ steps, page }) => {
    await steps.setSliderValue('elementPoolSlider', 'Navigation', 10);

    await steps.expect('movieScoreInput', 'ScriptLab').value.toBe('10');
    expect(await fillPercent(page, '#genScoreSlider')).toBe('100%');
  });

  test('TC10-000007 returning to a pool size returns the same score', async ({ steps }) => {
    await steps.setSliderValue('elementPoolSlider', 'Navigation', 7);
    await steps.expect('movieScoreInput', 'ScriptLab').value.toBe('8');

    await steps.setSliderValue('elementPoolSlider', 'Navigation', 10);
    await steps.setSliderValue('elementPoolSlider', 'Navigation', 7);

    await steps.expect('movieScoreInput', 'ScriptLab').value.toBe('8');
  });
});
