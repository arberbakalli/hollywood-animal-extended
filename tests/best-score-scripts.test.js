import { loadInstrumentedApp } from './helpers/legacyHarness.js';
import { isStoryElement } from './helpers/gameTestBuilders.js';

/**
 * Highest Artistic and Highest Commercial Appeal, driven end to end through the
 * real HACScriptGenerator.generateBestScoreScripts with a hand-built `document`
 * double (jest.config.js runs testEnvironment: 'node', so there is no jsdom).
 */
describe('generateBestScoreScripts — real production call (guards the vacuous-coverage gap)', () => {
    let h;

    // Real tag ids (present in data/TagData.json), chosen from categories
    // outside REQUIRED_SCRIPT_CATEGORIES (Genre/Setting/Protagonist) so
    // excluding them can never trip prepareGenerationInputs's "a script needs
    // at least one available ..." refusal.
    const EXCLUDED = [
        { id: 'ANTAGONIST_CRIMINAL_MASTERMIND', category: 'Antagonist' },
        { id: 'SUPPORTINGCHARACTER_ANGRY_BOSS', category: 'Supporting Character' },
        { id: 'FINALE_PROTAGONIST_FINDS_TREASURE', category: 'Finale' }
    ];

    beforeAll(async () => {
        h = await loadInstrumentedApp();
        // Matches what prepareGenerationInputs() itself awaits before reading
        // any input; appShell.js's button binding loads nothing else first.
        await h.ensureCompatibilityLoaded();
    });

    afterEach(() => {
        h.resetBrowserState();
    });

    /**
     * Installs a fake `document` covering exactly the ids
     * prepareGenerationInputs() and renderGeneratedScripts() touch:
     *   - genCompInput / genScoreInput: the real index.html defaults (4, 6)
     *   - selectors-container-generator: empty, so nothing is locked and the
     *     generator is free to pick everything itself
     *   - selectors-container-excluded: three real, populated-category tag
     *     ids, so getGeneratorExcludedTags() returns a real, non-empty
     *     exclusion list instead of a vacuous empty one
     *   - generatorResultsList / results-generator: no-op render targets
     * Anything else (feedback messages, every `inputs-*` sub-container)
     * safely returns null or a generic no-op, exactly as
     * tests/graves.test.js's buildGravesBestMatchesDom does.
     */
    function installGeneratorDom() {
        h.evaluate(`(() => {
            const noopElement = () => ({
                dataset: {},
                style: { setProperty() {}, removeProperty() {} },
                classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
                setAttribute() {}, removeAttribute() {}, getAttribute: () => null,
                appendChild() {}, removeChild() {}, remove() {},
                querySelector: () => null, querySelectorAll: () => [],
                addEventListener() {}
            });
            const generic = {
                classList: { add() {}, remove() {}, contains: () => false },
                scrollIntoView() {}
            };
            const emptyContainer = { querySelectorAll() { return []; } };
            const excludedSelects = ${JSON.stringify(EXCLUDED)}.map(tag => ({
                value: tag.id,
                dataset: { category: tag.category }
            }));
            const excludedContainer = {
                querySelectorAll(selector) {
                    return selector === '.tag-selector' ? excludedSelects : [];
                }
            };
            const genCompInput = { value: '4' };
            const genScoreInput = { value: '6' };
            const generatorResultsList = noopElement();
            const resultsGenerator = { classList: { add() {}, remove() {}, contains: () => false } };

            document = {
                getElementById(id) {
                    if (id === 'genCompInput') return genCompInput;
                    if (id === 'genScoreInput') return genScoreInput;
                    if (id === 'selectors-container-generator') return emptyContainer;
                    if (id === 'selectors-container-excluded') return excludedContainer;
                    if (id === 'generatorResultsList') return generatorResultsList;
                    if (id === 'results-generator') return resultsGenerator;
                    if (id.startsWith('inputs-')) return null;
                    return generic;
                },
                createElement: noopElement,
                querySelector() { return null; },
                querySelectorAll() { return []; }
            };
        })()`);
    }

    test('generateBestScoreScripts("artistic") drives the real engine and sorts descending by real evaluation.bonuses.art', async () => {
        installGeneratorDom();

        await HACScriptGenerator.generateBestScoreScripts('artistic');
        const batch = generatedScriptsCache;

        expect(Array.isArray(batch)).toBe(true);
        expect(batch.length).toBeGreaterThan(0);

        // Recomputed fresh from each script's real tags, independent of the
        // _bonus value the function itself cached, so a wrong cache value
        // can't rubber-stamp its own order.
        const realArtBonuses = batch.map(script =>
            HACScriptEvaluation.calculateScriptEvaluation(script.tags).bonuses.art
        );
        for (let i = 1; i < realArtBonuses.length; i++) {
            expect(realArtBonuses[i]).toBeLessThanOrEqual(realArtBonuses[i - 1]);
        }

        batch.forEach(script => expect(script.optimizedFor).toBe('artistic'));
    }, 20000);

    test('generateBestScoreScripts("commercial") drives the real engine and sorts descending by real evaluation.bonuses.com', async () => {
        installGeneratorDom();

        await HACScriptGenerator.generateBestScoreScripts('commercial');
        const batch = generatedScriptsCache;

        expect(Array.isArray(batch)).toBe(true);
        expect(batch.length).toBeGreaterThan(0);

        const realComBonuses = batch.map(script =>
            HACScriptEvaluation.calculateScriptEvaluation(script.tags).bonuses.com
        );
        for (let i = 1; i < realComBonuses.length; i++) {
            expect(realComBonuses[i]).toBeLessThanOrEqual(realComBonuses[i - 1]);
        }

        batch.forEach(script => expect(script.optimizedFor).toBe('commercial'));
    }, 20000);

    test('artistic and commercial modes share the same exclusion filtering and story-element budget', async () => {
        installGeneratorDom();
        await HACScriptGenerator.generateBestScoreScripts('artistic');
        const artisticBatch = [...generatedScriptsCache];

        installGeneratorDom();
        await HACScriptGenerator.generateBestScoreScripts('commercial');
        const commercialBatch = [...generatedScriptsCache];

        expect(artisticBatch.length).toBeGreaterThan(0);
        expect(commercialBatch.length).toBeGreaterThan(0);

        // genScoreInput is fixed at '6' by installGeneratorDom() above; call
        // the real formula rather than re-deriving the number by hand.
        const targetCount = HACScriptGenerator.getRequiredElementCount(6);
        const excludedIds = new Set(EXCLUDED.map(tag => tag.id));

        [...artisticBatch, ...commercialBatch].forEach(script => {
            const ids = script.tags.map(t => t.id);
            excludedIds.forEach(bannedId => expect(ids).not.toContain(bannedId));
            expect(script.tags.filter(isStoryElement).length).toBeLessThanOrEqual(targetCount);
        });
    }, 30000);
});
