import { describe, expect, test } from '@jest/globals';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = process.cwd();
const SCENARIO_DIR = join(ROOT, 'tests', 'scenarios');
const E2E_DIR = join(ROOT, 'tests', 'e2e');

const STATUS_MARKER_PATTERN = /^\s*# \[(automated|verified|unverified)\]/;
const SCENARIO_PATTERN = /^\s*Scenario(?: Outline)?:/;
const SECTION_PATTERN = /^\s*(Feature|Background):/;
// Two id conventions ship in tests/e2e: TCnn-nnnnnn and BUG-nnn
// (search-field-persistence.spec.js). Both must be checkable, or a citation
// to a BUG- test is invisible to this guard.
const FULL_TEST_ID_PATTERN = /\b(?:TC(?:\d{2}|-[A-Z]+)-\d{3,6}|BUG-\d{3})\b/g;

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

        // Updated 2026-09-24 with the repository owner's approval, naming this
        // test. P3 found 91 of 128 [automated] scenarios citing no test at all.
        // Every scenario that had coverage now cites it; these five did not, and
        // are declared here rather than left claiming automation they never had.
        expect(backlog).toEqual([
            'unverified colman-graves.feature Scenario: Limiting suggestions to starting tags',
            'unverified colman-graves.feature Scenario: Category search fields stay visible while filtering',
            'unverified marketing-release.feature Scenario: Behemoth control explains its budget requirement',
            'verified marketing-release.feature Scenario: The advertiser shortlist states which way the movie leans',
            'unverified marketing-release.feature Scenario: Behemoth slower decay requires commercial score above 9',
            'unverified script-lab.feature Scenario: Age-to-role breakdown shows appeal by age and gender',
        ]);
    });

    test('keeps cited E2E test ids honest', async () => {
        const featureFiles = (await readdir(SCENARIO_DIR))
            .filter(file => file.endsWith('.feature'))
            .sort();
        const e2eFiles = (await readdir(E2E_DIR))
            .filter(file => file.endsWith('.spec.js'))
            .sort();
        const e2eSource = (await Promise.all(e2eFiles
            .map(file => readFile(join(E2E_DIR, file), 'utf8'))))
            .join('\n');
        const missing = [];

        for (const file of featureFiles) {
            const lines = (await readFile(join(SCENARIO_DIR, file), 'utf8')).split(/\r?\n/);
            for (let index = 0; index < lines.length; index += 1) {
                for (const match of lines[index].matchAll(FULL_TEST_ID_PATTERN)) {
                    if (!e2eSource.includes(match[0])) {
                        missing.push(`${file}:${index + 1} ${match[0]}`);
                    }
                }
            }
        }

        expect(missing).toEqual([]);
    });
});
