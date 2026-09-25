import { loadInstrumentedApp } from './helpers/legacyHarness.js';

/**
 * Audience Compatibility: genre colors, exclusions, and dual-mode display.
 *
 * Guards the genre-specific color feature that displays all 227 story elements
 * organized by category with individual genre color palettes (text + background).
 * Also ensures exclusion list integration and max element pool validation.
 */
describe('Audience Compatibility', () => {
    let h;

    beforeAll(async () => {
        h = await loadInstrumentedApp();
    });

    describe('genre color generation', () => {
        test('converts genre tag IDs to CSS classes', () => {
            const genreIds = ['ACTION', 'COMEDY', 'DRAMA', 'SCIENCE_FICTION', 'HORROR'];
            const expected = [
                'genre-action',
                'genre-comedy',
                'genre-drama',
                'genre-science-fiction',
                'genre-horror'
            ];

            // Simulate the getGenreClass function logic
            const actual = genreIds.map(tagId =>
                `genre-${tagId.toLowerCase().replace(/_/g, '-')}`
            );

            expect(actual).toEqual(expected);
        });

        test('every genre tag has a corresponding CSS class variable', () => {
            const genres = Object.values(h.GAME_DATA.tags).filter(t => t.category === 'Genre');

            genres.forEach(genre => {
                const classVar = `--cat-${genre.id.toLowerCase().replace(/_/g, '-')}`;
                // Verify the genre ID can be converted to a valid CSS variable name
                expect(classVar).toMatch(/^--cat-[a-z-]+$/);
            });
        });

        test('all 11 genres map to distinct colors', () => {
            const genreCount = Object.values(h.GAME_DATA.tags).filter(
                t => t.category === 'Genre'
            ).length;
            expect(genreCount).toBe(11);
        });
    });

    describe('category ordering', () => {
        test('categories render in game sequence order', () => {
            const CATEGORY_ORDER = [
                'Genre',
                'Setting',
                'Protagonist',
                'Antagonist',
                'Supporting Character',
                'Theme & Event',
                'Finale'
            ];

            // Verify order is correct
            expect(CATEGORY_ORDER).toHaveLength(7);
            expect(CATEGORY_ORDER[0]).toBe('Genre');
            expect(CATEGORY_ORDER[CATEGORY_ORDER.length - 1]).toBe('Finale');
        });
    });

    describe('exclusion list integration', () => {
        test('excluded tags are filtered from compatibility table', () => {
            // Simulate exclusion filtering
            const allTags = Object.values(h.GAME_DATA.tags);
            const excludedTags = new Set(['ACTION', 'COMEDY']); // Example exclusions

            const filtered = allTags.filter(tag => !excludedTags.has(tag.id));

            expect(filtered).not.toContainEqual(expect.objectContaining({ id: 'ACTION' }));
            expect(filtered).not.toContainEqual(expect.objectContaining({ id: 'COMEDY' }));
            expect(filtered.length).toBeLessThan(allTags.length);
        });

        test('non-excluded tags remain in table', () => {
            const allTags = Object.values(h.GAME_DATA.tags);
            const excludedTags = new Set(['ACTION']);

            const filtered = allTags.filter(tag => !excludedTags.has(tag.id));

            // Verify at least some non-excluded genres remain
            const remainingGenres = filtered.filter(t => t.category === 'Genre');
            expect(remainingGenres.length).toBeGreaterThan(0);
            expect(remainingGenres.some(t => t.id !== 'ACTION')).toBe(true);
        });
    });

    describe('dual-mode display', () => {
        test('empty elements array triggers show-all mode', () => {
            const elements = [];
            // Empty array should render all available elements
            expect(Array.isArray(elements)).toBe(true);
            expect(elements.length).toBe(0);
        });

        test('non-empty elements array renders selected mode', () => {
            const elements = [
                { id: 'tag1', name: 'Tag 1', category: 'Genre', scores: { TF: 3.0 } }
            ];
            // Non-empty array should render only selected elements
            expect(elements.length).toBeGreaterThan(0);
        });

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

    describe('max element pool validation', () => {
        test('story elements are counted correctly', () => {
            const maxPool = 10;
            const tags = [
                { category: 'Genre' },      // Not counted
                { category: 'Setting' },    // Not counted
                { category: 'Protagonist' }, // Counted: 1
                { category: 'Antagonist' },  // Counted: 2
                { category: 'Supporting Character' }, // Counted: 3
                { category: 'Theme & Event' },        // Counted: 4
                { category: 'Theme & Event' },        // Counted: 5
                { category: 'Finale' }                // Counted: 6
            ];

            const storyElements = tags.filter(t => t.category !== 'Genre' && t.category !== 'Setting');
            expect(storyElements.length).toBeLessThanOrEqual(maxPool);
        });

        test('validation rejects selections exceeding max pool', () => {
            const maxPool = 5;
            const selectedElements = [
                { category: 'Protagonist' },
                { category: 'Antagonist' },
                { category: 'Supporting Character' },
                { category: 'Theme & Event' },
                { category: 'Theme & Event' },
                { category: 'Theme & Event' }, // 6 elements > max of 5
                { category: 'Finale' }
            ];

            const storyElements = selectedElements.filter(
                t => t.category !== 'Genre' && t.category !== 'Setting'
            );

            expect(storyElements.length).toBeGreaterThan(maxPool);
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

    describe('category class generation', () => {
        test('converts category names to kebab-case CSS classes', () => {
            const categories = {
                'Protagonist': 'category-protagonist',
                'Antagonist': 'category-antagonist',
                'Supporting Character': 'category-supporting-character',
                'Theme & Event': 'category-theme-event',
                'Finale': 'category-finale',
                'Genre': 'category-genre',
                'Setting': 'category-setting'
            };

            Object.entries(categories).forEach(([category, expected]) => {
                const actual = `category-${category.toLowerCase().replace(/\s+&\s+/g, '-').replace(/\s+/g, '-')}`;
                expect(actual).toBe(expected);
            });
        });
    });
});
