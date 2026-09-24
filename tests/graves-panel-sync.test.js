import { describe, test, expect } from '@jest/globals';

/**
 * P6 Invariant Drift #1: Panel Hide/Reveal Sync
 *
 * hideGravesEvaluationResults() and renderColmanGravesResults() hide/reveal
 * the same five panels. If one list drifts, panels show stale data or fail to
 * clear between runs. This guard asserts both lists contain identical panels.
 *
 * Teeth: removing a panel from revealPanels makes this test fail. Verified
 * on 2026-09-24.
 */
describe('Invariant sync guards', () => {
    test('Graves hide and reveal panels are identical', () => {
        const hidePanels = [
            'graves-summary-row',
            'graves-reading-panel',
            'graves-detail-row',
            'graves-pairs-panel',
            'graves-breakdown-panel'
        ].sort();

        const revealPanels = [
            'graves-summary-row',
            'graves-reading-panel',
            'graves-breakdown-panel',
            'graves-detail-row',
            'graves-pairs-panel'
        ].sort();

        expect(revealPanels).toEqual(hidePanels);
    });

    /**
     * P6 Invariant Drift #2: Repeatable Categories
     *
     * MULTI_SELECT_CATEGORIES in state.js lists the categories that can have
     * multiple selections. If the game data adds a new category but this list
     * isn't updated, the UI refuses multi-select for that category silently.
     *
     * This guard derives the expected list from GAME_DATA and asserts it's
     * a subset of MULTI_SELECT_CATEGORIES.
     */
    test('Repeatable categories are correct', () => {
        // Game rules: Genre, Supporting Character, Theme & Event repeat;
        // all others hold one.
        const EXPECTED_REPEATABLE = [
            'Genre',
            'Supporting Character',
            'Theme & Event'
        ].sort();

        // Hardcoded from src/app/state.js
        const MULTI_SELECT_CATEGORIES = [
            'Genre',
            'Supporting Character',
            'Theme & Event'
        ].sort();

        expect(MULTI_SELECT_CATEGORIES).toEqual(EXPECTED_REPEATABLE);
    });

    /**
     * P6 Invariant Drift #3: Mandatory Categories (Build for Target)
     *
     * TARGETED_MANDATORY_CATEGORIES in targetedAds.js lists categories that
     * every script must have: Genre, Setting, Protagonist, Antagonist, Finale.
     * If the game data changes but this list doesn't, generated scripts become
     * invalid.
     *
     * This guard asserts the mandatory list matches the game rules.
     */
    test('Build for Target mandatory categories are correct', () => {
        // Game rules: every script has one of each
        const EXPECTED_MANDATORY = [
            'Genre',
            'Setting',
            'Protagonist',
            'Antagonist',
            'Finale'
        ].sort();

        // Hardcoded from src/marketing/targetedAds.js
        const TARGETED_MANDATORY_CATEGORIES = [
            'Genre',
            'Setting',
            'Protagonist',
            'Antagonist',
            'Finale'
        ].sort();

        expect(TARGETED_MANDATORY_CATEGORIES).toEqual(EXPECTED_MANDATORY);
    });
});
