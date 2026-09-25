import { test, expect, openHollywood } from '../fixtures/base.js';

/**
 * Regression tests: Age & Gender Appeal must read role selections from every
 * Script Lab selector context, not only the generated-script controls.
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

    test('TC-AGEAPL-RG-003 [automated] protagonist selection in excluded context updates panel', async ({ page }) => {
        await selectRole(page, 'excluded', 'protagonist', 'PROTAGONIST_COWBOY');

        await expectProtagonistRow(page, 'Cowboy');
    });

    test('TC-AGEAPL-RG-004 [automated] selected roles are refreshed across selector contexts', async ({ page }) => {
        const generatorSelect = await selectRole(page, 'generator', 'protagonist', 'PROTAGONIST_COWBOY');
        await expectProtagonistRow(page, 'Cowboy');

        await generatorSelect.selectOption('');
        await expect(page.locator('.age-role-row--protagonist').filter({ hasText: 'Cowboy' })).toHaveCount(0);

        await selectRole(page, 'excluded', 'protagonist', 'PROTAGONIST_HOPELESS_ROMANTIC');
        await expectProtagonistRow(page, 'Hopeless Romantic');
    });

    test('TC-AGEAPL-RG-005 [automated] empty state renders when nothing is selected', async ({ page }) => {
        await expect(page.locator('#ageRoleBreakdownPanel')).toBeVisible();
        await expect(page.locator('.age-role-empty-state')).toBeVisible();
        await expect(page.locator('.age-role-empty-state')).toContainText('Select at least one role');
    });
});
