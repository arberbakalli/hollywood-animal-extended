import { beforeAll, describe, expect, test } from '@jest/globals';
import { loadLegacyScript } from './helpers/legacyHarness.js';
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

async function listSourceModules() {
    const files = [];

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
    return files.sort();
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
            'tab-evaluate-button',
            'tab-advertisers-button',
            'marketing-mode-advertisers-button',
            'marketing-mode-targeted-button',
            'targeted-mode-advertisers-button',
            'targeted-mode-targeted-button',
            'generator-settings-panel',
            'generator-score-controls',
            'selectors-container-generator',
            'selectors-container-excluded',
            'generatorFeedbackMessage',
            'generateScriptsButton',
            'pinned-scripts-container',
            'results-generator',
            'graves-search-panel',
            'graves-builder-panel',
            'selectors-container-graves',
            'gravesFeedbackMessage',
            'evaluateGravesButton',
            'generateBestMatchesButton',
            'results-graves',
            'graves-summary-row',
            'gravesAverageDisplay',
            'graves-breakdown-panel',
            'gravesBreakdownBaseScore',
            'gravesBreakdownComBonus',
            'gravesBreakdownArtBonus',
            'gravesTotalComScore',
            'gravesTotalArtScore',
            'gravesScoreCapLabel',
            'graves-best-matches-panel',
            'gravesBestMatchesList',
            'advertisers-search-panel',
            'advertisers-score-panel',
            'selectors-container-advertisers',
            'analyzeMovieButton',
            'dist-wrapper',
            'strikingImageToggle',
            'artisticAbilityToggle',
            'behemothToggle',
            'boutiqueToggle',
            'factoryPolicyToggle',
            'results-advertisers',
        ];

        requiredIds.forEach(id => expect(ids.has(id)).toBe(true));
    });

    test('keeps the compatibility score breakdown available through Colman Graves', async () => {
        const html = await readProjectFile('index.html');
        const ids = new Set(getIds(html));

        [
            'results-graves',
            'graves-summary-row',
            'graves-average-card',
            'gravesAverageDisplay',
            'graves-breakdown-panel',
            'gravesBreakdownBaseScore',
            'gravesBreakdownComBonus',
            'gravesBreakdownArtBonus',
            'gravesTotalComScore',
            'gravesTotalArtScore',
            'gravesScoreCapLabel',
            'graves-conflicts-panel',
            'gravesConflictDisplay',
            'transferGravesTagsButton'
        ].forEach(id => expect(ids.has(id)).toBe(true));

        [
            'Average Fit',
            'Script Synergy',
            'Compatibility Breakdown',
            'Commercial Bonus:',
            'Artistic Bonus:',
            'Movie Score',
            'Commercial Movie Score:',
            'Artistic Movie Score:',
            'Max Score Capped'
        ].forEach(text => expect(html).toContain(text));
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
            'src/selectors/genreMix.js',
            'src/selectors/selectorExclusions.js',
            'src/selectors/storyElementSelector.js',
            'src/generator/availabilityFilter.js',
            'src/evaluation/compatibilityEngine.js',
            'src/evaluation/movieScoreEstimator.js',
            'src/generator/scriptGenerationEngine.js',
            'src/generator/scriptGenerator.js',
            'src/library/scriptLibrary.js',
            'src/library/exclusionStore.js',
            'src/evaluation/scriptEvaluation.js',
            'src/evaluation/gravesAnalysis.js',
            'src/evaluation/gravesAudience.js',
            'src/evaluation/gravesBestMatchesEngine.js',
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

    test('does not leave orphaned source modules outside the HTML load order', async () => {
        const html = await readProjectFile('index.html');
        const loadedSourceModules = getScriptSources(html)
            .filter(source => source.startsWith('src/'))
            .sort();

        await expect(listSourceModules()).resolves.toEqual(loadedSourceModules);
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

/**
 * The neighbouring source-text guard checks how categoryToElementSlug is
 * spelled, which cannot catch a change in what it returns. Every hardcoded
 * selector in the Playwright specs and in styles.css depends on these exact
 * strings, so they are pinned here against the real function.
 */
describe('category ids are derived, not hand-written', () => {
    let h;

    beforeAll(async () => {
        h = await loadLegacyScript();
    });

    test.each([
        ['Genre', 'genre'],
        ['Setting', 'setting'],
        ['Protagonist', 'protagonist'],
        ['Antagonist', 'antagonist'],
        ['Supporting Character', 'supporting-character'],
        ['Theme & Event', 'theme-event'],
        ['Finale', 'finale']
    ])('%s maps to the id fragment %s', (category, slug) => {
        expect(h.call('categoryToElementSlug', category)).toBe(slug);
    });
});

/**
 * script.js is a bridge: every bare global delegates to a HAC* namespace. A
 * wrapper whose target has since been removed still parses and still loads,
 * and only fails when something calls it — so nothing catches it until a user
 * does. One shipped exactly that way when an unused export was deleted, and
 * both suites stayed green because nothing called the bare name.
 */
describe('script.js bridges only targets that exist', () => {
    const NAMESPACE_CALL = /(HAC[A-Za-z]+)\.([A-Za-z0-9_$]+)/g;
    const EXPORT_BLOCK = /global\.(HAC[A-Za-z]+)\s*=\s*\{([\s\S]*?)\n\s*\};/;

    test('every HAC namespace call in script.js resolves to a real export', async () => {
        const bridge = await readProjectFile('script.js');
        const exportsByNamespace = {};

        for (const file of await listSourceModules()) {
            const block = (await readProjectFile(file)).match(EXPORT_BLOCK);
            if (!block) continue;
            exportsByNamespace[block[1]] = block[2]
                .split(',')
                .map(entry => entry.split(':')[0].trim())
                .filter(Boolean);
        }

        const dangling = [...bridge.matchAll(NAMESPACE_CALL)]
            .filter(([, namespace]) => exportsByNamespace[namespace])
            .filter(([, namespace, name]) => !exportsByNamespace[namespace].includes(name))
            .map(([, namespace, name]) => `${namespace}.${name}`);

        expect([...new Set(dangling)]).toEqual([]);
    });
});
