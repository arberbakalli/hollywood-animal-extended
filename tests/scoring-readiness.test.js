import { describe, test, expect } from '@jest/globals';
import { loadLegacyScript } from './helpers/legacyHarness.js';

describe('scoring data readiness', () => {
    test('loads compatibility and genre bonuses together before scores are calculated', async () => {
        const h = await loadLegacyScript();
        await h.callAsync('HACDataLoaders.ensureScoringDataLoaded');
        const genres = [
            { id: 'DRAMA', category: 'Genre', percent: 0.5 },
            { id: 'COMEDY', category: 'Genre', percent: 0.5 }
        ];

        // GenrePairs.json gives Drama/Comedy commercial 0.25 and artistic 0.1.
        expect(h.call('calculateTotalBonuses', genres)).toEqual({ com: 0.25, art: 0.1 });
        expect(h.call('getRawCompatibilityScore', genres[0], genres[1])).toBe(4);
    });

    test('a failed compatibility request stays retryable instead of becoming neutral scores', async () => {
        const h = await loadLegacyScript();
        h.evaluate(`globalThis.originalFetch = fetch;
            globalThis.fetch = async () => ({ ok: false, status: 503 });`);

        await expect(h.ensureCompatibilityLoaded()).rejects.toThrow('503');
        expect(h.evaluate('compatibilityLoaded')).toBe(false);

        h.evaluate('globalThis.fetch = originalFetch');
        await h.ensureCompatibilityLoaded();
        expect(Object.keys(h.GAME_DATA.compatibility).length).toBeGreaterThan(0);
        expect(h.evaluate('compatibilityLoaded')).toBe(true);
    });

    test('concurrent scoring requests share each data load', async () => {
        const h = await loadLegacyScript();
        h.evaluate(`globalThis.originalFetch = fetch; globalThis.requests = [];
            globalThis.fetch = async (path) => { requests.push(path); return originalFetch(path); };`);

        await Promise.all([
            h.callAsync('HACDataLoaders.ensureScoringDataLoaded'),
            h.callAsync('HACDataLoaders.ensureScoringDataLoaded')
        ]);

        expect(h.evaluate('requests')).toEqual([
            'data/TagCompatibilityData.json', 'data/GenrePairs.json'
        ]);
    });
});
