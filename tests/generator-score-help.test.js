import { describe, test, expect, beforeAll, afterEach } from '@jest/globals';
import { loadInstrumentedApp } from './helpers/legacyHarness.js';

describe('Script Lab required-element help', () => {
    let h;

    beforeAll(async () => {
        h = await loadInstrumentedApp();
    });

    afterEach(() => h.resetBrowserState());

    test.each([
        [6, 6], [7, 7], [8, 8], [9, 9], [10, 10],
    ])('target %p displays its required minimum of %p story elements', (target, required) => {
        const display = { innerText: 'previous help' };
        const accessedIds = [];
        globalThis.document.getElementById = id => {
            accessedIds.push(id);
            if (id === 'genTagsRequiredDisplay') return display;
            throw new Error(`Help rendering must not touch control ${id}`);
        };

        h.call('HACScriptGenerator.updateRequiredElementDisplay', target);

        expect(display.innerText).toBe(
            `Requires ~${required} Story Elements (excluding Genre & Setting).`,
        );
        expect(accessedIds).toEqual(['genTagsRequiredDisplay']);
    });
});
