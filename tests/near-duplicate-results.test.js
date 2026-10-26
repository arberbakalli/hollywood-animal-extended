import { loadInstrumentedApp } from './helpers/legacyHarness.js';

/**
 * Owner ruling 2026-10-06 (docs/GAME_RULES.md, "One result per element set"):
 * two results with the same element ids are the same result, whatever their
 * genre percentages. Any other difference, even one story element, keeps both.
 *
 * The generator is stubbed to offer the same two scripts over and over, so the
 * test sees exactly what the de-duplication keeps.
 */
describe('generated results: one result per element set', () => {
    let h;
    let original;

    const STORY = [
        ['WILD_WEST', 'Setting'],
        ['PROTAGONIST_COWBOY', 'Protagonist'],
        ['ANTAGONIST_MURDERER', 'Antagonist'],
        ['SUPPORTINGCHARACTER_SIDEKICK', 'SupportingCharacter'],
        ['THEME_TREASURE_HUNT', 'Theme'],
        ['FINALE_ANTAGONIST_GETS_PUNISHED', 'Finale'],
    ];
    const script = (dramaShare, extra = []) => HACScriptGenerationEngine.buildScriptFromTags([
        { id: 'DRAMA', category: 'Genre', percent: dramaShare },
        { id: 'COMEDY', category: 'Genre', percent: Number((1 - dramaShare).toFixed(2)) },
        ...[...STORY, ...extra].map(([id, category]) => ({ id, category, percent: 1 })),
    ], 'stub');

    beforeAll(async () => {
        h = await loadInstrumentedApp();
        await h.ensureCompatibilityLoaded();
        original = HACScriptGenerationEngine.runGenerationAlgorithm;
    });

    afterEach(() => {
        HACScriptGenerationEngine.runGenerationAlgorithm = original;
        h.resetBrowserState();
    });

    function offerInTurn(builders) {
        let call = 0;
        HACScriptGenerationEngine.runGenerationAlgorithm = () => builders[call++ % builders.length]();
    }

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
            const generic = { classList: { add() {}, remove() {}, contains: () => false }, scrollIntoView() {} };
            const emptyContainer = { querySelectorAll() { return []; } };
            const genCompInput = { value: '4' };
            const genScoreInput = { value: '6' };
            const generatorResultsList = noopElement();
            const resultsGenerator = { classList: { add() {}, remove() {}, contains: () => false } };
            document = {
                getElementById(id) {
                    if (id === 'genCompInput') return genCompInput;
                    if (id === 'genScoreInput') return genScoreInput;
                    if (id === 'selectors-container-generator') return emptyContainer;
                    if (id === 'selectors-container-excluded') return emptyContainer;
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

    const ids = result => result.tags.map(tag => tag.id).sort().join('|');

    test('the shared key ignores order and genre percentages', () => {
        const a = script(0.6);
        const b = script(0.5);
        expect(HACScriptGenerationEngine.scriptSignature(a.tags))
            .toBe(HACScriptGenerationEngine.scriptSignature([...b.tags].reverse()));
        expect(HACScriptGenerationEngine.scriptSignature(script(0.6, [['THEME_LOVE_TRIANGLE', 'Theme']]).tags))
            .not.toBe(HACScriptGenerationEngine.scriptSignature(a.tags));
    });

    test('Generate keeps one result when only the genre percentages differ', async () => {
        installGeneratorDom();
        offerInTurn([() => script(0.6), () => script(0.5)]);
        await HACScriptGenerator.generateScripts();
        expect(generatedScriptsCache.map(ids)).toEqual([ids(script(0.6))]);
    });

    test.each(['artistic', 'commercial'])('Highest %s keeps one result when only the genre percentages differ', async kind => {
        installGeneratorDom();
        offerInTurn([() => script(0.6), () => script(0.5)]);
        await HACScriptGenerator.generateBestScoreScripts(kind);
        expect(generatedScriptsCache.map(ids)).toEqual([ids(script(0.6))]);
    });

    test('a result one story element apart is still a different result', async () => {
        installGeneratorDom();
        offerInTurn([() => script(0.6), () => script(0.6, [['THEME_LOVE_TRIANGLE', 'Theme']])]);
        await HACScriptGenerator.generateScripts();
        expect(generatedScriptsCache).toHaveLength(2);
    });
});
