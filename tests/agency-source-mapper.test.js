import { describe, expect, test } from '@jest/globals';
import { readFile } from 'node:fs/promises';

import '../src/marketing/agencySourceMapper.js';

const {
    AUDIENCE_ID_BY_GAME_ID,
    SCORE_KIND_BY_GAME_SCORE_TYPE,
    normalizeGameAdAgencies,
    normalizeGameAdAgency,
    normalizeGameAudienceTarget,
} = globalThis.HACAgencySourceMapper;

const loadRawAgencies = async () =>
    JSON.parse(await readFile('extractedFilesFromGameSourceOfTruth/AdsAgents.json', 'utf8'));

describe('game agency source mapper', () => {
    test('documents the game audience id mapping used by AdsAgents.json', () => {
        expect(AUDIENCE_ID_BY_GAME_ID).toEqual({
            0: 'TF',
            1: 'TM',
            2: 'YF',
            3: 'YM',
            4: 'AF',
            5: 'AM',
        });
    });

    test('documents scoreType as balanced, artistic, and commercial', () => {
        expect(SCORE_KIND_BY_GAME_SCORE_TYPE).toEqual({
            0: 'balanced',
            1: 'artistic',
            2: 'commercial',
        });
    });

    test('normalizes one game audience target into app labels without losing source ids', () => {
        expect(normalizeGameAudienceTarget({ id: 5, scoreType: 2 })).toEqual({
            audienceId: 'AM',
            scoreKind: 'commercial',
            sourceAudienceId: 5,
            sourceScoreType: 2,
        });
    });

    test('drops unknown source values instead of inventing an audience or score kind', () => {
        expect(normalizeGameAudienceTarget({ id: 99, scoreType: 2 })).toBeNull();
        expect(normalizeGameAudienceTarget({ id: 5, scoreType: 99 })).toBeNull();
    });

    test('normalizes an agency into matrix-ready target rows', () => {
        const agency = normalizeGameAdAgency('MCA1', {
            id: 'MCA1',
            quality: 1,
            budgetFactor: '1.500',
            isVisibleFromStart: true,
            releasePatternInfo: { id: 'RADIO_MAGAZINE_1' },
            audiences: [
                { id: 1, scoreType: 2 },
                { id: 3, scoreType: 2 },
                { id: 5, scoreType: 2 },
                { id: 1, scoreType: 1 },
            ],
        });

        expect(agency).toMatchObject({
            id: 'MCA1',
            sourceId: 'MCA1',
            quality: 1,
            budgetFactor: 1.5,
            isVisibleFromStart: true,
            releasePatternId: 'RADIO_MAGAZINE_1',
            targets: ['TM', 'YM', 'AM'],
            scoreKinds: ['commercial', 'artistic'],
        });
        expect(agency.audienceTargets).toHaveLength(4);
    });

    test('normalizes the full extracted roster without dropping known game agencies', async () => {
        const raw = await loadRawAgencies();
        const agencies = normalizeGameAdAgencies(raw);

        expect(agencies).toHaveLength(80);
        expect(agencies.every(agency => agency.audienceTargets.length > 0)).toBe(true);
        expect(agencies.find(agency => agency.id === 'TYC1')).toMatchObject({
            targets: ['TM', 'TF', 'YM', 'YF'],
            scoreKinds: ['commercial'],
        });
    });
});
