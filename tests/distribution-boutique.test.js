import { loadLegacyScript } from './helpers/legacyHarness.js';

/**
 * Boutique studio policy on the distribution grid.
 *
 * Game text, localization/English.json:12490:
 *   "Attendance for films with an artistic rating above 9 will fall 25% more slowly."
 *
 * Its sibling, Behemoth, carries the same slower decay on a different gate
 * (localization/English.json:12479, commercial rating above 9). The two are
 * separate policies and a studio can hold both, so a film clearing 9 on both
 * axes gets both modifiers.
 *
 * Stacking is additive on the fall, per the repository owner: a 20% base fall
 * loses 25% of base per active modifier, so one modifier gives 15% and two give
 * 10% — decay 0.80, 0.85, 0.90 respectively. The game text does not state this;
 * it is the owner's reading and this test is what pins it down.
 *
 * Unlike tests/distribution-behemoth.test.js, which mirrors the formula
 * locally, this file drives the real resolveDecayRate() out of
 * src/marketing/distributionPlanner.js, so a regression there fails here.
 */
describe('Distribution — Boutique policy', () => {
    let h;

    const BASE = 0.8;
    const ONE_MODIFIER = 0.85;
    const BOTH_MODIFIERS = 0.9;

    const decay = (com, art, behemoth, boutique) =>
        h.call('HACDistributionPlanner.resolveDecayRate', com, art, behemoth, boutique);

    beforeAll(async () => {
        h = await loadLegacyScript();
    });

    describe('gate', () => {
        test('slows decay when artistic rating is above 9', () => {
            expect(decay(5, 10, false, true)).toBe(ONE_MODIFIER);
        });

        test('does nothing at exactly artistic 9', () => {
            expect(decay(5, 9, false, true)).toBe(BASE);
        });

        test('does nothing below artistic 9', () => {
            expect(decay(5, 8.5, false, true)).toBe(BASE);
        });

        test('does nothing while the policy is inactive, however high the rating', () => {
            expect(decay(5, 10, false, false)).toBe(BASE);
        });

        test('reads the artistic rating, not the commercial one', () => {
            // A film that is commercially superb but artistically ordinary earns
            // Boutique nothing. Reading the wrong score is the likely regression.
            expect(decay(10, 5, false, true)).toBe(BASE);
        });
    });

    describe('independence from Behemoth', () => {
        test('Behemoth alone still gates on the commercial rating', () => {
            expect(decay(10, 5, true, false)).toBe(ONE_MODIFIER);
        });

        test('Behemoth is unaffected by a high artistic rating', () => {
            expect(decay(5, 10, true, false)).toBe(BASE);
        });
    });

    describe('stacking', () => {
        test('both policies qualifying gives both modifiers', () => {
            expect(decay(10, 10, true, true)).toBe(BOTH_MODIFIERS);
        });

        test('holding both policies but qualifying on one gives one modifier', () => {
            expect(decay(10, 5, true, true)).toBe(ONE_MODIFIER);
            expect(decay(5, 10, true, true)).toBe(ONE_MODIFIER);
        });

        test('holding both and qualifying on neither leaves the base rate', () => {
            expect(decay(5, 5, true, true)).toBe(BASE);
        });

        test('stacking is additive on the fall, not compounding', () => {
            // Additive: 20% * (1 - 0.25 - 0.25) = 10% fall.
            // Compounding would give 20% * 0.75 * 0.75 = 11.25%, decay 0.8875.
            expect(decay(10, 10, true, true)).toBe(0.9);
            expect(decay(10, 10, true, true)).not.toBeCloseTo(0.8875, 4);
        });
    });
});
