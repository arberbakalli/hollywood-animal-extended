import { beforeAll, describe, expect, test } from '@jest/globals';
import { loadLegacyScript } from './helpers/legacyHarness.js';
import { releaseCurve, calibrateAttendance, campaignCoverage, recentElementUse,
    validateRelease, unlockInfo, finiteNumber, rankGenreElements } from '../lab/labModel.js';

let app;
beforeAll(async () => { app = await loadLegacyScript(); });

describe('lab release strategy uses the production demand curve', () => {
    test('Behemoth and opening ability use production demand for every week', () => {
        const demand = app.evaluate('HACDistributionPlanner.weeklyDemandFor');
        const curve = demand(7.1, { artisticScore: 5.9, behemoth: true, openingMultiplier: 2 });
        expect(curve[0]).toBe(35500);
        expect(curve).toHaveLength(8);
        expect(curve.slice(1).every(value => Number.isFinite(value))).toBe(true);
    });
    test.each([[0, 35500], [11, 39405], [39, 49345], [100, 71000]])
    ('optional Factory estimate of %s%% changes opening week only', (boost, expected) => {
        const demand = app.evaluate('HACDistributionPlanner.weeklyDemandFor');
        const curve = releaseCurve(demand, 7.1, { artisticScore: 5.9, behemoth: true, openingMultiplier: 2 }, boost);
        expect(curve[0].baseline).toBe(35500);
        expect(curve[0].scenario).toBe(expected);
        expect(curve.slice(1).every(row => row.scenario === row.baseline)).toBe(true);
    });
    test('zero attendance reports no ratio rather than Infinity', () => {
        expect(calibrateAttendance(49896, 0, 35500)).toEqual({ occupiedEquivalent: 0, gap: 35500, ratio: null });
    });
    test('observed 53% is converted into screening equivalents, not viewers', () => {
        const result = calibrateAttendance(49896, 53, 35500);
        expect(result.occupiedEquivalent).toBeCloseTo(26444.88);
        expect(result.gap).toBeCloseTo(9055.12);
        expect(result.ratio).toBeCloseTo(1.342413);
    });
    test.each(['', null, undefined, NaN, Infinity, 'bad', -1, 101])('rejects invalid attendance %s', value => {
        expect(() => finiteNumber(value, 'Attendance', 0, 100)).toThrow();
    });
});

describe('lab campaign compares real agency audiences', () => {
    test('overlapping advertisers do not double-count demographic coverage', () => {
        const result = campaignCoverage(app.GAME_DATA.adAgents, ['B1RADIO', 'B1BLBRD'], ['YM', 'AM']);
        expect(result.selected).toHaveLength(2);
        expect(result.covered).toEqual(['AM', 'AF']);
        expect(result.missing).toEqual(['YM']);
        expect(result.spillover).toEqual(['AF']);
    });
    test('empty campaign leaves every desired audience uncovered', () => {
        expect(campaignCoverage(app.GAME_DATA.adAgents, [], ['YM', 'YF']).missing).toEqual(['YM', 'YF']);
    });
});

describe('lab genre element pairings', () => {
    test('excluded genres do not inflate cross-genre success counts', () => {
        const genres = ['ACTION', 'COMEDY', 'DRAMA'].map(id => ({ id, name: id, category: 'Genre' }));
        const cowboy = { id: 'PROTAGONIST_COWBOY', name: 'Cowboy', category: 'Protagonist' };
        const score = (genre, tag) => tag.id === cowboy.id && genre.id !== 'DRAMA' ? 5 : 1;
        const result = rankGenreElements([...genres, cowboy], 'ACTION', score, new Set(['COMEDY']));
        expect(result.genreCount).toBe(2);
        expect(result.rows[0].strongAcrossGenres).toBe(1);
        expect(result.rows[0].unsuccessfulAcrossGenres).toBe(1);
    });

    test('uses the production pair score, reports cross-genre counts and respects exclusions', async () => {
        await app.ensureCompatibilityLoaded();
        const scorePair = (genre, tag) => app.evaluate('HACCompatibilityEngine.getRawCompatibilityScore')(genre, tag, app.GAME_DATA);
        const allTags = Object.values(app.GAME_DATA.tags);
        const result = rankGenreElements(allTags, 'ACTION', scorePair, new Set(), 'Protagonist', 'genre', 'Cowboy');
        expect(result.genreCount).toBe(11);
        expect(result.rows).toHaveLength(1);
        expect(result.rows[0].tag.id).toBe('PROTAGONIST_COWBOY');
        expect(result.rows[0].score).toBe(5);
        expect(result.rows[0].strongAcrossGenres).toBe(3);
        expect(result.rows[0].unsuccessfulAcrossGenres).toBe(1);
        expect(result.genrePoolSize).toBe(114);
        expect(result.rows[0].strongPairs).toBe(49);
        expect(result.rows[0].unsuccessfulPairs).toBe(12);
        expect(result.successful).toBe(1);
        expect(result.unsuccessful).toBe(0);
        const withoutPartner = rankGenreElements(allTags, 'ACTION', scorePair,
            new Set(['FINALE_ANTAGONIST_GETS_KILLED']), 'Protagonist', 'pairs', 'Cowboy');
        expect(withoutPartner.genrePoolSize).toBe(113);
        expect(withoutPartner.rows[0].strongPairs).toBe(48);
        const excluded = rankGenreElements(allTags, 'ACTION', scorePair,
            new Set(['PROTAGONIST_COWBOY']), 'Protagonist', 'cross', 'Cowboy');
        expect(excluded.rows).toHaveLength(0);
        expect(excluded.successful).toBe(0);
    });
    test('within-genre ranking favors successful pairings while cross-genre ranking exposes broad usefulness', async () => {
        await app.ensureCompatibilityLoaded();
        const score = app.evaluate('HACCompatibilityEngine.getRawCompatibilityScore');
        const allTags = Object.values(app.GAME_DATA.tags);
        const pair = (a, b) => score(a, b, app.GAME_DATA);
        const within = rankGenreElements(allTags, 'COMEDY', pair);
        expect(within.rows.slice(0, 2).map(row => row.tag.id)).toEqual([
            'THEME_ALCOHOL_FREEDOM', 'SUPPORTINGCHARACTER_LOVE_INTEREST'
        ]);
        expect(within.rows[0].strongPairs).toBe(34);
        const cross = rankGenreElements(allTags, 'COMEDY', pair, new Set(), '', 'cross');
        expect(cross.rows[0].tag.id).toBe('SUPPORTINGCHARACTER_DAMSEL_IN_DISTRESS');
        expect(cross.rows[0].strongAcrossGenres).toBe(9);
        expect(cross.rows[0].score).toBe(3);
    });
});

describe('lab release journal and unlock facts', () => {
    test.each(['DATE:>=1929', 'DATE:>=01-01-1929'])
    ('the game starting-date condition %s identifies a starter element', condition => {
        expect(unlockInfo('TAG_ONLY_IN_EXTRACT', [], condition).kind).toBe('starter');
    });

    test('recipe ingredients come from the recovered recipe record', () => {
        const recipe = { sourceTagIds: ['PROTAGONIST_CLUMSY_OAF', 'THEME_AVENGING_LOVED_ONES'] };
        const info = unlockInfo('PROTAGONIST_TOXIC_VIGILANTE', [], 'RECIPE_TRASH:WRONG_SOURCE', recipe);
        expect(info.kind).toBe('trash-recipe');
        expect(info.requirements).toEqual(recipe.sourceTagIds);
    });

    test.each(['DATE:1950', 'DATE:>1950', 'DATE:<1929', 'DATE:>=01-01-3000'])
    ('uncertain game condition %s stays visibly uncertain', condition => {
        const info = unlockInfo('UNKNOWN_TAG', [], condition);
        expect(info.kind).toBe('unknown');
        expect(info.text).toMatch(/unclear/i);
    });

    test('includes the 500-day boundary and excludes older/future releases', () => {
        const reference = '1941-04-21';
        const dateAtAge = age => new Date(Date.parse(`${reference}T00:00:00Z`) - age * 86400000).toISOString().slice(0, 10);
        const releases = [0, 500, 501, -1].map(age => ({ date: dateAtAge(age), tags: ['DETECTIVE'] }));
        expect(recentElementUse(releases, reference).get('DETECTIVE')).toBe(2);
    });
    test('validates actual tag IDs before storing a release', () => {
        const ids = new Set(Object.keys(app.GAME_DATA.tags));
        expect(validateRelease({ title: '  Film  ', date: '1941-04-21', tags: ['DETECTIVE'] }, ids).title).toBe('Film');
        expect(() => validateRelease({ title: 'Film', date: '1941-04-21', tags: ['INVENTED'] }, ids)).toThrow('known element');
        expect(() => validateRelease({ title: 'Film', date: '1941-02-30', tags: ['DETECTIVE'] }, ids)).toThrow('valid release date');
    });
    test('starter availability is read from the real whitelist before recovered date gates', () => {
        expect(unlockInfo('WILD_WEST', app.GAME_DATA.starterWhitelist).kind).toBe('starter');
        expect(unlockInfo('HORROR', app.GAME_DATA.starterWhitelist, 'DATE:>=13-09-1935')).toEqual({
            kind: 'date', text: 'Unlocks on or after 1935-09-13.'
        });
    });
    test('parses year-only, recipe and Trash King policy unlock conditions', () => {
        expect(unlockInfo('SLAPSTICK_COMEDY', app.GAME_DATA.starterWhitelist, 'DATE:>=1950')).toEqual({
            kind: 'date', text: 'Unlocks in or after 1950.'
        });
        expect(unlockInfo('EVENTS_SURVIVAL_TOURNAMENT', app.GAME_DATA.starterWhitelist,
            'RECIPE_START:EVENTS_JOUSTING_TOURNAMENT:DYSTOPIAN_FUTURISTIC_CITY:THEME_STRUGGLE_FOR_BETTER_LIFE'))
            .toEqual({ kind: 'recipe', recipeType: 'RECIPE_START', text: 'Available through a starting recipe.',
                requirements: ['EVENTS_JOUSTING_TOURNAMENT', 'DYSTOPIAN_FUTURISTIC_CITY', 'THEME_STRUGGLE_FOR_BETTER_LIFE'] });
        expect(unlockInfo('PROTAGONIST_TOXIC_VIGILANTE', app.GAME_DATA.starterWhitelist,
            'RECIPE_TRASH:PROTAGONIST_CLUMSY_OAF:THEME_AVENGING_LOVED_ONES'))
            .toEqual({ kind: 'trash-recipe', recipeType: 'RECIPE_TRASH',
                text: 'Unlocked through the Trash King policy recipe.',
                requirements: ['PROTAGONIST_CLUMSY_OAF', 'THEME_AVENGING_LOVED_ONES'] });
    });
});
