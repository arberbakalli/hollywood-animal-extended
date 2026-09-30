import { describe, test, expect } from '@jest/globals';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Every Jest suite must touch the product: load the app through the harness,
 * import a src/ module, or read a repository file it checks. A suite that only
 * compares values it typed itself passes whether or not the feature exists.
 * The 2026-09-28 review found several (see docs/TEST_QUALITY_GATE.md, "Patterns
 * that let a broken feature pass").
 *
 * KNOWN_VACUOUS lists the suites that do not touch the product yet. Editing or
 * deleting them needs the owner's approval (CLAUDE.md section 1), so they are
 * named here instead of fixed. The list only shrinks: this test also fails
 * when a listed file starts touching the product or is deleted, so remove its
 * entry in the same change.
 */
// Empty since 2026-09-28: the last two were replaced by real suites and deleted.
const KNOWN_VACUOUS = [];

const TOUCHES_PRODUCT = [
    /loadInstrumentedApp|loadLegacyScript|loadGameData|loadScoringModules|readInputDefault/,
    /(?:from|import)\s+['"](?:\.\.\/)+(?:src|data|script)/,
    /\breadFile(?:Sync)?\(|\breaddir(?:Sync)?\(/,
];

async function jestSuites(dir = 'tests') {
    const suites = [];
    for (const entry of await readdir(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name).replace(/\\/g, '/');
        if (entry.isDirectory() && !['helpers', 'e2e', 'fixtures', 'data', 'scenarios', '__snapshots__'].includes(entry.name)) {
            suites.push(...await jestSuites(path));
        } else if (entry.name.endsWith('.test.js')) {
            suites.push(path);
        }
    }
    return suites.sort();
}

const touchesProduct = async (file) => {
    const source = await readFile(file, 'utf8');
    return TOUCHES_PRODUCT.some(pattern => pattern.test(source));
};

describe('every Jest suite touches the product', () => {
    test('no suite outside the known list only checks values it wrote itself', async () => {
        const offenders = [];
        for (const suite of await jestSuites()) {
            if (!KNOWN_VACUOUS.includes(suite) && !(await touchesProduct(suite))) offenders.push(suite);
        }
        expect(offenders).toEqual([]);
    });

    test('the known list is current: each entry exists and still needs fixing', async () => {
        const suites = await jestSuites();
        const stale = [];
        for (const entry of KNOWN_VACUOUS) {
            if (!suites.includes(entry)) stale.push(`${entry} no longer exists`);
            else if (await touchesProduct(entry)) stale.push(`${entry} now touches the product`);
        }
        expect(stale).toEqual([]);
    });
});
