import { loadLegacyScript } from './helpers/legacyHarness.js';

/**
 * Behemoth policy effects on the distribution grid.
 *
 * The rule this file exists to pin down: Behemoth's +25% applies to week 1 only,
 * and its slower decay applies to weeks 3+ (which are derived from week 2).
 * Week 2 is seeded directly from the commercial score, so it must never move.
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
        h = await loadLegacyScript();
    });

    describe('week 2 is never touched', () => {
        test.each([5, 8, 9, 9.5, 10])('score %p leaves week 2 unchanged', score => {
            const off = weeklyDemand(score, { behemoth: false });
            const on = weeklyDemand(score, { behemoth: true });

            expect(on[1]).toBe(off[1]);
        });

        test('week 2 stays unchanged even with the opening boost stacked on', () => {
            const off = weeklyDemand(10, { behemoth: false, openingBoost: true });
            const on = weeklyDemand(10, { behemoth: true, openingBoost: true });

            expect(on[1]).toBe(off[1]);
        });

        test('week 2 equals score * 1 * 1000 regardless of Behemoth', () => {
            expect(weeklyDemand(10, { behemoth: true })[1]).toBe(10000);
            expect(weeklyDemand(10, { behemoth: false })[1]).toBe(10000);
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

    describe('decay threshold', () => {
        test('weeks 3+ decay slower above score 9', () => {
            const off = weeklyDemand(10, { behemoth: false });
            const on = weeklyDemand(10, { behemoth: true });

            for (let week = 2; week < WEEKS; week++) {
                expect(on[week]).toBeGreaterThan(off[week]);
            }
        });

        test('weeks 3+ are unchanged at exactly score 9', () => {
            const off = weeklyDemand(9, { behemoth: false });
            const on = weeklyDemand(9, { behemoth: true });

            for (let week = 2; week < WEEKS; week++) {
                expect(on[week]).toBe(off[week]);
            }
        });

        test('weeks 3+ are unchanged below score 9', () => {
            const off = weeklyDemand(8, { behemoth: false });
            const on = weeklyDemand(8, { behemoth: true });

            for (let week = 2; week < WEEKS; week++) {
                expect(on[week]).toBe(off[week]);
            }
        });
    });

    describe('golden master', () => {
        test('score 5 with Behemoth off matches the extracted game-file grid', () => {
            expect(weeklyDemand(5, { behemoth: false }))
                .toEqual([10000, 5000, 4000, 3200, 2560, 2048, 1638, 1310]);
        });

        test('score 5 with Behemoth on changes week 1 and nothing else', () => {
            const off = weeklyDemand(5, { behemoth: false });
            const on = weeklyDemand(5, { behemoth: true });

            expect(on[0]).toBe(12500);
            expect(on.slice(1)).toEqual(off.slice(1));
        });
    });
});
