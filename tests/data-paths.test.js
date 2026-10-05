import { describe, test, expect } from '@jest/globals';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

// Windows and the local static server ignore case; GitHub Pages does not. A data
// path whose case differs from the file loads locally and 404s in production,
// so compare every literal 'data/*.json' path with the real file names.
const ROOT = process.cwd();
const DATA_PATH = /['"`](data\/[^'"`]+\.json)['"`]/g;

async function sourceFiles() {
    const files = ['script.js', 'data.js'];
    async function collect(dir) {
        for (const entry of await readdir(join(ROOT, dir), { withFileTypes: true })) {
            const path = `${dir}/${entry.name}`;
            if (entry.isDirectory()) await collect(path);
            else if (entry.name.endsWith('.js')) files.push(path);
        }
    }
    await collect('src');
    return files;
}

describe('data file paths', () => {
    test('every data/*.json path in the app names a file with exactly that case', async () => {
        const actual = new Set((await readdir(join(ROOT, 'data'))).map(name => `data/${name}`));
        const referenced = [];
        for (const file of await sourceFiles()) {
            const source = await readFile(join(ROOT, file), 'utf8');
            for (const [, path] of source.matchAll(DATA_PATH)) referenced.push({ file, path });
        }
        expect(referenced.length).toBeGreaterThan(0);
        expect(referenced.filter(({ path }) => !actual.has(path))).toEqual([]);
    });
});
