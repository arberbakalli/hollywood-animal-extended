import { loadLegacyScript } from './helpers/legacyHarness.js';

/**
 * Build for Target: story-element budget and combination sizing.
 *
 * Guards the category-name bug that shipped twice: the app's Setting category is
 * singular ("Setting"). Filtering on "Settings" silently matches nothing, so
 * every Setting tag was counted against the story-element budget.
 */
describe('Build for Target', () => {
    let h;

    beforeAll(async () => {
        h = await loadLegacyScript();
    });

    describe('category naming', () => {
        test('the Setting category is singular, not plural', () => {
            const categories = new Set(
                Object.values(h.GAME_DATA.tags).map(tag => tag.category)
            );

            expect(categories.has('Setting')).toBe(true);
            expect(categories.has('Settings')).toBe(false);
        });
    });

    describe('scoringElementsOf', () => {
        const scoringElementsOf = tags =>
            tags.filter(tag => tag.category !== 'Genre' && tag.category !== 'Setting');

        test('excludes Genre and Setting from the budget', () => {
            const selected = [
                { id: 'g', category: 'Genre' },
                { id: 's', category: 'Setting' },
                { id: 'p', category: 'Protagonist' },
                { id: 'a', category: 'Antagonist' },
                { id: 't', category: 'Theme & Event' }
            ];

            expect(scoringElementsOf(selected)).toHaveLength(3);
        });

        test('one tag per category does not blow a 10-element budget', () => {
            // The reported bug: picking one of each threw "select 6 items".
            const oneOfEach = [
                { id: 'g', category: 'Genre' },
                { id: 's', category: 'Setting' },
                { id: 'a', category: 'Antagonist' },
                { id: 'p', category: 'Protagonist' },
                { id: 'sc', category: 'Supporting Character' },
                { id: 't', category: 'Theme & Event' },
                { id: 'f', category: 'Finale' }
            ];

            expect(scoringElementsOf(oneOfEach).length).toBeLessThanOrEqual(10);
        });

        test('a plural filter would have missed every Setting tag', () => {
            const wrong = tags =>
                tags.filter(tag => tag.category !== 'Genre' && tag.category !== 'Settings');

            const selected = [
                { id: 'g', category: 'Genre' },
                { id: 's', category: 'Setting' },
                { id: 'p', category: 'Protagonist' }
            ];

            expect(wrong(selected)).toHaveLength(2);
            expect(scoringElementsOf(selected)).toHaveLength(1);
        });
    });

    describe('combination sizing', () => {
        // Genre and Setting sit outside the budget, so a script of N story
        // elements is N + 2 tags wide.
        const comboSize = budget => budget + 2;

        test('budget of 5 produces 7-tag combinations', () => {
            expect(comboSize(5)).toBe(7);
        });

        test('budget of 10 produces 12-tag combinations', () => {
            expect(comboSize(10)).toBe(12);
        });

        test('every budget in range maps to a distinct combination width', () => {
            const widths = [5, 6, 7, 8, 9, 10].map(comboSize);
            expect(new Set(widths).size).toBe(6);
        });
    });

    describe('agency filtering', () => {
        const resolveAgencies = (advertisers, audiences, allAgencies) => {
            if (advertisers.length > 0) {
                return allAgencies.filter(a => advertisers.includes(a.id));
            }
            if (audiences.length > 0) {
                return allAgencies.filter(a => audiences.some(aud => a.targets.includes(aud)));
            }
            return allAgencies;
        };

        const agencies = [
            { id: 'a1', targets: ['teens'] },
            { id: 'a2', targets: ['adults'] },
            { id: 'a3', targets: ['teens', 'adults'] }
        ];

        test('no selection falls back to every agency', () => {
            expect(resolveAgencies([], [], agencies)).toHaveLength(3);
        });

        test('an advertiser selection narrows to that advertiser', () => {
            expect(resolveAgencies(['a2'], [], agencies)).toEqual([agencies[1]]);
        });

        test('an audience selection narrows to agencies reaching it', () => {
            const result = resolveAgencies([], ['teens'], agencies);
            expect(result.map(a => a.id)).toEqual(['a1', 'a3']);
        });

        test('an advertiser selection wins over an audience selection', () => {
            const result = resolveAgencies(['a2'], ['teens'], agencies);
            expect(result.map(a => a.id)).toEqual(['a2']);
        });
    });
});

/**
 * Category cardinality in generated combinations.
 *
 * The game caps Setting, Protagonist, Antagonist and Finale at one each; only
 * Genre, Supporting Character and Theme & Event may repeat
 * (MULTI_SELECT_CATEGORIES in src/app/state.js, enforced for the UI in
 * storyElementSelector.js). generateTargetedCombinations ranked tags by
 * advertiser score and took sliding windows off that list without ever reading
 * tag.category, so it emitted combinations with two Protagonists and three
 * Antagonists — scripts no player can actually build.
 *
 * These call the real module through the harness rather than a local mirror, so
 * a regression in src/marketing/targetedAds.js fails here.
 */
describe('Build for Target — category cardinality', () => {
    let h;
    let combos;

    const SINGLE_SELECT = ['Setting', 'Protagonist', 'Antagonist', 'Finale'];
    const GENRE_CAP = 2;

    const countByCategory = combo =>
        combo.reduce((acc, tag) => {
            acc[tag.category] = (acc[tag.category] || 0) + 1;
            return acc;
        }, {});

    beforeAll(async () => {
        h = await loadLegacyScript();
        await h.ensureCompatibilityLoaded();

        const allTags = Object.values(h.GAME_DATA.tags).filter(t => t && t.id);
        const agencies = h.GAME_DATA.adAgents;

        combos = h.call('generateTargetedCombinations', allTags, [], agencies, 12, 20);
    });

    test('the generator returns combinations to inspect', () => {
        expect(Array.isArray(combos)).toBe(true);
        expect(combos.length).toBeGreaterThan(0);
    });

    test.each(SINGLE_SELECT)('no combination carries more than one %s', category => {
        const offenders = combos
            .map(countByCategory)
            .filter(counts => (counts[category] || 0) > 1);

        expect(offenders).toHaveLength(0);
    });

    test('no combination exceeds the two-genre pair window', () => {
        const offenders = combos
            .map(countByCategory)
            .filter(counts => (counts.Genre || 0) > GENRE_CAP);

        expect(offenders).toHaveLength(0);
    });

    test('every combination is still the requested width', () => {
        combos.forEach(combo => expect(combo).toHaveLength(12));
    });

    test('combinations contain no duplicate tags', () => {
        combos.forEach(combo => {
            const ids = combo.map(tag => tag.id);
            expect(new Set(ids).size).toBe(ids.length);
        });
    });
});
