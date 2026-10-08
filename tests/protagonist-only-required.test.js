import { describe, test, expect, beforeAll, afterEach } from '@jest/globals';
import { loadInstrumentedApp } from './helpers/legacyHarness.js';

/**
 * A script needs at least one Genre, one Setting and a Protagonist; Antagonist
 * and Finale are optional (GAME_RULES.md section 1, owner ruling 2026-10-08;
 * the game's TUTORIAL_NEED_FOR_ANTAGONIST: "not every film needs an antagonist").
 *
 * Reported 2026-10-08: pool 6 with five locked Theme & Event elements was
 * refused with "Every script needs a Protagonist, an Antagonist and a Finale".
 * The player wanted to see which Protagonist fits those themes.
 */
describe('only the Protagonist is a required story element', () => {
    let h;
    let feedback;

    const tagsOf = (category) => Object.values(h.GAME_DATA.tags)
        .filter(tag => tag.category === category)
        .map(tag => ({ id: tag.id, category, percent: 1.0 }));
    const categoriesIn = (script) => new Set(script.tags.map(t => t.category));
    const storyCount = (script) => h.call('HACGravesAnalysis.storyElementsOf', script.tags).length;

    beforeAll(async () => {
        h = await loadInstrumentedApp();
        await h.ensureCompatibilityLoaded();
    });

    afterEach(() => h.resetBrowserState());

    function installGeneratorDom({ locked = [], excluded = [], score = '5' } = {}) {
        feedback = { textContent: '', className: '', classList: { add() {}, remove() {}, contains: () => false } };
        const asSelects = (tags) => tags.map(tag => ({ value: tag.id, dataset: { category: tag.category } }));
        const container = (tags) => {
            const selects = asSelects(tags);
            return { querySelectorAll: (selector) => (selector === '.tag-selector' ? selects : []) };
        };
        const noopElement = () => ({
            dataset: {},
            style: { setProperty() {}, removeProperty() {} },
            classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
            setAttribute() {}, removeAttribute() {}, getAttribute: () => null,
            appendChild() {}, removeChild() {}, remove() {},
            querySelector: () => null, querySelectorAll: () => [],
            addEventListener() {},
        });
        const generic = { classList: { add() {}, remove() {}, contains: () => false }, scrollIntoView() {} };
        const elements = {
            genCompInput: { value: '4' },
            genScoreInput: { value: score },
            'selectors-container-generator': container(locked),
            'selectors-container-excluded': container(excluded),
            generatorResultsList: noopElement(),
            'results-generator': generic,
            generatorFeedbackMessage: feedback,
        };
        globalThis.document = {
            getElementById: (id) => (id in elements ? elements[id] : (id.startsWith('inputs-') ? null : generic)),
            createElement: noopElement,
            querySelector: () => null,
            querySelectorAll: () => [],
        };
    }

    test('the reported case: pool 6 with five locked Theme & Event elements generates, each with a Protagonist', async () => {
        const themes = tagsOf('Theme & Event').slice(0, 5);
        installGeneratorDom({ locked: themes, score: '6' });

        await h.callAsync('HACScriptGenerator.generateScripts');

        expect(feedback.textContent).toBe('');
        expect(Array.isArray(globalThis.generatedScriptsCache)).toBe(true);
        expect(globalThis.generatedScriptsCache.length).toBeGreaterThan(0);
        globalThis.generatedScriptsCache.forEach(script => {
            ['Genre', 'Setting', 'Protagonist'].forEach(category => expect(categoriesIn(script)).toContain(category));
            expect(script.tags.map(t => t.id)).toEqual(expect.arrayContaining(themes.map(t => t.id)));
            expect(storyCount(script)).toBe(6);
        });
    }, 20000);

    test('pool 5 with four locked Theme & Event elements generates a Protagonist for them', async () => {
        const themes = tagsOf('Theme & Event').slice(0, 4);
        installGeneratorDom({ locked: themes, score: '5' });

        await h.callAsync('HACScriptGenerator.generateScripts');

        expect(feedback.textContent).toBe('');
        globalThis.generatedScriptsCache.forEach(script => {
            expect(categoriesIn(script)).toContain('Protagonist');
            expect(storyCount(script)).toBe(5);
        });
    }, 20000);

    test('locks that fill every slot are refused for the Protagonist alone', async () => {
        installGeneratorDom({ locked: tagsOf('Theme & Event').slice(0, 5), score: '5' });
        globalThis.generatedScriptsCache = 'untouched';

        await h.callAsync('HACScriptGenerator.generateScripts');

        expect(globalThis.generatedScriptsCache).toBe('untouched');
        expect(feedback.textContent).toContain('Every script needs a Protagonist.');
        expect(feedback.textContent).toContain('Remove 1 locked element');
        expect(feedback.textContent).not.toMatch(/Antagonist|Finale/);
    });

    test.each(['Antagonist', 'Finale'])('excluding every %s does not refuse generation', async (category) => {
        installGeneratorDom({ excluded: tagsOf(category) });

        await h.callAsync('HACScriptGenerator.generateScripts');

        expect(feedback.textContent).toBe('');
        expect(globalThis.generatedScriptsCache.length).toBeGreaterThan(0);
        globalThis.generatedScriptsCache.forEach(script => {
            expect(categoriesIn(script)).not.toContain(category);
            expect(categoriesIn(script)).toContain('Protagonist');
        });
    }, 20000);

    test('excluding every Protagonist still refuses, because the Protagonist is required', async () => {
        installGeneratorDom({ excluded: tagsOf('Protagonist') });
        globalThis.generatedScriptsCache = 'untouched';

        await h.callAsync('HACScriptGenerator.generateScripts');

        expect(globalThis.generatedScriptsCache).toBe('untouched');
        expect(feedback.textContent).toContain('A script needs at least one available Protagonist');
    });

    // Owner, 2026-10-08: Antagonist and Finale are normal picks, not reserved.
    test('Antagonist and Finale are normal picks: not forced into every script, never two of one', () => {
        const scripts = Array.from({ length: 40 }, () => h.call('HACScriptGenerator.runGenerationAlgorithm', 4, 5, [], []));
        const count = (script, category) => script.tags.filter(t => t.category === category).length;
        scripts.forEach(script => {
            expect(count(script, 'Protagonist')).toBe(1);
            expect(count(script, 'Antagonist')).toBeLessThanOrEqual(1);
            expect(count(script, 'Finale')).toBeLessThanOrEqual(1);
            expect(storyCount(script)).toBe(5);
        });
        expect(scripts.some(script => count(script, 'Antagonist') === 0 || count(script, 'Finale') === 0)).toBe(true);
    });

    test('the engine never pushes past the target for an optional Antagonist or Finale', () => {
        const themes = tagsOf('Theme & Event').slice(0, 4);
        for (let run = 0; run < 20; run++) {
            const script = h.call('HACScriptGenerator.runGenerationAlgorithm', 4, 5, themes, []);
            expect(categoriesIn(script)).toContain('Protagonist');
            expect(storyCount(script)).toBe(5);
        }
    });
});
