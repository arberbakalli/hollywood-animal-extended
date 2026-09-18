import { describe, expect, test } from '@jest/globals';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = process.cwd();
const E2E_DIR = join(ROOT, 'tests', 'e2e');

const TEST_TITLE_PATTERN = /\btest(?:\.\w+)?\(\s*['"`]([^'"`]+)['"`]/g;
const LEADING_ID_PATTERN = /^(TC[\w-]*\d|BUG-\d+)/;

describe('E2E test ids', () => {
    test('keeps leading test ids unique across Playwright specs', async () => {
        const files = (await readdir(E2E_DIR))
            .filter(file => file.endsWith('.spec.js'))
            .sort();
        const seen = new Map();
        const duplicates = [];

        for (const file of files) {
            const source = await readFile(join(E2E_DIR, file), 'utf8');
            for (const match of source.matchAll(TEST_TITLE_PATTERN)) {
                const idMatch = match[1].match(LEADING_ID_PATTERN);
                if (!idMatch) {
                    continue;
                }
                const id = idMatch[1];
                const location = `${file}: ${match[1]}`;
                if (seen.has(id)) {
                    duplicates.push(`${id}\n  first: ${seen.get(id)}\n  again: ${location}`);
                } else {
                    seen.set(id, location);
                }
            }
        }

        expect(duplicates).toEqual([]);
    });
});
