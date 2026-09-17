import { loadLegacyScript } from './helpers/legacyHarness.js';

/**
 * Severity and summary for the Graves Conflicts panel.
 *
 * findGravesConflicts already listed every pair below Graves' 2.0 danger line,
 * but the panel rendered each one as a flat "X clashes with Y" row. A script
 * with one marginal clash and a script that is structurally broken looked
 * identical, so the panel could not tell the player how much trouble they were
 * in. These pin the grading that drives the enriched panel.
 */
describe('Graves conflicts', () => {
    let h;

    const severity = raw => h.call('HACGravesAudience.gravesConflictSeverity', raw);
    const summarize = conflicts => h.call('HACGravesAudience.summarizeGravesConflicts', conflicts);

    const conflict = (rawScore) => ({
        firstName: 'A',
        secondName: 'B',
        firstCategory: 'Genre',
        secondCategory: 'Finale',
        rawScore
    });

    beforeAll(async () => {
        h = await loadLegacyScript();
    });

    describe('gravesConflictSeverity', () => {
        test('grades the worst band as severe', () => {
            expect(severity(0)).toBe('severe');
            expect(severity(0.9)).toBe('severe');
        });

        test('grades the middle band as serious', () => {
            expect(severity(1.0)).toBe('serious');
            expect(severity(1.49)).toBe('serious');
        });

        test('grades the band just under the danger line as mild', () => {
            expect(severity(1.5)).toBe('mild');
            expect(severity(1.99)).toBe('mild');
        });

        test('anything at or above the danger line is not a conflict at all', () => {
            expect(severity(2.0)).toBe('none');
            expect(severity(4.5)).toBe('none');
        });
    });

    describe('summarizeGravesConflicts', () => {
        test('an empty list reports nothing to answer for', () => {
            const summary = summarize([]);

            expect(summary.total).toBe(0);
            expect(summary.worst).toBeNull();
            expect(summary.headline).toBe('');
        });

        test('counts each severity band separately', () => {
            const summary = summarize([conflict(0.5), conflict(1.2), conflict(1.2), conflict(1.8)]);

            expect(summary.total).toBe(4);
            expect(summary.severe).toBe(1);
            expect(summary.serious).toBe(2);
            expect(summary.mild).toBe(1);
        });

        test('reports the worst pair, so the panel can lead with it', () => {
            const summary = summarize([conflict(1.8), conflict(0.3), conflict(1.1)]);

            expect(summary.worst.rawScore).toBe(0.3);
        });

        test('the headline names the count and the worst band', () => {
            const summary = summarize([conflict(0.4), conflict(1.7)]);

            expect(summary.headline).toContain('2');
            expect(summary.headline).toContain('severe');
        });

        test('a single mild clash does not read as a catastrophe', () => {
            const summary = summarize([conflict(1.9)]);

            expect(summary.severe).toBe(0);
            expect(summary.headline).toContain('mild');
            expect(summary.headline).not.toContain('severe');
        });

        test('the summary tone escalates with the worst band present', () => {
            expect(summarize([conflict(1.9)]).tone).toBe('mild');
            expect(summarize([conflict(1.2)]).tone).toBe('serious');
            expect(summarize([conflict(0.2)]).tone).toBe('severe');
        });
    });

    describe('findGravesConflicts carries category context', () => {
        test('each conflict names the categories that clash', () => {
            const conflicts = h.call('findGravesConflicts', [
                { id: 'GENRE_COMEDY', percent: 1 },
                { id: 'FINALE_PROTAGONIST_DIES', percent: 1 }
            ]);

            if (conflicts.length > 0) {
                expect(typeof conflicts[0].firstCategory).toBe('string');
                expect(typeof conflicts[0].secondCategory).toBe('string');
                expect(conflicts[0].firstCategory.length).toBeGreaterThan(0);
            }
        });
    });
});
