import { test, expect, openHollywood } from '../fixtures/base.js';

async function pick(page, category, id, context) {
  const group = page.locator(`#inputs-${category}-${context}`);
  let empty = group.locator('select').filter({ has: page.locator('option:checked[value=""]') });
  if (await empty.count() === 0) {
    await page.locator(`#add-${category}-${context}-button`).click();
    empty = group.locator('select').filter({ has: page.locator('option:checked[value=""]') });
  }
  await empty.first().focus();
  await empty.first().selectOption(id);
}

// Owner ruling 2026-10-01, edit approved: the decay gate opens from 9, so
// week 3 falls at 0.85: 9000 x 0.85 x 1.25 = 9562.5, rounded up because the
// opening window (indexes below 4) rounds up.
test('TC22-000001 commercial nine slows the decay from week three with Behemoth enabled', async ({ steps, page }) => {
  await openHollywood(steps);
  await steps.on('marketTab', 'Navigation').click();
  await page.locator('#comScoreInput').fill('9');
  await page.locator('#behemothToggle').check();
  await expect(page.locator('#dist-week-1-value')).toHaveAttribute('data-demand', '22500');
  await expect(page.locator('#dist-week-2-value')).toHaveAttribute('data-demand', '11250');
  await expect(page.locator('#dist-week-3-value')).toHaveAttribute('data-demand', '9563');
});

test('TC22-000002 week eight gets the Behemoth lift only while the toggle is on', async ({ steps, page }) => {
  await openHollywood(steps);
  await steps.on('marketTab', 'Navigation').click();
  await page.locator('#comScoreInput').fill('5');
  await expect(page.locator('#dist-week-8-value')).toHaveAttribute('data-demand', '1310');
  await page.locator('#behemothToggle').check();
  await expect(page.locator('#dist-week-8-value')).toHaveAttribute('data-demand', '1638');
  await page.locator('#behemothToggle').uncheck();
  await expect(page.locator('#dist-week-8-value')).toHaveAttribute('data-demand', '1310');
});

test('TC22-000003 all eleven selected genres keep a whole hundred percent with a five-percent minimum', async ({ steps, page }) => {
  await openHollywood(steps);
  await steps.on('evaluateTab', 'Navigation').click();
  const ids = await page.evaluate(() => Object.values(GAME_DATA.tags).filter(tag => tag.category === 'Genre').map(tag => tag.id));
  expect(ids).toHaveLength(11);
  for (const id of ids) await pick(page, 'genre', id, 'graves');
  const shares = page.locator('#inputs-genre-graves .percent-input');
  await expect(shares).toHaveCount(11);
  await shares.first().fill('100');
  await shares.first().dispatchEvent('change');
  const values = await shares.evaluateAll(inputs => inputs.map(input => Number(input.value)));
  expect(values.reduce((sum, value) => sum + value, 0)).toBe(100);
  expect(values[0]).toBe(50);
  for (const value of values) {
    expect(value).toBeGreaterThanOrEqual(5);
    expect(value % 5).toBe(0);
  }
  const selected = await page.evaluate(() => collectTagInputs('graves').map(tag => tag.id));
  expect(selected.sort()).toEqual(ids.sort());
});

test('TC22-000004 pool eleven clamps to ten and subsequent valid input keeps the slider in sync', async ({ steps, page }) => {
  await openHollywood(steps);
  const input = page.locator('#globalElementPoolInput');
  const slider = page.locator('#globalElementPoolSlider');
  await input.fill('11');
  await input.press('Tab');
  await expect(input).toHaveValue('10');
  await expect(slider).toHaveValue('10');
  await input.fill('7');
  await input.press('Tab');
  await expect(input).toHaveValue('7');
  await expect(slider).toHaveValue('7');
});

test('TC22-000005 a persisted Setting ban is unavailable in Graves immediately after reload', async ({ steps, page }) => {
  await openHollywood(steps);
  await pick(page, 'setting', 'WILD_WEST', 'excluded');
  await expect(page.locator('#excluded-count')).toHaveText('1');
  await page.reload();
  await page.waitForFunction(() => window.__hollywoodReady);
  await steps.on('evaluateTab', 'Navigation').click();
  await expect(page.locator('#inputs-setting-graves option[value="WILD_WEST"]')).toBeDisabled();
  await expect(page.locator('#graves-exclusion-notice')).toBeVisible();
  await expect(page.locator('#gravesExclusionSummary')).toContainText('1');
});

test('TC22-000006 193 starting bans without locks leave the age panel empty', async ({ steps, page }) => {
  await openHollywood(steps);
  await page.locator('#applyStartingTagsButton').click();
  await expect(page.locator('#excluded-count')).toHaveText('193');
  await expect(page.locator('.age-role-row')).toHaveCount(0);
  await expect(page.locator('.age-role-empty-state')).toBeVisible();
});

for (const [mode, button] of [
  ['standard', '#generateScriptsButton'],
  ['artistic', '#generateBestArtisticScriptsButton'],
  ['commercial', '#generateBestCommercialScriptsButton'],
]) {
  for (const [pool, storyCount] of [[5, 5], [10, 10]]) {
    test(`TC22-000007 ${mode} partial-seed generation at pool ${pool} preserves constraints and ranking`, async ({ steps, page }) => {
      await openHollywood(steps);
      await page.locator('#applyStartingTagsButton').click();
      await expect(page.locator('#excluded-count')).toHaveText('193');
      await pick(page, 'protagonist', 'PROTAGONIST_COWBOY', 'generator');
      await page.locator('#globalElementPoolInput').fill(String(pool));
      await page.locator('#globalElementPoolInput').press('Tab');
      await page.locator(button).click();
      const cards = page.locator('#generatorResultsList .gen-card');
      await expect(cards).toHaveCount(mode === 'standard' ? 5 : 3);
      const scripts = await page.evaluate(() => generatedScriptsCache.map(script => ({
        ...script,
        banned: script.tags.filter(tag => getGeneratorExcludedIds().has(tag.id)),
        storyCount: HACGravesAnalysis.storyElementsOf(script.tags).length,
        bonuses: HACScriptEvaluation.calculateScriptEvaluation(script.tags).bonuses,
      })));
      expect(scripts).toHaveLength(mode === 'standard' ? 15 : 12);
      for (const script of scripts) {
        expect(script.tags.some(tag => tag.id === 'PROTAGONIST_COWBOY')).toBe(true);
        expect(script.banned).toEqual([]);
        expect(script.storyCount).toBe(storyCount);
        for (const category of ['Setting', 'Protagonist']) {
          expect(script.tags.filter(tag => tag.category === category)).toHaveLength(1);
        }
        for (const category of ['Antagonist', 'Finale']) {
          expect(script.tags.filter(tag => tag.category === category).length).toBeLessThanOrEqual(1);
        }
        expect(script.tags.filter(tag => tag.category === 'Genre').length).toBeGreaterThanOrEqual(1);
        for (const score of [script.scores.commercial, script.scores.artistic, script.stats.avgComp,
          script.stats.synergySum, script.bonuses.art, script.bonuses.com]) expect(Number.isFinite(score)).toBe(true);
      }
      const key = mode === 'artistic' ? 'art' : 'com';
      const ranked = scripts.map(script => mode === 'standard' ? Number(script.stats.movieScore) : script.bonuses[key]);
      expect(ranked).toEqual([...ranked].sort((a, b) => b - a));
      if (mode !== 'standard') {
        await expect(cards.first().locator('.gen-badge-group--primary .gen-badge-label'))
          .toHaveText(mode === 'artistic' ? 'Artistic Bonus' : 'Commercial Bonus');
        await page.locator('#showMoreGeneratedScriptsButton').click();
        await expect(cards).toHaveCount(6);
      }
      await expect(page.locator('.age-role-row .age-role-role-name')).toHaveText(['Cowboy']);
    });
  }
}

for (const category of ['Genre', 'Setting', 'Protagonist']) {
  test(`TC22-000008 Build for Target refuses scripts when every ${category} is banned`, async ({ steps, page }) => {
    await openHollywood(steps);
    await page.evaluate(category => {
      restoreSelection('excluded', Object.values(GAME_DATA.tags).filter(tag => tag.category === category)
        .map(tag => ({ id: tag.id, category, percent: 1 })));
      updateExcludedCount();
    }, category);
    await steps.on('marketTab', 'Navigation').click();
    await page.locator('#marketing-mode-targeted-button').click();
    await page.locator('#findCombinationsButton').click();
    await expect(page.locator('#targetedResultsList')).toContainText('No combinations found');
    await expect(page.locator('#targetedResultsList .combination-card')).toHaveCount(0);
  });
}

test('TC22-000009 five locked story elements still receive Genre and Setting in Build for Target', async ({ steps, page }) => {
  await openHollywood(steps);
  await steps.on('marketTab', 'Navigation').click();
  await page.locator('#marketing-mode-targeted-button').click();
  for (const [category, id] of [
    ['protagonist', 'PROTAGONIST_COWBOY'], ['antagonist', 'ANTAGONIST_BANDIT'],
    ['finale', 'FINALE_ANTAGONIST_GETS_KILLED'], ['supporting-character', 'SUPPORTINGCHARACTER_SIDEKICK'],
    ['theme-event', 'THEME_TREASURE_HUNT'],
  ]) await pick(page, category, id, 'targeted');
  await page.locator('#findCombinationsButton').click();
  const cards = page.locator('#targetedResultsList .combination-card');
  await expect(cards.first()).toBeVisible();
  for (const card of await cards.all()) {
    await expect(card.locator('.targeted-tag-chip')).toHaveCount(7);
    await expect(card.locator('.targeted-tag-chip.genre')).toHaveCount(1);
    await expect(card.locator('.targeted-tag-chip.setting')).toHaveCount(1);
    for (const name of ['Cowboy', 'Bandit', 'Antagonist Gets Killed', 'Sidekick', 'Treasure Hunt']) {
      await expect(card).toContainText(name);
    }
  }
});

for (const [category, id] of [['genre', 'COMEDY'], ['setting', 'WILD_WEST'], ['protagonist', 'PROTAGONIST_COWBOY']]) {
  test(`TC22-000010 Best Matches accepts a single ${category} seed without full-script validation`, async ({ steps, page }) => {
    await openHollywood(steps);
    await steps.on('evaluateTab', 'Navigation').click();
    await pick(page, category, id, 'graves');
    await page.locator('#gravesBestScoreFilter').selectOption('0');
    await page.locator('#generateBestMatchesButton').click();
    await expect(page.locator('#gravesBestMatchesList [data-role="graves-best-match"]').first()).toBeVisible();
    await expect(page.locator('#gravesBestMatchesList')).not.toContainText(/NaN|Infinity/);
    await expect(page.locator('#gravesFeedbackMessage')).not.toContainText('required');
  });
}
