import { test, expect } from '@jest/globals';
import { readFile } from 'node:fs/promises';

// GAME_RULES section 11 (owner verified 2026-10-09) must list exactly the
// elements the game file marks TRASH: the file is the source, the doc a view.
test('GAME_RULES lists exactly the game file\'s trash elements', async () => {
    const extract = JSON.parse(await readFile('extractedFilesFromGameSourceOfTruth/TagData.json', 'utf8'));
    const inGame = Object.keys(extract)
        .filter(id => String(extract[id].parameters?.Rules || '').split(',').map(s => s.trim()).includes('TRASH'))
        .sort();
    const rules = await readFile('docs/GAME_RULES.md', 'utf8');
    const section = rules.slice(rules.indexOf('## 11. Trash elements'));
    const listed = [...new Set([...section.matchAll(/`((?:PROTAGONIST|ANTAGONIST|THEME|EVENTS)_[^`]+)`/g)].map(m => m[1]))].sort();
    expect(inGame).toHaveLength(15);
    expect(listed).toEqual(inGame);
});
