import { describe, test, expect } from '@jest/globals';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

// GAME_RULES "Names: one name per thing" (owner ruling 2026-10-09): the screen
// name is the one name. This keeps the glossary true to index.html and keeps
// retired names out of code, tests, scenarios and docs.
const decode = text => text.replace(/&amp;/g, '&').replace(/&rarr;/g, '->').replace(/\s+/g, ' ');

async function files(dir) {
    const found = [];
    for (const entry of await readdir(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name).replace(/\\/g, '/');
        if (entry.isDirectory()) {
            if (!['node_modules', 'audits', 'parked', 'screenshots'].includes(entry.name)) found.push(...await files(path));
        } else if (/\.(js|mjs|md|feature|html)$/.test(entry.name)) {
            found.push(path);
        }
    }
    return found;
}

describe('one name per thing', () => {
    test('every screen name in the GAME_RULES glossary appears in index.html', async () => {
        const rules = await readFile('docs/GAME_RULES.md', 'utf8');
        const section = rules.slice(rules.indexOf('## Names: one name per thing'), rules.indexOf('## 1. What a script is'));
        const names = [...section.matchAll(/^\| ([^|]+?) \| [^|]+ \| [^|]+ \|\s*$/gm)]
            .map(match => match[1].trim())
            .filter(name => name !== 'Screen name' && !/^-+$/.test(name));
        expect(names.length).toBeGreaterThan(15);
        const html = decode(await readFile('index.html', 'utf8'));
        expect(names.filter(name => !html.includes(name))).toEqual([]);
    });

    test('retired names do not come back, except in a line that says "formerly"', async () => {
        const RETIRED = ['Submit Script', 'Build Your Script', 'Lock Elements (Optional)', 'Market tab', 'Targeted Ads', 'Marketing Analyze'];
        const offenders = [];
        const paths = [...await files('src'), ...await files('tests'), ...await files('docs'), ...await files('lab'),
            'index.html', 'testing-features.html'];
        for (const path of paths) {
            if (path.endsWith('tests/ui-names.test.js')) continue;
            const lines = (await readFile(path, 'utf8')).split(/\r?\n/);
            lines.forEach((line, index) => {
                if (/formerly|Retired names/i.test(line) || line.includes('(Optional), Market tab')) return;
                RETIRED.filter(name => line.includes(name)).forEach(name => offenders.push(`${path}:${index + 1} ${name}`));
            });
        }
        expect(offenders).toEqual([]);
    });
});
