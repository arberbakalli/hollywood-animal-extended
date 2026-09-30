import { test, expect, openHollywood } from '../fixtures/base.js';

const MODES = [
  ['standard', '#generateScriptsButton'],
  ['artistic', '#generateBestArtisticScriptsButton'],
  ['commercial', '#generateBestCommercialScriptsButton'],
];

async function lockTag(page, category, id) {
  const group = page.locator(`#inputs-${category}-generator`);
  let empty = group.locator('select').filter({ has: page.locator('option:checked[value=""]') });
  if (await empty.count() === 0) {
    await page.locator(`#add-${category}-generator-button`).click();
    empty = group.locator('select').filter({ has: page.locator('option:checked[value=""]') });
  }
  await empty.first().focus();
  await empty.first().selectOption(id);
}

async function expectBothTransfers(page, script) {
  const ordered = tags => [...tags].sort((a, b) => a.id.localeCompare(b.id));
  for (const context of ['graves', 'advertisers']) {
    await page.locator('#tab-generator-button').click();
    const card = page.locator('#generatorResultsList .gen-card').first();
    if (await card.locator('.gen-details').isHidden()) await card.locator('.gen-header').click();
    const role = context === 'graves' ? 'script-graves-button' : 'script-transfer-button';
    await card.locator(`[data-role="${role}"]`).click();
    await expect(page.locator(`#results-${context}`)).toBeVisible();
    const transferred = await page.evaluate(ctx => collectTagInputs(ctx), context);
    expect(ordered(transferred)).toEqual(ordered(script.tags));
    if (context === 'graves') {
      await expect.poll(async () => Number(await page.locator('#gravesTotalComScore').textContent()))
        .toBe(script.scores.commercial);
      await expect.poll(async () => Number(await page.locator('#gravesTotalArtScore').textContent()))
        .toBe(script.scores.artistic);
    } else {
      await expect.poll(async () => Number(await page.locator('#comScoreInput').inputValue()))
        .toBe(script.scores.commercial);
      await expect.poll(async () => Number(await page.locator('#artScoreInput').inputValue()))
        .toBe(script.scores.artistic);
    }
  }
}

for (const [mode, button] of MODES) {
  test(`TC24-000001 ${mode}: pool nine preserves partial locks, bans and movie scores through both transfers`, async ({ steps, page }) => {
    await openHollywood(steps);
    await page.locator('#applyStartingTagsButton').click();
    await expect(page.locator('#excluded-count')).toHaveText('193');
    for (const [category, id] of [
      ['genre', 'ACTION'], ['genre', 'COMEDY'], ['protagonist', 'PROTAGONIST_COWBOY'],
    ]) await lockTag(page, category, id);
    const actionShare = page.locator('#inputs-genre-generator .genre-row')
      .filter({ has: page.locator('option:checked[value="ACTION"]') }).locator('.percent-input');
    await actionShare.fill('80');
    await actionShare.dispatchEvent('change');
    await page.locator('#globalElementPoolInput').fill('9');
    await page.locator('#globalElementPoolInput').press('Tab');
    await expect(page.locator('#genScoreInput')).toHaveValue('9');
    await expect(page.locator('#genTagsRequiredDisplay')).toContainText('9 Story Elements');
    await page.locator(button).click();
    const cards = page.locator('#generatorResultsList .gen-card');
    await expect(cards).toHaveCount(mode === 'standard' ? 5 : 3);
    const scripts = await page.evaluate(() => generatedScriptsCache.map(script => ({
      tags: script.tags,
      scores: script.scores,
      storyCount: HACGravesAnalysis.storyElementsOf(script.tags).length,
      banned: script.tags.filter(tag => getGeneratorExcludedIds().has(tag.id)),
      evaluated: HACScriptEvaluation.calculateScriptEvaluation(script.tags).movieScores,
    })));
    expect(scripts).toHaveLength(mode === 'standard' ? 15 : 12);
    for (const script of scripts) {
      expect(script.storyCount).toBe(9);
      expect(script.evaluated.tagCap).toBe(9);
      expect(script.banned).toEqual([]);
      expect(script.tags.find(tag => tag.id === 'ACTION').percent).toBe(0.8);
      expect(script.tags.find(tag => tag.id === 'COMEDY').percent).toBe(0.2);
      expect(script.tags.filter(tag => tag.id === 'PROTAGONIST_COWBOY')).toHaveLength(1);
      for (const category of ['Setting', 'Protagonist', 'Antagonist', 'Finale']) {
        expect(script.tags.filter(tag => tag.category === category)).toHaveLength(1);
      }
      for (const field of ['commercial', 'artistic']) {
        expect(Number.isFinite(script.scores[field])).toBe(true);
        expect(script.scores[field]).toBeGreaterThanOrEqual(0);
        expect(script.scores[field]).toBeLessThanOrEqual(9);
        expect(script.scores[field]).toBe(script.evaluated[field]);
      }
    }
    await expect(page.locator('.age-role-row .age-role-role-name')).toHaveText(['Cowboy']);
    await expectBothTransfers(page, scripts[0]);
    await page.locator('#tab-evaluate-button').click();
    await expect(page.locator('#gravesScoreCapLabel')).toContainText('9 Scoring Elements');
    await expect(page.locator('#gravesScoreCapLabel strong')).toHaveText('9.0');
  });

  test(`TC24-000002 ${mode}: a known positive fully locked script keeps both 6.0 movie scores on transfer`, async ({ steps, page }) => {
    await openHollywood(steps);
    for (const [category, id] of [
      ['genre', 'DRAMA'], ['genre', 'COMEDY'], ['setting', 'MODERN_EUROPEAN_CITY'],
      ['protagonist', 'PROTAGONIST_WHITE_COLLAR'], ['antagonist', 'ANTAGONIST_CORRUPT_OFFICIAL'],
      ['finale', 'FINALE_COUPLE_GETS_MARRIED'],
      ['supporting-character', 'SUPPORTINGCHARACTER_LOVE_INTEREST'],
      ['supporting-character', 'SUPPORTINGCHARACTER_FEMME_FATALE'],
    ]) await lockTag(page, category, id);
    await page.locator(button).click();
    const cards = page.locator('#generatorResultsList .gen-card');
    await expect(cards).toHaveCount(mode === 'standard' ? 5 : 3);
    const scripts = await page.evaluate(() => generatedScriptsCache.map(script => ({
      tags: script.tags, scores: script.scores,
    })));
    expect(scripts).toHaveLength(mode === 'standard' ? 15 : 12);
    for (const script of scripts) expect(script.scores).toEqual({ commercial: 6, artistic: 6 });
    // Bonus ranking and final movie scores are separate quantities in optimized modes.
    const primary = cards.first().locator('.gen-badge-group').first();
    if (mode === 'artistic') {
      await expect(primary.locator('.gen-badge-label')).toHaveText('Artistic Bonus');
      await expect(primary.locator('.gen-badge-val')).toHaveText('0.65');
    } else if (mode === 'commercial') {
      await expect(primary.locator('.gen-badge-label')).toHaveText('Commercial Bonus');
      await expect(primary.locator('.gen-badge-val')).toHaveText('0.40');
    } else {
      const movieScore = cards.first().locator('.gen-badge-group')
        .filter({ has: page.getByText('Movie Score', { exact: true }) });
      await expect.poll(async () => Number(await movieScore.locator('.gen-badge-val').textContent())).toBe(6);
    }
    await expectBothTransfers(page, scripts[0]);
  });
}
