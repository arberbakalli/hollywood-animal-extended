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

    // 8 story elements top out at 8.0 (docs/GAME_RULES.md section 1).
    await steps.expect('movieScoreInput', 'ScriptLab').value.toBe('8');
    await steps.expect('movieScoreSlider', 'ScriptLab').value.toBe('8');
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

    await steps.expect('elementPoolInput', 'Navigation').value.toBe('9');
  });

  // The game's Rating Limit table caps 9 story elements at 9, so a score of 10
  // needs all ten (docs/GAME_RULES.md section 1).
  test('TC10-000005 the maximum score asks for ten elements', async ({ steps, page }) => {
    await steps.setSliderValue('movieScoreSlider', 'ScriptLab', 10);

    await steps.expect('elementPoolInput', 'Navigation').value.toBe('10');
    expect(await fillPercent(page, '#globalElementPoolSlider')).toBe('100%');
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

  // The box accepted any number: 12 set a budget of 12 for every feature while
  // the slider showed 10. Leaving the box must show the value actually in use.
  test('TC10-000008 typing a pool above ten settles on ten when the box is left', async ({ steps, page }) => {
    const box = page.locator('#globalElementPoolInput');
    await box.fill('12');
    await box.press('Tab');

    await steps.expect('elementPoolInput', 'Navigation').value.toBe('10');
    await steps.expect('elementPoolSlider', 'Navigation').value.toBe('10');
    await steps.expect('movieScoreInput', 'ScriptLab').value.toBe('10');
  });

  test('TC10-000009 clearing the pool box keeps the last valid size', async ({ steps, page }) => {
    await steps.setSliderValue('elementPoolSlider', 'Navigation', 8);
    const box = page.locator('#globalElementPoolInput');
    await box.fill('');
    await box.press('Tab');

    await steps.expect('elementPoolInput', 'Navigation').value.toBe('8');
    await steps.expect('movieScoreInput', 'ScriptLab').value.toBe('8');
  });
});
