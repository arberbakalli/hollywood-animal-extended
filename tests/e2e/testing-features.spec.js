import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
    await page.goto('/testing-features.html');
    await expect(page.locator('#lab-workspace')).toBeVisible();
});

test('TC34-000001 all seven prototypes are reachable with keyboard navigation and Main App returns home', async ({ page }) => {
    const keys = ['release', 'advertisers', 'calibration', 'genres', 'awards', 'tracker', 'unlocks'];
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

test('TC34-000002 optional Factory estimate changes week one and restores baseline when off', async ({ page }) => {
    await page.locator('#lab-release-behemoth').check();
    await page.locator('#lab-release-opening').check();
    const rows = page.locator('#lab-release-result tbody tr');
    await expect(rows.first().locator('td').nth(1)).toHaveText('35,500');
    await expect(rows).toHaveCount(8);
    await expect(page.locator('#lab-release-result thead th')).toHaveText(['Week', 'Demand']);
    const laterWeeks = (await rows.allTextContents()).slice(1);
    await page.locator('#lab-release-factory').check();
    await page.locator('#lab-release-boost').fill('39');
    await expect(rows.first().locator('td').nth(1)).toHaveText('49,345');
    expect((await rows.allTextContents()).slice(1)).toEqual(laterWeeks);
    await page.locator('#lab-release-factory').uncheck();
    await expect(rows.first().locator('td').nth(1)).toHaveText('35,500');
    await expect(page.locator('#lab-release-boost')).toBeDisabled();
});

test('TC34-000003 multiple advertisers expose audience gaps without claiming profit', async ({ page }) => {
    await page.locator('#lab-tab-advertisers').click();
    const output = page.locator('#lab-advertisers-result');
    await expect(output).toContainText('Uncovered desired audiences: Young men');
    await page.locator('#lab-agency-ARTMAG').check();
    await expect(output).toContainText('2 advertisers selected');
    await expect(output).toContainText('Uncovered desired audiences: None');
    await expect(output).toContainText('Movie lean: Balanced');
    await expect(output.locator('table')).toHaveCount(0);
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
    await expect(page.locator('#lab-genres-result .lab-mini-card').first()).toContainText('Drama + Comedy');
    await expect(page.locator('#lab-genres-result .lab-mini-card').nth(1)).toContainText('Drama + Historical');
});

test('TC34-000018 best genre summaries show every tied winner and omit excluded pairs', async ({ page }) => {
    await page.locator('#lab-tab-genres').click();
    await page.locator('#lab-genre-primary').selectOption('DRAMA');
    const commercial = page.locator('#lab-genres-result .lab-mini-card').first();
    await expect(commercial.locator('.lab-best-pair')).toHaveText(['Drama + Comedy', 'Drama + Romance']);
    await expect(commercial).toContainText('+0.25 commercial bonus');
    const artistic = page.locator('#lab-genres-result .lab-mini-card').nth(1);
    await expect(artistic.locator('.lab-best-pair')).toHaveText(['Drama + Historical']);
    await page.evaluate(() => {
        localStorage.setItem('hac.excludedTags.v1', JSON.stringify([{ id: 'COMEDY', category: 'Genre' }]));
        window.dispatchEvent(new StorageEvent('storage', { key: 'hac.excludedTags.v1' }));
    });
    await expect(commercial.locator('.lab-best-pair')).toHaveText(['Drama + Romance']);
});

test('TC34-000016 excluded genres stay in the reference but leave best-pair recommendations', async ({ page }) => {
    await page.evaluate(() => localStorage.setItem('hac.excludedTags.v1', JSON.stringify([{ id: 'COMEDY', category: 'Genre' }])));
    await page.locator('#lab-tab-genres').click();
    await page.locator('#lab-genre-primary').selectOption('DRAMA');
    await expect(page.locator('#lab-genres-result .lab-mini-card').first()).toContainText('Drama + Romance');
    await expect(page.locator('#lab-genres-result tbody tr').filter({ hasText: 'Comedy (excluded)' })).toHaveCount(1);
});

test('TC34-000017 genre insight ranks successful story pairs and broad genre matches separately', async ({ page }) => {
    await page.locator('#lab-tab-genres').click();
    await page.locator('#lab-genre-primary').selectOption('COMEDY');
    const first = page.locator('#lab-genre-elements-result tbody tr').first();
    await expect(first.locator('td').first()).toHaveText('Alcohol \u2014 the Spirit of Freedom');
    await expect(first.locator('td').nth(3)).toHaveText('34');
    await page.locator('#lab-genre-element-rank').selectOption('cross');
    await expect(first.locator('td').first()).toHaveText('Damsel in Distress');
    await expect(first.locator('td').nth(2)).toHaveText('3.0');
    await expect(first.locator('td').nth(3)).toHaveText('9');
});

test('TC34-000012 genre element insight uses direct pair scores and exclusions', async ({ page }) => {
    await page.locator('#lab-tab-genres').click();
    await page.locator('#lab-genre-primary').selectOption('ACTION');
    await page.locator('#lab-genre-element-category').selectOption('Protagonist');
    await page.locator('#lab-genre-element-search').fill('Cowboy');
    const output = page.locator('#lab-genre-elements-result');
    await expect(output.locator('tbody tr')).toHaveCount(1);
    await expect(output.locator('tbody tr')).toContainText('Cowboy');
    await expect(output.locator('tbody tr td').nth(2)).toHaveText('5.0');
    await expect(output.locator('tbody tr td').nth(3)).toHaveText('49');
    await expect(output.locator('tbody tr td').nth(4)).toHaveText('12');
    await expect(output.locator('.lab-pair-stat strong').first()).toHaveText('1');
    await page.locator('#lab-genre-element-rank').selectOption('cross');
    await expect(output.locator('tbody tr')).toHaveCount(1);
    await expect(output.locator('tbody tr td').nth(3)).toHaveText('3');
    await expect(output.locator('tbody tr td').nth(4)).toHaveText('1');
    await page.evaluate(() => localStorage.setItem('hac.excludedTags.v1', JSON.stringify([{ id: 'PROTAGONIST_COWBOY', category: 'Protagonist' }])));
    await page.locator('#lab-genre-element-search').fill('Cowboy ');
    await page.locator('#lab-genre-element-search').fill('Cowboy');
    await expect(output).toContainText('No available elements in this category');
    await expect(output.locator('tbody tr')).toHaveCount(0);
});

test('TC34-000013 campaign coverage remains available when a former sample element is excluded', async ({ page }) => {
    await page.evaluate(() => localStorage.setItem('hac.excludedTags.v1', JSON.stringify([{ id: 'DETECTIVE', category: 'Genre' }])));
    await page.locator('#lab-tab-advertisers').click();
    await page.locator('#lab-advertisers-lean').selectOption('1');
    const output = page.locator('#lab-advertisers-result');
    await expect(output).toContainText('Movie lean: Artistic');
    await expect(output).toContainText('Uncovered desired audiences: Young men');
    await expect(output.locator('table')).toHaveCount(0);
});

test('TC34-000021 excluding old sample tags does not erase campaign coverage', async ({ page }) => {
    await page.evaluate(() => localStorage.setItem('hac.excludedTags.v1', JSON.stringify([
        { id: 'DETECTIVE', category: 'Genre' },
        { id: 'PROTAGONIST_COP', category: 'Protagonist' }
    ])));
    await page.locator('#lab-tab-advertisers').click();
    await page.locator('#lab-advertisers-lean').selectOption('1');
    const output = page.locator('#lab-advertisers-result');
    await expect(output).toContainText('Covered audiences:');
    await expect(output).toContainText('Uncovered desired audiences: Young men');
    await page.locator('#lab-agency-ARTMAG').check();
    await expect(output).toContainText('Uncovered desired audiences: None');
    await expect(page.locator('#lab-advertisers-tags')).toHaveCount(0);
    await expect(output.locator('table')).toHaveCount(0);
});

test('TC34-000014 pair data loads once when the genre insight is opened', async ({ page }) => {
    const requests = () => page.evaluate(() => performance.getEntriesByType('resource')
        .filter(entry => entry.name.endsWith('/data/TagCompatibilityData.json')).length);
    expect(await requests()).toBe(0);
    await page.locator('#lab-tab-genres').click();
    await expect(page.locator('#lab-genre-elements-result tbody tr')).toHaveCount(15);
    expect(await requests()).toBe(1);
    await page.locator('#lab-genre-primary').selectOption('COMEDY');
    await page.locator('#lab-genre-element-rank').selectOption('cross');
    await expect(page.locator('#lab-genre-elements-result tbody tr')).toHaveCount(15);
    expect(await requests()).toBe(1);
});

test('TC34-000015 failed pair data can be retried without blocking other tools', async ({ page }) => {
    await page.route('**/data/TagCompatibilityData.json', route => route.fulfill({ status: 503, body: '{}' }));
    await page.locator('#lab-tab-genres').click();
    await expect(page.locator('#lab-genre-elements-result')).toContainText('Could not load pair data (503)');
    await page.locator('#lab-tab-calibration').click();
    await expect(page.locator('#lab-calibration-result')).toContainText('26,444.88');
    await page.locator('#lab-tab-genres').click();
    await expect(page.locator('#lab-genre-pair-retry')).toBeVisible();
    await page.unroute('**/data/TagCompatibilityData.json');
    await page.locator('#lab-genre-pair-retry').click();
    await expect(page.locator('#lab-genre-elements-result tbody tr')).toHaveCount(15);
});

test('TC34-000007 award targets describe the selected metric without promising an award', async ({ page }) => {
    await page.locator('#lab-tab-awards').click();
    const output = page.locator('#lab-awards-result');
    await expect(output).toContainText('Box office receipts');
    await expect(output).toContainText('Critics ratings');
    await expect(output).toContainText('Kinomark rating');
    await expect(output).toContainText('cutoff is not yet confirmed');
    await page.locator('#lab-award-film').fill('Festival western');
    await page.locator('#lab-award-year').fill('1935');
    await page.locator('#lab-award-target-critics').check();
    await expect(output).toContainText('Festival western for 1935');
    await expect(output.locator(':scope > p')).toContainText('targets: Critical Acclaim');
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
    await expect(page.locator('#lab-tracker-result')).toContainText('No repeats detected');
    await page.locator('#lab-tracker-reference').fill('1943-04-21');
    await expect(page.locator('#lab-tracker-result')).toContainText('No repeats detected');
});

test('TC34-000022 an award memo requires a target year', async ({ page }) => {
    await page.locator('#lab-tab-awards').click();
    await page.locator('#lab-award-film').fill('Festival western');
    await page.locator('#lab-award-year').fill('');
    const output = page.locator('#lab-awards-result');
    await expect(output).toContainText(/target year/i);
    await expect(output).not.toContainText('for ;');
});

test('TC34-000019 an unreadable release journal is not overwritten by a new film', async ({ page }) => {
    const stored = JSON.stringify([
        { title: 'Earlier film', date: '1941-04-21', tags: ['DETECTIVE'] },
        { title: 'Unknown element film', date: '1941-04-21', tags: ['UNKNOWN_ELEMENT'] }
    ]);
    await page.evaluate(value => localStorage.setItem('hac.testing-features.releases.v1', value), stored);
    await page.reload();
    await expect(page.locator('#lab-workspace')).toBeVisible();
    await page.locator('#lab-tab-tracker').click();
    await expect(page.locator('#lab-load-status')).toContainText('could not be read');
    await page.locator('#lab-tracker-title').fill('New film');
    await page.locator('#lab-tracker-tags').selectOption('DETECTIVE');
    await page.getByRole('button', { name: 'Record Release' }).click();
    expect(await page.evaluate(() => localStorage.getItem('hac.testing-features.releases.v1'))).toBe(stored);
    await expect(page.locator('#lab-tracker-result')).toContainText('cannot save');
});

test('TC34-000020 a failed storage write leaves the journal intact and reports the error', async ({ page }) => {
    await page.locator('#lab-tab-tracker').click();
    await page.evaluate(() => {
        const original = Storage.prototype.setItem;
        Storage.prototype.setItem = function (key, value) {
            if (key === 'hac.testing-features.releases.v1') throw new DOMException('Storage full', 'QuotaExceededError');
            return original.call(this, key, value);
        };
    });
    await page.locator('#lab-tracker-title').fill('New film');
    await page.locator('#lab-tracker-tags').selectOption('DETECTIVE');
    await page.getByRole('button', { name: 'Record Release' }).click();
    await expect(page.locator('#lab-tracker-result')).toContainText(/could not save/i);
    expect(await page.evaluate(() => localStorage.getItem('hac.testing-features.releases.v1'))).toBeNull();
});

test('TC34-000009 unlock search shows starter, date and recipe conditions from recovered game data', async ({ page }) => {
    await page.locator('#lab-tab-unlocks').click();
    await page.locator('#lab-unlock-search').fill('wild west');
    await expect(page.locator('#lab-unlocks-result')).toContainText('Available at the start');
    await page.locator('#lab-unlock-search').fill('horror');
    await expect(page.locator('#lab-unlocks-result')).toContainText('Unlocks on or after 1935-09-13');
    await page.locator('#lab-unlock-category').selectOption('Setting');
    await page.locator('#lab-unlock-search').fill('ww2');
    await expect(page.locator('#lab-unlock-tag option')).toHaveCount(3);
    await page.locator('#lab-unlock-tag').selectOption('WW2_AFRICA');
    await expect(page.locator('#lab-unlocks-result')).toContainText('Unlocks on or after 1940-06-20');
    await page.locator('#lab-unlock-category').selectOption('Protagonist');
    await page.locator('#lab-unlock-search').fill('toxic');
    await expect(page.locator('#lab-unlocks-result')).toContainText('Trash King policy recipe');
    await expect(page.locator('#lab-unlocks-result')).toContainText('Clumsy Oaf + Avenging Loved Ones');
    await page.locator('#lab-unlock-search').fill('no such element');
    await expect(page.locator('#lab-unlocks-result')).toContainText('No elements match');
});

test('TC34-000023 unlock choices are grouped by story category', async ({ page }) => {
    await page.locator('#lab-tab-unlocks').click();
    await expect(page.locator('#lab-unlock-tag optgroup[label="Genre"]')).toBeAttached();
    await expect(page.locator('#lab-unlock-tag optgroup[label="Setting"] option[value="WILD_WEST"]')).toBeAttached();
    await expect(page.locator('#lab-unlock-tag optgroup[label="Protagonist"]')).toBeAttached();
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

test('TC34-000011 lab has unique IDs and fits mobile and desktop with no runtime errors', async ({ page }, testInfo) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const width of [390, 1280]) {
        await page.setViewportSize({ width, height: 900 });
        await page.reload();
        await expect(page.locator('#lab-workspace')).toBeVisible();
        await expect(page.locator('.lab-nav')).toHaveAttribute('aria-orientation', width < 761 ? 'horizontal' : 'vertical');
        for (const key of ['release', 'advertisers', 'calibration', 'genres', 'awards', 'tracker', 'unlocks']) {
            await page.locator(`#lab-tab-${key}`).click();
            await expect(page.locator(`#lab-panel-${key}`)).toBeVisible();
            if (key === 'genres') await expect(page.locator('#lab-genre-elements-result tbody tr')).toHaveCount(15);
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
            await page.screenshot({ path: testInfo.outputPath(`testing-features-${key}-${width}.png`), fullPage: true });
        }
        await page.screenshot({ path: testInfo.outputPath(`testing-features-${width}.png`), fullPage: true });
    }
    const ids = await page.locator('[id]').evaluateAll(nodes => nodes.map(node => node.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(errors).toEqual([]);
});

test('TC34-000024 one advertiser is counted in the singular', async ({ page }) => {
    await page.locator('#lab-tab-advertisers').click();
    const output = page.locator('#lab-advertisers-result');
    await expect(output).toContainText('1 advertiser selected.');
    await expect(output).not.toContainText('1 advertisers');
});
