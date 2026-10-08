import { describe, test, expect, beforeAll } from '@jest/globals';
import { readFile } from 'node:fs/promises';
import { loadInstrumentedApp } from './helpers/legacyHarness.js';

/**
 * Lists that must stay in step with each other or with docs/GAME_RULES.md,
 * read from the shipped source rather than typed into the test.
 */

const idsIn = (arrayLiteral) => [...arrayLiteral.matchAll(/'([^']+)'/g)].map(m => m[1]);

async function hideList() {
    const source = await readFile('src/evaluation/gravesBestMatches.js', 'utf8');
    const match = source.match(/function hideGravesEvaluationResults\(\)[\s\S]*?const evaluationPanels = \[([^\]]*)\]/);
    expect(match).not.toBeNull();
    return idsIn(match[1]);
}

async function revealList() {
    const source = await readFile('src/evaluation/gravesAudience.js', 'utf8');
    const match = source.match(
        /function renderColmanGravesResults[\s\S]*?\[([^\]]*)\]\.forEach\(panelId => \{\s*const panel = document\.getElementById\(panelId\);\s*if \(panel\) panel\.classList\.remove\('hidden'\)/
    );
    expect(match).not.toBeNull();
    return idsIn(match[1]);
}

describe('Graves evaluation panels (CLAUDE.md section 4)', () => {
    test('Evaluate reveals exactly the panels that Best Matches hides', async () => {
        const hidden = await hideList();
        const revealed = await revealList();

        expect(hidden).toHaveLength(5);
        expect([...revealed].sort()).toEqual([...hidden].sort());
    });

    test('every listed panel exists in index.html', async () => {
        const html = await readFile('index.html', 'utf8');
        for (const id of await hideList()) {
            expect(html).toContain(`id="${id}"`);
        }
    });
});

describe('category lists match GAME_RULES.md section 1', () => {
    let h;

    beforeAll(async () => {
        h = await loadInstrumentedApp();
    });

    test('categories are listed in game order', () => {
        expect([...h.evaluate('GAME_DATA.categories')]).toEqual([
            'Genre', 'Setting', 'Protagonist', 'Antagonist', 'Supporting Character', 'Theme & Event', 'Finale',
        ]);
    });

    test('the Best Matches category filter offers categories in game order', async () => {
        const html = await readFile('index.html', 'utf8');
        const select = html.match(/<select id="gravesBestCategoryFilter"[^>]*>([\s\S]*?)<\/select>/);
        expect(select).not.toBeNull();
        const values = [...select[1].matchAll(/<option value="([^"]*)"/g)]
            .map(m => m[1].replace(/&amp;/g, '&'))
            .filter(Boolean);

        expect(values).toEqual([...h.evaluate('GAME_DATA.categories')]);
    });

    // Script Lab chips, Best Matches tags and Build for Target chips colour a
    // Genre with one rule per genre; a genre without a rule shows uncoloured.
    test('every genre has a chip colour rule', async () => {
        const css = await readFile('styles.css', 'utf8');
        const genreSlugs = h.evaluate(`Object.values(GAME_DATA.tags)
            .filter(tag => tag.category === 'Genre')
            .map(tag => HACDomIds.toDomId(tag.id))`);
        expect(genreSlugs).toHaveLength(11);

        const missing = genreSlugs.filter(slug => !new RegExp(
            `\\.gen-tag-chip\\.genre-${slug}[\\s\\S]*?\\{\\s*--tag-color:\\s*var\\(--cat-genre-${slug}\\)`).test(css));
        expect(missing).toEqual([]);
    });

    test('only Genre, Supporting Character and Theme & Event take more than one element', () => {
        expect([...h.evaluate('MULTI_SELECT_CATEGORIES')].sort())
            .toEqual(['Genre', 'Supporting Character', 'Theme & Event']);
    });

    test('Build for Target seeds Genre, Setting and Protagonist', async () => {
        expect([...h.evaluate('HACScriptRules.requiredCategories')].sort())
            .toEqual(['Genre', 'Protagonist', 'Setting']);
        const source = await readFile('src/marketing/targetedAds.js', 'utf8');
        expect(source).toMatch(/const TARGETED_MANDATORY_CATEGORIES = HACScriptRules\.requiredCategories;/);
    });
});
