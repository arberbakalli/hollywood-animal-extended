import { describe, expect, test } from '@jest/globals';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parse } from '@babel/parser';

const ROOT = process.cwd();
const SCENARIO_DIR = join(ROOT, 'tests', 'scenarios');
const E2E_DIR = join(ROOT, 'tests', 'e2e');

const STATUS_MARKER_PATTERN = /^\s*# \[(automated|verified|unverified)\]/;
const SCENARIO_PATTERN = /^\s*Scenario(?: Outline)?:/;
const SECTION_PATTERN = /^\s*(Feature|Background):/;
// Two id conventions ship in tests/e2e: TCnn-nnnnnn and BUG-nnn
// (search-field-persistence.spec.js). Both must be checkable, or a citation
// to a BUG- test is invisible to this guard.
const ID = '(?:TC(?:\\d{2}(?:-[A-Z]+)?|-[A-Z]+)-\\d{3,6}|BUG-\\d{3})';
const FULL_TEST_ID_PATTERN = new RegExp(`\\b${ID}\\b`, 'g');

function declaredTestIds(source) {
    const ids = new Set();
    function visit(node) {
        if (!node || typeof node !== 'object') return;
        if (node.type === 'CallExpression' && node.callee.type === 'Identifier' && node.callee.name === 'test') {
            const title = node.arguments[0];
            const text = title?.type === 'StringLiteral' ? title.value
                : title?.type === 'TemplateLiteral' ? title.quasis[0].value.cooked : '';
            const id = text?.match(new RegExp(`^${ID}\\b`));
            if (id) ids.add(id[0]);
        }
        for (const value of Object.values(node)) {
            if (Array.isArray(value)) value.forEach(visit);
            else if (value && typeof value === 'object') visit(value);
        }
    }
    visit(parse(source, { sourceType: 'module' }));
    return ids;
}

function citedTestIds(line) {
    const ids = new Set([...line.matchAll(FULL_TEST_ID_PATTERN)].map(match => match[0]));
    const ranges = new RegExp(`\\b(${ID})\\s*\\.\\.\\s*(${ID}|\\d+)\\b`, 'g');
    for (const [, start, end] of line.matchAll(ranges)) {
        const [, prefix, digits] = start.match(/^(.*-)(\d+)$/);
        const last = end.includes('-') ? end : prefix + digits.slice(0, -end.length) + end;
        if (!last.startsWith(prefix) || Number(last.slice(prefix.length)) < Number(digits)) {
            throw new Error(`Invalid citation range: ${start}..${end}`);
        }
        for (let value = Number(digits); value <= Number(last.slice(prefix.length)); value++) {
            ids.add(prefix + String(value).padStart(digits.length, '0'));
        }
    }
    return ids;
}

describe('BDD scenario markers', () => {
    test('keeps exactly one status marker immediately above each scenario', async () => {
        const files = (await readdir(SCENARIO_DIR))
            .filter(file => file.endsWith('.feature'))
            .sort();
        const invalid = [];

        for (const file of files) {
            const lines = (await readFile(join(SCENARIO_DIR, file), 'utf8')).split(/\r?\n/);
            for (let index = 0; index < lines.length; index += 1) {
                if (!SCENARIO_PATTERN.test(lines[index])) {
                    continue;
                }

                let cursor = index - 1;
                const markers = [];
                while (cursor >= 0 && !SCENARIO_PATTERN.test(lines[cursor]) && !SECTION_PATTERN.test(lines[cursor])) {
                    if (STATUS_MARKER_PATTERN.test(lines[cursor])) {
                        markers.push(lines[cursor].trim());
                    }
                    cursor -= 1;
                }

                if (markers.length !== 1) {
                    invalid.push(`${file}:${index + 1} ${lines[index].trim()} (${markers.length} markers)`);
                }
            }
        }

        expect(invalid).toEqual([]);
    });

    test('keeps the verified and unverified backlog explicit', async () => {
        const files = (await readdir(SCENARIO_DIR))
            .filter(file => file.endsWith('.feature'))
            .sort();
        const backlog = [];

        for (const file of files) {
            const lines = (await readFile(join(SCENARIO_DIR, file), 'utf8')).split(/\r?\n/);
            for (let index = 0; index < lines.length; index += 1) {
                const marker = lines[index].match(/^\s*# \[(verified|unverified)\]/);
                if (!marker) {
                    continue;
                }

                let cursor = index + 1;
                while (cursor < lines.length && !SCENARIO_PATTERN.test(lines[cursor])) {
                    cursor += 1;
                }

                backlog.push(`${marker[1]} ${file} ${lines[cursor].trim()}`);
            }
        }

        // The remaining lean scenario is covered by TC23-000001, including
        // Balanced, Commercial and Artistic placement above eight advertisers.
        expect(backlog).toEqual([]);
    });

    test('resolves cited E2E ids and ranges to test declarations, not comments', async () => {
        const featureFiles = (await readdir(SCENARIO_DIR))
            .filter(file => file.endsWith('.feature'))
            .sort();
        const e2eFiles = (await readdir(E2E_DIR))
            .filter(file => file.endsWith('.spec.js'))
            .sort();
        const declaredIds = new Set();
        for (const file of e2eFiles) {
            for (const id of declaredTestIds(await readFile(join(E2E_DIR, file), 'utf8'))) declaredIds.add(id);
        }
        const missing = [];

        for (const file of featureFiles) {
            const lines = (await readFile(join(SCENARIO_DIR, file), 'utf8')).split(/\r?\n/);
            for (let index = 0; index < lines.length; index += 1) {
                for (const id of citedTestIds(lines[index])) {
                    if (!declaredIds.has(id)) {
                        missing.push(`${file}:${index + 1} ${id}`);
                    }
                }
            }
        }

        expect(missing).toEqual([]);
    });

    test('the declaration scanner rejects comment-only, helper-string and skipped ids', () => {
        expect([...declaredTestIds(`
            // test('TC99-000001 comment only', () => {});
            const unused = "test('TC99-000002 string only', () => {})";
            test.skip('TC99-000003 skipped', () => {});
            test.describe('TC99-000004 group, not test', () => {});
            test('TC99-000005 real declaration', () => {});
            test(\`TC99-000006 real parameterized \${variant}\`, () => {});
        `)]).toEqual(['TC99-000005', 'TC99-000006']);
    });

    test.each([
        ['TC03-000046..49', ['TC03-000046', 'TC03-000047', 'TC03-000048', 'TC03-000049']],
        ['TC09-000007 .. TC09-000009', ['TC09-000007', 'TC09-000008', 'TC09-000009']],
        ['TC04-MAX-005 and TC-BEH-002, BUG-001', ['TC04-MAX-005', 'TC-BEH-002', 'BUG-001']],
    ])('expands the complete citation %s', (citation, expected) => {
        expect([...citedTestIds(citation)].sort()).toEqual([...expected].sort());
    });
});
