import { test, expect, openHollywood } from '../fixtures/base.js';

// Banned elements are not in the script, so they must never be listed as roles.
// The fixture starts from a clean ban list, which hid this: a real first run
// carries the Starting Tags bans, so these tests apply them explicitly.
test.describe('Age & Gender Appeal - excluded elements are not script roles', () => {
    test.beforeEach(async ({ steps, page }) => {
        await openHollywood(steps);
        await steps.on('buildTab', 'Navigation').click();
        await page.locator('#applyStartingTagsButton').click();
        await expect(page.locator('#excluded-count')).not.toHaveText('0');
    });

    async function renderPanel(page) {
        await page.evaluate(() => window.HACAnalysisAgeRoleBreakdown.update());
    }

    test('TC-AGEAPL-EX-001 [automated] Starting Tags bans are not listed when nothing is locked', async ({ page }) => {
        await renderPanel(page);

        await expect(page.locator('.age-role-row')).toHaveCount(0);
        await expect(page.locator('.age-role-empty-state')).toBeVisible();
        await expect(page.locator('#ageRoleSelectedRole')).toHaveText('Select at least one role to see age appeal.');
    });

    test('TC-AGEAPL-EX-002 [automated] only the locked role is listed while bans are present', async ({ page }) => {
        const protagonist = page.locator('#inputs-protagonist-generator select.tag-selector');
        const firstAllowed = await protagonist.locator('option:not([value=""]):not([disabled])').first().getAttribute('value');
        await protagonist.selectOption(firstAllowed);
        await renderPanel(page);

        await expect(page.locator('.age-role-row')).toHaveCount(1);
        await expect(page.locator('.age-role-row--protagonist')).toHaveCount(1);
    });
});
