import { test, expect, openHollywood } from '../fixtures/base.js';
import { DropdownSelectType } from '@civitas-cerebrum/element-interactions';

test.describe('App Shell', () => {
  test.beforeEach(async ({ steps }) => {
    await openHollywood(steps);
  });

  test('TC00-000001 primary product tabs switch visible panels', async ({ steps }) => {
    await steps.on('buildTab', 'Navigation').click();
    await steps.on('panel', 'ScriptLab').verifyState('visible');

    await steps.on('evaluateTab', 'Navigation').click();
    await steps.on('panel', 'ColmanGraves').verifyState('visible');

    await steps.on('marketTab', 'Navigation').click();
    await steps.on('panel', 'MarketingRelease').verifyState('visible');
  });

  test('TC00-000002 language selector updates story element names without changing ids', async ({ steps, page }) => {
    await steps.on('buildTab', 'Navigation').click();

    const optionText = () =>
      page.locator('#inputs-supporting-character-generator select.tag-selector option[value="SUPPORTINGCHARACTER_SIDEKICK"]')
        .textContent();

    await expect.poll(optionText).toBe('Sidekick');

    await steps.selectDropdown('languageSelector', 'Navigation', {
      type: DropdownSelectType.VALUE,
      value: 'German',
    });

    await expect.poll(optionText).toBe('Kumpan');
    await expect(page.locator('#inputs-supporting-character-generator select.tag-selector option', {
      hasText: 'Kumpan',
    })).toHaveAttribute('value', 'SUPPORTINGCHARACTER_SIDEKICK');
  });
});
