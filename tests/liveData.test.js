import { describe, test, expect, beforeAll } from '@jest/globals';
import { loadGameData, readInputDefault } from './helpers/legacyHarness.js';

/**
 * Consistency checks across the files the browser actually loads: data.js and
 * index.html.
 *
 * These read both sources rather than restating their values, so a change to
 * either side trips the test. That distinction matters: the suite this replaced
 * asserted the same literals twice against a constants module the app never
 * loaded, which is why it stayed green while the two files disagreed.
 */

let gameData;
beforeAll(async () => {
    gameData = await loadGameData();
});

describe('data.js DISTRIBUTION block', () => {
    test('exposes the shape script.js expects', () => {
        const d = gameData.constants.DISTRIBUTION;
        expect(d.multipliers).toEqual({ WEEK_ONE: 2, WEEK_TWO: 1, BASE: 1000 });
        expect(d.weeklyCalculation).toEqual({
            NUMBER_OF_WEEKS: 8,
            WEEKLY_REDUCTION_RATE: 0.8,
            REDUCTION_START_INDEX: 2,
        });
        expect(d.rounding.ROUND_UP_UNTIL_INDEX).toBe(4);
    });
});

describe('data.js KINOMARK block', () => {
    test('exposes the weights script.js reads', () => {
        const k = gameData.constants.KINOMARK;
        expect(k.audienceWeight).toBe(0.4);
        expect(k.scoreWeights).toEqual([0.25, 0.5, 0.25]);
    });
});

describe('declared defaults vs the live UI', () => {
    test('the screenings default in data.js matches the input the user sees', async () => {
        // These used to disagree — data.js declared 3200 against the input's 3185 —
        // and nothing read the declared value, so the divergence was invisible.
        // 3185 is the game's starting theatre count, so the input was the one telling
        // the truth. The planner now reads this block, which makes a future
        // divergence a behaviour change rather than a silent one.
        const declared = gameData.constants.DISTRIBUTION.defaults.AVAILABLE_SCREENINGS;
        const live = await readInputDefault('ownedScreeningsInput');

        expect(declared).toBe(3185);
        expect(live).toBe(declared);
    });
});
