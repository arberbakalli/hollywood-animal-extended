import { test, expect, openHollywood } from '../fixtures/base.js';

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
});
