import { describe, test, expect, beforeAll } from '@jest/globals';
import { readFile } from 'node:fs/promises';
import { loadInstrumentedApp } from './helpers/legacyHarness.js';

/**
 * The six audiences are named as the game names them (owner ruling
 * 2026-09-29): the "Audience analytics" strings in localization/English.json.
 * Teen is Girls/Boys, young is Young women/Young men, adult is Women/Men.
 */
const GAME_NAMES = { TF: 'Girls', TM: 'Boys', YF: 'Young women', YM: 'Young men', AF: 'Women', AM: 'Men' };

describe('audience names follow the game files', () => {
    let h;

    beforeAll(async () => {
        h = await loadInstrumentedApp();
    });

    test('the game lists the six audiences in this order and spelling', async () => {
        const english = await readFile('localization/English.json', 'utf8');
        const block = Object.values(GAME_NAMES).map(name => `"${name}",`).join('\\s*');

        expect(english).toMatch(new RegExp(`${block}\\s*"Audience analytics"`));
    });

    test('GAME_DATA.demographics carries the game names', () => {
        const names = h.evaluate(`Object.fromEntries(
            Object.entries(GAME_DATA.demographics).map(([code, demo]) => [code, demo.name]))`);

        expect(names).toEqual(GAME_NAMES);
    });

    test('Build for Target names its best audiences as the game does', () => {
        const reasoning = h.call(
            'HACTargetedAds.generateTargetingReasoning',
            [{ weights: { TF: 1, TM: 2, YF: 5, YM: 4, AF: 0, AM: 3 } }],
            [{ agency: { name: 'Agency' }, score: 1 }],
            []
        );

        expect(reasoning).toContain('Best audience fit: Young women (5.0), Young men (4.0), Men (3.0)');
    });

    test('Analyze Script advertiser reasoning names audiences as the game does', () => {
        expect(h.call('HACAdvertiserMatcher.generateReasoning', { targets: ['TM', 'TF'] }, 3.4))
            .toBe('Strong appeal across Boys, Girls.');
    });
});
