import { describe, expect, test, beforeAll } from '@jest/globals';
import { loadInstrumentedApp } from './helpers/legacyHarness.js';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = process.cwd();

/**
 * "Story elements are everything except Genre and Setting" (GAME_RULES.md
 * section 1) had THREE independent implementations. Two were corrected on
 * 2026-09-22; the third — the Colman Graves evaluate/best-match guards — kept
 * counting raw tags and refused a legal nine-element script as "You selected
 * 11". Two tests pinned that wrong answer in place, so the suite defended the
 * bug rather than catching it.
 *
 * The rule now lives in exactly one function. These tests pin the rule itself
 * and the fact that nobody re-implements it.
 */
describe('the story-element rule', () => {
    let h;

    beforeAll(async () => {
        h = await loadInstrumentedApp();
    });

    const storyElements = (tags) => h.call('HACGravesAnalysis.storyElementsOf', tags);

    test('Genre and Setting are context and spend no budget', () => {
        const script = [
            { id: 'g', category: 'Genre' },
            { id: 's', category: 'Setting' },
            { id: 'p', category: 'Protagonist' }
        ];

        expect(storyElements(script)).toHaveLength(1);
    });

    test('eleven genres still spend nothing', () => {
        const script = [
            ...Array.from({ length: 11 }, (_, i) => ({ id: `g${i}`, category: 'Genre' })),
            { id: 's', category: 'Setting' },
            ...Array.from({ length: 9 }, (_, i) => ({ id: `t${i}`, category: 'Theme & Event' }))
        ];

        // Twenty-one tags, nine story elements: a legal script.
        expect(script).toHaveLength(21);
        expect(storyElements(script)).toHaveLength(9);
    });

    test('the reported script is nine elements, not eleven', () => {
        // Drama / Modern American City / Outcast / Heartless Bureaucrat /
        // Parent Figure / five Theme & Events / Protagonist's Dreams Crushed.
        const reported = [
            { id: 'DRAMA', category: 'Genre' },
            { id: 'MODERN_AMERICAN_CITY', category: 'Setting' },
            { id: 'PROTAGONIST_OUTCAST', category: 'Protagonist' },
            { id: 'ANTAGONIST_HEARTLESS_BUREAUCRAT', category: 'Antagonist' },
            { id: 'SUPPORTINGCHARACTER_PARENT_FIGURE', category: 'Supporting Character' },
            ...Array.from({ length: 5 }, (_, i) => ({ id: `THEME_${i}`, category: 'Theme & Event' })),
            { id: 'FINALE_PROTAGONIST_DREAMS_CRUSHED', category: 'Finale' }
        ];

        expect(reported).toHaveLength(11);
        expect(storyElements(reported)).toHaveLength(9);
    });

    test('an empty or missing selection is zero, not a crash', () => {
        expect(storyElements([])).toEqual([]);
        expect(storyElements(undefined)).toEqual([]);
    });

    test('the panels delegate rather than keeping their own copy', () => {
        const script = [
            { id: 'g', category: 'Genre' },
            { id: 's', category: 'Setting' },
            ...Array.from({ length: 10 }, (_, i) => ({ id: `t${i}`, category: 'Theme & Event' }))
        ];

        // Same script, three entry points, one answer.
        expect(h.call('HACTargetedAds.scoringElementsOf', script)).toHaveLength(10);
        expect(h.call('HACGravesBestMatches.atElementBudget', script)).toBe(true);
        expect(storyElements(script)).toHaveLength(10);
    });
});

/**
 * A source-text guard. The rule was re-implemented three times by hand; this
 * fails the moment a fourth copy appears anywhere outside its owner.
 */
describe('nobody re-implements the story-element filter', () => {
    // gravesAnalysis.js owns the rule. The engine keeps its own copy on purpose:
    // it is a pure module that takes every collaborator as an argument, so it
    // cannot reach for a global. Everything else must delegate.
    const ALLOWED = [
        'src/evaluation/gravesAnalysis.js',
        // Pure module: takes every collaborator as an argument, so it cannot
        // reach for a global.
        'src/evaluation/gravesBestMatchesEngine.js',
        // Loads before gravesAnalysis.js and is unit-tested in isolation.
        // Its copy is pinned by scoringCore.test.js.
        'src/evaluation/movieScoreEstimator.js'
    ];
    // Matches `category !== 'Genre'` regardless of quoting or spacing.
    const HAND_ROLLED = /category\s*!==\s*['"]Genre['"][\s\S]{0,60}?category\s*!==\s*['"]Setting['"]/;

    async function listSourceModules() {
        const files = [];
        async function collect(dir) {
            for (const entry of await readdir(join(ROOT, dir), { withFileTypes: true })) {
                const relativePath = `${dir}/${entry.name}`;
                if (entry.isDirectory()) await collect(relativePath);
                else if (entry.isFile() && entry.name.endsWith('.js')) files.push(relativePath);
            }
        }
        await collect('src');
        return files.sort();
    }

    test('no new module filters Genre out by hand', async () => {
        const offenders = [];

        for (const file of await listSourceModules()) {
            if (ALLOWED.includes(file)) continue;
            if (HAND_ROLLED.test(await readFile(join(ROOT, file), 'utf8'))) {
                offenders.push(file);
            }
        }

        expect(offenders).toEqual([]);
    });
});
