import { describe, test, expect } from '@jest/globals';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Owner ruling 2026-09-28: neon green (#4cd964, rgb 76 217 100) is removed
 * from the app permanently, including the Boutique toggle, which becomes a
 * dark green. Success and "good" states use the --success token.
 *
 * The only previous guard (tests/e2e/script-lab.spec.js TC01-000031) checks
 * one dropdown's text and border colour for the opaque value, so the
 * translucent rgba() uses on the feedback banner, audience pill and spare-week
 * border, and the slider fill set from JavaScript, all slipped past it.
 * This scans every file the page loads, at any alpha and in any state.
 */
const NEON_GREEN = [/#4cd964\b/i, /rgba?\(\s*76\s*,\s*217\s*,\s*100\b/i];

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

describe('neon green is gone from the shipped app', () => {
    test('no file the page loads uses #4cd964 or rgb(76, 217, 100) at any alpha', async () => {
        const hits = [];
        for (const file of await shippedFiles()) {
            (await readFile(file, 'utf8')).split(/\r?\n/).forEach((line, index) => {
                if (NEON_GREEN.some(pattern => pattern.test(line))) hits.push(`${file}:${index + 1}  ${line.trim()}`);
            });
        }
        expect(hits).toEqual([]);
    });

    // Three greens meant "success": the token, its value typed out by hand, and
    // an undocumented brighter mint (#55EA83). COLOR_PALETTE.md names one, the
    // --success emerald, so every use goes through the token.
    test('success green is only ever reached through the --success token', async () => {
        const HAND_TYPED = [/#10b981\b/i, /#55ea83\b/i, /rgba?\(\s*16\s*,\s*185\s*,\s*129\b/i, /rgba?\(\s*85\s*,\s*234\s*,\s*131\b/i];
        const hits = [];
        for (const file of await shippedFiles()) {
            (await readFile(file, 'utf8')).split(/\r?\n/).forEach((line, index) => {
                if (/^\s*--success(-soft|-border)?\s*:/.test(line)) return;
                if (HAND_TYPED.some(pattern => pattern.test(line))) hits.push(`${file}:${index + 1}  ${line.trim()}`);
            });
        }
        expect(hits).toEqual([]);
    });

    test('the scan covers the stylesheet, the markup and the modules', async () => {
        const files = await shippedFiles();
        expect(files).toEqual(expect.arrayContaining(['styles.css', 'index.html', 'src/generator/scriptGenerator.js']));
    });
});
