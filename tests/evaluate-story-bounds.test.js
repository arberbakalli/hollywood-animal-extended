import { describe, test, expect, beforeAll, afterEach } from '@jest/globals';
import { loadInstrumentedApp } from './helpers/legacyHarness.js';

/**
 * Evaluate Script accepts 5 to 10 story elements; Genre and Setting do not
 * count (docs/GAME_RULES.md section 1). Drives the real
 * evaluateColmanGravesScript at each edge: 4, 5, 10 and 11.
 */
describe('Evaluate Script story-element bounds', () => {
    let h;
    let script;

    beforeAll(async () => {
        h = await loadInstrumentedApp();
        await h.ensureCompatibilityLoaded();

        const ofCategory = (category) => Object.values(h.GAME_DATA.tags)
            .filter(tag => tag.category === category)
            .map(tag => ({ value: tag.id, dataset: { category } }));
        const [genre] = ofCategory('Genre');
        const [setting] = ofCategory('Setting');
        const [protagonist] = ofCategory('Protagonist');
        const [antagonist] = ofCategory('Antagonist');
        const [finale] = ofCategory('Finale');
        const supporting = ofCategory('Supporting Character');

        // Genre and Setting always ride along, so a count of N is N story elements.
        script = (storyCount) => [
            genre,
            setting,
            protagonist,
            antagonist,
            finale,
            ...supporting.slice(0, Math.max(0, storyCount - 3)),
        ].slice(0, storyCount + 2);
    });

    afterEach(() => {
        h.resetBrowserState();
    });

    async function evaluate(selectors, pool) {
        return h.evaluate(`(async () => {
            const selectors = ${JSON.stringify(selectors)};
            const pool = ${JSON.stringify(pool ?? null)};
            const feedback = { textContent: '', className: '', classList: { add() {}, remove() {} } };
            const generic = { classList: { add() {}, remove() {} }, scrollIntoView() {} };
            const container = { querySelectorAll: (s) => (s === '.tag-selector' ? selectors : []) };
            const genreRows = {
                querySelectorAll: (s) => s !== '.genre-row' ? [] : selectors
                    .filter(select => select.dataset.category === 'Genre')
                    .map(select => ({ querySelector: (r) => r === 'select' ? select : (r === '.percent-input' ? { value: '100' } : null) }))
            };
            document = {
                getElementById(id) {
                    if (id === 'gravesFeedbackMessage') return feedback;
                    if (pool && (id === 'globalElementPoolInput' || id === 'globalElementPoolSlider')) return { value: String(pool) };
                    if (id === 'selectors-container-graves') return container;
                    if (id === 'selectors-container-excluded') return { querySelectorAll: () => [] };
                    if (id === 'inputs-genre-graves') return genreRows;
                    if (id.startsWith('inputs-')) return null;
                    return generic;
                },
                querySelector: () => null,
                querySelectorAll: () => [],
            };

            // Stop at the hand-off to scoring: reaching it is what "accepted" means.
            const realEvaluation = calculateScriptEvaluation;
            let scored = null;
            calculateScriptEvaluation = (tags) => { scored = tags; throw new Error('reached scoring'); };
            try {
                await evaluateColmanGravesScript();
            } catch (error) {
                if (error.message !== 'reached scoring') throw error;
            } finally {
                calculateScriptEvaluation = realEvaluation;
            }
            return { feedback: feedback.textContent, scoredTags: scored ? scored.length : null };
        })()`);
    }

    test.each([
        [4, 'Colman needs at least 5 story elements for a real script evaluation. You selected 4.'],
        [11, 'Colman evaluates up to 10 story elements at once. You selected 11.'],
    ])('%i story elements are refused with that exact count', async (count, message) => {
        const result = await evaluate(script(count));

        expect(result.feedback).toBe(message);
        expect(result.scoredTags).toBeNull();
    });

    // Evaluate follows the Max Element Pool (owner ruling 2026-10-09); at pool 10
    // both bounds are reachable.
    test.each([5, 10])('%i story elements reach scoring, with Genre and Setting alongside', async (count) => {
        const result = await evaluate(script(count), 10);

        expect(result.feedback).toBe('');
        expect(result.scoredTags).toBe(count + 2);
    });

    // Genre is uncapped but mandatory: at least one (GAME_RULES.md section 1).
    test('a script with no Genre is refused before counting', async () => {
        const noGenre = script(5).filter(select => select.dataset.category !== 'Genre');
        const result = await evaluate(noGenre);

        expect(result.feedback).toBe('A script needs at least one Genre.');
        expect(result.scoredTags).toBeNull();
    });
});
