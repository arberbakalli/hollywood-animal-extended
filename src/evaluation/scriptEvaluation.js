(function(global) {
    "use strict";

    function calculateScriptEvaluation(tags, matrix = null, bonuses = null) {
        const matrixResult = matrix || HACCompatibilityEngine.calculateMatrixScore(tags, GAME_DATA);
        const bonusResult = bonuses || HACCompatibilityEngine.calculateTotalBonuses(tags, GAME_DATA);

        return {
            tags,
            matrix: matrixResult,
            bonuses: bonusResult,
            movieScores: calculateMovieScores(matrixResult, bonusResult, tags),
            audience: calculateGravesAudience(tags),
            conflicts: findGravesConflicts(tags)
        };
    }

    function setMarketingScoreControl(inputId, sliderId, value) {
        const normalized = HACScoreFormatting.formatMovieScore(Math.min(10, Math.max(0, Number(value) || 0)));
        const input = document.getElementById(inputId);
        const slider = document.getElementById(sliderId);

        if (input) input.value = normalized;
        if (slider) {
            slider.value = normalized;
            updateSliderTrack(slider);
        }

        input?.dispatchEvent(new Event('input', { bubbles: true }));
    }

    function autofillMarketingScoresFromTags(tags) {
        if (!tags || tags.length === 0) return;

        const scores = calculateScriptEvaluation(tags).movieScores;
        setMarketingScoreControl('comScoreInput', 'comScoreSlider', scores.commercial);
        setMarketingScoreControl('artScoreInput', 'artScoreSlider', scores.artistic);
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
        if (addedGenreInputs.length > 1) {
            updateGenreControls('advertisers');
        }
        HACGenreMix.restoreGenrePercents('advertisers', addedGenreInputs);
        autofillMarketingScoresFromTags(collectTagInputs('advertisers'));
        analyzeMovie();
    }

    global.HACScriptEvaluation = {
        calculateScriptEvaluation,
        autofillMarketingScoresFromTags,
        transferTagsToAdvertisers
    };
})(globalThis);
