(function(global) {
    function getScoringElementCount(tags) {
        return tags.filter(t => t.category !== "Genre" && t.category !== "Setting").length;
    }

    function getMovieScoreCap(scoringCount) {
        if (scoringCount >= 9) return 9;
        if (scoringCount >= 7) return 8;
        if (scoringCount >= 5) return 7;
        return 6;
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
        calculateMovieScores
    };
})(globalThis);
