import { test, expect, openHollywood } from '../fixtures/base.js';
import { DropdownSelectType } from '@civitas-cerebrum/element-interactions';

// The owner's script from the 2026-09-30 report, with Max Element Pool 8.
// Rulings: docs/GAME_RULES.md sections 1 and 2. Unit coverage of the same
// rules: tests/bug-hunt-2026-09-30.test.js.
const OWNER_SCRIPT = [
  ['genre', 'ADVENTURE'],
  ['setting', 'FANTASY_KINGDOM'],
  ['protagonist', 'PROTAGONIST_CYNIC'],
  ['antagonist', 'ANTAGONIST_EVIL_MONSTER'],
  ['finale', 'FINALE_PROTAGONIST_FINDS_TREASURE'],
];
const OWNER_THEMES = ['THEME_TREASURE_HUNT', 'THEME_LONG_JOURNEY', 'THEME_EVIL_TRANSFORMATION'];

const themeRows = (page) => page.locator('#inputs-theme-event-graves select.tag-selector');

async function buildOwnerScript(steps, page) {
  await steps.setSliderValue('elementPoolSlider', 'Navigation', 8);
  await steps.on('evaluateTab', 'Navigation').click();
  for (const [slug, id] of OWNER_SCRIPT) {
    await page.locator(`#inputs-${slug}-graves select.tag-selector`).first().selectOption(id);
  }
  for (let i = 1; i < OWNER_THEMES.length; i++) {
    await steps.on('themeEventAddButton', 'ColmanGraves').click();
  }
  await expect(themeRows(page)).toHaveCount(OWNER_THEMES.length);
  for (let i = 0; i < OWNER_THEMES.length; i++) {
    await themeRows(page).nth(i).selectOption(OWNER_THEMES[i]);
  }
}

async function openSwapSuggestions(steps) {
  await steps.on('generateBestMatchesButton', 'ColmanGraves').click();
  await steps.on('swapSuggestionsTab', 'ColmanGraves').click();
}

const swapList = (page) => page.locator('#gravesBestMatchesList');

test.describe('Bug hunt 2026-09-30', () => {
  test.beforeEach(async ({ steps }) => {
    await openHollywood(steps);
  });

  // Given a script whose only Unsuccessful pair is Long Journey x Evil Monster
  // When the user opens Swap Suggestions
  // Then Long Journey has a slot that names the clash and offers a replacement
  test('TC03-000041 an element in an Unsuccessful pair gets a Swap slot that clears it', async ({ steps, page }) => {
    await buildOwnerScript(steps, page);
    await openSwapSuggestions(steps);

    const slot = swapList(page).locator('.best-match-slot-group', { hasText: 'Long Journey (Theme & Event)' });
    await expect(slot).toHaveCount(1);
    await expect(slot.locator('.best-match-slot-note')).toContainText('clashes with Evil Monster (1.0)');
    await expect(slot.locator('.best-match-slot-note')).toContainText('clears the clash');
    await expect(slot.locator('[data-role="graves-best-match"]').first()).toBeVisible();
    await expect(swapList(page).locator('.best-match-band-unsuccessful')).toHaveCount(0);
  });

  // Given the user removed Long Journey because it clashed
  // When they generate Best Matches again and open Swap Suggestions
  // Then Long Journey is not offered back as a replacement
  test('TC03-000042 Swap Suggestions never brings back a clashing element', async ({ steps, page }) => {
    await buildOwnerScript(steps, page);
    await themeRows(page).nth(1).selectOption('');
    await openSwapSuggestions(steps);

    await expect(swapList(page).locator('[data-role="graves-best-match"]').first()).toBeVisible();
    await expect(swapList(page).locator('[data-role="graves-best-match"][data-tag-id="THEME_LONG_JOURNEY"]')).toHaveCount(0);
    await expect(swapList(page).locator('.best-match-band-unsuccessful')).toHaveCount(0);
  });

  // The owner removed Long Journey with the row's remove button, not by
  // emptying the dropdown. Both removal paths must give the same result.
  // Given Best Matches has run for the owner's script
  // When the user removes Long Journey with its remove button and generates again
  // Then no Best Matches tab offers or mentions Long Journey
  test('TC03-000044 removing a clashing element with its remove button leaves no trace in Best Matches', async ({ steps, page }) => {
    await buildOwnerScript(steps, page);
    await openSwapSuggestions(steps);
    await expect(swapList(page)).toContainText('Long Journey');

    const ljRow = page.locator('#inputs-theme-event-graves [data-role="tag-selector-row"]')
      .filter({ has: page.locator('option:checked[value="THEME_LONG_JOURNEY"]') });
    await ljRow.locator('button.remove-btn').click();
    await expect(themeRows(page)).toHaveCount(2);

    for (const regenerate of [false, true]) {
      if (regenerate) await steps.on('generateBestMatchesButton', 'ColmanGraves').click();
      for (const tab of ['swapSuggestionsTab', 'bestAdditionsTab', 'pairwiseTab']) {
        await steps.on(tab, 'ColmanGraves').click();
        await expect(swapList(page).locator('[data-role="graves-best-match"]').first()).toBeVisible();
        await expect(swapList(page), `${tab}, regenerated: ${regenerate}`).not.toContainText('Long Journey');
      }
    }
  });

  // Given 6 story elements and a pool of 8
  // When Best Additions lists fewer than 2 story elements at the chosen fit
  // Then a note names the free slots and says to lower Minimum Fit
  test('TC03-000043 Best Additions says when fewer story elements clear the fit than slots are free', async ({ steps, page }) => {
    await buildOwnerScript(steps, page);
    await steps.on('generateBestMatchesButton', 'ColmanGraves').click();

    const note = page.locator('[data-role="graves-additions-shortfall"]');
    await expect(note).toContainText('room for 2 more story elements');
    await expect(note).toContainText('Lower Minimum Fit');
  });

  // Build for Target audit 2026-09-30. Owner rulings: never suggest a
  // combination holding a pair below 2.0, and hide the cards once an input
  // changes, the same as Evaluate.
  const openBuildForTarget = async (steps, page) => {
    await steps.on('marketTab', 'Navigation').click();
    await page.locator('#marketing-mode-targeted-button').click();
  };
  const targetedCards = (page) => page.locator('#targetedResultsList .targeted-combination-card');
  const targetedStale = (page) => page.locator('#targeted-stale-notice');

  test('TC05-000021 Build for Target never suggests a combination with an Unsuccessful pair', async ({ steps, page }) => {
    await openBuildForTarget(steps, page);
    for (const pool of [5, 10]) {
      await steps.setSliderValue('elementPoolSlider', 'Navigation', pool);
      await page.locator('#findCombinationsButton').click();
      await expect(targetedCards(page).first()).toBeVisible();
      const worstPairs = await targetedCards(page).evaluateAll(cards => cards.map(card => {
        const tags = [...card.querySelectorAll('.targeted-tag-chip')].map(chip => GAME_DATA.tags[chip.dataset.tagId]);
        let worst = 6;
        for (let a = 0; a < tags.length; a++) for (let b = a + 1; b < tags.length; b++) {
          worst = Math.min(worst, getRawCompatibilityScore(tags[a], tags[b]));
        }
        return worst;
      }));
      expect(worstPairs.length, `pool ${pool}`).toBe(20);
      expect(worstPairs.filter(score => score < 2), `pool ${pool}`).toEqual([]);
    }
  });

  test('TC05-000022 a clash between two locked elements is named, and the results stay', async ({ steps, page }) => {
    await openBuildForTarget(steps, page);
    await steps.setSliderValue('elementPoolSlider', 'Navigation', 7);
    await page.locator('#inputs-antagonist-targeted select.tag-selector').first().selectOption('ANTAGONIST_EVIL_MONSTER');
    await page.locator('#inputs-theme-event-targeted select.tag-selector').first().selectOption('THEME_LONG_JOURNEY');
    await page.locator('#findCombinationsButton').click();

    await expect(targetedCards(page).first()).toBeVisible();
    await expect(page.locator('[data-role="targeted-search-note"]'))
      .toHaveText('Your locked Evil Monster and Long Journey clash (1.0). Suggestions add no clash of their own.');
  });

  for (const [change, act] of [
    ['the pool', page => page.locator('#globalElementPoolInput').fill('8').then(() => page.locator('#globalElementPoolInput').press('Tab'))],
    ['a lock', page => page.locator('#inputs-genre-targeted select.tag-selector').first().selectOption('HORROR')],
    ['an audience', page => page.locator('.targeted-audience-checkbox').first().check()],
    ['an advertiser', page => page.locator('.targeted-advertiser-checkbox').first().check()],
  ]) {
    test(`TC05-000023 changing ${change} after Find hides the old cards until Find runs again`, async ({ steps, page }) => {
      await openBuildForTarget(steps, page);
      await page.locator('#findCombinationsButton').click();
      await expect(targetedCards(page).first()).toBeVisible();
      await expect(targetedStale(page)).toBeHidden();

      await act(page);
      await expect(page.locator('#targeted-results-panel')).toBeHidden();
      await expect(targetedStale(page)).toHaveText('Inputs changed. Press Find Top Combinations to update.');

      await page.locator('#findCombinationsButton').click();
      await expect(targetedStale(page)).toBeHidden();
      await expect(targetedCards(page).first()).toBeVisible();
    });
  }

  // Audit 2026-10-01: the Audience Compatibility table read the bans from
  // the saved copy in storage, every other context from the live list. With
  // storage unavailable (private browsing) or before the save runs, a banned
  // element was still listed.
  test('TC05-000025 the Audience Compatibility table hides a ban even when storage is unavailable', async ({ steps, page }) => {
    await page.addInitScript(() => {
      Storage.prototype.setItem = function (key, value) {
        if (String(key).includes('exclu')) throw new Error('storage unavailable');
        return undefined;
      };
    });
    await openHollywood(steps);
    await page.locator('#tab-generator-button').click();
    const content = page.locator('#excluded-content');
    if (await content.evaluate(el => el.classList.contains('hidden'))) await page.locator('#toggleExcludedElementsButton').click();
    await page.locator('#add-theme-event-excluded-button').click();
    await page.locator('#inputs-theme-event-excluded select.tag-selector').first().selectOption('THEME_TREASURE_HUNT');

    await openBuildForTarget(steps, page);
    await page.locator('#showAudienceCompatibilityButton').click();
    const names = await page.locator('#compatibilityTableContainer td.element-name').allTextContents();
    expect(names.length).toBeGreaterThan(0);
    expect(names.map(name => name.trim())).not.toContain('Treasure Hunt');
  });

  test('TC05-000024 banning a suggested element after Find hides the old cards', async ({ steps, page }) => {
    await openBuildForTarget(steps, page);
    await page.locator('#findCombinationsButton').click();
    await expect(targetedCards(page).first()).toBeVisible();
    const chip = targetedCards(page).first().locator('.targeted-tag-chip.theme-event, .targeted-tag-chip.supporting-character').first();
    const id = await chip.getAttribute('data-tag-id');
    const slug = (await chip.getAttribute('class')).includes('theme-event') ? 'theme-event' : 'supporting-character';

    await page.locator('#tab-generator-button').click();
    const content = page.locator('#excluded-content');
    if (await content.evaluate(el => el.classList.contains('hidden'))) await page.locator('#toggleExcludedElementsButton').click();
    await page.locator(`#add-${slug}-excluded-button`).click();
    await page.locator(`#inputs-${slug}-excluded select.tag-selector`).first().selectOption(id);

    await openBuildForTarget(steps, page);
    await expect(page.locator('#targeted-results-panel')).toBeHidden();
    await expect(targetedStale(page)).toHaveText('Inputs changed. Press Find Top Combinations to update.');
  });

  // Owner ruling 2026-09-30: a script holds at most 11 genres (10 at the 5%
  // floor plus one taking the rest), so the Genre + button stops at 11 rows.
  // There are exactly 11 genres, so no context ever needs a twelfth row.
  // Given any context with a Genre + button
  // When the user clicks it well past eleven rows
  // Then it stops at 11 rows, and works again once a row is removed
  for (const [context, tab] of [['generator', 'buildTab'], ['graves', 'evaluateTab'], ['excluded', 'buildTab']]) {
    test(`TC06-000009 ${context}: the Genre + button stops at 11 rows`, async ({ steps, page }) => {
      await steps.on(tab, 'Navigation').click();
      if (context === 'excluded') {
        const toggle = page.locator('#toggleExcludedElementsButton');
        if (await page.locator('#excluded-content').evaluate(el => el.classList.contains('hidden'))) await toggle.click();
      }
      const add = page.locator(`#add-genre-${context}-button`);
      const rows = page.locator(`#inputs-genre-${context} [data-role="tag-selector-row"]`);

      for (let i = 0; i < 14; i++) {
        if (await add.isDisabled()) break;
        await add.click();
      }
      await expect(rows).toHaveCount(11);
      await expect(add).toBeDisabled();

      await rows.first().locator('button.remove-btn').click();
      await expect(rows).toHaveCount(10);
      await expect(add).toBeEnabled();
    });
  }

  // Audit 2026-09-30: Best Matches rows must not outlive the script or the
  // ban list they were drawn from; a stale Swap button used to do nothing,
  // without a message. The panel redraws itself rather than hiding, because
  // its mode tabs live in it and TC03-000038 pins that they stay usable.
  const banInScriptLab = async (page, slug, id) => {
    await page.locator('#tab-generator-button').click();
    const content = page.locator('#excluded-content');
    if (await content.evaluate(el => el.classList.contains('hidden'))) await page.locator('#toggleExcludedElementsButton').click();
    await page.locator(`#add-${slug}-excluded-button`).click();
    await page.locator(`#inputs-${slug}-excluded select.tag-selector`).first().selectOption(id);
  };

  test('TC03-000052 changing the script after Generate Best Matches redraws the rows for the new script', async ({ steps, page }) => {
    await buildOwnerScript(steps, page);
    await openSwapSuggestions(steps);
    const slotNames = () => swapList(page).locator('.best-match-slot-note strong').allTextContents();
    await expect.poll(slotNames).toContain('Long Journey');

    await themeRows(page).nth(1).selectOption('EVENTS_ANCIENT_PUZZLE');
    await expect.poll(slotNames).not.toContain('Long Journey');
    await expect(page.locator('#graves-best-matches-panel')).toBeVisible();
    await expect(staleNotice(page)).toBeHidden();
  });

  test('TC03-000053 a Swap from Best Matches redraws the rows instead of hiding them', async ({ steps, page }) => {
    await buildOwnerScript(steps, page);
    await openSwapSuggestions(steps);
    await swapList(page).locator('[data-action="swap-graves-best-match"]').first().click();
    await expect(page.locator('#graves-best-matches-panel')).toBeVisible();
    await expect(staleNotice(page)).toBeHidden();
  });

  test('TC03-000054 banning an element of the evaluated script hides the old results', async ({ steps, page }) => {
    await buildOwnerScript(steps, page);
    await evaluateAndSeeClash(steps, page);
    await banInScriptLab(page, 'theme-event', 'THEME_LONG_JOURNEY');
    await steps.on('evaluateTab', 'Navigation').click();
    await expectStale(page);
  });

  test('TC03-000055 banning a suggested element removes it from the Best Matches rows', async ({ steps, page }) => {
    await buildOwnerScript(steps, page);
    await openSwapSuggestions(steps);
    const suggested = await swapList(page).locator('[data-role="graves-best-match"]').first().getAttribute('data-tag-id');
    const category = await swapList(page).locator('[data-role="graves-best-match"]').first().getAttribute('data-category');
    const slug = category.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-');
    await banInScriptLab(page, slug, suggested);
    await steps.on('evaluateTab', 'Navigation').click();
    await expect(page.locator('#graves-best-matches-panel')).toBeVisible();
    await expect(swapList(page).locator(`[data-role="graves-best-match"][data-tag-id="${suggested}"]`)).toHaveCount(0);
  });

  // Owner ruling 2026-10-01: Highest Appeal respects Target Average
  // Compatibility. Per slot, a candidate at or above the target beats a
  // higher-bonus one below it; a slot that never reaches the target says how
  // far below it is. Candidates are canned, as in script-lab-freshness.spec.js.
  const cannedAppeal = (page, plan) => page.evaluate((plan) => {
    const byArt = Object.values(GAME_DATA.tags).filter(tag => tag.category === 'Protagonist')
      .sort((a, b) => (Number(b.art) || 0) - (Number(a.art) || 0));
    const highBonus = byArt[0].id;
    const lowBonus = byArt[byArt.length - 1].id;
    const script = (protagonist, avgComp) => ({
      tags: [
        { id: 'ACTION', category: 'Genre', percent: 1 },
        { id: 'WILD_WEST', category: 'Setting', percent: 1 },
        { id: protagonist, category: 'Protagonist', percent: 1 },
        { id: 'ANTAGONIST_BANDIT', category: 'Antagonist', percent: 1 },
        { id: 'FINALE_PROTAGONIST_FINDS_TREASURE', category: 'Finale', percent: 1 },
      ],
      stats: { avgComp, synergySum: avgComp * 3, maxScriptQuality: 6, movieScore: '6.0' },
      scores: { commercial: 6, artistic: 6 },
      uniqueId: `${protagonist}-${Math.random()}`,
    });
    let calls = 0;
    HACScriptGenerationEngine.runGenerationAlgorithm = () => (plan === 'mixed' && (++calls % 2 === 0)
      ? script(lowBonus, 4.5)
      : script(highBonus, 3.2));
    return { highBonus, lowBonus };
  }, plan);

  test('TC01-000052 Highest Artistic picks a script that meets the compatibility target over a higher bonus', async ({ steps, page }) => {
    await steps.on('buildTab', 'Navigation').click();
    await expect(page.locator('#genCompInput')).toHaveValue('4');
    const { highBonus, lowBonus } = await cannedAppeal(page, 'mixed');
    await page.locator('#generateBestArtisticScriptsButton').click();
    await expect(page.locator('#generatorResultsList .gen-card').first()).toBeVisible();

    const picked = await page.evaluate(() => generatedScriptsCache
      .map(script => ({ protagonist: script.tags.find(tag => tag.category === 'Protagonist').id, fit: script.stats.avgComp })));
    expect(picked).toEqual([
      { protagonist: lowBonus, fit: 4.5 },
      { protagonist: highBonus, fit: 3.2 },
    ]);
    await expect(page.locator('[data-role="script-below-target"]')).toHaveCount(1);
  });

  test('TC01-000053 a Highest Appeal card that never reached the target says how far below it is', async ({ steps, page }) => {
    await steps.on('buildTab', 'Navigation').click();
    await cannedAppeal(page, 'below');
    await page.locator('#generateBestArtisticScriptsButton').click();
    const first = page.locator('#generatorResultsList .gen-card').first();
    await expect(first).toBeVisible();
    await expect(first.locator('[data-role="script-below-target"]'))
      .toHaveText('Avg Fit 3.2 is below your 4.0 target.');
  });

  // Audit 2026-09-30: TC01-000020 asserts Reset Locks hides the results but
  // never generates first, so it passes with nothing to hide. This one
  // generates, then resets.
  test('TC01-000051 Reset Locks hides results that were on screen', async ({ page }) => {
    await page.locator('#generateScriptsButton').click();
    await expect(page.locator('#generatorResultsList .gen-card')).toHaveCount(5, { timeout: 20000 });
    await page.locator('#resetGeneratorLocksButton').click();
    await expect(page.locator('#results-generator')).toBeHidden();
  });

  // Owner ruling 2026-10-01: Script Lab shows every result, and a card whose
  // script holds an Unsuccessful pair (< 2.0) says so, so the player sees
  // the score-versus-coherence trade-off.
  test('TC01-000049 a Script Lab card names the clash its script holds', async ({ page }) => {
    // Cards are drawn after Generate or a library load, which load the
    // compatibility data first; drawing one directly has to do the same.
    await page.evaluate(() => ensureCompatibilityLoaded());
    await page.evaluate(() => {
      const clashing = ['ADVENTURE', 'FANTASY_KINGDOM', 'PROTAGONIST_DARING_ADVENTURER', 'ANTAGONIST_EVIL_MONSTER',
        'THEME_LONG_JOURNEY', 'FINALE_PROTAGONIST_FINDS_TREASURE']
        .map(id => ({ id, category: GAME_DATA.tags[id].category, percent: 1 }));
      const clean = ['ADVENTURE', 'FANTASY_KINGDOM', 'PROTAGONIST_DARING_ADVENTURER', 'ANTAGONIST_EVIL_MONSTER',
        'THEME_TREASURE_HUNT', 'FINALE_PROTAGONIST_FINDS_TREASURE']
        .map(id => ({ id, category: GAME_DATA.tags[id].category, percent: 1 }));
      const scripts = [HACScriptGenerator.buildScriptFromTags(clashing, 'Clashing'), HACScriptGenerator.buildScriptFromTags(clean, 'Clean')];
      generatedScriptsCache = scripts;
      HACScriptGenerator.renderGeneratedScripts(scripts);
    });
    const cards = page.locator('#generatorResultsList .gen-card');
    await expect(cards).toHaveCount(2);
    await expect(cards.nth(0).locator('[data-role="script-clash-warning"]'))
      .toHaveText('Clash: Evil Monster × Long Journey (1.0)');
    await expect(cards.nth(1).locator('[data-role="script-clash-warning"]')).toHaveCount(0);
  });

  test('TC01-000050 every Highest Artistic card warns exactly when its script holds a clash', async ({ steps, page }) => {
    await steps.setSliderValue('elementPoolSlider', 'Navigation', 10);
    await page.locator('#generateBestArtisticScriptsButton').click();
    await expect(page.locator('#generatorResultsList .gen-card').first()).toBeVisible({ timeout: 30000 });
    const mismatches = await page.evaluate(() => [...document.querySelectorAll('#generatorResultsList .gen-card')].map(card => {
      const script = generatedScriptsCache.find(s => String(s.uniqueId) === card.dataset.scriptId);
      const tags = script.tags.map(t => GAME_DATA.tags[t.id]);
      let clash = false;
      for (let a = 0; a < tags.length; a++) for (let b = a + 1; b < tags.length; b++) {
        if (getRawCompatibilityScore(tags[a], tags[b]) < 2) clash = true;
      }
      const warned = !!card.querySelector('[data-role="script-clash-warning"]');
      return clash === warned ? null : `${card.dataset.scriptId}: clash ${clash}, warned ${warned}`;
    }).filter(Boolean));
    expect(mismatches).toEqual([]);
  });

  // Audit 2026-09-30: GAME_RULES.md section 5 says no context ever holds a
  // banned element, but generated cards kept one after a ban, and a transfer
  // then dropped it from the script without a clear reason.
  const banFromScriptLab = async (page, tag) => {
    const slug = tag.category.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-');
    const content = page.locator('#excluded-content');
    if (await content.evaluate(el => el.classList.contains('hidden'))) await page.locator('#toggleExcludedElementsButton').click();
    await page.locator(`#add-${slug}-excluded-button`).click();
    await page.locator(`#inputs-${slug}-excluded select.tag-selector`).first().selectOption(tag.id);
  };

  test('TC01-000047 banning an element of a generated script hides the results and asks to generate again', async ({ page }) => {
    await page.locator('#generateScriptsButton').click();
    await expect(page.locator('#generatorResultsList .gen-card')).toHaveCount(5, { timeout: 20000 });
    const tag = await page.evaluate(() => generatedScriptsCache[0].tags
      .find(t => t.category === 'Theme & Event' || t.category === 'Supporting Character'));

    await banFromScriptLab(page, tag);
    await expect(page.locator('#results-generator')).toBeHidden();
    await expect(page.locator('#generator-stale-notice'))
      .toHaveText('Exclusions changed: a generated script used an element you banned. Generate again to update.');

    await page.locator('#generateScriptsButton').click();
    await expect(page.locator('#generator-stale-notice')).toBeHidden();
    await expect(page.locator('#generatorResultsList .gen-card')).toHaveCount(5, { timeout: 20000 });
  });

  test('TC01-000048 banning an element no generated script uses keeps the results', async ({ page }) => {
    await page.locator('#generateScriptsButton').click();
    await expect(page.locator('#generatorResultsList .gen-card')).toHaveCount(5, { timeout: 20000 });
    const unused = await page.evaluate(() => {
      const used = new Set(generatedScriptsCache.flatMap(s => s.tags.map(t => t.id)));
      return Object.values(GAME_DATA.tags).find(t => t.category === 'Theme & Event' && !used.has(t.id));
    });

    await banFromScriptLab(page, unused);
    await expect(page.locator('#results-generator')).toBeVisible();
    await expect(page.locator('#generator-stale-notice')).toBeHidden();
  });

  // Audit 2026-09-30: a refused Generate or Analyze left the previous results
  // on screen beside the refusal. Evaluate already clears them, so a rejected
  // script never sits next to the last script's numbers.
  test('TC01-000046 a refused Generate hides the previous results', async ({ page }) => {
    await page.locator('#generateScriptsButton').click();
    await expect(page.locator('#generatorResultsList .gen-card')).toHaveCount(5, { timeout: 20000 });

    // Three locked Supporting Characters at pool 5 leave no room for the
    // Protagonist, Antagonist and Finale, so Generate refuses (TC01-000034).
    const rows = page.locator('#inputs-supporting-character-generator select.tag-selector');
    const picks = ['SUPPORTINGCHARACTER_SIDEKICK', 'SUPPORTINGCHARACTER_LOVE_INTEREST', 'SUPPORTINGCHARACTER_ANGRY_BOSS'];
    for (let i = 0; i < picks.length; i++) {
      if (i > 0) await page.locator('#add-supporting-character-generator-button').click();
      await rows.first().selectOption(picks[i]);
    }
    await page.locator('#generateScriptsButton').click();
    await expect(page.locator('#generatorFeedbackMessage')).toContainText('Every script needs a Protagonist');
    await expect(page.locator('#results-generator')).toBeHidden();
  });

  test('TC04-000037 a refused Analyze hides the previous results', async ({ steps, page }) => {
    await steps.on('marketTab', 'Navigation').click();
    await page.locator('#inputs-protagonist-advertisers select.tag-selector').first().selectOption('PROTAGONIST_CYNIC');
    await page.locator('#analyzeMovieButton').click();
    await expect(page.locator('#results-advertisers')).toBeVisible();

    await page.locator('#inputs-protagonist-advertisers select.tag-selector').first().selectOption('');
    await page.locator('#analyzeMovieButton').click();
    await expect(page.locator('#advertisersFeedbackMessage')).toHaveText('Please select at least one tag.');
    await expect(page.locator('#results-advertisers')).toBeHidden();
  });

  // A saved Library script is the one place a banned element can remain
  // (generated scripts hide on a ban, TC01-000047), so the transfer goes
  // through a pinned script.
  test('TC04-000038 a transfer that skips a banned element still shows why Analyze refused', async ({ steps, page }) => {
    await steps.setSliderValue('elementPoolSlider', 'Navigation', 7);
    await page.locator('#generateScriptsButton').click();
    const card = page.locator('#generatorResultsList .gen-card').first();
    await expect(card).toBeVisible({ timeout: 20000 });
    if (await card.locator('.pin-btn').isHidden()) await card.locator('.gen-header').click();
    await card.locator('.pin-btn').click();
    const pinned = page.locator('#pinnedResultsList .gen-card').first();
    await expect(pinned).toBeVisible();

    const script = await page.evaluate(() => pinnedScripts[0].tags);
    const banned = script.find(tag => tag.category === 'Theme & Event' || tag.category === 'Supporting Character');
    const slug = banned.category === 'Theme & Event' ? 'theme-event' : 'supporting-character';
    const content = page.locator('#excluded-content');
    if (await content.evaluate(el => el.classList.contains('hidden'))) await page.locator('#toggleExcludedElementsButton').click();
    await page.locator(`#add-${slug}-excluded-button`).click();
    await page.locator(`#inputs-${slug}-excluded select.tag-selector`).first().selectOption(banned.id);
    await steps.setSliderValue('elementPoolSlider', 'Navigation', 5);

    if (await pinned.locator('[data-role="script-transfer-button"]').isHidden()) await pinned.locator('.gen-header').click();
    await pinned.locator('[data-role="script-transfer-button"]').click();
    const feedback = page.locator('#advertisersFeedbackMessage');
    await expect(feedback).toContainText('Skipped excluded elements');
    await expect(feedback).toContainText('Max Element Pool is set to 5, but you selected 6');
  });

  // Owner ruling 2026-10-01: Graves' Likely Audience uses Marketing's target
  // audience model, so both tabs name the same audiences, at the same tier,
  // for the same script. Graves used its own scaling (top audience = 100%).
  const SCRIPTS = {
    owner: [['ADVENTURE', 'Genre'], ['FANTASY_KINGDOM', 'Setting'], ['PROTAGONIST_CYNIC', 'Protagonist'],
      ['ANTAGONIST_EVIL_MONSTER', 'Antagonist'], ['THEME_TREASURE_HUNT', 'Theme & Event'], ['SUPPORTINGCHARACTER_SIDEKICK', 'Supporting Character'], ['FINALE_PROTAGONIST_FINDS_TREASURE', 'Finale']],
    romance: [['DRAMA', 'Genre'], ['MODERN_AMERICAN_TOWN', 'Setting'], ['PROTAGONIST_HOPELESS_ROMANTIC', 'Protagonist'],
      ['ANTAGONIST_MURDERER', 'Antagonist'], ['THEME_LOVE_TRIANGLE', 'Theme & Event'], ['SUPPORTINGCHARACTER_DAMSEL_IN_DISTRESS', 'Supporting Character'], ['FINALE_SWEETHEARTS_STAY_TOGETHER', 'Finale']],
    western: [['ACTION', 'Genre'], ['WILD_WEST', 'Setting'], ['PROTAGONIST_COWBOY', 'Protagonist'],
      ['ANTAGONIST_BANDIT', 'Antagonist'], ['EVENTS_SHOOTOUT', 'Theme & Event'], ['SUPPORTINGCHARACTER_SIDEKICK', 'Supporting Character'], ['FINALE_ANTAGONIST_GETS_KILLED', 'Finale']],
  };
  const pillsIn = (page, container) => page.locator(`${container} .audience-pill`).evaluateAll(pills => pills
    .map(pill => `${pill.textContent.replace(/\s*\d+%$/, '').trim()}:${pill.classList.contains('pill-best') ? 'high' : 'moderate'}`)
    .sort());

  for (const [name, script] of Object.entries(SCRIPTS)) {
    test(`TC03-000058 ${name}: Graves and Marketing name the same audiences at the same tier`, async ({ steps, page }) => {
      await steps.on('evaluateTab', 'Navigation').click();
      await page.evaluate(tags => restoreSelection('graves', tags),
        script.map(([id, category]) => ({ id, category, percent: 1 })));
      await page.locator('#evaluateGravesButton').click();
      await expect(page.locator('#gravesAudienceDisplay .audience-pill').first()).toBeVisible();
      const graves = await pillsIn(page, '#gravesAudienceDisplay');

      await page.locator('#transferGravesTagsButton').click();
      await expect(page.locator('#results-advertisers')).toBeVisible();
      const marketing = await pillsIn(page, '#targetAudienceDisplay');

      expect(marketing.length).toBeGreaterThan(0);
      expect(graves).toEqual(marketing);
    });
  }

  // Owner ruling 2026-10-01: Analyze results do not outlive their inputs
  // (the elements and both scores), the same rule as Evaluate. Analyze moves
  // the live distribution calculator into its results, so hiding the results
  // must hand the calculator back to its own place first.
  const analyzeCynic = async (steps, page) => {
    await steps.on('marketTab', 'Navigation').click();
    await page.locator('#inputs-protagonist-advertisers select.tag-selector').first().selectOption('PROTAGONIST_CYNIC');
    await page.locator('#analyzeMovieButton').click();
    await expect(page.locator('#results-advertisers')).toBeVisible();
  };
  const analyzeStale = (page) => page.locator('#advertisers-stale-notice');

  for (const [change, act] of [
    ['an element', page => page.locator('#inputs-antagonist-advertisers select.tag-selector').first().selectOption('ANTAGONIST_EVIL_MONSTER')],
    ['the commercial score', page => page.locator('#comScoreInput').fill('8')],
  ]) {
    test(`TC04-000039 changing ${change} after Analyze hides the old analysis but keeps the calculator`, async ({ steps, page }) => {
      await analyzeCynic(steps, page);
      await expect(analyzeStale(page)).toBeHidden();

      await act(page);
      await expect(page.locator('#results-advertisers')).toBeHidden();
      await expect(analyzeStale(page)).toHaveText('Inputs changed. Press Analyze to update.');
      await expect(page.locator('#dist-wrapper')).toBeVisible();

      await page.locator('#analyzeMovieButton').click();
      await expect(analyzeStale(page)).toBeHidden();
      await expect(page.locator('#results-advertisers')).toBeVisible();
    });
  }

  test('TC04-000040 a refused Analyze keeps the distribution calculator on screen', async ({ steps, page }) => {
    await analyzeCynic(steps, page);
    await page.locator('#inputs-protagonist-advertisers select.tag-selector').first().selectOption('');
    await page.locator('#analyzeMovieButton').click();
    await expect(page.locator('#results-advertisers')).toBeHidden();
    await expect(page.locator('#dist-wrapper')).toBeVisible();
  });

  // Audit 2026-09-30: a movie score runs 0.0 to 10.0 (GAME_RULES.md section
  // 1). Typing 12 moved the slider to 10, but the grid read the box and showed
  // week 1 as 24,000. The box now settles on the limit when it is left, like
  // the pool box (TC10-000008), and every reader clamps.
  test('TC04-000036 a movie score typed above 10 or below 0 is read as 10 or 0', async ({ steps, page }) => {
    await steps.on('marketTab', 'Navigation').click();
    const weekOne = async () => Number((await page.locator('#dist-week-1-value').textContent()).replace(/[^\d]/g, ''));
    const box = page.locator('#comScoreInput');

    await box.fill('12');
    await expect.poll(weekOne).toBe(20000);
    await box.press('Tab');
    await expect(box).toHaveValue('10');

    await box.fill('-3');
    await expect.poll(weekOne).toBe(0);
    await box.press('Tab');
    await expect(box).toHaveValue('0');
  });

  // Audit 2026-09-30: Swap's Show more counted every row minus 10, but each
  // slot already shows up to 10 of its own. At 3.5+ it offered "18 more"
  // with every row on screen, and a click showed nothing.
  test('TC03-000056 Swap Show more offers exactly the rows that are hidden', async ({ steps, page }) => {
    await buildOwnerScript(steps, page);
    const rowsShown = () => swapList(page).locator('[data-role="graves-best-match"]').count();
    const hiddenBySlot = () => page.evaluate(() => {
      const tags = collectTagInputs('graves');
      const ids = new Set(tags.map(t => t.id));
      const banned = getManuallyExcludedIds('excluded');
      const filter = document.getElementById('gravesBestCategoryFilter').value;
      const candidates = Object.values(GAME_DATA.tags).filter(t => !ids.has(t.id) && !banned.has(t.id) && (!filter || t.category === filter));
      const fit = parseFloat(document.getElementById('gravesBestScoreFilter').value);
      const result = HACGravesBestMatchesEngine.buildSwaps(tags, candidates, fit, {
        calculateMatrixScore, getRawCompatibilityScore, multiSelectCategories: MULTI_SELECT_CATEGORIES,
        displayName: t => GAME_DATA.tags[t.id]?.name || t.id,
      });
      return Object.values(result.rowsBySlot).reduce((n, group) => n + Math.max(0, group.rows.length - 10), 0);
    });

    for (const fit of ['3.5', '0']) {
      await steps.selectDropdown('minimumFitFilter', 'ColmanGraves', { type: DropdownSelectType.VALUE, value: fit });
      await openSwapSuggestions(steps);
      const hidden = await hiddenBySlot();
      const button = page.locator('#graves-show-more-btn');
      if (hidden === 0) {
        await expect(button, `fit ${fit}`).toHaveCount(0);
      } else {
        await expect(button, `fit ${fit}`).toHaveText(`Show more suggestions (${hidden} more available)`);
        const before = await rowsShown();
        await button.click();
        expect(await rowsShown(), `fit ${fit}`).toBeGreaterThan(before);
      }
    }
  });

  // Audit 2026-09-30: Save to Script Library counted tags, not story elements
  // (GAME_RULES.md section 1 names this as the recurring bug), so Genre plus
  // Setting alone saved as a "script" although the message asks for 2 story
  // elements.
  test('TC03-000051 Save to Script Library counts story elements, not tags', async ({ steps, page }) => {
    await steps.on('evaluateTab', 'Navigation').click();
    const saved = () => page.evaluate(() => pinnedScripts.length);
    const before = await saved();
    await page.locator('#inputs-genre-graves select.tag-selector').first().selectOption('ADVENTURE');
    await page.locator('#inputs-setting-graves select.tag-selector').first().selectOption('FANTASY_KINGDOM');

    await page.locator('#saveGravesScriptButton').click();
    await expect(page.locator('#gravesFeedbackMessage')).toHaveText('Select at least 2 story elements before saving.');
    expect(await saved()).toBe(before);

    await page.locator('#inputs-protagonist-graves select.tag-selector').first().selectOption('PROTAGONIST_CYNIC');
    await page.locator('#inputs-antagonist-graves select.tag-selector').first().selectOption('ANTAGONIST_EVIL_MONSTER');
    await page.locator('#saveGravesScriptButton').click();
    await expect(page.locator('#gravesFeedbackMessage')).toHaveText('Saved to your script library in Script Lab.');
    expect(await saved()).toBe(before + 1);
  });

  // Owner ruling 2026-10-01: a pinned Library script that holds a banned
  // element highlights it and says so, so the player can remove the pin or
  // lift the ban. Lifting the ban clears the highlight.
  test('TC01-000054 a pinned script highlights an element that is now banned', async ({ page }) => {
    await page.locator('#generateScriptsButton').click();
    const card = page.locator('#generatorResultsList .gen-card').first();
    await expect(card).toBeVisible({ timeout: 20000 });
    if (await card.locator('.pin-btn').isHidden()) await card.locator('.gen-header').click();
    await card.locator('.pin-btn').click();
    const pinned = page.locator('#pinnedResultsList .gen-card').first();
    await expect(pinned).toBeVisible();
    const tag = await page.evaluate(() => {
      const t = pinnedScripts[0].tags.find(x => x.category === 'Theme & Event' || x.category === 'Supporting Character');
      return { id: t.id, category: t.category, name: GAME_DATA.tags[t.id].name };
    });

    await openBanList(page);
    const slug = tag.category === 'Theme & Event' ? 'theme-event' : 'supporting-character';
    await page.locator(`#add-${slug}-excluded-button`).click();
    const banRow = page.locator(`#inputs-${slug}-excluded select.tag-selector`).first();
    await banRow.selectOption(tag.id);

    const warning = pinned.locator('[data-role="script-banned-warning"]');
    await expect(warning).toHaveText(`Banned: ${tag.name}. Remove the pin or lift the ban.`);
    await expect(pinned.locator('.gen-tag-chip.tag-banned')).toHaveCount(1);

    await banRow.selectOption('');
    await expect(warning).toHaveCount(0);
    await expect(pinned.locator('.gen-tag-chip.tag-banned')).toHaveCount(0);
  });

  // Owner ruling 2026-10-01: an element can be banned only once. The ban
  // list's dropdowns gray out an element banned in another row, as the script
  // builders do, and no path adds a second row for the same ban.
  const openBanList = async (page) => {
    await page.locator('#tab-generator-button').click();
    const content = page.locator('#excluded-content');
    if (await content.evaluate(el => el.classList.contains('hidden'))) await page.locator('#toggleExcludedElementsButton').click();
  };
  const bannedGenreRows = (page) => page.locator('#inputs-genre-excluded select.tag-selector')
    .evaluateAll(selects => selects.map(select => select.value).filter(Boolean));

  test('TC09-000026 a genre banned in one row is grayed out in the others', async ({ page }) => {
    await openBanList(page);
    await page.locator('#add-genre-excluded-button').click();
    await page.locator('#add-genre-excluded-button').click();
    const rows = page.locator('#inputs-genre-excluded select.tag-selector');
    await rows.first().selectOption('ACTION');
    expect(await rows.nth(1).locator('option[value="ACTION"]').evaluate(option => option.disabled)).toBe(true);
  });

  test('TC09-000027 a ban profile that lists an element twice bans it once', async ({ page }) => {
    await openBanList(page);
    await page.evaluate(() => {
      // The same steps as Load Profile in src/app/appShell.js.
      resetSelectors('excluded');
      ['ACTION', 'COMEDY', 'ACTION'].forEach(id => addDropdown('Genre', id, 'excluded'));
      updateExcludedCount();
    });
    expect((await bannedGenreRows(page)).sort()).toEqual(['ACTION', 'COMEDY']);
  });

  test('TC09-000028 picking an already banned element from search adds no second ban', async ({ page }) => {
    await openBanList(page);
    await page.evaluate(() => {
      resetSelectors('excluded');
      addDropdown('Genre', 'ACTION', 'excluded');
      selectTagFromSearch(GAME_DATA.tags.ACTION, 'excluded');
    });
    expect(await bannedGenreRows(page)).toEqual(['ACTION']);
  });

  // Audit 2026-09-30: the 11-row cap counted the empty row a reset leaves, so
  // restoring a ban list that holds all 11 genres dropped one without a word.
  // Given the ban list was reset (one empty Genre row)
  // When a ban profile with all 11 genres is loaded, which adds one row per ban
  // Then all 11 are banned, in 11 rows
  test('TC06-000010 loading 11 genre bans over an empty row keeps all 11', async ({ steps, page }) => {
    await steps.on('buildTab', 'Navigation').click();
    const banned = await page.evaluate(() => {
      // The same steps as Load Profile in src/app/appShell.js.
      resetSelectors('excluded');
      const genres = Object.values(GAME_DATA.tags).filter(tag => tag.category === 'Genre');
      genres.forEach(tag => addDropdown('Genre', tag.id, 'excluded'));
      updateExcludedCount();
      return genres.length;
    });
    expect(banned).toBe(11);
    const values = await page.locator('#inputs-genre-excluded select.tag-selector')
      .evaluateAll(selects => selects.map(select => select.value).filter(Boolean));
    expect(new Set(values).size).toBe(11);
    await expect(page.locator('#inputs-genre-excluded [data-role="tag-selector-row"]')).toHaveCount(11);
  });

  // Owner report 2026-09-30: after Evaluate, changing the script left the old
  // Pair Analysis and Conflicts on screen. Ruling: hide them and prompt.
  // Given Evaluate shows the Long Journey x Evil Monster clash
  // When the user changes the script in any way, without pressing Evaluate
  // Then the old results are hidden and a notice asks for a new Evaluate
  const staleNotice = (page) => page.locator('#graves-stale-notice');
  const evaluateAndSeeClash = async (steps, page) => {
    await steps.on('evaluateButton', 'ColmanGraves').click();
    await expect(page.locator('#graves-conflicts-panel')).toBeVisible();
    await expect(page.locator('#gravesConflictDisplay')).toContainText('Long Journey');
    await expect(staleNotice(page)).toBeHidden();
  };
  const expectStale = async (page) => {
    for (const panel of ['#graves-summary-row', '#graves-reading-panel', '#graves-detail-row', '#graves-pairs-panel', '#graves-breakdown-panel']) {
      await expect(page.locator(panel), panel).toBeHidden();
    }
    await expect(staleNotice(page)).toBeVisible();
    await expect(staleNotice(page)).toHaveText('Script changed. Press Evaluate Script to update.');
  };

  test('TC03-000046 changing a dropdown after Evaluate hides the old results until Evaluate runs again', async ({ steps, page }) => {
    await buildOwnerScript(steps, page);
    await evaluateAndSeeClash(steps, page);

    await themeRows(page).nth(1).selectOption('EVENTS_ANCIENT_PUZZLE');
    await expectStale(page);

    await steps.on('evaluateButton', 'ColmanGraves').click();
    await expect(staleNotice(page)).toBeHidden();
    await expect(page.locator('#graves-pairs-panel')).toBeVisible();
    await expect(page.locator('#results-graves')).not.toContainText('Long Journey');
  });

  test('TC03-000047 removing a row with its remove button after Evaluate hides the old results', async ({ steps, page }) => {
    await buildOwnerScript(steps, page);
    await evaluateAndSeeClash(steps, page);

    await page.locator('#inputs-theme-event-graves [data-role="tag-selector-row"]')
      .filter({ has: page.locator('option:checked[value="THEME_LONG_JOURNEY"]') })
      .locator('button.remove-btn').click();
    await expectStale(page);
  });

  test('TC03-000048 Reset after Evaluate hides the old results', async ({ steps, page }) => {
    await buildOwnerScript(steps, page);
    await evaluateAndSeeClash(steps, page);

    await page.locator('#resetGravesButton').click();
    await expectStale(page);
  });

  test('TC03-000049 changing a Genre share after Evaluate hides the old results', async ({ steps, page }) => {
    await buildOwnerScript(steps, page);
    await page.locator('#add-genre-graves-button').click();
    await page.locator('#inputs-genre-graves select.tag-selector').first().selectOption('SCIENCE_FICTION');
    await evaluateAndSeeClash(steps, page);

    const share = page.locator('#inputs-genre-graves .genre-row .percent-input').first();
    await share.fill('40');
    await share.dispatchEvent('change');
    await expectStale(page);
  });

  test('TC03-000050 adding an empty row after Evaluate keeps the results, because the script did not change', async ({ steps, page }) => {
    await buildOwnerScript(steps, page);
    await evaluateAndSeeClash(steps, page);

    await steps.on('themeEventAddButton', 'ColmanGraves').click();
    await expect(themeRows(page)).toHaveCount(4);
    await expect(page.locator('#graves-conflicts-panel')).toBeVisible();
    await expect(staleNotice(page)).toBeHidden();
  });

  // Owner ruling 2026-10-01: at the element budget Best Additions still
  // lists Genres, which do not count toward it, and says why only Genres.
  test('TC03-000057 at the element budget Best Additions lists Genres only, and says so', async ({ steps, page }) => {
    await buildOwnerScript(steps, page);
    await steps.setSliderValue('elementPoolSlider', 'Navigation', 6);
    await steps.on('evaluateTab', 'Navigation').click();
    await steps.selectDropdown('minimumFitFilter', 'ColmanGraves', { type: DropdownSelectType.VALUE, value: '0' });
    await steps.on('generateBestMatchesButton', 'ColmanGraves').click();
    await steps.on('bestAdditionsTab', 'ColmanGraves').click();

    const rows = swapList(page).locator('[data-role="graves-best-match"]');
    await expect(rows.first()).toBeVisible();
    const categories = await rows.evaluateAll(list => [...new Set(list.map(row => row.dataset.category))]);
    expect(categories).toEqual(['Genre']);
    await expect(page.locator('[data-role="graves-additions-budget-note"]')).toContainText('already uses all 6 story elements');
  });

  // Given the short-list note is showing at 4.0+
  // When the user clicks its button
  // Then Minimum Fit drops one step and the list refills with story elements
  test('TC03-000045 the short-list note lowers Minimum Fit by one step in one click', async ({ steps, page }) => {
    await buildOwnerScript(steps, page);
    await steps.on('generateBestMatchesButton', 'ColmanGraves').click();

    const button = page.locator('[data-action="lower-minimum-fit"]');
    await expect(button).toHaveText('Lower to 3.5+');
    await button.click();

    await expect(page.locator('#gravesBestScoreFilter')).toHaveValue('3.5');
    await expect(page.locator('[data-role="graves-additions-shortfall"]')).toHaveCount(0);
    const storyRows = swapList(page).locator('[data-role="graves-best-match"]:not([data-category="Genre"]):not([data-category="Setting"])');
    expect(await storyRows.count()).toBeGreaterThanOrEqual(2);
  });

  // Owner, 2026-09-30: "you should always be able to select 5 to 10 elements."
  // Given any Max Element Pool from 5 to 10, set with the header slider
  // When the user generates scripts in Script Lab
  // Then every script carries exactly that many story elements
  test('TC01-000043 every Max Element Pool from 5 to 10 generates exactly that many story elements', async ({ steps, page }) => {
    for (const pool of [5, 6, 7, 8, 9, 10]) {
      await steps.setSliderValue('elementPoolSlider', 'Navigation', pool);
      await page.locator('#generateScriptsButton').click();
      await expect(page.locator('#generatorResultsList .gen-card')).toHaveCount(5, { timeout: 20000 });
      const counts = await page.evaluate(() => generatedScriptsCache.map(script =>
        script.tags.filter(tag => tag.category !== 'Genre' && tag.category !== 'Setting').length));
      expect(new Set(counts), `pool ${pool}`).toEqual(new Set([pool]));
    }
  });

  // Owner ruling 2026-09-30: pool and target are one to one, 5 to 10.
  // Given the user walks one control from 5 to 10, one step at a time
  // When each step lands
  // Then the other control, the help text and Generate all say the same N
  const storyCounts = (page) => page.evaluate(() => generatedScriptsCache.map(script =>
    script.tags.filter(tag => tag.category !== 'Genre' && tag.category !== 'Setting').length));

  for (const [label, slider, page] of [
    ['Max Element Pool', 'elementPoolSlider', 'Navigation'],
    ['Target Movie Score', 'movieScoreSlider', 'ScriptLab'],
  ]) {
    test(`TC26-000003 walking ${label} 5 to 10 keeps pool, target, help and Generate at the same N`, async ({ steps, page: browserPage }) => {
      await steps.on('buildTab', 'Navigation').click();
      for (const n of [5, 6, 7, 8, 9, 10]) {
        await steps.setSliderValue(slider, page, n);
        for (const control of ['#globalElementPoolInput', '#globalElementPoolSlider', '#genScoreInput', '#genScoreSlider']) {
          await expect(browserPage.locator(control), `${control} at ${n}`).toHaveValue(String(n));
        }
        await expect(browserPage.locator('#genTagsRequiredDisplay'))
          .toHaveText(`Requires ~${n} Story Elements (excluding Genre & Setting).`);
        await browserPage.locator('#generateScriptsButton').click();
        await expect(browserPage.locator('#generatorResultsList .gen-card')).toHaveCount(5, { timeout: 20000 });
        expect(new Set(await storyCounts(browserPage)), `Generate at ${n}`).toEqual(new Set([n]));
      }
    });
  }

  // Audit 2026-09-30: pinning re-rendered all 15 results and removed Show
  // more, which undid the 5-at-a-time paging ruled the same day.
  test('TC01-000044 pinning a script keeps the results paged 5 at a time', async ({ page }) => {
    const cards = page.locator('#generatorResultsList .gen-card');
    await page.locator('#generateScriptsButton').click();
    await expect(cards).toHaveCount(5, { timeout: 20000 });

    const first = cards.first();
    if (await first.locator('.pin-btn').isHidden()) await first.locator('.gen-header').click();
    await first.locator('.pin-btn').click();
    await expect.poll(() => page.evaluate(() => pinnedScripts.length)).toBe(1);

    await expect(cards).toHaveCount(5);
    await expect(page.locator('#showMoreGeneratedScriptsButton')).toHaveText('Show 5 More (5 remaining)');
  });

  // Audit 2026-09-30: a script name was stored only on keyup, so a paste or
  // autofill never reached the library file.
  test('TC01-000045 a pasted script name is kept', async ({ page }) => {
    const cards = page.locator('#generatorResultsList .gen-card');
    await page.locator('#generateScriptsButton').click();
    await expect(cards).toHaveCount(5, { timeout: 20000 });
    const first = cards.first();
    if (await first.locator('.pin-btn').isHidden()) await first.locator('.gen-header').click();
    await first.locator('.pin-btn').click();

    // fill() sets the value and fires input, as a paste does; no key events.
    await page.locator('#pinnedResultsList .script-name-input').first().fill('Treasure run');
    await expect.poll(() => page.evaluate(() => pinnedScripts[0].name)).toBe('Treasure run');
  });

  // Given Max Element Pool 8
  // When the user generates scripts in Script Lab
  // Then every script carries 8 story elements, not 7
  test('TC01-000041 Max Element Pool 8 generates 8 story elements', async ({ steps, page }) => {
    await steps.setSliderValue('elementPoolSlider', 'Navigation', 8);
    await page.locator('#generateScriptsButton').click();
    await expect(page.locator('#generatorResultsList .gen-card')).toHaveCount(5, { timeout: 20000 });

    const counts = await page.evaluate(() => generatedScriptsCache.map(script =>
      script.tags.filter(tag => tag.category !== 'Genre' && tag.category !== 'Setting').length));
    expect(counts).toHaveLength(15);
    expect(new Set(counts)).toEqual(new Set([8]));
  });

  // Given one click on Generate Scripts
  // When the user pages through the results
  // Then 5 show first, and Show more reveals the rest 5 at a time
  test('TC01-000042 Generate Scripts pages 15 results, 5 at a time', async ({ page }) => {
    const cards = page.locator('#generatorResultsList .gen-card');
    const showMore = page.locator('#showMoreGeneratedScriptsButton');

    await page.locator('#generateScriptsButton').click();
    await expect(cards).toHaveCount(5, { timeout: 20000 });
    const firstPage = await cards.allTextContents();
    await expect(showMore).toHaveText('Show 5 More (5 remaining)');

    await showMore.click();
    await expect(cards).toHaveCount(10);
    // Paging reveals more; it never regenerates what is already shown.
    expect((await cards.allTextContents()).slice(0, 5)).toEqual(firstPage);
    await expect(showMore).toHaveText('Show 5 More (0 remaining)');

    await showMore.click();
    await expect(cards).toHaveCount(15);
    await expect(showMore).toHaveCount(0);
  });
});
