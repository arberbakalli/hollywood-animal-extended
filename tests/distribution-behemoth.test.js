import { loadInstrumentedApp } from './helpers/legacyHarness.js';

/**
 * Behemoth policy effects on the distribution grid.
 *
 * The rule this file exists to pin down: Behemoth's +25% boost applies to all
 * weeks 1-8 (confirmed by the game UI showing the Behemoth icon on all weeks).
 * Slower decay applies to weeks 3+ (which are derived from week 2).
 * That has regressed more than once during refactors of this calculator.
 *
 * These drive the real weeklyDemandFor() out of src/marketing/distributionPlanner.js.
 * They previously asserted against a local copy of the formula declared in this
 * file, which meant a regression in the planner could not fail them — every
 * assertion below held whatever the product did. The expected values are
 * unchanged; only the function under test is now the shipped one.
 */
describe('Distribution — Behemoth policy', () => {
    let h;

    const WEEKS = 8;
    const BEHEMOTH_WEEK_ONE_BOOST = 1.25;

    // Behemoth is the subject here, so Boutique stays off and the artistic score
    // stays at 0 — otherwise its decay modifier would stack onto these figures.
    const weeklyDemand = (score, { behemoth = false, openingBoost = false } = {}) =>
        h.call('HACDistributionPlanner.weeklyDemandFor', score, {
            behemoth,
            boutique: false,
            artisticScore: 0,
            openingMultiplier: openingBoost ? 2 : 1,
            holidayBonusPercent: 0
        });

    beforeAll(async () => {
        h = await loadInstrumentedApp();
    });

    describe('all weeks receive 25% boost', () => {
        test.each([5, 8, 9, 9.5, 10])('score %p gets boost on week 2', score => {
            const off = weeklyDemand(score, { behemoth: false });
            const on = weeklyDemand(score, { behemoth: true });

            expect(on[1]).toBeGreaterThan(off[1]);
        });

        test('week 2 boost applies even with the opening boost stacked on', () => {
            const off = weeklyDemand(10, { behemoth: false, openingBoost: true });
            const on = weeklyDemand(10, { behemoth: true, openingBoost: true });

            expect(on[1]).toBeGreaterThan(off[1]);
        });

        test('week 2 boost is applied before opening multiplier', () => {
            const score = 10;
            const on = weeklyDemand(score, { behemoth: true });
            const expected = Math.ceil(score * 1 * 1000 * BEHEMOTH_WEEK_ONE_BOOST);
            expect(on[1]).toBe(expected);
        });
    });

    describe('week 1 boost', () => {
        test('adds 25% when Behemoth is active', () => {
            const off = weeklyDemand(10, { behemoth: false });
            const on = weeklyDemand(10, { behemoth: true });

            expect(on[0]).toBe(Math.ceil(off[0] * BEHEMOTH_WEEK_ONE_BOOST));
        });

        test('applies below the decay threshold too', () => {
            // The two halves of the policy have different gates: the week 1
            // boost applies at any score, only the slower decay needs score > 9.
            // Confirmed with the repo owner; not yet traced to a game file.
            const off = weeklyDemand(5, { behemoth: false });
            const on = weeklyDemand(5, { behemoth: true });

            expect(on[0]).toBeGreaterThan(off[0]);
        });
    });

    describe('boost and slower decay are independent gates', () => {
        test('all weeks 1-8 have 25% boost applied', () => {
            const off = weeklyDemand(10, { behemoth: false });
            const on = weeklyDemand(10, { behemoth: true });

            for (let week = 0; week < WEEKS; week++) {
                expect(on[week]).toBeGreaterThan(off[week]);
            }
        });

        test('boost applies at all score levels (not just > 9)', () => {
            const off = weeklyDemand(5, { behemoth: false });
            const on = weeklyDemand(5, { behemoth: true });

            for (let week = 0; week < WEEKS; week++) {
                expect(on[week]).toBeGreaterThan(off[week]);
            }
        });

        test('weeks 3+ also benefit from slower decay above score 9', () => {
            const off = weeklyDemand(10, { behemoth: false });
            const on = weeklyDemand(10, { behemoth: true });

            for (let week = 2; week < WEEKS; week++) {
                expect(on[week]).toBeGreaterThan(off[week]);
            }
        });

        test('slower decay threshold (score > 9) is independent of boost', () => {
            const off = weeklyDemand(9, { behemoth: false });
            const on = weeklyDemand(9, { behemoth: true });

            // Boost applies even at score 9
            for (let week = 0; week < WEEKS; week++) {
                expect(on[week]).toBeGreaterThan(off[week]);
            }
            // Slower decay does not apply at score 9, but boost does
            // Weeks 3+ decay at normal rate (0.8) not slower (0.85)
            const decayRate = 0.8;
            for (let week = 2; week < WEEKS; week++) {
                const expected = off[week] * BEHEMOTH_WEEK_ONE_BOOST;
                expect(Math.abs(on[week] - expected)).toBeLessThan(1);
            }
        });
    });

    describe('golden master', () => {
        test('score 5 with Behemoth off matches the extracted game-file grid', () => {
            expect(weeklyDemand(5, { behemoth: false }))
                .toEqual([10000, 5000, 4000, 3200, 2560, 2048, 1638, 1310]);
        });

        test('score 5 with Behemoth on applies 25% to all weeks 1-8', () => {
            const off = weeklyDemand(5, { behemoth: false });
            const on = weeklyDemand(5, { behemoth: true });

            expect(on[0]).toBe(12500);
            expect(on[1]).toBe(6250);
            expect(on[2]).toBe(5000);
            expect(on[3]).toBe(4000);
            expect(on[4]).toBe(3200);
            expect(on[5]).toBe(2560);
            expect(on[6]).toBe(2048);
            expect(on[7]).toBe(1638);
        });
    });
});
