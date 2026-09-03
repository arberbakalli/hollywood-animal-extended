import { describe, test, expect, beforeAll } from '@jest/globals';
import { loadLegacyScript, round } from './helpers/legacyHarness.js';

/**
 * Golden-master characterisation of the scoring core in script.js.
 *
 * These tests do not assert that the numbers are *correct* — nobody has a
 * specification to check them against. They assert that the numbers do not
 * CHANGE. That is what makes the pending refactoring safe: extracting
 * calculateMatrixScore & co. into modules must leave every value identical,
 * and a snapshot diff is the proof.
 *
 * Fixtures are derived from the real on-disk data by sorting category members,
 * so they stay deterministic without hardcoding IDs that may be renamed.
 */

let h;
let cat;

beforeAll(async () => {
    h = await loadLegacyScript();
    cat = {};
    for (const t of Object.values(h.GAME_DATA.tags)) {
        (cat[t.category] ||= []).push(t.id);
    }
    for (const ids of Object.values(cat)) ids.sort();
});

const tag = (id, category, percent = 1) => ({ id, category, percent });

/** Normalise a matrix result so snapshots are stable across platforms. */
const normalise = (r) => ({
    totalScore: round(r.totalScore),
    rawAverage: round(r.rawAverage),
    spoilers: r.spoilers,
});

describe('data fixture', () => {
    test('loads the full tag set from disk', () => {
        const gd = h.GAME_DATA;
        expect(Object.keys(gd.tags).length).toBe(250);
        expect(Object.keys(gd.compatibility).length).toBeGreaterThan(0);
        expect(Object.keys(gd.genrePairs).length).toBeGreaterThan(0);
    });

    test('every tag has the shape the scoring core expects', () => {
        for (const t of Object.values(h.GAME_DATA.tags)) {
            expect(typeof t.id).toBe('string');
            expect(typeof t.category).toBe('string');
            expect(Number.isFinite(t.art)).toBe(true);
            expect(Number.isFinite(t.com)).toBe(true);
        }
    });
});

describe('calculateMatrixScore — golden master', () => {
    test('two genres weighted 60/40', () => {
        const combo = [
            tag(cat.Genre[0], 'Genre', 0.6),
            tag(cat.Genre[1], 'Genre', 0.4),
            tag(cat.Protagonist[0], 'Protagonist'),
        ];
        expect(normalise(h.call('calculateMatrixScore', combo))).toMatchSnapshot();
    });

    test('single genre with a full supporting cast', () => {
        const combo = [
            tag(cat.Genre[0], 'Genre', 1),
            tag(cat.Setting[0], 'Setting'),
            tag(cat.Protagonist[0], 'Protagonist'),
            tag(cat.Antagonist[0], 'Antagonist'),
            tag(cat['Supporting Character'][0], 'Supporting Character'),
            tag(cat['Theme & Event'][0], 'Theme & Event'),
            tag(cat.Finale[0], 'Finale'),
        ];
        expect(normalise(h.call('calculateMatrixScore', combo))).toMatchSnapshot();
    });

    test('a known conflicting pair reports a spoiler and a negative score', () => {
        // AMERICAN_CIVIL_WAR + ANTAGONIST_ALIEN has compatibility 1.0, which
        // trips the worstVal <= 1.0 branch.
        const combo = [
            tag(cat.Genre[0], 'Genre', 1),
            tag('AMERICAN_CIVIL_WAR', 'Setting'),
            tag('ANTAGONIST_ALIEN', 'Antagonist'),
        ];
        const result = h.call('calculateMatrixScore', combo);
        expect(result.spoilers.length).toBeGreaterThan(0);
        expect(result.totalScore).toBeLessThan(0);
        expect(normalise(result)).toMatchSnapshot();
    });

    test('degenerate inputs do not throw', () => {
        expect(normalise(h.call('calculateMatrixScore', []))).toMatchSnapshot('empty');
        expect(
            normalise(h.call('calculateMatrixScore', [tag(cat.Genre[0], 'Genre', 1)]))
        ).toMatchSnapshot('single tag');
    });
});

describe('calculateTotalBonuses / calculateGenrePairScore — golden master', () => {
    test('genre pair bonus applies when both genres clear the thresholds', () => {
        const combo = [
            tag(cat.Genre[0], 'Genre', 0.6),
            tag(cat.Genre[1], 'Genre', 0.4),
            tag(cat.Protagonist[0], 'Protagonist'),
        ];
        expect(h.call('calculateGenrePairScore', combo)).toMatchSnapshot('pair');
        expect(h.call('calculateTotalBonuses', combo)).toMatchSnapshot('bonuses');
    });

    test('secondary genre below 0.35 forfeits the pair bonus', () => {
        const combo = [
            tag(cat.Genre[0], 'Genre', 0.7),
            tag(cat.Genre[1], 'Genre', 0.3),
        ];
        expect(h.call('calculateGenrePairScore', combo)).toBeNull();
    });

    test('a single genre never yields a pair bonus', () => {
        expect(h.call('calculateGenrePairScore', [tag(cat.Genre[0], 'Genre', 1)])).toBeNull();
    });
});

describe('compatibility lookup is symmetric', () => {
    test('argument order does not change the score', () => {
        const a = tag('AMERICAN_CIVIL_WAR', 'Setting');
        const b = tag('ANTAGONIST_ALIEN', 'Antagonist');
        const forward = h.call('calculateMatrixScore', [a, b]);
        const reverse = h.call('calculateMatrixScore', [b, a]);
        expect(round(forward.totalScore)).toBe(round(reverse.totalScore));
        expect(round(forward.rawAverage)).toBe(round(reverse.rawAverage));
    });
});

describe('getRequiredElementCount', () => {
    // Regression guard: the help text and the generator previously kept
    // separate tables that disagreed at scores 6, 7 and 10.
    test('is the single source consumed by both the UI and the generator', () => {
        const table = {};
        for (let score = 6; score <= 10; score++) {
            table[score] = h.call('getRequiredElementCount', score);
        }
        expect(table).toEqual({ 6: 5, 7: 7, 8: 8, 9: 9, 10: 9 });
    });

    test('is monotonic — a higher target never needs fewer elements', () => {
        for (let score = 6; score < 10; score++) {
            expect(h.call('getRequiredElementCount', score + 1))
                .toBeGreaterThanOrEqual(h.call('getRequiredElementCount', score));
        }
    });
});

describe('generator availability', () => {
    test('custom profile does not add profile exclusions', () => {
        h.evaluate("currentGenProfile = 'custom'");

        expect(h.evaluate('[...getProfileExcludedIds()]')).toEqual([]);
    });

    test('starting profile excludes every non-starter tag and no starter tags', () => {
        h.evaluate("currentGenProfile = 'starting'");
        const result = h.evaluate(`(() => {
            const excluded = new Set(getProfileExcludedIds());
            const whitelist = new Set(GAME_DATA.starterWhitelist || []);
            const allIds = Object.keys(GAME_DATA.tags);

            return {
                excludedCount: excluded.size,
                expectedCount: allIds.filter(id => !whitelist.has(id)).length,
                whitelistLeaks: [...whitelist].filter(id => excluded.has(id)),
                nonStarterMisses: allIds.filter(id => !whitelist.has(id) && !excluded.has(id)),
            };
        })()`);

        expect(result.excludedCount).toBe(result.expectedCount);
        expect(result.whitelistLeaks).toEqual([]);
        expect(result.nonStarterMisses).toEqual([]);
    });

    test('generator exclusions merge manual exclusions with profile exclusions once', () => {
        h.evaluate("currentGenProfile = 'starting'");
        const result = h.evaluate(`(() => {
            const ids = getGeneratorExcludedTags([{ id: 'ACTION' }]).map(tag => tag.id);
            const uniqueIds = new Set(ids);

            return {
                includesManual: uniqueIds.has('ACTION'),
                hasDuplicates: uniqueIds.size !== ids.length,
            };
        })()`);

        expect(result.includesManual).toBe(true);
        expect(result.hasDuplicates).toBe(false);
    });
});

describe('Colman Graves evaluation helpers', () => {
    test('verdict thresholds match the reverse-engineering notes', () => {
        expect(h.call('getGravesVerdict', 4.0).label).toBe('Success');
        expect(h.call('getGravesVerdict', 3.5).label).toBe('Common');
        expect(h.call('getGravesVerdict', 3.2).label).toBe('Risky');
        expect(h.call('getGravesVerdict', 2.9).label).toBe('Failed');
    });

    test('findGravesConflicts reports raw pair clashes below 2.0', () => {
        const conflicts = h.call('findGravesConflicts', [
            tag('AMERICAN_CIVIL_WAR', 'Setting'),
            tag('ANTAGONIST_ALIEN', 'Antagonist'),
        ]);

        expect(conflicts).toHaveLength(1);
        expect(conflicts[0].rawScore).toBeLessThan(2.0);
    });
});

describe('pure helpers', () => {
    test('parseWeights coerces every value to a float', () => {
        expect(h.call('parseWeights', { a: '1.5', b: '0', c: '-2.25' }))
            .toEqual({ a: 1.5, b: 0, c: -2.25 });
    });

    test('getScoringElementCount excludes Genre and Setting', () => {
        const tags = [
            tag('X', 'Genre'), tag('Y', 'Setting'),
            tag('Z', 'Protagonist'), tag('W', 'Finale'),
        ];
        expect(h.call('getScoringElementCount', tags)).toBe(2);
    });

    test('formatScore and formatSimpleScore', () => {
        expect(h.call('formatScore', 0)).toBe('0');
        expect(h.call('formatScore', 1.234)).toMatchSnapshot('formatScore positive');
        expect(h.call('formatScore', -1.234)).toMatchSnapshot('formatScore negative');
        expect(h.call('formatSimpleScore', 2.5)).toMatchSnapshot('formatSimpleScore');
    });
});
