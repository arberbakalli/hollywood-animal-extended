/**
 * Guards against the getScoreLabel / getScoreClass band mismatch in
 * src/marketing/audienceCompatibility.js.
 *
 * Bug: getScoreLabel used a 7-band scale ("Very Good" for score >= 3.0,
 * "Very Bad" for score >= -4.0) while getScoreClass used the 5 bands that
 * match the visible legend exactly (index.html #audience-compatibility-panel
 * .compatibility-legend: Excellent/Good/Neutral/Bad/Disastrous). Both run off
 * the same score and are rendered together (title=label, class=scoreClass),
 * so a weight of 3 rendered class="good" (green, correct per legend) but
 * title="Very Good" (a label that appears nowhere in the visible legend). A
 * weight of -4 rendered class="disastrous" but title="Very Bad".
 *
 * Fix: both functions now derive from one shared band table (getScoreBand),
 * so label and class can never disagree again.
 *
 * This imports the real module directly rather than re-implementing its
 * logic in the test. src/marketing/audienceCompatibility.js has no
 * import/export statements (it is a classic `(function(global){...})(this)`
 * script, loaded via <script src="..."> in index.html), which is also valid
 * ES module source: importing it for side effects runs the IIFE exactly as a
 * <script> tag would and attaches HACOudienceCompatibility to globalThis.
 * getScoreLabel/getScoreClass touch no DOM/GAME_DATA, so no browser stubs
 * are required (unlike tests/audience-compatibility.test.js, which goes
 * through the heavier loadInstrumentedApp() harness for GAME_DATA-dependent
 * assertions).
 */
import '../src/marketing/audienceCompatibility.js';

const { getScoreLabel, getScoreClass } = globalThis.HACOudienceCompatibility;

// Authored independently from the visible legend (index.html lines 611-615),
// not copied from the source file's internal table, so comparing against it
// is a real oracle rather than the source checked against itself.
const LABEL_BY_CLASS = {
    excellent: 'Excellent',
    good: 'Good',
    neutral: 'Neutral',
    bad: 'Bad',
    disastrous: 'Disastrous',
};
const KNOWN_CLASSES = Object.keys(LABEL_BY_CLASS);
const FORBIDDEN_LABELS = ['Very Good', 'Very Bad'];

describe('Audience Compatibility: getScoreLabel / getScoreClass band consistency', () => {
    test('both functions are exposed on the exported namespace', () => {
        expect(typeof getScoreLabel).toBe('function');
        expect(typeof getScoreClass).toBe('function');
    });

    describe.each([
        [5, 'excellent'],
        [4, 'excellent'],
        [3, 'good'],        // previously mismatched: class 'good', label 'Very Good'
        [2, 'good'],
        [1, 'good'],
        [0, 'neutral'],
        [-1, 'bad'],
        [-2, 'bad'],
        [-3, 'bad'],
        [-4, 'disastrous'], // previously mismatched: class 'disastrous', label 'Very Bad'
        [-5, 'disastrous'],
    ])('score %d', (score, expectedClass) => {
        test(`getScoreClass(${score}) is '${expectedClass}', matching the legend band`, () => {
            expect(getScoreClass(score)).toBe(expectedClass);
        });

        test(`getScoreLabel(${score}) matches whichever band getScoreClass(${score}) implies`, () => {
            const scoreClass = getScoreClass(score);
            expect(KNOWN_CLASSES).toContain(scoreClass);
            expect(getScoreLabel(score)).toBe(LABEL_BY_CLASS[scoreClass]);
        });
    });

    test('the +3 mismatch is fixed: class is good and label is "Good", not "Very Good"', () => {
        expect(getScoreClass(3)).toBe('good');
        expect(getScoreLabel(3)).toBe('Good');
    });

    test('the -4 mismatch is fixed: class is disastrous and label is "Disastrous", not "Very Bad"', () => {
        expect(getScoreClass(-4)).toBe('disastrous');
        expect(getScoreLabel(-4)).toBe('Disastrous');
    });

    test('no score in the real data range (-5..+5 whole integers) ever labels "Very Good" or "Very Bad"', () => {
        for (let score = -5; score <= 5; score++) {
            expect(FORBIDDEN_LABELS).not.toContain(getScoreLabel(score));
        }
    });
});
