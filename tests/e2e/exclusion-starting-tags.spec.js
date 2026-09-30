import { test, expect, openHollywood } from '../fixtures/base.js';

// Every exclusion path below was covered only against a clean ban list, and
// the fixture marks Starting Tags as already seeded, so most specs start with
// zero bans. A real first visit starts with Starting Tags applied (193 bans),
// and that is the state in which single-select bans go stale
// (docs/GAME_RULES.md section 5, CLAUDE.md section 4). Each test here applies
// Starting Tags first, then exercises one rule from GAME_RULES.md section 5.

const applyStartingTags = async (steps) => {
  await steps.on('buildTab', 'Navigation').click();
  await steps.on('applyStartingTagsButton', 'ScriptLab').click();
  await expect
    .poll(async () => Number(await steps.on('excludedCountBadge', 'ScriptLab').getText()))
    .toBe(193);
};

const optionDisabled = (page, selector, value) =>
  page.locator(`${selector} option[value="${value}"]`).first().evaluate(option => option.disabled);

const excludedValues = (page, slug) =>
  page.locator(`#inputs-${slug}-excluded select.tag-selector`).evaluateAll(selects => selects.map(s => s.value));

// Lifts one ban by clearing the excluded row that holds it.
const liftBan = async (page, slug, value) => {
  const index = (await excludedValues(page, slug)).indexOf(value);
  expect(index, `${value} should be banned`).toBeGreaterThanOrEqual(0);
  await page.locator(`#inputs-${slug}-excluded select.tag-selector`).nth(index).selectOption('');
};

test.describe('Exclusions with Starting Tags applied', () => {
  test.beforeEach(async ({ steps }) => {
    await openHollywood(steps);
    await applyStartingTags(steps);
  });

  test('TC09-000019 lifting one Setting ban re-enables it in Script Lab immediately', async ({ page }) => {
    const banned = (await excludedValues(page, 'setting')).find(Boolean);
    expect(await optionDisabled(page, '#inputs-setting-generator', banned)).toBe(true);

    await liftBan(page, 'setting', banned);

    await expect.poll(() => optionDisabled(page, '#inputs-setting-generator', banned)).toBe(false);
  });

  test('TC09-000020 lifting one Setting ban re-enables it in Colman Graves immediately', async ({ steps, page }) => {
    const banned = (await excludedValues(page, 'setting')).find(Boolean);
    await steps.on('evaluateTab', 'Navigation').click();
    expect(await optionDisabled(page, '#inputs-setting-graves', banned)).toBe(true);

    await steps.on('buildTab', 'Navigation').click();
    await liftBan(page, 'setting', banned);

    // Straight to Evaluate: any other interaction there would redraw the
    // category and hide a stale list, which is how this kept escaping notice.
    await steps.on('evaluateTab', 'Navigation').click();
    await expect.poll(() => optionDisabled(page, '#inputs-setting-graves', banned)).toBe(false);
  });

  test('TC09-000021 banning a locked pick drops the lock and names it', async ({ steps, page }) => {
    const locked = page.locator('#inputs-supporting-character-generator select.tag-selector').first();
    await locked.focus();
    const allowed = await locked.evaluate(select =>
      [...select.options].find(option => option.value && !option.disabled)?.value);
    expect(allowed, 'the profile should leave some Supporting Characters selectable').toBeTruthy();
    await locked.selectOption(allowed);
    const name = await page.evaluate(id => GAME_DATA.tags[id].name, allowed);

    await steps.on('addExcludedSupportingCharacterRow', 'ScriptLab').click();
    const emptyRow = (await excludedValues(page, 'supporting-character')).indexOf('');
    const banRow = page.locator('#inputs-supporting-character-excluded select.tag-selector').nth(emptyRow);
    await banRow.focus();
    await banRow.selectOption(allowed);

    await expect(locked).toHaveValue('');
    await steps.on('feedbackMessage', 'ScriptLab')
      .verifyTextContains(`Removed from this script because they are now excluded: ${name}.`);
  });

  test('TC09-000022 Build for Target never offers an element the profile bans', async ({ steps, page }) => {
    await steps.on('marketTab', 'Navigation').click();
    await steps.on('buildForTargetModeButton', 'MarketingRelease').click();
    await steps.on('allTagSelects', 'BuildForTarget').waitForState('visible');
    await steps.on('audienceCheckboxes', 'BuildForTarget').first().check();
    await steps.on('findCombinationsButton', 'BuildForTarget').click();
    await steps.on('combinationCards', 'BuildForTarget').verifyCount({ greaterThan: 0 });

    const offeredBans = await page.evaluate(() => {
      const banned = new Set([...document.querySelectorAll('#selectors-container-excluded select.tag-selector')]
        .map(select => select.value).filter(Boolean));
      const bannedNames = new Set([...banned].map(id => GAME_DATA.tags[id]?.name));
      return [...document.querySelectorAll('#targetedResultsList .targeted-tag-chip')]
        .map(chip => chip.textContent.trim())
        .filter(name => bannedNames.has(name));
    });
    expect(offeredBans).toEqual([]);
  });
});
