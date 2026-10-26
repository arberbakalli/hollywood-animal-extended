import { test, expect } from '@jest/globals';
import { readFile } from 'node:fs/promises';
import { TOTAL_ELEMENTS, STARTING_DECK_SIZE, STARTING_BAN_COUNT } from './fixtures/startingDeck.js';

// GAME_RULES states the starting deck once; it must match the tests' one count.
test('GAME_RULES states the same starting deck as the tests', async () => {
    const rules = await readFile('docs/GAME_RULES.md', 'utf8');
    const match = rules.match(/\*\*Starting deck: (\d+) of (\d+) elements, so (\d+) bans\.\*\*/);
    expect(match).not.toBeNull();
    expect(match.slice(1).map(Number)).toEqual([STARTING_DECK_SIZE, TOTAL_ELEMENTS, STARTING_BAN_COUNT]);
});
