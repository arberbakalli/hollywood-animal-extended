import { beforeAll, describe, expect, test } from '@jest/globals';
import { loadLegacyScript } from './helpers/legacyHarness.js';

describe('Generator lock and exclusion logic', () => {
    let h;

    beforeAll(async () => {
        h = await loadLegacyScript();
        await h.ensureGenrePairsLoaded();
    });

    test('Script Lab, Graves, Marketing, and Build for Target all use the shared exclusion source', () => {
        ['generator', 'graves', 'advertisers', 'targeted'].forEach(context => {
            expect(h.call('HACStoryElementSelector.contextUsesGlobalExclusions', context)).toBe(true);
        });

        expect(h.call('HACStoryElementSelector.contextUsesGlobalExclusions', 'excluded')).toBe(false);
    });

    test('custom availability means every loaded tag is available', () => {
        const allTagCount = Object.keys(h.GAME_DATA.tags).length;
        expect(h.evaluate("HACAvailabilityFilter.getAllAvailableTagIds('custom').size"))
            .toBe(allTagCount);
    });

    test('Starting Tags availability is exactly the starter whitelist', () => {
        const starterCount = h.GAME_DATA.starterWhitelist.length;
        expect(h.evaluate("HACAvailabilityFilter.getAllAvailableTagIds('starting').size"))
            .toBe(starterCount);
    });

    test('profile exclusions are derived from real starter data, not guessed constants', () => {
        const allTagCount = Object.keys(h.GAME_DATA.tags).length;
        const starterCount = h.GAME_DATA.starterWhitelist.length;

        h.evaluate("currentGenProfile = 'starting'");
        expect(h.evaluate('HACAvailabilityFilter.getProfileExcludedIds().size'))
            .toBe(allTagCount - starterCount);
        h.evaluate("currentGenProfile = 'custom'");
        expect(h.evaluate('HACAvailabilityFilter.getProfileExcludedIds().size')).toBe(0);
    });

    test('manual exclusions are the generator source of truth when supplied', () => {
        const manual = [
            { id: 'ACTION', category: 'Genre' },
            { id: 'WILD_WEST', category: 'Setting' }
        ];

        const excluded = h.call('HACAvailabilityFilter.getGeneratorExcludedIds', manual);

        expect([...excluded].sort()).toEqual(['ACTION', 'WILD_WEST']);
    });

    test('random tag lookup cannot return an excluded tag', () => {
        const genreIds = Object.values(h.GAME_DATA.tags)
            .filter(tag => tag.category === 'Genre')
            .map(tag => tag.id);

        const excludedAllButAction = new Set(genreIds.filter(id => id !== 'ACTION'));
        const picked = h.call('HACScriptGenerationEngine.getRandomTagByCategory', 'Genre', [], excludedAllButAction);
        expect(picked.id).toBe('ACTION');

        const excludedAll = new Set(genreIds);
        expect(h.call('HACScriptGenerationEngine.getRandomTagByCategory', 'Genre', [], excludedAll))
            .toBeNull();
    });

    test('compatible genre lookup filters excluded partner genres', () => {
        const fixture = h.evaluate(`(() => {
            for (const [source, targets] of Object.entries(GAME_DATA.genrePairs)) {
                const partner = Object.keys(targets || {})[0];
                if (partner) return { source, partner };
            }
            return null;
        })()`);

        expect(fixture).not.toBeNull();
        expect(h.call('HACScriptGenerationEngine.getCompatibleGenres', fixture.source, new Set()))
            .toContain(fixture.partner);
        expect(h.call('HACScriptGenerationEngine.getCompatibleGenres', fixture.source, new Set([fixture.partner])))
            .not.toContain(fixture.partner);
    });

    test('target movie score maps to the required scoring-element count used by generation', () => {
        expect(h.call('HACScriptGenerator.getRequiredElementCount', 6)).toBe(5);
        expect(h.call('HACScriptGenerator.getRequiredElementCount', 7)).toBe(6);
        expect(h.call('HACScriptGenerator.getRequiredElementCount', 9)).toBe(8);
        expect(h.call('HACScriptGenerator.getRequiredElementCount', 10)).toBe(9);
    });
});
