import { describe, test, expect } from '@jest/globals';
import { loadLegacyScript } from './helpers/legacyHarness.js';

/**
 * The module split moved code out of script.js one slice at a time. When a
 * shared binding stayed behind while its users moved, nothing failed at load:
 * searchDebounceTimers only threw inside an input handler, so category search
 * silently stopped filtering and the app looked fine otherwise.
 *
 * These assert the shared state declared in src/app/state.js actually resolves
 * once the real files are evaluated in order.
 */
describe('shared classic-script state', () => {
    const SHARED_BINDINGS = [
        'MULTI_SELECT_CATEGORIES',
        'searchIndex',
        'searchDebounceTimers',
        'currentTab',
        'PRIMARY_TAB_BY_FEATURE',
        'generatedScriptsCache',
        'pinnedScripts',
        'localizationMap',
        'currentLanguage',
        'currentGenProfile',
        'startingProfileExcludedLoaded',
        'tagSelectRowCounter',
        'compatibilityLoaded',
        'genrePairsLoaded',
    ];

    test.each(SHARED_BINDINGS)('%s resolves after the bundle loads', async binding => {
        const app = await loadLegacyScript();
        expect(app.evaluate(`typeof ${binding}`)).not.toBe('undefined');
    });

    test('searchDebounceTimers is a Map, so the debounce path works', async () => {
        const app = await loadLegacyScript();
        expect(app.evaluate('searchDebounceTimers instanceof Map')).toBe(true);
    });
});
