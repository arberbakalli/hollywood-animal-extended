import { loadInstrumentedApp } from './helpers/legacyHarness.js';

/**
 * Build for Target walks the ranked pool from each offset in turn. With the
 * real pool every walk happens to land on a different set, so removing the
 * duplicate check changed no existing test (review 2026-10-06). Here the pool
 * holds exactly one legal set, so every walk lands on it: only the duplicate
 * check keeps the list to one suggestion.
 */
describe('Build for Target: one suggestion per element set', () => {
    let h;

    beforeAll(async () => {
        h = await loadInstrumentedApp();
        await h.ensureCompatibilityLoaded();
    });

    const ONLY_SET = ['DRAMA', 'WILD_WEST', 'PROTAGONIST_COWBOY', 'ANTAGONIST_MURDERER',
        'SUPPORTINGCHARACTER_SIDEKICK', 'THEME_TREASURE_HUNT', 'FINALE_ANTAGONIST_GETS_PUNISHED'];

    test('a pool that allows one set yields one suggestion, not one per offset', () => {
        const tags = ONLY_SET.map(id => ({ id, ...h.GAME_DATA.tags[id] }));
        expect(tags.every(tag => tag.category)).toBe(true);
        const agency = h.GAME_DATA.adAgents[0];

        const combos = HACTargetedAds.generateTargetedCombinations(tags, [], [agency], 5);

        const sets = combos.map(combo => combo.map(tag => tag.id).sort().join('|'));
        expect(sets).toEqual([[...ONLY_SET].sort().join('|')]);
    });
});
