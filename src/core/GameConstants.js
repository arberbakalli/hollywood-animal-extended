export class GameConstants {
    static DISTRIBUTION = Object.freeze({
        BASE: 1000,
        WEEK_ONE_MULTIPLIER: 2,
        WEEK_TWO_MULTIPLIER: 1,
        DECAY_FACTOR: 0.8,
        NUM_WEEKS: 8,
        ROUND_UP_UNTIL_INDEX: 4,
        DEFAULT_SCREENINGS: 3200,
    });

    static KINOMARK = Object.freeze({
        AUDIENCE_WEIGHT: 0.4,
        SCORE_WEIGHTS: Object.freeze([0.25, 0.5, 0.25]),
        THRESHOLDS: Object.freeze([0.16, 0.23, 0.30, 0.37, 0.44, 0.51, 0.58, 0.65, 0.72, 0.79, 0.86, 0.93]),
        MAX_GAME_SCORE: 9.9,
        RELEASE_MAGIC_NUMBER: 3.0,
    });

    static POPULATION = 30_000_000;

    // Ordered high → low so the first match wins
    static TAG_CAP_THRESHOLDS = Object.freeze([
        { min: 9, cap: 9 },
        { min: 7, cap: 8 },
        { min: 5, cap: 7 },
        { min: 0, cap: 6 },
    ]);

    /**
     * Returns the movie-score cap for a given number of scoring elements.
     * Consolidates the duplicated if/else chains in runGenerationAlgorithm (script.js:785)
     * and renderSynergyResults (script.js:1656).
     */
    static getTagCap(scoringElementCount) {
        for (const { min, cap } of GameConstants.TAG_CAP_THRESHOLDS) {
            if (scoringElementCount >= min) return cap;
        }
        return 6;
    }

    static getMaxScriptQuality(scoringElementCount) {
        return GameConstants.getTagCap(scoringElementCount) - 1;
    }
}
