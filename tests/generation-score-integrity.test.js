import { loadLegacyScript } from './helpers/legacyHarness.js';

describe.each(['custom', 'starting'])('%s generation score integrity', profile => {
    test.each([5, 6, 7, 8, 9, 10])('%i story elements stay finite across twelve reproducible searches', async count => {
        const h = await loadLegacyScript();
        await h.callAsync('HACDataLoaders.ensureScoringDataLoaded');
        const excluded = profile === 'starting' ? Object.keys(h.GAME_DATA.tags)
            .filter(id => !h.GAME_DATA.starterWhitelist.includes(id)).map(id => ({ id })) : [];
        const bannedIds = new Set(excluded.map(tag => tag.id));
        for (let seed = 1; seed <= 12; seed++) {
            h.evaluate(`globalThis.seed = ${seed}; Math.random = () => {
                seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
                return seed / 4294967296;
            };`);
            const locks = seed % 2 === 0 ? [
                { id: 'ACTION', category: 'Genre', percent: 0.8 },
                { id: 'COMEDY', category: 'Genre', percent: 0.2 },
            ] : [];
            const script = h.call('runGenerationAlgorithm', 4, count, locks, excluded);
            expect(h.call('HACGravesAnalysis.storyElementsOf', script.tags)).toHaveLength(count);
            expect(new Set(script.tags.map(tag => tag.id)).size).toBe(script.tags.length);
            expect(script.tags.some(tag => bannedIds.has(tag.id))).toBe(false);
            for (const category of ['Setting', 'Protagonist']) {
                expect(script.tags.filter(tag => tag.category === category)).toHaveLength(1);
            }
            for (const category of ['Antagonist', 'Finale']) {
                expect(script.tags.filter(tag => tag.category === category).length).toBeLessThanOrEqual(1);
            }
            expect(script.tags.filter(tag => tag.category === 'Genre').length).toBeGreaterThanOrEqual(1);
            for (const lock of locks) expect(script.tags).toContainEqual(lock);
            const evaluated = h.call('calculateScriptEvaluation', script.tags);
            for (const field of ['commercial', 'artistic']) {
                expect(Number.isFinite(script.scores[field])).toBe(true);
                expect(script.scores[field]).toBe(evaluated.movieScores[field]);
                expect(script.scores[field]).toBeGreaterThanOrEqual(0);
                expect(script.scores[field]).toBeLessThanOrEqual(evaluated.movieScores.tagCap);
            }
            expect(Number.isFinite(script.stats.avgComp)).toBe(true);
            expect(Number.isFinite(script.stats.synergySum)).toBe(true);
            expect(Number.isFinite(Number(script.stats.movieScore))).toBe(true);
        }
    });
});
