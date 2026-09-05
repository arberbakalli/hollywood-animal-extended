import { describe, expect, test } from '@jest/globals';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = process.cwd();

const readProjectFile = (path) => readFile(join(ROOT, path), 'utf8');

async function readGeneratedDomSources() {
    const files = ['script.js'];

    async function collect(dir) {
        for (const entry of await readdir(join(ROOT, dir), { withFileTypes: true })) {
            const relativePath = `${dir}/${entry.name}`;
            if (entry.isDirectory()) {
                await collect(relativePath);
            } else if (entry.isFile() && entry.name.endsWith('.js')) {
                files.push(relativePath);
            }
        }
    }

    await collect('src');
    return (await Promise.all(files.map(readProjectFile))).join('\n');
}

function getIds(markup) {
    return [...markup.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
}

function getScriptSources(markup) {
    return [...markup.matchAll(/<script\s+src="([^"]+)"><\/script>/g)].map(match => match[1]);
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
            'tab-advertisers-button',
            'evaluation-mode-compatibility-button',
            'evaluation-mode-graves-button',
            'graves-mode-compatibility-button',
            'graves-mode-graves-button',
            'marketing-mode-advertisers-button',
            'marketing-mode-targeted-button',
            'targeted-mode-advertisers-button',
            'targeted-mode-targeted-button',
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

    test('loads feature modules before the bootstrap shim', async () => {
        const html = await readProjectFile('index.html');
        const scriptSources = getScriptSources(html);
        const expectedSources = [
            'data.js',
            'src/app/state.js',
            'src/app/domIds.js',
            'src/ui/feedback.js',
            'src/ui/scoreFormatting.js',
            'src/data/localization.js',
            'src/data/dataLoaders.js',
            'src/selectors/searchIndex.js',
            'src/selectors/storyElementSelector.js',
            'src/generator/availabilityFilter.js',
            'src/evaluation/compatibilityEngine.js',
            'src/evaluation/movieScoreEstimator.js',
            'src/generator/scriptGenerator.js',
            'src/library/scriptLibrary.js',
            'src/evaluation/scriptEvaluation.js',
            'src/evaluation/gravesAudience.js',
            'src/evaluation/gravesBestMatches.js',
            'src/marketing/advertiserMatcher.js',
            'src/marketing/distributionPlanner.js',
            'src/marketing/marketingPlanner.js',
            'src/marketing/targetedAds.js',
            'src/ui/collapsibleSections.js',
            'src/app/appShell.js',
            'script.js',
        ];

        expect(scriptSources).toEqual(expectedSources);
        await Promise.all(expectedSources.map(source => readProjectFile(source)));
    });

    test('keeps the GitHub Pages script mirror in sync', async () => {
        const rootHtml = await readProjectFile('index.html');
        const docsHtml = await readProjectFile('docs/index.html');
        const scriptSources = getScriptSources(rootHtml);

        expect(getScriptSources(docsHtml)).toEqual(scriptSources);
        await Promise.all(
            scriptSources.map(async source => {
                const rootSource = await readProjectFile(source);
                const docsSource = await readProjectFile(`docs/${source}`);
                expect(docsSource).toBe(rootSource);
            })
        );
    });
});

describe('generated DOM hooks', () => {
    test('avoids generated inline event and style attributes', async () => {
        const source = await readGeneratedDomSources();

        expect(source).not.toMatch(/\sstyle="/i);
        expect(source).not.toMatch(/\son[a-z]+="/i);
        expect(source).not.toMatch(/javascript:/i);
    });

    test('keeps category-derived ids selector-safe', async () => {
        const source = await readGeneratedDomSources();
        expect(source).toContain('function categoryToElementSlug(category)');
        expect(source).not.toContain("category.replace(/\\s/g, '-')");
    });
});
