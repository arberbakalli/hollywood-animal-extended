import { loadInstrumentedApp } from './helpers/legacyHarness.js';

/**
 * Audience Compatibility: the game data the table is built from.
 *
 * How the table renders (genre colours, category order, exclusions, selected
 * versus show-all mode) is asserted against the real renderer in
 * tests/audience-compatibility-render.test.js.
 */
describe('Audience Compatibility', () => {
    let h;

    beforeAll(async () => {
        h = await loadInstrumentedApp();
    });

    describe('genre data', () => {
        test('the game data has 11 genres', () => {
            const genreCount = Object.values(h.GAME_DATA.tags).filter(
                t => t.category === 'Genre'
            ).length;
            expect(genreCount).toBe(11);
        });
    });

    describe('dual-mode display', () => {
        test('show-all mode includes all categories except empty ones', () => {
            const allTags = Object.values(h.GAME_DATA.tags);
            const categories = new Set(allTags.map(t => t.category));

            // Should have all main categories
            expect(categories.has('Genre')).toBe(true);
            expect(categories.has('Setting')).toBe(true);
            expect(categories.has('Protagonist')).toBe(true);
            expect(categories.has('Antagonist')).toBe(true);
            expect(categories.has('Supporting Character')).toBe(true);
            expect(categories.has('Theme & Event')).toBe(true);
            expect(categories.has('Finale')).toBe(true);
        });
    });

    describe('demographic scores', () => {
        test('all genres have complete demographic weight data', () => {
            const genres = Object.values(h.GAME_DATA.tags).filter(t => t.category === 'Genre');
            const demographics = ['TF', 'TM', 'YF', 'YM', 'AF', 'AM'];

            genres.forEach(genre => {
                demographics.forEach(demo => {
                    expect(genre.weights).toHaveProperty(demo);
                    expect(typeof genre.weights[demo]).toBe('number');
                });
            });
        });

        test('demographic scores are within valid range', () => {
            const genres = Object.values(h.GAME_DATA.tags).filter(t => t.category === 'Genre');
            const demographics = ['TF', 'TM', 'YF', 'YM', 'AF', 'AM'];

            genres.forEach(genre => {
                demographics.forEach(demo => {
                    const score = genre.weights[demo];
                    // Scores should be between -5.0 and +5.0
                    expect(score).toBeGreaterThanOrEqual(-5.0);
                    expect(score).toBeLessThanOrEqual(5.0);
                });
            });
        });
    });
});
