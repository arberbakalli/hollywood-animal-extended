import { describe, test, expect } from '@jest/globals';
import { readFile } from 'node:fs/promises';
import { createContext, runInContext } from 'node:vm';

// Every file keyed by story element must use data/TagData.json's ids exactly:
// the same 250 ids, the same spelling. A file that drifts makes the owner's
// search for a real id come back empty (owner lesson 23, 2026-10-05). The age
// files are partial by nature and are guarded in tests/age-data-ids.test.js.
const json = async path => JSON.parse((await readFile(path, 'utf8')).replace(/^﻿/, ''));

async function reference() {
    const tagData = await json('data/TagData.json');
    const ids = Object.keys(tagData).sort();
    const genres = ids.filter(id => tagData[id].type === 0);
    return { ids, genres };
}

const difference = (actual, expected) => ({
    missing: expected.filter(id => !actual.includes(id)),
    unknown: actual.filter(id => !expected.includes(id)),
});
const NONE = { missing: [], unknown: [] };

describe('every full data file uses the game ids', () => {
    test('TagCompatibilityData rows and columns hold exactly the TagData ids', async () => {
        const { ids } = await reference();
        const compat = await json('data/TagCompatibilityData.json');
        expect(difference(Object.keys(compat), ids)).toEqual(NONE);
        const columns = [...new Set(Object.values(compat).flatMap(row => Object.keys(row)))];
        expect(difference(columns, ids)).toEqual(NONE);
    });

    test('TagsAudienceWeights holds exactly the TagData ids', async () => {
        const { ids } = await reference();
        expect(difference(Object.keys(await json('data/TagsAudienceWeights.json')), ids)).toEqual(NONE);
    });

    test('the game extract and the English names hold exactly the TagData ids', async () => {
        const { ids } = await reference();
        const extract = await json('extractedFilesFromGameSourceOfTruth/TagData.json');
        expect(difference(Object.keys(extract), ids)).toEqual(NONE);
        const english = (await json('localization/English.json')).IdMap;
        expect(ids.filter(id => !(id in english))).toEqual([]);
    });

    test('GenrePairs rows and columns hold exactly the eleven genres', async () => {
        const { genres } = await reference();
        expect(genres).toHaveLength(11);
        const pairs = await json('data/GenrePairs.json');
        expect(difference(Object.keys(pairs), genres)).toEqual(NONE);
        const columns = [...new Set(Object.values(pairs).flatMap(row => Object.keys(row)))];
        expect(difference(columns, genres)).toEqual(NONE);
    });

    test('every starterWhitelist id is a real game id', async () => {
        const { ids } = await reference();
        const context = createContext({});
        runInContext(`${await readFile('data.js', 'utf8')}\nthis.GAME_DATA = GAME_DATA;`, context);
        const whitelist = context.GAME_DATA.starterWhitelist;
        expect(whitelist.filter(id => !ids.includes(id))).toEqual([]);
        expect(new Set(whitelist).size).toBe(whitelist.length);
    });
});
