(function(global) {
    "use strict";

    const ADVERTISER_GRADE_BANDS = [
        [3.33, 'A+', 'grade-high'],
        [2.83, 'A',  'grade-high'],
        [2.58, 'B+', 'grade-good'],
        [2.33, 'B',  'grade-good'],
        [2.13, 'C+', 'grade-mid'],
        [1.94, 'C',  'grade-mid'],
        [1.50, 'D',  'grade-low'],
        [-Infinity, 'F', 'grade-poor']
    ];

    const ADVERTISER_WEAK_THRESHOLD = ADVERTISER_GRADE_BANDS.find(band => band[1] === 'D')[0];

    function calculateAdvertiserMatch(scriptTags, movieLean, agency) {
        if (!scriptTags || scriptTags.length === 0 || !agency || !agency.targets) return 0;

        let totalScore = 0;
        let scoredTags = 0;

        for (const tag of scriptTags) {
            if (!tag || !tag.weights) continue;

            let sum = 0;
            let count = 0;
            for (const audience of agency.targets) {
                const weight = tag.weights[audience];
                if (Number.isFinite(weight)) {
                    sum += weight;
                    count++;
                }
            }

            if (count > 0) {
                totalScore += sum / count;
                scoredTags++;
            }
        }

        if (scoredTags === 0) return 0;

        let score = totalScore / scoredTags;

        // Universal agencies (type 0) never take a lean adjustment, and a balanced
        // script is not a mismatch — it leaves the specialists untouched too.
        if (agency.type !== 0 && movieLean !== 0) {
            score += (agency.type === movieLean) ? 0.25 : -0.2;
        }

        return Math.min(5, Math.max(0, score));
    }

    function predictGradeFromScore(score) {
        const [, grade, tier] = ADVERTISER_GRADE_BANDS.find(([min]) => score >= min);
        return { grade, tier };
    }

    function generateReasoning(agency, score) {
        const audiences = agency.targets.join(', ');
        if (score >= 4.5) return `Strong appeal across ${audiences}.`;
        if (score >= 4.0) return `Good compatibility across ${audiences}.`;
        if (score >= ADVERTISER_WEAK_THRESHOLD) return `Adequate reach for ${audiences}, but not a standout.`;
        return `Your elements score poorly with ${audiences} — this campaign would underperform.`;
    }

    function getRecommendations(scriptConfig) {
        const agencies = GAME_DATA.adAgents || [];
        const tags = (scriptConfig && scriptConfig.tags) || [];

        if (agencies.length === 0 || tags.length === 0) {
            return { topRecommendation: null, alternatives: [], weakMatches: [], allScores: [] };
        }

        const movieLean = (scriptConfig && scriptConfig.movieLean) || 0;

        const ranked = agencies.map(agency => {
            const score = calculateAdvertiserMatch(tags, movieLean, agency);
            const { grade, tier } = predictGradeFromScore(score);
            return { agency, score, grade, tier, reasoning: generateReasoning(agency, score) };
        }).sort((a, b) =>
            b.score - a.score ||
            b.agency.level - a.agency.level ||
            a.agency.name.localeCompare(b.agency.name)
        );

        const rest = ranked.slice(1);
        return {
            topRecommendation: ranked[0],
            alternatives: rest.filter(r => r.score >= ADVERTISER_WEAK_THRESHOLD),
            weakMatches: rest.filter(r => r.score < ADVERTISER_WEAK_THRESHOLD),
            allScores: ranked
        };
    }

    function renderAdvertiserCard(entry, extraClass) {
        return `
            <div class="advertiser-card ${extraClass}">
                <div class="adv-name">${entry.agency.name}</div>
                <div class="adv-score">
                    <span class="score-value ${entry.tier}">${entry.score.toFixed(2)}</span>
                    <span class="score-grade">${entry.grade}</span>
                </div>
                <div class="adv-reasoning">${entry.reasoning}</div>
            </div>`;
    }

    global.HACAdvertiserMatcher = {
        ADVERTISER_GRADE_BANDS,
        ADVERTISER_WEAK_THRESHOLD,
        calculateAdvertiserMatch,
        predictGradeFromScore,
        generateReasoning,
        getRecommendations,
        renderAdvertiserCard
    };
    global.ADVERTISER_GRADE_BANDS = ADVERTISER_GRADE_BANDS;
    global.ADVERTISER_WEAK_THRESHOLD = ADVERTISER_WEAK_THRESHOLD;
})(globalThis);
