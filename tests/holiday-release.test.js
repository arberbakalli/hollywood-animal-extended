import { loadInstrumentedApp } from './helpers/legacyHarness.js';

/**
 * Holiday release bonuses on the distribution grid.
 *
 * GAME_DATA.holidays is loaded from data/Holidays.json and carries an averaged
 * per-demographic bonus percentage for each holiday. The Marketing panel ranks
 * holidays by summing those bonuses across the film's primary audience; that
 * sum is a ranking heuristic, not a multiplier, so the demand boost uses the
 * MEAN bonus across the audience instead - "your audience turns out N% harder"
 * rather than a figure that grows with how many demographics you reach.
 *
 * ASSUMPTION, unverified against the game: the boost applies to week 1 only.
 * Release timing plausibly moves the opening rather than the whole run, but no
 * extracted file states this. The matching feature scenario is marked
 * [unverified] and must not be promoted until it is watched in-game.
 */
describe('Holiday release', () => {
    let h;

    const bonusFor = (holiday, targets) =>
        h.call('HACMarketingPlanner.holidayBonusFor', holiday, targets);

    const HALLOWEEN = { name: 'Halloween', bonuses: { TM: 22, TF: 22, YM: 18, YF: 18, AM: 15, AF: 15 } };

    beforeAll(async () => {
        h = await loadInstrumentedApp();
    });

    describe('holidayBonusFor', () => {
        test('a single target audience gets that audience bonus', () => {
            expect(bonusFor(HALLOWEEN, ['TM'])).toBe(22);
        });

        test('several audiences average rather than accumulate', () => {
            // Summing would give 44 and would keep climbing with every extra
            // demographic, which is a ranking score, not a turnout multiplier.
            expect(bonusFor(HALLOWEEN, ['TM', 'AM'])).toBe(18.5);
        });

        test('an audience the holiday does not reach counts as zero, not as absent', () => {
            const valentines = { name: "Valentine's Day", bonuses: { TM: 7, AF: 0 } };
            expect(bonusFor(valentines, ['TM', 'AF'])).toBe(3.5);
        });

        test('no target audience means no bonus', () => {
            expect(bonusFor(HALLOWEEN, [])).toBe(0);
        });

        test('an unknown demographic contributes nothing', () => {
            expect(bonusFor(HALLOWEEN, ['NOT_A_DEMO'])).toBe(0);
        });

        test('every shipped holiday yields a number for a real audience', () => {
            const holidays = h.evaluate('GAME_DATA.holidays');
            expect(holidays.length).toBeGreaterThan(0);

            holidays.forEach(holiday => {
                const value = bonusFor(holiday, ['YF']);
                expect(Number.isFinite(value)).toBe(true);
                expect(value).toBeGreaterThanOrEqual(0);
            });
        });
    });

    describe('applied to weekly demand', () => {
        const demand = (score, holidayPercent) =>
            h.call('HACDistributionPlanner.weeklyDemandFor', score, {
                behemoth: false,
                boutique: false,
                artisticScore: 0,
                openingMultiplier: 1,
                holidayBonusPercent: holidayPercent
            });

        test('no holiday leaves the grid at the base curve', () => {
            expect(demand(5, 0)).toEqual([10000, 5000, 4000, 3200, 2560, 2048, 1638, 1310]);
        });

        test('a holiday lifts week 1 by its bonus', () => {
            expect(demand(5, 20)[0]).toBe(12000);
        });

        test('week 2 never moves, whatever the holiday', () => {
            const base = demand(5, 0);
            expect(demand(5, 22)[1]).toBe(base[1]);
            expect(demand(5, 50)[1]).toBe(base[1]);
        });

        test('weeks 3 and later are untouched, since they decay from week 2', () => {
            const base = demand(5, 0);
            const boosted = demand(5, 30);
            expect(boosted.slice(1)).toEqual(base.slice(1));
        });
    });
});

/**
 * The bonus percentages are now game-file sourced, not inferred.
 *
 * extractedFilesFromGameSourceOfTruth/Holidays.json is the game's own
 * Configs/Holidays.json. Its audienceBonuses are keyed `AUDIENCE|type`, where
 * type is 0 base, 1 artistic, 2 commercial. The app loads data/Holidays.json
 * and consolidates those three tiers into a single average percentage for the
 * marketing display and week-one distribution boost. A demographic absent from
 * a holiday scores zero.
 *
 * This pins GAME_DATA.holidays against those files. It does NOT settle how long the bonus
 * lasts: Holidays.json has no week dimension at all, so "week 1 only" remains
 * an assumption and stays marked unverified in tests/scenarios.
 */
describe('holiday bonuses match the extracted game config', () => {
    const APP_FILE = 'data/Holidays.json';
    const GAME_FILE = 'extractedFilesFromGameSourceOfTruth/Holidays.json';
    const AUDIENCES = ['TM', 'TF', 'YM', 'YF', 'AM', 'AF'];
    const TIERS = ['0', '1', '2'];

    // The app names them for the UI; the game file keys them by id.
    const GAME_KEY_BY_NAME = {
        "Valentine's Day": 'VALENTINE',
        'Independence Day': 'INDEPENDENCE_DAY',
        'Thanksgiving': 'THANKSGIVING',
        'Halloween': 'HALLOWEEN',
        'Christmas': 'CHRISTMAS',
        'Memorial Day': 'MEMORIAL_DAY'
    };

    let gameHolidays;
    let sourceHolidays;
    let appHolidays;

    beforeAll(async () => {
        const { readFile } = await import('node:fs/promises');
        sourceHolidays = JSON.parse(await readFile(APP_FILE, 'utf8'));
        gameHolidays = JSON.parse(await readFile(GAME_FILE, 'utf8'));
        appHolidays = (await loadInstrumentedApp()).GAME_DATA.holidays;
    });

    // The mean of the base, artistic and commercial tiers in the game config,
    // worked out by hand from Configs/Holidays.json (2026-09-29). Every mean is
    // a whole percent; the float sum of the tiers is not (7.000000000000001).
    const GAME_BONUSES = {
        VALENTINE:        { TM: 7,  TF: 15, YM: 12, YF: 30, AM: 15, AF: 0 },
        INDEPENDENCE_DAY: { TM: 9,  TF: 0,  YM: 13, YF: 5,  AM: 18, AF: 7 },
        THANKSGIVING:     { TM: 7,  TF: 7,  YM: 15, YF: 15, AM: 22, AF: 22 },
        HALLOWEEN:        { TM: 22, TF: 22, YM: 18, YF: 18, AM: 15, AF: 15 },
        MEMORIAL_DAY:     { TM: 9,  TF: 0,  YM: 16, YF: 5,  AM: 18, AF: 7 },
        CHRISTMAS:        { TM: 15, TF: 15, YM: 15, YF: 15, AM: 10, AF: 10 },
    };

    test('the hand-worked table covers every audience and every tier of the game file', () => {
        expect(Object.keys(GAME_BONUSES).sort()).toEqual(Object.keys(gameHolidays).sort());
        for (const key of Object.keys(GAME_BONUSES)) {
            expect(Object.keys(GAME_BONUSES[key]).sort()).toEqual([...AUDIENCES].sort());
            const tierKeys = Object.keys(gameHolidays[key].audienceBonuses);
            tierKeys.forEach(tierKey => expect(TIERS).toContain(tierKey.split('|')[1]));
        }
    });

    test('data/Holidays.json carries every extracted holiday, including Memorial Day', () => {
        expect(Object.keys(sourceHolidays).sort()).toEqual(Object.keys(gameHolidays).sort());
        expect(sourceHolidays.MEMORIAL_DAY).toBeDefined();
    });

    test('every loaded holiday exists in the game config', () => {
        const missing = appHolidays
            .map(holiday => holiday.name)
            .filter(name => !gameHolidays[GAME_KEY_BY_NAME[name]]);

        expect(missing).toEqual([]);
    });

    test.each(Object.keys(GAME_KEY_BY_NAME))('%s carries the game config bonuses', (name) => {
        const app = appHolidays.find(holiday => holiday.name === name);
        expect(app).toBeDefined();
        expect(app.name).toBe(name);
        expect(app.bonuses).toBeDefined();
        expect(typeof app.bonuses).toBe('object');
        expect(app.tierBonuses).toBeDefined();
        expect(app.bonusRanges).toBeDefined();

        const shipped = Object.fromEntries(
            AUDIENCES.map(audience => [audience, app.bonuses[audience] || 0])
        );

        expect(shipped).toEqual(GAME_BONUSES[GAME_KEY_BY_NAME[name]]);
    });

    // Owner ruling 2026-09-29: holidays are listed in calendar order. All six
    // fall in different months (Holidays.json month field).
    test('holidays are listed in calendar order', () => {
        expect(appHolidays.map(holiday => holiday.id)).toEqual([
            'VALENTINE', 'MEMORIAL_DAY', 'INDEPENDENCE_DAY', 'HALLOWEEN', 'THANKSGIVING', 'CHRISTMAS',
        ]);
    });

    test('tier metadata preserves the game-file base, artistic and commercial values', () => {
        const valentines = appHolidays.find(holiday => holiday.name === "Valentine's Day");

        expect(valentines.tierBonuses.YF).toEqual({
            base: 30,
            artistic: 30,
            commercial: 30
        });
        expect(valentines.bonusRanges.YF).toEqual({ min: 30, max: 30 });
    });
});
