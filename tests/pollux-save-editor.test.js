import { describe, test, expect, beforeAll } from '@jest/globals';
import { readFile } from 'node:fs/promises';
import { createContext, runInContext } from 'node:vm';
import { join } from 'node:path';

// Shapes copied from real saves (game version 0.8.72EA, 2026-10-05):
// candidates are { category, profession, talentIds, movieId, roleTagId, entityId, forceWinning },
// polluxHistory is keyed by ceremony year with winners by category name, nominees as
// { Key, Value } lists, and movies record wins in polluxes and losses in nominations
// as { year, movId, category } with the numeric category code.
const CODE = { BEST_SCRIPT: 0, BEST_DIRECTING: 1, BEST_MALE_ROLE: 2, BEST_FEMALE_ROLE: 3, BEST_CINEMATOGRAPHY: 4, BEST_MOVIE: 5 };
const PROFESSION = { BEST_SCRIPT: 5, BEST_DIRECTING: 3, BEST_MALE_ROLE: 1, BEST_FEMALE_ROLE: 1, BEST_CINEMATOGRAPHY: 2, BEST_MOVIE: 4 };
const PLAYER_A = 411, PLAYER_B = 428, RIVAL = 900;

function candidate(category, movieId, talentId) {
    return {
        category: CODE[category], profession: PROFESSION[category], talentIds: [talentId], movieId,
        roleTagId: category.endsWith('_ROLE') ? 'PROTAGONIST_FARM_GIRL' : null, entityId: -1, forceWinning: false
    };
}

function bucket() {
    const out = {};
    Object.keys(CODE).forEach((category, i) => {
        out[category] = [candidate(category, RIVAL, 10 + i), candidate(category, PLAYER_A, 20 + i)];
    });
    out.BEST_FEMALE_ROLE = [candidate('BEST_FEMALE_ROLE', RIVAL, 30), candidate('BEST_FEMALE_ROLE', PLAYER_B, 31)];
    return out;
}

function history(years) {
    return Object.fromEntries(years.map(year => [year, { winners: {}, nominees: {}, moodShifts: {}, PolluxVisitStatus: 2 }]));
}

// 15 Jan 1942: the March 1942 ceremony has not run, history stops at 1941.
function saveBeforeCeremony() {
    return {
        currentMeta: { lastSaveVersion: '0.8.72EA' },
        stateJson: {
            timePassed: '4762.00:00:00',
            movies: [{ id: PLAYER_A, name: 'SHOOTING FOR THE STARS', polluxes: [], nominations: [] },
                { id: PLAYER_B, Name: 'FARM GIRL', polluxes: [], nominations: [] }],
            competitorMovies: [{ id: RIVAL, name: 'RIVAL PICTURE', polluxes: [], nominations: [] }],
            prevYearsPolluxPretenders: bucket(),
            thisYearsPolluxPretenders: { BEST_SCRIPT: [candidate('BEST_SCRIPT', RIVAL, 99)] },
            polluxHistory: history([1940, 1941])
        },
        isEmptyData: false
    };
}

// 15 Apr 1942: the rival won every 1942 award; the player's films were the losing nominees.
function saveAfterCeremony() {
    const save = saveBeforeCeremony();
    const state = save.stateJson;
    state.timePassed = '4852.00:00:00';
    state.characters = [];
    const record = { winners: {}, nominees: {}, moodShifts: {}, PolluxVisitStatus: 2 };
    Object.entries(state.prevYearsPolluxPretenders).forEach(([category, list]) => {
        record.winners[category] = { ...list[0] };
        record.nominees[category] = list.map((value, i) => ({ Key: `${10 + i}.000`, Value: { ...value } }));
        const rival = state.competitorMovies[0];
        rival.polluxes.push({ year: 1942, movId: RIVAL, category: CODE[category] });
        const player = state.movies.find(m => m.id === list[1].movieId);
        player.nominations.push({ year: 1942, movId: player.id, category: CODE[category] });
        // Real saves also credit the winning talent: characters[].polluxes, no nominations.
        list.forEach(entry => entry.talentIds.forEach(id => {
            if (!state.characters.some(c => c.id === id)) state.characters.push({ id, polluxes: [], nominations: [] });
        }));
        list[0].talentIds.forEach(id => state.characters.find(c => c.id === id)
            .polluxes.push({ year: 1942, movId: RIVAL, category: CODE[category] }));
    });
    state.polluxHistory[1942] = record;
    return save;
}

const awardHolders = (people, year, code) => people
    .filter(p => (p.polluxes || []).some(a => a.year === year && a.category === code)).map(p => p.id);

let P;
beforeAll(async () => {
    const context = createContext({ JSON, Date, Number, Map, Set, String, Object, Array, Error, Math, parseInt });
    runInContext(await readFile(join(process.cwd(), 'lab/polluxSaveEditor.js'), 'utf8'), context);
    P = context.HACPolluxSaveEditor;
});

const text = (save, bom) => (bom ? '﻿' : '') + JSON.stringify(save);
const prev = parsed => P.describeBuckets(parsed.state).find(b => b.key === 'prevYearsPolluxPretenders');

describe('parseSave', () => {
    test('strips a BOM and remembers it, so the download keeps it', () => {
        const parsed = P.parseSave(text(saveBeforeCeremony(), true));
        expect(parsed.hadBom).toBe(true);
        expect(P.serializeSave(parsed.root, parsed.hadBom).charCodeAt(0)).toBe(0xFEFF);
    });

    test('adds no BOM when the original had none', () => {
        const parsed = P.parseSave(text(saveBeforeCeremony(), false));
        expect(parsed.hadBom).toBe(false);
        expect(P.serializeSave(parsed.root, parsed.hadBom).charCodeAt(0)).toBe('{'.charCodeAt(0));
    });

    test.each([
        ['', 'empty'],
        ['{not json', 'not valid JSON'],
        ['{"stateJson":{}}', 'stateJson.movies is missing'],
        ['{"stateJson":{"movies":[]}}', 'no Pollux nominee data'],
    ])('rejects %p with a friendly message', (input, message) => {
        expect(() => P.parseSave(input)).toThrow(message);
    });
});

describe('before the ceremony', () => {
    test('the prev bucket is the coming ceremony of the game year, not yet held', () => {
        const parsed = P.parseSave(text(saveBeforeCeremony()));
        expect(P.gameYear(parsed.state)).toBe(1942);
        expect(prev(parsed)).toMatchObject({ ceremonyYear: 1942, held: false });
        expect(P.describeBuckets(parsed.state).find(b => b.key === 'thisYearsPolluxPretenders').ceremonyYear).toBe(1943);
    });

    test('lists only player films as picks, including Best Female Role', () => {
        const parsed = P.parseSave(text(saveBeforeCeremony()));
        const categories = prev(parsed).categories;
        expect(categories.map(c => c.category)).toEqual(P.CATEGORIES);
        categories.forEach(c => expect(c.playerCandidates.every(p => p.owned)).toBe(true));
        const female = categories.find(c => c.category === 'BEST_FEMALE_ROLE');
        expect(female.playerCandidates).toHaveLength(1);
        expect(female.playerCandidates[0]).toMatchObject({ movieId: PLAYER_B, title: 'FARM GIRL' });
        expect(P.defaultPicks(prev(parsed)).BEST_FEMALE_ROLE).toBe(1);
    });

    test('forces only the picks and writes no history for a ceremony that has not run', () => {
        const parsed = P.parseSave(text(saveBeforeCeremony()));
        const summary = P.applyWinners(parsed.state, 'prevYearsPolluxPretenders', P.defaultPicks(prev(parsed)));
        expect(summary).toMatchObject({ ceremonyYear: 1942, held: false, forced: 6, historyUpdated: false });
        Object.values(parsed.state.prevYearsPolluxPretenders).forEach(list => {
            expect(list.map(c => c.forceWinning)).toEqual([false, true]);
        });
        expect(parsed.state.polluxHistory[1942]).toBeUndefined();
        expect(parsed.state.movies.every(m => m.polluxes.length === 0)).toBe(true);
    });

    test('forceAllOwned forces every player candidate in a picked category and no rival', () => {
        const save = saveBeforeCeremony();
        save.stateJson.prevYearsPolluxPretenders.BEST_SCRIPT.push(candidate('BEST_SCRIPT', PLAYER_B, 77));
        const parsed = P.parseSave(text(save));
        P.applyWinners(parsed.state, 'prevYearsPolluxPretenders', { BEST_SCRIPT: 1 }, { forceAllOwned: true });
        expect(parsed.state.prevYearsPolluxPretenders.BEST_SCRIPT.map(c => c.forceWinning)).toEqual([false, true, true]);
        expect(parsed.state.prevYearsPolluxPretenders.BEST_MOVIE.every(c => !c.forceWinning)).toBe(true);
    });

    // Real 1940 save: with every player candidate forced, the game chose among them by
    // nominee Key, not the player's pick. Forcing only the pick is what honours it.
    test('by default forces the pick alone, even with a second player candidate', () => {
        const save = saveBeforeCeremony();
        save.stateJson.prevYearsPolluxPretenders.BEST_SCRIPT.push(candidate('BEST_SCRIPT', PLAYER_B, 77));
        const parsed = P.parseSave(text(save));
        P.applyWinners(parsed.state, 'prevYearsPolluxPretenders', { BEST_SCRIPT: 2 });
        expect(parsed.state.prevYearsPolluxPretenders.BEST_SCRIPT.map(c => c.forceWinning)).toEqual([false, false, true]);
    });

    // Real saves of 15 Jan 1940 and 15 Jan 1942: the prev bucket held 130 and 105 rival
    // candidates and none of the player's; by 15 Apr it held 17 and 16. Player films join
    // the list when nominations are announced, so an early save has nothing to pick.
    test('a save from before nominations offers no picks and forces nothing', () => {
        const save = saveBeforeCeremony();
        Object.values(save.stateJson.prevYearsPolluxPretenders).forEach(list => list.splice(1));
        const parsed = P.parseSave(text(save));
        const b = prev(parsed);
        expect(b.categories.every(c => c.playerCandidates.length === 0)).toBe(true);
        expect(P.defaultPicks(b)).toEqual({});
        const before = JSON.stringify(parsed.root);
        expect(P.applyWinners(parsed.state, b.key, P.defaultPicks(b))).toMatchObject({ forced: 0, winners: [] });
        expect(JSON.stringify(parsed.root)).toBe(before);
    });

    test('refuses a rival film as a pick', () => {
        const parsed = P.parseSave(text(saveBeforeCeremony()));
        expect(() => P.applyWinners(parsed.state, 'prevYearsPolluxPretenders', { BEST_MOVIE: 0 })).toThrow('not one of your films');
    });
});

describe('after the ceremony', () => {
    test('detects the held ceremony and marks recorded nominees and the current winner', () => {
        const parsed = P.parseSave(text(saveAfterCeremony()));
        const b = prev(parsed);
        expect(b).toMatchObject({ ceremonyYear: 1942, held: true });
        const script = b.categories.find(c => c.category === 'BEST_SCRIPT');
        expect(script.candidates[0]).toMatchObject({ currentWinner: true, owned: false });
        expect(script.playerCandidates[0]).toMatchObject({ recordedNominee: true, currentWinner: false });
    });

    test('moves every award to the player and keeps history and movies consistent in the compact download', () => {
        const parsed = P.parseSave(text(saveAfterCeremony(), true));
        const summary = P.applyWinners(parsed.state, 'prevYearsPolluxPretenders', P.defaultPicks(prev(parsed)));
        expect(summary).toMatchObject({ held: true, historyUpdated: true });

        const output = P.serializeSave(parsed.root, parsed.hadBom);
        expect(output).not.toMatch(/\n/);
        const state = JSON.parse(output.slice(1)).stateJson;
        const record = state.polluxHistory[1942];
        const movies = [...state.movies, ...state.competitorMovies];

        Object.entries(CODE).forEach(([category, code]) => {
            const winner = record.winners[category];
            expect(state.movies.map(m => m.id)).toContain(winner.movieId);
            expect(winner.forceWinning).toBe(true);
            const holders = movies.filter(m => m.polluxes.some(p => p.year === 1942 && p.category === code));
            expect(holders.map(m => m.id)).toEqual([winner.movieId]);
            const winnerMovie = movies.find(m => m.id === winner.movieId);
            expect(winnerMovie.nominations.some(n => n.year === 1942 && n.category === code)).toBe(false);
        });
        Object.entries(CODE).forEach(([category, code]) => {
            expect(awardHolders(state.characters, 1942, code)).toEqual(record.winners[category].talentIds);
        });
        const rival = state.competitorMovies[0];
        expect(rival.polluxes).toEqual([]);
        expect(rival.nominations).toHaveLength(6);
        expect(state.prevYearsPolluxPretenders.BEST_SCRIPT[1].forceWinning).toBe(true);
    });

    // Real 15 Apr 1942 save: the player already held four awards, and the first default
    // moved them to another player film. An award the player holds stays where it is.
    test('the default keeps an award a player film already won', () => {
        const save = saveAfterCeremony();
        const state = save.stateJson;
        const second = candidate('BEST_SCRIPT', PLAYER_B, 55);
        state.prevYearsPolluxPretenders.BEST_SCRIPT.push(second);
        state.polluxHistory[1942].nominees.BEST_SCRIPT.push({ Key: '9.000', Value: { ...second } });
        state.polluxHistory[1942].winners.BEST_SCRIPT = { ...second };
        const parsed = P.parseSave(text(save));
        expect(P.defaultPicks(prev(parsed)).BEST_SCRIPT).toBe(2);
    });

    test('a player film replacing another player film moves the award and the talent credit', () => {
        const save = saveAfterCeremony();
        const state = save.stateJson;
        const second = candidate('BEST_SCRIPT', PLAYER_B, 55);
        state.prevYearsPolluxPretenders.BEST_SCRIPT.push(second);
        state.polluxHistory[1942].nominees.BEST_SCRIPT.push({ Key: '9.000', Value: { ...second } });
        state.polluxHistory[1942].winners.BEST_SCRIPT = { ...second };
        state.characters.push({ id: 55, polluxes: [{ year: 1942, movId: PLAYER_B, category: 0 }], nominations: [] });
        state.competitorMovies[0].polluxes = state.competitorMovies[0].polluxes.filter(a => a.category !== 0);
        state.characters.find(c => c.id === 10).polluxes = [];
        state.movies.find(m => m.id === PLAYER_B).polluxes.push({ year: 1942, movId: PLAYER_B, category: 0 });
        const parsed = P.parseSave(text(save));
        P.applyWinners(parsed.state, 'prevYearsPolluxPretenders', { BEST_SCRIPT: 1 });
        const movies = [...parsed.state.movies, ...parsed.state.competitorMovies];
        expect(awardHolders(movies, 1942, 0)).toEqual([PLAYER_A]);
        expect(awardHolders(parsed.state.characters, 1942, 0)).toEqual([20]);
        expect(parsed.state.movies.find(m => m.id === PLAYER_B).nominations.some(n => n.year === 1942 && n.category === 0)).toBe(true);
    });

    test('refuses a pick that was not one of the recorded nominees', () => {
        const save = saveAfterCeremony();
        const outsider = candidate('BEST_MOVIE', PLAYER_B, 66);
        save.stateJson.prevYearsPolluxPretenders.BEST_MOVIE.push(outsider);
        const parsed = P.parseSave(text(save));
        expect(() => P.applyWinners(parsed.state, 'prevYearsPolluxPretenders', { BEST_MOVIE: 2 })).toThrow('not one of the three nominees');
    });

    test('running the fix twice changes nothing more', () => {
        const parsed = P.parseSave(text(saveAfterCeremony()));
        const picks = P.defaultPicks(prev(parsed));
        P.applyWinners(parsed.state, 'prevYearsPolluxPretenders', picks);
        const once = JSON.stringify(parsed.root);
        P.applyWinners(parsed.state, 'prevYearsPolluxPretenders', picks);
        expect(JSON.stringify(parsed.root)).toBe(once);
    });

    test('without timePassed the prev bucket still maps to the ceremony its winners recorded', () => {
        const save = saveAfterCeremony();
        delete save.stateJson.timePassed;
        const parsed = P.parseSave(text(save));
        expect(prev(parsed)).toMatchObject({ ceremonyYear: 1942, held: true });
    });
});

test('names the download after the original file', () => {
    expect(P.fixedFileName('Autosave 15 01 1942 - STUDIO.json')).toBe('Autosave 15 01 1942 - STUDIO.pollux-fixed.json');
});
