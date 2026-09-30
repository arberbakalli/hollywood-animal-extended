import { describe, test, expect, beforeAll, afterEach } from '@jest/globals';
import { loadInstrumentedApp } from './helpers/legacyHarness.js';

/**
 * Every generated script needs a Protagonist, an Antagonist and a Finale
 * (docs/GAME_RULES.md §1, "Category capacity"). They spend the story-element
 * budget like any other pick.
 *
 * The generator only added them while the count was below the target, so
 * locks could use up every slot first: 3 locked Supporting Characters at a
 * target of 5 produced scripts with no Finale, every time. Graves then rejects
 * a script missing its Protagonist.
 *
 * Owner ruling 2026-09-28: reserve their slots, and when the locks leave too
 * few, refuse with a message that says what is missing and how to make room.
 */
describe('generated scripts always carry Protagonist, Antagonist and Finale', () => {
    let h;
    let feedback;

    const MANDATORY = ['Protagonist', 'Antagonist', 'Finale'];
    const tagsOf = (category) => Object.values(h.GAME_DATA.tags)
        .filter(tag => tag.category === category)
        .map(tag => ({ id: tag.id, category, percent: 1.0 }));
    const categoriesIn = (script) => new Set(script.tags.map(t => t.category));

    beforeAll(async () => {
        h = await loadInstrumentedApp();
        await h.ensureCompatibilityLoaded();
    });

    afterEach(() => h.resetBrowserState());

    // Same document double as tests/best-score-scripts.test.js, with the locked
    // picks and the exclusions supplied by the test and the feedback captured.
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

    describe('the engine reserves the mandatory slots', () => {
        test('locks that fit exactly still leave room for all three, within the budget', () => {
            const locked = tagsOf('Supporting Character').slice(0, 2);

            for (let run = 0; run < 20; run++) {
                const script = h.call('HACScriptGenerator.runGenerationAlgorithm', 4, 5, locked, []);
                MANDATORY.forEach(category => expect(categoriesIn(script)).toContain(category));
                expect(h.call('HACGravesAnalysis.storyElementsOf', script.tags)).toHaveLength(5);
            }
        });

        test('locks never displace a mandatory category, even when called directly', () => {
            const locked = tagsOf('Supporting Character').slice(0, 3);

            for (let run = 0; run < 20; run++) {
                const script = h.call('HACScriptGenerator.runGenerationAlgorithm', 4, 5, locked, []);
                MANDATORY.forEach(category => expect(categoriesIn(script)).toContain(category));
            }
        });
    });

    describe('Generate refuses locks that leave no room for them', () => {
        test('3 locked Supporting Characters at a target of 5 are refused, naming the fix', async () => {
            installGeneratorDom({ locked: tagsOf('Supporting Character').slice(0, 3) });
            globalThis.generatedScriptsCache = 'untouched';

            await h.callAsync('HACScriptGenerator.generateScripts');

            expect(globalThis.generatedScriptsCache).toBe('untouched');
            expect(feedback.textContent).toContain('Every script needs a Protagonist, an Antagonist and a Finale');
            expect(feedback.textContent).toContain('Remove 1 locked element or raise the score target');
        });

        test('a locked Protagonist plus 4 fillers leaves no room for the other two', async () => {
            installGeneratorDom({
                locked: [...tagsOf('Protagonist').slice(0, 1), ...tagsOf('Supporting Character').slice(0, 4)],
            });
            globalThis.generatedScriptsCache = 'untouched';

            await h.callAsync('HACScriptGenerator.generateBestScoreScripts', 'artistic');

            expect(globalThis.generatedScriptsCache).toBe('untouched');
            expect(feedback.textContent).toContain('leaving no room for the Antagonist and Finale');
            expect(feedback.textContent).toContain('Remove 2 locked elements');
        });

        test('at the highest score target the message does not suggest raising it', async () => {
            // Target 10 needs all ten slots (GAME_RULES.md section 1), so ten locks fill them.
            installGeneratorDom({ locked: tagsOf('Supporting Character').slice(0, 10), score: '10' });

            await h.callAsync('HACScriptGenerator.generateScripts');

            expect(feedback.textContent).toContain('Remove 3 locked elements.');
            expect(feedback.textContent).not.toContain('raise the score target');
        });

        test('a Finale that every exclusion removes is refused before generating', async () => {
            installGeneratorDom({ excluded: tagsOf('Finale') });
            globalThis.generatedScriptsCache = 'untouched';

            await h.callAsync('HACScriptGenerator.generateScripts');

            expect(globalThis.generatedScriptsCache).toBe('untouched');
            expect(feedback.textContent).toContain('A script needs at least one available Finale');
        });

        test('locks that fit are not refused', async () => {
            installGeneratorDom({ locked: tagsOf('Supporting Character').slice(0, 2) });

            await h.callAsync('HACScriptGenerator.generateScripts');

            expect(feedback.textContent).toBe('');
            expect(Array.isArray(globalThis.generatedScriptsCache)).toBe(true);
            globalThis.generatedScriptsCache.forEach(script =>
                MANDATORY.forEach(category => expect(categoriesIn(script)).toContain(category)));
        }, 20000);
    });
});
