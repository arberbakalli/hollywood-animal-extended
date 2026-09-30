import { describe, test, expect } from '@jest/globals';
import '../src/evaluation/compatibilityEngine.js';
import '../src/evaluation/gravesBestMatchesEngine.js';

/**
 * Scoring values the 2026-09-29 audit found no test would catch if they
 * drifted. Each is stated here against small hand-built data, so the expected
 * value is worked out by hand rather than taken from the code.
 */
const { calculateMatrixScore, calculateGenrePairScore, getRawCompatibilityScore } = globalThis.HACCompatibilityEngine;
const { bandFor } = globalThis.HACGravesBestMatchesEngine;

const tag = (id, category = 'Theme & Event', percent = 1) => ({ id, category, percent });
const noData = { compatibility: {}, genrePairs: {}, tags: { A: { name: 'A' }, B: { name: 'B' } } };

describe('a pair missing from the compatibility data counts as 3.0 (GAME_RULES section 6)', () => {
    test('the lookup returns 3.0', () => {
        expect(getRawCompatibilityScore(tag('A'), tag('B'), noData)).toBe(3.0);
    });

    test('the matrix averages it as 3.0, which is a neutral 0 contribution', () => {
        const result = calculateMatrixScore([tag('A'), tag('B')], noData);

        expect(result.rawAverage).toBe(3.0);
        expect(result.totalScore).toBe(0);
        expect(result.spoilers).toEqual([]);
    });
});

describe('the genre-pair bonus needs the second genre at 35% or more', () => {
    const data = {
        compatibility: {},
        tags: { ACTION: { name: 'Action' }, COMEDY: { name: 'Comedy' }, DRAMA: { name: 'Drama' } },
        genrePairs: { ACTION: { COMEDY: { primary: '0.2', secondary: '0.1' } } },
    };

    test('35 / 35 / 30 earns the pair bonus', () => {
        const pair = calculateGenrePairScore(
            [tag('ACTION', 'Genre', 0.35), tag('COMEDY', 'Genre', 0.35), tag('DRAMA', 'Genre', 0.3)], data);

        expect(pair).toEqual({ com: 0.2, art: 0.1, names: 'Action + Comedy' });
    });

    test('40 / 30 / 30 does not, since the second genre is under 35%', () => {
        expect(calculateGenrePairScore(
            [tag('ACTION', 'Genre', 0.4), tag('COMEDY', 'Genre', 0.3), tag('DRAMA', 'Genre', 0.3)], data)).toBeNull();
    });

    test('the pair is found whichever way round the data stores it', () => {
        const pair = calculateGenrePairScore([tag('COMEDY', 'Genre', 0.6), tag('ACTION', 'Genre', 0.4)], data);

        expect(pair).toEqual({ com: 0.2, art: 0.1, names: 'Comedy + Action' });
    });
});

describe('Best Matches bands a candidate (GAME_RULES section 3)', () => {
    test.each([
        [4.0, 2.0, 'successful'],
        [3.9, 2.0, 'common'],
        [4.5, 1.9, 'unsuccessful'],
        [4.0, 1.9, 'unsuccessful'],
        [2.0, 2.0, 'common'],
    ])('fit average %d with worst pair %d is %s', (fitAverage, worstPair, band) => {
        expect(bandFor(fitAverage, worstPair)).toBe(band);
    });
});
