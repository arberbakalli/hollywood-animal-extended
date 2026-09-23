import { describe, test, expect, beforeAll, afterEach } from '@jest/globals';
import { loadInstrumentedApp } from './helpers/legacyHarness.js';
import { scriptByNames, tagByName } from './helpers/gameTestBuilders.js';

/**
 * Graves Evaluation feature tests.
 * Validates generateBestMatches and combination logic.
 */

let h;

beforeAll(async () => {
    h = await loadInstrumentedApp();
    // Load deferred data for tests
    await h.ensureCompatibilityLoaded();
});

afterEach(() => {
    h.resetBrowserState();
});

function buildGravesBestMatchesDom(selectorsExpression) {
    return `(() => {
        const selectors = ${selectorsExpression};
        const feedback = {
            textContent: '',
            className: '',
            classList: { add() {}, remove() {} }
        };
        const hiddenState = new Set(['hidden']);
        const panelClassList = {
            add(name) { hiddenState.add(name); },
            remove(name) { hiddenState.delete(name); },
            contains(name) { return hiddenState.has(name); }
        };
        const generic = {
            classList: { add() {}, remove() {} },
            scrollIntoView() {}
        };
        const bestMatchesPanel = {
            classList: panelClassList,
            scrollIntoView() {}
        };
        const bestMatchesList = {
            innerHTML: '',
            querySelectorAll(selector) {
                if (selector !== '[data-action="add-graves-best-match"]') return [];
                const matches = [...this.innerHTML.matchAll(/data-action="add-graves-best-match"/g)];
                return matches.map(() => ({ addEventListener() {} }));
            }
        };
        const scoreFilter = { value: '4.0' };
        const categoryFilter = { value: '' };
        const emptyContainer = { querySelectorAll() { return []; } };
        const gravesContainer = {
            querySelectorAll(selector) {
                if (selector === '.tag-selector') return selectors;
                return [];
            }
        };
        const genreContainer = {
            querySelectorAll(selector) {
                if (selector !== '.genre-row') return [];
                return selectors
                    .filter(select => select.dataset.category === 'Genre')
                    .map(select => ({
                        querySelector(rowSelector) {
                            if (rowSelector === 'select') return select;
                            if (rowSelector === '.percent-input') return { value: '100' };
                            return null;
                        }
                    }));
            }
        };

        document = {
            getElementById(id) {
                if (id === 'gravesFeedbackMessage') return feedback;
                if (id === 'selectors-container-graves') return gravesContainer;
                if (id === 'selectors-container-excluded') return emptyContainer;
                if (id === 'inputs-genre-graves') return genreContainer;
                if (id === 'graves-best-matches-panel') return bestMatchesPanel;
                if (id === 'gravesBestMatchesList') return bestMatchesList;
                if (id === 'gravesBestScoreFilter') return scoreFilter;
                if (id === 'gravesBestCategoryFilter') return categoryFilter;
                if (id.startsWith('inputs-')) return null;
                return generic;
            },
            querySelector() { return null; },
            querySelectorAll(selector) {
                if (selector === '#gravesBestMatchesList [data-role="graves-best-match"]') {
                    const matches = [...bestMatchesList.innerHTML.matchAll(/data-role="graves-best-match"/g)];
                    return matches.map(() => ({}));
                }
                return [];
            }
        };

        return feedback;
    })()`;
}

describe('Graves Evaluation', () => {
    test('Evaluate Script rejects missing required script categories', async () => {
        const result = await h.evaluate(`(async () => {
            const feedback = ${buildGravesBestMatchesDom(`[
                { value: 'ACTION', dataset: { category: 'Genre' } }
            ]`)};

            await evaluateColmanGravesScript();
            return feedback.textContent;
        })()`);

        expect(result).toContain('A script needs at least one Setting, Protagonist.');
    });

    test('Evaluate Script rejects fewer than 5 selected tags after required categories are present', async () => {
        const result = await h.evaluate(`(async () => {
            const feedback = ${buildGravesBestMatchesDom(`[
                { value: 'ACTION', dataset: { category: 'Genre' } },
                { value: 'MODERN_AMERICAN_CITY', dataset: { category: 'Setting' } },
                { value: 'PROTAGONIST_COP', dataset: { category: 'Protagonist' } }
            ]`)};

            await evaluateColmanGravesScript();
            return feedback.textContent;
        })()`);

        expect(result).toContain('at least 5 story elements');
        expect(result).toContain('You selected 3');
    });

    test('Graves pair bands classify real compatibility pairs by production thresholds', () => {
        const tags = [
            tagByName(h.GAME_DATA, 'Action'),
            tagByName(h.GAME_DATA, 'Modern American City'),
            tagByName(h.GAME_DATA, 'Cop'),
            tagByName(h.GAME_DATA, 'Bandit')
        ];

        const pairsByBand = h.call('HACGravesAnalysis.findGravesPairsByBand', tags);
        const allPairs = [
            ...pairsByBand.successful,
            ...pairsByBand.common,
            ...pairsByBand.unsuccessful
        ];

        expect(allPairs).toHaveLength(6);
        pairsByBand.successful.forEach(pair => expect(pair.rawScore).toBeGreaterThanOrEqual(4));
        pairsByBand.common.forEach(pair => {
            expect(pair.rawScore).toBeGreaterThanOrEqual(2);
            expect(pair.rawScore).toBeLessThan(4);
        });
        pairsByBand.unsuccessful.forEach(pair => expect(pair.rawScore).toBeLessThan(2));
    });

    test('loads real game data for compatibility lookup', () => {
        const gd = h.GAME_DATA;
        expect(gd.tags).toBeDefined();
        expect(gd.compatibility).toBeDefined();
        expect(Object.keys(gd.tags).length).toBeGreaterThan(0);
        expect(Object.keys(gd.compatibility).length).toBeGreaterThan(0);
    });

    test('finds real compatibility scores between tags', () => {
        const gd = h.GAME_DATA;
        const actionId = Object.keys(gd.tags).find(id =>
            gd.tags[id].name === 'Action'
        );

        if (!actionId) return; // Skip if Action not found

        const scores = gd.compatibility[actionId];
        expect(scores).toBeDefined();
        expect(typeof scores).toBe('object');
    });

    test('missing compatibility scores default through the production lookup', () => {
        const score = h.call(
            'HACCompatibilityEngine.getRawCompatibilityScore',
            { id: 'FAKE_TAG_1' },
            { id: 'FAKE_TAG_2' },
            h.GAME_DATA
        );

        expect(score).toBe(3.0);
    });

    test('real Graves script evaluation produces non-zero movie score breakdown', () => {
        const tags = scriptByNames(h.GAME_DATA, [
            'Action',
            'Modern American City',
            'Cop',
            'Bandit',
            'Shootout',
            'Antagonist Gets Killed'
        ]);

        const evaluation = h.call('calculateScriptEvaluation', tags);

        expect(evaluation.matrix.rawAverage).toBeCloseTo(4.2);
        expect(evaluation.matrix.totalScore).toBeGreaterThan(0);
        expect(evaluation.bonuses.com).toBeGreaterThan(0);
        expect(evaluation.movieScores.scoringCount).toBe(4);
        expect(evaluation.movieScores.tagCap).toBe(6);
        expect(evaluation.movieScores.commercial).toBeGreaterThan(0);
        expect(evaluation.movieScores.artistic).toBeGreaterThan(0);
    });

    test.each([
        [4.0, 'Success', 'success'],
        [3.5, 'Common', 'accent'],
        [3.0, 'Risky', 'danger'],
        [2.99, 'Failed', 'danger'],
    ])('Graves verdict for an average fit of %s is %s', (rawAverage, label, tone) => {
        const verdict = h.call('HACGravesAnalysis.getGravesVerdict', rawAverage);

        expect(verdict).toMatchObject({ label, tone });
    });

    test('Generate Best Matches works from one seed element', async () => {
        const result = await h.evaluate(`(async () => {
            const feedback = ${buildGravesBestMatchesDom(`[
                { value: 'ACTION', dataset: { category: 'Genre' } }
            ]`)};
            document.getElementById('gravesBestScoreFilter').value = '0';

            await generateBestMatches();
            return {
                feedback: feedback.textContent,
                panelHidden: document.getElementById('graves-best-matches-panel').classList.contains('hidden'),
                rows: document.querySelectorAll('#gravesBestMatchesList [data-role="graves-best-match"]').length
            };
        })()`);

        expect(result.feedback).toBe('');
        expect(result.panelHidden).toBe(false);
        expect(result.rows).toBeGreaterThan(0);
    });

    test('Generate Best Matches does not require Genre, Setting, and Protagonist', async () => {
        const result = await h.evaluate(`(async () => {
            const feedback = ${buildGravesBestMatchesDom(`[
                { value: 'ANTAGONIST_BANDIT', dataset: { category: 'Antagonist' } },
                { value: 'SUPPORTINGCHARACTER_MENTOR', dataset: { category: 'Supporting Character' } },
                { value: 'FINALE_ANTAGONIST_GETS_KILLED', dataset: { category: 'Finale' } }
            ]`)};
            document.getElementById('gravesBestScoreFilter').value = '0';

            await generateBestMatches();
            return {
                feedback: feedback.textContent,
                panelHidden: document.getElementById('graves-best-matches-panel').classList.contains('hidden'),
                rows: document.querySelectorAll('#gravesBestMatchesList [data-role="graves-best-match"]').length
            };
        })()`);

        expect(result.feedback).toBe('');
        expect(result.panelHidden).toBe(false);
        expect(result.rows).toBeGreaterThan(0);
    });

    test('Generate Best Matches rejects more than 10 selected elements', async () => {
        const result = await h.evaluate(`(async () => {
            const feedback = ${buildGravesBestMatchesDom(`[
                { value: 'ACTION', dataset: { category: 'Genre' } },
                { value: 'MODERN_AMERICAN_CITY', dataset: { category: 'Setting' } },
                { value: 'PROTAGONIST_COP', dataset: { category: 'Protagonist' } },
                ...Array.from({ length: 8 }, (_, index) => ({
                    value: 'TEST_TAG_' + index,
                    dataset: { category: 'Supporting Character' }
                }))
            ]`)};

            await generateBestMatches();
            return feedback.textContent;
        })()`);

        expect(result).toContain('up to 10 story elements');
        expect(result).toContain('You selected 11');
    });

    test('Evaluate Script rejects more than 10 selected elements', async () => {
        const result = await h.evaluate(`(async () => {
            const feedback = ${buildGravesBestMatchesDom(`[
                { value: 'ACTION', dataset: { category: 'Genre' } },
                { value: 'MODERN_AMERICAN_CITY', dataset: { category: 'Setting' } },
                { value: 'PROTAGONIST_COP', dataset: { category: 'Protagonist' } },
                ...Array.from({ length: 8 }, (_, index) => ({
                    value: 'TEST_TAG_' + index,
                    dataset: { category: 'Supporting Character' }
                }))
            ]`)};

            await evaluateColmanGravesScript();
            return feedback.textContent;
        })()`);

        expect(result).toContain('up to 10 story elements');
        expect(result).toContain('You selected 11');
    });

});
