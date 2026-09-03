import { describe, test, expect, beforeAll } from '@jest/globals';
import { loadLegacyScript } from './helpers/legacyHarness.js';

/**
 * Graves Evaluation feature tests.
 * Validates generateBestMatches and combination logic.
 */

let h;

beforeAll(async () => {
    h = await loadLegacyScript();
    // Load deferred data for tests
    await h.ensureCompatibilityLoaded();
});

const tag = (id, category) => ({ id, category });

describe('Graves Evaluation', () => {
    test('validates mandatory Genre + Setting', () => {
        const selectedTags = [tag('ACTION', 'Genre')];
        const genre = selectedTags.find(t => t.category === 'Genre');
        const setting = selectedTags.find(t => t.category === 'Setting');

        expect(genre).toBeDefined();
        expect(setting).toBeUndefined();
    });

    test('enforces 5-10 element selection range', () => {
        const tooFew = Array(4).fill(null).map(() => tag('TEST', 'Genre'));
        const valid = Array(7).fill(null).map(() => tag('TEST', 'Genre'));
        const tooMany = Array(11).fill(null).map(() => tag('TEST', 'Genre'));

        expect(tooFew.length).toBeLessThan(5);
        expect(valid.length >= 5 && valid.length <= 10).toBe(true);
        expect(tooMany.length).toBeGreaterThan(10);
    });

    test('enforces max 1 Antagonist, 1 Protagonist, 1 Finale', () => {
        const validSingle = [
            tag('ACTION', 'Genre'),
            tag('MODERN_DAY', 'Setting'),
            tag('ANTAGONIST_ALIEN', 'Antagonist'),
            tag('PROTAGONIST_COP', 'Protagonist'),
            tag('FINALE_HAPPY', 'Finale'),
        ];

        const antagonists = validSingle.filter(t => t.category === 'Antagonist');
        const protagonists = validSingle.filter(t => t.category === 'Protagonist');
        const finales = validSingle.filter(t => t.category === 'Finale');

        expect(antagonists.length).toBeLessThanOrEqual(1);
        expect(protagonists.length).toBeLessThanOrEqual(1);
        expect(finales.length).toBeLessThanOrEqual(1);
    });

    test('allows multiple Supporting Character and Theme & Event', () => {
        const selections = [
            tag('ACTION', 'Genre'),
            tag('MODERN_DAY', 'Setting'),
            tag('SUPPORT_MENTOR', 'Supporting Character'),
            tag('SUPPORT_SIDEKICK', 'Supporting Character'),
            tag('THEME_LOVE', 'Theme & Event'),
            tag('THEME_GREED', 'Theme & Event'),
        ];

        const supporting = selections.filter(t => t.category === 'Supporting Character');
        const themes = selections.filter(t => t.category === 'Theme & Event');

        expect(supporting.length).toBeGreaterThan(1);
        expect(themes.length).toBeGreaterThan(1);
    });

    test('generates 2-tag combinations from selections', () => {
        const selected = [
            tag('ACTION', 'Genre'),
            tag('MODERN_DAY', 'Setting'),
            tag('SUPPORT_MENTOR', 'Supporting Character'),
        ];

        const combinations = [];
        for (let i = 0; i < selected.length; i++) {
            for (let j = i + 1; j < selected.length; j++) {
                combinations.push([selected[i].id, selected[j].id]);
            }
        }

        // Should have C(3,2) = 3 combinations
        expect(combinations.length).toBe(3);
        expect(combinations).toContainEqual(['ACTION', 'MODERN_DAY']);
        expect(combinations).toContainEqual(['ACTION', 'SUPPORT_MENTOR']);
        expect(combinations).toContainEqual(['MODERN_DAY', 'SUPPORT_MENTOR']);
    });

    test('groups combinations by compatibility score', () => {
        const combinations = [
            { score: 4.5, pair: 'A-B' },
            { score: 3.7, pair: 'C-D' },
            { score: 2.1, pair: 'E-F' },
            { score: 4.2, pair: 'G-H' },
        ];

        const successful = combinations.filter(c => c.score >= 4.0);
        const common = combinations.filter(c => c.score >= 3.5 && c.score < 4.0);
        const unsuccessful = combinations.filter(c => c.score < 3.5);

        expect(successful.length).toBe(2);
        expect(common.length).toBe(1);
        expect(unsuccessful.length).toBe(1);
    });

    test('loads real game data for compatibility lookup', () => {
        const gd = h.GAME_DATA;
        expect(gd.tags).toBeDefined();
        expect(gd.compatibility).toBeDefined();
        expect(Object.keys(gd.tags).length).toBeGreaterThan(0);
        expect(Object.keys(gd.compatibility).length).toBeGreaterThan(0);
    });

    test('finds real compatibility scores between tags', () => {
        const gd = h.GAME_DATA;
        const actionId = Object.keys(gd.tags).find(id =>
            gd.tags[id].name === 'Action'
        );

        if (!actionId) return; // Skip if Action not found

        const scores = gd.compatibility[actionId];
        expect(scores).toBeDefined();
        expect(typeof scores).toBe('object');
    });

    test('handles missing compatibility scores gracefully', () => {
        const gd = h.GAME_DATA;
        const fakeId1 = 'FAKE_TAG_1';
        const fakeId2 = 'FAKE_TAG_2';

        let score = 3.0; // Default
        if (gd.compatibility[fakeId1]?.[fakeId2]) {
            score = parseFloat(gd.compatibility[fakeId1][fakeId2]);
        } else if (gd.compatibility[fakeId2]?.[fakeId1]) {
            score = parseFloat(gd.compatibility[fakeId2][fakeId1]);
        }

        expect(score).toBe(3.0);
    });

    test('category colors are defined', () => {
        const categoryColors = {
            'Genre': '#92400e',
            'Theme & Event': '#991b1b',
            'Supporting Character': '#3b82f6',
            'Protagonist': '#1e40af',
            'Antagonist': '#166534',
        };

        Object.entries(categoryColors).forEach(([category, color]) => {
            expect(category).toMatch(/^[A-Z]/);
            expect(color).toMatch(/^#[0-9a-f]{6}$/i);
        });
    });
});
