import { describe, it, expect, beforeAll, afterEach } from '@jest/globals';
import { loadInstrumentedApp, readInputDefault } from './helpers/legacyHarness.js';

/**
 * Max Element Pool is 5-10 (docs/GAME_RULES.md §2). getMaxElementPoolSize is
 * the one reader every feature uses (Script Lab, Graves Best Matches, Build
 * for Target, Marketing), and it returned parseInt(input.value) unchecked:
 * typing 12 gave a budget of 12, and an empty box gave NaN, which switched the
 * budget off and made Build for Target return nothing.
 */
describe('Max Element Pool is clamped to 5-10', () => {
    let h;
    let poolInput;
    let poolSlider;

    beforeAll(async () => {
        h = await loadInstrumentedApp();
    });

    afterEach(() => h.resetBrowserState());

    const withPoolControls = (inputValue, sliderValue) => {
        poolInput = { value: inputValue };
        poolSlider = sliderValue === undefined ? null : { value: sliderValue };
        globalThis.document.getElementById = (id) => {
            if (id === 'globalElementPoolInput') return poolInput;
            if (id === 'globalElementPoolSlider') return poolSlider;
            return null;
        };
    };

    const poolSize = () => h.call('HACScriptGenerator.getMaxElementPoolSize');

    it.each([
        ['5', 5],
        ['7', 7],
        ['10', 10],
    ])('an in-range value %p is used as typed', (typed, expected) => {
        withPoolControls(typed, '5');
        expect(poolSize()).toBe(expected);
    });

    it.each([
        ['12', 10],
        ['11', 10],
        ['4', 5],
        ['0', 5],
        ['-3', 5],
    ])('an out-of-range value %p is clamped to %p', (typed, expected) => {
        withPoolControls(typed, '5');
        expect(poolSize()).toBe(expected);
    });

    it('an emptied box keeps the last valid size the slider holds', () => {
        withPoolControls('', '8');
        expect(poolSize()).toBe(8);
    });

    it('an unreadable box with no slider falls back to the shipped default', async () => {
        withPoolControls('abc', undefined);
        expect(poolSize()).toBe(await readInputDefault('globalElementPoolInput'));
    });

    it('the result is always a number, never NaN', () => {
        for (const typed of ['', ' ', 'abc', '1e9', '-']) {
            withPoolControls(typed, 'x');
            const size = poolSize();
            expect(Number.isInteger(size)).toBe(true);
            expect(size).toBeGreaterThanOrEqual(5);
            expect(size).toBeLessThanOrEqual(10);
        }
    });
});
