import { test, expect, openHollywood } from '../fixtures/base.js';

const MODES = [
  ['standard', '#generateScriptsButton'],
  ['artistic', '#generateBestArtisticScriptsButton'],
  ['commercial', '#generateBestCommercialScriptsButton'],
];

const LOCKED_SCRIPT = [
  ['genre', 'ACTION'], ['genre', 'COMEDY'], ['setting', 'FANTASY_KINGDOM'],
  ['protagonist', 'PROTAGONIST_OUTCAST'],
  ['antagonist', 'ANTAGONIST_ROBBER_WITH_A_HUNDRED_DICKS'],
  ['finale', 'FINALE_COUPLE_GETS_MARRIED'],
  ['supporting-character', 'SUPPORTINGCHARACTER_FEMME_FATALE'],
  ['supporting-character', 'SUPPORTINGCHARACTER_LOVE_INTEREST'],
];

const STARTER_SCRIPT = [
  ['genre', 'ACTION'], ['setting', 'WILD_WEST'],
  ['protagonist', 'PROTAGONIST_COWBOY'], ['antagonist', 'ANTAGONIST_BANDIT'],
  ['finale', 'FINALE_ANTAGONIST_GETS_KILLED'],
  ['supporting-character', 'SUPPORTINGCHARACTER_SIDEKICK'],
  ['theme-event', 'THEME_TREASURE_HUNT'],
];

async function selectTag(page, category, id, context = 'generator') {
  const selects = page.locator(`#inputs-${category}-${context} select.tag-selector`);
  let empty = selects.filter({ has: page.locator('option:checked[value=""]') });
  if (await empty.count() === 0) {
    await page.locator(`#add-${category}-${context}-button`).click();
    empty = selects.filter({ has: page.locator('option:checked[value=""]') });
  }
  await empty.first().focus();
  await empty.first().selectOption(id);
}

test.describe('generation and transfer score integrity', () => {
  for (const [mode, button] of MODES) {
    test(`TC20-000001 ${mode}: locks and unequal genre shares survive both transfers with identical scores`, async ({ steps, page }) => {
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await openHollywood(steps);
      for (const [category, id] of LOCKED_SCRIPT) await selectTag(page, category, id);
      const action = page.locator('#inputs-genre-generator .genre-row')
        .filter({ has: page.locator('select:has(option:checked[value="ACTION"])') });
      await action.locator('.percent-input').fill('80');
      await action.locator('.percent-input').dispatchEvent('change');

      await page.locator(button).click();
      const cards = page.locator('#generatorResultsList .gen-card');
      await expect(cards).toHaveCount(mode === 'standard' ? 5 : 3);
      await expect(cards.first()).not.toContainText(/NaN|Infinity/);
      const generated = await page.evaluate(() => generatedScriptsCache.map(script => ({
        tags: script.tags, scores: script.scores, stats: script.stats
      })));
      for (const script of generated) {
        expect(script.tags.map(tag => tag.id).sort()).toEqual(LOCKED_SCRIPT.map(([, id]) => id).sort());
        expect(script.tags.find(tag => tag.id === 'ACTION').percent).toBe(0.8);
        expect(script.tags.find(tag => tag.id === 'COMEDY').percent).toBe(0.2);
        expect(Number.isFinite(script.stats.synergySum)).toBe(true);
        expect(Number.isFinite(script.scores.commercial)).toBe(true);
        expect(Number.isFinite(script.scores.artistic)).toBe(true);
        // This actual game-data fixture has conflicts: zero is correct, not NaN.
        expect(script.scores).toEqual({ commercial: 0, artistic: 0 });
      }

      for (const context of ['graves', 'advertisers']) {
        if (context === 'advertisers') await page.locator('#tab-generator-button').click();
        const card = cards.first();
        if (await card.locator('.gen-details').isHidden()) await card.locator('.gen-header').click();
        await card.locator(`[data-role="${context === 'graves' ? 'script-graves-button' : 'script-transfer-button'}"]`).click();
        await expect(page.locator(`#tab-${context}`)).toBeVisible();
        const transferred = await page.evaluate(ctx => collectTagInputs(ctx), context);
        expect(transferred.slice().sort((a, b) => a.id.localeCompare(b.id)))
          .toEqual(generated[0].tags.slice().sort((a, b) => a.id.localeCompare(b.id)));
        if (context === 'graves') {
          await expect(page.locator('#gravesTotalComScore')).toHaveText('0');
          await expect(page.locator('#gravesTotalArtScore')).toHaveText('0');
        } else {
          await expect(page.locator('#comScoreInput')).toHaveValue('0');
          await expect(page.locator('#artScoreInput')).toHaveValue('0');
        }
      }
      expect(errors).toEqual([]);
    });
  }

  for (const [mode, button] of MODES) {
    test(`TC20-000002 ${mode}: starting-pool generation keeps locks, bans and age roles distinct`, async ({ steps, page }) => {
      await openHollywood(steps);
      await page.locator('#applyStartingTagsButton').click();
      await expect(page.locator('#excluded-count')).toHaveText('193');
      for (const [category, id] of STARTER_SCRIPT) await selectTag(page, category, id);
      const roles = page.locator('.age-role-row .age-role-role-name');
      await expect(roles).toHaveCount(3);
      await expect(roles).toHaveText(['Cowboy', 'Bandit', 'Sidekick']);

      await page.locator(button).click();
      await expect(page.locator('#generatorResultsList .gen-card')).toHaveCount(mode === 'standard' ? 5 : 3);
      const scripts = await page.evaluate(() => generatedScriptsCache.map(script => ({
        ids: script.tags.map(tag => tag.id),
        banned: script.tags.filter(tag => getGeneratorExcludedIds().has(tag.id)).map(tag => tag.id),
        count: HACGravesAnalysis.storyElementsOf(script.tags).length,
        scores: script.scores,
      })));
      for (const script of scripts) {
        expect(script.ids.sort()).toEqual(STARTER_SCRIPT.map(([, id]) => id).sort());
        expect(script.count).toBe(5);
        expect(script.banned).toEqual([]);
        expect(Number.isFinite(script.scores.commercial)).toBe(true);
        expect(Number.isFinite(script.scores.artistic)).toBe(true);
      }
      await expect(roles).toHaveText(['Cowboy', 'Bandit', 'Sidekick']);
    });

    test(`TC20-000003 ${mode}: too few surviving story elements is explained without incomplete results`, async ({ steps, page }) => {
      await openHollywood(steps);
      // Setup the global ban list through the production restore API; the action
      // under test remains the visible Generate button.
      await page.evaluate(() => {
        const excluded = Object.values(GAME_DATA.tags)
          .filter(tag => ['Supporting Character', 'Theme & Event'].includes(tag.category))
          .map(tag => ({ id: tag.id, category: tag.category, percent: 1 }));
        restoreSelection('excluded', excluded);
        updateExcludedCount();
      });
      await page.locator(button).click();
      await expect(page.locator('#generatorFeedbackMessage')).toContainText('Not enough available story elements to fill 5 slots');
      await expect(page.locator('#generatorResultsList .gen-card')).toHaveCount(0);
    });
  }

  test('TC20-000004 a scoring-data outage is visible and the same action succeeds after retry', async ({ steps, page }) => {
    await page.route('**/data/TagCompatibilityData.json', route => route.fulfill({ status: 503, body: '{}' }));
    await openHollywood(steps);
    for (const [category, id] of STARTER_SCRIPT) await selectTag(page, category, id);
    await page.locator('#generateScriptsButton').click();
    await expect(page.locator('#generatorFeedbackMessage')).toContainText('Could not load scoring data');
    await expect(page.locator('#generatorResultsList .gen-card')).toHaveCount(0);
    await page.unroute('**/data/TagCompatibilityData.json');
    await page.locator('#generateScriptsButton').click();
    await expect(page.locator('#generatorResultsList .gen-card')).toHaveCount(5);
    await expect(page.locator('#generatorResultsList')).not.toContainText(/NaN|Infinity/);
  });

  test('TC20-000005 cold-start generation includes the game-file genre-pair bonuses', async ({ steps, page }) => {
    await openHollywood(steps);
    for (const [category, id] of [
      ['genre', 'DRAMA'], ['genre', 'COMEDY'], ['setting', 'MODERN_EUROPEAN_CITY'],
      ['protagonist', 'PROTAGONIST_WHITE_COLLAR'], ['antagonist', 'ANTAGONIST_CORRUPT_OFFICIAL'],
      ['finale', 'FINALE_COUPLE_GETS_MARRIED'],
      ['supporting-character', 'SUPPORTINGCHARACTER_LOVE_INTEREST'],
      ['supporting-character', 'SUPPORTINGCHARACTER_FEMME_FATALE'],
    ]) await selectTag(page, category, id);
    await page.locator('#generateBestArtisticScriptsButton').click();
    const firstCard = page.locator('#generatorResultsList .gen-card').first();
    await expect(firstCard.locator('.gen-badge-val').nth(0)).toHaveText('0.65');
    await expect(firstCard.locator('.gen-badge-val').nth(1)).toHaveText('0.40');
    await firstCard.locator('.gen-header').click();
    await firstCard.locator('[data-role="script-graves-button"]').click();
    await expect(page.locator('#gravesTotalComScore')).toHaveText('7.0');
    await expect(page.locator('#gravesTotalArtScore')).toHaveText('7.0');
  });
});

test.describe('product rule boundaries', () => {
  test('TC20-000006 first visit seeds exactly the complement of the 57 starting elements', async ({ browser, baseURL }) => {
    const context = await browser.newContext();
    try {
      await context.route(/fonts\.(googleapis|gstatic)\.com/, route => route.abort());
      const page = await context.newPage();
      await page.addInitScript(() => {
        window.addEventListener('hollywood:ready', () => { window.readyForTest = true; });
      });
      await page.goto(baseURL);
      await page.waitForFunction(() => window.readyForTest);
      await expect(page.locator('#excluded-count')).toHaveText('193');
      const sets = await page.evaluate(() => ({
        banned: collectTagInputs('excluded').map(tag => tag.id).sort(),
        expected: Object.keys(GAME_DATA.tags).filter(id => !GAME_DATA.starterWhitelist.includes(id)).sort(),
      }));
      expect(sets.banned).toEqual(sets.expected);
      expect(sets.banned).toHaveLength(193);
    } finally {
      await context.close();
    }
  });

  test('TC20-000007 banning a locked role clears the pick and the age panel', async ({ steps, page }) => {
    await openHollywood(steps);
    await selectTag(page, 'protagonist', 'PROTAGONIST_COWBOY');
    await expect(page.locator('.age-role-row')).toHaveCount(1);
    await selectTag(page, 'protagonist', 'PROTAGONIST_COWBOY', 'excluded');
    await expect(page.locator('#inputs-protagonist-generator select')).toHaveValue('');
    await expect(page.locator('.age-role-row')).toHaveCount(0);
    await expect(page.locator('#generatorFeedbackMessage')).toContainText('Cowboy');
  });

  for (const count of [4, 10]) {
    test(`TC20-000008 Graves counts ${count} story elements independently of a pool of five`, async ({ steps, page }) => {
      await openHollywood(steps);
      await page.locator('#tab-evaluate-button').click();
      const script = count === 4 ? STARTER_SCRIPT.filter(([category]) => category !== 'theme-event') : STARTER_SCRIPT;
      for (const [category, id] of script) await selectTag(page, category, id, 'graves');
      if (count === 10) {
        const extra = await page.evaluate(() => Object.values(GAME_DATA.tags)
          .filter(tag => tag.category === 'Theme & Event' && tag.id !== 'THEME_TREASURE_HUNT').slice(0, 5).map(tag => tag.id));
        for (const id of extra) await selectTag(page, 'theme-event', id, 'graves');
      }
      await expect(page.locator('#globalElementPoolInput')).toHaveValue('5');
      await page.locator('#evaluateGravesButton').click();
      if (count === 4) {
        await expect(page.locator('#gravesFeedbackMessage')).toContainText('You selected 4');
        await expect(page.locator('#results-graves')).toBeHidden();
      } else {
        await expect(page.locator('#results-graves')).toBeVisible();
        await expect(page.locator('#gravesScoreCapLabel')).toContainText('10 Scoring Elements');
        await expect(page.locator('#results-graves')).not.toContainText(/NaN|Infinity/);
      }
    });
  }

  test('TC20-000009 full pools allow swaps and pairwise rows but block growing story additions', async ({ steps, page }) => {
    await openHollywood(steps);
    await page.locator('#tab-evaluate-button').click();
    for (const [category, id] of LOCKED_SCRIPT) await selectTag(page, category, id, 'graves');
    await page.locator('#gravesBestScoreFilter').selectOption('0');
    await page.locator('#generateBestMatchesButton').click();
    await expect(page.locator('#gravesBestMatchesList')).toContainText('Max Element Pool');
    await page.locator('#graves-best-mode-swaps').click();
    const swap = page.locator('#gravesBestMatchesList button[data-action="swap-graves-best-match"]').first();
    await expect(swap).toBeEnabled();
    const before = await page.evaluate(() => collectTagInputs('graves'));
    await swap.click();
    const after = await page.evaluate(() => collectTagInputs('graves'));
    expect(after).toHaveLength(before.length);
    expect(after.filter(tag => !before.some(old => old.id === tag.id))).toHaveLength(1);
    await page.locator('#gravesBestCategoryFilter').selectOption('Theme & Event');
    await page.locator('#graves-best-mode-pairwise').click();
    const adds = page.locator('#gravesBestMatchesList button[data-action="add-graves-best-match"]');
    expect(await adds.count()).toBeGreaterThan(0);
    for (const add of await adds.all()) await expect(add).toBeDisabled();
    await expect(page.locator('#gravesBestMatchesList')).not.toContainText(/NaN|Infinity/);
  });

  test('TC20-000010 banning a submitted element removes it from every Best Matches view', async ({ steps, page }) => {
    await openHollywood(steps);
    await page.locator('#tab-evaluate-button').click();
    for (const [category, id] of LOCKED_SCRIPT) await selectTag(page, category, id, 'graves');
    await page.locator('#evaluateGravesButton').click();
    await expect(page.locator('#results-graves')).toBeVisible();
    await page.locator('#tab-generator-button').click();
    await selectTag(page, 'supporting-character', 'SUPPORTINGCHARACTER_FEMME_FATALE', 'excluded');
    await page.locator('#tab-evaluate-button').click();
    const ids = await page.evaluate(() => collectTagInputs('graves').map(tag => tag.id));
    expect(ids).not.toContain('SUPPORTINGCHARACTER_FEMME_FATALE');
    await page.locator('#gravesBestScoreFilter').selectOption('0');
    await page.locator('#generateBestMatchesButton').click();
    for (const mode of ['additions', 'swaps', 'pairwise']) {
      await page.locator(`#graves-best-mode-${mode}`).click();
      const rows = page.locator('#gravesBestMatchesList [data-role="graves-best-match"]');
      expect(await rows.count()).toBeGreaterThan(0);
      expect(await rows.evaluateAll(items => items.map(item => item.dataset.tagId)))
        .not.toContain('SUPPORTINGCHARACTER_FEMME_FATALE');
      await expect(page.locator('#gravesBestMatchesList')).not.toContainText(/NaN|Infinity/);
    }
  });

  for (const pool of [5, 10]) {
    test(`TC20-000011 Starting Tags Build for Target fills ${pool} story slots and keeps all bans`, async ({ steps, page }) => {
      await openHollywood(steps);
      await page.locator('#applyStartingTagsButton').click();
      await expect(page.locator('#excluded-count')).toHaveText('193');
      await page.locator('#globalElementPoolInput').fill(String(pool));
      await page.locator('#globalElementPoolInput').blur();
      await steps.on('marketTab', 'Navigation').click();
      await page.locator('#marketing-mode-targeted-button').click();
      await page.locator('.targeted-audience-checkbox').first().check();
      await page.locator('#findCombinationsButton').click();
      const cards = page.locator('#targetedResultsList .combination-card');
      await expect(cards.first()).toBeVisible();
      expect(await cards.count()).toBeGreaterThan(0);
      const availableNames = await page.evaluate(() => GAME_DATA.starterWhitelist.map(id => GAME_DATA.tags[id].name));
      for (const card of await cards.all()) {
        const chips = card.locator('.targeted-tag-chip');
        await expect(chips).toHaveCount(pool + 2);
        const names = (await chips.allTextContents()).map(text => text.trim());
        expect(names.every(name => availableNames.includes(name))).toBe(true);
        await expect(card.locator('.targeted-tag-chip.genre')).toHaveCount(1);
        await expect(card.locator('.targeted-tag-chip.setting')).toHaveCount(1);
        await expect(card).not.toContainText(/NaN|Infinity/);
      }
    });
  }
});
