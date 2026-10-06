import { describe, expect, test } from '@jest/globals';
import { readFile } from 'node:fs/promises';
import { rankPreservation, PRESERVATION_PRESETS } from '../lab/labModel.js';

// Element Preservation (GAME_RULES section 9): the game lets the player keep five
// story elements Fresh forever. The lab ranks candidates; the weights are advice.
const tag = (id, category, extra = {}) => ({ id, name: id.replaceAll('_', ' '), category, art: 0, com: 0, ...extra });

function world(pairs = {}, extraTags = []) {
    const tags = [
        tag('G1', 'Genre'), tag('G2', 'Genre'), tag('S1', 'Setting'),
        tag('P_ALL', 'Protagonist', { gender: 'U' }),
        tag('P_YOUNG', 'Protagonist', { gender: 'M' }),
        tag('P_LATE', 'Protagonist', { gender: 'U' }),
        tag('P_NODATA', 'Protagonist', { gender: 'U' }),
        tag('SC_A', 'Supporting Character', { gender: 'U' }),
        tag('T_A', 'Theme & Event'),
        tag('F_A', 'Finale'),
        ...extraTags
    ];
    const ageData = {
        protagonists: {
            P_ALL: { ratings: { YOUNG: 'Good', MID: 'Good', OLD: 'Good' } },
            P_YOUNG: { ratings: { YOUNG: 'Good', MID: 'Neutral', OLD: 'Neutral' } },
            P_LATE: { ratings: { YOUNG: 'Good', MID: 'Good', OLD: 'Bad' } }
        },
        antagonists: {},
        supportingCharacters: { SC_A: { ratings: { YOUNG: 'Good', MID: 'Good', OLD: 'Good' } } }
    };
    const scorePair = (a, b) => pairs[`${a.id}|${b.id}`] ?? pairs[`${b.id}|${a.id}`] ?? 3;
    return { tags, ageData, scorePair };
}

const ids = result => result.rows.map(row => row.tag.id);
const row = (result, id) => result.rows.find(item => item.tag.id === id);

describe('rankPreservation', () => {
    test('ranks only the five story categories, never Genre or Setting', () => {
        const { tags, ageData, scorePair } = world();
        const result = rankPreservation(tags, { scorePair, ageData });
        expect(ids(result).sort()).toEqual(['F_A', 'P_ALL', 'P_LATE', 'P_NODATA', 'P_YOUNG', 'SC_A', 'T_A']);
    });

    test('counts strong links (4+) and conflicts (below 2) against the other candidates', () => {
        const { tags, ageData, scorePair } = world({ 'P_ALL|SC_A': 5, 'P_ALL|T_A': 4, 'P_ALL|F_A': 1, 'P_ALL|P_LATE': 2 });
        const result = rankPreservation(tags, { scorePair, ageData });
        expect(row(result, 'P_ALL')).toMatchObject({ strongLinks: 2, conflicts: 1 });
        expect(row(result, 'SC_A')).toMatchObject({ strongLinks: 1, conflicts: 0 });
    });

    test('leaves out excluded elements, also as pair partners', () => {
        const { tags, ageData, scorePair } = world({ 'P_ALL|SC_A': 5, 'P_ALL|T_A': 4 });
        const result = rankPreservation(tags, { scorePair, ageData, excludedIds: new Set(['T_A']) });
        expect(ids(result)).not.toContain('T_A');
        expect(row(result, 'P_ALL').strongLinks).toBe(1);
    });

    test('names how a role holds up as the actor ages', () => {
        const { tags, ageData, scorePair } = world();
        const result = rankPreservation(tags, { scorePair, ageData });
        expect(row(result, 'P_ALL').age).toEqual({ value: 1, label: 'All ages', known: true });
        expect(row(result, 'P_YOUNG').age).toEqual({ value: 2 / 3, label: 'Young-only', known: true });
        expect(row(result, 'P_LATE').age).toEqual({ value: 2 / 3, label: 'Weak late-career', known: true });
        expect(row(result, 'T_A').age).toEqual({ value: 1, label: 'Not an actor role', known: true });
        expect(row(result, 'P_YOUNG').caveats).toContain('Actor-age sensitive');
        expect(row(result, 'P_ALL').caveats).not.toContain('Actor-age sensitive');
    });

    // Owner, 2026-10-06: no age data is neither boosted nor penalised, and flagged.
    test('a character with no age data counts as the average rated character and is flagged', () => {
        const { tags, ageData, scorePair } = world();
        const result = rankPreservation(tags, { scorePair, ageData });
        const average = (1 + 2 / 3 + 2 / 3 + 1) / 4;
        expect(result.ageNeutral).toBeCloseTo(average, 10);
        expect(row(result, 'P_NODATA').parts.age).toBeCloseTo(average, 10);
        expect(row(result, 'P_NODATA').age.label).toBe('No age data');
        expect(row(result, 'P_NODATA').caveats).toContain('No age data');
    });

    test('a category a script can use several times outranks a one-slot category, all else equal', () => {
        const tags = [tag('P_X', 'Protagonist', { gender: 'U' }), tag('SC_X', 'Supporting Character', { gender: 'U' })];
        const ageData = { protagonists: { P_X: { ratings: { YOUNG: 'Good', MID: 'Good', OLD: 'Good' } } },
            antagonists: {}, supportingCharacters: { SC_X: { ratings: { YOUNG: 'Good', MID: 'Good', OLD: 'Good' } } } };
        const result = rankPreservation(tags, { scorePair: () => 3, ageData });
        expect(ids(result)).toEqual(['SC_X', 'P_X']);
        expect(row(result, 'P_X').caveats).toContain('One per script');
        expect(row(result, 'SC_X').caveats).not.toContain('One per script');
    });

    test('a gender-locked character is flagged', () => {
        const { tags, ageData, scorePair } = world();
        const result = rankPreservation(tags, { scorePair, ageData });
        expect(row(result, 'P_YOUNG').caveats).toContain('Male only');
        expect(row(result, 'P_ALL').caveats).not.toContain('Male only');
    });

    test('a direct score bonus raises an element, all else equal', () => {
        const tags = [tag('T_PLAIN', 'Theme & Event'), tag('T_BONUS', 'Theme & Event', { com: 0.5 })];
        const result = rankPreservation(tags, { scorePair: () => 3, ageData: {} });
        expect(ids(result)).toEqual(['T_BONUS', 'T_PLAIN']);
    });

    test('Power scorer favours pair reach; Career stable favours roles that last all ages', () => {
        const tags = [
            tag('P_STRONG', 'Protagonist', { gender: 'U' }), tag('P_STEADY', 'Protagonist', { gender: 'U' }),
            tag('T1', 'Theme & Event'), tag('T2', 'Theme & Event'), tag('T3', 'Theme & Event'), tag('T4', 'Theme & Event')
        ];
        const ageData = { protagonists: {
            P_STRONG: { ratings: { YOUNG: 'Good', MID: 'Bad', OLD: 'Bad' } },
            P_STEADY: { ratings: { YOUNG: 'Good', MID: 'Good', OLD: 'Good' } } }, antagonists: {}, supportingCharacters: {} };
        const strong = new Set(['P_STRONG|T1', 'P_STRONG|T2', 'P_STRONG|T3', 'P_STRONG|T4', 'P_STEADY|T1']);
        const scorePair = (a, b) => (strong.has(`${a.id}|${b.id}`) || strong.has(`${b.id}|${a.id}`) ? 5 : 3);
        const order = preset => ids(rankPreservation(tags, { scorePair, ageData, preset })).filter(id => id.startsWith('P_'));
        expect(order('power')).toEqual(['P_STRONG', 'P_STEADY']);
        expect(order('career')).toEqual(['P_STEADY', 'P_STRONG']);
    });

    test('with genres chosen, fit is the mean over them and links count only elements that fit', () => {
        const { tags, ageData, scorePair } = world({
            'G1|SC_A': 5, 'G2|SC_A': 3, 'G1|T_A': 4, 'G2|T_A': 4, 'G1|P_ALL': 2, 'G2|P_ALL': 1,
            'P_ALL|SC_A': 5, 'P_ALL|T_A': 4, 'P_ALL|F_A': 1
        });
        const result = rankPreservation(tags, { scorePair, ageData, genreIds: ['G1', 'G2'] });
        expect(result.poolSize).toBe(2);
        expect(row(result, 'SC_A').genreFit).toBe(4);
        expect(row(result, 'P_ALL')).toMatchObject({ genreFit: 1.5, strongLinks: 2, conflicts: 0 });
        expect(row(result, 'P_ALL').caveats).toContain('Poor fit with G2');
        expect(row(result, 'T_A').bestGenres).toEqual(['G1', 'G2']);
        expect(row(result, 'SC_A').bestGenres).toEqual(['G1']);
        expect(rankPreservation(tags, { scorePair, ageData }).rows.every(item => item.genreFit === null)).toBe(true);
    });

    test('marks exactly the first five rows as the top picks', () => {
        const { tags, ageData, scorePair } = world({ 'P_ALL|SC_A': 5 });
        const result = rankPreservation(tags, { scorePair, ageData });
        expect(result.rows).toHaveLength(7);
        expect(result.rows.map(item => item.top)).toEqual([true, true, true, true, true, false, false]);
        expect(result.top).toEqual(result.rows.slice(0, 5));
        expect(result.rows.map(item => item.rank)).toEqual([1, 2, 3, 4, 5, 6, 7]);
        const scores = result.rows.map(item => item.score);
        expect(scores).toEqual([...scores].sort((a, b) => b - a));
    });

    // Owner, 2026-10-06: Theme & Event fills the top 5, so also show each category's best.
    test('names the highest-ranked pick of each story category, in category order', () => {
        const { tags, ageData, scorePair } = world({ 'P_ALL|SC_A': 5, 'P_LATE|T_A': 5 });
        const result = rankPreservation(tags, { scorePair, ageData });
        expect(result.bestByCategory.map(item => item.tag.category))
            .toEqual(['Protagonist', 'Supporting Character', 'Theme & Event', 'Finale']);
        result.bestByCategory.forEach(best => {
            expect(best).toBe(result.rows.find(item => item.tag.category === best.tag.category));
        });
        const withoutFinale = rankPreservation(tags, { scorePair, ageData, excludedIds: new Set(['F_A']) });
        expect(withoutFinale.bestByCategory.map(item => item.tag.category)).not.toContain('Finale');
    });

    // Real data: every story element is ranked, and exactly the characters that
    // data/AgeRoleCompatibility.json lacks are flagged. Stays true when data is added.
    test('on the real data, flags exactly the characters the age file lacks', async () => {
        const json = async path => JSON.parse(await readFile(path, 'utf8'));
        const [tagData, ageData] = await Promise.all([json('data/TagData.json'), json('data/AgeRoleCompatibility.json')]);
        const categoryOf = item => (item.type === 0 ? 'Genre' : item.type === 1 ? 'Setting'
            : ({ SupportingCharacter: 'Supporting Character', Theme: 'Theme & Event' }[item.CategoryID] || item.CategoryID));
        const tags = Object.entries(tagData).map(([id, item]) => tag(id, categoryOf(item), { gender: item.gender }));
        const result = rankPreservation(tags, { scorePair: () => 3, ageData });
        const story = tags.filter(item => !['Genre', 'Setting'].includes(item.category));
        expect(result.rows).toHaveLength(story.length);
        const rated = new Set([...Object.keys(ageData.protagonists), ...Object.keys(ageData.antagonists), ...Object.keys(ageData.supportingCharacters)]);
        const characters = story.filter(item => ['Protagonist', 'Antagonist', 'Supporting Character'].includes(item.category));
        const flagged = result.rows.filter(item => item.caveats.includes('No age data')).map(item => item.tag.id).sort();
        expect(flagged).toEqual(characters.filter(item => !rated.has(item.id)).map(item => item.id).sort());
    });

    test('rejects more than two genres and an unknown strategy', () => {
        const { tags, ageData, scorePair } = world();
        expect(() => rankPreservation(tags, { scorePair, ageData, genreIds: ['G1', 'G2', 'G1'] })).toThrow('at most two genres');
        expect(() => rankPreservation(tags, { scorePair, ageData, preset: 'luck' })).toThrow('Unknown strategy');
        expect(Object.keys(PRESERVATION_PRESETS)).toEqual(['balanced', 'power', 'career']);
    });
});
