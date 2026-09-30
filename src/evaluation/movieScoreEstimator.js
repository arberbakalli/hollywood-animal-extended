(function(global) {
    function getScoringElementCount(tags) {
        // Deliberately standalone: this module is unit-tested in isolation and
        // loads before gravesAnalysis.js, so it cannot reach for the shared
        // helper. Pinned by "getScoringElementCount excludes Genre and Setting".
        return tags.filter(t => t.category !== "Genre" && t.category !== "Setting").length;
    }

    function getMovieScoreCap(scoringCount) {
        // Game's Rating Limit table (2026-09-28):
        // 9 elements → 9, 10 elements → 10 (not 9 → 10)
        if (scoringCount === 10) return 10;
        if (scoringCount === 9) return 9;
        if (scoringCount >= 7) return 8;
        if (scoringCount >= 5) return 7;
        return 6;
    }

    // Script column of the same table (GAME_RULES.md section 1). Every row's
    // movie limit is distinct, so it alone picks the row.
    const SCRIPT_LIMIT_BY_MOVIE_LIMIT = { 6: 5, 7: 6, 8: 7, 9: 8, 10: 10 };

    function getScriptQualityCap(movieLimit) {
        return SCRIPT_LIMIT_BY_MOVIE_LIMIT[movieLimit];
    }

    function calculateMovieScores(matrix, bonuses, tags) {
        const scoringCount = tags ? getScoringElementCount(tags) : 0;
        const tagCap = getMovieScoreCap(scoringCount);
        const maxGameScore = 9.9;
        const commercial = Math.min(tagCap, Math.max(0, (matrix.totalScore + bonuses.com) * maxGameScore));
        const artistic = Math.min(tagCap, Math.max(0, (matrix.totalScore + bonuses.art) * maxGameScore));

        return { commercial, artistic, tagCap, scoringCount };
    }

    global.HACMovieScoreEstimator = {
        getScoringElementCount,
        getMovieScoreCap,
        getScriptQualityCap,
        calculateMovieScores
    };
})(globalThis);
