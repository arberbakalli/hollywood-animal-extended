import { describe, test, expect, beforeAll } from '@jest/globals';
import { readFile } from 'node:fs/promises';

/**
 * Pollux picks name people, not "talent #id" (owner, 2026-10-06). Every label
 * comes from one template; the film and the people come from the save that was
 * loaded. A save stores each person as firstNameId / lastNameId (or a
 * customName); data/CharacterNames.json is the game's own name list, every entry
 * (StreamingAssets/Data/Localization/ENG/CHARACTER_NAMES.json).
 */
let P;
let names;

beforeAll(async () => {
    await import('../src/pollux/polluxSaveEditor.js');
    P = globalThis.HACPolluxSaveEditor;
    names = JSON.parse(await readFile('data/CharacterNames.json', 'utf8'));
});

const PLAYER = 411;

function saveWith(characters) {
    return {
        timePassed: '4800.00:00:00',
        movies: [{ id: PLAYER, name: 'SHOOTING FOR THE STARS', polluxes: [], nominations: [] }],
        competitorMovies: [],
        characters,
        prevYearsPolluxPretenders: {
            BEST_SCRIPT: [{ category: 0, profession: 1, talentIds: [20], movieId: PLAYER, roleTagId: null, entityId: -1, forceWinning: false }],
        },
        thisYearsPolluxPretenders: {},
        polluxHistory: {},
    };
}

const scriptCandidate = (state, table) =>
    P.describeBuckets(state, table)[0].categories.find(c => c.category === 'BEST_SCRIPT').playerCandidates[0];

describe('the game name list', () => {
    test('holds all 1,141 names with the game ids', () => {
        expect(Object.keys(names)).toHaveLength(1141);
        expect([names['0'], names['124'], names['400'], names['592']]).toEqual(['John', 'Dennis', 'Smith', 'Lawson']);
    });
});

describe('one label template, values from the save', () => {
    test('fills each named slot, whatever the order in the template', () => {
        expect(P.formatLabel('{film} ({who}){marks}', { film: 'A', who: 'B', marks: ' - C' })).toBe('A (B) - C');
        expect(P.formatLabel('{who} in {film}', { film: 'A', who: 'B' })).toBe('B in A');
        expect(P.OPTION_TEMPLATE).toBe('{film} ({who}){marks}');
    });

    test('a person is named by customName first, then by the name ids', () => {
        const state = saveWith([
            { id: 20, firstNameId: '124', lastNameId: '592', customName: null },
            { id: 21, firstNameId: '124', lastNameId: '592', customName: 'Bricky' },
        ]);
        expect(P.talentName(state, 20, names)).toBe('Dennis Lawson');
        expect(P.talentName(state, 21, names)).toBe('Bricky');
        expect(P.talentName(state, 99, names)).toBeNull();
        expect(P.talentName(saveWith([{ id: 20, firstNameId: '5000', lastNameId: '592' }]), 20, names)).toBeNull();
    });

    test('two saves with the same talent id name different people', () => {
        const first = scriptCandidate(saveWith([{ id: 20, firstNameId: '124', lastNameId: '592' }]), names);
        const second = scriptCandidate(saveWith([{ id: 20, firstNameId: '0', lastNameId: '400' }]), names);
        expect(first.people).toEqual(['Dennis Lawson']);
        expect(second.people).toEqual(['John Smith']);
    });

    test('without the name list or the name ids, a person stays "talent #id"', () => {
        expect(scriptCandidate(saveWith([{ id: 20, firstNameId: '124', lastNameId: '592' }]), null).people).toEqual(['talent #20']);
        expect(scriptCandidate(saveWith([]), names).people).toEqual(['talent #20']);
    });
});
