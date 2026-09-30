import { test, expect, openHollywood } from '../fixtures/base.js';
import { DropdownSelectType } from '@civitas-cerebrum/element-interactions';

// Rewritten from an orphan version that imported ./page-repository.js and
// ./step-runner.js — neither was ever committed, so this file could not be
// parsed and Playwright collected ZERO tests across the whole suite. The four
// behaviours below are the ones that version described; they are preserved.
//
// Applying the profile is done on the Build tab, which owns the control. The
// other tabs are inert while hidden, so the original's "switch tab, then click
// Apply" order could never have worked: exclusions are global, so apply first
// and assert afterwards.

const disabledOptionCount = (page, selector) =>
  page.locator(`${selector} option`).evaluateAll(
    opts => opts.filter(o => o.disabled && o.value !== '').length
  );

const applyStartingTags = async (steps) => {
  await steps.on('buildTab', 'Navigation').click();
  await steps.on('applyStartingTagsButton', 'ScriptLab').click();
  // The profile inserts ~194 rows from a setTimeout, so the badge is the
  // app's own signal that the rebuild has landed.
  await expect
    .poll(async () => Number(await steps.on('excludedCountBadge', 'ScriptLab').getText()))
    .toBeGreaterThan(0);
};

test.describe('Exclusion Dropdown Refresh', () => {
  test.beforeEach(async ({ steps }) => {
    await openHollywood(steps);
  });

  test('TC09-000001 Script Lab dropdowns filter after applying starting tags', async ({ steps, page }) => {
    await applyStartingTags(steps);

    for (const category of ['finale', 'setting', 'antagonist', 'protagonist']) {
      expect(
        await disabledOptionCount(page, `#inputs-${category}-generator`),
        `${category} should have excluded options disabled`
      ).toBeGreaterThan(0);
    }
  });

  test('TC09-000002 Colman Graves dropdowns filter after applying starting tags', async ({ steps, page }) => {
    await applyStartingTags(steps);
    await steps.on('evaluateTab', 'Navigation').click();

    for (const category of ['finale', 'setting', 'antagonist', 'protagonist']) {
      expect(
        await disabledOptionCount(page, `#inputs-${category}-graves`),
        `graves ${category} should have excluded options disabled`
      ).toBeGreaterThan(0);
    }
  });

  test('TC09-000003 Build for Target dropdowns filter after applying starting tags', async ({ steps, page }) => {
    await applyStartingTags(steps);
    await steps.on('marketTab', 'Navigation').click();
    await steps.on('buildForTargetModeButton', 'MarketingRelease').click();
    await steps.on('allTagSelects', 'BuildForTarget').waitForState('visible');

    expect(await disabledOptionCount(page, '#inputs-finale-targeted')).toBeGreaterThan(0);
  });

  // One exclusion list feeds every context, so the same bans must reach each of
  // them. A per-context filter that silently diverged is the regression here.
  test('TC09-000004 the same exclusions reach Script Lab and Colman Graves', async ({ steps, page }) => {
    await applyStartingTags(steps);
    const scriptLab = await disabledOptionCount(page, '#inputs-finale-generator');

    await steps.on('evaluateTab', 'Navigation').click();
    const graves = await disabledOptionCount(page, '#inputs-finale-graves');

    expect(scriptLab).toBeGreaterThan(0);
    expect(graves).toBe(scriptLab);
  });

  // A ban has to reach the builders the moment it is made. Setting is the case
  // the repository owner hit live: the ban registered in the Excluded panel but
  // the Script Lab dropdown kept offering it until some unrelated interaction
  // forced a redraw. Genre and Supporting Character appeared to work only
  // because collectTagInputs() happened to refresh the multi-select categories.
  const optionDisabled = (page, selector, value) =>
    page.locator(`${selector} option[value="${value}"]`).evaluate(o => o.disabled);

  test('TC09-000005 banning a Setting disables it in Script Lab immediately', async ({ steps, page }) => {
    await steps.on('buildTab', 'Navigation').click();
    expect(await optionDisabled(page, '#inputs-setting-generator', 'WILD_WEST')).toBe(false);

    await steps.selectDropdown('excludedSettingSelect', 'ScriptLab', {
      type: DropdownSelectType.VALUE,
      value: 'WILD_WEST',
    });

    await expect
      .poll(() => optionDisabled(page, '#inputs-setting-generator', 'WILD_WEST'))
      .toBe(true);
  });

  test('TC09-000006 lifting a Setting ban re-enables it in Script Lab immediately', async ({ steps, page }) => {
    await steps.on('buildTab', 'Navigation').click();
    await steps.selectDropdown('excludedSettingSelect', 'ScriptLab', {
      type: DropdownSelectType.VALUE,
      value: 'WILD_WEST',
    });
    await expect
      .poll(() => optionDisabled(page, '#inputs-setting-generator', 'WILD_WEST'))
      .toBe(true);

    await steps.selectDropdown('excludedSettingSelect', 'ScriptLab', {
      type: DropdownSelectType.VALUE,
      value: '',
    });

    await expect
      .poll(() => optionDisabled(page, '#inputs-setting-generator', 'WILD_WEST'))
      .toBe(false);
  });

  // Every category, single- and multi-select alike. The original defect only
  // showed on the single-select ones (Setting, Protagonist, Antagonist, Finale)
  // because collectTagInputs() happened to refresh the multi-select categories
  // as a side effect. Parameterising over all seven means neither half can
  // regress without a named failure saying which category broke.
  const firstSelectableValue = (page, slug) =>
    page.locator(`#inputs-${slug}-excluded select.tag-selector`).first().evaluate(sel => {
      const opt = [...sel.options].find(o => o.value !== '' && !o.disabled);
      return opt ? opt.value : null;
    });

  // Titles carry literal ids because tests/e2eIds.test.js reads them out of the
  // source; a templated title collapses to one id for every case.
  const banPropagates = async (steps, page, label, slug) => {
    await steps.on('buildTab', 'Navigation').click();

    const value = await firstSelectableValue(page, slug);
    expect(value, `no selectable ${label} option to ban`).toBeTruthy();
    expect(await optionDisabled(page, `#inputs-${slug}-generator`, value)).toBe(false);

    await page.locator(`#inputs-${slug}-excluded select.tag-selector`).first().selectOption(value);

    await expect
      .poll(() => optionDisabled(page, `#inputs-${slug}-generator`, value))
      .toBe(true);
  };

  test('TC09-000007 banning a Genre disables it in Script Lab immediately', async ({ steps, page }) => {
    await banPropagates(steps, page, 'Genre', 'genre');
  });

  test('TC09-000008 banning a Protagonist disables it in Script Lab immediately', async ({ steps, page }) => {
    await banPropagates(steps, page, 'Protagonist', 'protagonist');
  });

  test('TC09-000009 banning an Antagonist disables it in Script Lab immediately', async ({ steps, page }) => {
    await banPropagates(steps, page, 'Antagonist', 'antagonist');
  });

  test('TC09-000010 banning a Supporting Character disables it in Script Lab immediately', async ({ steps, page }) => {
    await banPropagates(steps, page, 'Supporting Character', 'supporting-character');
  });

  test('TC09-000011 banning a Theme & Event disables it in Script Lab immediately', async ({ steps, page }) => {
    await banPropagates(steps, page, 'Theme & Event', 'theme-event');
  });

  test('TC09-000012 banning a Finale disables it in Script Lab immediately', async ({ steps, page }) => {
    await banPropagates(steps, page, 'Finale', 'finale');
  });

  // Given a single element is excluded
  // When the user removes that exclusion
  // Then the element becomes immediately selectable in locked dropdowns
  test('TC09-000013 un-banning an excluded element makes it immediately selectable', async ({ steps, page }) => {
    await steps.on('buildTab', 'Navigation').click();

    // Exclude the first available Setting option
    await steps.selectDropdown('excludedSettingSelect', 'ScriptLab', {
      type: DropdownSelectType.INDEX,
      index: 1,
    });
    const excludedValue = await page.locator('#inputs-setting-excluded select.tag-selector').first().inputValue();
    expect(excludedValue).not.toBe('');

    // Verify it's disabled in locked dropdown
    const disabledBefore = await disabledOptionCount(page, '#inputs-setting-generator');
    expect(disabledBefore).toBeGreaterThan(0);

    // Remove the exclusion
    await page.locator('#inputs-setting-excluded select.tag-selector').first().selectOption('');

    // The option should now be available and selectable in the locked dropdown
    const optionElement = page.locator(
      `#inputs-setting-generator select.tag-selector option[value="${excludedValue}"]`
    ).first();

    const isAvailable = await optionElement.evaluate((opt) => !opt.hidden && !opt.disabled);
    expect(isAvailable).toBe(true);

    // Should be able to select it immediately
    await page.locator('#inputs-setting-generator select.tag-selector').first().selectOption(excludedValue);
    const selected = await page.locator('#inputs-setting-generator select.tag-selector').first().inputValue();
    expect(selected).toBe(excludedValue);
  });

  // The reproduction for a bug that came back repeatedly. Reset Bans clears the
  // whole list at once and so runs none of the per-row change handlers that
  // normally carry a lifted ban outward. The refresh it does reach used to
  // iterate MULTI_SELECT_CATEGORIES, which is [Genre, Supporting Character,
  // Theme & Event] — so Setting, Protagonist, Antagonist and Finale kept the
  // old list until an unrelated click happened to redraw one of them.
  //
  // applyStartingTags is the precondition that makes it visible: the profile is
  // what puts single-select bans in place to go stale. An earlier attempt at
  // this test skipped it, started from a clean ban list, and therefore passed
  // with the defect present — worse than no test at all.
  test('TC09-000018 Reset Bans clears the old list from Colman Graves', async ({ steps, page }) => {
    await applyStartingTags(steps);

    await steps.on('evaluateTab', 'Navigation').click();
    expect(
      await disabledOptionCount(page, '#inputs-setting-graves'),
      'the profile should have banned some Settings to begin with'
    ).toBeGreaterThan(0);

    await steps.on('buildTab', 'Navigation').click();
    await steps.on('resetBansButton', 'ScriptLab').click();

    // Straight to Evaluate: any interaction here would redraw the category and
    // hide the defect, which is exactly how it kept escaping notice.
    await steps.on('evaluateTab', 'Navigation').click();
    await expect
      .poll(() => disabledOptionCount(page, '#inputs-setting-graves'))
      .toBe(0);
  });
});
