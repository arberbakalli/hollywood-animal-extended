import { readFile } from 'node:fs/promises';
import { test, expect, openHollywood } from '../fixtures/base.js';

// Synthetic saves in the shape of real ones (game 0.8.72EA): see
// tests/pollux-save-editor.test.js and docs/POLLUX_SAVE_EDITOR.md.
const CODE = { BEST_SCRIPT: 0, BEST_DIRECTING: 1, BEST_MALE_ROLE: 2, BEST_FEMALE_ROLE: 3, BEST_CINEMATOGRAPHY: 4, BEST_MOVIE: 5 };
const PLAYER_A = 411, PLAYER_B = 428, RIVAL = 900;

const candidate = (category, movieId, talentId) => ({
  category: CODE[category], profession: 1, talentIds: [talentId], movieId,
  roleTagId: null, entityId: -1, forceWinning: false,
});

function save({ held = false, playerNominated = true } = {}) {
  const prev = {};
  Object.keys(CODE).forEach((category, i) => {
    prev[category] = [candidate(category, RIVAL, 10 + i)];
    if (playerNominated) prev[category].push(candidate(category, PLAYER_A, 20 + i), candidate(category, PLAYER_B, 30 + i));
  });
  const state = {
    timePassed: held ? '4852.00:00:00' : '4800.00:00:00',
    movies: [{ id: PLAYER_A, name: 'SHOOTING FOR THE STARS', polluxes: [], nominations: [] },
      { id: PLAYER_B, name: 'FARM GIRL', polluxes: [], nominations: [] }],
    competitorMovies: [{ id: RIVAL, name: 'RIVAL PICTURE', polluxes: [], nominations: [] }],
    characters: [],
    prevYearsPolluxPretenders: prev,
    thisYearsPolluxPretenders: {},
    polluxHistory: { 1941: { winners: {}, nominees: {} } },
  };
  if (held) {
    const record = { winners: {}, nominees: {}, moodShifts: {}, PolluxVisitStatus: 2 };
    Object.entries(prev).forEach(([category, list]) => {
      record.winners[category] = { ...list[0] };
      record.nominees[category] = list.map((value, i) => ({ Key: `${10 + i}.000`, Value: { ...value } }));
      state.competitorMovies[0].polluxes.push({ year: 1942, movId: RIVAL, category: CODE[category] });
      list.forEach(entry => state.characters.push({ id: entry.talentIds[0], polluxes: [], nominations: [] }));
      state.characters.find(c => c.id === list[0].talentIds[0]).polluxes.push({ year: 1942, movId: RIVAL, category: CODE[category] });
    });
    state.polluxHistory[1942] = record;
  }
  return '﻿' + JSON.stringify({ currentMeta: { lastSaveVersion: '0.8.72EA' }, stateJson: state });
}

async function openPollux(steps, page) {
  await openHollywood(steps);
  await page.locator('#tab-pollux-button').click();
  await expect(page.locator('#tab-pollux')).toBeVisible();
}

const upload = (page, text, name = 'Autosave 15 04 1942 - STUDIO.json') =>
  page.locator('#polluxFileInput').setInputFiles({ name, mimeType: 'application/json', buffer: Buffer.from(text, 'utf8') });

async function downloadFixed(page) {
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#polluxGenerateButton').click();
  const download = await downloadPromise;
  const text = await readFile(await download.path(), 'utf8');
  return { name: download.suggestedFilename(), text, state: JSON.parse(text.replace(/^﻿/, '')).stateJson };
}

test.describe('Pollux Fixer', () => {
  test('TC35-000001 the tab warns to back up the save before any file is chosen', async ({ steps, page }) => {
    await openPollux(steps, page);
    await expect(page.locator('#pollux-backup-warning')).toContainText('Back up your save first.');
    await expect(page.locator('#pollux-backup-warning')).toContainText('does not change the original');
    await expect(page.locator('#tab-pollux')).toContainText('never uploaded');
    await expect(page.locator('#pollux-picks-panel')).toBeHidden();
  });

  test('TC35-000002 a held ceremony lists only player nominees and downloads a consistent save', async ({ steps, page }) => {
    await openPollux(steps, page);
    await upload(page, save({ held: true }));
    await expect(page.locator('#pollux-status')).toContainText('game year 1942');
    await expect(page.locator('#polluxBucketSelect option').first()).toHaveText('Ceremony of 1 March 1942 (already held)');
    await expect(page.locator('#pollux-state-note')).toContainText('already been held');
    await expect(page.locator('#polluxForceAllInput')).toBeDisabled();

    const movieOptions = page.locator('#polluxPick-BEST_MOVIE option');
    await expect(movieOptions).toHaveCount(3);
    await expect(movieOptions.nth(0)).toHaveText('Keep the recorded result');
    await expect(page.locator('#polluxPick-BEST_MOVIE')).not.toContainText('RIVAL PICTURE');
    await page.locator('#polluxPick-BEST_MOVIE').selectOption({ label: 'FARM GIRL (talent #35)' });

    const fixed = await downloadFixed(page);
    expect(fixed.name).toBe('Autosave 15 04 1942 - STUDIO.pollux-fixed.json');
    expect(fixed.text.charCodeAt(0)).toBe(0xFEFF);
    expect(fixed.text).not.toMatch(/\n/);
    const winners = fixed.state.polluxHistory[1942].winners;
    expect(winners.BEST_MOVIE.movieId).toBe(PLAYER_B);
    expect(winners.BEST_SCRIPT.movieId).toBe(PLAYER_A);
    const holders = (code) => [...fixed.state.movies, ...fixed.state.competitorMovies]
      .filter(m => m.polluxes.some(p => p.year === 1942 && p.category === code)).map(m => m.id);
    Object.entries(CODE).forEach(([category, code]) => expect(holders(code)).toEqual([winners[category].movieId]));
    await expect(page.locator('#pollux-result-list li')).toHaveCount(6);
    await expect(page.locator('#pollux-result-list')).toContainText('Best Movie: FARM GIRL');
  });

  test('TC35-000003 before the ceremony only the latest picks are marked, however often it runs', async ({ steps, page }) => {
    await openPollux(steps, page);
    await upload(page, save());
    await expect(page.locator('#pollux-state-note')).toContainText('has not been held yet');
    await expect(page.locator('#polluxForceAllInput')).toBeEnabled();

    await downloadFixed(page);
    await page.locator('#polluxPick-BEST_SCRIPT').selectOption({ label: 'FARM GIRL (talent #30)' });
    const fixed = await downloadFixed(page);

    expect(fixed.state.prevYearsPolluxPretenders.BEST_SCRIPT.map(c => c.forceWinning)).toEqual([false, false, true]);
    expect(fixed.state.polluxHistory[1942]).toBeUndefined();
  });

  test('TC35-000004 a save from before the nominations explains why there is nothing to pick', async ({ steps, page }) => {
    await openPollux(steps, page);
    await upload(page, save({ playerNominated: false }));
    await expect(page.locator('#pollux-state-note')).toContainText('None of your films is on this list yet');
    await expect(page.locator('#pollux-category-list .pollux-empty')).toHaveCount(6);
    await expect(page.locator('#polluxGenerateButton')).toBeDisabled();
  });

  test('TC35-000005 a file that is not a save shows a friendly error and no picks', async ({ steps, page }) => {
    await openPollux(steps, page);
    await upload(page, '{not json', 'Autosave.png');
    await expect(page.locator('#pollux-status')).toHaveText(/not valid JSON/);
    await expect(page.locator('#pollux-status')).toHaveAttribute('data-tone', 'error');
    await expect(page.locator('#pollux-picks-panel')).toBeHidden();
  });

  // A raw id here is a failed lookup, never a string to reformat (CLAUDE.md section 4).
  test('TC35-000007 a role nominee shows the story element name, not its id', async ({ steps, page }) => {
    await openPollux(steps, page);
    const data = JSON.parse(save({ held: true }).slice(1));
    data.stateJson.prevYearsPolluxPretenders.BEST_FEMALE_ROLE[2].roleTagId = 'PROTAGONIST_DETECTIVE';
    data.stateJson.polluxHistory[1942].nominees.BEST_FEMALE_ROLE[2].Value.roleTagId = 'PROTAGONIST_DETECTIVE';
    await upload(page, '﻿' + JSON.stringify(data));
    const name = await page.evaluate(() => GAME_DATA.tags.PROTAGONIST_DETECTIVE.name);
    expect(name).toBeTruthy();
    const options = page.locator('#polluxPick-BEST_FEMALE_ROLE option');
    await expect(options.filter({ hasText: `FARM GIRL (${name})` })).toHaveCount(1);
    await expect(page.locator('#polluxPick-BEST_FEMALE_ROLE')).not.toContainText('PROTAGONIST_');
  });

  test('TC35-000006 the Pollux tab fits a phone screen', async ({ steps, page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await openPollux(steps, page);
    await upload(page, save({ held: true }));
    await expect(page.locator('#polluxPick-BEST_MOVIE')).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBe(0);
  });

  // Four product tabs share one row on desktop; the Pollux tab once wrapped
  // onto a second row alone because each tab kept a 210px minimum.
  test('TC35-000008 the four product tabs share one row on desktop', async ({ steps, page }) => {
    for (const width of [1280, 1024]) {
      await page.setViewportSize({ width, height: 900 });
      await openHollywood(steps);
      const tabs = page.locator('#primary-tabs .product-area-btn');
      await expect(tabs).toHaveCount(4);
      const boxes = await tabs.evaluateAll(nodes => nodes.map(node => ({
        top: Math.round(node.getBoundingClientRect().top),
        overflow: node.scrollWidth - node.clientWidth,
      })));
      expect(new Set(boxes.map(box => box.top)).size, `one row at ${width}px`).toBe(1);
      expect(boxes.map(box => box.overflow)).toEqual([0, 0, 0, 0]);
    }
  });

  // A long pick is cut off inside a closed dropdown; the full text is shown
  // under it, and it follows the choice.
  test('TC35-000009 each category shows the full chosen pick, however long', async ({ steps, page }) => {
    const longTitle = 'THE EXTRAORDINARILY LONG ROMANCE IN VALENTIMES';
    for (const width of [1280, 375]) {
      await page.setViewportSize({ width, height: 900 });
      await openPollux(steps, page);
      await upload(page, save({ held: true }).replace('SHOOTING FOR THE STARS', longTitle));
      const select = page.locator('#polluxPick-BEST_FEMALE_ROLE');
      const full = page.locator('#polluxPickText-BEST_FEMALE_ROLE');
      await expect(full).toHaveText(await select.locator('option:checked').innerText());
      // Switch between two picks, so the line must follow a real change.
      for (const title of ['FARM GIRL', longTitle]) {
        const option = select.locator('option', { hasText: title });
        await select.selectOption({ label: await option.innerText() });
        await expect(full).toHaveText(await option.innerText());
      }
      await expect(full).toBeVisible();
      await expect(full).toHaveAttribute('aria-hidden', 'true');
      await expect(select).not.toHaveAttribute('aria-describedby', /.*/);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBe(0);
    }
  });

  // A wrapped label does not overflow, so TC35-000008 missed it: sharing the
  // row equally wrapped "Marketing & Release" and made every tab 19px taller.
  test('TC35-000010 each product tab label stays on one line on desktop', async ({ steps, page }) => {
    for (const width of [1280, 1024]) {
      await page.setViewportSize({ width, height: 900 });
      await openHollywood(steps);
      const lines = await page.locator('#primary-tabs .product-area-label').evaluateAll(labels => labels.map(label => {
        const lineHeight = parseFloat(getComputedStyle(label).lineHeight);
        return Math.round(label.getBoundingClientRect().height / lineHeight);
      }));
      expect(lines, `labels at ${width}px`).toEqual([1, 1, 1, 1]);
    }
  });

  // Names come from each loaded save through one label template: the same
  // talent id is a different person in another save (owner, 2026-10-06).
  test('TC35-000011 picks name people from the loaded save, not talent ids', async ({ steps, page }) => {
    await openPollux(steps, page);
    const named = (first, last) => {
      const data = JSON.parse(save({ held: true }).slice(1));
      data.stateJson.characters.find(c => c.id === 20).firstNameId = first;
      data.stateJson.characters.find(c => c.id === 20).lastNameId = last;
      return '﻿' + JSON.stringify(data);
    };
    const script = page.locator('#polluxPick-BEST_SCRIPT');
    await upload(page, named('124', '592'));
    await expect(script.locator('option', { hasText: 'SHOOTING FOR THE STARS (Dennis Lawson)' })).toHaveCount(1);
    await expect(script).not.toContainText('talent #20');
    await upload(page, named('0', '400'), 'Autosave 16 04 1942 - STUDIO.json');
    await expect(script.locator('option', { hasText: 'SHOOTING FOR THE STARS (John Smith)' })).toHaveCount(1);
    await expect(script).not.toContainText('Dennis Lawson');
    // A person the save does not name keeps the id.
    await expect(script.locator('option', { hasText: 'FARM GIRL (talent #30)' })).toHaveCount(1);
  });
});

