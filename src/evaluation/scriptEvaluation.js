(function(global) {
    "use strict";

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

    function transferTagsToAdvertisers(sourceContext = 'graves') {
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
        calculateScriptEvaluation,
        transferTagsToAdvertisers
    };
})(globalThis);
