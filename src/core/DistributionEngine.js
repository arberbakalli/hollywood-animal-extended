import { GameConstants } from './GameConstants.js';

/**
 * Encapsulates the weekly box-office projection algorithm.
 *
 * Consolidates the hardcoded constants in script.js updateDistributionGrid()
 * (lines 1433-1437) with the canonical values in GameConstants.DISTRIBUTION,
 * eliminating the duplication identified in REFACTORING_PLAN.md issue #1.
 */
export class DistributionEngine {
    /**
     * Computes 8-week box office projections.
     *
     * Algorithm (matches script.js updateDistributionGrid() exactly):
     *   week1 = max(0,  score × W1_MULT × BASE  − screenings)   ceil
     *   week2 = max(0,  score × W2_MULT × BASE  − screenings)   ceil
     *   week3 = week2 × DECAY                                   ceil
     *   week4 = week3 × DECAY                                   ceil
     *   week5 = week4 × DECAY                                   floor
     *   …
     *   week8 = week7 × DECAY                                   floor
     *
     * @param {number} commercialScore  Movie commercial score (0–10)
     * @param {number} ownedScreenings  Theatres owned by the studio
     * @returns {number[]}              8 weekly attendance values, rounded
     */
    static project(commercialScore, ownedScreenings) {
        const {
            BASE,
            WEEK_ONE_MULTIPLIER,
            WEEK_TWO_MULTIPLIER,
            DECAY_FACTOR,
            NUM_WEEKS,
            ROUND_UP_UNTIL_INDEX,
        } = GameConstants.DISTRIBUTION;

        const w1 = Math.max(0, (commercialScore * WEEK_ONE_MULTIPLIER * BASE) - ownedScreenings);
        const w2 = Math.max(0, (commercialScore * WEEK_TWO_MULTIPLIER * BASE) - ownedScreenings);

        const raw = [w1, w2];
        let decayBase = w2;
        for (let i = 2; i < NUM_WEEKS; i++) {
            decayBase *= DECAY_FACTOR;
            raw.push(decayBase);
        }

        return raw.map((val, i) =>
            i < ROUND_UP_UNTIL_INDEX ? Math.ceil(val) : Math.floor(val)
        );
    }
}
