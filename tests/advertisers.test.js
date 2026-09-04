import { describe, test, expect, beforeAll } from '@jest/globals';
import { loadLegacyScript } from './helpers/legacyHarness.js';

/**
 * Best Advertisers recommendation engine.
 *
 * Expected values here are derived from the shipped game data
 * (data/TagsAudienceWeights.json), not from the feature spec — the spec's
 * sample weights disagree with the game files, and the game files win.
 */

let h;

beforeAll(async () => {
    h = await loadLegacyScript();
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
    test('maps each band to a grade and a css tier', () => {
        const table = [5.0, 4.7, 4.3, 4.0, 3.5, 3.0, 2.0, 0].map(s => h.call('predictGradeFromScore', s));
        expect(table.map(t => t.grade)).toEqual(['A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'F']);
        for (const t of table) expect(t.tier).toMatch(/^grade-/);
    });

    test('never returns a colour literal — markup must stay style-attribute free', () => {
        for (const s of [5, 4.5, 3.2, 1]) {
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
        expect(1 + result.alternatives.length + result.weakMatches.length).toBe(8);
        for (const a of result.alternatives) expect(a.score).toBeGreaterThanOrEqual(3.0);
        for (const w of result.weakMatches) expect(w.score).toBeLessThan(3.0);
    });

    test('an empty selection yields no recommendation instead of throwing', () => {
        const result = h.evaluate('getRecommendations({ tags: [], movieLean: 0 })');
        expect(result.topRecommendation).toBeNull();
        expect(result.alternatives).toEqual([]);
        expect(result.weakMatches).toEqual([]);
    });

    test('weak entries explain why to avoid them', () => {
        const result = h.evaluate(`getRecommendations({
            tags: [GAME_DATA.tags.PROTAGONIST_COWBOY],
            movieLean: 0
        })`);
        expect(result.weakMatches.length).toBeGreaterThan(0);
        for (const w of result.weakMatches) expect(w.reasoning).toMatch(/underperform/);
    });
});

describe('renderAdvertiserCard', () => {
    const entry = {
        agency: { name: 'Spark', targets: ['YM', 'YF'], type: 2, level: 3 },
        score: 4.25, grade: 'B', tier: 'grade-good', reasoning: 'Good compatibility across YM, YF.',
    };

    test('renders the score, grade and reasoning', () => {
        const html = h.call('renderAdvertiserCard', entry, 'top');
        expect(html).toContain('Spark');
        expect(html).toContain('4.25');
        expect(html).toContain('grade-good');
        expect(html).toContain(entry.reasoning);
        expect(html).toContain('advertiser-card top');
    });

    test('uses a tier class, never an inline style attribute', () => {
        const html = h.call('renderAdvertiserCard', entry, 'weak');
        expect(html).not.toMatch(/\sstyle="/i);
    });
});
