import { describe, test, expect, beforeAll, afterEach } from '@jest/globals';
import { readFile } from 'node:fs/promises';
import { loadInstrumentedApp } from './helpers/legacyHarness.js';

/**
 * The Marketing tab's Audience Compatibility table, rendered by the real
 * HACAudienceCompatibility.updateCompatibilityDisplay into a stand-in container.
 */
const GAME_ORDER = ['GENRE', 'SETTING', 'PROTAGONIST', 'ANTAGONIST', 'SUPPORTING CHARACTER', 'THEME & EVENT', 'FINALE'];

describe('Audience Compatibility table', () => {
    let h;
    let css;

    beforeAll(async () => {
        h = await loadInstrumentedApp();
        // The harness script list omits this module; importing it attaches
        // HACAudienceCompatibility to the same globalThis, as its <script> tag does.
        await import('../src/marketing/audienceCompatibility.js');
        css = await readFile('styles.css', 'utf8');
    });

    afterEach(() => {
        h.resetBrowserState();
    });

    function render({ selected = [], excluded = [] } = {}) {
        return h.evaluate(`(() => {
            const selected = ${JSON.stringify(selected)};
            const excluded = ${JSON.stringify(excluded)};
            const table = { innerHTML: '' };
            const panel = { classList: { add() {}, remove() {} } };
            const targeted = {
                querySelectorAll(selector) {
                    const category = (selector.match(/data-category="([^"]+)"/) || [])[1];
                    return selected
                        .filter(id => GAME_DATA.tags[id].category === category)
                        .map(id => ({ value: id }));
                },
            };
            document = {
                getElementById(id) {
                    if (id === 'compatibilityTableContainer') return table;
                    if (id === 'audience-compatibility-panel') return panel;
                    if (id === 'selectors-container-targeted') return targeted;
                    return null;
                },
            };
            const realLoad = HACExclusionStore.loadExclusions;
            HACExclusionStore.loadExclusions = () => excluded.map(id => ({ id }));
            try {
                HACAudienceCompatibility.updateCompatibilityDisplay();
            } finally {
                HACExclusionStore.loadExclusions = realLoad;
            }
            return table.innerHTML;
        })()`);
    }

    const rowsOf = (html) => [...html.matchAll(/<tr><td class="([^"]+)">([^<]+)<\/td>/g)]
        .map(([, classes, name]) => ({ classes: classes.split(/\s+/), name }));
    const headersOf = (html) => [...html.matchAll(/class="compatibility-category-header [^"]*">([^<]+)<\/th>/g)]
        .map(m => m[1]);

    test('with nothing selected it lists all 250 elements under headers in game order', () => {
        const html = render();

        expect(headersOf(html)).toEqual(GAME_ORDER);
        expect(rowsOf(html)).toHaveLength(250);
    });

    test('an excluded element is left out, and only that one', () => {
        const all = rowsOf(render());
        const withBan = rowsOf(render({ excluded: ['ACTION'] }));

        expect(withBan).toHaveLength(all.length - 1);
        expect(withBan.map(row => row.name)).not.toContain('Action');
        expect(all.map(row => row.name)).toContain('Action');
    });

    test('with selections it lists only those elements, without category headers', () => {
        const html = render({ selected: ['ACTION', 'PROTAGONIST_COWBOY'] });

        expect(rowsOf(html).map(row => row.name).sort()).toEqual(['Action', 'Cowboy']);
        expect(headersOf(html)).toEqual([]);
    });

    test('every Genre row carries its own class, and each of the 11 has a distinct colour in styles.css', () => {
        const genreRows = rowsOf(render()).filter(row => row.classes.includes('category-genre'));
        expect(genreRows).toHaveLength(11);

        const backgrounds = genreRows.map(row => {
            const genreClass = row.classes.find(c => c.startsWith('genre-'));
            expect(genreClass).toBeDefined();
            const rule = css.match(new RegExp(`\\.element-name\\.${genreClass}\\b[^{]*\\{([^}]*)\\}`));
            expect(rule).not.toBeNull();
            return rule[1].match(/background:\s*([^;]+);/)[1].trim();
        });
        expect(new Set(backgrounds).size).toBe(11);
    });

    test('every category class the table emits is styled', () => {
        const classes = new Set(rowsOf(render()).flatMap(row => row.classes).filter(c => c.startsWith('category-')));

        expect(classes.size).toBe(7);
        classes.forEach(cls => expect(css).toMatch(new RegExp(`\\.element-name\\.${cls}\\s*\\{`)));
    });

    test('each audience column is titled with the game name for that audience', () => {
        const titles = [...render().matchAll(/<th scope="col" title="([^"]+)">(\w\w)<\/th>/g)]
            .map(([, title, code]) => [code, title]);

        expect(titles).toEqual([
            ['TF', 'Girls'], ['TM', 'Boys'], ['YF', 'Young women'], ['YM', 'Young men'], ['AF', 'Women'], ['AM', 'Men'],
        ]);
    });

    // Locked in the order the owner reported (2026-09-29): story roles first,
    // Genre and Setting after them.
    test('with selections, rows follow the game category order, not the order they were locked in', () => {
        const html = render({
            selected: [
                'PROTAGONIST_COWBOY', 'ANTAGONIST_TRIBAL_CHIEF', 'THEME_TREASURE_HUNT', 'EVENTS_SHOOTOUT',
                'ACTION', 'WILD_WEST', 'FINALE_PROTAGONIST_FINDS_TREASURE',
            ],
        });

        expect(rowsOf(html).map(row => row.name)).toEqual([
            'Action', 'Wild West', 'Cowboy', 'Tribal Chief', 'Treasure Hunt', 'Shootout', 'Protagonist Finds Treasure',
        ]);
    });

    // Owner ruling 2026-09-29: the Genre category itself is gold, as its
    // selector label is. Individual genres keep their own colours.
    test('the Genre category colour is the gold its selector label uses', () => {
        const label = css.match(/\.category-group\[data-category="Genre"\]\s*\.category-label\s*\{\s*color:\s*var\((--[\w-]+)\)/);
        expect(label).not.toBeNull();
        expect(label[1]).toBe('--accent');

        const token = css.match(/--cat-genre:\s*([^;]+);/);
        expect(token).not.toBeNull();
        expect(token[1].trim()).toBe('var(--accent)');
    });

    test('the Genre card in the lock panel carries the gold, as every other card carries its colour', () => {
        expect(css).toMatch(/\.category-group\[data-category="Genre"\]\s*\{\s*--category-color:\s*var\(--cat-genre\);/);
        const borderList = css.match(/((?:\.category-group\[data-category="[^"]+"\],?\s*)+)\{\s*border-left-color:\s*color-mix\(in srgb, var\(--category-color\)/);
        expect(borderList).not.toBeNull();
        expect(borderList[1]).toContain('[data-category="Genre"]');
    });

    test.each([
        ['genre', '--cat-genre'],
        ['setting', '--cat-setting'],
        ['protagonist', '--cat-protagonist'],
        ['antagonist', '--cat-antagonist'],
        ['supporting-character', '--cat-supporting'],
        ['theme-event', '--cat-theme-event'],
        ['finale', '--cat-finale'],
    ])('the Best Matches %s pair label wears its category colour', (slug, token) => {
        expect(css).toMatch(new RegExp(`\\.best-match-pair-label\\.${slug}\\s*\\{\\s*color:\\s*var\\(${token}\\);`));
    });

    // Owner ruling 2026-09-29: the legend's Neutral square is grey, like the
    // 0.0 cells it stands for.
    test('each legend swatch has the hue of the cells it describes', () => {
        const rgbOf = rule => (rule.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/) || []).slice(1, 4).join(',');
        const block = selector => {
            const m = css.match(new RegExp(`${selector.replace(/\./g, '\\.')}\\s*\\{([^}]*)\\}`));
            expect(m).not.toBeNull();
            return m[1].match(/background:\s*([^;]+);/)[1];
        };
        ['neutral', 'bad', 'disastrous'].forEach(band => {
            expect(rgbOf(block(`.legend-swatch.${band}`))).toBe(rgbOf(block(`.score-cell.${band}`)));
        });
    });

    // Genre rows use one colour per genre (asserted above). Every other
    // category must wear the same colour in the table as in its selector.
    test.each([
        ['Setting', 'category-setting'],
        ['Protagonist', 'category-protagonist'],
        ['Antagonist', 'category-antagonist'],
        ['Supporting Character', 'category-supporting-character'],
        ['Theme & Event', 'category-theme-event'],
        ['Finale', 'category-finale'],
    ])('%s rows use the colour its selector uses', (category, cls) => {
        const selectorRule = css.match(new RegExp(
            `\\.category-group\\[data-category="${category}"\\]\\s*\\{\\s*--category-color:\\s*var\\((--[\\w-]+)\\)`));
        expect(selectorRule).not.toBeNull();
        const token = selectorRule[1];

        const tableRule = css.match(new RegExp(`\\.element-name\\.${cls}\\s*\\{([^}]*)\\}`));
        expect(tableRule).not.toBeNull();
        expect(tableRule[1]).toMatch(new RegExp(`(^|[;\\s])color:\\s*var\\(${token}\\)`));
        expect(tableRule[1]).toMatch(new RegExp(`border-left:\\s*3px solid var\\(${token}\\)`));
    });
});
