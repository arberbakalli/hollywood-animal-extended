import { describe, test, expect, beforeAll } from '@jest/globals';
import { loadLegacyScript } from './helpers/legacyHarness.js';

// Owner ruling 2026-10-08 (GAME_RULES section 1): one genre is 100%; two to
// eleven genres hold at least 5% each, in 5% steps, summing to 100%. Build for
// Target used 1/n (33.33% each for three), a split the player cannot build.
describe('Build for Target scores genres with shares the player can build', () => {
    let h;
    beforeAll(async () => { h = await loadLegacyScript(); });

    const sharesFor = count => {
        const genres = Array.from({ length: count }, (_, i) => ({ id: `G${i}`, category: 'Genre' }));
        const weighted = h.call('HACTargetedAds.withCompatibilityWeights', [...genres, { id: 'P', category: 'Protagonist' }]);
        return weighted.filter(tag => tag.category === 'Genre').map(tag => Math.round(tag.percent * 100));
    };

    test.each([[1, [100]], [2, [50, 50]], [3, [35, 35, 30]], [4, [25, 25, 25, 25]], [11, [10, 10, 10, 10, 10, 10, 10, 10, 10, 5, 5]]])(
        '%i genres get %j percent', (count, expected) => {
            expect(sharesFor(count).sort((a, b) => b - a)).toEqual(expected);
        });

    test('every share is a 5% step of at least 5%, and the shares sum to 100%', () => {
        for (let count = 1; count <= 11; count++) {
            const shares = sharesFor(count);
            expect(shares.reduce((sum, share) => sum + share, 0)).toBe(100);
            shares.forEach(share => {
                expect(share % 5).toBe(0);
                expect(share).toBeGreaterThanOrEqual(5);
            });
        }
    });

    // Boundaries a player can build (owner, 2026-10-08): the even split above is
    // only Build for Target's choice; these extremes must stay legal.
    test.each([[[95, 5]], [[5, 95]], [[50, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5]], [[5, 5, 90]]])(
        'the player-built split %j is kept as it is', (split) => {
            expect(h.call('HACGenreMix.splitGenrePercent', 100, split)).toEqual(split);
            expect(h.evaluate('HACGenreMix.GENRE_PERCENT_MIN')).toBe(5);
        });

    test('non-genre elements keep full weight', () => {
        const weighted = h.call('HACTargetedAds.withCompatibilityWeights',
            [{ id: 'G', category: 'Genre' }, { id: 'P', category: 'Protagonist' }]);
        expect(weighted.find(tag => tag.id === 'P').percent).toBe(1);
    });
});
