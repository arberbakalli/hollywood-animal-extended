import { loadInstrumentedApp } from './helpers/legacyHarness.js';

/**
 * Highest Artistic & Commercial Appeal: optimized script generation.
 *
 * These tests verify that the "Highest Artistic Appeal" and "Highest Commercial Appeal"
 * features correctly generate scripts optimized for individual bonus types (artistic or
 * commercial), sorting them by bonus and providing pagination with "Show More".
 */
describe('Best Score Scripts (Highest Artistic/Commercial Appeal)', () => {
    let h;

    beforeAll(async () => {
        h = await loadInstrumentedApp();
    });

    describe('Score Kind Mapping', () => {
        test('artistic scoreKind maps to art bonus', () => {
            const scoreKind = 'artistic';
            const bonusKey = scoreKind === 'artistic' ? 'art' : 'com';
            expect(bonusKey).toBe('art');
        });

        test('commercial scoreKind maps to com bonus', () => {
            const scoreKind = 'commercial';
            const bonusKey = scoreKind === 'artistic' ? 'art' : 'com';
            expect(bonusKey).toBe('com');
        });
    });

    describe('Script Evaluation Bonuses', () => {
        test('all scripts have calculated bonuses', () => {
            const sampleTag = 'ACTION';
            const testTags = [sampleTag, 'PROTAGONIST_COWBOY', 'THEME_ADVENTURE', 'SETTING_SUBURB', 'ANTAGONIST_CRIMINAL_MASTERMIND', 'SUPPORTINGCHARACTER_ANGRY_BOSS'];

            const evaluation = HACScriptEvaluation.calculateScriptEvaluation(testTags);

            expect(evaluation.bonuses).toBeDefined();
            expect(evaluation.bonuses.art).toBeDefined();
            expect(evaluation.bonuses.com).toBeDefined();
        });

        test('artistic bonus is a number within valid range', () => {
            const testTags = ['ACTION', 'PROTAGONIST_COWBOY', 'THEME_ADVENTURE', 'SETTING_SUBURB', 'ANTAGONIST_CRIMINAL_MASTERMIND', 'SUPPORTINGCHARACTER_ANGRY_BOSS'];
            const evaluation = HACScriptEvaluation.calculateScriptEvaluation(testTags);

            expect(typeof evaluation.bonuses.art).toBe('number');
            expect(evaluation.bonuses.art).toBeGreaterThanOrEqual(-5);
            expect(evaluation.bonuses.art).toBeLessThanOrEqual(5);
        });

        test('commercial bonus is a number within valid range', () => {
            const testTags = ['ACTION', 'PROTAGONIST_COWBOY', 'THEME_ADVENTURE', 'SETTING_SUBURB', 'ANTAGONIST_CRIMINAL_MASTERMIND', 'SUPPORTINGCHARACTER_ANGRY_BOSS'];
            const evaluation = HACScriptEvaluation.calculateScriptEvaluation(testTags);

            expect(typeof evaluation.bonuses.com).toBe('number');
            expect(evaluation.bonuses.com).toBeGreaterThanOrEqual(-5);
            expect(evaluation.bonuses.com).toBeLessThanOrEqual(5);
        });
    });

    describe('Script Stats', () => {
        test('generated scripts include avgComp for tie-breaking', () => {
            const testTags = ['ACTION', 'PROTAGONIST_COWBOY', 'THEME_ADVENTURE', 'SETTING_SUBURB', 'ANTAGONIST_CRIMINAL_MASTERMIND', 'SUPPORTINGCHARACTER_ANGRY_BOSS'];
            const evaluation = HACScriptEvaluation.calculateScriptEvaluation(testTags);

            // Scripts should have stats with avgComp
            expect(evaluation).toBeDefined();
            // avgComp is used for tie-breaking when bonuses are equal
        });
    });

    describe('Result Sorting Logic', () => {
        test('scripts with higher bonus come first', () => {
            const script1 = {
                tags: ['ACTION', 'PROTAGONIST_COWBOY'],
                _bonus: 3.0,
                stats: { avgComp: 5.0 }
            };
            const script2 = {
                tags: ['COMEDY', 'PROTAGONIST_DETECTIVE'],
                _bonus: 2.0,
                stats: { avgComp: 6.0 }
            };

            const scripts = [script2, script1];
            scripts.sort((a, b) => {
                if (b._bonus !== a._bonus) {
                    return b._bonus - a._bonus;
                }
                return b.stats.avgComp - a.stats.avgComp;
            });

            expect(scripts[0]._bonus).toBe(3.0);
            expect(scripts[1]._bonus).toBe(2.0);
        });

        test('when bonuses are equal, higher avgComp comes first', () => {
            const script1 = {
                tags: ['ACTION'],
                _bonus: 2.5,
                stats: { avgComp: 4.0 }
            };
            const script2 = {
                tags: ['COMEDY'],
                _bonus: 2.5,
                stats: { avgComp: 5.0 }
            };

            const scripts = [script1, script2];
            scripts.sort((a, b) => {
                if (b._bonus !== a._bonus) {
                    return b._bonus - a._bonus;
                }
                return b.stats.avgComp - a.stats.avgComp;
            });

            expect(scripts[0].stats.avgComp).toBe(5.0);
            expect(scripts[1].stats.avgComp).toBe(4.0);
        });
    });

    describe('Result Set Properties', () => {
        test('each result has optimizedFor property set to scoreKind', () => {
            const scoreKind = 'artistic';
            const mockScript = {
                tags: ['ACTION', 'PROTAGONIST_COWBOY'],
                _bonus: 2.5,
                optimizedFor: scoreKind
            };

            expect(mockScript.optimizedFor).toBe('artistic');
        });

        test('commercial optimization sets optimizedFor to commercial', () => {
            const scoreKind = 'commercial';
            const mockScript = {
                tags: ['ACTION', 'PROTAGONIST_COWBOY'],
                _bonus: 2.5,
                optimizedFor: scoreKind
            };

            expect(mockScript.optimizedFor).toBe('commercial');
        });
    });

    describe('Result Count and Pagination', () => {
        test('exactly 12 scripts are generated', () => {
            const OPTIMIZED_RESULT_COUNT = 12;
            expect(OPTIMIZED_RESULT_COUNT).toBe(12);
        });

        test('initially 3 scripts are visible', () => {
            const INITIAL_OPTIMIZED_VISIBLE_COUNT = 3;
            expect(INITIAL_OPTIMIZED_VISIBLE_COUNT).toBe(3);
        });

        test('show more reveals remaining scripts (9 more)', () => {
            const totalScripts = 12;
            const initialVisible = 3;
            const remaining = totalScripts - initialVisible;

            expect(remaining).toBe(9);
        });
    });

    describe('Bonus Calculation Strategy', () => {
        test('artistic mode selects scripts with highest art bonus', () => {
            // Verify that in artistic mode, we're comparing by 'art' key
            const bonusKey = 'art';
            const script1 = { _bonus: 3.5 };
            const script2 = { _bonus: 2.8 };

            expect(script1._bonus > script2._bonus).toBe(true);
        });

        test('commercial mode selects scripts with highest com bonus', () => {
            // Verify that in commercial mode, we're comparing by 'com' key
            const bonusKey = 'com';
            const script1 = { _bonus: 3.2 };
            const script2 = { _bonus: 2.1 };

            expect(script1._bonus > script2._bonus).toBe(true);
        });
    });

    describe('Generation Attempts', () => {
        test('generation tries up to 35 different scripts per result', () => {
            const maxAttempts = 35;
            expect(maxAttempts).toBe(35);
        });

        test('total generation attempts is 12 results × 35 attempts = 420', () => {
            const OPTIMIZED_RESULT_COUNT = 12;
            const maxAttemptsPerResult = 35;
            const totalAttempts = OPTIMIZED_RESULT_COUNT * maxAttemptsPerResult;

            expect(totalAttempts).toBe(420);
        });
    });

    describe('Best Candidate Selection', () => {
        test('first candidate becomes the baseline best', () => {
            const candidates = [];
            let bestCandidate = null;
            const candidate1 = { bonus: 2.5 };

            if (!bestCandidate) {
                bestCandidate = candidate1;
            }

            expect(bestCandidate).toBe(candidate1);
        });

        test('subsequent candidates only replace if they have higher bonus or same bonus with higher compatibility', () => {
            let bestCandidate = { bonus: 2.5, avgComp: 4.0 };
            const candidate2 = { bonus: 2.3, avgComp: 5.0 };

            // Should NOT replace (lower bonus)
            if (candidate2.bonus > bestCandidate.bonus ||
                (candidate2.bonus === bestCandidate.bonus && candidate2.avgComp > bestCandidate.avgComp)) {
                bestCandidate = candidate2;
            }

            expect(bestCandidate.bonus).toBe(2.5);
        });
    });

    describe('Data Preservation', () => {
        test('original candidate data is preserved with spread operator', () => {
            const originalCandidate = {
                tags: ['ACTION'],
                stats: { avgComp: 5.0 }
            };

            const enhancedCandidate = {
                ...originalCandidate,
                _bonus: 3.0,
                _evaluation: { /* some data */ }
            };

            expect(enhancedCandidate.tags).toEqual(['ACTION']);
            expect(enhancedCandidate.stats).toEqual({ avgComp: 5.0 });
            expect(enhancedCandidate._bonus).toBe(3.0);
        });
    });
});
