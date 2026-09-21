import { test, expect, openHollywood } from '../fixtures/base.js';
import { DropdownSelectType } from '@civitas-cerebrum/element-interactions';

const FIRST_OPTION = { type: DropdownSelectType.INDEX, index: 1 };
const SIDEKICK = 'SUPPORTINGCHARACTER_SIDEKICK';

const buildMarketingScript = async (steps) => {
  for (const select of ['genreSelect', 'supportingCharacterSelect', 'themeEventSelect']) {
    await steps.selectDropdown(select, 'MarketingRelease', FIRST_OPTION);
  }
};

const screenings = async (steps, elementName) => {
  const text = await steps.on(elementName, 'MarketingRelease').getText();
  return Number(text.replace(/[^0-9]/g, ''));
};

test.describe('Marketing and Release — distribution calculator', () => {
  test.beforeEach(async ({ steps }) => {
    await openHollywood(steps);
    // This suite drives the distribution toggles and sliders, whose listeners are
    // bound late in initializeApp — long after the selectors exist.
    await steps.on('marketTab', 'Navigation').click();
  });

  // Given the Market tab is open
  // Then the distribution calculator is available before any analysis
  test('TC04-000001 the distribution calculator is shown before any analysis', async ({ steps }) => {
    await steps.on('panel', 'MarketingRelease').verifyState('visible');
    await steps.on('distributionCard', 'MarketingRelease').verifyState('visible');
    await steps.on('resultsSection', 'MarketingRelease').verifyState('hidden');
  });

  // Week cards must be addressable. Regression: they carried no id at all.
  test('TC04-000002 week cards expose stable ids and their week number', async ({ steps }) => {
    await steps.on('weekCards', 'MarketingRelease').verifyCount({ exactly: 8 });

    await steps.on('weekOneCard', 'MarketingRelease').verifyState('visible');
    await steps.on('weekEightCard', 'MarketingRelease').verifyState('visible');

    await steps.expect('weekOneCard', 'MarketingRelease').attributes.get('data-week').toBe('1');
    await steps.expect('weekEightCard', 'MarketingRelease').attributes.get('data-week').toBe('8');
    await steps.on('weekOneValue', 'MarketingRelease').verifyText();
  });

  // Given the default commercial score
  // Then attendance falls across the eight-week run
  test('TC04-000003 screening projections decline across the run', async ({ steps }) => {
    const week1 = await screenings(steps, 'weekOneValue');
    const week8 = await screenings(steps, 'weekEightValue');

    expect(week1).toBeGreaterThan(week8);
  });

  test('TC04-000004 screening projections follow the extracted commercial-only grid', async ({ steps }) => {
    const values = await steps.getAll('weekCards', 'MarketingRelease', { extractAttribute: 'data-demand' });

    expect(values.map(Number)).toEqual([
      10000,
      5000,
      4000,
      3200,
      2560,
      2048,
      1638,
      1310,
    ]);
  });

  // Given the user raises the target commercial score
  // Then the calculator echoes it and recalculates
  test('TC04-000005 the calculator follows the commercial score', async ({ steps }) => {
    const before = await screenings(steps, 'weekOneValue');

    await steps.setSliderValue('commercialScoreSlider', 'MarketingRelease', 8);

    await steps.on('distributionCommercialScore', 'MarketingRelease').verifyTextContains('8');
    // Echoing the label is not the same as recalculating the grid.
    await expect
      .poll(async () => screenings(steps, 'weekOneValue'))
      .not.toBe(before);
  });

  test('TC04-000006 setting the movie scores updates their paired inputs', async ({ steps }) => {
    await steps.setSliderValue('commercialScoreSlider', 'MarketingRelease', 8);
    await steps.setSliderValue('artisticScoreSlider', 'MarketingRelease', 3);

    await steps.expect('commercialScoreInput', 'MarketingRelease').value.toMatch(/^8(\.0)?$/);
    await steps.expect('artisticScoreInput', 'MarketingRelease').value.toMatch(/^3(\.0)?$/);
  });

  test('TC04-000016 typing movie scores updates sliders and distribution', async ({ steps }) => {
    const weekOneBefore = await screenings(steps, 'weekOneValue');

    await steps.on('commercialScoreInput', 'MarketingRelease').fill('7.5');
    await steps.on('artisticScoreInput', 'MarketingRelease').fill('2.5');

    await steps.expect('commercialScoreSlider', 'MarketingRelease').value.toBe('7.5');
    await steps.expect('artisticScoreSlider', 'MarketingRelease').value.toBe('2.5');
    await steps.on('distributionCommercialScore', 'MarketingRelease').verifyTextContains('7.5');
    await expect
      .poll(async () => screenings(steps, 'weekOneValue'))
      .not.toBe(weekOneBefore);
  });

  const attr = async (steps, element, name) =>
    Number(await steps.on(element, 'MarketingRelease').getAttribute(name));

  test('TC04-000007 owning more theatres shifts the split without moving demand', async ({ steps }) => {
    const demandBefore = await screenings(steps, 'weekOneValue');
    const rentedBefore = await attr(steps, 'weekOneCard', 'data-rented');

    await steps.on('ownedScreeningsInput', 'MarketingRelease').fill('5000');

    await expect
      .poll(async () => attr(steps, 'weekOneCard', 'data-rented'))
      .toBeLessThan(rentedBefore);

    // Demand belongs to the film. Owning more theatres changes who supplies the
    // screenings, never how many the audience wants. This assertion is the whole
    // reason capacity is subtracted after the weekly modifiers rather than before.
    expect(await screenings(steps, 'weekOneValue')).toBe(demandBefore);
  });

  test('TC04-000011 every week splits its demand between owned and rented screenings', async ({ steps }) => {
    const read = name =>
      steps.getAll('weekCards', 'MarketingRelease', { extractAttribute: name });

    const [demand, fromOwned, rented] = await Promise.all([
      read('data-demand'), read('data-from-owned'), read('data-rented'),
    ]);

    expect(demand).toHaveLength(8);
    demand.forEach((total, i) => {
      expect(Number(fromOwned[i]) + Number(rented[i])).toBe(Number(total));
    });
  });

  test('TC04-000012 a late week inside owned capacity reports spare screens, not a rental', async ({ steps }) => {
    // At the default score the audience has fallen below the theatres the player
    // already owns by week 8, so nothing needs renting. The old maths decayed the
    // shortfall instead of the audience and still demanded screenings here.
    expect(await attr(steps, 'weekEightCard', 'data-rented')).toBe(0);
    expect(await attr(steps, 'weekEightCard', 'data-owned-spare')).toBeGreaterThan(0);

    await steps.on('weekEightSplit', 'MarketingRelease').verifyTextContains('spare');
    await steps.on('weekOneSplit', 'MarketingRelease').verifyTextContains('rent');
  });

  test('TC04-000008 the Striking Image bonus raises the week one projection', async ({ steps }) => {
    const before = await screenings(steps, 'weekOneValue');

    await steps.on('strikingImageToggle', 'MarketingRelease').check();

    await expect
      .poll(async () => screenings(steps, 'weekOneValue'))
      .toBeGreaterThan(before);
  });

  test('TC04-000009 the Artistic Ability bonus raises the week one projection', async ({ steps }) => {
    const before = await screenings(steps, 'weekOneValue');

    await steps.on('artisticAbilityToggle', 'MarketingRelease').check();

    await expect
      .poll(async () => screenings(steps, 'weekOneValue'))
      .toBeGreaterThan(before);
  });

  test('TC04-000013 the Behemoth policy changes week one and commercial-gated decay', async ({ steps }) => {
    await steps.setSliderValue('commercialScoreSlider', 'MarketingRelease', 8.5);
    const week1Before = await attr(steps, 'weekOneCard', 'data-demand');
    const week3Before = Number((await steps.getAll('weekCards', 'MarketingRelease', {
      extractAttribute: 'data-demand',
    }))[2]);

    await steps.on('behemothToggle', 'MarketingRelease').check();

    await expect.poll(async () => attr(steps, 'weekOneCard', 'data-demand'))
      .toBe(Math.ceil(week1Before * 1.25));
    expect(Number((await steps.getAll('weekCards', 'MarketingRelease', {
      extractAttribute: 'data-demand',
    }))[2])).toBe(week3Before);

    await steps.on('behemothToggle', 'MarketingRelease').uncheck();
    await steps.setSliderValue('commercialScoreSlider', 'MarketingRelease', 10);
    const week3Normal = Number((await steps.getAll('weekCards', 'MarketingRelease', {
      extractAttribute: 'data-demand',
    }))[2]);

    await steps.on('behemothToggle', 'MarketingRelease').check();

    const week3Behemoth = Number((await steps.getAll('weekCards', 'MarketingRelease', {
      extractAttribute: 'data-demand',
    }))[2]);
    expect(week3Behemoth).toBeGreaterThan(week3Normal);
  });

  test('TC04-000014 the Boutique policy slows later weeks only above artistic score 9', async ({ steps }) => {
    await steps.setSliderValue('artisticScoreSlider', 'MarketingRelease', 10);
    const week1Before = await attr(steps, 'weekOneCard', 'data-demand');
    const normalValues = (await steps.getAll('weekCards', 'MarketingRelease', {
      extractAttribute: 'data-demand',
    })).map(Number);

    await steps.on('boutiqueToggle', 'MarketingRelease').check();

    const boutiqueValues = (await steps.getAll('weekCards', 'MarketingRelease', {
      extractAttribute: 'data-demand',
    })).map(Number);
    expect(boutiqueValues[0]).toBe(week1Before);
    expect(boutiqueValues[1]).toBe(normalValues[1]);
    expect(boutiqueValues[2]).toBeGreaterThan(normalValues[2]);

    await steps.setSliderValue('artisticScoreSlider', 'MarketingRelease', 9);

    const thresholdValues = (await steps.getAll('weekCards', 'MarketingRelease', {
      extractAttribute: 'data-demand',
    })).map(Number);
    expect(thresholdValues[2]).toBe(normalValues[2]);
  });

  test('TC04-000015 Behemoth and Boutique stack their slower decay when both gates qualify', async ({ steps }) => {
    await steps.setSliderValue('commercialScoreSlider', 'MarketingRelease', 10);
    await steps.setSliderValue('artisticScoreSlider', 'MarketingRelease', 10);
    await steps.on('behemothToggle', 'MarketingRelease').check();
    await steps.on('boutiqueToggle', 'MarketingRelease').check();

    const values = (await steps.getAll('weekCards', 'MarketingRelease', {
      extractAttribute: 'data-demand',
    })).map(Number);

    expect(values[0]).toBe(25000);
    expect(values[1]).toBe(10000);
    expect(values[2]).toBe(9000);
  });

  // Factory Policy halves the pre-release run. Every other distribution toggle
  // carries a numbered test in this file; this one shipped with none, and
  // domStructure.test.js did not list it either, so the control could be
  // deleted outright with the suite still green.
  const analysed = async (steps) => {
    await buildMarketingScript(steps);
    await steps.on('analyzeScriptButton', 'MarketingRelease').click();
    await steps.on('resultsSection', 'MarketingRelease').verifyState('visible');
  };

  test('TC04-000021 Factory Policy halves the pre-release run and the total', async ({ steps }) => {
    await analysed(steps);
    await steps.on('campaignPreRelease', 'MarketingRelease').verifyText('6 wks');
    await steps.on('campaignTotalWeeks', 'MarketingRelease').verifyText('10 Weeks');

    await steps.on('factoryPolicyToggle', 'MarketingRelease').check();

    await steps.on('campaignPreRelease', 'MarketingRelease').verifyText('3 wks');
    await steps.on('campaignTotalWeeks', 'MarketingRelease').verifyText('7 Weeks');
  });

  test('TC04-000022 switching Factory Policy back off restores the six-week run', async ({ steps }) => {
    await analysed(steps);
    await steps.on('factoryPolicyToggle', 'MarketingRelease').check();
    await steps.on('campaignPreRelease', 'MarketingRelease').verifyText('3 wks');

    await steps.on('factoryPolicyToggle', 'MarketingRelease').uncheck();

    await steps.on('campaignPreRelease', 'MarketingRelease').verifyText('6 wks');
    await steps.on('campaignTotalWeeks', 'MarketingRelease').verifyText('10 Weeks');
  });

  // Pre-release is the only stretch the policy touches: release is fixed by the
  // game and post-release is gated on the commercial score, not on this toggle.
  test('TC04-000023 Factory Policy leaves release and post-release untouched', async ({ steps }) => {
    await analysed(steps);
    await steps.on('factoryPolicyToggle', 'MarketingRelease').check();

    await steps.on('campaignRelease', 'MarketingRelease').verifyText('4 wks');
    await steps.on('campaignPostRelease', 'MarketingRelease').verifyText('0 wks');
  });

  // Regression: the toggle used to re-run the whole analysis, whose last act is
  // scrollIntoView on the results — which threw the player ~1400px away from the
  // switch they had just clicked.
  test('TC04-000024 toggling Factory Policy does not scroll the page away', async ({ steps, page }) => {
    await analysed(steps);
    // Bring the switch itself into view, not its (very tall) panel: Playwright
    // auto-scrolls to an off-screen target before clicking, and that scroll
    // would otherwise be measured as if the app had caused it.
    await page.locator('#factoryPolicyToggle').scrollIntoViewIfNeeded();
    const before = await page.evaluate(() => window.scrollY);

    await steps.on('factoryPolicyToggle', 'MarketingRelease').check();
    await steps.on('campaignPreRelease', 'MarketingRelease').verifyText('3 wks');

    const after = await page.evaluate(() => window.scrollY);
    expect(Math.abs(after - before)).toBeLessThan(100);
  });

  // The switch shipped with two invented classes that no stylesheet defined, so
  // it rendered unstyled: stacked under the heading, and with no ON colour while
  // every sibling toggle has one. Both are asserted here so the CSS cannot be
  // dropped again silently.
  test('TC04-000025 the Factory Policy switch sits on the heading row', async ({ steps, page }) => {
    await analysed(steps);

    const sameRow = await page.evaluate(() => {
      const panel = document.getElementById('campaign-duration-panel');
      const h = panel.querySelector('h3').getBoundingClientRect();
      const t = panel.querySelector('.toggle-wrapper').getBoundingClientRect();
      return Math.abs(h.top - t.top) < 25;
    });

    expect(sameRow).toBe(true);
  });

  test('TC04-000026 the Factory Policy switch changes colour when it is on', async ({ steps, page }) => {
    await analysed(steps);
    const trackColour = () => page.evaluate(() =>
      getComputedStyle(document.getElementById('factoryPolicyToggle').nextElementSibling).backgroundColor);

    const off = await trackColour();
    await steps.on('factoryPolicyToggle', 'MarketingRelease').check();
    await steps.on('campaignPreRelease', 'MarketingRelease').verifyText('3 wks');

    await expect.poll(trackColour).not.toBe(off);
  });

  test('TC04-000010 analysing a script produces a marketing profile', async ({ steps }) => {
    await steps.setSliderValue('commercialScoreSlider', 'MarketingRelease', 8);
    await steps.setSliderValue('artisticScoreSlider', 'MarketingRelease', 3);
    await buildMarketingScript(steps);

    await steps.on('analyzeScriptButton', 'MarketingRelease').click();

    await steps.on('resultsSection', 'MarketingRelease').verifyState('visible');
    await steps.on('targetAudience', 'MarketingRelease').verifyText();
    await steps.on('holidayRelease', 'MarketingRelease').verifyText();
    await steps.on('movieLean', 'MarketingRelease').verifyText('Commercial');
    await steps.on('recommendedAdvertisers', 'MarketingRelease').verifyTextContains('Top Pick');
    await steps.on('campaignDuration', 'MarketingRelease').verifyTextContains('Total Duration');
  });

  // The holiday rows only render once a script has been analysed. These drive the
  // real control; the suite previously asserted only that the holiday panel was
  // non-empty, so an unwired row went unnoticed. Verified by mutation: removing
  // the holiday term from weekOneBoost fails both of these.
  //
  // LIMIT, stated so nobody reads more into these than they prove: the expected
  // rise is derived from the percentage the row itself advertises, so these check
  // that the label and the grid AGREE, not that the figure is right. A regression
  // from the mean to the sum moves both together and passes — confirmed by
  // mutation. Pinning the mean needs a fixture with a known audience, and
  // holidayBonusFor's mean-not-sum rule is covered at unit level in
  // tests/holiday-release.test.js:35.
  test('TC04-000019 selecting a holiday lifts week one by the bonus it advertises', async ({ steps }) => {
    await steps.setSliderValue('commercialScoreSlider', 'MarketingRelease', 8);
    await buildMarketingScript(steps);
    await steps.on('analyzeScriptButton', 'MarketingRelease').click();
    await steps.on('resultsSection', 'MarketingRelease').verifyState('visible');

    // Label reads "+18.5% week 1" — take only the figure before the %, or the
    // trailing week number joins the percentage and skews the expectation.
    const boostLabel = await steps.on('holidayTopPickBoost', 'MarketingRelease').getText();
    const bonusPercent = Number(boostLabel.match(/([\d.]+)\s*%/)[1]);
    expect(bonusPercent).toBeGreaterThan(0);

    const weekTwoDemand = async () => Number((await steps.getAll('weekCards', 'MarketingRelease', {
      extractAttribute: 'data-demand',
    }))[1]);

    const week1Before = await attr(steps, 'weekOneCard', 'data-demand');
    const week2Before = await weekTwoDemand();

    await steps.on('holidayTopPick', 'MarketingRelease').click();

    await expect.poll(async () => attr(steps, 'weekOneCard', 'data-demand'))
      .toBe(Math.ceil(week1Before * (1 + bonusPercent / 100)));
    // Week 2 is seeded from the commercial score and must never move.
    expect(await weekTwoDemand()).toBe(week2Before);
  });

  test('TC04-000020 selecting the active holiday again restores the base curve', async ({ steps }) => {
    await steps.setSliderValue('commercialScoreSlider', 'MarketingRelease', 8);
    await buildMarketingScript(steps);
    await steps.on('analyzeScriptButton', 'MarketingRelease').click();
    await steps.on('resultsSection', 'MarketingRelease').verifyState('visible');

    const week1Base = await attr(steps, 'weekOneCard', 'data-demand');

    await steps.on('holidayTopPick', 'MarketingRelease').click();
    await expect.poll(async () => attr(steps, 'weekOneCard', 'data-demand'))
      .toBeGreaterThan(week1Base);

    await steps.on('holidayTopPick', 'MarketingRelease').click();

    await expect.poll(async () => attr(steps, 'weekOneCard', 'data-demand'))
      .toBe(week1Base);
  });

  test('TC04-000017 saving an analysed script adds it to Script Library', async ({ steps }) => {
    await buildMarketingScript(steps);
    await steps.on('analyzeScriptButton', 'MarketingRelease').click();
    await steps.on('resultsSection', 'MarketingRelease').verifyState('visible');

    await steps.on('saveToLibraryButton', 'MarketingRelease').click();

    await steps.on('feedbackMessage', 'MarketingRelease')
      .verifyTextContains('Saved to your script library');
    await steps.on('buildTab', 'Navigation').click();
    await steps.on('pinnedSection', 'ScriptLab').verifyState('visible');
    await steps.on('pinnedCards', 'ScriptLab').verifyCount({ greaterThan: 0 });
  });

  test('TC04-000018 resetting clears the marketing selection', async ({ steps }) => {
    await buildMarketingScript(steps);
    await steps.expect('genreSelect', 'MarketingRelease').value.not.toBe('');

    await steps.on('resetButton', 'MarketingRelease').click();

    await steps.expect('genreSelect', 'MarketingRelease').value.toBe('');
    await steps.on('resultsSection', 'MarketingRelease').verifyState('hidden');
  });
});

test.describe('Marketing and Release — Build for Target', () => {
  test.beforeEach(async ({ steps }) => {
    await openHollywood(steps);
    await steps.on('marketTab', 'Navigation').click();
    await steps.on('buildForTargetModeButton', 'MarketingRelease').click();
    await steps.on('allTagSelects', 'BuildForTarget').waitForState('visible');
  });

  test('TC05-000001 Build for Target offers audiences, advertisers and tag pickers', async ({ steps }) => {
    await steps.on('panel', 'BuildForTarget').verifyState('visible');

    await steps.on('audienceCheckboxes', 'BuildForTarget').verifyCount({ greaterThan: 0 });
    await steps.on('advertiserCheckboxes', 'BuildForTarget').verifyCount({ greaterThan: 0 });
    await steps.on('allTagSelects', 'BuildForTarget').verifyCount({ exactly: 7 });
    await steps.on('resultsPanel', 'BuildForTarget').verifyState('hidden');
  });

  // Given neither an audience nor an advertiser is chosen
  // When the user searches for combinations
  // Then every agency is in scope and combinations are still produced
  test('TC05-000002 searching with no audience or advertiser ranks against every agency', async ({ steps }) => {
    await steps.on('findCombinationsButton', 'BuildForTarget').click();

    await steps.on('resultsPanel', 'BuildForTarget').verifyState('visible');
    await steps.on('resultsList', 'BuildForTarget').verifyText();
  });

  // Given an audience is chosen
  // When the user searches for combinations
  // Then results are produced
  test('TC05-000003 choosing an audience produces top combinations', async ({ steps }) => {
    await steps.on('audienceCheckboxes', 'BuildForTarget').first().check();

    await steps.on('findCombinationsButton', 'BuildForTarget').click();

    await steps.on('resultsPanel', 'BuildForTarget').verifyState('visible');
    await steps.on('resultsList', 'BuildForTarget').verifyText();
  });

  test('TC05-000004 narrowing the search with an optional tag keeps that tag in results', async ({ steps }) => {
    await steps.on('audienceCheckboxes', 'BuildForTarget').first().check();
    await steps.selectDropdown('supportingCharacterSelect', 'BuildForTarget', {
      type: DropdownSelectType.VALUE,
      value: SIDEKICK,
    });

    await steps.on('findCombinationsButton', 'BuildForTarget').click();

    await steps.on('resultsPanel', 'BuildForTarget').verifyState('visible');
    await steps.on('resultsList', 'BuildForTarget').verifyTextContains('Sidekick');
  });

  // Regression: one pick per category used to be refused, because Genre and
  // Setting were counted against the story element budget. They are structural
  // picks every script carries, so seven selections is only five story elements.
  test('TC05-000005 one pick per category is accepted, not refused', async ({ steps }) => {
    await steps.on('audienceCheckboxes', 'BuildForTarget').first().check();
    for (const select of [
      'genreSelect',
      'settingSelect',
      'protagonistSelect',
      'antagonistSelect',
      'supportingCharacterSelect',
      'themeEventSelect',
      'finaleSelect',
    ]) {
      await steps.selectDropdown(select, 'BuildForTarget', FIRST_OPTION);
    }

    await steps.on('findCombinationsButton', 'BuildForTarget').click();

    await steps.on('resultsPanel', 'BuildForTarget').verifyState('visible');
    await steps.on('resultsList', 'BuildForTarget').verifyText();
  });

  test('TC05-000006 selecting an advertiser targets that agency directly', async ({ steps, page }) => {
    const advertiserName = (await page
      .locator('#targeted-advertiser-checkboxes .targeted-checkbox-item')
      .first()
      .innerText()).trim();

    await steps.on('advertiserCheckboxes', 'BuildForTarget').first().check();
    await steps.on('findCombinationsButton', 'BuildForTarget').click();

    await steps.on('checkedAdvertiserCheckboxes', 'BuildForTarget').verifyCount({ exactly: 1 });
    await steps.on('resultsPanel', 'BuildForTarget').verifyState('visible');
    await steps.on('resultsList', 'BuildForTarget').verifyTextContains(advertiserName);
  });

  test('TC05-000007 switching back to Analyze Script shows the marketing panel', async ({ steps }) => {
    await steps.on('analyzeScriptModeButton', 'BuildForTarget').click();

    await steps.on('panel', 'MarketingRelease').verifyState('visible');
    await steps.on('panel', 'BuildForTarget').verifyState('hidden');
  });

  // Given the user has made selections
  // When they reset
  // Then the panel returns to its empty state
  test('TC05-000008 resetting clears audiences and hides results', async ({ steps }) => {
    await steps.on('audienceCheckboxes', 'BuildForTarget').first().check();
    await steps.on('checkedAudienceCheckboxes', 'BuildForTarget').verifyCount({ exactly: 1 });
    await steps.on('findCombinationsButton', 'BuildForTarget').click();
    await steps.on('resultsPanel', 'BuildForTarget').verifyState('visible');

    await steps.on('resetButton', 'BuildForTarget').click();

    await steps.on('resultsPanel', 'BuildForTarget').verifyState('hidden');
    // The checkbox stays visible either way; what reset must do is uncheck it.
    await steps.on('checkedAudienceCheckboxes', 'BuildForTarget').verifyCount({ exactly: 0 });
  });

  // ---------------------------------------------------------------------
  // Restored coverage. These behaviours lost their only tests when
  // tests/e2e/find-top-combinations.spec.js was deleted in 2ce5229, while the
  // feature itself stayed in the product. Rewritten against the current
  // story-element-budget model rather than the old fixed-size search.
  // ---------------------------------------------------------------------



  // Given combinations are listed
  // Then they descend by advertiser fit, best first
  test('TC05-000014 combinations are ranked by descending advertiser fit', async ({ steps }) => {
    await steps.on('audienceCheckboxes', 'BuildForTarget').first().check();

    await steps.on('findCombinationsButton', 'BuildForTarget').click();

    await steps.on('resultsPanel', 'BuildForTarget').verifyState('visible');
    await steps.on('combinationCards', 'BuildForTarget').verifyCount({ greaterThan: 1 });

    const first = Number(await steps.on('combinationScores', 'BuildForTarget').first().getText());
    const second = Number(await steps.on('combinationScores', 'BuildForTarget').nth(1).getText());

    expect(Number.isNaN(first)).toBe(false);
    expect(Number.isNaN(second)).toBe(false);
    expect(first).toBeGreaterThanOrEqual(second);
  });
});
