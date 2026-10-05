import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
    await page.goto('/testing-features.html');
    await expect(page.locator('#lab-workspace')).toBeVisible();
});

test('TC34-000001 all eight prototypes are reachable with keyboard navigation and Main App returns home', async ({ page }) => {
    const keys = ['release', 'advertisers', 'calibration', 'genres', 'diversity', 'awards', 'tracker', 'unlocks'];
    await page.locator('#lab-tab-release').focus();
    for (const key of keys.slice(1)) {
        await page.keyboard.press('ArrowDown');
        await expect(page.locator(`#lab-tab-${key}`)).toBeFocused();
        await expect(page.locator(`#lab-panel-${key}`)).toBeVisible();
        await expect(page.locator('[role="tabpanel"]:visible')).toHaveCount(1);
    }
    await page.keyboard.press('Home');
    await expect(page.locator('#lab-tab-release')).toBeFocused();
    await page.locator('#testingFeaturesBackLink').click();
    await expect(page).toHaveURL(/index\.html$/);
    await expect(page.locator('#testingFeaturesLink')).toBeVisible();
});

test('TC34-000002 Factory boost changes opening week while toggling off restores the baseline', async ({ page }) => {
    await page.locator('#lab-release-behemoth').check();
    await page.locator('#lab-release-opening').check();
    const rows = page.locator('#lab-release-result tbody tr');
    const laterBefore = await rows.nth(1).textContent();
    await page.locator('#lab-release-factory').check();
    await page.locator('#lab-release-boost').fill('39');
    await expect(rows.first().locator('td').nth(1)).toHaveText('35,500');
    await expect(rows.first().locator('td').nth(2)).toHaveText('49,345');
    await expect(rows.nth(1)).toHaveText(laterBefore);
    await page.locator('#lab-release-factory').uncheck();
    await expect(rows.first().locator('td').nth(2)).toHaveText('35,500');
    await expect(page.locator('#lab-release-boost')).toBeDisabled();
});

test('TC34-000003 multiple advertisers expose audience gaps without claiming profit', async ({ page }) => {
    await page.locator('#lab-tab-advertisers').click();
    const output = page.locator('#lab-advertisers-result');
    await expect(output).toContainText('Uncovered desired audiences: Young men');
    await page.locator('#lab-agency-ARTMAG').check();
    await expect(output).toContainText('2 advertisers selected');
    await expect(output).toContainText('Uncovered desired audiences: None');
    await expect(output.locator('tbody tr')).toHaveCount(8);
    await expect(output).toContainText('profit, campaign cost and Kinomark impact remain unconfirmed');
});

test('TC34-000004 calibration compares both observations and handles zero attendance', async ({ page }) => {
    await page.locator('#lab-tab-calibration').click();
    const output = page.locator('#lab-calibration-result');
    await expect(output).toContainText('26,444.88');
    await page.locator('#lab-calibration-one-ad').click();
    await expect(output).toContainText('10,502.96');
    await expect(output).toContainText('Advertisers used: 1');
    await page.locator('#lab-calibration-attendance').fill('0');
    await expect(output).toContainText('unavailable at 0% attendance');
    await page.locator('#lab-calibration-four-ads').click();
    await expect(output).toContainText('26,444.88');
});

test('TC34-000005 genre pair bonuses use game data and activate at 35 percent', async ({ page }) => {
    await page.locator('#lab-tab-genres').click();
    await page.locator('#lab-genre-primary').selectOption('DRAMA');
    const comedy = page.locator('#lab-genres-result tbody tr').filter({ hasText: 'Comedy' }).first();
    await expect(comedy.locator('td').nth(1)).toHaveText('+0.25');
    await expect(comedy.locator('td').nth(2)).toHaveText('+0.10');
    await expect(comedy).toContainText('Active');
    await page.locator('#lab-genre-secondary-share').fill('30');
    await expect(comedy).toContainText('Inactive below 35%');
    await page.locator('#lab-genre-secondary-share').fill('35');
    await expect(comedy).toContainText('Active');
    await expect(page.locator('#lab-genres-result tbody tr')).toHaveCount(10);
});

test('TC34-000006 reordered candidates collapse while distinct scripts remain', async ({ page }) => {
    await page.locator('#lab-tab-diversity').click();
    const output = page.locator('#lab-diversity-result');
    await expect(output).toContainText('2 unique scripts. 1 shuffled duplicates removed');
    await page.locator('#lab-diversity-candidates').fill(JSON.stringify([['DETECTIVE'], ['DETECTIVE']]));
    await page.getByRole('button', { name: 'Find Unique Scripts' }).click();
    await expect(output.locator('.lab-script')).toHaveCount(1);
    await expect(output).toContainText('change locked/excluded elements');
    await page.locator('#lab-diversity-candidates').fill(JSON.stringify([['UNKNOWN']]));
    await page.getByRole('button', { name: 'Find Unique Scripts' }).click();
    await expect(output).toContainText('unknown element ID');
    await expect(output.locator('.lab-script')).toHaveCount(0);
    await page.locator('#lab-diversity-sample').click();
    await expect(output.locator('.lab-script')).toHaveCount(2);
});

test('TC34-000007 award targets describe the selected metric without promising an award', async ({ page }) => {
    await page.locator('#lab-tab-awards').click();
    const output = page.locator('#lab-awards-result');
    await expect(output).toContainText('Box office receipts');
    await page.locator('#lab-award-target').selectOption('critics');
    await expect(output).toContainText('Critics ratings');
    await page.locator('#lab-award-target').selectOption('fans');
    await expect(output).toContainText('Kinomark rating');
    await expect(output).toContainText('cutoff is not yet confirmed');
});

test('TC34-000008 journal persists releases, warns about repeats and removes only the chosen film', async ({ page }) => {
    await page.locator('#lab-tab-tracker').click();
    for (const title of ['First film', 'Second film']) {
        await page.locator('#lab-tracker-title').fill(title);
        await page.locator('#lab-tracker-tags').selectOption(['DETECTIVE', 'PROTAGONIST_COP']);
        await page.getByRole('button', { name: 'Record Release' }).click();
    }
    await expect(page.locator('#lab-tracker-result')).toContainText('Detective (2 films)');
    await page.reload();
    await expect(page.locator('#lab-workspace')).toBeVisible();
    await page.locator('#lab-tab-tracker').click();
    await expect(page.locator('#lab-tracker-result tbody tr')).toHaveCount(2);
    await page.getByRole('button', { name: 'Remove First film', exact: true }).click();
    await expect(page.locator('#lab-tracker-result tbody tr')).toHaveCount(1);
    await expect(page.locator('#lab-tracker-result')).toContainText('Second film');
    await expect(page.locator('#lab-tracker-result')).toContainText('No repeated elements');
    await page.locator('#lab-tracker-reference').fill('1943-04-21');
    await expect(page.locator('#lab-tracker-result')).toContainText('No repeated elements');
});

test('TC34-000009 unlock search distinguishes verified starter tags from unknown conditions', async ({ page }) => {
    await page.locator('#lab-tab-unlocks').click();
    await page.locator('#lab-unlock-search').fill('wild west');
    await expect(page.locator('#lab-unlocks-result')).toContainText('Available at the start');
    await page.locator('#lab-unlock-search').fill('horror');
    await expect(page.locator('#lab-unlocks-result')).toContainText('Unlock condition has not been recovered');
    await page.locator('#lab-unlock-search').fill('no such element');
    await expect(page.locator('#lab-unlocks-result')).toContainText('No elements match');
});

test('TC34-000010 failed game data loading offers a working retry', async ({ page }) => {
    await page.route('**/data/GenrePairs.json', route => route.fulfill({ status: 503, body: 'unavailable' }));
    await page.reload();
    await expect(page.locator('#lab-workspace')).toBeHidden();
    await expect(page.locator('#lab-load-status')).toContainText('503');
    await page.unroute('**/data/GenrePairs.json');
    await page.locator('#lab-retry-load').click();
    await expect(page.locator('#lab-workspace')).toBeVisible();
    await expect(page.locator('#lab-release-result tbody tr')).toHaveCount(8);
});

test('TC34-000011 lab has unique IDs and fits mobile and desktop with no runtime errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const width of [390, 1280]) {
        await page.setViewportSize({ width, height: 900 });
        await page.reload();
        await expect(page.locator('#lab-workspace')).toBeVisible();
        for (const key of ['release', 'advertisers', 'calibration', 'genres', 'diversity', 'awards', 'tracker', 'unlocks']) {
            await page.locator(`#lab-tab-${key}`).click();
            await expect(page.locator(`#lab-panel-${key}`)).toBeVisible();
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
            await page.screenshot({ path: `output/playwright/testing-features-${key}-${width}.png`, fullPage: true });
        }
        await page.screenshot({ path: `output/playwright/testing-features-${width}.png`, fullPage: true });
    }
    const ids = await page.locator('[id]').evaluateAll(nodes => nodes.map(node => node.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(errors).toEqual([]);
});
