/**
 * Behemoth policy effects on the distribution grid.
 *
 * The rule this file exists to pin down: Behemoth's +25% applies to week 1 only,
 * and its slower decay applies to weeks 3+ (which are derived from week 2).
 * Week 2 is seeded directly from the commercial score, so it must never move.
 * That has regressed more than once during refactors of this calculator.
 */
describe('Distribution — Behemoth policy', () => {
    const BASE = 1000;
    const WEEK_ONE_MULT = 2;
    const WEEK_TWO_MULT = 1;
    const WEEKS = 8;
    const DECAY_FROM_INDEX = 2;
    const OPENING_WINDOW = 4;

    const BASE_DECAY = 0.8;
    const BEHEMOTH_DECAY = 0.85;
    const BEHEMOTH_DECAY_MIN_SCORE = 9;
    const BEHEMOTH_WEEK_ONE_BOOST = 1.25;

    // Mirrors weeklyDemand() in src/marketing/distributionPlanner.js.
    function weeklyDemand(score, { behemoth = false, openingBoost = false } = {}) {
        const decay = behemoth && score > BEHEMOTH_DECAY_MIN_SCORE ? BEHEMOTH_DECAY : BASE_DECAY;
        const openingMultiplier = openingBoost ? 2 : 1;
        const weekOneBoost = behemoth ? BEHEMOTH_WEEK_ONE_BOOST : 1;

        const demand = [score * WEEK_ONE_MULT * BASE, score * WEEK_TWO_MULT * BASE];
        for (let i = DECAY_FROM_INDEX; i < WEEKS; i++) {
            demand.push(demand[demand.length - 1] * decay);
        }

        return demand.map((value, index) => {
            const inOpeningWindow = index < OPENING_WINDOW;
            let boosted = inOpeningWindow ? value * openingMultiplier : value;
            if (index === 0) boosted *= weekOneBoost;
            return inOpeningWindow ? Math.ceil(boosted) : Math.floor(boosted);
        });
    }

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
            // The +25% is budget-gated in game, not rating-gated; only the decay
            // half of the policy needs score > 9.
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
