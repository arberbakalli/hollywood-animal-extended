(function(global) {
    function calculateMatrixScore(tags, gameData) {
        let totalScore = 0;
        let spoilers = [];
        let rawSum = 0;
        let pairCount = 0;

        for (let i = 0; i < tags.length; i++) {
            for (let j = i + 1; j < tags.length; j++) {
                let tA = tags[i];
                let tB = tags[j];
                let rawVal = 3.0;
                if (gameData.compatibility[tA.id] && gameData.compatibility[tA.id][tB.id]) {
                    rawVal = parseFloat(gameData.compatibility[tA.id][tB.id]);
                } else if (gameData.compatibility[tB.id] && gameData.compatibility[tB.id][tA.id]) {
                    rawVal = parseFloat(gameData.compatibility[tB.id][tA.id]);
                }
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
                let rawVal = 3.0;
                if (gameData.compatibility[tagA.id] && gameData.compatibility[tagA.id][tagB.id]) {
                    rawVal = parseFloat(gameData.compatibility[tagA.id][tagB.id]);
                } else if (gameData.compatibility[tagB.id] && gameData.compatibility[tagB.id][tagA.id]) {
                    rawVal = parseFloat(gameData.compatibility[tagB.id][tagA.id]);
                }
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

    function calculateTotalBonuses(tags, gameData) {
        let totalArt = 0;
        let totalCom = 0;
        const genrePair = calculateGenrePairScore(tags, gameData);

        if (genrePair) {
            totalArt += genrePair.art;
            totalCom += genrePair.com;
        } else {
            const genres = tags.filter(t => t.category === "Genre").sort((a, b) => b.percent - a.percent);
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
        const genres = tags.filter(t => t.category === "Genre").sort((a, b) => b.percent - a.percent);
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
            com: parseFloat(pairData.Item1),
            art: parseFloat(pairData.Item2),
            names: `${gameData.tags[g1.id].name} + ${gameData.tags[g2.id].name}`
        };
    }

    function getRawCompatibilityScore(tagA, tagB, gameData) {
        if (gameData.compatibility[tagA.id] && gameData.compatibility[tagA.id][tagB.id]) {
            return parseFloat(gameData.compatibility[tagA.id][tagB.id]);
        }

        if (gameData.compatibility[tagB.id] && gameData.compatibility[tagB.id][tagA.id]) {
            return parseFloat(gameData.compatibility[tagB.id][tagA.id]);
        }

        return 3.0;
    }

    global.HACCompatibilityEngine = {
        calculateMatrixScore,
        calculateTotalBonuses,
        calculateGenrePairScore,
        getRawCompatibilityScore
    };
})(globalThis);
