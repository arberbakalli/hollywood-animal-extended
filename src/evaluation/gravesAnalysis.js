(function(global) {
    "use strict";

    const GRAVES_DANGER_LINE = 2.0;
    const GRAVES_SEVERE_BELOW = 1.0;
    const GRAVES_SERIOUS_BELOW = 1.5;
    const STRONG_FIT_THRESHOLD = 4.0;

    function getGravesVerdict(rawAverage) {
        if (rawAverage >= 4.0) {
            return {
                label: 'Success',
                tone: 'success',
                text: 'Graves sees a strong, marketable script. The selected elements reinforce each other cleanly.'
            };
        }

        if (rawAverage >= 3.5) {
            return {
                label: 'Common',
                tone: 'accent',
                text: 'Graves sees a viable script. It should work, but it is not a rare high-synergy combination.'
            };
        }

        if (rawAverage < 3.0) {
            return {
                label: 'Failed',
                tone: 'danger',
                text: 'Graves sees a weak fit. The premise may still be interesting, but the game data says these elements fight each other.'
            };
        }

        // Risky is worse than Common, so it cannot read calmer than it. The
        // neutral tone it carried put near-white on a script Graves is warning
        // about, while the better Common verdict got the amber.
        return {
            label: 'Risky',
            tone: 'danger',
            text: 'Graves sees an uneven script. A few pairings may carry it, but the whole package is fragile.'
        };
    }

    function calculateGravesAudience(tags) {
        const affinity = Object.fromEntries(Object.keys(GAME_DATA.demographics).map(id => [id, 0]));

        tags.forEach(item => {
            const tagData = GAME_DATA.tags[item.id];
            if (!tagData || !tagData.weights) return;

            Object.keys(affinity).forEach(demoId => {
                affinity[demoId] += (tagData.weights[demoId] || 0) * item.percent;
            });
        });

        const maxAffinity = Math.max(1, ...Object.values(affinity));
        return Object.entries(affinity)
            .map(([id, score]) => ({
                id,
                name: GAME_DATA.demographics[id].name,
                score,
                strength: Math.round((score / maxAffinity) * 100)
            }))
            .filter(item => item.score > 0)
            .sort((a, b) => b.score - a.score);
    }

    function gravesConflictSeverity(rawScore) {
        if (rawScore >= GRAVES_DANGER_LINE) return 'none';
        if (rawScore < GRAVES_SEVERE_BELOW) return 'severe';
        if (rawScore < GRAVES_SERIOUS_BELOW) return 'serious';
        return 'mild';
    }

    function summarizeGravesConflicts(conflicts) {
        const empty = {
            total: 0, severe: 0, serious: 0, mild: 0,
            worst: null, tone: 'none', headline: ''
        };
        if (!conflicts || conflicts.length === 0) return empty;

        const counts = conflicts.reduce((acc, conflict) => {
            const band = gravesConflictSeverity(conflict.rawScore);
            if (acc[band] !== undefined) acc[band] += 1;
            return acc;
        }, { severe: 0, serious: 0, mild: 0 });

        const worst = conflicts.reduce((lowest, conflict) =>
            conflict.rawScore < lowest.rawScore ? conflict : lowest);
        const tone = gravesConflictSeverity(worst.rawScore);

        const noun = conflicts.length === 1 ? 'pair' : 'pairs';
        const headline = `${conflicts.length} ${noun} below the danger line - worst is ${tone}`;

        return { total: conflicts.length, ...counts, worst, tone, headline };
    }

    function describeTag(tag) {
        const known = GAME_DATA.tags[tag.id];
        return {
            name: known ? known.name : tag.id,
            category: known ? known.category : ''
        };
    }

    function findGravesConflicts(tags) {
        const conflicts = [];

        for (let i = 0; i < tags.length; i++) {
            for (let j = i + 1; j < tags.length; j++) {
                const rawScore = getRawCompatibilityScore(tags[i], tags[j]);
                if (rawScore < GRAVES_DANGER_LINE) {
                    const first = describeTag(tags[i]);
                    const second = describeTag(tags[j]);
                    conflicts.push({
                        firstName: first.name,
                        secondName: second.name,
                        firstCategory: first.category,
                        secondCategory: second.category,
                        severity: gravesConflictSeverity(rawScore),
                        rawScore
                    });
                }
            }
        }

        return conflicts.sort((a, b) => a.rawScore - b.rawScore);
    }

    function findGravesPairsByBand(tags) {
        const pairs = [];

        for (let i = 0; i < tags.length; i++) {
            for (let j = i + 1; j < tags.length; j++) {
                const rawScore = getRawCompatibilityScore(tags[i], tags[j]);
                const first = describeTag(tags[i]);
                const second = describeTag(tags[j]);

                let band = 'common';
                if (rawScore < GRAVES_DANGER_LINE) band = 'unsuccessful';
                else if (rawScore >= STRONG_FIT_THRESHOLD) band = 'successful';

                pairs.push({
                    firstName: first.name,
                    secondName: second.name,
                    firstCategory: first.category,
                    secondCategory: second.category,
                    rawScore,
                    band
                });
            }
        }

        return {
            successful: pairs.filter(p => p.band === 'successful').sort((a, b) => b.rawScore - a.rawScore),
            common: pairs.filter(p => p.band === 'common').sort((a, b) => b.rawScore - a.rawScore),
            unsuccessful: pairs.filter(p => p.band === 'unsuccessful').sort((a, b) => a.rawScore - b.rawScore)
        };
    }

    function formatFinalRating(value) {
        if (value >= 10) return "10.0";
        return formatMovieScore(value);
    }

    global.HACGravesAnalysis = {
        calculateGravesAudience,
        findGravesConflicts,
        findGravesPairsByBand,
        formatFinalRating,
        getGravesVerdict,
        gravesConflictSeverity,
        summarizeGravesConflicts
    };
})(globalThis);
