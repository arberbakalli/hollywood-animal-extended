import { describe, test, expect, beforeAll } from '@jest/globals';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { loadLegacyScript } from './helpers/legacyHarness.js';

/**
 * The required categories are stated once, in GAME_RULES.md section 1:
 * "Required in every script: Genre, Setting, Protagonist." Every code copy must
 * match that sentence, and no other sentence or list may add to it.
 *
 * Why this guard exists (2026-10-08): a fix for locks pushing out the
 * Protagonist also reserved Antagonist and Finale. That over-reach was then
 * written into GAME_RULES as a rule and pinned by tests, so for weeks a script
 * with no Antagonist or Finale was refused. It contradicted the same file's
 * Colman Graves sentence, and nothing compared the two.
 */
const OPTIONAL = ['Antagonist', 'Finale'];
const list = text => text.split(',').map(item => item.replace(/['"\s]/g, '')).filter(Boolean);

async function sourceFiles(dir) {
    const files = [];
    for (const entry of await readdir(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name).replace(/\\/g, '/');
        if (entry.isDirectory()) files.push(...await sourceFiles(path));
        else if (entry.name.endsWith('.js')) files.push(path);
    }
    return files;
}

describe('required script categories: one rule, every copy agrees', () => {
    let rules;
    let required;

    beforeAll(async () => {
        rules = await readFile('docs/GAME_RULES.md', 'utf8');
        const match = rules.match(/\*\*Required in every script: ([^.]+)\.\*\*/);
        expect(match).not.toBeNull();
        required = list(match[1]);
    });

    test('GAME_RULES names Genre, Setting and Protagonist as the required categories', () => {
        expect(required).toEqual(['Genre', 'Setting', 'Protagonist']);
    });

    test('no sentence in GAME_RULES calls Antagonist or Finale mandatory or required', () => {
        const offenders = rules.split(/(?<=[.!?])\s+|\r?\n\r?\n/)
            .filter(sentence => OPTIONAL.some(category => sentence.includes(category)))
            .filter(sentence => /\b(mandatory|required|must|needs?)\b/i.test(sentence))
            .filter(sentence => !/\b(optional|not|never|no|wrongly)\b/i.test(sentence));
        expect(offenders).toEqual([]);
    });

    test('the code lists match the rule', async () => {
        // The one runtime list (src/rules/scriptCategories.js) matches the rule...
        const h = await loadLegacyScript();
        expect([...h.evaluate('HACScriptRules.requiredCategories')]).toEqual(required);
        expect([...h.evaluate('HACScriptRules.mandatoryStoryCategories')]).toEqual(['Protagonist']);
        expect([...h.evaluate('HACScriptRules.optionalStoryCategories')]).toEqual(OPTIONAL);

        // ...and every consumer reads it instead of keeping its own copy.
        const generator = await readFile('src/generator/scriptGenerator.js', 'utf8');
        const targeted = await readFile('src/marketing/targetedAds.js', 'utf8');
        const engine = await readFile('src/generator/scriptGenerationEngine.js', 'utf8');
        expect(generator).toMatch(/const REQUIRED_SCRIPT_CATEGORIES = HACScriptRules\.requiredCategories;/);
        expect(generator).toMatch(/const MANDATORY_STORY_CATEGORIES = HACScriptRules\.mandatoryStoryCategories;/);
        expect(generator).toMatch(/const OPTIONAL_STORY_CATEGORIES = HACScriptRules\.optionalStoryCategories;/);
        expect(targeted).toMatch(/const TARGETED_MANDATORY_CATEGORIES = HACScriptRules\.requiredCategories;/);
        expect(engine).toMatch(/HACScriptRules\.mandatoryStoryCategories\.forEach/);
        expect(engine).toMatch(/const optionalSingles = HACScriptRules\.optionalStoryCategories;/);
    });

    test('no source list named mandatory or required holds Antagonist or Finale, and no message demands them', async () => {
        const offenders = [];
        for (const file of await sourceFiles('src')) {
            const source = await readFile(file, 'utf8');
            for (const match of source.matchAll(/const\s+(\w*(?:MANDATORY|REQUIRED|[Mm]andatory|[Rr]equired)\w*)\s*=\s*\[([^\]]*)\]/g)) {
                if (OPTIONAL.some(category => match[2].includes(category))) offenders.push(`${file}: ${match[1]}`);
            }
            if (/needs? (a|an) (Protagonist, an )?(Antagonist|Finale)/.test(source)) offenders.push(`${file}: message`);
        }
        expect(offenders).toEqual([]);
    });
});

describe('Build for Target needs only the Protagonist among the story roles', () => {
    let h;
    beforeAll(async () => {
        h = await loadLegacyScript();
        await h.ensureCompatibilityLoaded();
        h.evaluate('document.getElementById = () => ({ querySelectorAll: () => [] })');
    });

    const categories = tags => new Set(tags.map(tag => tag.category));
    const story = tags => tags.filter(tag => !['Genre', 'Setting'].includes(tag.category));

    test('four locked Theme & Event elements in a budget of five still produce combinations with a Protagonist', () => {
        const all = Object.values(h.GAME_DATA.tags);
        const locks = all.filter(tag => tag.category === 'Theme & Event').slice(0, 4);
        const combos = h.call('generateTargetedCombinations', all, locks, h.GAME_DATA.adAgents, 5, 5);
        expect(combos.length).toBeGreaterThan(0);
        combos.forEach(tags => {
            ['Genre', 'Setting', 'Protagonist'].forEach(category => expect(categories(tags)).toContain(category));
            expect(story(tags)).toHaveLength(5);
        });
    });

    test.each(OPTIONAL)('with every %s banned, combinations are still built', (category) => {
        const all = Object.values(h.GAME_DATA.tags).filter(tag => tag.category !== category);
        const combos = h.call('generateTargetedCombinations', all, [], h.GAME_DATA.adAgents, 5, 5);
        expect(combos.length).toBeGreaterThan(0);
        combos.forEach(tags => expect(categories(tags)).toContain('Protagonist'));
    });
});
