(function(global) {
    "use strict";

    function getCompatibleGenres(sourceId, excludedIds) {
        let valid = [];
        if (GAME_DATA.genrePairs[sourceId]) {
            valid.push(...Object.keys(GAME_DATA.genrePairs[sourceId]));
        }
        for (const gKey in GAME_DATA.genrePairs) {
            if (GAME_DATA.genrePairs[gKey] && GAME_DATA.genrePairs[gKey][sourceId]) {
                valid.push(gKey);
            }
        }
        const unique = new Set(valid);
        return [...unique].filter(id => !excludedIds.has(id));
    }

    function getRandomTagByCategory(category, currentTags, excludedIds) {
        const existingIds = new Set(currentTags.map(t => t.id));
        const allTags = Object.values(GAME_DATA.tags).filter(t => t.category === category);
        const available = allTags.filter(t => !existingIds.has(t.id) && !excludedIds.has(t.id));

        if (available.length === 0) return null;
        const picked = available[Math.floor(Math.random() * available.length)];

        return {
            id: picked.id,
            percent: 1.0,
            category: category
        };
    }

    function createScriptId() {
        return Date.now() + Math.random().toString();
    }

    function buildScriptStats(matrix, movieScores) {
        return {
            avgComp: matrix.rawAverage,
            synergySum: matrix.totalScore,
            maxScriptQuality: movieScores.tagCap - 1,
            movieScore: Math.max(movieScores.commercial, movieScores.artistic).toFixed(1)
        };
    }

    function buildScriptFromTags(tags, name) {
        const evaluation = calculateScriptEvaluation(tags);

        return {
            tags: tags.map(tag => ({ id: tag.id, category: tag.category, percent: tag.percent })),
            stats: buildScriptStats(evaluation.matrix, evaluation.movieScores),
            scores: {
                commercial: evaluation.movieScores.commercial,
                artistic: evaluation.movieScores.artistic
            },
            name,
            uniqueId: createScriptId()
        };
    }

    function runGenerationAlgorithm(targetComp, targetCount, fixedTags, excludedTags) {
        const excludedIds = new Set(excludedTags.map(t => t.id));

        let currentTags = [...fixedTags];
        const categoriesPresent = new Set(currentTags.map(t => t.category));

        const fixedGenres = currentTags.filter(t => t.category === "Genre");
        if (fixedGenres.length === 0) {
            const genre1 = getRandomTagByCategory("Genre", currentTags, excludedIds);
            if (genre1) {
                let partnerId = null;
                if (Math.random() < 0.3) {
                     const partners = getCompatibleGenres(genre1.id, excludedIds);
                     if (partners.length > 0) {
                         partnerId = partners[Math.floor(Math.random() * partners.length)];
                     }
                }
                if (partnerId) {
                    genre1.percent = 0.5;
                    currentTags.push(genre1);
                    currentTags.push({ id: partnerId, percent: 0.5, category: "Genre" });
                } else {
                    genre1.percent = 1.0;
                    currentTags.push(genre1);
                }
            }
        }

        if (!categoriesPresent.has("Setting")) {
            const randomSetting = getRandomTagByCategory("Setting", currentTags, excludedIds);
            if (randomSetting) {
                currentTags.push(randomSetting);
                categoriesPresent.add("Setting");
            }
        }

        const scoringMandatory = ["Protagonist", "Antagonist", "Finale"];
        scoringMandatory.forEach(cat => {
            if (!categoriesPresent.has(cat) && getScoringElementCount(currentTags) < targetCount) {
                const randomTag = getRandomTagByCategory(cat, currentTags, excludedIds);
                if (randomTag) {
                    currentTags.push(randomTag);
                    categoriesPresent.add(cat);
                }
            }
        });

        const fillerCats = ["Supporting Character", "Theme & Event"];
        while (getScoringElementCount(currentTags) < targetCount) {
            const randCat = fillerCats[Math.floor(Math.random() * fillerCats.length)];
            const randomTag = getRandomTagByCategory(randCat, currentTags, excludedIds);
            if (randomTag) currentTags.push(randomTag);
            else break;
        }

        let bestSet = [...currentTags];
        let bestStats = calculateMatrixScore(bestSet);

        const iterations = 200;
        for (let i = 0; i < iterations; i++) {
            let candidate = [...bestSet];
            const fixedIds = new Set(fixedTags.map(t => t.id));
            const mutableIndices = candidate.map((t, idx) => ({ t, idx }))
                                            .filter(item => !fixedIds.has(item.t.id) && item.t.category !== 'Genre')
                                            .map(item => item.idx);
            if (mutableIndices.length === 0) break;

            const swapIdx = mutableIndices[Math.floor(Math.random() * mutableIndices.length)];
            const tagToSwap = candidate[swapIdx];
            const newTag = getRandomTagByCategory(tagToSwap.category, candidate, excludedIds);

            if (newTag) {
                candidate[swapIdx] = newTag;
                const newStats = calculateMatrixScore(candidate);
                if (newStats.rawAverage > bestStats.rawAverage) {
                    bestSet = candidate;
                    bestStats = newStats;
                }
            }
        }

        const bonuses = calculateTotalBonuses(bestSet);
        const movieScores = calculateMovieScores(bestStats, bonuses, bestSet);

        return {
            tags: bestSet,
            stats: buildScriptStats(bestStats, movieScores),
            scores: {
                commercial: movieScores.commercial,
                artistic: movieScores.artistic
            },
            uniqueId: createScriptId()
        };
    }

    global.HACScriptGenerationEngine = {
        buildScriptFromTags,
        buildScriptStats,
        createScriptId,
        getCompatibleGenres,
        getRandomTagByCategory,
        runGenerationAlgorithm
    };
})(globalThis);
