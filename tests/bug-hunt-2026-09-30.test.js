import { describe, test, expect, beforeAll, afterEach } from '@jest/globals';
import { loadInstrumentedApp } from './helpers/legacyHarness.js';

/**
 * Four defects the owner found on 2026-09-30 with one script, and the rulings
 * made the same day (docs/GAME_RULES.md sections 1 and 2):
 *
 *   Adventure 35% / Science-Fiction 65%, Fantasy Kingdom, Hardened Cynic,
 *   Evil Monster, Treasure Hunt, Long Journey, Evil Transformation,
 *   Protagonist Finds Treasure. Max Element Pool 8.
 *
 * 1. Evaluate showed Long Journey x Evil Monster as Unsuccessful (1.0), but
 *    Swap Suggestions offered no replacement for either. Long Journey fits the
 *    rest of the script well, so no swap raises the raw average, and a slot
 *    appeared only when one did. Ruling: an element in an Unsuccessful pair
 *    always gets a slot, listing replacements that clear the clash.
 * 2. After the owner removed Long Journey, Swap offered it back in place of
 *    Evil Transformation as "+0.11", which restores the 1.0 clash. Ruling: a
 *    swap never brings in a new Unsuccessful pair.
 * 3. Best Additions listed one Genre and no story element, with two slots of
 *    room, and did not say why. Ruling: say so, and name the fit to lower.
 * 4. Script Lab could not generate 8 story elements: pool 8 targets 8, and a
 *    target of 8 asks for 7. Ruling: generate the pool.
 */
describe('bug hunt 2026-09-30', () => {
    let h;

    const OWNER_SCRIPT = [
        ['ADVENTURE', 0.35],
        ['SCIENCE_FICTION', 0.65],
        ['FANTASY_KINGDOM'],
        ['PROTAGONIST_CYNIC'],
        ['ANTAGONIST_EVIL_MONSTER'],
        ['THEME_TREASURE_HUNT'],
        ['THEME_LONG_JOURNEY'],
        ['THEME_EVIL_TRANSFORMATION'],
        ['FINALE_PROTAGONIST_FINDS_TREASURE'],
    ];

    const script = (without = []) => OWNER_SCRIPT
        .filter(([id]) => !without.includes(id))
        .map(([id, percent = 1]) => ({ ...h.GAME_DATA.tags[id], percent }));

    const candidatesFor = (selected) => {
        const selectedIds = new Set(selected.map(tag => tag.id));
        return Object.values(h.GAME_DATA.tags).filter(tag => !selectedIds.has(tag.id));
    };

    const swapsFor = (selected, minimum = 4.0) =>
        h.call('HACGravesBestMatchesEngine.buildSwaps', selected, candidatesFor(selected), minimum);

    const slotFor = (result, tagId) =>
        Object.values(result.rowsBySlot).find(group => group.slot.tag.id === tagId);

    const threshold = () => h.evaluate('HACGravesBestMatchesEngine.CONFLICT_PAIR_THRESHOLD');

    beforeAll(async () => {
        h = await loadInstrumentedApp();
        await h.ensureCompatibilityLoaded();
    });

    afterEach(() => h.resetBrowserState());

    describe('Swap Suggestions and Unsuccessful pairs', () => {
        test('the owner script has exactly one Unsuccessful pair: Long Journey x Evil Monster', () => {
            // Pins the fixture, so the tests below cannot pass on data that no
            // longer holds the clash they are about.
            expect(h.call(
                'getRawCompatibilityScore',
                h.GAME_DATA.tags.THEME_LONG_JOURNEY,
                h.GAME_DATA.tags.ANTAGONIST_EVIL_MONSTER
            )).toBeLessThan(threshold());
        });

        test('an element in an Unsuccessful pair gets a slot, even when no swap raises the average', () => {
            const result = swapsFor(script());
            const slot = slotFor(result, 'THEME_LONG_JOURNEY');

            expect(slot).toBeDefined();
            expect(slot.slot.clash.against.id).toBe('ANTAGONIST_EVIL_MONSTER');
            // Swapping in Ancient Puzzle clears the clash at an unchanged raw
            // average, which is why the average-only rule hid it.
            expect(slot.rows.map(row => row.candidate.id)).toContain('EVENTS_ANCIENT_PUZZLE');
            slot.rows.forEach(row => expect(row.worstScore).toBeGreaterThanOrEqual(threshold()));
        });

        test('the other side of the clash gets a slot too', () => {
            const slot = slotFor(swapsFor(script()), 'ANTAGONIST_EVIL_MONSTER');

            expect(slot).toBeDefined();
            expect(slot.slot.clash.against.id).toBe('THEME_LONG_JOURNEY');
            expect(slot.rows.length).toBeGreaterThan(0);
            slot.rows.forEach(row => expect(row.worstScore).toBeGreaterThanOrEqual(threshold()));
        });

        test('a swap never brings in a new Unsuccessful pair', () => {
            const result = swapsFor(script(['THEME_LONG_JOURNEY']));

            expect(result.allRows.map(row => row.candidate.id)).not.toContain('THEME_LONG_JOURNEY');
            result.allRows.forEach(row => {
                expect(row.worstScore).toBeGreaterThanOrEqual(threshold());
                expect(row.band).not.toBe('unsuccessful');
            });
        });

        test('a slot outside any clash still lists only swaps that raise the average', () => {
            const result = swapsFor(script());
            const clean = Object.values(result.rowsBySlot).filter(group => !group.slot.clash);

            expect(clean.length).toBeGreaterThan(0);
            clean.forEach(group => group.rows.forEach(row =>
                expect(row.resultingAverage).toBeGreaterThan(row.currentAverage)));
        });

        test('a clash no candidate can clear is reported, not dropped', () => {
            // A Theme and an Antagonist that clash, and one candidate Theme
            // that clashes with the Antagonist just as badly. Nothing clears it.
            const scores = { 'A|B': 1.0, 'B|C': 1.0 };
            const result = h.call(
                'HACGravesBestMatchesEngine.buildSwaps',
                [
                    { id: 'A', name: 'A', category: 'Theme & Event' },
                    { id: 'B', name: 'B', category: 'Antagonist' },
                ],
                [{ id: 'C', name: 'C', category: 'Theme & Event' }],
                0,
                {
                    calculateMatrixScore: () => ({ rawAverage: 3 }),
                    getRawCompatibilityScore: (x, y) => scores[[x.id, y.id].sort().join('|')] ?? 3,
                    multiSelectCategories: ['Theme & Event'],
                }
            );

            expect(result).not.toBeNull();
            expect(result.unresolvedClashes.map(clash => clash.tag.id).sort()).toEqual(['A', 'B']);
            expect(result.unresolvedClashes.find(clash => clash.tag.id === 'A').against.id).toBe('B');
            expect(result.unresolvedClashes.find(clash => clash.tag.id === 'A').score).toBe(1.0);
            // No slot without rows: a slot group always offers a replacement.
            expect(Object.keys(result.rowsBySlot)).toEqual([]);
        });
    });

    describe('Best Additions explains a short list', () => {
        // The harness reports Max Element Pool 10.
        const themes = (count) => Array.from({ length: count }, (_, i) => ({
            id: `T${i}`, name: `T${i}`, category: 'Theme & Event',
        }));
        const genreRow = { candidate: { id: 'ACTION', name: 'Action', category: 'Genre' } };
        const themeRow = (id) => ({ candidate: { id, name: id, category: 'Theme & Event' } });

        const note = (selected, rows, fit) =>
            h.call('HACGravesBestMatches.additionsShortfallNote', selected, rows, fit);

        test('names the free slots and the fit when too few story elements clear it', () => {
            const message = note(themes(6), [genreRow], 4.0);

            expect(message).toContain('room for 4 more story elements');
            expect(message).toContain('only 0 clear the 4.0+ Minimum Fit');
            expect(message).toContain('Lower Minimum Fit');
        });

        test('counts story elements only, never a Genre row', () => {
            expect(note(themes(6), [genreRow, themeRow('X')], 4.0))
                .toContain('only 1 clears the 4.0+ Minimum Fit');
        });

        test('says nothing when enough story elements clear the fit', () => {
            const rows = ['W', 'X', 'Y', 'Z'].map(themeRow);
            expect(note(themes(6), rows, 4.0)).toBe('');
        });

        test('says nothing at a fit of 0, where there is nothing left to lower', () => {
            expect(note(themes(6), [genreRow], 0)).toBe('');
        });

        test('says nothing at the budget, where the budget message applies instead', () => {
            expect(note(themes(10), [], 4.0)).toBe('');
        });

        // Audit 2026-09-30: with Match Category on Genre or Setting no fit can
        // ever list a story element, so the note gave advice that cannot help.
        test.each(['Genre', 'Setting'])('says nothing when Match Category is %p', (category) => {
            expect(h.call('HACGravesBestMatches.additionsShortfallNote', themes(6), [genreRow], 4.0, category)).toBe('');
        });

        test('still speaks when Match Category is a story category', () => {
            expect(h.call('HACGravesBestMatches.additionsShortfallNote', themes(6), [], 4.0, 'Theme & Event'))
                .toContain('room for 4 more story elements');
        });

        // The note carries a one-click button that lowers Minimum Fit by one
        // step (owner request 2026-09-30).
        test.each([
            ['5.0', '4.5'], ['4.5', '4.0'], ['4.0', '3.5'], ['3.5', '3.0'], ['3.0', '0'], ['0', null],
        ])('one step below %p is %p', (fit, lower) => {
            expect(h.call('HACGravesBestMatches.nextLowerFit', fit)).toBe(lower);
        });
    });

    // Owner ruling 2026-09-30: Max Element Pool is the story-element count,
    // and the Target Movie Score follows it one to one, 5 to 10. The earlier
    // N-1 mapping read the game's Rating Limit table (a ceiling) as a
    // requirement. The ceiling itself is unchanged (movie-score-cap.test.js).
    /**
     * Build for Target audit, 2026-09-30. The first five invariants held on
     * audit and had no class-level test; the sixth failed: 10-17 of every 20
     * suggestions carried a spoiler pair, because ranking reads advertiser fit
     * only. Owner ruling: never suggest a combination holding a pair below 2.0.
     * Pairs between two locked elements are the player's own choice, so they
     * are named, not used to hide results.
     */
    describe('Build for Target, over every pool and agency set', () => {
        const SINGLE = ['Setting', 'Protagonist', 'Antagonist', 'Finale'];
        const tagsOf = (combo) => combo.tags.map(tag => h.GAME_DATA.tags[tag.id]);
        const search = (agencies, locks, budget, report) =>
            h.callAsync('HACTargetedAds.searchForTargetCombinations', agencies, locks, [], 20, budget, report);
        const clashes = (tags, lockedIds) => {
            const found = [];
            for (let a = 0; a < tags.length; a++) {
                for (let b = a + 1; b < tags.length; b++) {
                    if (lockedIds.has(tags[a].id) && lockedIds.has(tags[b].id)) continue;
                    const score = h.call('getRawCompatibilityScore', tags[a], tags[b]);
                    if (score < threshold()) found.push(`${tags[a].id} x ${tags[b].id} = ${score}`);
                }
            }
            return found;
        };
        const agencySets = () => [
            ['all agencies', h.GAME_DATA.adAgents],
            ...h.GAME_DATA.adAgents.map(agency => [agency.name, [agency]]),
        ];

        // Script Lab's ban list is read from the page; an empty one here.
        beforeEach(async () => {
            await h.ensureCompatibilityLoaded();
            const empty = {
                value: '', dataset: {}, children: [],
                classList: { add() {}, remove() {}, contains: () => false, toggle() {} },
                querySelector: () => null, querySelectorAll: () => [],
            };
            globalThis.document = {
                getElementById: () => empty,
                querySelector: () => null,
                querySelectorAll: () => [],
                createElement: () => ({ ...empty, style: {}, setAttribute() {}, appendChild() {} }),
            };
        });

        test.each([5, 6, 7, 8, 9, 10])('pool %p: every suggestion is a legal, clash-free script of exactly the pool', async (budget) => {
            const problems = [];
            for (const [name, agencies] of agencySets()) {
                const combos = await search(agencies, [], budget);
                if (combos.length === 0 || combos.length > 20) problems.push(`${name}: ${combos.length} results`);
                const signatures = new Set();
                combos.forEach((combo, index) => {
                    const at = `${name} #${index + 1}`;
                    const tags = tagsOf(combo);
                    const count = category => tags.filter(tag => tag.category === category).length;
                    const story = h.call('HACGravesAnalysis.storyElementsOf', tags).length;
                    if (story !== budget) problems.push(`${at}: ${story} story elements`);
                    if (count('Genre') < 1) problems.push(`${at}: no Genre`);
                    SINGLE.filter(category => count(category) !== 1)
                        .forEach(category => problems.push(`${at}: ${count(category)} ${category}`));
                    if (new Set(tags.map(tag => tag.id)).size !== tags.length) problems.push(`${at}: duplicate element`);
                    clashes(tags, new Set()).forEach(clash => problems.push(`${at}: ${clash}`));
                    if (index > 0 && combos[index - 1].avgScore < combo.avgScore) problems.push(`${at}: out of order`);
                    signatures.add(tags.map(tag => tag.id).sort().join('|'));
                });
                if (signatures.size !== combos.length) problems.push(`${name}: repeated combination`);
            }
            expect(problems).toEqual([]);
        }, 120000);

        test('a clash between two locked elements keeps the results and is named', async () => {
            const locks = [
                { id: 'THEME_LONG_JOURNEY', category: 'Theme & Event', percent: 1 },
                { id: 'ANTAGONIST_EVIL_MONSTER', category: 'Antagonist', percent: 1 },
            ];
            const report = {};
            const combos = await search(h.GAME_DATA.adAgents, locks, 7, report);
            const lockedIds = new Set(locks.map(lock => lock.id));

            expect(combos.length).toBeGreaterThan(0);
            combos.forEach(combo => {
                const tags = tagsOf(combo);
                lockedIds.forEach(id => expect(tags.map(tag => tag.id)).toContain(id));
                expect(clashes(tags, lockedIds)).toEqual([]);
            });
            // Named in game category order: Antagonist before Theme & Event.
            expect(report.lockedClashes).toEqual([
                { a: 'ANTAGONIST_EVIL_MONSTER', b: 'THEME_LONG_JOURNEY', score: 1 },
            ]);
        });

        test.each([
            [{ dropped: 30, lockedClashes: [] }, 7, 'Showing 7. 30 other combinations were left out because they hold a pair below 2.0.'],
            [{ dropped: 30, lockedClashes: [] }, 20, ''],
            [{ dropped: 0, lockedClashes: [] }, 7, ''],
        ])('the search note for %p with %p results', (report, found, note) => {
            expect(h.call('HACTargetedAds.searchReportNote', report, found, 20)).toBe(note);
        });

        test('the search note names a clash between locked elements', () => {
            const note = h.call('HACTargetedAds.searchReportNote',
                { dropped: 0, lockedClashes: [{ a: 'ANTAGONIST_EVIL_MONSTER', b: 'THEME_LONG_JOURNEY', score: 1 }] }, 20, 20);
            expect(note).toBe('Your locked Evil Monster and Long Journey clash (1.0). Suggestions add no clash of their own.');
        });
    });

    // Owner ruling 2026-10-01: use the real entry. The data holds every pair
    // in both directions; 36 pairs disagree, all with Hardened Cynic's own
    // row at 3 (the extract's "no data" value) and the reverse at 4 or 5.
    // Best Additions read one direction and Pair Analysis the other.
    describe('a pair scores the same in both directions', () => {
        test('every pair in the data, through the shared lookup', () => {
            const tags = Object.values(h.GAME_DATA.tags);
            const problems = [];
            for (let a = 0; a < tags.length; a++) {
                for (let b = a + 1; b < tags.length; b++) {
                    const ab = h.call('getRawCompatibilityScore', tags[a], tags[b]);
                    const ba = h.call('getRawCompatibilityScore', tags[b], tags[a]);
                    if (ab !== ba) problems.push(`${tags[a].id} x ${tags[b].id}: ${ab} / ${ba}`);
                }
            }
            expect(problems).toEqual([]);
        });

        test('the real entry wins over the 3.0 default: Hardened Cynic x Evil Transformation is 5', () => {
            const cynic = h.GAME_DATA.tags.PROTAGONIST_CYNIC;
            const evil = h.GAME_DATA.tags.THEME_EVIL_TRANSFORMATION;
            expect(h.call('getRawCompatibilityScore', cynic, evil)).toBe(5);
            expect(h.call('getRawCompatibilityScore', evil, cynic)).toBe(5);
        });

        test('the matrix score does not depend on which element comes first', () => {
            const tags = ['PROTAGONIST_CYNIC', 'THEME_EVIL_TRANSFORMATION', 'ADVENTURE', 'FANTASY_KINGDOM']
                .map(id => ({ ...h.GAME_DATA.tags[id], percent: 1 }));
            const forward = h.call('calculateMatrixScore', tags);
            const reverse = h.call('calculateMatrixScore', [...tags].reverse());
            expect(reverse.rawAverage).toBe(forward.rawAverage);
            expect(reverse.totalScore).toBeCloseTo(forward.totalScore, 10);
        });
    });

    // Audit 2026-09-30: a library file is shared between players, so import
    // trusts nothing in it. It already skipped unknown elements; it accepted
    // a duplicate element, two Settings, and a Genre share no builder can hold.
    describe('Script Library import', () => {
        const entry = (tags, uniqueId = `u-${Math.random()}`) => ({ uniqueId, name: 'File script', tags });
        const BASE = [
            { id: 'ADVENTURE', category: 'Genre', percent: 1 },
            { id: 'FANTASY_KINGDOM', category: 'Setting', percent: 1 },
            { id: 'PROTAGONIST_DARING_ADVENTURER', category: 'Protagonist', percent: 1 },
            { id: 'ANTAGONIST_EVIL_MONSTER', category: 'Antagonist', percent: 1 },
            { id: 'FINALE_PROTAGONIST_FINDS_TREASURE', category: 'Finale', percent: 1 },
        ];
        const importScripts = entries => h.call('HACScriptLibrary.importScripts', entries);
        beforeEach(() => { globalThis.pinnedScripts.length = 0; });

        test('skips an entry that holds the same element twice', () => {
            const tags = [...BASE, { id: 'THEME_TREASURE_HUNT', category: 'Theme & Event' }, { id: 'THEME_TREASURE_HUNT', category: 'Theme & Event' }];
            expect(importScripts([entry(tags)])).toEqual({ added: 0, skipped: 1 });
        });

        test.each(['Setting', 'Protagonist', 'Antagonist', 'Finale'])('skips an entry with two %s picks', (category) => {
            const second = Object.values(h.GAME_DATA.tags).find(tag => tag.category === category && !BASE.some(b => b.id === tag.id));
            expect(importScripts([entry([...BASE, { id: second.id, category }])])).toEqual({ added: 0, skipped: 1 });
        });

        test('keeps Genre shares in 5% steps that sum to 100, as every builder does', () => {
            const tags = [
                { id: 'ADVENTURE', category: 'Genre', percent: 0.37 },
                { id: 'ACTION', category: 'Genre', percent: 0.37 },
                { id: 'DRAMA', category: 'Genre', percent: 0.26 },
                ...BASE.slice(1),
            ];
            importScripts([entry(tags)]);
            const shares = globalThis.pinnedScripts[0].tags.filter(tag => tag.category === 'Genre').map(tag => Math.round(tag.percent * 100));
            expect(shares.reduce((sum, share) => sum + share, 0)).toBe(100);
            shares.forEach(share => expect(share % 5).toBe(0));
        });

        // importScripts keeps its { added, skipped } shape (pinned by
        // script-library-import.test.js); the message counts the rest.
        test('the load message names scripts that were already in the library', () => {
            importScripts([entry(BASE, 'same')]);
            const result = importScripts([entry(BASE, 'same'), entry(BASE, 'other')]);
            expect(result).toEqual({ added: 1, skipped: 0 });
            expect(h.call('HACScriptLibrary.importSummary', 2, result).text)
                .toBe('Loaded 1 scripts. 1 was already in your library.');
        });

        test.each([
            [3, { added: 3, skipped: 0 }, 'Loaded 3 scripts.'],
            [4, { added: 2, skipped: 1 }, 'Loaded 2 scripts. Skipped 1 invalid entry. 1 was already in your library.'],
            [2, { added: 0, skipped: 2 }, 'No valid scripts found in file. Skipped 2 invalid entries.'],
            [2, { added: 0, skipped: 0 }, 'No new unique scripts found in file. 2 were already in your library.'],
        ])('the load message for %p entries and %p', (count, result, text) => {
            expect(h.call('HACScriptLibrary.importSummary', count, result).text).toBe(text);
        });
    });

    // Audit 2026-09-30: genres are sorted by share, and a tie kept the input
    // order, so the same script scored differently depending on which row was
    // added first (Graves prepends new rows; transfers keep theirs).
    describe('a script scores the same whatever order its genre rows are in', () => {
        const genreIds = () => Object.values(h.GAME_DATA.tags).filter(tag => tag.category === 'Genre').map(tag => tag.id);
        const rest = () => ['FANTASY_KINGDOM', 'PROTAGONIST_DARING_ADVENTURER', 'ANTAGONIST_EVIL_MONSTER',
            'THEME_TREASURE_HUNT', 'FINALE_PROTAGONIST_FINDS_TREASURE']
            .map(id => ({ id, category: h.GAME_DATA.tags[id].category, percent: 1 }));
        const evaluate = (genres) => {
            const result = h.call('HACScriptEvaluation.calculateScriptEvaluation',
                [...genres.map(([id, percent]) => ({ id, category: 'Genre', percent })), ...rest()]);
            return JSON.stringify({ bonuses: result.bonuses, scores: result.movieScores });
        };

        test('every pair of genres at 50/50', () => {
            const ids = genreIds();
            const problems = [];
            for (let a = 0; a < ids.length; a++) {
                for (let b = a + 1; b < ids.length; b++) {
                    const forward = evaluate([[ids[a], 0.5], [ids[b], 0.5]]);
                    const reverse = evaluate([[ids[b], 0.5], [ids[a], 0.5]]);
                    if (forward !== reverse) problems.push(`${ids[a]} / ${ids[b]}`);
                }
            }
            expect(problems).toEqual([]);
        });

        test('every 50/25/25 split, with the two 25s in either order', () => {
            const ids = genreIds();
            const problems = [];
            ids.forEach(top => ids.forEach(x => ids.forEach(y => {
                if (top === x || top === y || x >= y) return;
                const forward = evaluate([[top, 0.5], [x, 0.25], [y, 0.25]]);
                const reverse = evaluate([[top, 0.5], [y, 0.25], [x, 0.25]]);
                if (forward !== reverse) problems.push(`${top} + ${x} / ${y}`);
            })));
            expect(problems).toEqual([]);
        });
    });

    // TC24-000001 failed about one run in 24: a generated script stored
    // 8.910000000000002 while Graves showed 8.9, so the transfer check saw two
    // different scores. Movie scores carry one decimal (GAME_RULES.md), so the
    // stored score is the tenth the screen shows.
    describe('a stored movie score is the score shown', () => {
        const scores = (totalScore, com = 0, art = 0) => h.call(
            'HACMovieScoreEstimator.calculateMovieScores',
            { totalScore }, { com, art },
            Array.from({ length: 10 }, (_, i) => ({ id: `E${i}`, category: 'Theme & Event' }))
        );
        const shown = value => Number(h.call('HACScoreFormatting.formatMovieScore', value));

        test('0.9 x 9.9 is stored as 8.9, not 8.910000000000002', () => {
            expect(scores(0.9).commercial).toBe(8.9);
            expect(scores(0.9).artistic).toBe(8.9);
        });

        test('every stored score from 0 to the cap equals its display', () => {
            const problems = [];
            for (let total = 0; total <= 1.05; total += 0.0013) {
                const { commercial, artistic } = scores(total, 0.013, -0.027);
                [commercial, artistic].forEach(value => {
                    if (value !== shown(value)) problems.push(`${total.toFixed(4)}: ${value} shows ${shown(value)}`);
                });
            }
            expect(problems).toEqual([]);
        });
    });

    describe('Max Element Pool and Target Movie Score are one to one', () => {
        test.each([5, 6, 7, 8, 9, 10])('%p story elements <-> target %p', (n) => {
            expect(h.call('HACAppShell.poolSizeToTargetScore', n)).toBe(n);
            expect(h.call('HACAppShell.targetScoreToPoolSize', n)).toBe(n);
            expect(h.call('HACScriptGenerator.getRequiredElementCount', n)).toBe(n);
        });
    });

    describe('Script Lab generates the Max Element Pool', () => {
        const storyElementCount = (generated) =>
            h.call('HACGravesAnalysis.storyElementsOf', generated.tags).length;

        function installGeneratorDom({ pool, score }) {
            const noopElement = () => ({
                dataset: {},
                style: { setProperty() {}, removeProperty() {} },
                classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
                setAttribute() {}, removeAttribute() {}, getAttribute: () => null,
                appendChild() {}, removeChild() {}, remove() {},
                querySelector: () => null, querySelectorAll: () => [],
                addEventListener() {},
            });
            const generic = { classList: { add() {}, remove() {}, contains: () => false }, scrollIntoView() {} };
            const empty = { querySelectorAll: () => [] };
            const elements = {
                genCompInput: { value: '4' },
                genScoreInput: { value: String(score) },
                globalElementPoolInput: { value: String(pool) },
                globalElementPoolSlider: { value: String(pool) },
                'selectors-container-generator': empty,
                'selectors-container-excluded': empty,
                generatorResultsList: noopElement(),
                'results-generator': generic,
                generatorFeedbackMessage: { textContent: '', className: '', classList: generic.classList },
            };
            globalThis.document = {
                getElementById: (id) => (id in elements ? elements[id] : (id.startsWith('inputs-') ? null : generic)),
                createElement: noopElement,
                querySelector: () => null,
                querySelectorAll: () => [],
            };
        }

        test('pool 8 generates scripts with 8 story elements', async () => {
            // The pool control maps 8 to a target of 8 (GAME_RULES.md section 1).
            installGeneratorDom({ pool: 8, score: 8 });

            await h.callAsync('HACScriptGenerator.generateScripts');

            const generated = globalThis.generatedScriptsCache;
            expect(generated.length).toBeGreaterThan(0);
            generated.forEach(entry => expect(storyElementCount(entry)).toBe(8));
        }, 60000);

        // Owner, 2026-09-30: "you should always be able to select 5 to 10
        // elements." The class, not one sample: every pool, every mode, with
        // the target the pool control sets.
        describe.each([5, 6, 7, 8, 9, 10])('pool %p', (pool) => {
            const score = () => h.call('HACAppShell.poolSizeToTargetScore', pool);

            test('Generate Scripts builds exactly the pool', async () => {
                installGeneratorDom({ pool, score: score() });
                await h.callAsync('HACScriptGenerator.generateScripts');
                const generated = globalThis.generatedScriptsCache;
                expect(generated.length).toBeGreaterThan(0);
                generated.forEach(entry => expect(storyElementCount(entry)).toBe(pool));
            }, 60000);

            test.each(['artistic', 'commercial'])('Highest %s Appeal builds exactly the pool', async (kind) => {
                installGeneratorDom({ pool, score: score() });
                await h.callAsync('HACScriptGenerator.generateBestScoreScripts', kind);
                const generated = globalThis.generatedScriptsCache;
                expect(generated.length).toBeGreaterThan(0);
                generated.forEach(entry => expect(storyElementCount(entry)).toBe(pool));
            }, 60000);
        });

        test('Generate Scripts makes 15 scripts in one click', async () => {
            installGeneratorDom({ pool: 5, score: 6 });

            await h.callAsync('HACScriptGenerator.generateScripts');

            expect(globalThis.generatedScriptsCache).toHaveLength(15);
        }, 60000);
    });
});
