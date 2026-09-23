import { describe, expect, test } from '@jest/globals';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = process.cwd();
const SCENARIO_DIR = join(ROOT, 'tests', 'scenarios');

const STATUS_MARKER_PATTERN = /^\s*# \[(automated|verified|unverified)\]/;
const SCENARIO_PATTERN = /^\s*Scenario(?: Outline)?:/;
const SECTION_PATTERN = /^\s*(Feature|Background):/;

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

        expect(backlog).toEqual([
            'unverified colman-graves.feature Scenario: Graves explains when excluded Settings are unavailable',
            'verified colman-graves.feature Scenario: Banning an element removes it from the Graves script and says so',
            'verified colman-graves.feature Scenario: The verdict follows a successful average fit',
            'verified colman-graves.feature Scenario: All available tags are shown in Best Matches suggestions',
            'verified marketing-release.feature Scenario: Behemoth boost applies at all score levels',
            'verified marketing-release.feature Scenario: Behemoth boost applies to week 2',
            'verified script-lab.feature Scenario: Locking an element that becomes excluded drops it with a message',
        ]);
    });
});
