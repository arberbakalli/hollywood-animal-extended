import { describe, test, expect, beforeAll, afterEach } from '@jest/globals';
import { loadInstrumentedApp } from './helpers/legacyHarness.js';

/**
 * Element freshness (docs/GAME_RULES.md section 9, owner rulings 2026-09-29).
 *
 * Each story element is Fresh (x1), Stale (x0.5) or Rotten (x0); Genre and
 * Setting have no freshness. A script takes its worst element's state.
 * Generation fills free slots freshest-first and results rank by freshness
 * before score. These drive the shipped HACFreshness block and generator.
 */
const memoryStorage = () => {
    const data = new Map();
    return {
        data,
        getItem: key => (data.has(key) ? data.get(key) : null),
        setItem: (key, value) => data.set(key, String(value)),
        removeItem: key => data.delete(key)
    };
};

describe('Freshness — states and categories', () => {
    let h;

    beforeAll(async () => {
        h = await loadInstrumentedApp();
    });

    test('the three states carry the game multipliers, in cycle order', () => {
        expect(h.evaluate('HACFreshness.FRESHNESS_STATES')).toEqual([
            { state: 'fresh', label: 'Fresh', multiplier: 1 },
            { state: 'stale', label: 'Stale', multiplier: 0.5 },
            { state: 'rotten', label: 'Rotten', multiplier: 0 }
        ]);
    });

    test.each([
        ['fresh', 'stale'],
        ['stale', 'rotten'],
        ['rotten', 'fresh']
    ])('one click moves %s to %s', (from, to) => {
        expect(h.call('HACFreshness.nextState', from)).toBe(to);
    });

    test.each(['Protagonist', 'Antagonist', 'Supporting Character', 'Theme & Event', 'Finale'])(
        '%s has freshness', category => {
            expect(h.call('HACFreshness.hasFreshness', category)).toBe(true);
        });

    // Owner, confirmed from play: Genre and Setting can be used as often as you like.
    test.each(['Genre', 'Setting', 'Settings', undefined])('%s has no freshness', category => {
        expect(h.call('HACFreshness.hasFreshness', category)).toBe(false);
    });
});

describe('Freshness — the saved state list', () => {
    let h;

    beforeAll(async () => {
        h = await loadInstrumentedApp();
    });

    const createStore = (storage, knownTags) => h.call('HACFreshness.createFreshnessStore', storage, knownTags);
    const KNOWN = {
        PROTAGONIST_COWBOY: { category: 'Protagonist' },
        ANTAGONIST_BANDIT: { category: 'Antagonist' },
        GENRE_ACTION: { category: 'Genre' },
        SETTING_WILD_WEST: { category: 'Setting' }
    };

    test('every element starts Fresh', () => {
        expect(createStore(memoryStorage(), KNOWN).getState('PROTAGONIST_COWBOY')).toBe('fresh');
    });

    test('a state survives a new store on the same storage', () => {
        const storage = memoryStorage();
        createStore(storage, KNOWN).setState('PROTAGONIST_COWBOY', 'stale');

        expect(createStore(storage, KNOWN).getState('PROTAGONIST_COWBOY')).toBe('stale');
    });

    test('cycle walks Fresh, Stale, Rotten and back to Fresh', () => {
        const store = createStore(memoryStorage(), KNOWN);

        expect([1, 2, 3].map(() => store.cycle('PROTAGONIST_COWBOY'))).toEqual(['stale', 'rotten', 'fresh']);
    });

    test('Fresh is not stored, so the list holds only worn-out elements', () => {
        const storage = memoryStorage();
        const store = createStore(storage, KNOWN);
        store.setState('PROTAGONIST_COWBOY', 'rotten');
        store.setState('PROTAGONIST_COWBOY', 'fresh');

        expect(store.getStates()).toEqual({});
        expect(storage.data.has('hac.freshnessStates.v1')).toBe(false);
    });

    test('Genre and Setting never take a state', () => {
        const store = createStore(memoryStorage(), KNOWN);
        store.setState('GENRE_ACTION', 'rotten');
        store.setState('SETTING_WILD_WEST', 'stale');

        expect(store.getStates()).toEqual({});
        expect(store.getState('GENRE_ACTION')).toBe('fresh');
    });

    test('an unknown state is ignored', () => {
        const store = createStore(memoryStorage(), KNOWN);
        store.setState('PROTAGONIST_COWBOY', 'mouldy');

        expect(store.getStates()).toEqual({});
    });

    test('clearMany returns the named elements to Fresh', () => {
        const store = createStore(memoryStorage(), KNOWN);
        store.setState('PROTAGONIST_COWBOY', 'stale');
        store.setState('ANTAGONIST_BANDIT', 'rotten');

        store.clearMany(['PROTAGONIST_COWBOY']);

        expect(store.getStates()).toEqual({ ANTAGONIST_BANDIT: 'rotten' });
    });

    test('getStates hands out a copy, not the live list', () => {
        const store = createStore(memoryStorage(), KNOWN);
        store.setState('PROTAGONIST_COWBOY', 'stale');

        store.getStates().PROTAGONIST_COWBOY = 'rotten';

        expect(store.getState('PROTAGONIST_COWBOY')).toBe('stale');
    });

    test('subscribers hear each change with the element and its new state', () => {
        const store = createStore(memoryStorage(), KNOWN);
        const heard = [];
        store.subscribe((id, state) => heard.push([id, state]));

        store.cycle('PROTAGONIST_COWBOY');
        store.clearMany(['PROTAGONIST_COWBOY']);

        expect(heard).toEqual([['PROTAGONIST_COWBOY', 'stale'], ['PROTAGONIST_COWBOY', 'fresh']]);
    });

    test.each([
        ['not JSON', '{oops'],
        ['an array', '["stale"]'],
        ['null', 'null']
    ])('stored data that is %s loads as all Fresh', (label, raw) => {
        const storage = memoryStorage();
        storage.setItem('hac.freshnessStates.v1', raw);

        expect(createStore(storage, KNOWN).getStates()).toEqual({});
    });

    test('unknown elements, Genre, Setting and bad states are dropped on load', () => {
        const storage = memoryStorage();
        storage.setItem('hac.freshnessStates.v1', JSON.stringify({
            PROTAGONIST_COWBOY: 'stale',
            NOT_A_TAG: 'rotten',
            GENRE_ACTION: 'rotten',
            ANTAGONIST_BANDIT: 'mouldy'
        }));

        expect(createStore(storage, KNOWN).getStates()).toEqual({ PROTAGONIST_COWBOY: 'stale' });
    });

    test('a storage that throws still keeps states for the session', () => {
        const throwing = {
            getItem() { throw new Error('blocked'); },
            setItem() { throw new Error('blocked'); },
            removeItem() { throw new Error('blocked'); }
        };
        const store = createStore(throwing, KNOWN);

        store.setState('PROTAGONIST_COWBOY', 'rotten');

        expect(store.getState('PROTAGONIST_COWBOY')).toBe('rotten');
    });

    test('no storage at all still keeps states for the session', () => {
        const store = createStore(null, KNOWN);

        store.setState('PROTAGONIST_COWBOY', 'rotten');

        expect(store.getState('PROTAGONIST_COWBOY')).toBe('rotten');
    });
});

describe('Freshness — a script takes its worst element', () => {
    let h;
    let store;

    beforeAll(async () => {
        h = await loadInstrumentedApp();
        store = h.call('HACFreshness.createFreshnessStore', null, h.GAME_DATA.tags);
    });

    const script = ids => ids.map(id => ({ id, category: h.GAME_DATA.tags[id].category }));
    const worst = ids => h.call('HACFreshness.scriptFreshness', script(ids), store).state;

    afterEach(() => store.clearMany(Object.keys(store.getStates())));

    test('all Fresh is Fresh', () => {
        expect(worst(['PROTAGONIST_COWBOY', 'ANTAGONIST_BANDIT'])).toBe('fresh');
    });

    test('one Stale element makes the script Stale', () => {
        store.setState('ANTAGONIST_BANDIT', 'stale');
        expect(worst(['PROTAGONIST_COWBOY', 'ANTAGONIST_BANDIT'])).toBe('stale');
    });

    test('two Stale elements are still x0.5, not x0.25', () => {
        store.setState('PROTAGONIST_COWBOY', 'stale');
        store.setState('ANTAGONIST_BANDIT', 'stale');

        const result = h.call('HACFreshness.scriptFreshness', script(['PROTAGONIST_COWBOY', 'ANTAGONIST_BANDIT']), store);

        expect(result.multiplier).toBe(0.5);
    });

    test('any Rotten element makes the script Rotten', () => {
        store.setState('PROTAGONIST_COWBOY', 'stale');
        store.setState('ANTAGONIST_BANDIT', 'rotten');
        expect(worst(['PROTAGONIST_COWBOY', 'ANTAGONIST_BANDIT'])).toBe('rotten');
    });
});

describe('Freshness — results rank by freshness before score', () => {
    let h;

    beforeAll(async () => {
        h = await loadInstrumentedApp();
    });

    const rank = scripts => h.call(
        'HACFreshness.rankByFreshness',
        scripts,
        (a, b) => b.score - a.score,
        script => script.state
    ).map(script => script.name);

    test('an all-Fresh script beats a higher-scoring Stale one', () => {
        expect(rank([
            { name: 'stale-high', state: 'stale', score: 9 },
            { name: 'fresh-low', state: 'fresh', score: 4 }
        ])).toEqual(['fresh-low', 'stale-high']);
    });

    test('Stale beats Rotten, and score orders within a state', () => {
        expect(rank([
            { name: 'rotten', state: 'rotten', score: 10 },
            { name: 'stale-low', state: 'stale', score: 3 },
            { name: 'fresh-mid', state: 'fresh', score: 6 },
            { name: 'stale-high', state: 'stale', score: 8 },
            { name: 'fresh-high', state: 'fresh', score: 7 }
        ])).toEqual(['fresh-high', 'fresh-mid', 'stale-high', 'stale-low', 'rotten']);
    });
});

describe('Freshness — generation fills free slots freshest-first', () => {
    let h;
    let store;
    let protagonists;

    beforeAll(async () => {
        h = await loadInstrumentedApp();
        await h.ensureCompatibilityLoaded();
        store = h.call('HACFreshness.freshnessStore');
        protagonists = Object.values(h.GAME_DATA.tags)
            .filter(tag => tag.category === 'Protagonist')
            .map(tag => tag.id);
    });

    afterEach(() => store.clearMany(Object.keys(store.getStates())));

    const pickProtagonist = () => h.call('HACScriptGenerationEngine.getRandomTagByCategory', 'Protagonist', [], new Set()).id;

    test('with no states recorded, any Protagonist can be picked', () => {
        const picks = new Set(Array.from({ length: 200 }, pickProtagonist));
        expect(picks.size).toBeGreaterThan(5);
    });

    test('the one Fresh Protagonist is picked while every other is Stale', () => {
        const [keep, ...rest] = protagonists;
        rest.forEach(id => store.setState(id, 'stale'));

        const picks = new Set(Array.from({ length: 40 }, pickProtagonist));

        expect([...picks]).toEqual([keep]);
    });

    test('Stale is picked before Rotten when nothing is Fresh', () => {
        const [stale, ...rest] = protagonists;
        store.setState(stale, 'stale');
        rest.forEach(id => store.setState(id, 'rotten'));

        const picks = new Set(Array.from({ length: 40 }, pickProtagonist));

        expect([...picks]).toEqual([stale]);
    });

    test('a Rotten element is still used when it is the only one left', () => {
        protagonists.forEach(id => store.setState(id, 'rotten'));

        expect(protagonists).toContain(pickProtagonist());
    });

    test('Genre and Setting picks ignore freshness entirely', () => {
        const picks = new Set(Array.from({ length: 200 }, () =>
            h.call('HACScriptGenerationEngine.getRandomTagByCategory', 'Setting', [], new Set()).id));
        expect(picks.size).toBeGreaterThan(3);
    });

    test('a generated script avoids a worn-out element when a Fresh one fits', () => {
        const [keep, ...rest] = protagonists;
        rest.forEach(id => store.setState(id, 'rotten'));

        for (let run = 0; run < 10; run++) {
            const script = h.call('HACScriptGenerationEngine.runGenerationAlgorithm', 3.0, 5, [], []);
            expect(script.tags.find(tag => tag.category === 'Protagonist').id).toBe(keep);
        }
    });

    test('a locked Rotten element is never replaced', () => {
        const [locked] = protagonists;
        store.setState(locked, 'rotten');
        const fixed = [{ id: locked, category: 'Protagonist', percent: 1 }];

        for (let run = 0; run < 10; run++) {
            const script = h.call('HACScriptGenerationEngine.runGenerationAlgorithm', 3.0, 5, fixed, []);
            expect(script.tags.filter(tag => tag.category === 'Protagonist').map(tag => tag.id)).toEqual([locked]);
        }
    });
});
