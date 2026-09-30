import { describe, test, expect } from '@jest/globals';
import { loadLegacyScript } from './helpers/legacyHarness.js';

describe('generation uses the surviving element pool', () => {
    test.each(['Supporting Character', 'Theme & Event'])(
        'fills a complete script when all %s picks are excluded', async (emptyCategory) => {
            const h = await loadLegacyScript();
            await h.callAsync('HACDataLoaders.ensureScoringDataLoaded');
            // Force the exhausted category to be attempted first.
            h.evaluate(`Math.random = () => ${emptyCategory === 'Supporting Character' ? 0 : 0.75}`);
            const excluded = Object.values(h.GAME_DATA.tags)
                .filter(tag => tag.category === emptyCategory).map(tag => ({ id: tag.id }));
            const script = h.call('runGenerationAlgorithm', 4, 5, [], excluded);

            expect(h.call('HACGravesAnalysis.storyElementsOf', script.tags)).toHaveLength(5);
            expect(script.tags.some(tag => tag.category === emptyCategory)).toBe(false);
            expect(new Set(script.tags.map(tag => tag.id)).size).toBe(script.tags.length);
            expect(Number.isFinite(script.scores.commercial)).toBe(true);
            expect(Number.isFinite(script.scores.artistic)).toBe(true);
        }
    );
});
