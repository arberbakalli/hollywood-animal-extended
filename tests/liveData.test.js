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
    test('the screenings default in data.js does not match the input the user sees', async () => {
        // data.js declares 3200; index.html ships 3185. Nothing consumes the
        // data.js value — updateDistributionGrid hardcodes its own locals — so
        // this documents a real inconsistency rather than asserting either is
        // correct. Picking one is a game-domain call.
        const declared = gameData.constants.DISTRIBUTION.defaults.AVAILABLE_SCREENINGS;
        const live = await readInputDefault('ownedScreeningsInput');

        expect(declared).toBe(3200);
        expect(live).toBe(3185);
        expect(live).not.toBe(declared);
    });
});
