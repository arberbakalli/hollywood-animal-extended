import { describe, expect, test } from '@jest/globals';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = process.cwd();

const readProjectFile = (path) => readFile(join(ROOT, path), 'utf8');

function getIds(markup) {
    return [...markup.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
}

describe('HTML structure', () => {
    test('keeps behavior and styling out of inline attributes', async () => {
        const html = await readProjectFile('index.html');
        expect(html).not.toMatch(/\sstyle="/i);
        expect(html).not.toMatch(/\son[a-z]+="/i);
        expect(html).not.toMatch(/javascript:/i);
    });

    test('uses unique id attributes', async () => {
        const html = await readProjectFile('index.html');
        const ids = getIds(html);
        const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
        expect(duplicates).toEqual([]);
    });

    test('exposes stable hooks for all major panels and controls', async () => {
        const html = await readProjectFile('index.html');
        const ids = new Set(getIds(html));
        const requiredIds = [
            'app-shell',
            'primary-tabs',
            'tab-generator-button',
            'tab-synergy-button',
            'tab-graves-button',
            'tab-advertisers-button',
            'generator-settings-panel',
            'generator-profile-control',
            'generator-score-controls',
            'selectors-container-generator',
            'selectors-container-excluded',
            'generatorFeedbackMessage',
            'generateScriptsButton',
            'pinned-scripts-container',
            'results-generator',
            'synergy-search-panel',
            'synergy-builder-panel',
            'selectors-container-synergy',
            'calculateSynergyButton',
            'results-synergy',
            'synergy-conflicts-panel',
            'graves-search-panel',
            'graves-builder-panel',
            'selectors-container-graves',
            'gravesFeedbackMessage',
            'evaluateGravesButton',
            'generateBestMatchesButton',
            'results-graves',
            'graves-best-matches-panel',
            'gravesBestMatchesList',
            'advertisers-search-panel',
            'advertisers-score-panel',
            'selectors-container-advertisers',
            'analyzeMovieButton',
            'dist-wrapper',
            'results-advertisers',
        ];

        requiredIds.forEach(id => expect(ids.has(id)).toBe(true));
    });
});

describe('generated DOM hooks', () => {
    test('avoids generated inline event and style attributes', async () => {
        // script.js is the only source that generates DOM; the src/ tree was
        // removed in f6b0413 as unreachable.
        const source = await readProjectFile('script.js');

        expect(source).not.toMatch(/\sstyle="/i);
        expect(source).not.toMatch(/\son[a-z]+="/i);
        expect(source).not.toMatch(/javascript:/i);
    });

    test('keeps category-derived ids selector-safe', async () => {
        const source = await readProjectFile('script.js');
        expect(source).toContain('function categoryToElementSlug(category)');
        expect(source).not.toContain("category.replace(/\\s/g, '-')");
    });
});
