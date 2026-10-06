import { test, expect } from '@playwright/test';

// Element Preservation (GAME_RULES section 9): the Factory policy keeps five
// story elements Fresh forever. The lab ranks every story element and marks the
// top five; the weights are advice (owner, 2026-10-06).
const STORY_ELEMENTS = 210;
const NO_AGE_DATA = 18;

async function openPreservation(page) {
    await page.goto('/testing-features.html');
    await expect(page.locator('#lab-workspace')).toBeVisible();
    await page.locator('#lab-tab-preservation').click();
    await expect(page.locator('#lab-panel-preservation')).toBeVisible();
    await expect(page.locator('#lab-preservation-top .lab-preservation-card')).toHaveCount(5);
}

const result = page => page.locator('#lab-preservation-result');
const rows = page => result(page).locator('tbody tr');
const firstPick = page => page.locator('#lab-preservation-top .lab-preservation-card').first();

test('TC37-000001 every story element is ranked, the first five are marked and each pick explains itself', async ({ page }) => {
    await openPreservation(page);
    await expect(result(page)).toContainText(`${STORY_ELEMENTS} story elements ranked with the Balanced strategy`);
    await expect(rows(page)).toHaveCount(STORY_ELEMENTS);
    const ranks = await rows(page).locator('td:first-child').allInnerTexts();
    expect(ranks.slice(0, 6)).toEqual(['1 · Top 5', '2 · Top 5', '3 · Top 5', '4 · Top 5', '5 · Top 5', '6']);
    const categories = new Set(await rows(page).locator('td:nth-child(3)').allInnerTexts());
    expect([...categories].sort()).toEqual(['Antagonist', 'Finale', 'Protagonist', 'Supporting Character', 'Theme & Event']);
    for (const card of await page.locator('#lab-preservation-top .lab-preservation-card').all()) {
        await expect(card).toContainText('Why this pick: ');
        await expect(card).toContainText(/Compatibility reach: \d+ strong links?, \d+ conflicts?/);
        await expect(card).toContainText('Age durability: ');
        await expect(card).toContainText('Best used in: ');
        await expect(card).toContainText('Caveat: ');
    }
    await expect(result(page)).toContainText('Weights: Pair reach 3, Few conflicts 2, Slots per script 2, Age durability 2, Cast flexibility 1, Direct score bonus 1.');
});

// Owner, 2026-10-06: respect exclusions by default; untick to include them.
test('TC37-000002 excluded elements are left out by default and come back when the box is unticked', async ({ page }) => {
    await openPreservation(page);
    const best = await firstPick(page).getAttribute('data-tag-id');
    await page.evaluate(id => localStorage.setItem('hac.excludedTags.v1', JSON.stringify([{ id, category: 'Theme & Event' }])), best);
    await openPreservation(page);
    await expect(page.locator('#lab-preservation-respect-exclusions')).toBeChecked();
    await expect(result(page)).toContainText(`${STORY_ELEMENTS - 1} story elements ranked`);
    await expect(result(page)).toContainText('your excluded elements left out');
    await expect(page.locator(`#lab-preservation-top [data-tag-id="${best}"]`)).toHaveCount(0);
    await page.locator('#lab-preservation-respect-exclusions').uncheck();
    await expect(result(page)).toContainText(`${STORY_ELEMENTS} story elements ranked`);
    await expect(result(page)).toContainText('excluded elements included');
    await expect(firstPick(page)).toHaveAttribute('data-tag-id', best);
});

test('TC37-000003 one or two genres narrow the links to elements that fit, and a second genre needs a first', async ({ page }) => {
    await openPreservation(page);
    const second = page.locator('#lab-preservation-genre-2');
    await expect(second).toBeDisabled();
    await expect(result(page)).toContainText('Links count every ranked element.');
    await expect(result(page).locator('thead')).not.toContainText('Genre fit');

    await page.locator('#lab-preservation-genre-1').selectOption('DRAMA');
    await expect(second).toBeEnabled();
    await expect(result(page)).toContainText(/Links count only the \d+ elements that fit Drama \(4 or more\)\./);
    await expect(result(page).locator('thead')).toContainText('Genre fit / 5');
    await expect(result(page)).toContainText('Genre fit 3.');

    await second.selectOption('COMEDY');
    await expect(result(page)).toContainText(/Links count only the \d+ elements that fit Drama \+ Comedy \(4 or more\)\./);
    await second.selectOption('DRAMA');
    await expect(result(page)).toContainText('Choose two different genres.');

    await page.locator('#lab-preservation-genre-1').selectOption('');
    await expect(second).toBeDisabled();
    await expect(second).toHaveValue('');
    await expect(result(page)).toContainText('Links count every ranked element.');
});

test('TC37-000004 a strategy changes the weights and the ranking', async ({ page }) => {
    await openPreservation(page);
    const balanced = await rows(page).locator('td:nth-child(2)').allInnerTexts();
    await page.locator('#lab-preservation-preset').selectOption('power');
    await expect(result(page)).toContainText('ranked with the Power scorer strategy');
    await expect(result(page)).toContainText('Age durability 0');
    const power = await rows(page).locator('td:nth-child(2)').allInnerTexts();
    expect(power).not.toEqual(balanced);
    await page.locator('#lab-preservation-preset').selectOption('career');
    await expect(result(page)).toContainText('ranked with the Career stable strategy');
    await expect(result(page)).toContainText('Age durability 4');
});

// Owner, 2026-10-06: neutral and flagged until the data is found.
test('TC37-000005 a character with no age data says so instead of guessing', async ({ page }) => {
    await openPreservation(page);
    await expect(result(page)).toContainText(`${NO_AGE_DATA} characters have no age data. They count as the average rated character until the data is found.`);
    const witness = rows(page).filter({ hasText: 'Key Witness' });
    await expect(witness).toHaveCount(1);
    await expect(witness.locator('td:nth-child(7)')).toHaveText('No age data');
    await expect(rows(page).filter({ hasText: 'No age data' })).toHaveCount(NO_AGE_DATA);
});

// Owner, 2026-10-06: the top 5 can be all Theme & Event, so each category's best is shown too.
test('TC37-000007 best per category shows the highest-ranked pick of each of the five categories', async ({ page }) => {
    await openPreservation(page);
    const cards = page.locator('#lab-preservation-categories .lab-preservation-card');
    await expect(cards).toHaveCount(5);
    const shown = await cards.evaluateAll(nodes => nodes.map(node => ({
        name: node.querySelector('h4').textContent.replace(/^\d+\. /, ''),
        category: node.querySelector('.lab-note').textContent.split(' · ')[0]
    })));
    expect(shown.map(card => card.category)).toEqual(['Protagonist', 'Antagonist', 'Supporting Character', 'Theme & Event', 'Finale']);
    const firstInTable = await rows(page).evaluateAll(trs => {
        const first = {};
        trs.forEach(tr => {
            const category = tr.children[2].textContent;
            if (!(category in first)) first[category] = tr.children[1].textContent;
        });
        return first;
    });
    shown.forEach(card => expect(card.name).toBe(firstInTable[card.category]));
});

test('TC37-000006 the tab fits a phone and a desktop with no runtime errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const width of [375, 1280]) {
        await page.setViewportSize({ width, height: 900 });
        await openPreservation(page);
        expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBe(0);
    }
    expect(errors).toEqual([]);
});
