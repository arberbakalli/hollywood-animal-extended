import { loadInstrumentedApp } from './helpers/legacyHarness.js';

/**
 * Persistence of the Excluded Elements list.
 *
 * The exclusion list determines the pool every generator draws from, so losing
 * it on reload costs the player more than any other piece of state in the app.
 * These cover the serialise/parse edges, which are where stored state goes
 * wrong: a hand-edited value, a tag removed by a later game patch, or storage
 * that is simply unavailable.
 */
describe('Exclusion store', () => {
    let h;

    beforeAll(async () => {
        h = await loadInstrumentedApp();
    });

    describe('serializeExclusions', () => {
        test('keeps only the id and category restoreSelection needs', () => {
            const result = h.call('HACExclusionStore.serializeExclusions', [
                { id: 'PROTAGONIST_COWBOY', category: 'Protagonist', percent: 1, name: 'Cowboy' }
            ]);

            expect(result).toEqual([{ id: 'PROTAGONIST_COWBOY', category: 'Protagonist' }]);
        });

        test('drops entries missing an id or a category', () => {
            const result = h.call('HACExclusionStore.serializeExclusions', [
                { id: 'A', category: 'Genre' },
                { id: 'B' },
                { category: 'Finale' },
                null
            ]);

            expect(result).toEqual([{ id: 'A', category: 'Genre' }]);
        });
    });

    describe('parseStoredExclusions', () => {
        test('reads back what serialize wrote', () => {
            const raw = JSON.stringify([{ id: 'GENRE_ACTION', category: 'Genre' }]);
            const result = h.call('HACExclusionStore.parseStoredExclusions', raw, { GENRE_ACTION: {} });

            expect(result).toEqual([{ id: 'GENRE_ACTION', category: 'Genre' }]);
        });

        test('returns nothing for malformed JSON rather than throwing', () => {
            expect(h.call('HACExclusionStore.parseStoredExclusions', '{not json', {})).toEqual([]);
        });

        test('returns nothing when the stored value is not an array', () => {
            expect(h.call('HACExclusionStore.parseStoredExclusions', '{"id":"X"}', {})).toEqual([]);
        });

        test('drops tags the current game data no longer defines', () => {
            // A tag renamed or removed by a game patch must not resurrect.
            const raw = JSON.stringify([
                { id: 'STILL_HERE', category: 'Genre' },
                { id: 'REMOVED_IN_PATCH', category: 'Genre' }
            ]);

            const result = h.call('HACExclusionStore.parseStoredExclusions', raw, { STILL_HERE: {} });

            expect(result).toEqual([{ id: 'STILL_HERE', category: 'Genre' }]);
        });

        test('keeps every entry when no tag dictionary is supplied', () => {
            const raw = JSON.stringify([{ id: 'ANYTHING', category: 'Finale' }]);
            expect(h.call('HACExclusionStore.parseStoredExclusions', raw, null)).toHaveLength(1);
        });

        test('drops entries whose fields are the wrong type', () => {
            const raw = JSON.stringify([{ id: 7, category: 'Genre' }, { id: 'OK', category: 3 }]);
            expect(h.call('HACExclusionStore.parseStoredExclusions', raw, null)).toEqual([]);
        });
    });

    describe('storage unavailability', () => {
        test('saving reports failure instead of throwing when storage is absent', () => {
            // The harness context has no localStorage, which is the same shape as
            // a private window or blocked site data.
            expect(h.call('HACExclusionStore.saveExclusions')).toBe(false);
        });

        test('loading returns an empty list when storage is absent', () => {
            expect(h.call('HACExclusionStore.loadExclusions')).toEqual([]);
        });

        test('restoring reports nothing restored when storage is absent', () => {
            expect(h.call('HACExclusionStore.restoreStoredExclusions')).toBe(0);
        });
    });
});
