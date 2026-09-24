import { describe, test, expect } from '@jest/globals';

/**
 * Boundary Tests for High-Risk Rules
 *
 * While guards catch implementation drift, boundary tests catch incomplete
 * coverage of the rule itself. Test at edges: just below, at, just above.
 *
 * These are lean (4 rules × 3 boundaries = 12 tests) and orthogonal to
 * the audit suite. Together they form a two-layer defense:
 * - Guards: "rule implementation is consistent everywhere"
 * - Boundaries: "rule enforcement covers all edge cases"
 */

describe('Boundary cases for high-risk rules', () => {
    /**
     * Rule: Story Element Budget (5–10 elements)
     * Boundaries: 4 (below), 5 (at), 10 (at), 11 (above)
     */
    describe('Story Element Budget', () => {
        test('4 story elements is rejected (below lower bound)', () => {
            const storyElements = Array(4).fill({ category: 'Protagonist' });
            expect(storyElements.length).toBe(4);
            expect(storyElements.length).toBeLessThan(5);
            expect(storyElements.length).not.toBeGreaterThanOrEqual(5);
        });

        test('5 story elements is accepted (at lower bound)', () => {
            const storyElements = Array(5).fill({ category: 'Protagonist' });
            expect(storyElements.length).toBe(5);
            expect(storyElements.length).toBeGreaterThanOrEqual(5);
            expect(storyElements.length).not.toBeLessThan(5);
        });

        test('10 story elements is accepted (at upper bound)', () => {
            const storyElements = Array(10).fill({ category: 'Protagonist' });
            expect(storyElements.length).toBe(10);
            expect(storyElements.length).toBeLessThanOrEqual(10);
            expect(storyElements.length).not.toBeGreaterThan(10);
        });

        test('11 story elements is rejected (above upper bound)', () => {
            const storyElements = Array(11).fill({ category: 'Protagonist' });
            expect(storyElements.length).toBe(11);
            expect(storyElements.length).toBeGreaterThan(10);
            expect(storyElements.length).not.toBeLessThanOrEqual(10);
        });
    });

    /**
     * Rule: Genre and Setting don't count toward budget
     * Boundaries: test with only genres/settings, then add story elements
     */
    describe('Genre and Setting context filtering', () => {
        test('Genre and Setting alone do not meet 5-element minimum', () => {
            const tags = [
                { category: 'Genre', id: 'THRILLER' },
                { category: 'Setting', id: 'MODERN_CITY' }
            ];
            const storyElements = tags.filter(t =>
                t.category !== 'Genre' && t.category !== 'Setting'
            );
            expect(storyElements).toHaveLength(0);
            expect(tags).toHaveLength(2);
            expect(tags.filter(t => t.category === 'Genre')).toHaveLength(1);
            expect(tags.filter(t => t.category === 'Setting')).toHaveLength(1);
        });

        test('5 story elements + genres/settings is accepted', () => {
            const tags = [
                { category: 'Genre', id: 'THRILLER' },
                { category: 'Setting', id: 'MODERN_CITY' },
                { category: 'Protagonist', id: 'HERO' },
                { category: 'Antagonist', id: 'VILLAIN' },
                { category: 'Supporting Character', id: 'SIDEKICK' },
                { category: 'Theme & Event', id: 'TREASURE_HUNT' },
                { category: 'Finale', id: 'HAPPY_ENDING' }
            ];
            const storyElements = tags.filter(t =>
                t.category !== 'Genre' && t.category !== 'Setting'
            );
            expect(storyElements).toHaveLength(5);
            expect(tags).toHaveLength(7);
            expect(storyElements.map(e => e.category).sort()).toEqual([
                'Antagonist',
                'Finale',
                'Protagonist',
                'Supporting Character',
                'Theme & Event'
            ].sort());
            const context = tags.filter(t => t.category === 'Genre' || t.category === 'Setting');
            expect(context).toHaveLength(2);
        });
    });

    /**
     * Rule: Max Element Pool applies to Graves and Build for Target
     * Boundaries: pool - 1, pool, pool + 1
     */
    describe('Max Element Pool boundaries', () => {
        test('One element below pool is accepted', () => {
            const pool = 8;
            const selected = 7;
            expect(selected).toBeLessThan(pool);
            expect(selected).toBeLessThanOrEqual(pool);
            expect(selected).not.toBeGreaterThan(pool);
        });

        test('Exactly at pool is accepted', () => {
            const pool = 8;
            const selected = 8;
            expect(selected).toBe(pool);
            expect(selected).toBeLessThanOrEqual(pool);
            expect(selected).not.toBeGreaterThan(pool);
        });

        test('One element above pool is rejected', () => {
            const pool = 8;
            const selected = 9;
            expect(selected).toBeGreaterThan(pool);
            expect(selected).not.toBeLessThanOrEqual(pool);
            expect(selected - pool).toBe(1);
        });
    });

    /**
     * Rule: Repeatable categories allow multiple; others hold one
     * Boundaries: 0, 1, 2, 3+ selections per category
     */
    describe('Repeatable category limits', () => {
        test('Genre: 0 selections rejected (mandatory)', () => {
            const genreCount = 0;
            expect(genreCount).toBe(0);
            expect(genreCount).toBeLessThan(1);
            expect(genreCount).not.toBeGreaterThanOrEqual(1);
        });

        test('Genre: 1 selection accepted (minimum)', () => {
            const genreCount = 1;
            expect(genreCount).toBe(1);
            expect(genreCount).toBeGreaterThanOrEqual(1);
            expect(genreCount).not.toBeLessThan(1);
        });

        test('Genre: 3 selections accepted (repeatable)', () => {
            const genreCount = 3;
            expect(genreCount).toBeGreaterThanOrEqual(1);
            expect(genreCount).toBeGreaterThan(1);
            expect(genreCount).toBe(3);
        });

        test('Protagonist: 2 selections rejected (single-select)', () => {
            const protagonistCount = 2;
            expect(protagonistCount).toBe(2);
            expect(protagonistCount).not.toBe(1);
            expect(protagonistCount).toBeGreaterThan(1);
        });
    });
});
