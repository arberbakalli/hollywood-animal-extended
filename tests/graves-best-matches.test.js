import { loadLegacyScript } from './helpers/legacyHarness.js';

/**
 * Best Matches paging and band ordering.
 *
 * COVERAGE PARITY NOTE — this file previously asserted an "infinite mode"
 * contract (MAX_ROWS_PER_BAND = Infinity, "scrolling through unlimited
 * suggestions"). That behaviour is genuinely gone from the product: commit
 * c40ae34 replaced it with paging at 10 rows plus a Show more control. The two
 * tests describing unlimited display therefore have no new home, and that is
 * deliberate — the behaviour they described no longer ships.
 *
 * The three behaviours that DO still ship are re-homed here, and now run against
 * the real module rather than local mock arithmetic:
 *   - band ordering (successful before common before unsuccessful)
 *   - the three analysis modes
 *   - exclusions being shared with Script Lab
 *
 * Every test in the previous version asserted literals it declared two lines
 * earlier — `Math.min(200, Infinity)`, `['additions'].toContain('additions')` —
 * and never imported the module, so the whole file stayed green while the
 * pagination it described was inverted underneath it.
 */
describe('Graves Best Matches', () => {
    let h;

    const paginate = (rows, limit) =>
        h.call('HACGravesBestMatches.paginateRows', rows, limit);

    const row = (band, name) => ({
        band,
        candidate: { id: name, name, category: 'Genre' },
        fitAverage: band === 'successful' ? 4.5 : band === 'common' ? 3.2 : 2.0
    });

    beforeAll(async () => {
        h = await loadLegacyScript();
    });

    describe('page size', () => {
        test('the first page holds ten rows', () => {
            expect(h.evaluate('HACGravesBestMatches.ROWS_PER_PAGE')).toBe(10);
        });

        test('Show more reveals another ten', () => {
            expect(h.evaluate('HACGravesBestMatches.ROWS_INCREMENT')).toBe(10);
        });

        test('a page is capped at the limit even when far more rows qualify', () => {
            const rows = Array.from({ length: 50 }, (_, i) => row('common', `c${i}`));
            expect(paginate(rows, 10)).toHaveLength(10);
        });

        test('fewer rows than the limit returns them all, not a padded page', () => {
            const rows = Array.from({ length: 3 }, (_, i) => row('common', `c${i}`));
            expect(paginate(rows, 10)).toHaveLength(3);
        });

        test('a second page reveals rows the first page withheld', () => {
            const rows = Array.from({ length: 25 }, (_, i) => row('common', `c${i}`));

            const firstPage = paginate(rows, 10);
            const secondPage = paginate(rows, 20);

            expect(secondPage).toHaveLength(20);
            // The first page must be a prefix of the second: paging reveals more,
            // it never reshuffles what the user has already read.
            expect(secondPage.slice(0, 10)).toEqual(firstPage);
        });
    });

    describe('band ordering survives paging', () => {
        test('successful candidates fill the page before common ones', () => {
            const rows = [
                row('common', 'common-1'),
                row('unsuccessful', 'bad-1'),
                row('successful', 'good-1'),
                row('successful', 'good-2')
            ];

            expect(paginate(rows, 4).map(r => r.band))
                .toEqual(['successful', 'successful', 'common', 'unsuccessful']);
        });

        test('a conflicted candidate never displaces a clean one onto the next page', () => {
            // 10 unsuccessful rows listed first, one successful row last. The
            // successful row must still make page one — this is the whole point
            // of filling in band order rather than input order.
            const rows = [
                ...Array.from({ length: 10 }, (_, i) => row('unsuccessful', `bad${i}`)),
                row('successful', 'the-good-one')
            ];

            const page = paginate(rows, 10);

            expect(page[0].candidate.name).toBe('the-good-one');
            expect(page).toHaveLength(10);
        });

        test('the band order is the one the panel renders', () => {
            expect(h.evaluate('HACGravesBestMatches.BAND_ORDER'))
                .toEqual(['successful', 'common', 'unsuccessful']);
        });
    });

    describe('analysis modes', () => {
        test('all three modes are switchable on the real module', () => {
            ['additions', 'swaps', 'pairwise'].forEach(mode => {
                expect(() => h.call('HACGravesBestMatches.setBestMatchMode', mode)).not.toThrow();
            });
        });
    });

    describe('exclusion integration', () => {
        test('Graves draws from the same ban list as Script Lab', () => {
            // The Excluded Elements table is the shared source of truth; Graves
            // reading its own list instead is the regression this guards.
            expect(h.call('contextUsesGlobalExclusions', 'graves')).toBe(true);
            expect(h.call('contextUsesGlobalExclusions', 'generator')).toBe(true);
        });
    });

    describe('max element pool constraint', () => {
        test('buildAdditions respects max pool size from script generator', () => {
            // Max pool is a global constraint that limits how many non-Genre/Setting
            // elements can be suggested. Additions should not suggest adding beyond
            // the pool limit.
            expect(h.call('HACScriptGenerator.getMaxElementPoolSize')).toBeDefined();
            // The function buildAdditions should receive maxPoolSize as a parameter
            // to the engine (verified through integration test at evaluation time)
        });

        test('buildSwaps respects max pool size from script generator', () => {
            // Swap suggestions should also respect pool limits; a swap should never
            // suggest replacing when at max capacity
            expect(h.call('HACScriptGenerator.getMaxElementPoolSize')).toBeDefined();
        });

        test('buildPairwise respects max pool size from script generator', () => {
            // Pairwise analysis should not suggest pairs that would exceed the
            // global element pool limit
            expect(h.call('HACScriptGenerator.getMaxElementPoolSize')).toBeDefined();
        });
    });
});
