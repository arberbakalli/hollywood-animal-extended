import { test, expect, openHollywood } from '../fixtures/base.js';
import { STARTING_BAN_COUNT } from '../fixtures/startingDeck.js';

/**
 * Exclusions must survive a reload intact.
 *
 * The ban list is the app's single source of truth for what a script may use,
 * and it is rebuilt from localStorage on every boot. Restoring fewer rows than
 * were stored is not merely a display fault: a MutationObserver on the excluded
 * container saves the DOM back to storage on the next mutation, so a short
 * restore is written over the good list and the missing bans are gone for good.
 *
 * The specific fault this pins: Setting, Protagonist, Antagonist and Finale are
 * single-select when authoring a script, but the ban list has no such limit —
 * a player may ban every Setting in the game. Restore has to honour the
 * exclusion context's own cardinality, not the script builder's.
 */
test.describe('Exclusion persistence', () => {
  const storedCount = (page) =>
    page.evaluate(() => {
      try {
        return JSON.parse(localStorage.getItem('hac.excludedTags.v1') || '[]').length;
      } catch (error) {
        return -1;
      }
    });

  const renderedCount = (page) =>
    page.evaluate(() => {
      const container = document.getElementById('selectors-container-excluded');
      if (!container) return -1;
      return [...container.querySelectorAll('select.tag-selector')].filter(select => select.value).length;
    });

  const applyStartingTags = async (steps, page) => {
    await steps.on('buildTab', 'Navigation').click();
    await steps.on('applyStartingTagsButton', 'ScriptLab').click();
    // The profile inserts its rows from a setTimeout, so wait for the list to
    // stop growing rather than guessing at a fixed delay.
    await expect.poll(() => storedCount(page)).toBeGreaterThan(0);
    let last = -1;
    await expect
      .poll(async () => {
        const now = await storedCount(page);
        const settled = now === last;
        last = now;
        return settled;
      })
      .toBe(true);
  };

  test.beforeEach(async ({ steps }) => {
    await openHollywood(steps);
  });

  test('TC09-000015 every stored exclusion is restored after a reload', async ({ steps, page }) => {
    await applyStartingTags(steps, page);

    const beforeStored = await storedCount(page);
    const beforeRendered = await renderedCount(page);
    expect(beforeStored).toBeGreaterThan(100);
    expect(beforeRendered).toBe(beforeStored);

    await steps.refresh();
    await steps.verifyWindowProperty('__hollywoodReady', { truthy: true });

    // Every stored ban must come back as a row. Restoring fewer means the
    // single-select cardinality of the script builder leaked into the ban list.
    expect(await renderedCount(page)).toBe(beforeStored);
  });

  test('TC09-000016 a reload does not shrink the stored list', async ({ steps, page }) => {
    await applyStartingTags(steps, page);
    const beforeStored = await storedCount(page);

    await steps.refresh();
    await steps.verifyWindowProperty('__hollywoodReady', { truthy: true });

    // Navigating between tabs mutates the excluded container, which is what
    // triggers the save. If restore was short, this is where the good list gets
    // overwritten by the partial one.
    await steps.on('evaluateTab', 'Navigation').click();
    await steps.on('buildTab', 'Navigation').click();

    await expect.poll(() => storedCount(page)).toBe(beforeStored);
  });

  test('TC09-000017 bans in single-select categories survive a reload', async ({ steps, page }) => {
    await applyStartingTags(steps, page);

    const countsByCategory = () =>
      page.evaluate(() => {
        const stored = JSON.parse(localStorage.getItem('hac.excludedTags.v1') || '[]');
        return stored.reduce((acc, tag) => {
          acc[tag.category] = (acc[tag.category] || 0) + 1;
          return acc;
        }, {});
      });

    const before = await countsByCategory();
    // The starter profile bans several of each of these, and none of them is a
    // multi-select category in the script builder — exactly the ones that were
    // being dropped.
    for (const category of ['Setting', 'Protagonist', 'Antagonist', 'Finale']) {
      expect(before[category], `${category} should have more than one starter ban`).toBeGreaterThan(1);
    }

    await steps.refresh();
    await steps.verifyWindowProperty('__hollywoodReady', { truthy: true });

    const rendered = await page.evaluate(() => {
      const container = document.getElementById('selectors-container-excluded');
      return [...container.querySelectorAll('select.tag-selector')]
        .filter(select => select.value)
        .reduce((acc, select) => {
          const group = select.closest('[data-category]');
          const category = group ? group.dataset.category : 'unknown';
          acc[category] = (acc[category] || 0) + 1;
          return acc;
        }, {});
    });

    for (const category of ['Setting', 'Protagonist', 'Antagonist', 'Finale']) {
      expect(rendered[category], `${category} bans lost on reload`).toBe(before[category]);
    }
  });

  // A player who saved bans before the seeded marker existed has a list in
  // storage and no marker. The first-run gate read the marker alone, so it
  // treated that visit as a first run and wrote the starter bans over the
  // player's own list.
  test('TC09-000023 a saved ban list survives a visit without the seeded marker', async ({ browser, baseURL }) => {
    const saved = [
      { id: 'SUPPORTINGCHARACTER_SIDEKICK', category: 'Supporting Character' },
      { id: 'FINALE_SWEETHEARTS_STAY_TOGETHER', category: 'Finale' },
    ];
    const context = await browser.newContext();
    await context.addInitScript(() => {
      window.__hollywoodReady = false;
      window.addEventListener('hollywood:ready', () => { window.__hollywoodReady = true; });
    });
    // Once per tab, so the reload below sees what the app itself stored.
    await context.addInitScript(list => {
      if (sessionStorage.getItem('tc09-000023-prepared')) return;
      sessionStorage.setItem('tc09-000023-prepared', 'true');
      localStorage.clear();
      localStorage.setItem('hac.excludedTags.v1', JSON.stringify(list));
    }, saved);
    const page = await context.newPage();
    const storedIds = () => page.evaluate(() =>
      JSON.parse(localStorage.getItem('hac.excludedTags.v1') || '[]').map(tag => tag.id).sort());
    const open = async () => {
      await page.waitForFunction(() => window.__hollywoodReady === true);
      await page.locator('#tab-generator-button').click();
    };

    try {
      await page.goto(`${baseURL}/index.html`, { waitUntil: 'domcontentloaded' });
      await open();
      await expect.poll(() => page.locator('#excluded-count').innerText()).toBe('2');
      expect(await storedIds()).toEqual(saved.map(tag => tag.id).sort());

      // The visit records that the list exists, so later visits never seed.
      await page.reload({ waitUntil: 'domcontentloaded' });
      await open();
      await expect.poll(() => page.locator('#excluded-count').innerText()).toBe('2');
      expect(await storedIds()).toEqual(saved.map(tag => tag.id).sort());
      expect(await page.evaluate(() => localStorage.getItem('hac.startingTagsSeeded.v1'))).toBe('true');
    } finally {
      await context.close();
    }
  });

  const loadProfile = async (page, profile) => {
    const chooserPromise = page.waitForEvent('filechooser');
    await page.locator('#loadExclusionProfileButton').click();
    await (await chooserPromise).setFiles({
      name: 'profile.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(profile)),
    });
  };

  // A profile file is checked before it touches the list. Load Profile used to
  // reset the list first and then fail on the bad entry, and the store's
  // observer saved the empty list over the player's bans.
  test('TC09-000024 an invalid exclusion profile leaves the current bans intact', async ({ steps, page }) => {
    await applyStartingTags(steps, page);
    const before = await storedCount(page);
    expect(before).toBe(STARTING_BAN_COUNT);

    const invalidProfiles = [
      { exclusions: [{ id: 'DRAMA', category: 'Genre' }, null] },
      { exclusions: [{ id: '__proto__', category: 'Genre' }] },
      { exclusions: [{ id: 'NOT_A_REAL_ELEMENT', category: 'Genre' }] },
      { exclusions: [{ id: 'DRAMA', category: 'Finale' }] },
    ];

    for (const profile of invalidProfiles) {
      const dialog = page.waitForEvent('dialog');
      await loadProfile(page, profile);
      const message = await dialog;
      expect(message.message(), JSON.stringify(profile)).toContain('profile');
      await message.accept();

      await expect.poll(() => storedCount(page), { message: JSON.stringify(profile) }).toBe(before);
      expect(await renderedCount(page), JSON.stringify(profile)).toBe(before);
      await expect(page.locator('#excluded-count')).toHaveText(String(before));
    }
  });

  // The positive half, so the check above cannot pass by refusing every file.
  test('TC09-000025 a saved exclusion profile loads back after the bans are reset', async ({ steps, page }) => {
    await applyStartingTags(steps, page);
    const before = await storedCount(page);

    const downloadPromise = page.waitForEvent('download');
    await page.locator('#saveExclusionProfileButton').click();
    const savedFile = await (await downloadPromise).path();

    await page.locator('#resetExcludedBansButton').click();
    await expect.poll(() => storedCount(page)).toBe(0);

    const chooserPromise = page.waitForEvent('filechooser');
    await page.locator('#loadExclusionProfileButton').click();
    await (await chooserPromise).setFiles(savedFile);

    await expect.poll(() => storedCount(page)).toBe(before);
    expect(await renderedCount(page)).toBe(before);
  });
});
