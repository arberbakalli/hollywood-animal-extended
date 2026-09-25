(function(global) {
    "use strict";

    /**
     * Script Scoring Engine for Hollywood Animal Calculator
     *
     * Features 1-5 implementation:
     * - Score scripts for artistic vs commercial appeal
     * - Rank and recommend scripts based on demographic appeal
     * - Generate age-to-role breakdowns
     * - Calculate ad agency compatibility
     */

    // Demographic keys for scoring
    const ARTISTIC_DEMOGRAPHICS = ['AF', 'AM'];  // Adult Female, Adult Male
    const COMMERCIAL_DEMOGRAPHICS = ['TF', 'TM', 'YF', 'YM'];  // Teenage/Young Female/Male

    /**
     * Score artistic appeal of a script
     * Average of Adult (AF + AM) demographic weights
     *
     * @param {Array} scriptElements - Array of {id, percent} objects
     * @returns {number} Artistic appeal score (-5.0 to +5.0)
     */
    function score_artistic_appeal(scriptElements) {
        if (!scriptElements || scriptElements.length === 0) {
            return 0;
        }

        let totalArtistic = 0;
        scriptElements.forEach(element => {
            const tagData = GAME_DATA.tags[element.id];
            if (!tagData || !tagData.weights) return;

            const multiplier = element.percent || 1;
            ARTISTIC_DEMOGRAPHICS.forEach(demo => {
                totalArtistic += (tagData.weights[demo] || 0) * multiplier;
            });
        });

        // Average across demographics (2 adult demographics)
        const avgArtistic = totalArtistic / (ARTISTIC_DEMOGRAPHICS.length * scriptElements.length);
        return Math.max(-5.0, Math.min(5.0, avgArtistic));
    }

    /**
     * Score commercial appeal of a script
     * Average of Youth (TF + TM + YF + YM) demographic weights
     *
     * @param {Array} scriptElements - Array of {id, percent} objects
     * @returns {number} Commercial appeal score (-5.0 to +5.0)
     */
    function score_commercial_appeal(scriptElements) {
        if (!scriptElements || scriptElements.length === 0) {
            return 0;
        }

        let totalCommercial = 0;
        scriptElements.forEach(element => {
            const tagData = GAME_DATA.tags[element.id];
            if (!tagData || !tagData.weights) return;

            const multiplier = element.percent || 1;
            COMMERCIAL_DEMOGRAPHICS.forEach(demo => {
                totalCommercial += (tagData.weights[demo] || 0) * multiplier;
            });
        });

        // Average across demographics (4 youth demographics)
        const avgCommercial = totalCommercial / (COMMERCIAL_DEMOGRAPHICS.length * scriptElements.length);
        return Math.max(-5.0, Math.min(5.0, avgCommercial));
    }

    /**
     * Extract demographic compatibility data for a set of tags
     * Builds a demographic affinity profile for the script
     *
     * @param {Array} tagIds - Array of tag IDs
     * @returns {Object} Demographic affinity scores
     */
    function getCompatibilityElements(tagIds) {
        const affinity = Object.fromEntries(
            Object.keys(GAME_DATA.demographics).map(id => [id, 0])
        );

        tagIds.forEach(tagId => {
            const tagData = GAME_DATA.tags[tagId];
            if (!tagData || !tagData.weights) return;

            Object.keys(affinity).forEach(demoId => {
                affinity[demoId] += (tagData.weights[demoId] || 0);
            });
        });

        return affinity;
    }

    /**
     * Format a score for display with color-coding
     * Green: +3.0 or higher
     * Gray: -2.0 to +3.0
     * Red: -2.0 or lower
     *
     * @param {number} score - The score to format
     * @returns {Object} {value, cssClass, label}
     */
    function formatScoreForDisplay(score) {
        let cssClass = 'score-neutral';
        let label = 'Neutral';

        if (score >= 3.0) {
            cssClass = 'score-positive';
            label = 'Strong';
        } else if (score <= -2.0) {
            cssClass = 'score-negative';
            label = 'Weak';
        }

        return {
            value: score.toFixed(2),
            cssClass,
            label
        };
    }

    /**
     * Rank scripts by a specific appeal type
     *
     * @param {Array} scripts - Array of script objects with elements
     * @param {string} appealType - 'artistic' or 'commercial'
     * @returns {Array} Sorted scripts with scores
     */
    function rankScripts(scripts, appealType) {
        const scoreFn = appealType === 'artistic'
            ? score_artistic_appeal
            : score_commercial_appeal;

        const scoredScripts = scripts.map(script => ({
            ...script,
            score: scoreFn(script.elements),
            appealType
        }));

        // Sort by score descending
        return scoredScripts.sort((a, b) => b.score - a.score);
    }

    /**
     * Get top N scripts by appeal type
     *
     * @param {Array} scripts - Array of script objects
     * @param {string} appealType - 'artistic' or 'commercial'
     * @param {number} limit - Number of top scripts to return (default 3)
     * @returns {Array} Top N scripts with formatted scores
     */
    function getTopScripts(scripts, appealType, limit = 3) {
        const ranked = rankScripts(scripts, appealType);
        return ranked.slice(0, limit).map(script => ({
            ...script,
            displayScore: formatScoreForDisplay(script.score)
        }));
    }

    /**
     * Identify demographic gaps in a script for supporting character recommendations
     *
     * @param {Array} tagIds - Current tags in the script
     * @returns {Array} Array of {demographic, recommendedRoles} objects
     */
    function identifyDemographicGaps(tagIds) {
        const affinity = getCompatibilityElements(tagIds);
        const gaps = [];

        // Find demographics with low affinity
        Object.entries(affinity).forEach(([demoId, score]) => {
            if (score < 1.0) {  // Threshold for "gap"
                gaps.push({
                    demographic: demoId,
                    affinity: score,
                    demographicName: GAME_DATA.demographics[demoId]?.name || demoId
                });
            }
        });

        return gaps.sort((a, b) => a.affinity - b.affinity);
    }

    /**
     * Recommend supporting characters for demographic gaps
     *
     * @param {Array} tagIds - Current tags in the script
     * @param {number} limit - Number of recommendations per gap (default 3)
     * @returns {Array} Recommended supporting characters with gap details
     */
    function recommendSupportingCharacters(tagIds, limit = 3) {
        const gaps = identifyDemographicGaps(tagIds);
        const recommendations = [];

        gaps.forEach(gap => {
            // Find supporting characters strong in this demographic
            const supportingCharacterScores = [];

            Object.entries(GAME_DATA.tags).forEach(([tagId, tagData]) => {
                // Only consider supporting characters from the canonical tag category.
                if (tagData.category !== 'Supporting Character') return;
                if (!tagData.weights) return;

                const score = tagData.weights[gap.demographic] || 0;
                if (score > 0) {
                    supportingCharacterScores.push({
                        tagId,
                        tagName: tagData.name || tagId,
                        score,
                        demographic: gap.demographic,
                        demographicName: gap.demographicName
                    });
                }
            });

            // Sort by score and take top N
            supportingCharacterScores
                .sort((a, b) => b.score - a.score)
                .slice(0, limit)
                .forEach(rec => recommendations.push(rec));
        });

        return recommendations;
    }

    /**
     * Calculate agency compatibility for a script
     * Cross-reference themes to agency targets
     *
     * @param {Array} tagIds - Tags in the script
     * @returns {Array} Agency compatibility entries with match percentages
     */
    function calculateAgencyCompatibility(tagIds) {
        const agencies = GAME_DATA.adAgents || GAME_DATA.agencies || [];
        if (agencies.length === 0) {
            return [];
        }

        const scriptAffinity = getCompatibilityElements(tagIds);
        const compatibility = [];

        agencies.forEach(agency => {
            let matchScore = 0;
            let matchCount = 0;

            // Check demographic matches
            const targets = Array.isArray(agency.targets)
                ? agency.targets.map(demoId => [demoId, 1])
                : Object.entries(agency.targets || {});

            targets.forEach(([demoId, weight]) => {
                if (scriptAffinity[demoId] !== undefined) {
                    matchScore += scriptAffinity[demoId] * weight;
                    matchCount += 1;
                }
            });

            const avgMatch = matchCount > 0 ? matchScore / matchCount : 0;
            const matchPercentage = Math.max(0, Math.min(100, (avgMatch + 5) * 10));  // Normalize to 0-100

            compatibility.push({
                agencyId: agency.id,
                agencyName: agency.name,
                matchPercentage: Math.round(matchPercentage),
                matchScore: avgMatch,
                type: agency.type,
                level: agency.level
            });
        });

        // Sort by match percentage descending
        return compatibility.sort((a, b) => b.matchPercentage - a.matchPercentage);
    }

    // Export functions to global namespace
    global.HACScriptScoringEngine = {
        score_artistic_appeal,
        score_commercial_appeal,
        getCompatibilityElements,
        formatScoreForDisplay,
        rankScripts,
        getTopScripts,
        identifyDemographicGaps,
        recommendSupportingCharacters,
        calculateAgencyCompatibility
    };

})(globalThis);
