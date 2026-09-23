import { loadInstrumentedApp } from './helpers/legacyHarness.js';

/**
 * Holiday release bonuses on the distribution grid.
 *
 * GAME_DATA.holidays carries a per-demographic bonus percentage for each
 * holiday (data.js:80). The Marketing panel already ranks holidays by summing
 * those bonuses across the film's primary audience; that sum is a ranking
 * heuristic, not a multiplier, so the demand boost uses the MEAN bonus across
 * the audience instead — "your audience turns out N% harder" rather than a
 * figure that grows with how many demographics you happen to reach.
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
 * type is 0 base, 1 artistic, 2 commercial, and all three carry the same value
 * per demographic — so type 0 is the number. A demographic absent from a
 * holiday scores zero.
 *
 * This pins data.js against that file. It does NOT settle how long the bonus
 * lasts: Holidays.json has no week dimension at all, so "week 1 only" remains
 * an assumption and stays marked unverified in tests/scenarios.
 */
describe('holiday bonuses match the extracted game config', () => {
    const GAME_FILE = 'extractedFilesFromGameSourceOfTruth/Holidays.json';
    const AUDIENCES = ['TM', 'TF', 'YM', 'YF', 'AM', 'AF'];

    // data.js names them for the UI; the game file keys them by id.
    const GAME_KEY_BY_NAME = {
        "Valentine's Day": 'VALENTINE',
        'Independence Day': 'INDEPENDENCE_DAY',
        'Thanksgiving': 'THANKSGIVING',
        'Halloween': 'HALLOWEEN',
        'Christmas': 'CHRISTMAS',
        'Memorial Day': 'MEMORIAL_DAY'
    };

    let gameHolidays;
    let appHolidays;

    beforeAll(async () => {
        const { readFile } = await import('node:fs/promises');
        gameHolidays = JSON.parse(await readFile(GAME_FILE, 'utf8'));
        appHolidays = (await loadInstrumentedApp()).GAME_DATA.holidays;
    });

    const gameBonuses = (key) => {
        const bonuses = gameHolidays[key].audienceBonuses;
        return Object.fromEntries(AUDIENCES.map(audience => {
            const raw = bonuses[`${audience}|0`];
            return [audience, raw === undefined ? 0 : Math.round(parseFloat(raw) * 100)];
        }));
    };

    test('every holiday in data.js exists in the game config', () => {
        const missing = appHolidays
            .map(holiday => holiday.name)
            .filter(name => !gameHolidays[GAME_KEY_BY_NAME[name]]);

        expect(missing).toEqual([]);
    });

    test.each(Object.keys(GAME_KEY_BY_NAME))('%s carries the game config bonuses', (name) => {
        const app = appHolidays.find(holiday => holiday.name === name);
        expect(app).toBeDefined();

        const shipped = Object.fromEntries(
            AUDIENCES.map(audience => [audience, app.bonuses[audience] || 0])
        );

        expect(shipped).toEqual(gameBonuses(GAME_KEY_BY_NAME[name]));
    });
});
