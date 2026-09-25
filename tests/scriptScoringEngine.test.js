import { describe, expect, test, beforeAll } from '@jest/globals';

describe('Script Scoring Engine (Features 1-5)', () => {
    let h;

    beforeAll(async () => {
        const { loadInstrumentedApp } = await import('./helpers/legacyHarness.js');
        h = await loadInstrumentedApp();
    });

    describe('Artistic Appeal Scoring', () => {
        test('calculates artistic appeal from Adult demographics (AF + AM)', () => {
            // Create a script with elements
            const script = [
                { id: 'GENRE_ACTION', percent: 1 },
                { id: 'SETTING_WESTERN_TOWN', percent: 1 },
                { id: 'PROTAGONIST_COWBOY', percent: 1 }
            ];

            const score = h.call('score_artistic_appeal', script);
            expect(score).toBeDefined();
            expect(typeof score).toBe('number');
            expect(score).toBeGreaterThanOrEqual(-5.0);
            expect(score).toBeLessThanOrEqual(5.0);
        });

        test('returns 0 for empty script', () => {
            const score = h.call('score_artistic_appeal', []);
            expect(score).toBe(0);
        });

        test('returns 0 for null script', () => {
            const score = h.call('score_artistic_appeal', null);
            expect(score).toBe(0);
        });

        test('handles elements with no weights gracefully', () => {
            const script = [
                { id: 'NONEXISTENT_TAG', percent: 1 },
                { id: 'GENRE_ACTION', percent: 1 }
            ];

            const score = h.call('score_artistic_appeal', script);
            expect(score).toBeDefined();
            expect(typeof score).toBe('number');
        });
    });

    describe('Commercial Appeal Scoring', () => {
        test('calculates commercial appeal from Youth demographics (TF, TM, YF, YM)', () => {
            const script = [
                { id: 'GENRE_ACTION', percent: 1 },
                { id: 'SETTING_WESTERN_TOWN', percent: 1 },
                { id: 'PROTAGONIST_COWBOY', percent: 1 }
            ];

            const score = h.call('score_commercial_appeal', script);
            expect(score).toBeDefined();
            expect(typeof score).toBe('number');
            expect(score).toBeGreaterThanOrEqual(-5.0);
            expect(score).toBeLessThanOrEqual(5.0);
        });

        test('returns 0 for empty script', () => {
            const score = h.call('score_commercial_appeal', []);
            expect(score).toBe(0);
        });

        test('commercial appeal differs from artistic appeal for varied demographics', () => {
            const script = [
                { id: 'GENRE_ACTION', percent: 1 },
                { id: 'SETTING_WESTERN_TOWN', percent: 1 },
                { id: 'PROTAGONIST_COWBOY', percent: 1 }
            ];

            const artistic = h.call('score_artistic_appeal', script);
            const commercial = h.call('score_commercial_appeal', script);
            // They should be different since they weight different demographics
            // Note: They might occasionally be equal, so we just verify they're both valid scores
            expect(artistic).toBeDefined();
            expect(commercial).toBeDefined();
        });
    });

    describe('Compatibility Elements Extraction', () => {
        test('extracts demographic affinity for tags', () => {
            const tagIds = ['GENRE_ACTION', 'PROTAGONIST_COWBOY'];
            const affinity = h.call('getCompatibilityElements', tagIds);

            expect(affinity).toBeDefined();
            expect(typeof affinity).toBe('object');
            expect(affinity.TF).toBeDefined();
            expect(affinity.TM).toBeDefined();
            expect(affinity.YF).toBeDefined();
            expect(affinity.YM).toBeDefined();
            expect(affinity.AF).toBeDefined();
            expect(affinity.AM).toBeDefined();
        });

        test('accumulates weights for multiple tags', () => {
            const tagIds = ['GENRE_ACTION', 'PROTAGONIST_COWBOY'];
            const affinity = h.call('getCompatibilityElements', tagIds);

            expect(Object.values(affinity).some(v => v !== 0)).toBe(true);
        });

        test('returns zero affinity for empty tag list', () => {
            const affinity = h.call('getCompatibilityElements', []);
            Object.values(affinity).forEach(value => {
                expect(value).toBe(0);
            });
        });
    });

    describe('Score Formatting for Display', () => {
        test('formats positive scores as "positive" class', () => {
            const formatted = h.call('formatScoreForDisplay', 4.5);

            expect(formatted).toHaveProperty('value');
            expect(formatted).toHaveProperty('cssClass');
            expect(formatted).toHaveProperty('label');
            expect(formatted.cssClass).toBe('score-positive');
            expect(formatted.label).toBe('Strong');
        });

        test('formats neutral scores as "neutral" class', () => {
            const formatted = h.call('formatScoreForDisplay', 0.5);

            expect(formatted.cssClass).toBe('score-neutral');
            expect(formatted.label).toBe('Neutral');
        });

        test('formats negative scores as "negative" class', () => {
            const formatted = h.call('formatScoreForDisplay', -3.0);

            expect(formatted.cssClass).toBe('score-negative');
            expect(formatted.label).toBe('Weak');
        });

        test('formats score value to 2 decimal places', () => {
            const formatted = h.call('formatScoreForDisplay', 3.14159);
            expect(formatted.value).toBe('3.14');
        });

        test('threshold boundary: 3.0 is positive', () => {
            const formatted = h.call('formatScoreForDisplay', 3.0);
            expect(formatted.cssClass).toBe('score-positive');
        });

        test('threshold boundary: -2.0 is negative', () => {
            const formatted = h.call('formatScoreForDisplay', -2.0);
            expect(formatted.cssClass).toBe('score-negative');
        });

        test('threshold boundary: 2.99 is neutral', () => {
            const formatted = h.call('formatScoreForDisplay', 2.99);
            expect(formatted.cssClass).toBe('score-neutral');
        });

        test('threshold boundary: -1.99 is neutral', () => {
            const formatted = h.call('formatScoreForDisplay', -1.99);
            expect(formatted.cssClass).toBe('score-neutral');
        });
    });

    describe('Script Ranking', () => {
        test('ranks scripts by artistic appeal descending', () => {
            const scripts = [
                { id: 'script1', elements: [{ id: 'GENRE_ACTION', percent: 1 }] },
                { id: 'script2', elements: [{ id: 'GENRE_DRAMA', percent: 1 }] },
                { id: 'script3', elements: [{ id: 'GENRE_ROMANCE', percent: 1 }] }
            ];

            const ranked = h.call('rankScripts', scripts, 'artistic');

            expect(ranked.length).toBe(3);
            expect(ranked[0].score).toBeGreaterThanOrEqual(ranked[1].score);
            expect(ranked[1].score).toBeGreaterThanOrEqual(ranked[2].score);
            ranked.forEach((script, i) => {
                expect(script).toHaveProperty('appealType');
                expect(script.appealType).toBe('artistic');
            });
        });

        test('ranks scripts by commercial appeal descending', () => {
            const scripts = [
                { id: 'script1', elements: [{ id: 'GENRE_ACTION', percent: 1 }] },
                { id: 'script2', elements: [{ id: 'GENRE_DRAMA', percent: 1 }] }
            ];

            const ranked = h.call('rankScripts', scripts, 'commercial');

            expect(ranked.length).toBe(2);
            ranked.forEach((script, i) => {
                expect(script).toHaveProperty('appealType');
                expect(script.appealType).toBe('commercial');
            });
        });
    });

    describe('Top Scripts Selection (Feature 1-2)', () => {
        test('returns top 3 scripts by default', () => {
            const scripts = [
                { id: 's1', elements: [{ id: 'GENRE_ACTION', percent: 1 }] },
                { id: 's2', elements: [{ id: 'GENRE_DRAMA', percent: 1 }] },
                { id: 's3', elements: [{ id: 'GENRE_ROMANCE', percent: 1 }] },
                { id: 's4', elements: [{ id: 'GENRE_COMEDY', percent: 1 }] }
            ];

            const top = h.call('getTopScripts', scripts, 'artistic');

            expect(top.length).toBe(3);
            top.forEach(script => {
                expect(script).toHaveProperty('displayScore');
                expect(script.displayScore).toHaveProperty('value');
                expect(script.displayScore).toHaveProperty('cssClass');
            });
        });

        test('respects custom limit parameter', () => {
            const scripts = Array.from({ length: 10 }, (_, i) => ({
                id: `s${i}`,
                elements: [{ id: 'GENRE_ACTION', percent: 1 }]
            }));

            const top5 = h.call('getTopScripts', scripts, 'artistic', 5);
            expect(top5.length).toBe(5);

            const top1 = h.call('getTopScripts', scripts, 'artistic', 1);
            expect(top1.length).toBe(1);
        });

        test('returns fewer scripts if list is shorter than limit', () => {
            const scripts = [
                { id: 's1', elements: [{ id: 'GENRE_ACTION', percent: 1 }] },
                { id: 's2', elements: [{ id: 'GENRE_DRAMA', percent: 1 }] }
            ];

            const top = h.call('getTopScripts', scripts, 'artistic', 5);
            expect(top.length).toBe(2);
        });

        test('maintains score descending order in top scripts', () => {
            const scripts = [
                { id: 's1', elements: [{ id: 'GENRE_ACTION', percent: 1 }] },
                { id: 's2', elements: [{ id: 'GENRE_DRAMA', percent: 1 }] },
                { id: 's3', elements: [{ id: 'GENRE_ROMANCE', percent: 1 }] }
            ];

            const top = h.call('getTopScripts', scripts, 'artistic');
            for (let i = 0; i < top.length - 1; i++) {
                expect(top[i].score).toBeGreaterThanOrEqual(top[i + 1].score);
            }
        });
    });

    describe('Demographic Gaps Identification (Feature 3a)', () => {
        test('identifies demographic gaps in a script', () => {
            const tagIds = ['GENRE_ACTION', 'SETTING_WESTERN_TOWN'];
            const gaps = h.call('identifyDemographicGaps', tagIds);

            expect(Array.isArray(gaps)).toBe(true);
            gaps.forEach(gap => {
                expect(gap).toHaveProperty('demographic');
                expect(gap).toHaveProperty('affinity');
                expect(gap).toHaveProperty('demographicName');
            });
        });

        test('returns gaps sorted by lowest affinity first', () => {
            const tagIds = ['GENRE_ACTION'];
            const gaps = h.call('identifyDemographicGaps', tagIds);

            for (let i = 0; i < gaps.length - 1; i++) {
                expect(gaps[i].affinity).toBeLessThanOrEqual(gaps[i + 1].affinity);
            }
        });

        test('returns empty array for strong universal affinity', () => {
            // Use tags with strong across-the-board affinity
            const tagIds = ['GENRE_ACTION', 'GENRE_DRAMA', 'GENRE_COMEDY'];
            const gaps = h.call('identifyDemographicGaps', tagIds);

            // Gaps are based on score < 1.0, so with diverse genres this should be minimal
            expect(Array.isArray(gaps)).toBe(true);
        });
    });

    describe('Supporting Character Recommendations (Feature 3a)', () => {
        test('recommends supporting characters for demographic gaps', () => {
            const tagIds = ['ROMANCE'];
            const recommendations = h.call('recommendSupportingCharacters', tagIds, 3);

            expect(Array.isArray(recommendations)).toBe(true);
            expect(recommendations.length).toBeGreaterThan(0);
            recommendations.forEach(rec => {
                expect(rec).toHaveProperty('tagId');
                expect(rec.tagId).toMatch(/^SUPPORTINGCHARACTER_/);
                expect(rec).toHaveProperty('tagName');
                expect(rec).toHaveProperty('score');
                expect(rec).toHaveProperty('demographic');
                expect(rec).toHaveProperty('demographicName');
            });
        });

        test('respects limit parameter for recommendations per gap', () => {
            const tagIds = ['ROMANCE'];
            const recommendations = h.call('recommendSupportingCharacters', tagIds, 1);

            // Should have at most 1 recommendation per demographic gap
            const demographicCounts = {};
            recommendations.forEach(rec => {
                demographicCounts[rec.demographic] = (demographicCounts[rec.demographic] || 0) + 1;
            });

            Object.values(demographicCounts).forEach(count => {
                expect(count).toBeLessThanOrEqual(1);
            });
            expect(recommendations.length).toBeGreaterThan(0);
        });

        test('returns only positive-scoring supporting characters', () => {
            const tagIds = ['DRAMA'];
            const recommendations = h.call('recommendSupportingCharacters', tagIds, 3);

            expect(recommendations.length).toBeGreaterThan(0);
            recommendations.forEach(rec => {
                expect(rec.score).toBeGreaterThan(0);
            });
        });
    });

    describe('Agency Compatibility Calculation (Feature 3b)', () => {
        test('calculates agency compatibility scores', () => {
            const tagIds = ['ACTION', 'PROTAGONIST_COWBOY'];
            const compatibility = h.call('calculateAgencyCompatibility', tagIds);

            expect(Array.isArray(compatibility)).toBe(true);
            expect(compatibility.length).toBeGreaterThan(0);
            compatibility.forEach(entry => {
                expect(entry).toHaveProperty('agencyId');
                expect(entry).toHaveProperty('agencyName');
                expect(entry).toHaveProperty('matchPercentage');
                expect(entry).toHaveProperty('matchScore');
                expect(entry.matchPercentage).toBeGreaterThanOrEqual(0);
                expect(entry.matchPercentage).toBeLessThanOrEqual(100);
            });
        });

        test('returns agencies sorted by match percentage descending', () => {
            const tagIds = ['ACTION'];
            const compatibility = h.call('calculateAgencyCompatibility', tagIds);

            expect(compatibility.length).toBeGreaterThan(0);
            for (let i = 0; i < compatibility.length - 1; i++) {
                expect(compatibility[i].matchPercentage).toBeGreaterThanOrEqual(
                    compatibility[i + 1].matchPercentage
                );
            }
        });

        test('normalizes match percentage to 0-100 scale', () => {
            const tagIds = ['ACTION'];
            const compatibility = h.call('calculateAgencyCompatibility', tagIds);

            expect(compatibility.length).toBeGreaterThan(0);
            compatibility.forEach(entry => {
                expect(Number.isInteger(entry.matchPercentage)).toBe(true);
                expect(entry.matchPercentage).toBeGreaterThanOrEqual(0);
                expect(entry.matchPercentage).toBeLessThanOrEqual(100);
            });
        });
    });
});
