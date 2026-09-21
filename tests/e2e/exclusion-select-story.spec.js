import { test, expect, openHollywood } from '../fixtures/base.js';
import { DropdownSelectType } from '@civitas-cerebrum/element-interactions';

test.describe('Exclusion and Story Selection', () => {
  test.beforeEach(async ({ steps }) => {
    await openHollywood(steps);
  });

  // Given: I have excluded some elements
  // When: I remove the exclusion
  // Then: I should be able to select that element in the Story dropdown
  test('TC09-000014 can select element in Story after removing exclusion', async ({ steps, page }) => {
    // Start in Build tab
    await steps.on('buildTab', 'Navigation').click();

    // Exclude WILD_WEST Setting
    await steps.selectDropdown('excludedSettingSelect', 'ScriptLab', {
      type: DropdownSelectType.VALUE,
      value: 'WILD_WEST',
    });

    // Verify it's now disabled in Script Lab
    const isDisabledAfterExclude = await page
      .locator('#inputs-setting-generator select.tag-selector option[value="WILD_WEST"]')
      .evaluate(opt => opt.disabled);
    expect(isDisabledAfterExclude).toBe(true);

    // Remove the exclusion
    await steps.selectDropdown('excludedSettingSelect', 'ScriptLab', {
      type: DropdownSelectType.VALUE,
      value: '',
    });

    // Verify it's no longer disabled
    const isEnabledAfterUnexclude = await page
      .locator('#inputs-setting-generator select.tag-selector option[value="WILD_WEST"]')
      .evaluate(opt => opt.disabled);
    expect(isEnabledAfterUnexclude).toBe(false);

    // NOW: Try to select it in the dropdown
    const settingSelect = page.locator('#inputs-setting-generator select.tag-selector').first();
    await settingSelect.selectOption('WILD_WEST');

    // Verify it's selected
    const selected = await settingSelect.inputValue();
    expect(selected).toBe('WILD_WEST');
  });
});
