import { loadInstrumentedApp } from './helpers/legacyHarness.js';

describe('Script Lab generation result uniqueness', () => {
    let h;
    let originalRunGenerationAlgorithm;

    beforeAll(async () => {
        h = await loadInstrumentedApp();
        await h.ensureCompatibilityLoaded();
    });

    beforeEach(() => {
        originalRunGenerationAlgorithm = HACScriptGenerationEngine.runGenerationAlgorithm;
        installGeneratorDom();
    });

    afterEach(() => {
        HACScriptGenerationEngine.runGenerationAlgorithm = originalRunGenerationAlgorithm;
        h.resetBrowserState();
    });

    function installGeneratorDom() {
        const noopElement = () => ({
            dataset: {},
            style: { setProperty() {}, removeProperty() {} },
            classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
            setAttribute() {},
            removeAttribute() {},
            appendChild() {},
            querySelector: () => null,
            querySelectorAll: () => [],
            addEventListener() {}
        });
        const generic = {
            classList: { add() {}, remove() {}, contains: () => false },
            scrollIntoView() {}
        };
        const emptyContainer = { querySelectorAll() { return []; } };

        globalThis.document = {
            getElementById(id) {
                if (id === 'genCompInput') return { value: '4' };
                if (id === 'genScoreInput') return { value: '5' };
                if (id === 'globalElementPoolInput') return { value: '5' };
                if (id === 'globalElementPoolSlider') return { value: '5' };
                if (id === 'selectors-container-generator') return emptyContainer;
                if (id === 'selectors-container-excluded') return emptyContainer;
                if (id === 'generatorResultsList') return noopElement();
                if (id === 'results-generator') return generic;
                if (id.startsWith('inputs-')) return null;
                return generic;
            },
            createElement: noopElement,
            querySelector() { return null; },
            querySelectorAll() { return []; }
        };
    }

    function firstTag(category, offset = 0) {
        return Object.values(GAME_DATA.tags).filter(tag => tag.category === category)[offset].id;
    }

    function tag(id) {
        const source = GAME_DATA.tags[id];
        return {
            id,
            category: source.category,
            percent: source.category === 'Genre' ? 1 : undefined
        };
    }

    function scriptSignature(script) {
        return script.tags
            .map(entry => `${entry.id}:${Number(entry.percent ?? 1).toFixed(4)}`)
            .sort()
            .join('|');
    }

    function makeScript(index, shuffled = false) {
        const themeIds = Object.values(GAME_DATA.tags)
            .filter(entry => entry.category === 'Theme & Event')
            .map(entry => entry.id);
        const tags = [
            tag(firstTag('Genre')),
            tag(firstTag('Setting')),
            tag(firstTag('Protagonist')),
            tag(firstTag('Antagonist')),
            tag(firstTag('Finale')),
            tag(firstTag('Supporting Character')),
            tag(themeIds[index % themeIds.length])
        ];
        return {
            tags: shuffled ? [...tags].reverse() : tags,
            stats: {
                avgComp: 4 + (index / 100),
                synergySum: 0,
                maxScriptQuality: 5,
                movieScore: '6.0'
            },
            scores: { commercial: 6, artistic: 6 },
            uniqueId: `unique-${index}-${shuffled ? 'shuffled' : 'plain'}`
        };
    }

    function installScriptQueue(count) {
        const uniqueScripts = Array.from({ length: count }, (_, index) => makeScript(index));
        const queue = [
            makeScript(0),
            makeScript(0, true),
            ...uniqueScripts,
            ...uniqueScripts.map((script, index) => makeScript(index, true))
        ];
        let cursor = 0;
        HACScriptGenerationEngine.runGenerationAlgorithm = () => {
            const next = queue[Math.min(cursor, queue.length - 1)];
            cursor += 1;
            return next;
        };
    }

    test('Generate Scripts keeps one card per unique tag set', async () => {
        installScriptQueue(15);

        await HACScriptGenerator.generateScripts();

        const signatures = generatedScriptsCache.map(scriptSignature);
        expect(generatedScriptsCache).toHaveLength(15);
        expect(new Set(signatures).size).toBe(signatures.length);
    });

    test.each(['artistic', 'commercial'])('Highest %s Appeal keeps one card per unique tag set', async (mode) => {
        installScriptQueue(12);

        await HACScriptGenerator.generateBestScoreScripts(mode);

        const signatures = generatedScriptsCache.map(scriptSignature);
        expect(generatedScriptsCache).toHaveLength(12);
        expect(new Set(signatures).size).toBe(signatures.length);
    });
});
