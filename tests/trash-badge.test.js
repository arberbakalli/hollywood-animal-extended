import { describe, test, expect, beforeAll } from '@jest/globals';
import { readFile } from 'node:fs/promises';
import { loadLegacyScript } from './helpers/legacyHarness.js';

// GAME_RULES section 11 (owner verified 2026-10-09): the game file's TRASH rule
// is the one source. The app copies that field verbatim and the label reads it.
const rulesOf = tag => String(tag?.parameters?.Rules ?? tag?.rules ?? '');
const isTrashRule = rules => rules.split(',').map(part => part.trim()).includes('TRASH');

describe('trash elements: data and label', () => {
    let h;
    let extract;
    beforeAll(async () => {
        h = await loadLegacyScript();
        extract = JSON.parse(await readFile('extractedFilesFromGameSourceOfTruth/TagData.json', 'utf8'));
    });

    test('the app data carries the game file rules for exactly the trash elements', async () => {
        const app = JSON.parse(await readFile('data/TagData.json', 'utf8'));
        const inGame = Object.keys(extract).filter(id => isTrashRule(rulesOf(extract[id]))).sort();
        const inApp = Object.keys(app).filter(id => isTrashRule(rulesOf(app[id]))).sort();
        expect(inGame).toHaveLength(15);
        expect(inApp).toEqual(inGame);
        inApp.forEach(id => expect(app[id].rules).toBe(extract[id].parameters.Rules));
    });

    test('GAME_DATA marks the same fifteen, and nothing else', () => {
        const marked = h.evaluate('Object.values(GAME_DATA.tags).filter(tag => tag.trash).map(tag => tag.id).sort()');
        const inGame = Object.keys(extract).filter(id => isTrashRule(rulesOf(extract[id]))).sort();
        expect(marked).toEqual(inGame);
    });

    test.each([
        ['THEME_WAR_WITH_SORCERERS', true], ['ANTAGONIST_TOASTER_KILLER', true], ['PROTAGONIST_TOXIC_VIGILANTE', true],
        ['THEME_TREASURE_HUNT', false], ['PROTAGONIST_COWBOY', false], ['ACTION', false], ['NOT_A_TAG', false], ['', false],
    ])('isTrash(%s) is %s', (id, expected) => {
        expect(h.call('HACTrashElements.isTrash', id)).toBe(expected);
    });

    test('the label says "Trash element", is not a button, and is empty for other elements', () => {
        const html = h.call('HACTrashElements.badgeHtml', 'THEME_WAR_WITH_SORCERERS');
        expect(html).toContain('Trash element');
        expect(html).toContain('data-tag-id="THEME_WAR_WITH_SORCERERS"');
        expect(html).not.toMatch(/<button/);
        expect(h.call('HACTrashElements.badgeHtml', 'THEME_TREASURE_HUNT')).toBe('');
    });
});
