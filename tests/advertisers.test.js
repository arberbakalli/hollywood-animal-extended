import { describe, test, expect, beforeAll } from '@jest/globals';
import { loadInstrumentedApp } from './helpers/legacyHarness.js';

/**
 * Best Advertisers recommendation engine.
 *
 * Expected values here are derived from the shipped game data
 * (data/TagsAudienceWeights.json), not from the feature spec — the spec's
 * sample weights disagree with the game files, and the game files win.
 */

let h;

beforeAll(async () => {
    h = await loadInstrumentedApp();
});

const agency = (name) => h.evaluate(`GAME_DATA.adAgents.find(a => a.name === ${JSON.stringify(name)})`);
const tags = (...ids) => ids.map(id => h.evaluate(`GAME_DATA.tags[${JSON.stringify(id)}]`));

const BALANCED = 0, ARTISTIC = 1, COMMERCIAL = 2;

describe('agency roster', () => {
    test('data.js is the single source of truth for all eight agencies', () => {
        const agents = h.evaluate('GAME_DATA.adAgents');
        expect(agents).toHaveLength(8);
        for (const a of agents) {
            expect(typeof a.id).toBe('string');
            expect(typeof a.name).toBe('string');
            expect(Array.isArray(a.targets)).toBe(true);
            expect(a.targets.length).toBeGreaterThan(0);
            expect([0, 1, 2]).toContain(a.type);
            expect(Number.isFinite(a.level)).toBe(true);
        }
    });

    test('every target names a real demographic', () => {
        const demos = Object.keys(h.evaluate('GAME_DATA.demographics'));
        for (const a of h.evaluate('GAME_DATA.adAgents')) {
            for (const t of a.targets) expect(demos).toContain(t);
        }
    });
});

describe('calculateAdvertiserMatch', () => {
    test('averages the tag weights over the audiences the agency reaches', () => {
        // Cowboy is TM:5 YM:5 AM:4 — Pierre Zola reaches exactly those three.
        const score = h.call('calculateAdvertiserMatch', tags('PROTAGONIST_COWBOY'), BALANCED, agency('Pierre Zola Company'));
        expect(score).toBeCloseTo((5 + 5 + 4) / 3, 5);
    });

    test('a balanced script leaves specialists un-penalised', () => {
        // Regression: com == art previously docked 0.2 off every specialist.
        const spark = agency('Spark'); // commercial
        const cowboy = tags('PROTAGONIST_COWBOY');
        const base = h.call('calculateAdvertiserMatch', cowboy, BALANCED, spark);

        expect(h.call('calculateAdvertiserMatch', cowboy, COMMERCIAL, spark)).toBeCloseTo(base + 0.25, 5);
        expect(h.call('calculateAdvertiserMatch', cowboy, ARTISTIC, spark)).toBeCloseTo(base - 0.2, 5);
    });

    test('universal agencies never take a lean adjustment', () => {
        const nbg = agency('NBG'); // type 0
        const cowboy = tags('PROTAGONIST_COWBOY');
        const base = h.call('calculateAdvertiserMatch', cowboy, BALANCED, nbg);

        expect(h.call('calculateAdvertiserMatch', cowboy, COMMERCIAL, nbg)).toBeCloseTo(base, 5);
        expect(h.call('calculateAdvertiserMatch', cowboy, ARTISTIC, nbg)).toBeCloseTo(base, 5);
    });

    test('clamps into 0..5 despite negative weights in the game data', () => {
        // Southern Belle carries TF:-2 / TM:-2, so male-only reach goes negative.
        const score = h.call('calculateAdvertiserMatch', tags('PROTAGONIST_SOUTHERN_BELLE'), BALANCED, agency('Spice Mice'));
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(5);
    });

    test('no tags scores zero rather than dividing by zero', () => {
        expect(h.call('calculateAdvertiserMatch', [], BALANCED, agency('NBG'))).toBe(0);
    });
});

describe('predictGradeFromScore', () => {
    const bands = () => h.evaluate('ADVERTISER_GRADE_BANDS');

    test('covers every grade from A+ down to F, in descending order', () => {
        const table = bands();
        expect(table.map(([, grade]) => grade)).toEqual(['A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'F']);

        const mins = table.map(([min]) => min);
        for (let i = 1; i < mins.length; i++) expect(mins[i]).toBeLessThan(mins[i - 1]);
        expect(mins[mins.length - 1]).toBe(-Infinity); // F catches everything below
    });

    // Stated, not read from the source (GAME_RULES.md section 6). Scores carry
    // one decimal, so each pair is the lowest score of a grade and the score
    // just below it.
    test.each([
        [3.4, 'A+', 'grade-high'], [3.3, 'A', 'grade-high'],
        [2.9, 'A', 'grade-high'], [2.8, 'B+', 'grade-good'],
        [2.6, 'B+', 'grade-good'], [2.5, 'B', 'grade-good'],
        [2.4, 'B', 'grade-good'], [2.3, 'C+', 'grade-mid'],
        [2.2, 'C+', 'grade-mid'], [2.1, 'C', 'grade-mid'],
        [2.0, 'C', 'grade-mid'], [1.9, 'D', 'grade-low'],
        [1.5, 'D', 'grade-low'], [1.4, 'F', 'grade-poor'],
        [0, 'F', 'grade-poor'],
    ])('a score of %d grades %s', (score, grade, tier) => {
        expect(h.call('predictGradeFromScore', score)).toEqual({ grade, tier });
    });

    test('the bands stay inside the range real scripts can actually reach', () => {
        // Regression: the bands originally came from the feature spec and were
        // anchored at 4.0+, but across 3000 random six-element scripts
        // (tools/grade-distribution.mjs) the best agency never exceeded 3.72.
        // Every grade above C was unreachable and 94% of scripts showed D or F.
        expect(bands()[0][0]).toBeLessThan(3.72);
    });

    test('never returns a colour literal — markup must stay style-attribute free', () => {
        for (const s of [3.5, 2.5, 1.2, 0]) {
            expect(h.call('predictGradeFromScore', s)).not.toHaveProperty('color');
        }
    });
});

describe('getRecommendations', () => {
    test('male-skewed elements rank the male-focused agency first', () => {
        const result = h.evaluate(`getRecommendations({
            tags: [GAME_DATA.tags.PROTAGONIST_COWBOY],
            movieLean: 2
        })`);
        expect(result.topRecommendation.agency.name).toBe('Pierre Zola Company');
    });

    test('ranks every agency, best first, and partitions the rest', () => {
        const result = h.evaluate(`getRecommendations({
            tags: [GAME_DATA.tags.PROTAGONIST_COWBOY],
            movieLean: 0
        })`);

        expect(result.allScores).toHaveLength(8);
        const scores = result.allScores.map(r => r.score);
        expect([...scores].sort((a, b) => b - a)).toEqual(scores);

        // top + alternatives + weak accounts for the whole roster exactly once.
        const cutoff = h.evaluate('ADVERTISER_WEAK_THRESHOLD');
        expect(1 + result.alternatives.length + result.weakMatches.length).toBe(8);
        for (const a of result.alternatives) expect(a.score).toBeGreaterThanOrEqual(cutoff);
        for (const w of result.weakMatches) expect(w.score).toBeLessThan(cutoff);
    });

    test('the avoid cutoff is the F boundary: 1.5 is kept, 1.4 is avoided', () => {
        // Regression: the cutoff was a standalone 3.0, which after the grade
        // recalibration sat at the 99th percentile and flagged 6 of 8 agencies.
        const cutoff = h.evaluate('ADVERTISER_WEAK_THRESHOLD');
        expect(1.5).toBeGreaterThanOrEqual(cutoff);
        expect(1.4).toBeLessThan(cutoff);
        expect(h.call('predictGradeFromScore', 1.4).grade).toBe('F');
    });

    test('an empty selection yields no recommendation instead of throwing', () => {
        const result = h.evaluate('getRecommendations({ tags: [], movieLean: 0 })');
        expect(result.topRecommendation).toBeNull();
        expect(result.alternatives).toEqual([]);
        expect(result.weakMatches).toEqual([]);
    });

    test('weak entries explain why to avoid them', () => {
        // A female lead genuinely has no fit at the male- and teen-focused
        // agencies, so this script is the one that populates weakMatches.
        const result = h.evaluate(`getRecommendations({
            tags: [GAME_DATA.tags.PROTAGONIST_SOUTHERN_BELLE],
            movieLean: 0
        })`);
        expect(result.weakMatches.length).toBeGreaterThan(0);
        for (const w of result.weakMatches) expect(w.reasoning).toMatch(/underperform/);
    });
});

// Owner ruling 2026-09-29: the sentence under a card follows its grade, so an
// A+ never reads "not a standout". The old sentence cut-offs (4.5, 4.0) sat
// above anything a real script reaches.
describe('generateReasoning follows the grade', () => {
    const spark = { name: 'Spark', targets: ['YM', 'YF'] };

    test.each([
        [3.4, 'A+', 'Strong appeal across YM, YF.'],
        [2.9, 'A', 'Strong appeal across YM, YF.'],
        [2.8, 'B+', 'Good compatibility across YM, YF.'],
        [2.4, 'B', 'Good compatibility across YM, YF.'],
        [2.3, 'C+', 'Adequate reach for YM, YF, but not a standout.'],
        [2.0, 'C', 'Adequate reach for YM, YF, but not a standout.'],
        [1.5, 'D', 'Adequate reach for YM, YF, but not a standout.'],
        [1.4, 'F', 'Your elements score poorly with YM, YF — this campaign would underperform.'],
    ])('a score of %d (%s) reads "%s"', (score, grade, sentence) => {
        expect(h.call('predictGradeFromScore', score).grade).toBe(grade);
        expect(h.call('generateReasoning', spark, score)).toBe(sentence);
    });
});

describe('renderAdvertiserCard', () => {
    const entry = {
        agency: { name: 'Spark', targets: ['YM', 'YF'], type: 2, level: 3 },
        // Graded on the tenth it shows (owner ruling 2026-10-01, edit
        // approved). The old fixture paired 4.25 with a B.
        score: 4.3, grade: 'A+', tier: 'grade-high', reasoning: 'Strong appeal across YM, YF.',
    };

    test('renders the score, grade and reasoning', () => {
        const html = h.call('renderAdvertiserCard', entry, 'top');
        expect(html).toContain('Spark');
        expect(html).toContain('4.3');
        expect(html).toContain('grade-high');
        expect(html).toContain(entry.reasoning);
        expect(html).toContain('advertiser-card top');
    });

    test('uses a tier class, never an inline style attribute', () => {
        const html = h.call('renderAdvertiserCard', entry, 'weak');
        expect(html).not.toMatch(/\sstyle="/i);
    });
});
