import { test, expect, openHollywood } from '../fixtures/base.js';

/**
 * Regression tests: Age & Gender Appeal lists the script's roles (Locked
 * Elements) and never the excluded list, whose entries are bans.
 */

test.describe('Age & Gender Appeal - selector context regression', () => {
    test.beforeEach(async ({ steps }) => {
        await openHollywood(steps);
        await steps.on('buildTab', 'Navigation').click();
    });

    async function selectRole(page, context, category, value) {
        const selectorContext = context === 'locked' ? 'generator' : context;
        const select = page.locator(`#inputs-${category}-${selectorContext} select.tag-selector`).first();
        await expect(select).toBeVisible();
        await select.selectOption(value);
        return select;
    }

    async function expectProtagonistRow(page, name) {
        const row = page.locator('.age-role-row--protagonist').filter({ hasText: name });
        await expect(row).toBeVisible();
        return row;
    }

    test('TC-AGEAPL-RG-001 [automated] protagonist selection in generator context updates panel', async ({ page }) => {
        await selectRole(page, 'generator', 'protagonist', 'PROTAGONIST_ACCIDENTAL_HERO');

        await expect(page.locator('#ageRoleBreakdownPanel')).toBeVisible();
        await expectProtagonistRow(page, 'Accidental Hero');
    });

    test('TC-AGEAPL-RG-002 [automated] protagonist selection in locked context updates panel', async ({ page }) => {
        await selectRole(page, 'locked', 'protagonist', 'PROTAGONIST_COWBOY');

        await expectProtagonistRow(page, 'Cowboy');
    });

    test('TC-AGEAPL-RG-003 [automated] protagonist banned in excluded context is not listed', async ({ page }) => {
        await selectRole(page, 'excluded', 'protagonist', 'PROTAGONIST_COWBOY');
        await page.evaluate(() => window.HACAnalysisAgeRoleBreakdown.update());

        await expect(page.locator('.age-role-row')).toHaveCount(0);
        await expect(page.locator('.age-role-empty-state')).toBeVisible();
    });

    test('TC-AGEAPL-RG-004 [automated] selected roles refresh, and a later ban does not add a row', async ({ page }) => {
        const generatorSelect = await selectRole(page, 'generator', 'protagonist', 'PROTAGONIST_COWBOY');
        await expectProtagonistRow(page, 'Cowboy');

        await generatorSelect.selectOption('');
        await expect(page.locator('.age-role-row--protagonist').filter({ hasText: 'Cowboy' })).toHaveCount(0);

        await selectRole(page, 'excluded', 'protagonist', 'PROTAGONIST_HOPELESS_ROMANTIC');
        await page.evaluate(() => window.HACAnalysisAgeRoleBreakdown.update());
        await expect(page.locator('.age-role-row--protagonist').filter({ hasText: 'Hopeless Romantic' })).toHaveCount(0);
    });

    test('TC-AGEAPL-RG-005 [automated] empty state renders when nothing is selected', async ({ page }) => {
        await expect(page.locator('#ageRoleBreakdownPanel')).toBeVisible();
        await expect(page.locator('.age-role-empty-state')).toBeVisible();
        await expect(page.locator('.age-role-empty-state')).toContainText('Select at least one role');
    });
});
