(function(global) {
    "use strict";

    async function analyzeMovie() {
        await ensureCompatibilityLoaded();
        await ensureGenrePairsLoaded();
        clearFeedbackMessage('advertisersFeedbackMessage');
        const tagInputs = collectTagInputs('advertisers');
        if(tagInputs.length === 0) {
            showFeedbackMessage('advertisersFeedbackMessage', 'Please select at least one tag.', 'accent');
            return;
        }

        const inputCom = parseFloat(document.getElementById('comScoreInput').value) || 0;
        const inputArt = parseFloat(document.getElementById('artScoreInput').value) || 0;

        let tagAffinity = { "YM": 0, "YF": 0, "TM": 0, "TF": 0, "AM": 0, "AF": 0 };
        tagInputs.forEach(item => {
            const tagData = GAME_DATA.tags[item.id];
            if(!tagData) return;
            const multiplier = item.percent;
            for(let demo in tagAffinity) {
                if(tagData.weights[demo]) {
                    tagAffinity[demo] += (tagData.weights[demo] * multiplier);
                }
            }
        });

        let minVal = Number.MAX_VALUE;
        for (let demo in tagAffinity) {
            if (tagAffinity[demo] < minVal) minVal = tagAffinity[demo];
        }
        if (minVal < 1.0) {
            const liftAmount = 1.0 - minVal;
            for (let demo in tagAffinity) {
                tagAffinity[demo] += liftAmount;
            }
        }

        let totalSum = 0;
        for (let demo in tagAffinity) totalSum += tagAffinity[demo];
        const RELEASE_MAGIC_NUMBER = 3.0;
        let baselineScores = {};
        for(let demo in tagAffinity) {
            if (totalSum === 0) {
                baselineScores[demo] = 0;
            } else {
                let normalized = (tagAffinity[demo] / totalSum) * RELEASE_MAGIC_NUMBER;
                baselineScores[demo] = Math.min(1.0, Math.max(0, normalized));
            }
        }

        const normalizedArt = inputArt / 10.0;
        const normalizedCom = inputCom / 10.0;
        let demoGrades = [];

        for(let demo in GAME_DATA.demographics) {
            const d = GAME_DATA.demographics[demo];
            const dropRate = baselineScores[demo];

            const skew = normalizedArt - normalizedCom;
            let satArt, satBase, satCom;
            if (skew > 0) {
                satArt = 1.0;
                satBase = 1.0 - skew;
                satCom = 1.0 - skew;
            } else {
                satCom = 1.0;
                satBase = 1.0 - Math.abs(skew);
                satArt = 1.0 - Math.abs(skew);
            }

            const totalW = d.baseW + d.artW + d.comW;
            const satisfaction = ( (satBase * d.baseW) + (satArt * d.artW) + (satCom * d.comW) ) / totalW;
            const qw = GAME_DATA.constants.KINOMARK.scoreWeights;
            const quality = (dropRate * qw[0]) + (normalizedCom * qw[1]) + (normalizedArt * qw[2]);
            const aw = GAME_DATA.constants.KINOMARK.audienceWeight;
            let finalScore = (satisfaction * aw) + (quality * (1 - aw));

            if (dropRate <= 0.1) finalScore = 0;

            demoGrades.push({
                id: demo,
                name: d.name,
                score: dropRate,
                utility: finalScore
            });
        }

        const THRESHOLD_GOOD = 0.67;
        const THRESHOLD_BAD = 0.33;

        const targetAudiences = demoGrades.filter(d => d.score > THRESHOLD_BAD);
        const highInterestIds = demoGrades.filter(d => d.score >= THRESHOLD_GOOD).map(d => d.id);
        const moderateInterestIds = demoGrades.filter(d => d.score > THRESHOLD_BAD && d.score < THRESHOLD_GOOD).map(d => d.id);

        document.getElementById('results-advertisers').classList.remove('hidden');
        const audienceContainer = document.getElementById('targetAudienceDisplay');
        audienceContainer.innerHTML = '';

        if (targetAudiences.length > 0) {
            targetAudiences.sort((a, b) => b.score - a.score);
            targetAudiences.forEach(d => {
                const chip = document.createElement('div');
                let tierClass = "pill-moderate";
                if(d.score >= THRESHOLD_GOOD) {
                    tierClass = "pill-best";
                }
                chip.className = `audience-pill ${tierClass}`;
                chip.innerHTML = `${d.name}`;
                audienceContainer.appendChild(chip);
            });
        } else {
            audienceContainer.innerHTML = '<div class="empty-state">No audience fits the criteria.</div>';
        }

        const validTargetIds = targetAudiences.map(t => t.id);
        let movieLean = 0;
        let leanText = "Balanced";
        if (inputArt > inputCom + 0.1) { movieLean = 1; leanText = "Artistic"; }
        else if (inputCom > inputArt + 0.1) { movieLean = 2; leanText = "Commercial"; }

        // Rank the agencies against the selected elements.
        displayAdvertiserRecommendations(getRecommendations({
            tags: tagInputs.map(t => GAME_DATA.tags[t.id]).filter(Boolean),
            movieLean: movieLean
        }));

        const leanDisplay = document.getElementById('movieLeanDisplay');
        if (leanDisplay) {
            leanDisplay.textContent = leanText;
            leanDisplay.className = 'value';
            if (movieLean === 1) leanDisplay.classList.add('lean-art');
            else if (movieLean === 2) leanDisplay.classList.add('lean-com');
            else leanDisplay.classList.add('lean-balanced');
        }

        // --- HOLIDAY LOGIC ---
        const holidayContainer = document.getElementById('holidayDisplay');
        holidayContainer.innerHTML = '';

        if (validTargetIds.length === 0) {
            holidayContainer.innerHTML = '<div class="empty-state">Identify target audience first.</div>';
        } else {
            let primaryTargets = highInterestIds;
            if (primaryTargets.length === 0) {
                primaryTargets = moderateInterestIds;
            }

            const rankedHolidays = GAME_DATA.holidays.map(h => {
                let totalScore = 0;
                let parts = [];
                primaryTargets.forEach(id => {
                    const bonus = h.bonuses[id] || 0;
                    if (bonus > 0) {
                        totalScore += bonus;
                        parts.push({
                            val: bonus,
                            text: `${bonus}% Bonus Towards ${GAME_DATA.demographics[id].name}`
                        });
                    }
                });
                parts.sort((a, b) => b.val - a.val);
                const contextText = parts.length > 0 ? parts.map(p => p.text).join(', ') : "No significant bonus.";
                return {
                    name: h.name,
                    totalScore: totalScore,
                    contextText: contextText
                };
            });

            const viableHolidays = rankedHolidays.filter(h => h.totalScore > 0).sort((a, b) => b.totalScore - a.totalScore);

            if (viableHolidays.length === 0) {
                holidayContainer.innerHTML = `<div class="holiday-row-empty"><span>No beneficial holidays found for your primary audience.</span></div>`;
            } else {
                const best = viableHolidays[0];
                const bestHeader = document.createElement('div');
                bestHeader.className = 'holiday-section-label';
                bestHeader.innerText = "Best Option";
                holidayContainer.appendChild(bestHeader);

                const bestRow = document.createElement('div');
                bestRow.className = 'holiday-row best';
                bestRow.innerHTML = `
                    <div class="hol-left">
                        <span class="hol-name">${best.name}</span>
                        <span class="hol-target">${best.contextText}</span>
                    </div>
                `;
                holidayContainer.appendChild(bestRow);

                const alternatives = viableHolidays.slice(1, 4);
                if(alternatives.length > 0) {
                    const altHeader = document.createElement('div');
                    altHeader.className = 'holiday-section-label spaced';
                    altHeader.innerText = "Alternatives";
                    holidayContainer.appendChild(altHeader);

                    alternatives.forEach(alt => {
                        const row = document.createElement('div');
                        row.className = 'holiday-row';
                        row.innerHTML = `
                            <div class="hol-left">
                                <span class="hol-name">${alt.name}</span>
                                <span class="hol-target">${alt.contextText}</span>
                            </div>
                        `;
                        holidayContainer.appendChild(row);
                    });
                }
            }
        }

        let preDuration = 6;
        let releaseDuration = 4;
        let postDuration = 0;
        let totalWeeks = 10;
        if (inputCom >= 9.0) {
            postDuration = 4;
            totalWeeks = 14;
        }

        document.getElementById('campaignStrategyDisplay').innerHTML = `
            <div class="strategy-row">
                <div class="campaign-block pre">
                    <span class="camp-title">Pre-Release</span>
                    <span class="camp-value">${preDuration} wks</span>
                </div>

                <div class="campaign-block release">
                    <span class="camp-title">Release</span>
                    <span class="camp-value">${releaseDuration} wks</span>
                </div>

                <div class="campaign-block post ${postDuration > 0 ? '' : 'is-dimmed'}">
                    <span class="camp-title">Post-Release</span>
                    <span class="camp-value">${postDuration} wks</span>
                </div>
            </div>

            <div class="total-duration-footer">
                Total Duration: <strong class="text-main">${totalWeeks} Weeks</strong>
            </div>
        `;

        // --- DYNAMICALLY MOVE DISTRIBUTION CALCULATOR TO RESULTS ---
        const distCard = document.getElementById('dist-wrapper');
        const resultsContainer = document.getElementById('results-advertisers');

        if(distCard && resultsContainer) {
            resultsContainer.appendChild(distCard);
            distCard.classList.add('distribution-card--in-results');
        }

        document.getElementById('results-advertisers').classList.remove('hidden');
        document.getElementById('results-advertisers').scrollIntoView({ behavior: 'smooth' });
    }

    function displayAdvertiserRecommendations(recommendations) {
        const container = document.getElementById('adAgentDisplay');
        if (!container) return;

        if (!recommendations || !recommendations.topRecommendation) {
            container.innerHTML = '<div class="empty-state padded-empty">Select story elements to get recommendations.</div>';
            return;
        }

        const { topRecommendation, alternatives, weakMatches } = recommendations;
        const sections = [
            `<div class="rec-section">
                <div class="rec-header">Top Pick</div>
                ${renderAdvertiserCard(topRecommendation, 'top')}
            </div>`
        ];

        if (alternatives.length > 0) {
            sections.push(`<div class="rec-section rec-alternatives">
                <div class="rec-header">Alternatives</div>
                ${alternatives.map(a => renderAdvertiserCard(a, 'alt')).join('')}
            </div>`);
        }

        if (weakMatches.length > 0) {
            sections.push(`<div class="rec-section rec-weak">
                <div class="rec-header">Better Avoided</div>
                ${weakMatches.map(w => renderAdvertiserCard(w, 'weak')).join('')}
            </div>`);
        }

        container.innerHTML = `<div class="advertiser-recommendation">${sections.join('')}</div>`;
    }

    global.HACMarketingPlanner = {
        analyzeMovie,
        displayAdvertiserRecommendations
    };
})(globalThis);
