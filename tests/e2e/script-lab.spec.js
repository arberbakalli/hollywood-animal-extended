import { test, expect, openHollywood } from '../fixtures/base.js';
import { DropdownSelectType } from '@civitas-cerebrum/element-interactions';

const SIDEKICK = 'SUPPORTINGCHARACTER_SIDEKICK';

test.describe('Script Lab — generator', () => {
  test.beforeEach(async ({ steps }) => {
    await openHollywood(steps);
    await steps.on('buildTab', 'Navigation').click();
  });

  // Given the app is open
  // When the user opens the Build tab
  // Then the Script Lab panel is shown
  test('TC01-000001 Build tab reveals the Script Lab panel', async ({ steps }) => {
    await steps.on('panel', 'ScriptLab').verifyState('visible');
    await steps.on('generateButton', 'ScriptLab').verifyText('Generate Scripts');
  });

  // Given Locked Elements starts expanded
  // When the user collapses it
  // Then the section state and controls agree
  test('TC01-000002 collapsing Locked Elements hides its selectors', async ({ steps }) => {
    await steps.on('lockedContent', 'ScriptLab').verifyState('visible');
    await steps.expect('lockedSectionToggle', 'ScriptLab').attributes.get('aria-expanded').toBe('true');

    await steps.on('lockedSectionToggle', 'ScriptLab').click();

    await steps.expect('lockedSectionToggle', 'ScriptLab').attributes.get('aria-expanded').toBe('false');
    await steps.on('lockedContent', 'ScriptLab').verifyState('hidden');
  });

  test('TC01-000019 collapsing Excluded Elements hides its selectors', async ({ steps }) => {
    await steps.on('excludedContent', 'ScriptLab').verifyState('visible');
    await steps.expect('excludedSectionToggle', 'ScriptLab').attributes.get('aria-expanded').toBe('true');

    await steps.on('excludedSectionToggle', 'ScriptLab').click();

    await steps.expect('excludedSectionToggle', 'ScriptLab').attributes.get('aria-expanded').toBe('false');
    await steps.on('excludedContent', 'ScriptLab').verifyState('hidden');
  });

  // Given the user is on Script Lab with default targets
  // When they generate
  // Then the results section appears with at least one script card
  test('TC01-000003 generating with default targets produces script cards', async ({ steps }) => {
    await steps.on('resultsSection', 'ScriptLab').verifyState('hidden');

    await steps.on('generateButton', 'ScriptLab').click();

    await steps.on('resultsSection', 'ScriptLab').verifyState('visible');
    await steps.on('generatedCards', 'ScriptLab').verifyCount({ greaterThan: 0 });
    await steps.on('generatedTagChips', 'ScriptLab').verifyCount({ greaterThan: 0 });
  });

  // Best Artistic and Best Commercial share one engine, so a check that finds
  // the same words on both cannot tell them apart. These assert what differs:
  // which bonus is the primary badge, and that the cards are ranked by it.
  const expectRankedBy = async (steps, page, button, primary, secondary) => {
    await steps.on(button, 'ScriptLab').click();
    await steps.on('resultsSection', 'ScriptLab').verifyState('visible');
    await steps.on('generatedCards', 'ScriptLab').verifyCount({ exactly: 3 });

    const firstCardLabels = (await page.locator('#generatorResultsList .gen-card').first()
      .locator('.gen-badge-label').allTextContents()).map(s => s.trim());
    expect(firstCardLabels).toEqual([primary, secondary, 'Avg Fit', 'Synergy']);

    await steps.on('generatedShowMoreButton', 'ScriptLab').verifyTextContains('Show');
    await steps.on('generatedShowMoreButton', 'ScriptLab').verifyTextContains('More');
    await steps.on('generatedShowMoreButton', 'ScriptLab').click();
    await steps.on('generatedCards', 'ScriptLab').verifyCount({ greaterThan: 3 });

    const cards = page.locator('#generatorResultsList .gen-card');
    const primaries = cards.locator('.gen-badge-group--primary');
    await expect(primaries).toHaveCount(await cards.count());

    const labels = (await primaries.locator('.gen-badge-label').allTextContents()).map(s => s.trim());
    expect(new Set(labels)).toEqual(new Set([primary]));

    const values = (await primaries.locator('.gen-badge-val').allTextContents()).map(Number);
    values.forEach(value => expect(Number.isFinite(value)).toBe(true));
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeLessThanOrEqual(values[i - 1]);
    }
  };

  test('TC01-000036 Artistic Bonus leads every card and ranks them', async ({ steps, page }) => {
    await expectRankedBy(steps, page, 'bestArtisticButton', 'Artistic Bonus', 'Commercial Bonus');
  });

  test('TC01-000037 Commercial Bonus leads every card and ranks them', async ({ steps, page }) => {
    await expectRankedBy(steps, page, 'bestCommercialButton', 'Commercial Bonus', 'Artistic Bonus');
  });

  // A card's average fit is the same pair average Graves grades, so its colour
  // follows the Graves verdict bands: Risky (3.0 to 3.5) is danger, not amber.
  test('TC01-000039 a card colours its average fit by the Graves verdict bands', async ({ steps, page }) => {
    await steps.on('generateButton', 'ScriptLab').click();
    await steps.on('generatedCards', 'ScriptLab').verifyCount({ greaterThan: 0 });

    const classes = await page.evaluate(() => {
      const base = generatedScriptsCache[0];
      return [2.9, 3.0, 3.2, 3.4, 3.5, 3.9, 4.0].map(average => {
        const card = HACScriptGenerator.createScriptCardHTML(
          { ...base, stats: { ...base.stats, avgComp: average } }, false);
        const root = typeof card === 'string'
          ? Object.assign(document.createElement('div'), { innerHTML: card })
          : card;
        const group = [...root.querySelectorAll('.gen-badge-group')]
          .find(g => /^Avg (Comp|Fit)$/.test(g.querySelector('.gen-badge-label').textContent.trim()));
        return [...group.querySelector('.gen-badge-val').classList].find(c => c.startsWith('val-'));
      });
    });

    expect(classes).toEqual(['val-low', 'val-low', 'val-low', 'val-low', 'val-mid', 'val-mid', 'val-high']);
  });

  // Owner ruling 2026-09-29: elements are listed Genre > Setting > Protagonist >
  // Antagonist > Supporting Character > Theme & Event > Finale everywhere.
  test('TC01-000038 script cards list their elements in game category order', async ({ steps, page }) => {
    const order = ['Genre', 'Setting', 'Protagonist', 'Antagonist', 'Supporting Character', 'Theme & Event', 'Finale'];
    await steps.on('generateButton', 'ScriptLab').click();
    await steps.on('generatedCards', 'ScriptLab').verifyCount({ greaterThan: 0 });

    const cards = await page.locator('#generatorResultsList .gen-card').evaluateAll(nodes =>
      nodes.map(card => [...card.querySelectorAll('.gen-tag-chip small')].map(small => small.textContent.trim())));
    expect(cards.length).toBeGreaterThan(0);
    for (const categories of cards) {
      expect(categories).toContain('Protagonist');
      expect(categories).toContain('Antagonist');
      const ranks = categories.map(category => order.indexOf(category));
      expect(ranks).not.toContain(-1);
      expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
    }
  });

  // Given a supporting character is locked
  // When scripts are generated
  // Then every rendered script card keeps that locked pick
  // Given three Supporting Characters are locked at the default target of 5
  // When the user generates
  // Then generation is refused, naming the mandatory categories and the fix,
  // instead of quietly producing scripts with no Finale
  test('TC01-000034 locks that leave no room for a Finale are refused with a way out', async ({ steps, page }) => {
    // Add-row inserts the new, empty row first, so each pick goes into row 0.
    const rows = page.locator('#inputs-supporting-character-generator select.tag-selector');
    const picks = [SIDEKICK, 'SUPPORTINGCHARACTER_LOVE_INTEREST', 'SUPPORTINGCHARACTER_ANGRY_BOSS'];
    for (let i = 0; i < picks.length; i++) {
      if (i > 0) await steps.on('addLockedSupportingCharacterRow', 'ScriptLab').click();
      await rows.first().focus();
      await rows.first().selectOption(picks[i]);
    }
    await expect(rows).toHaveCount(3);
    expect((await rows.evaluateAll(selects => selects.map(s => s.value))).sort()).toEqual([...picks].sort());

    await steps.on('generateButton', 'ScriptLab').click();

    await steps.on('feedbackMessage', 'ScriptLab')
      .verifyTextContains('Every script needs a Protagonist, an Antagonist and a Finale');
    await steps.on('feedbackMessage', 'ScriptLab')
      .verifyTextContains('Remove 1 locked element or raise the score target');
    await steps.on('resultsSection', 'ScriptLab').verifyState('hidden');
  });

  test('TC01-000004 locking Sidekick constrains generated scripts', async ({ steps, page }) => {
    await steps.selectDropdown('lockedSupportingCharacterSelect', 'ScriptLab', {
      type: DropdownSelectType.VALUE,
      value: SIDEKICK,
    });

    await steps.on('generateButton', 'ScriptLab').click();

    await steps.on('generatedCards', 'ScriptLab').verifyCount({ greaterThan: 0 });
    const cardTexts = await page
      .locator('#generatorResultsList .gen-card')
      .evaluateAll(cards => cards.map(card => card.textContent || ''));
    for (const text of cardTexts) {
      expect(text).toContain('Sidekick');
    }
  });

  test('TC01-000031 selected tags and strong-fit options get positive visual feedback', async ({ page }) => {
    const fixture = await page.evaluate(async () => {
      await ensureCompatibilityLoaded();
      const tags = Object.values(GAME_DATA.tags);
      const protagonist = tags.find(tag => {
        if (tag.category !== 'Protagonist') return false;
        return tags.some(candidate =>
          candidate.id !== tag.id &&
          HACCompatibilityEngine.getRawCompatibilityScore(candidate, tag, GAME_DATA) >= 4
        );
      });
      const strongPartner = tags.find(candidate =>
        candidate.id !== protagonist.id &&
        HACCompatibilityEngine.getRawCompatibilityScore(candidate, protagonist, GAME_DATA) >= 4
      );

      return { protagonistId: protagonist.id, strongPartnerId: strongPartner.id };
    });
    const select = page.locator('#inputs-protagonist-generator select.tag-selector').first();
    const row = page.locator('#inputs-protagonist-generator .select-row').first();

    await select.selectOption(fixture.protagonistId);

    await expect(select).toHaveClass(/has-selected-tag/);
    await expect(row).toHaveClass(/has-selected-tag/);
    await expect.poll(() =>
      page.locator(`#selectors-container-generator option[value="${fixture.strongPartnerId}"]`).first()
        .getAttribute('data-synergy')
    ).toBe('high');
    // Owner ruling 2026-09-25: no neon green (#4cd964) on selected elements.
    await expect(select).not.toHaveCSS('color', 'rgb(76, 217, 100)');
    await expect(select).not.toHaveCSS('border-color', 'rgb(76, 217, 100)');
  });

  test('TC01-000020 Reset Locks clears locked selections', async ({ steps }) => {
    await steps.selectDropdown('lockedSupportingCharacterSelect', 'ScriptLab', {
      type: DropdownSelectType.VALUE,
      value: SIDEKICK,
    });
    await steps.expect('lockedSupportingCharacterSelect', 'ScriptLab').value.toBe(SIDEKICK);

    await steps.on('resetLocksButton', 'ScriptLab').click();

    await steps.expect('lockedSupportingCharacterSelect', 'ScriptLab').value.toBe('');
    await steps.on('resultsSection', 'ScriptLab').verifyState('hidden');
  });

  test('TC01-000030 excluding a locked element drops the lock and names it', async ({ steps }) => {
    await steps.selectDropdown('lockedSupportingCharacterSelect', 'ScriptLab', {
      type: DropdownSelectType.VALUE,
      value: SIDEKICK,
    });
    await steps.expect('lockedSupportingCharacterSelect', 'ScriptLab').value.toBe(SIDEKICK);

    await steps.selectDropdown('excludedSupportingCharacterSelect', 'ScriptLab', {
      type: DropdownSelectType.VALUE,
      value: SIDEKICK,
    });

    await steps.expect('lockedSupportingCharacterSelect', 'ScriptLab').value.toBe('');
    await steps.on('feedbackMessage', 'ScriptLab')
      .verifyTextContains('Removed from this script because they are now excluded: Sidekick.');
  });

  // Given the user is on Script Lab
  // When they move the compatibility slider to its maximum
  // Then the paired number input reflects the same value
  test('TC01-000005 compatibility slider drives the paired number input', async ({ steps }) => {
    await steps.setSliderValue('compatibilitySlider', 'ScriptLab', 5);

    await steps.expect('compatibilityInput', 'ScriptLab').value.toMatch(/^5(\.0)?$/);
  });

  // Given the target movie score controls are synced
  // When the user raises the score
  // Then the required-elements hint follows the same scoring table
  test('TC01-000006 raising the target movie score updates the required-elements hint', async ({ steps }) => {
    await steps.on('requiredTagsHint', 'ScriptLab').verifyTextContains('~5');

    await steps.setSliderValue('movieScoreSlider', 'ScriptLab', 9);

    await steps.expect('movieScoreInput', 'ScriptLab').value.toBe('9');
    await steps.on('requiredTagsHint', 'ScriptLab').verifyTextContains('~9');
  });

  test('TC01-000016 target movie score maps to the correct story-element hint', async ({ steps }) => {
    const expectedCounts = [
      [5, '~5'],
      [6, '~6'],
      [7, '~7'],
      [8, '~8'],
      [9, '~9'],
      [10, '~10'],
    ];

    for (const [score, expectedHint] of expectedCounts) {
      await steps.setSliderValue('movieScoreSlider', 'ScriptLab', score);
      await steps.expect('movieScoreInput', 'ScriptLab').value.toBe(String(score));
      await steps.on('requiredTagsHint', 'ScriptLab').verifyTextContains(expectedHint);
    }
  });

  // Given the excluded-elements section is open
  // When the user bans a supporting character
  // Then the excluded counter increments
  test('TC01-000007 banning a tag increments the excluded counter', async ({ steps }) => {
    await steps.on('excludedCountBadge', 'ScriptLab').verifyText('0');

    await steps.selectDropdown('excludedSupportingCharacterSelect', 'ScriptLab', {
      type: DropdownSelectType.VALUE,
      value: SIDEKICK,
    });

    await steps.on('excludedCountBadge', 'ScriptLab').verifyText('1');
  });

  test('TC01-000017 excluded counter uses readable black text on the danger badge', async ({ page }) => {
    const color = await page.locator('#excluded-count').evaluate(element =>
      getComputedStyle(element).color
    );

    expect(color).toBe('rgb(0, 0, 0)');
  });

  // Given a tag has been banned
  // When the user resets the bans
  // Then the counter returns to zero
  test('TC01-000008 Reset Bans clears the excluded counter', async ({ steps }) => {
    await steps.selectDropdown('excludedSupportingCharacterSelect', 'ScriptLab', {
      type: DropdownSelectType.VALUE,
      value: SIDEKICK,
    });
    await steps.on('excludedCountBadge', 'ScriptLab').verifyText('1');

    await steps.on('resetBansButton', 'ScriptLab').click();

    await steps.on('excludedCountBadge', 'ScriptLab').verifyText('0');
  });

  test('TC01-000018 Excluded Elements persist after reload', async ({ steps, page }) => {
    await steps.selectDropdown('excludedSupportingCharacterSelect', 'ScriptLab', {
      type: DropdownSelectType.VALUE,
      value: SIDEKICK,
    });
    await steps.on('excludedCountBadge', 'ScriptLab').verifyText('1');

    await expect.poll(() => page.evaluate(() => localStorage.getItem('hac.excludedTags.v1')))
      .toContain(SIDEKICK);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await steps.verifyWindowProperty('__hollywoodReady', { truthy: true });
    await steps.on('buildTab', 'Navigation').click();

    await steps.on('excludedCountBadge', 'ScriptLab').verifyText('1');
    await steps.expect('excludedSupportingCharacterSelect', 'ScriptLab').value.toBe(SIDEKICK);
  });

  test('TC01-000026 exclusion state stays consistent across tab switches', async ({ steps }) => {
    await steps.selectDropdown('excludedSupportingCharacterSelect', 'ScriptLab', {
      type: DropdownSelectType.VALUE,
      value: SIDEKICK,
    });
    await steps.on('excludedCountBadge', 'ScriptLab').verifyText('1');

    await steps.on('evaluateTab', 'Navigation').click();
    await steps.on('buildTab', 'Navigation').click();

    await steps.on('excludedCountBadge', 'ScriptLab').verifyText('1');
    await steps.expect('excludedSupportingCharacterSelect', 'ScriptLab').value.toBe(SIDEKICK);
  });


  // Given the user has generated scripts
  // When they pin the first result
  // Then it appears in the Script Library with save/load available
  test('TC01-000010 pinning a generated script populates the Script Library', async ({ steps }) => {
    await steps.on('generateButton', 'ScriptLab').click();
    await steps.on('generatedCards', 'ScriptLab').verifyCount({ greaterThan: 0 });

    await steps.on('generatedPinButtons', 'ScriptLab').first().click();

    await steps.on('pinnedSection', 'ScriptLab').verifyState('visible');
    await steps.on('pinnedCards', 'ScriptLab').verifyCount({ greaterThan: 0 });
    await steps.on('savePinnedButton', 'ScriptLab').verifyState('visible');
    await steps.on('loadPinnedButton', 'ScriptLab').verifyState('visible');
  });

  test('TC01-000023 Save Library refuses an empty script library', async ({ steps }) => {
    await steps.on('savePinnedButton', 'ScriptLab').click();

    await steps.on('pinnedFeedbackMessage', 'ScriptLab')
      .verifyTextContains('No pinned scripts to save');
  });

  test('TC01-000024 Load Library explains invalid JSON shape', async ({ steps, page }) => {
    const chooserPromise = page.waitForEvent('filechooser');

    await steps.on('loadPinnedButton', 'ScriptLab').click();
    const chooser = await chooserPromise;
    await chooser.setFiles({
      name: 'not-a-script-library.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{}'),
    });

    await steps.on('pinnedFeedbackMessage', 'ScriptLab')
      .verifyTextContains('Invalid file format');
  });

  test('TC01-000025 transferring a generated script opens Graves evaluation', async ({ steps }) => {
    await steps.on('generateButton', 'ScriptLab').click();
    await steps.on('generatedGravesButtons', 'ScriptLab').verifyCount({ greaterThan: 0 });
    await steps.on('generatedCardHeaders', 'ScriptLab').first().click();

    await steps.on('generatedGravesButtons', 'ScriptLab').first().click();

    await steps.on('panel', 'ColmanGraves').verifyState('visible');
    await steps.on('resultsSection', 'ColmanGraves').verifyState('visible');
    await steps.on('verdict', 'ColmanGraves').verifyText();
  });

  test('TC01-000027 transferring a generated script opens Marketing analysis', async ({ steps }) => {
    await steps.on('generateButton', 'ScriptLab').click();
    await steps.on('generatedMarketingButtons', 'ScriptLab').verifyCount({ greaterThan: 0 });
    await steps.on('generatedCardHeaders', 'ScriptLab').first().click();

    await steps.on('generatedMarketingButtons', 'ScriptLab').first().click();

    await steps.on('panel', 'MarketingRelease').verifyState('visible');
    await steps.on('resultsSection', 'MarketingRelease').verifyState('visible');
    await steps.on('recommendedAdvertisers', 'MarketingRelease').verifyText();
  });

  // Every category the data defines must offer a picker, not just the
  // multi-select ones. Regression: only 2 of 7 rendered.
  test('TC01-000011 every story element category offers a picker', async ({ steps }) => {
    await steps.on('lockedCategoryGroups', 'ScriptLab').verifyCount({ exactly: 7 });

    await steps.on('lockedGenreSelect', 'ScriptLab').verifyState('visible');
    await steps.on('lockedSettingSelect', 'ScriptLab').verifyState('visible');
    await steps.on('lockedProtagonistSelect', 'ScriptLab').verifyState('visible');
    await steps.on('lockedAntagonistSelect', 'ScriptLab').verifyState('visible');
    await steps.on('lockedFinaleSelect', 'ScriptLab').verifyState('visible');
  });

  // Given Supporting Character is a multi-select category
  // When the user adds another row
  // Then the category has two dropdowns in the locked context
  test('TC01-000012 adding a second Supporting Character row creates another picker', async ({ steps }) => {
    await steps.on('lockedSupportingCharacterSelect', 'ScriptLab').verifyCount({ exactly: 1 });

    await steps.on('addLockedSupportingCharacterRow', 'ScriptLab').click();

    await steps.on('lockedSupportingCharacterSelect', 'ScriptLab').verifyCount({ exactly: 2 });
  });

  // Given a category search box exists
  // When the user searches for Sidekick
  // Then only matching dropdown options stay visible
  test('TC01-000013 filtering a category search narrows selectable options', async ({ steps, page }) => {
    await steps.on('lockedSupportingCharacterSearch', 'ScriptLab').fill('Sidekick');

    await expect(page.locator('#search-supporting-character-generator-input')).toHaveClass(/has-matches/);
    const visibleOptions = await page
      .locator('#inputs-supporting-character-generator select.tag-selector option:not(:first-child)')
      .evaluateAll(options => options
        .filter(option => !option.hidden)
        .map(option => option.textContent.trim()));

    expect(visibleOptions.length).toBeGreaterThan(0);
    expect(visibleOptions.every(option => option.toLowerCase().includes('sidekick'))).toBe(true);
  });

  test('TC01-000021 adding a second excluded row creates another ban picker', async ({ steps }) => {
    await steps.on('excludedSupportingCharacterSelect', 'ScriptLab').verifyCount({ exactly: 1 });

    await steps.on('addExcludedSupportingCharacterRow', 'ScriptLab').click();

    await steps.on('excludedSupportingCharacterSelect', 'ScriptLab').verifyCount({ exactly: 2 });
  });

  // The only test that sees genuine first-run state: it builds a raw context, so
  // the fixture's "seeding already done" marker is absent.
  //
  // Both halves matter. Seeding once is the feature. NOT re-seeding is the
  // regression guard: an earlier build re-applied Starting Tags on every new
  // tab, which rebuilt the excluded selectors over a restored list and let the
  // store's MutationObserver save that rebuild back over the player's own bans.
  test('TC01-000028 Starting Tags seed once on a first run and never re-seed', async ({ browser, baseURL }) => {
    const context = await browser.newContext();
    await context.addInitScript(() => {
      window.__hollywoodReady = false;
      window.addEventListener('hollywood:ready', () => { window.__hollywoodReady = true; });
    });
    const page = await context.newPage();
    const badge = () => page.locator('#excluded-count').innerText();

    try {
      await page.goto(`${baseURL}/index.html`, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => window.__hollywoodReady === true);
      await page.locator('#tab-generator-button').click();

      // First run: the ban list arrives seeded.
      await expect.poll(async () => Number(await badge())).toBeGreaterThan(0);

      // The player clears it deliberately.
      await page.locator('#resetExcludedBansButton').click();
      await expect.poll(async () => Number(await badge())).toBe(0);

      // A new visit must respect that, not push the starter bans back over it.
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => window.__hollywoodReady === true);
      await page.locator('#tab-generator-button').click();

      await expect.poll(async () => Number(await badge())).toBe(0);
    } finally {
      await context.close();
    }
  });

  test('TC01-000022 filtering excluded category search narrows banned options', async ({ steps, page }) => {
    await steps.on('excludedSupportingCharacterSearch', 'ScriptLab').fill('Sidekick');

    await expect(page.locator('#search-supporting-character-excluded-input')).toHaveClass(/has-matches/);
    const visibleOptions = await page
      .locator('#inputs-supporting-character-excluded select.tag-selector option:not(:first-child)')
      .evaluateAll(options => options
        .filter(option => !option.hidden)
        .map(option => option.textContent.trim()));

    expect(visibleOptions.length).toBeGreaterThan(0);
    expect(visibleOptions.every(option => option.toLowerCase().includes('sidekick'))).toBe(true);
  });

  // Row ids must be numbered within their own category and context. Regression:
  // a counter shared across all six panels made these shift unpredictably.
  test('TC01-000014 tag selector row ids are numbered per category and context', async ({ steps }) => {
    await steps.expect('lockedSupportingCharacterSelect', 'ScriptLab')
      .attributes.get('id').toBe('tag-selector-row-generator-supporting-character-1-select');

    await steps.expect('lockedGenreSelect', 'ScriptLab')
      .attributes.get('id').toBe('tag-selector-row-generator-genre-1-select');

    await steps.expect('supportingCharacterSelect', 'ColmanGraves')
      .attributes.get('id').toBe('tag-selector-row-graves-supporting-character-1-select');
  });

  // Guard the locator used by the generation tests: with the results section
  // suppressed, the harness must observe hidden rendered state rather than stale
  // markup.
  test('TC01-000015 results locator observes suppressed rendered state', async ({ steps, page }) => {
    // The one raw selector in the suite. It is a mutation target, not a locator —
    // The style injection simulates a broken visual state while the assertion
    // still resolves through the repository. Keep it in step with the resultsSection entry.
    await page.addStyleTag({ content: '#results-generator { display: none !important; }' });

    await steps.on('generateButton', 'ScriptLab').click();

    await steps.on('resultsSection', 'ScriptLab').verifyState('hidden');
  });

  // The round trip, and the reason it matters: `pinnedScripts` is an in-memory
  // array with no persistence, unlike the exclusion list. A reload does not
  // merely re-render the library, it empties it — so the saved file is the only
  // way a pinned script survives at all.
  //
  // Reloading in the middle is what makes this a real assertion. Loading the
  // file back into a library that still holds those scripts proves nothing:
  // handleFileLoad merges and dedupes on uniqueId, so it would report "No new
  // unique scripts found" and leave the count unchanged, which a naive
  // save-then-load test would happily read as a pass.
  // A shared library file is not trusted: a name is shown as text, never run as
  // markup, and an entry without stats does not blank the rest of the library.
  test('TC01-000035 a library file with a hostile name and a bare entry loads safely', async ({ steps, page }) => {
    const tags = [
      { id: 'DRAMA', category: 'Genre', percent: 1 },
      { id: 'MODERN_AMERICAN_TOWN', category: 'Setting', percent: 1 },
      { id: 'PROTAGONIST_HOPELESS_ROMANTIC', category: 'Protagonist', percent: 1 },
      { id: 'ANTAGONIST_MURDERER', category: 'Antagonist', percent: 1 },
      { id: 'SUPPORTINGCHARACTER_DAMSEL_IN_DISTRESS', category: 'Supporting Character', percent: 1 },
      { id: 'THEME_LOVE_TRIANGLE', category: 'Theme & Event', percent: 1 },
      { id: 'FINALE_SWEETHEARTS_STAY_TOGETHER', category: 'Finale', percent: 1 },
    ];
    const hostileName = 'Noir "draft"><img id="injected" src="x">';
    const library = [
      { uniqueId: 'hostile-1', name: hostileName, tags, stats: { avgComp: 4, synergySum: 1, maxScriptQuality: 6, movieScore: '7.0' } },
      { uniqueId: 'bare-2', name: 'No stats', tags },
    ];

    const chooserPromise = page.waitForEvent('filechooser');
    await steps.on('loadPinnedButton', 'ScriptLab').click();
    await (await chooserPromise).setFiles({
      name: 'shared-library.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(library)),
    });

    await steps.on('pinnedFeedbackMessage', 'ScriptLab').verifyTextContains('Loaded 2 scripts');
    await steps.on('pinnedCards', 'ScriptLab').verifyCount({ exactly: 2 });
    await expect(page.locator('#injected')).toHaveCount(0);
    const names = await page.locator('#pinnedResultsList [data-role="script-name-input"]')
      .evaluateAll(inputs => inputs.map(input => input.value));
    expect(names).toEqual([hostileName, 'No stats']);
  });

  // The short id is the last six characters of the file's uniqueId. It is text,
  // never markup: an unclosed comment there hid the card's own buttons.
  test('TC01-000040 a hostile uniqueId in a library file shows as text and keeps the card whole', async ({ steps, page }) => {
    const tags = [
      { id: 'DRAMA', category: 'Genre', percent: 1 },
      { id: 'MODERN_AMERICAN_TOWN', category: 'Setting', percent: 1 },
      { id: 'PROTAGONIST_HOPELESS_ROMANTIC', category: 'Protagonist', percent: 1 },
      { id: 'ANTAGONIST_MURDERER', category: 'Antagonist', percent: 1 },
      { id: 'SUPPORTINGCHARACTER_DAMSEL_IN_DISTRESS', category: 'Supporting Character', percent: 1 },
      { id: 'THEME_LOVE_TRIANGLE', category: 'Theme & Event', percent: 1 },
      { id: 'FINALE_SWEETHEARTS_STAY_TOGETHER', category: 'Finale', percent: 1 },
    ];
    const library = [
      { uniqueId: 'zzzzz<!--', name: 'Comment id', tags, stats: { avgComp: 4, synergySum: 1, maxScriptQuality: 6, movieScore: '7.0' } },
    ];

    const chooserPromise = page.waitForEvent('filechooser');
    await steps.on('loadPinnedButton', 'ScriptLab').click();
    await (await chooserPromise).setFiles({
      name: 'shared-library.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(library)),
    });

    await steps.on('pinnedCards', 'ScriptLab').verifyCount({ exactly: 1 });
    const card = page.locator('#pinnedResultsList');
    await expect(card.locator('[data-role="script-short-id"]')).toHaveText('ID: zz<!--');
    await expect(card.locator('[data-role="script-graves-button"]')).toHaveCount(1);
    await expect(card.locator('[data-role="script-transfer-button"]')).toHaveCount(1);
  });

  test('TC01-000029 a saved library file restores pinned scripts after a reload', async ({ steps, page }) => {
    await steps.on('generateButton', 'ScriptLab').click();
    await steps.on('generatedCards', 'ScriptLab').verifyCount({ greaterThan: 0 });

    await steps.on('generatedPinButtons', 'ScriptLab').first().click();
    await steps.on('pinnedCards', 'ScriptLab').verifyCount({ exactly: 1 });

    const downloadPromise = page.waitForEvent('download');
    await steps.on('savePinnedButton', 'ScriptLab').click();
    const savedFile = await (await downloadPromise).path();

    await page.reload();
    await steps.on('buildTab', 'Navigation').click();
    await steps.on('pinnedCards', 'ScriptLab').verifyCount({ exactly: 0 });

    const chooserPromise = page.waitForEvent('filechooser');
    await steps.on('loadPinnedButton', 'ScriptLab').click();
    await (await chooserPromise).setFiles(savedFile);

    await steps.on('pinnedCards', 'ScriptLab').verifyCount({ exactly: 1 });
    await steps.on('pinnedFeedbackMessage', 'ScriptLab').verifyTextContains('Loaded 1 script.');
  });
});
