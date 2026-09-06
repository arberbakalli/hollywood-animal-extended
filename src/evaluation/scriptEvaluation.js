(function(global) {
    "use strict";

    async function calculateSynergy() {
        await ensureCompatibilityLoaded();
        clearFeedbackMessage('synergyFeedbackMessage');
        const selectedTags = collectTagInputs('synergy');
        if (selectedTags.length === 0) {
            showFeedbackMessage('synergyFeedbackMessage', 'Please select at least one tag.', 'accent');
            return;
        }
        const matrixResult = calculateMatrixScore(selectedTags);
        const bonuses = calculateTotalBonuses(selectedTags);
        const evaluation = calculateScriptEvaluation(selectedTags, matrixResult, bonuses);
        renderSynergyResults(evaluation);
    }

    function calculateScriptEvaluation(tags, matrix = null, bonuses = null) {
        const matrixResult = matrix || calculateMatrixScore(tags);
        const bonusResult = bonuses || calculateTotalBonuses(tags);

        return {
            tags,
            matrix: matrixResult,
            bonuses: bonusResult,
            movieScores: calculateMovieScores(matrixResult, bonusResult, tags),
            audience: calculateGravesAudience(tags),
            conflicts: findGravesConflicts(tags)
        };
    }

    function renderSynergyResults(evaluation) {
        const { matrix, bonuses, movieScores } = evaluation;
        document.getElementById('results-synergy').classList.remove('hidden');
        const avgEl = document.getElementById('synergyAverageDisplay');
        avgEl.innerHTML = `${matrix.rawAverage.toFixed(1)} <span class="sub-value">/ 5.0</span>`;
        if (matrix.rawAverage >= 3.5) setToneClass(avgEl, 'success');
        else if (matrix.rawAverage < 2.5) setToneClass(avgEl, 'danger');
        else setToneClass(avgEl, 'neutral');

        const baseScoreEl = document.getElementById('synergyTotalDisplay');
        baseScoreEl.innerText = formatScore(matrix.totalScore);
        setToneClass(baseScoreEl, matrix.totalScore >= 0 ? 'success' : 'danger');

        const breakdownBase = document.getElementById('breakdownBaseScore');
        breakdownBase.innerText = formatScore(matrix.totalScore);
        setToneClass(breakdownBase, matrix.totalScore >= 0 ? 'success' : 'danger');

        const breakdownCom = document.getElementById('breakdownComBonus');
        const breakdownArt = document.getElementById('breakdownArtBonus');
        breakdownCom.innerText = formatSimpleScore(bonuses.com);
        setToneClass(breakdownCom, bonuses.com > 0 ? 'success' : (bonuses.com < 0 ? 'danger' : 'neutral'));
        breakdownArt.innerText = formatSimpleScore(bonuses.art);
        setToneClass(breakdownArt, bonuses.art > 0 ? 'art' : (bonuses.art < 0 ? 'danger' : 'neutral'));

        const totalComEl = document.getElementById('totalComScore');
        const totalArtEl = document.getElementById('totalArtScore');

        function formatFinalRating(val) {
            if (val >= 10) return "10.0";
            return val.toFixed(1);
        }

        totalComEl.innerHTML = formatFinalRating(movieScores.commercial);
        setToneClass(totalComEl, movieScores.commercial > 0 ? 'accent' : 'danger');
        totalArtEl.innerHTML = formatFinalRating(movieScores.artistic);
        setToneClass(totalArtEl, movieScores.artistic > 0 ? 'art' : 'danger');

        let capLabel = document.getElementById('scoreCapLabel');
        if (!capLabel) {
            const rightCol = document.querySelector('#results-synergy .right-col');
            capLabel = document.createElement('div');
            capLabel.id = 'scoreCapLabel';
            capLabel.className = 'score-cap-label';
            rightCol.appendChild(capLabel);
        }
        capLabel.innerHTML = `Max Score Capped at <strong>${movieScores.tagCap}.0</strong> (${movieScores.scoringCount} Scoring Elements)`;

        const spoilerEl = document.getElementById('spoilerDisplay');
        if (matrix.spoilers.length > 0) {
            let uniqueSpoilers = [...new Set(matrix.spoilers)];
            spoilerEl.innerHTML = uniqueSpoilers.map(s =>
                `<div class="spoiler-row">${s}</div>`
            ).join('');
        } else {
            spoilerEl.innerHTML = '<div class="empty-state">No severe conflicts found.</div>';
        }
        document.getElementById('results-synergy').scrollIntoView({ behavior: 'smooth' });
    }

    function transferTagsToAdvertisers(sourceContext = 'synergy') {
        const inputs = collectTagInputs(sourceContext);
        if (inputs.length === 0) return;
        switchTab('advertisers');
        initializeSelectors('advertisers');
        const addedGenreInputs = [];
        inputs.forEach(input => {
            const tag = GAME_DATA.tags[input.id] || input;
            const added = addTagToSelectorContext(tag, 'advertisers');
            if (added && input.category === 'Genre') {
                addedGenreInputs.push(input);
            }
        });
        const genreInputs = addedGenreInputs;
        if (genreInputs.length > 1) {
            updateGenreControls('advertisers');
            const genreRows = document.querySelectorAll(`#inputs-${categoryToElementSlug('Genre')}-advertisers .genre-row`);
            genreRows.forEach((row, index) => {
                if (genreInputs[index]) {
                    const percentVal = Math.round(genreInputs[index].percent * 100);
                    row.querySelector('.percent-input').value = percentVal;
                    row.querySelector('.percent-slider').value = percentVal;
                    updatePercentSliderTrack(row.querySelector('.percent-slider'));
                }
            });
        }
        analyzeMovie();
    }

    global.HACScriptEvaluation = {
        calculateSynergy,
        calculateScriptEvaluation,
        renderSynergyResults,
        transferTagsToAdvertisers
    };
})(globalThis);
