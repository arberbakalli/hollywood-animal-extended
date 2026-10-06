import { describe, test, expect } from '@jest/globals';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

// tests/domStructure.test.js reads only index.html, script.js and src/, so the
// Testing Features lab had no guard. Same DOM rules here, plus the owner's ask
// (2026-10-05) that the lab look like the main app: shared stylesheet, font and
// colour tokens instead of a private palette.
const ROOT = process.cwd();
const read = path => readFile(join(ROOT, path), 'utf8');

describe('Testing Features lab structure', () => {
    test('keeps behaviour and styling out of inline attributes', async () => {
        const sources = [await read('testing-features.html')];
        for (const name of await readdir(join(ROOT, 'lab'))) {
            if (name.endsWith('.js')) sources.push(await read(`lab/${name}`));
        }
        const all = sources.join('\n');
        expect(all).not.toMatch(/\sstyle="/i);
        expect(all).not.toMatch(/\son[a-z]+="/i);
        expect(all).not.toMatch(/javascript:/i);
    });

    test('uses unique id attributes', async () => {
        const ids = [...(await read('testing-features.html')).matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
        expect(ids.filter((id, index) => ids.indexOf(id) !== index)).toEqual([]);
    });

    test('loads the main stylesheet and font before its own layout file', async () => {
        const html = await read('testing-features.html');
        const main = html.indexOf('href="styles.css"');
        const lab = html.indexOf('href="testing-features.css"');
        expect(main).toBeGreaterThan(-1);
        expect(lab).toBeGreaterThan(main);
        expect(html).toContain('fonts.googleapis.com/css2?family=Inter');
    });

    test('lab panels are main-app cards and the nav uses main-app pills', async () => {
        const html = await read('testing-features.html');
        const panels = [...html.matchAll(/<section id="lab-panel-[a-z]+"[^>]*>\s*<div class="card lab-card">/g)];
        expect(panels).toHaveLength(8);
        const tabs = [...html.matchAll(/<button id="lab-tab-[a-z]+" class="product-mode-btn"/g)];
        expect(tabs).toHaveLength(8);
    });

    test('the lab stylesheet uses colour tokens, not a private palette', async () => {
        const css = await read('testing-features.css');
        // #000 is the main app's text on a gold pill (.product-mode-btn.active).
        const hexes = [...css.matchAll(/#[0-9a-f]{3,8}\b/gi)].map(match => match[0].toLowerCase());
        expect(hexes.filter(hex => hex !== '#000')).toEqual([]);
    });
});
