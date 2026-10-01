(function(global) {
    // The value the data uses for "no entry". A missing pair counts as 3.0.
    const NO_DATA = 3.0;

    function readDirected(fromId, toId, gameData) {
        const row = gameData.compatibility[fromId];
        const value = row ? row[toId] : undefined;
        return value === undefined || value === null || value === '' ? null : parseFloat(value);
    }

    // One score per pair, whichever element comes first. The data holds every
    // pair in both directions; 36 pairs disagree, all with Hardened Cynic's
    // own row at 3.0 and the reverse at 4 or 5, so the panels that read A->B
    // and the ones that read B->A disagreed. Owner ruling 2026-10-01: use the
    // real entry, so a 3.0 that disagrees with the other direction yields to it.
    function pairScore(tagA, tagB, gameData) {
        const ab = readDirected(tagA.id, tagB.id, gameData);
        const ba = readDirected(tagB.id, tagA.id, gameData);
        if (ab === null && ba === null) return NO_DATA;
        if (ab === null) return ba;
        if (ba === null) return ab;
        if (ab === ba) return ab;
        if (ab === NO_DATA) return ba;
        if (ba === NO_DATA) return ab;
        // Two different real entries: none in the data (measured 2026-10-01).
        return ab;
    }

    function calculateMatrixScore(tags, gameData) {
        let totalScore = 0;
        let spoilers = [];
        let rawSum = 0;
        let pairCount = 0;

        for (let i = 0; i < tags.length; i++) {
            for (let j = i + 1; j < tags.length; j++) {
                const rawVal = pairScore(tags[i], tags[j], gameData);
                rawSum += rawVal;
                pairCount++;
            }
        }

        let rawAverage = pairCount > 0 ? (rawSum / pairCount) : 3.0;
        tags.forEach(tagA => {
            let rowSum = 0;
            let rowWeight = 0;
            let worstVal = 6.0;
            let worstPartner = "";
            tags.forEach(tagB => {
                if (tagA.id === tagB.id) return;
                const rawVal = pairScore(tagA, tagB, gameData);
                let score = (rawVal - 3.0) / 2.0;
                let weight = 1.0;
                if (score < 0) {
                    if (tagB.category === "Genre") {
                        score *= 20.0 * tagB.percent;
                        weight = 20.0 * tagB.percent;
                    } else if (tagB.category === "Setting") {
                        score *= 5.0;
                        weight = 5.0;
                    } else {
                        score *= 3.0;
                        weight = 3.0;
                    }
                } else {
                    if (tagB.category === "Genre") {
                        score *= tagB.percent;
                        weight = tagB.percent;
                    }
                }
                rowSum += score;
                rowWeight += weight;
                if (rawVal < worstVal) {
                    worstVal = rawVal;
                    worstPartner = tagB.id;
                }
            });
            let rowAverage = 0;
            if (rowWeight > 0) rowAverage = rowSum / rowWeight;
            let transformedWorst = (worstVal - 3.0) / 2.0;
            let finalRowScore = rowAverage;
            if (worstVal <= 1.0) {
                let partnerName = worstPartner && gameData.tags[worstPartner] ? gameData.tags[worstPartner].name : "another selected tag";
                spoilers.push(`${gameData.tags[tagA.id].name} conflicts with ${partnerName}`);
                finalRowScore = -1.0;
            } else if (transformedWorst < rowAverage) {
                 finalRowScore = transformedWorst;
            }
            totalScore += finalRowScore * tagA.percent;
        });

        if (totalScore >= 0) totalScore *= 0.9;
        else totalScore *= 1.25;
        return { totalScore, spoilers, rawAverage };
    }

    // Genres by share, a tie broken by the game's own genre order (the order
    // of the data file). The sort used to keep the input order, so the same
    // script scored differently depending on which genre row was added first:
    // 54 of 55 genre pairs at 50/50 (audit 2026-09-30). Which genre the game
    // picks on a tie is not confirmed (GAME_RULES.md section 6).
    function genresByShare(tags, gameData) {
        const gameOrder = Object.keys(gameData.tags);
        return tags.filter(t => t.category === "Genre")
            .sort((a, b) => b.percent - a.percent || gameOrder.indexOf(a.id) - gameOrder.indexOf(b.id));
    }

    function calculateTotalBonuses(tags, gameData) {
        let totalArt = 0;
        let totalCom = 0;
        const genrePair = calculateGenrePairScore(tags, gameData);

        if (genrePair) {
            totalArt += genrePair.art;
            totalCom += genrePair.com;
        } else {
            const genres = genresByShare(tags, gameData);
            if (genres.length > 0) {
                const topGenre = gameData.tags[genres[0].id];
                if (topGenre) {
                    totalArt += topGenre.art;
                    totalCom += topGenre.com;
                }
            }
        }

        tags.forEach(tag => {
            if (tag.category !== "Genre") {
                const data = gameData.tags[tag.id];
                if (data) {
                    totalArt += data.art;
                    totalCom += data.com;
                }
            }
        });

        return { art: totalArt, com: totalCom };
    }

    function calculateGenrePairScore(tags, gameData) {
        const genres = genresByShare(tags, gameData);
        if (genres.length < 2) return null;

        const g1 = genres[0];
        const g2 = genres[1];
        if ((g1.percent + g2.percent < 0.7) || (g2.percent < 0.35)) {
            return null;
        }

        let pairData = null;
        if (gameData.genrePairs[g1.id] && gameData.genrePairs[g1.id][g2.id]) {
            pairData = gameData.genrePairs[g1.id][g2.id];
        } else if (gameData.genrePairs[g2.id] && gameData.genrePairs[g2.id][g1.id]) {
            pairData = gameData.genrePairs[g2.id][g1.id];
        }

        if (!pairData) return null;
        return {
            com: parseFloat(pairData.primary),
            art: parseFloat(pairData.secondary),
            names: `${gameData.tags[g1.id].name} + ${gameData.tags[g2.id].name}`
        };
    }

    function getRawCompatibilityScore(tagA, tagB, gameData) {
        return pairScore(tagA, tagB, gameData);
    }

    global.HACCompatibilityEngine = {
        calculateMatrixScore,
        calculateTotalBonuses,
        calculateGenrePairScore,
        getRawCompatibilityScore
    };
})(globalThis);
