import { test, expect, openHollywood } from '../fixtures/base.js';

// Owner report 2026-09-30: after a Swap, the Colman Graves Locked Elements builder (formerly "Submit Script") showed
// Treasure Hunt and Long Journey, and Evil Transformation was gone. It was
// never reproduced. Owner request 2026-10-01: make it a test, for every
// category that holds several picks, so a row can never vanish unnoticed.
//
// Each test builds a script with three picks in one multi-row category, then
// presses every Add and Swap button in all three Best Matches tabs, one at a
// time from a fresh build, and then one more action after the first. After
// every click: the incoming element is in the script, nothing vanished except
// the element a Swap names, no element is there twice, and an Add grows the
// script by exactly one.

const BASE = {
  genre: ['ADVENTURE'], setting: ['FANTASY_KINGDOM'], protagonist: ['PROTAGONIST_CYNIC'],
  antagonist: ['ANTAGONIST_EVIL_MONSTER'], finale: ['FINALE_PROTAGONIST_FINDS_TREASURE'],
  'theme-event': ['THEME_TREASURE_HUNT'],
};

const GROUPS = {
  'Theme & Event': { 'theme-event': ['THEME_TREASURE_HUNT', 'THEME_LONG_JOURNEY', 'THEME_EVIL_TRANSFORMATION'] },
  'Supporting Character': { 'supporting-character': ['SUPPORTINGCHARACTER_SIDEKICK', 'SUPPORTINGCHARACTER_LOVE_INTEREST', 'SUPPORTINGCHARACTER_MENTOR'] },
  Genre: { genre: ['ADVENTURE', 'ACTION', 'DRAMA'] },
};

for (const [group, rows] of Object.entries(GROUPS)) {
  test(`TC03-000059 ${group}: no Best Matches action loses, duplicates or adds a stray element`, async ({ steps, page }) => {
    test.setTimeout(240000);
    await openHollywood(steps);
    await steps.setSliderValue('elementPoolSlider', 'Navigation', 10);
    await steps.on('evaluateTab', 'Navigation').click();

    const result = await page.evaluate(async (script) => {
      const wait = ms => new Promise(r => setTimeout(r, ms));
      const ids = () => [...document.querySelectorAll('#selectors-container-graves select.tag-selector')]
        .map(s => s.value).filter(Boolean);
      async function build() {
        document.getElementById('resetGravesButton').click(); await wait(100);
        for (const [slug, values] of Object.entries(script)) {
          const add = document.getElementById(`add-${slug}-graves-button`);
          while (add && document.querySelectorAll(`#inputs-${slug}-graves select.tag-selector`).length < values.length) {
            add.click(); await wait(20);
          }
          const selects = document.querySelectorAll(`#inputs-${slug}-graves select.tag-selector`);
          values.forEach((v, i) => { selects[i].value = v; selects[i].dispatchEvent(new Event('change', { bubbles: true })); });
        }
        await wait(60);
      }
      async function openMode(mode) {
        document.getElementById('gravesBestScoreFilter').value = '0';
        document.getElementById('generateBestMatchesButton').click(); await wait(150);
        document.querySelector(`[data-best-match-mode="${mode}"]`).click(); await wait(100);
      }
      const actions = () => [...document.querySelectorAll(
        '#gravesBestMatchesList [data-action="swap-graves-best-match"], #gravesBestMatchesList [data-action="add-graves-best-match"]')]
        .filter(b => !b.disabled)
        .map(b => ({ kind: b.dataset.action.startsWith('swap') ? 'swap' : 'add', incoming: b.dataset.tagId, replaces: b.dataset.replaceTagId || null }));
      function press(a) {
        const sel = `#gravesBestMatchesList [data-action="${a.kind}-graves-best-match"][data-tag-id="${a.incoming}"]`
          + (a.replaces ? `[data-replace-tag-id="${a.replaces}"]` : '');
        const b = document.querySelector(sel);
        if (!b) return false;
        b.click();
        return true;
      }
      function check(before, after, a, label, problems) {
        // A Swap without a named element replaces the sole pick of a one-pick category.
        const replaced = a.replaces
          || (a.kind === 'swap' ? before.find(id => GAME_DATA.tags[id].category === GAME_DATA.tags[a.incoming].category) : null);
        const lost = before.filter(id => !after.includes(id) && id !== replaced);
        const dupes = after.filter((id, i) => after.indexOf(id) !== i);
        const expected = before.length + (a.kind === 'add' ? 1 : 0);
        if (!after.includes(a.incoming)) problems.push(`${label}: ${a.incoming} not in the script`);
        if (lost.length) problems.push(`${label}: lost ${lost.join(', ')}`);
        if (dupes.length) problems.push(`${label}: ${dupes.join(', ')} twice`);
        if (after.length !== expected) problems.push(`${label}: ${before.length} -> ${after.length} elements`);
      }

      const problems = [];
      let pressed = 0;
      for (const mode of ['swaps', 'additions', 'pairwise']) {
        await build(); await openMode(mode);
        for (const a of actions()) {
          await build(); await openMode(mode);
          const before = ids();
          if (!press(a)) continue;
          await wait(60); pressed++;
          const label = `${mode} ${a.kind} ${a.replaces || ''}->${a.incoming}`;
          check(before, ids(), a, label, problems);
          // One more action after the first, as the owner did.
          const next = actions()[0];
          if (next) {
            const mid = ids();
            if (press(next)) {
              await wait(60); pressed++;
              check(mid, ids(), next, `${label} then ${next.kind} ${next.replaces || ''}->${next.incoming}`, problems);
            }
          }
        }
      }
      return { pressed, problems };
    }, { ...BASE, ...rows });

    expect(result.pressed).toBeGreaterThan(5);
    expect(result.problems).toEqual([]);
  });
}
