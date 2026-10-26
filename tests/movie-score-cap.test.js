/**
 * Game's Rating Limit table (verified screenshot):
 * - 9 story elements → Movie 9
 * - 10 story elements → Movie 10
 *
 * Updated 2026-09-28 to match the game's visual Rating Limit table.
 * The previous assumption that 9 elements could reach 10 contradicted
 * the game's own UI.
 */
import '../src/evaluation/movieScoreEstimator.js';

const { getMovieScoreCap, calculateMovieScores } = globalThis.HACMovieScoreEstimator;

const storyElements = (count) => [
    { id: 'G', category: 'Genre' },
    { id: 'S', category: 'Setting' },
    ...Array.from({ length: count }, (_, i) => ({ id: `E${i}`, category: 'Supporting Character' })),
];

describe('movie score ceiling for 9 story elements', () => {
    test('9 story elements can reach a movie score of 9', () => {
        expect(getMovieScoreCap(9)).toBe(9);
    });

    test('an excellent 9-element script is estimated at 9, not 10', () => {
        // (1.0 + 0.2) * 9.9 = 11.88 before the cap, so the cap alone decides.
        const scores = calculateMovieScores({ totalScore: 1.0 }, { com: 0.2, art: 0.2 }, storyElements(9));

        expect(scores.scoringCount).toBe(9);
        expect(scores.tagCap).toBe(9);
        expect(scores.commercial).toBe(9);
        expect(scores.artistic).toBe(9);
    });
});

describe('movie score ceiling for 10 story elements', () => {
    test('10 story elements can reach a movie score of 10', () => {
        expect(getMovieScoreCap(10)).toBe(10);
    });

    test('an excellent 10-element script is estimated at 10', () => {
        const scores = calculateMovieScores({ totalScore: 1.0 }, { com: 0.2, art: 0.2 }, storyElements(10));

        expect(scores.scoringCount).toBe(10);
        expect(scores.tagCap).toBe(10);
        expect(scores.commercial).toBe(10);
        expect(scores.artistic).toBe(10);
    });

    test('Genre and Setting still do not count toward the ceiling', () => {
        // 8 story elements plus context is not a 10-element script.
        expect(calculateMovieScores({ totalScore: 1.0 }, { com: 0, art: 0 }, storyElements(8)).tagCap)
            .toBeLessThan(10);
    });
});

describe('movie score ceiling below nine story elements', () => {
    test.each([
        [5, 6],
        [6, 6],
        [7, 8],
        [8, 8],
    ])('%i story elements top out at %i.0', (count, cap) => {
        expect(getMovieScoreCap(count)).toBe(cap);
    });

    test('an excellent 8-element script is estimated at 8.0, not 9', () => {
        const scores = calculateMovieScores({ totalScore: 1.0 }, { com: 0.2, art: 0.2 }, storyElements(8));

        expect(scores.commercial).toBe(8);
        expect(scores.artistic).toBe(8);
    });
});

// The Script column of the same table, as the Script Lab card's "Script Qual"
// badge shows it (buildScriptStats().maxScriptQuality).
describe('script quality limit', () => {
    let h;

    beforeAll(async () => {
        const { loadInstrumentedApp } = await import('./helpers/legacyHarness.js');
        h = await loadInstrumentedApp();
    });

    test.each([
        [4, 5],
        [5, 5],
        [6, 5],
        [7, 7],
        [8, 7],
        [9, 8],
        [10, 10],
    ])('%i story elements show a script limit of %i', (count, limit) => {
        const stats = h.evaluate(`(() => {
            const tags = ${JSON.stringify(storyElements(count))};
            const movieScores = HACMovieScoreEstimator.calculateMovieScores({ totalScore: 1.0 }, { com: 0, art: 0 }, tags);
            return HACScriptGenerationEngine.buildScriptStats({ rawAverage: 4, totalScore: 1.0 }, movieScores);
        })()`);

        expect(stats.maxScriptQuality).toBe(limit);
    });
});
