import { describe, test, expect } from '@jest/globals';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Features the owner removed on purpose stay removed. Each entry names the
 * docs/DECISIONS.md section that records what it was, why it went and what
 * replaced it. Bringing one back is an owner decision: change DECISIONS.md
 * first, then this list, in the same change.
 *
 * Why this exists: the Agency Compatibility Matrix was deleted on 2026-09-25
 * with its reason recorded only in two commit messages. A later "bring back
 * everything" pass restored it, a review asked "keep it?" without quoting that
 * reason, and it shipped again. See .arber/LESSONS_LEARNED.md lesson 21.
 */
const REMOVED_FEATURES = [
    {
        name: 'Agency Compatibility Matrix',
        decision: 'docs/DECISIONS.md §5',
        markers: [
            /agency-compatibility-panel/,
            /agencyCompatibility(Matrix|Summary)/,
            /agency-matrix/,
            /renderAgencyCompatibilityMatrix/,
            /calculateAgencyCompatibility/,
            /Agency Compatibility Matrix/i,
            /agencySourceMapper|HACAgencySourceMapper/,
        ],
    },
];

async function shippedFiles() {
    const files = ['index.html', 'styles.css', 'script.js', 'data.js'];
    const walk = async (dir) => {
        for (const entry of await readdir(dir, { withFileTypes: true })) {
            const path = join(dir, entry.name);
            if (entry.isDirectory()) await walk(path);
            else if (entry.name.endsWith('.js')) files.push(path.replace(/\\/g, '/'));
        }
    };
    await walk('src');
    return files;
}

describe('removed features stay removed', () => {
    test.each(REMOVED_FEATURES)('$name ($decision) is not in any file the page loads', async ({ markers }) => {
        const hits = [];
        for (const file of await shippedFiles()) {
            (await readFile(file, 'utf8')).split(/\r?\n/).forEach((line, index) => {
                if (markers.some(marker => marker.test(line))) hits.push(`${file}:${index + 1}  ${line.trim()}`);
            });
        }
        expect(hits).toEqual([]);
    });

    test.each(REMOVED_FEATURES)('$name has its removal recorded in $decision', async ({ name, decision }) => {
        const [file, section] = decision.split(' ');
        const text = await readFile(file, 'utf8');
        const heading = text.split(/\r?\n/).find(line => line.startsWith(`## ${section.replace('§', '')}.`));
        expect(heading).toBeDefined();
        expect(heading).toContain(name);
    });
});
