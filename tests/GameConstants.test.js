import { describe, it, expect, beforeAll } from '@jest/globals';
import { GameConstants } from '../src/core/GameConstants.js';
import { loadGameData, readInputDefault } from './helpers/legacyHarness.js';

// These values live in three places: data.js, src/core/GameConstants.js, and
// hardcoded locals in script.js. The tests below actually read data.js so they
// can detect drift between the two files, rather than re-asserting the same
// literals against GameConstants twice (which is what they used to do, and why
// the DEFAULT_SCREENINGS mismatch went unnoticed).
let gameData;
beforeAll(async () => { gameData = await loadGameData(); });

describe('GameConstants.DISTRIBUTION', () => {
    it('holds the values script.js uses as locals in updateDistributionGrid', () => {
        expect(GameConstants.DISTRIBUTION.BASE).toBe(1000);
        expect(GameConstants.DISTRIBUTION.WEEK_ONE_MULTIPLIER).toBe(2);
        expect(GameConstants.DISTRIBUTION.WEEK_TWO_MULTIPLIER).toBe(1);
        expect(GameConstants.DISTRIBUTION.DECAY_FACTOR).toBe(0.8);
        expect(GameConstants.DISTRIBUTION.NUM_WEEKS).toBe(8);
        expect(GameConstants.DISTRIBUTION.ROUND_UP_UNTIL_INDEX).toBe(4);
    });

    it('has not drifted from data.js GAME_DATA.constants.DISTRIBUTION', () => {
        const d = gameData.constants.DISTRIBUTION;
        expect(GameConstants.DISTRIBUTION.BASE).toBe(d.multipliers.BASE);
        expect(GameConstants.DISTRIBUTION.WEEK_ONE_MULTIPLIER).toBe(d.multipliers.WEEK_ONE);
        expect(GameConstants.DISTRIBUTION.WEEK_TWO_MULTIPLIER).toBe(d.multipliers.WEEK_TWO);
        expect(GameConstants.DISTRIBUTION.NUM_WEEKS).toBe(d.weeklyCalculation.NUMBER_OF_WEEKS);
        expect(GameConstants.DISTRIBUTION.DECAY_FACTOR).toBe(d.weeklyCalculation.WEEKLY_REDUCTION_RATE);
        expect(GameConstants.DISTRIBUTION.ROUND_UP_UNTIL_INDEX).toBe(d.rounding.ROUND_UP_UNTIL_INDEX);
        expect(GameConstants.DISTRIBUTION.DEFAULT_SCREENINGS).toBe(d.defaults.AVAILABLE_SCREENINGS);
    });

    it('documents the fields data.js declares that GameConstants does not mirror', () => {
        // REDUCTION_START_INDEX exists only in data.js. Neither copy is consumed
        // by the running app — script.js hardcodes these values as locals in
        // updateDistributionGrid. Listed here so adding a mirror is a deliberate
        // choice rather than an oversight.
        expect(gameData.constants.DISTRIBUTION.weeklyCalculation.REDUCTION_START_INDEX).toBe(2);
        expect(GameConstants.DISTRIBUTION.REDUCTION_START_INDEX).toBeUndefined();
    });

    it('records the known divergence from the live UI default', async () => {
        // Read from index.html rather than retyping the number, so this test
        // notices if either side moves. Both constant files say 3200; the input
        // the user actually sees says 3185. Nothing consumes either constant —
        // script.js hardcodes its own locals — so this documents the gap rather
        // than asserting correctness. Resolving it is a game-domain call.
        const uiDefault = await readInputDefault('ownedScreeningsInput');
        expect(GameConstants.DISTRIBUTION.DEFAULT_SCREENINGS).toBe(3200);
        expect(uiDefault).toBe(3185);
        expect(uiDefault).not.toBe(GameConstants.DISTRIBUTION.DEFAULT_SCREENINGS);
    });

    it('is frozen (no accidental mutation)', () => {
        expect(Object.isFrozen(GameConstants.DISTRIBUTION)).toBe(true);
    });
});

describe('GameConstants.KINOMARK', () => {
    it('has not drifted from data.js GAME_DATA.constants.KINOMARK', () => {
        const k = gameData.constants.KINOMARK;
        expect(GameConstants.KINOMARK.AUDIENCE_WEIGHT).toBe(k.audienceWeight);
        expect(GameConstants.KINOMARK.SCORE_WEIGHTS).toEqual(k.scoreWeights);
    });

    it('is frozen', () => {
        expect(Object.isFrozen(GameConstants.KINOMARK)).toBe(true);
    });
});

describe('GameConstants.getTagCap', () => {
    // Ground-truth: the if/else chain still inlined twice in script.js, inside
    // runGenerationAlgorithm and renderSynergyResults. Those copies go away when
    // script.js becomes a module and can import getTagCap.
    const cases = [
        [0,  6],
        [1,  6],
        [4,  6],
        [5,  7],
        [6,  7],
        [7,  8],
        [8,  8],
        [9,  9],
        [10, 9],
        [99, 9],
    ];

    it.each(cases)('getTagCap(%i) === %i', (count, expected) => {
        expect(GameConstants.getTagCap(count)).toBe(expected);
    });
});

describe('GameConstants.getMaxScriptQuality', () => {
    // Ground-truth: maxScriptQual = tagCap - 1, in runGenerationAlgorithm.
    const cases = [
        [0, 5],
        [5, 6],
        [7, 7],
        [9, 8],
    ];

    it.each(cases)('getMaxScriptQuality(%i) === %i', (count, expected) => {
        expect(GameConstants.getMaxScriptQuality(count)).toBe(expected);
    });
});
