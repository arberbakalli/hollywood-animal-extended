(function(global) {
    "use strict";

    const GRAVES_DANGER_LINE = 2.0;
    // Severe at 1.0 or below: the spoiler line of the scoring engine, where
    // the row scores -1 (owner ruling 2026-10-01; the data is whole numbers,
    // so with '< 1.0' every real conflict read Serious).
    const GRAVES_SEVERE_AT_OR_BELOW = 1.0;
    const GRAVES_SERIOUS_BELOW = 1.5;
    const STRONG_FIT_THRESHOLD = 4.0;

    // Banded on the tenth the screen shows (owner ruling 2026-10-01): 3.476
    // shows "3.5", so it reads Common, not Risky. Every Average Fit display
    // shows one decimal.
    function getGravesVerdict(rawAverage) {
        rawAverage = Number(rawAverage.toFixed(1));
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

    // The release model's audience shares (Marketing & Release): affinity from
    // the weights by share, lifted so the lowest is at least 1, then each
    // audience's share of the total times 3, clamped to 0..1. One function for
    // both tabs (owner ruling 2026-10-01): Graves used its own scaling (top
    // audience = 100%), so the same script named different audiences.
    const AUDIENCE_HIGH_FROM = 0.67;
    const AUDIENCE_TARGET_ABOVE = 0.33;
    const RELEASE_MAGIC_NUMBER = 3.0;

    function audienceShares(tags) {
        const affinity = Object.fromEntries(Object.keys(GAME_DATA.demographics).map(id => [id, 0]));
        tags.forEach(item => {
            const tagData = GAME_DATA.tags[item.id];
            if (!tagData || !tagData.weights) return;
            Object.keys(affinity).forEach(demoId => {
                if (tagData.weights[demoId]) affinity[demoId] += tagData.weights[demoId] * item.percent;
            });
        });

        const minVal = Math.min(...Object.values(affinity));
        if (minVal < 1.0) {
            Object.keys(affinity).forEach(demoId => { affinity[demoId] += 1.0 - minVal; });
        }
        const total = Object.values(affinity).reduce((sum, value) => sum + value, 0);
        return Object.fromEntries(Object.entries(affinity).map(([demoId, value]) => [
            demoId,
            total === 0 ? 0 : Math.min(1.0, Math.max(0, (value / total) * RELEASE_MAGIC_NUMBER))
        ]));
    }

    // Target audiences, highest share first: above 0.33, high from 0.67.
    function calculateGravesAudience(tags) {
        const shares = audienceShares(tags);
        return Object.entries(shares)
            .filter(([, share]) => share > AUDIENCE_TARGET_ABOVE)
            .map(([id, share]) => ({
                id,
                name: GAME_DATA.demographics[id].name,
                score: share,
                strength: Math.round(share * 100),
                high: share >= AUDIENCE_HIGH_FROM
            }))
            .sort((a, b) => b.score - a.score);
    }

    function gravesConflictSeverity(rawScore) {
        if (rawScore >= GRAVES_DANGER_LINE) return 'none';
        if (rawScore <= GRAVES_SEVERE_AT_OR_BELOW) return 'severe';
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

    /**
     * Genre and Setting are context every script carries: they occupy no budget
     * (GAME_RULES.md section 1). This is the ONE copy of that rule. Panels
     * delegate here rather than re-filtering, because three separate copies is
     * exactly how Evaluate came to reject a nine-element script as eleven.
     */
    function isStoryElement(tag) {
        return Boolean(tag) && tag.category !== 'Genre' && tag.category !== 'Setting';
    }

    function storyElementsOf(tags) {
        return (tags || []).filter(isStoryElement);
    }

    function formatFinalRating(value) {
        if (value >= 10) return "10.0";
        return formatMovieScore(value);
    }

    global.HACGravesAnalysis = {
        calculateGravesAudience,
        isStoryElement,
        storyElementsOf,
        findGravesConflicts,
        findGravesPairsByBand,
        formatFinalRating,
        getGravesVerdict,
        audienceShares,
        AUDIENCE_HIGH_FROM,
        AUDIENCE_TARGET_ABOVE,
        gravesConflictSeverity,
        summarizeGravesConflicts
    };
})(globalThis);
