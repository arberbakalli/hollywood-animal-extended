import { beforeAll, describe, expect, test } from '@jest/globals';
import { loadLegacyScript } from './helpers/legacyHarness.js';
import { releaseCurve, calibrateAttendance, campaignCoverage, uniqueScripts, recentElementUse,
    validateRelease, unlockInfo, finiteNumber } from '../lab/labModel.js';

let app;
beforeAll(async () => { app = await loadLegacyScript(); });

describe('lab release calibration uses the production curve', () => {
    test.each([[0, 35500], [11, 39405], [39, 49345], [100, 71000]])('Factory %s%% changes opening week only', (boost, expected) => {
        const demand = app.evaluate('HACDistributionPlanner.weeklyDemandFor');
        const curve = releaseCurve(demand, 7.1, { behemoth: true, openingMultiplier: 2 }, boost);
        expect(curve[0].baseline).toBe(35500);
        expect(curve[0].scenario).toBe(expected);
        expect(curve.slice(1).every(row => row.scenario === row.baseline)).toBe(true);
        expect(curve).toHaveLength(8);
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

describe('lab candidate inspector', () => {
    test('removes reordered tag sets and retains a distinct combination without mutating input', () => {
        const candidates = [['DETECTIVE', 'PROTAGONIST_COP'], ['PROTAGONIST_COP', 'DETECTIVE'], ['DRAMA', 'PROTAGONIST_COP']];
        const before = JSON.stringify(candidates);
        expect(uniqueScripts(candidates)).toEqual({ scripts: [candidates[0], candidates[2]], removed: 1 });
        expect(JSON.stringify(candidates)).toBe(before);
    });
    test.each([{}, [['DETECTIVE', 'DETECTIVE']], [[]], [[{}]]])('rejects invalid candidates %j', candidates => {
        expect(() => uniqueScripts(candidates)).toThrow();
    });
});

describe('lab release journal and unlock facts', () => {
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
    test('starter availability is read from the real whitelist', () => {
        expect(unlockInfo('WILD_WEST', app.GAME_DATA.starterWhitelist).kind).toBe('starter');
        expect(unlockInfo('HORROR', app.GAME_DATA.starterWhitelist).kind).toBe('unknown');
    });
});
