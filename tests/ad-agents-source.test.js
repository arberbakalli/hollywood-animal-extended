import { describe, test, expect, beforeAll } from '@jest/globals';
import { readFile } from 'node:fs/promises';
import { loadGameData } from './helpers/legacyHarness.js';

/**
 * GAME_DATA.adAgents (data.js) drives Recommended Advertisers, the Build for
 * Target audience filter and the script scoring engine. It is a hand-copied
 * subset of the game's own Configs/AdsAgents.json, and one row drifted: Vien
 * Pascal (ARTMAG) was scored against Teens, while the game lists Young and
 * Adult audiences for it -- the same ids as Spark (COMMAG). That changed its
 * score for most story elements.
 *
 * Every row is compared against the extracted game file.
 */

// How AdsAgents.json encodes audiences and score types. The audience table is
// the one the seven other advertisers in data.js already agree with exactly;
// scoreType 0/1/2 are the game's base/artistic/commercial tiers, the same
// encoding Configs/Holidays.json uses for its audience bonuses.
const AUDIENCE_BY_GAME_ID = { 0: 'TF', 1: 'TM', 2: 'YF', 3: 'YM', 4: 'AF', 5: 'AM' };
const SCORE_KIND_BY_GAME_TYPE = { 0: 'balanced', 1: 'artistic', 2: 'commercial' };

function decodeGameAgency(agency) {
    const audiences = (agency.audiences || []).filter(a => a.id in AUDIENCE_BY_GAME_ID && a.scoreType in SCORE_KIND_BY_GAME_TYPE);
    return {
        id: agency.id,
        quality: Number(agency.quality ?? 0),
        targets: [...new Set(audiences.map(a => AUDIENCE_BY_GAME_ID[a.id]))],
        scoreKinds: [...new Set(audiences.map(a => SCORE_KIND_BY_GAME_TYPE[a.scoreType]))],
    };
}

describe('advertisers in data.js match the game file', () => {
    let appAgents;
    let sourceById;

    beforeAll(async () => {
        appAgents = (await loadGameData()).adAgents;
        const raw = JSON.parse(await readFile('extractedFilesFromGameSourceOfTruth/AdsAgents.json', 'utf8'));
        sourceById = new Map(Object.entries(raw).map(([id, agency]) => {
            const decoded = decodeGameAgency({ id, ...agency });
            return [decoded.id, decoded];
        }));
    });

    // data.js: type 0 = no lean, 1 = artistic, 2 = commercial. An agency whose
    // audiences mix artistic and commercial scoring has no single lean.
    const leanOf = (source) => {
        if (source.scoreKinds.length !== 1) return 0;
        return { balanced: 0, artistic: 1, commercial: 2 }[source.scoreKinds[0]];
    };

    test('every app advertiser exists in the game file', () => {
        expect(appAgents.length).toBeGreaterThan(0);
        appAgents.forEach(agent => expect(sourceById.has(agent.id)).toBe(true));
    });

    test('each advertiser targets exactly the audiences the game lists', () => {
        const mismatches = appAgents
            .filter(agent => [...agent.targets].sort().join() !== [...sourceById.get(agent.id).targets].sort().join())
            .map(agent => `${agent.id}: app ${[...agent.targets].sort()} vs game ${[...sourceById.get(agent.id).targets].sort()}`);
        expect(mismatches).toEqual([]);
    });

    test('each advertiser has the lean the game gives its audiences', () => {
        appAgents.forEach(agent => expect([agent.id, agent.type]).toEqual([agent.id, leanOf(sourceById.get(agent.id))]));
    });

    test('each advertiser level is the game quality plus one', () => {
        appAgents.forEach(agent => expect([agent.id, agent.level]).toEqual([agent.id, sourceById.get(agent.id).quality + 1]));
    });
});
