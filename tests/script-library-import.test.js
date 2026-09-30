import { describe, test, expect, beforeAll, beforeEach, afterEach } from '@jest/globals';
import { loadInstrumentedApp } from './helpers/legacyHarness.js';

/**
 * A Script Library file is shared between players, so its contents are not
 * trusted. The loader accepted any entry that had `tags` and `uniqueId` and
 * rendered it as HTML: a name, tag id or category could inject markup, and one
 * entry without `stats` threw during rendering and blanked the whole library.
 *
 * Import now keeps only real game elements, takes each category from the game
 * data rather than the file, and recomputes stats from the tags.
 */
describe('Script Library import only accepts real scripts', () => {
    let h;

    const SCRIPT_TAGS = [
        { id: 'DRAMA', category: 'Genre', percent: 1 },
        { id: 'MODERN_AMERICAN_TOWN', category: 'Setting', percent: 1 },
        { id: 'PROTAGONIST_HOPELESS_ROMANTIC', category: 'Protagonist', percent: 1 },
        { id: 'ANTAGONIST_MURDERER', category: 'Antagonist', percent: 1 },
        { id: 'SUPPORTINGCHARACTER_DAMSEL_IN_DISTRESS', category: 'Supporting Character', percent: 1 },
        { id: 'THEME_LOVE_TRIANGLE', category: 'Theme & Event', percent: 1 },
        { id: 'FINALE_SWEETHEARTS_STAY_TOGETHER', category: 'Finale', percent: 1 },
    ];
    const exported = (overrides = {}) => ({
        ...JSON.parse(JSON.stringify(h.call('HACScriptGenerator.buildScriptFromTags', SCRIPT_TAGS, 'Saved script'))),
        ...overrides,
    });
    const importScripts = (entries) => h.call('HACScriptLibrary.importScripts', entries);

    beforeAll(async () => {
        h = await loadInstrumentedApp();
        await h.ensureCompatibilityLoaded();
    });

    beforeEach(() => { globalThis.pinnedScripts.length = 0; });
    afterEach(() => h.resetBrowserState());

    test('a script exported by the app loads back with its tags and name', () => {
        const script = exported({ uniqueId: 'round-trip' });

        expect(importScripts([script])).toEqual({ added: 1, skipped: 0 });
        expect(globalThis.pinnedScripts[0].uniqueId).toBe('round-trip');
        expect(globalThis.pinnedScripts[0].name).toBe('Saved script');
        expect(globalThis.pinnedScripts[0].tags.map(t => t.id)).toEqual(SCRIPT_TAGS.map(t => t.id));
    });

    // Owner ruling 2026-09-29: a saved script keeps the genre shares the player set.
    test('a two-genre script loads back with its own shares, not an even split', () => {
        const tags = [
            { id: 'DRAMA', category: 'Genre', percent: 0.7 },
            { id: 'ROMANCE', category: 'Genre', percent: 0.3 },
            ...SCRIPT_TAGS.slice(1),
        ];

        expect(importScripts([exported({ uniqueId: 'two-genres', tags })])).toEqual({ added: 1, skipped: 0 });
        const shares = Object.fromEntries(globalThis.pinnedScripts[0].tags
            .filter(t => t.category === 'Genre').map(t => [t.id, t.percent]));
        expect(shares).toEqual({ DRAMA: 0.7, ROMANCE: 0.3 });
    });

    test('a name is kept as plain text, whatever it contains', () => {
        const name = '"><img id="injected" src=x onerror="alert(1)">';

        importScripts([exported({ uniqueId: 'hostile-name', name })]);

        expect(globalThis.pinnedScripts[0].name).toBe(name);
    });

    test('an entry with a tag the game does not have is skipped', () => {
        const tags = [...SCRIPT_TAGS, { id: '<script>alert(1)</script>', category: 'Theme & Event', percent: 1 }];

        expect(importScripts([exported({ uniqueId: 'fake-tag', tags })])).toEqual({ added: 0, skipped: 1 });
        expect(globalThis.pinnedScripts).toHaveLength(0);
    });

    test('a category claimed by the file is replaced by the game category', () => {
        const tags = SCRIPT_TAGS.map(t => (t.id === 'THEME_LOVE_TRIANGLE' ? { ...t, category: '<b>Finale</b>' } : t));

        importScripts([exported({ uniqueId: 'spoofed-category', tags })]);

        const theme = globalThis.pinnedScripts[0].tags.find(t => t.id === 'THEME_LOVE_TRIANGLE');
        expect(theme.category).toBe('Theme & Event');
    });

    test('an entry without stats is loaded with stats recomputed from its tags', () => {
        const { stats: _dropped, scores: _alsoDropped, ...bare } = exported({ uniqueId: 'no-stats' });

        expect(importScripts([bare])).toEqual({ added: 1, skipped: 0 });
        const loaded = globalThis.pinnedScripts[0];
        expect(Number.isFinite(loaded.stats.avgComp)).toBe(true);
        expect(loaded.stats).toEqual(exported().stats);
    });

    test('stats in the file are not trusted', () => {
        importScripts([exported({ uniqueId: 'inflated', stats: { avgComp: 5, synergySum: 99, maxScriptQuality: 99, movieScore: '<i>10</i>' } })]);

        expect(globalThis.pinnedScripts[0].stats).toEqual(exported().stats);
    });

    test('a numeric id is stored as a string and a repeated id is not loaded twice', () => {
        expect(importScripts([exported({ uniqueId: 12345 }), exported({ uniqueId: '12345' })])).toEqual({ added: 1, skipped: 0 });
        expect(globalThis.pinnedScripts[0].uniqueId).toBe('12345');
    });

    test('entries that are not scripts are skipped without throwing', () => {
        expect(importScripts([null, 5, 'script', {}, { tags: [] }, { tags: SCRIPT_TAGS }]))
            .toEqual({ added: 0, skipped: 6 });
    });
});
