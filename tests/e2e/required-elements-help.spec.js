import { test, expect, openHollywood } from '../fixtures/base.js';

async function expectControls(page, pool, target, required) {
  for (const selector of ['#globalElementPoolInput', '#globalElementPoolSlider']) {
    await expect(page.locator(selector)).toHaveValue(String(pool));
  }
  for (const selector of ['#genScoreInput', '#genScoreSlider']) {
    await expect(page.locator(selector)).toHaveValue(String(target));
  }
  await expect(page.locator('#genTagsRequiredDisplay')).toHaveText(
    `Requires ~${required} Story Elements (excluding Genre & Setting).`,
  );
}

for (const control of ['slider', 'number input']) {
  test(`TC26-000001 pool ${control}: help follows the target without changing the chosen pool`, async ({ steps, page }) => {
    await openHollywood(steps);
    await expectControls(page, 5, 5, 5);
    // Descend as well as ascend; pool 8 must not be round-tripped down to 7.
    for (const [pool, target, required] of [
      [9, 9, 9], [10, 10, 10], [8, 8, 8], [7, 7, 7], [6, 6, 6], [5, 5, 5],
    ]) {
      if (control === 'slider') {
        await steps.setSliderValue('elementPoolSlider', 'Navigation', pool);
      } else {
        await page.locator('#globalElementPoolInput').fill(String(pool));
        await page.locator('#globalElementPoolInput').press('Tab');
      }
      await expectControls(page, pool, target, required);
    }
  });

  test(`TC26-000002 target ${control}: help and pool use the game rating-limit minimum`, async ({ steps, page }) => {
    await openHollywood(steps);
    for (const [target, pool, required] of [
      [10, 10, 10], [9, 9, 9], [8, 8, 8], [7, 7, 7], [6, 6, 6], [5, 5, 5],
    ]) {
      if (control === 'slider') {
        await steps.setSliderValue('movieScoreSlider', 'ScriptLab', target);
      } else {
        await page.locator('#genScoreInput').fill(String(target));
        await page.locator('#genScoreInput').press('Tab');
      }
      await expectControls(page, pool, target, required);
    }
  });
}
