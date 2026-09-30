import { test, expect, openHollywood } from '../fixtures/base.js';

/**
 * Element freshness in Script Lab (docs/GAME_RULES.md section 9).
 *
 * Each story element is Fresh, Stale or Rotten; a pill on the element cycles
 * it with one click and every pill for that element follows. Genre, Setting
 * and excluded rows have no pill. Generate fills free slots freshest-first,
 * and a change says the suggestions are out of date instead of regenerating.
 */
const COWBOY = 'PROTAGONIST_COWBOY';

const locked = (page, slug) => page.locator(`#inputs-${slug}-generator .select-row`).first();
const lockedSelect = (page, slug) => locked(page, slug).locator('select.tag-selector');
const lockedPill = (page, slug) => locked(page, slug).locator(':scope > .freshness-pill');
const cards = page => page.locator('#generatorResultsList .gen-card');
const notice = page => page.locator('#generatorFreshnessNotice');

const openScriptLab = async (steps) => {
  await openHollywood(steps);
  await steps.on('buildTab', 'Navigation').click();
  await steps.on('lockedProtagonistSelect', 'ScriptLab').waitForState('visible');
};

const generate = async (steps, page) => {
  await steps.on('generateButton', 'ScriptLab').click();
  await expect(cards(page).first()).toBeVisible();
};

// The chips sit in each card's collapsible details.
const expandAll = async page => {
  const headers = page.locator('#generatorResultsList [data-role="script-card-header"]');
  for (let i = 0; i < await headers.count(); i++) await headers.nth(i).click();
};

const stateOf = (page, id) => page.evaluate(tagId => HACFreshness.freshnessStore().getState(tagId), id);

test.describe('Script Lab — element freshness', () => {
  test.beforeEach(async ({ steps }) => {
    await openScriptLab(steps);
  });

  test('TC28-000001 a locked story element shows a Fresh pill; Genre, Setting, empty and excluded rows do not', async ({ page }) => {
    await expect(lockedPill(page, 'protagonist')).toBeHidden();

    await lockedSelect(page, 'protagonist').selectOption(COWBOY);
    await lockedSelect(page, 'genre').selectOption('ACTION');
    await lockedSelect(page, 'setting').selectOption('WILD_WEST');

    await expect(lockedPill(page, 'protagonist')).toBeVisible();
    await expect(lockedPill(page, 'protagonist')).toHaveText('Fresh');
    await expect(page.locator('#inputs-genre-generator .freshness-pill')).toHaveCount(0);
    await expect(page.locator('#inputs-setting-generator .freshness-pill')).toHaveCount(0);
    await expect(page.locator('#selectors-container-excluded .freshness-pill')).toHaveCount(0);
  });

  test('TC28-000002 one click cycles Fresh, Stale, Rotten, Fresh and leaves the selection alone', async ({ page }) => {
    await lockedSelect(page, 'protagonist').selectOption(COWBOY);

    for (const label of ['Stale', 'Rotten', 'Fresh']) {
      await lockedPill(page, 'protagonist').click();
      await expect(lockedPill(page, 'protagonist')).toHaveText(label);
    }
    await expect(lockedSelect(page, 'protagonist')).toHaveValue(COWBOY);
  });

  test('TC28-000003 the pill follows the element, not the row', async ({ page }) => {
    await lockedSelect(page, 'protagonist').selectOption(COWBOY);
    await lockedPill(page, 'protagonist').click();
    await expect(lockedPill(page, 'protagonist')).toHaveText('Stale');

    await lockedSelect(page, 'protagonist').selectOption('PROTAGONIST_SHERIFF');
    await expect(lockedPill(page, 'protagonist')).toHaveText('Fresh');

    await lockedSelect(page, 'protagonist').selectOption(COWBOY);
    await expect(lockedPill(page, 'protagonist')).toHaveText('Stale');
  });

  test('TC28-000004 a recorded state survives a reload', async ({ steps, page }) => {
    await lockedSelect(page, 'protagonist').selectOption(COWBOY);
    await lockedPill(page, 'protagonist').click();
    await lockedPill(page, 'protagonist').click();

    await openScriptLab(steps);
    await lockedSelect(page, 'protagonist').selectOption(COWBOY);

    await expect(lockedPill(page, 'protagonist')).toHaveText('Rotten');
  });

  test('TC28-000005 a pill on a result changes that element everywhere and flags the results as out of date', async ({ steps, page }) => {
    await lockedSelect(page, 'genre').selectOption('ACTION');
    await lockedSelect(page, 'setting').selectOption('WILD_WEST');
    await lockedSelect(page, 'antagonist').selectOption('ANTAGONIST_BANDIT');
    await generate(steps, page);
    await expandAll(page);

    // Story elements carry pills; Genre and Setting chips do not.
    await expect(page.locator('#generatorResultsList .gen-tag-chip.genre .freshness-pill, #generatorResultsList .gen-tag-chip.setting .freshness-pill')).toHaveCount(0);
    await expect(notice(page)).toBeHidden();

    const pill = cards(page).first().locator('.gen-tag-chip:not(.tag-fixed) .freshness-pill').first();
    const id = await pill.getAttribute('data-tag-id');
    await pill.click();
    await pill.click();

    await expect(page.locator(`.freshness-pill[data-tag-id="${id}"]`).first()).toHaveText('Rotten');
    const labels = await page.locator(`.freshness-pill[data-tag-id="${id}"]`).allTextContents();
    expect(new Set(labels)).toEqual(new Set(['Rotten']));
    await expect(cards(page).first().locator('[data-role="script-freshness-status"]')).toHaveText('Rotten elements · viewer interest ×0');
    await expect(notice(page)).toBeVisible();
    await expect(notice(page)).toHaveText('Freshness changed. Generate again to update the suggestions.');
    // The click belonged to the pill: the card stayed open.
    await expect(cards(page).first().locator('.gen-details')).toBeVisible();
  });

  test('TC28-000006 generating again avoids an element marked Rotten', async ({ steps, page }) => {
    await lockedSelect(page, 'antagonist').selectOption('ANTAGONIST_BANDIT');
    await generate(steps, page);
    await expandAll(page);
    const unlocked = cards(page).first().locator('.gen-tag-chip:not(.tag-fixed) .freshness-pill').first();
    const id = await unlocked.getAttribute('data-tag-id');
    await unlocked.click();
    await unlocked.click();
    expect(await stateOf(page, id)).toBe('rotten');

    await generate(steps, page);

    await expect(notice(page)).toBeHidden();
    await expect(page.locator(`#generatorResultsList .freshness-pill[data-tag-id="${id}"]`)).toHaveCount(0);
  });

  test('TC28-000007 a locked Rotten element stays in every result, and each card says so', async ({ steps, page }) => {
    await lockedSelect(page, 'protagonist').selectOption(COWBOY);
    await lockedPill(page, 'protagonist').click();
    await lockedPill(page, 'protagonist').click();

    await generate(steps, page);

    const total = await cards(page).count();
    await expect(page.locator(`#generatorResultsList .freshness-pill[data-tag-id="${COWBOY}"]`)).toHaveCount(total);
    await expect(page.locator('#generatorResultsList [data-role="script-freshness-status"]'))
      .toHaveText(Array(total).fill('Rotten elements · viewer interest ×0'));
  });

  test('TC28-000008 excluding an element resets it, so it comes back Fresh', async ({ page }) => {
    await lockedSelect(page, 'protagonist').selectOption(COWBOY);
    await lockedPill(page, 'protagonist').click();
    expect(await stateOf(page, COWBOY)).toBe('stale');

    const excluded = page.locator('#inputs-protagonist-excluded select.tag-selector').first();
    await excluded.selectOption(COWBOY);
    await expect.poll(() => stateOf(page, COWBOY)).toBe('fresh');

    await excluded.selectOption('');
    await lockedSelect(page, 'protagonist').selectOption(COWBOY);
    await expect(lockedPill(page, 'protagonist')).toHaveText('Fresh');
  });

  test('TC28-000009 an all-Fresh result ranks above a higher-scoring Stale one', async ({ page }) => {
    const order = await page.evaluate(() => {
      const [stale, fresh] = Object.values(GAME_DATA.tags).filter(tag => tag.category === 'Protagonist');
      HACFreshness.freshnessStore().setState(stale.id, 'stale');
      const scripts = [
        { name: 'stale-high', tags: [{ id: stale.id, category: 'Protagonist' }], score: 9 },
        { name: 'fresh-low', tags: [{ id: fresh.id, category: 'Protagonist' }], score: 4 }
      ];
      return HACFreshness.rankByFreshness(scripts, (a, b) => b.score - a.score).map(script => script.name);
    });

    expect(order).toEqual(['fresh-low', 'stale-high']);
  });

  // The generator is replaced by canned candidates so the order is not left to
  // chance: the first `staleCalls` are a high-scoring script with a Stale
  // Protagonist, every call after that a lower-scoring all-Fresh one. The Stale
  // Protagonist is the one with the highest artistic value and the Fresh one
  // the lowest, so the Stale script also wins on artistic bonus.
  const cannedCandidates = (page, staleCalls) => page.evaluate(count => {
    const finale = Object.values(GAME_DATA.tags).find(tag => tag.category === 'Finale').id;
    const byArt = Object.values(GAME_DATA.tags)
      .filter(tag => tag.category === 'Protagonist')
      .sort((a, b) => (Number(b.art) || 0) - (Number(a.art) || 0));
    const stale = byArt[0].id;
    const fresh = byArt[byArt.length - 1].id;
    const script = (protagonist, avgComp, movieScore) => ({
      tags: [
        { id: 'ACTION', category: 'Genre', percent: 1 },
        { id: 'WILD_WEST', category: 'Setting', percent: 1 },
        { id: protagonist, category: 'Protagonist', percent: 1 },
        { id: 'ANTAGONIST_BANDIT', category: 'Antagonist', percent: 1 },
        { id: finale, category: 'Finale', percent: 1 }
      ],
      stats: { avgComp, synergySum: avgComp * 3, maxScriptQuality: 9, movieScore: movieScore.toFixed(1) },
      scores: { commercial: movieScore, artistic: movieScore },
      uniqueId: `${protagonist}-${Math.random()}`
    });
    HACFreshness.freshnessStore().setState(stale, 'stale');
    let calls = 0;
    HACScriptGenerationEngine.runGenerationAlgorithm = () => (++calls <= count
      ? script(stale, 4.9, 9.5)
      : script(fresh, 3.2, 6.0));
    const bonus = id => HACScriptEvaluation.calculateScriptEvaluation(script(id, 0, 0).tags).bonuses.art;
    return { stale, fresh, staleWinsOnBonus: bonus(stale) > bonus(fresh) };
  }, staleCalls);

  const cardProtagonists = page => page.locator('#generatorResultsList .gen-card').evaluateAll(nodes =>
    nodes.map(card => [...card.querySelectorAll('.freshness-pill')]
      .map(pill => pill.dataset.tagId)
      .find(id => GAME_DATA.tags[id].category === 'Protagonist')));

  test('TC28-000014 Generate keeps looking past a Stale hit and ranks Fresh results first', async ({ steps, page }) => {
    // Slot one sees only the Stale script; the others find the Fresh one.
    const { stale, fresh } = await cannedCandidates(page, 50);

    await generate(steps, page);

    expect(await cardProtagonists(page)).toEqual([fresh, fresh, fresh, fresh, stale]);
    await expect(cards(page).last().locator('[data-role="script-freshness-status"]')).toHaveText('Stale elements · viewer interest ×0.5');
    await expect(cards(page).first().locator('[data-role="script-freshness-status"]')).toBeHidden();
  });

  test('TC28-000015 Highest Artistic Appeal ranks Fresh results above a higher-bonus Stale one', async ({ steps, page }) => {
    const { stale, fresh, staleWinsOnBonus } = await cannedCandidates(page, 35);
    // Guards the test itself: ranking by bonus alone would put Stale first.
    expect(staleWinsOnBonus).toBe(true);

    await steps.on('bestArtisticButton', 'ScriptLab').click();
    await expect(cards(page).first()).toBeVisible();

    // Only the first few are shown until "Show more", so read the full ranking.
    const ranked = await page.evaluate(() => generatedScriptsCache
      .map(script => script.tags.find(tag => tag.category === 'Protagonist').id));
    expect(ranked.length).toBeGreaterThan(1);
    expect(ranked.slice(0, -1).every(id => id === fresh)).toBe(true);
    expect(ranked[ranked.length - 1]).toBe(stale);
    expect((await cardProtagonists(page))[0]).toBe(fresh);
  });
});

/**
 * Layout of the pill (owner, 2026-09-29: "before the arrow"). The pill sits
 * inside the dropdown box at its right end; the element name never runs under
 * it, and it never covers the row's remove button.
 */
test.describe('Script Lab — freshness pill layout', () => {
  const box = locator => locator.evaluate(node => {
    const rect = node.getBoundingClientRect();
    return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height };
  });

  const expectInsideRightEnd = async (page, slug) => {
    const select = await box(lockedSelect(page, slug));
    const pill = await box(lockedPill(page, slug));
    const paddingRight = await lockedSelect(page, slug).evaluate(node => parseFloat(getComputedStyle(node).paddingRight));

    expect(pill.left).toBeGreaterThan(select.left);
    expect(pill.right).toBeLessThanOrEqual(select.right - 4);
    expect(select.right - pill.right).toBeLessThanOrEqual(16);
    expect(pill.top).toBeGreaterThanOrEqual(select.top);
    expect(pill.bottom).toBeLessThanOrEqual(select.bottom);
    expect(Math.abs((pill.top + pill.bottom) / 2 - (select.top + select.bottom) / 2)).toBeLessThanOrEqual(1);
    // The select keeps room for the pill, so its text stops before it.
    expect(paddingRight).toBeGreaterThanOrEqual(select.right - pill.left);
  };

  const expectLayout = async (steps, page, size) => {
    await page.setViewportSize(size);
    await openScriptLab(steps);
    await lockedSelect(page, 'protagonist').selectOption(COWBOY);
    await lockedSelect(page, 'supporting-character').selectOption('SUPPORTINGCHARACTER_DAMSEL_IN_DISTRESS');

    await expectInsideRightEnd(page, 'protagonist');
    await expectInsideRightEnd(page, 'supporting-character');

    // A multi-select row keeps its remove button clear of the pill.
    const pill = await box(lockedPill(page, 'supporting-character'));
    const remove = await box(locked(page, 'supporting-character').locator('.remove-btn'));
    expect(pill.right).toBeLessThan(remove.left);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);
  };

  test('TC28-000010 on desktop, the pill sits inside the box at its right end', async ({ steps, page }) => {
    await expectLayout(steps, page, { width: 1280, height: 900 });
  });

  test('TC28-000011 on a phone, the pill sits inside the box at its right end', async ({ steps, page }) => {
    await expectLayout(steps, page, { width: 375, height: 812 });
  });

  test('TC28-000012 a click on the box away from the pill does not change the state', async ({ steps, page }) => {
    await openScriptLab(steps);
    await lockedSelect(page, 'protagonist').selectOption(COWBOY);

    await lockedSelect(page, 'protagonist').click({ position: { x: 12, y: 10 } });
    await page.keyboard.press('Escape');

    expect(await stateOf(page, COWBOY)).toBe('fresh');
    await expect(lockedPill(page, 'protagonist')).toHaveText('Fresh');
  });

  test('TC28-000013 result chips keep the pill on one line with the element', async ({ steps, page }) => {
    await openScriptLab(steps);
    await generate(steps, page);
    await expandAll(page);

    const misplaced = await page.locator('#generatorResultsList .gen-tag-chip').evaluateAll(chips => chips
      .map(chip => ({ chip: chip.getBoundingClientRect(), pill: chip.querySelector('.freshness-pill')?.getBoundingClientRect() }))
      .filter(({ chip, pill }) => pill && (pill.top < chip.top || pill.bottom > chip.bottom || pill.right > chip.right + 0.5))
      .length);
    expect(misplaced).toBe(0);
  });
});
