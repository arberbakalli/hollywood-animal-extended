import { test, expect } from '@playwright/test';
import { PageRepository } from './page-repository.js';
import { StepRunner } from './step-runner.js';

test.describe('Exclusion Dropdown Refresh', () => {
  let page, steps, repo;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    repo = new PageRepository(page);
    steps = new StepRunner(repo, page);

    await page.goto('http://localhost:8080');
    await page.waitForEvent('framenavigated');
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('TC09-000001 Script Lab dropdowns filter correctly after applying starting tags', async () => {
    // Navigate to Build tab
    await steps.on('scriptLabTab').click();

    // Apply starting tags
    await steps.on('applyStartingTagsButton').click();
    await page.waitForTimeout(500); // Wait for exclusions to populate

    // Verify Finale dropdown has disabled items
    const finaleSelect = await repo.element('finaleSelect');
    const finaleOptions = await page.locator('#inputs-finale-generator option').evaluateAll(opts =>
      opts.map(opt => ({ text: opt.textContent, disabled: opt.disabled }))
    );

    // At least some options should be disabled (excluded)
    const disabledFinales = finaleOptions.filter(opt => opt.disabled && opt.text.trim() !== '-- Select --');
    expect(disabledFinales.length).toBeGreaterThan(0);

    // Verify Setting dropdown has disabled items
    const settingOptions = await page.locator('#inputs-setting-generator option').evaluateAll(opts =>
      opts.map(opt => ({ text: opt.textContent, disabled: opt.disabled }))
    );
    const disabledSettings = settingOptions.filter(opt => opt.disabled && opt.text.trim() !== '-- Select --');
    expect(disabledSettings.length).toBeGreaterThan(0);

    // Verify Antagonist dropdown has disabled items
    const antagonistOptions = await page.locator('#inputs-antagonist-generator option').evaluateAll(opts =>
      opts.map(opt => ({ text: opt.textContent, disabled: opt.disabled }))
    );
    const disabledAntagonists = antagonistOptions.filter(opt => opt.disabled && opt.text.trim() !== '-- Select --');
    expect(disabledAntagonists.length).toBeGreaterThan(0);

    // Verify Protagonist dropdown has disabled items
    const protagonistOptions = await page.locator('#inputs-protagonist-generator option').evaluateAll(opts =>
      opts.map(opt => ({ text: opt.textContent, disabled: opt.disabled }))
    );
    const disabledProtagonists = protagonistOptions.filter(opt => opt.disabled && opt.text.trim() !== '-- Select --');
    expect(disabledProtagonists.length).toBeGreaterThan(0);
  });

  test('TC09-000002 Colman Graves dropdowns filter correctly after applying starting tags', async () => {
    // Navigate to Script Evaluation tab
    await steps.on('scriptEvaluationTab').click();

    // Apply starting tags
    await steps.on('applyStartingTagsButton').click();
    await page.waitForTimeout(500);

    // Verify Graves Submit Script Finale dropdown has disabled items
    const gravesFinaleOptions = await page.locator('#inputs-finale-graves option').evaluateAll(opts =>
      opts.map(opt => ({ text: opt.textContent, disabled: opt.disabled }))
    );
    const disabledGravesFinales = gravesFinaleOptions.filter(opt => opt.disabled && opt.text.trim() !== '-- Select --');
    expect(disabledGravesFinales.length).toBeGreaterThan(0);

    // Verify Graves Submit Script Setting dropdown has disabled items
    const gravesSettingOptions = await page.locator('#inputs-setting-graves option').evaluateAll(opts =>
      opts.map(opt => ({ text: opt.textContent, disabled: opt.disabled }))
    );
    const disabledGravesSettings = gravesSettingOptions.filter(opt => opt.disabled && opt.text.trim() !== '-- Select --');
    expect(disabledGravesSettings.length).toBeGreaterThan(0);

    // Verify Graves Submit Script Antagonist dropdown has disabled items
    const gravesAntagonistOptions = await page.locator('#inputs-antagonist-graves option').evaluateAll(opts =>
      opts.map(opt => ({ text: opt.textContent, disabled: opt.disabled }))
    );
    const disabledGravesAntagonists = gravesAntagonistOptions.filter(opt => opt.disabled && opt.text.trim() !== '-- Select --');
    expect(disabledGravesAntagonists.length).toBeGreaterThan(0);

    // Verify Graves Submit Script Protagonist dropdown has disabled items
    const gravesProtagonistOptions = await page.locator('#inputs-protagonist-graves option').evaluateAll(opts =>
      opts.map(opt => ({ text: opt.textContent, disabled: opt.disabled }))
    );
    const disabledGravesProtagonists = gravesProtagonistOptions.filter(opt => opt.disabled && opt.text.trim() !== '-- Select --');
    expect(disabledGravesProtagonists.length).toBeGreaterThan(0);
  });

  test('TC09-000003 Marketing & Release dropdowns filter correctly after applying starting tags', async () => {
    // Navigate to Marketing & Release tab
    await steps.on('marketingTab').click();

    // Apply starting tags
    await steps.on('applyStartingTagsButton').click();
    await page.waitForTimeout(500);

    // Verify targeted context dropdowns have disabled items
    const targetedFinaleOptions = await page.locator('#inputs-finale-targeted option').evaluateAll(opts =>
      opts.map(opt => ({ text: opt.textContent, disabled: opt.disabled }))
    );
    const disabledTargetedFinales = targetedFinaleOptions.filter(opt => opt.disabled && opt.text.trim() !== '-- Select --');
    expect(disabledTargetedFinales.length).toBeGreaterThan(0);
  });

  test('TC09-000004 Excluded items consistency across tab switches', async () => {
    // Go to Build tab and apply starting tags
    await steps.on('scriptLabTab').click();
    await steps.on('applyStartingTagsButton').click();
    await page.waitForTimeout(500);

    // Get disabled items in Script Lab Finale
    const scriptLabFinaleOptions = await page.locator('#inputs-finale-generator option').evaluateAll(opts =>
      opts
        .filter(opt => opt.disabled && opt.text.trim() !== '-- Select --')
        .map(opt => opt.textContent)
    );

    // Switch to Script Evaluation tab
    await steps.on('scriptEvaluationTab').click();
    await page.waitForTimeout(300);

    // Get disabled items in Graves Finale
    const gravesFinaleOptions = await page.locator('#inputs-finale-graves option').evaluateAll(opts =>
      opts
        .filter(opt => opt.disabled && opt.text.trim() !== '-- Select --')
        .map(opt => opt.textContent)
    );

    // The same exclusions should apply in both contexts
    // (both should have the same disabled items since they come from the same exclusion list)
    expect(scriptLabFinaleOptions.length).toBe(gravesFinaleOptions.length);
  });
});
