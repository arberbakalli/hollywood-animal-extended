import { describe, it, expect } from '@jest/globals';
import { GameConstants } from '../src/core/GameConstants.js';

describe('GameConstants.DISTRIBUTION', () => {
    it('matches values hardcoded in script.js:1433-1437', () => {
        expect(GameConstants.DISTRIBUTION.BASE).toBe(1000);
        expect(GameConstants.DISTRIBUTION.WEEK_ONE_MULTIPLIER).toBe(2);
        expect(GameConstants.DISTRIBUTION.WEEK_TWO_MULTIPLIER).toBe(1);
        expect(GameConstants.DISTRIBUTION.DECAY_FACTOR).toBe(0.8);
        expect(GameConstants.DISTRIBUTION.NUM_WEEKS).toBe(8);
        expect(GameConstants.DISTRIBUTION.ROUND_UP_UNTIL_INDEX).toBe(4);
    });

    it('matches values in data.js GAME_DATA.constants.DISTRIBUTION', () => {
        expect(GameConstants.DISTRIBUTION.BASE).toBe(1000);
        expect(GameConstants.DISTRIBUTION.WEEK_ONE_MULTIPLIER).toBe(2);
        expect(GameConstants.DISTRIBUTION.DECAY_FACTOR).toBe(0.8);
    });

    it('is frozen (no accidental mutation)', () => {
        expect(Object.isFrozen(GameConstants.DISTRIBUTION)).toBe(true);
    });
});

describe('GameConstants.KINOMARK', () => {
    it('matches data.js GAME_DATA.constants.KINOMARK', () => {
        expect(GameConstants.KINOMARK.AUDIENCE_WEIGHT).toBe(0.4);
        expect(GameConstants.KINOMARK.SCORE_WEIGHTS).toEqual([0.25, 0.5, 0.25]);
    });

    it('is frozen', () => {
        expect(Object.isFrozen(GameConstants.KINOMARK)).toBe(true);
    });
});

describe('GameConstants.getTagCap', () => {
    // Ground-truth: the original if/else chain in script.js:785 and script.js:1656
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
    // Ground-truth: script.js:785-789  maxScriptQual = tagCap - 1
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
