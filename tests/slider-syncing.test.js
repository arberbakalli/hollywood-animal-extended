import { describe, it, expect, beforeAll } from '@jest/globals';
import { loadLegacyScript, readInputDefault } from './helpers/legacyHarness.js';

/**
 * Max Element Pool <-> Target Movie Score syncing.
 *
 * The rule: a target score of N needs N-1 story elements, so pool = score - 1.
 * Score 10 is the exception — 9 elements can reach it when every pick lands and
 * 10 only improves the odds, so the pool may sit at 9 or 10 and both map to 10.
 *
 * These drive the real exported mappings out of src/app/appShell.js. They
 * previously asserted against local copies of the formulas declared in this
 * file, so a regression in the product could not fail them: replacing the
 * production mapping with a constant left all 17 green. The expected values
 * below are unchanged; only the function under test is now the shipped one.
 */
describe('Slider syncing — pool and target score mappings', () => {
    let h;
    const mapScoreToPool = (score) => h.call('HACAppShell.targetScoreToPoolSize', score);
    const mapPoolToScore = (pool) => h.call('HACAppShell.poolSizeToTargetScore', pool);
    const scoreTrack = (score) => h.call('HACAppShell.targetScoreTrackPercent', score);
    const poolTrack = (pool) => h.call('HACAppShell.poolSizeTrackPercent', pool);

    beforeAll(async () => {
        h = await loadLegacyScript();
    });

    describe('target score to pool size', () => {
        it.each([
            [6, 5],
            [7, 6],
            [8, 7],
            [9, 8],
            [10, 9],
        ])('score %p needs a pool of %p', (score, pool) => {
            expect(mapScoreToPool(score)).toBe(pool);
        });
    });

    describe('pool size to target score', () => {
        it.each([
            [5, 6],
            [6, 7],
            [7, 8],
            [8, 9],
            [9, 10],
            [10, 10],
        ])('pool %p reaches score %p', (pool, score) => {
            expect(mapPoolToScore(pool)).toBe(score);
        });

        it('pool 9 and pool 10 both reach score 10, so the extra element is optional', () => {
            expect(mapPoolToScore(9)).toBe(10);
            expect(mapPoolToScore(10)).toBe(10);
        });
    });

    describe('visual track fill', () => {
        it.each([
            [6, 0],
            [8, 50],
            [10, 100],
        ])('score %p fills the score track %p%%', (score, percent) => {
            expect(scoreTrack(score)).toBe(percent);
        });

        it.each([
            [5, 0],
            [10, 100],
        ])('pool %p fills the pool track %p%%', (pool, percent) => {
            expect(poolTrack(pool)).toBe(percent);
        });

        // The thumb sits where the value says; the fill has to agree with it, or
        // the control reads as out of sync even though the numbers are right.
        it('the score track fill tracks the mapped score, not the raw pool', () => {
            const pool = 7;
            expect(scoreTrack(mapPoolToScore(pool))).toBe(50);
        });
    });

    describe('the two directions agree', () => {
        it.each([6, 7, 8, 9])('score %p survives a round trip through the pool', (score) => {
            expect(mapPoolToScore(mapScoreToPool(score))).toBe(score);
        });

        it('score 10 round-trips to 10 via its default pool of 9', () => {
            expect(mapPoolToScore(mapScoreToPool(10))).toBe(10);
        });
    });

    // The two controls ship with defaults baked into index.html. If those drift
    // apart the app opens already out of sync, which no mapping test would catch.
    describe('shipped defaults are already in sync', () => {
        it('the pool default maps to the target score default', async () => {
            const poolDefault = await readInputDefault('globalElementPoolInput');
            const scoreDefault = await readInputDefault('genScoreInput');
            expect(mapPoolToScore(poolDefault)).toBe(scoreDefault);
        });

        it('both pool inputs ship the same default', async () => {
            expect(await readInputDefault('globalElementPoolInput'))
                .toBe(await readInputDefault('globalElementPoolSlider'));
        });
    });
});
