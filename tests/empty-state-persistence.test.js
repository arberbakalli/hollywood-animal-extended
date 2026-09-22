import { beforeAll, describe, expect, test } from '@jest/globals';
import { loadLegacyScript } from './helpers/legacyHarness.js';

describe('Production edge cases and state helpers', () => {
    let h;

    beforeAll(async () => {
        h = await loadLegacyScript();
        await h.ensureCompatibilityLoaded();
    });

    test('zero commercial score produces zero demand for every distribution week', () => {
        expect(h.call('HACDistributionPlanner.weeklyDemandFor', 0))
            .toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
    });

    test('base distribution follows the extracted first weeks before capacity is applied', () => {
        const demand = h.call('HACDistributionPlanner.weeklyDemandFor', 5);

        expect(demand.slice(0, 4)).toEqual([10000, 5000, 4000, 3200]);
    });

    test('genre split returns no rows for no genre rows', () => {
        expect(h.call('HACGenreMix.splitGenrePercent', 100, [])).toEqual([]);
    });

    test('genre split stays in five-point steps and sums to 100', () => {
        const split = h.call('HACGenreMix.splitGenrePercent', 100, [1, 1, 1]);

        expect(split.reduce((sum, value) => sum + value, 0)).toBe(100);
        expect(split.every(value => value >= 5 && value % 5 === 0)).toBe(true);
    });

    test('script stats are built from real matrix and movie-score structures', () => {
        const stats = h.call(
            'HACScriptGenerationEngine.buildScriptStats',
            { rawAverage: 4.2, totalScore: 0.42 },
            { commercial: 6.4, artistic: 5.1, tagCap: 7 }
        );

        expect(stats).toEqual({
            avgComp: 4.2,
            synergySum: 0.42,
            maxScriptQuality: 6,
            movieScore: '6.4'
        });
    });

    test('building a saved script normalizes tags to id, category, and percent only', () => {
        const script = h.call('HACScriptGenerationEngine.buildScriptFromTags', [
            { id: 'ACTION', category: 'Genre', percent: 1, extra: 'drop me' },
            { id: 'WILD_WEST', category: 'Setting', percent: 1 },
            { id: 'PROTAGONIST_COWBOY', category: 'Protagonist', percent: 1 },
            { id: 'ANTAGONIST_BANDIT', category: 'Antagonist', percent: 1 },
            { id: 'FINALE_ANTAGONIST_GETS_KILLED', category: 'Finale', percent: 1 }
        ], 'Smoke script');

        expect(script.name).toBe('Smoke script');
        expect(script.tags[0]).toEqual({ id: 'ACTION', category: 'Genre', percent: 1 });
        expect(script.tags.every(tag => Object.keys(tag).sort().join(',') === 'category,id,percent'))
            .toBe(true);
        expect(script.stats.movieScore).toMatch(/^\d+\.\d$/);
    });
});
