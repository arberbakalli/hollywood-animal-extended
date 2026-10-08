import { loadLegacyScript } from './helpers/legacyHarness.js';

describe('Marketing cross-feature contracts', () => {
    let h;
    beforeAll(async () => {
        h = await loadLegacyScript();
        await h.ensureCompatibilityLoaded();
        // Only the empty exclusion-list DOM is stubbed; ranking and scoring run unchanged.
        h.evaluate('document.getElementById = () => ({ querySelectorAll: () => [] })');
    });

    test('Build for Target and balanced Analyze share every per-agency score and grade', async () => {
        const agencies = h.GAME_DATA.adAgents;
        const results = await h.callAsync('HACTargetedAds.searchForTargetCombinations', agencies, [], [], 5, 5);
        expect(results).toHaveLength(5);
        for (const result of results) {
            const tags = result.tags.map(tag => h.GAME_DATA.tags[tag.id]);
            const analyzed = h.call('HACAdvertiserMatcher.getRecommendations', { tags, movieLean: 0 });
            expect(analyzed.allScores).toHaveLength(agencies.length);
            for (const built of result.agencyScores) {
                const match = analyzed.allScores.find(entry => entry.agency.id === built.agency.id);
                expect(match).toBeDefined();
                expect(match.score).toBe(built.score);
                expect(match.grade).toBe(h.call('predictGradeFromScore', built.score).grade);
                expect(Number.isFinite(built.score)).toBe(true);
            }
            const average = analyzed.allScores.reduce((sum, entry) => sum + entry.score, 0) / agencies.length;
            expect(result.avgScore).toBeCloseTo(average, 12);
            expect(result.grade).toBe(h.call('predictGradeFromScore', average).grade);
        }
        const scores = results.map(result => result.avgScore);
        expect(scores).toEqual([...scores].sort((a, b) => b - a));
    });

    test.each(['Genre', 'Setting', 'Protagonist'])(
        'excluding every %s yields no incomplete Build for Target script', category => {
            const available = Object.values(h.GAME_DATA.tags).filter(tag => tag.category !== category);
            expect(available.length).toBeGreaterThan(0);
            expect(h.call('generateTargetedCombinations', available, [], h.GAME_DATA.adAgents, 5, 5)).toEqual([]);
        });

    test('full story locks still acquire their missing Genre and Setting', () => {
        const ids = ['PROTAGONIST_COWBOY', 'ANTAGONIST_BANDIT', 'FINALE_ANTAGONIST_GETS_KILLED',
            'SUPPORTINGCHARACTER_SIDEKICK', 'THEME_TREASURE_HUNT'];
        const locks = ids.map(id => h.GAME_DATA.tags[id]);
        expect(locks.every(Boolean)).toBe(true);
        const results = h.call('generateTargetedCombinations', Object.values(h.GAME_DATA.tags),
            locks, h.GAME_DATA.adAgents, 5, 5);
        expect(results).toHaveLength(5);
        for (const tags of results) {
            expect(tags).toHaveLength(7);
            expect(tags.filter(tag => tag.category === 'Genre')).toHaveLength(1);
            expect(tags.filter(tag => tag.category === 'Setting')).toHaveLength(1);
            expect(tags.map(tag => tag.id)).toEqual(expect.arrayContaining(ids));
        }
    });

    test('locks cannot consume the slots needed by mandatory story categories', () => {
        const locks = Object.values(h.GAME_DATA.tags).filter(tag => tag.category === 'Theme & Event').slice(0, 5);
        expect(locks).toHaveLength(5);
        expect(h.call('generateTargetedCombinations', Object.values(h.GAME_DATA.tags),
            locks, h.GAME_DATA.adAgents, 5, 5)).toEqual([]);
    });
});
