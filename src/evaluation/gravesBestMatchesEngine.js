(function(global) {
    "use strict";

    const CONFLICT_PAIR_THRESHOLD = 2.0;
    const STRONG_FIT_THRESHOLD = 4.0;
    const MAX_PAIRWISE_ROWS = 100;

    function pairCount(size) {
        return (size * (size - 1)) / 2;
    }

    function scoreAgainstSet(candidate, set, getScore = global.getRawCompatibilityScore) {
        let sum = 0;
        let worstScore = Infinity;
        let worstAgainst = null;

        set.forEach(member => {
            const score = getScore(candidate, member);
            sum += score;
            if (score < worstScore) {
                worstScore = score;
                worstAgainst = member;
            }
        });

        return {
            fitAverage: set.length ? sum / set.length : 0,
            newPairSum: sum,
            worstScore: set.length ? worstScore : 0,
            worstAgainst
        };
    }

    function averageWith(baseAverage, baseSize, newPairSum) {
        const basePairs = pairCount(baseSize);
        return (baseAverage * basePairs + newPairSum) / (basePairs + baseSize);
    }

    function bandFor(fitAverage, worstScore) {
        if (worstScore < CONFLICT_PAIR_THRESHOLD) return 'unsuccessful';
        if (fitAverage >= STRONG_FIT_THRESHOLD) return 'successful';
        return 'common';
    }

    function categoryCardinality(selectedTags) {
        const counts = {};
        selectedTags.forEach(tag => {
            counts[tag.category] = (counts[tag.category] || 0) + 1;
        });
        return counts;
    }

    // Genre is uncapped. A script can carry all eleven, split by percentage, and
    // the common two-genre mix is a habit rather than a limit. This used to
    // special-case Genre to 2, which silently withheld every Genre suggestion
    // from a script that already had two.
    function isCategoryFull(category, counts, multiSelectCategories = global.MULTI_SELECT_CATEGORIES || []) {
        const maxForCategory = multiSelectCategories.includes(category) ? Infinity : 1;
        return (counts[category] || 0) >= maxForCategory;
    }

    function rankCandidates(candidates, set, minimum, options = {}) {
        return candidates
            .map(candidate => ({ candidate, ...scoreAgainstSet(candidate, set, options.getRawCompatibilityScore) }))
            .filter(row => row.fitAverage >= minimum)
            .sort((a, b) =>
                b.fitAverage - a.fitAverage ||
                a.candidate.name.localeCompare(b.candidate.name)
            );
    }

    function buildAdditions(selectedTags, candidates, minimum, maxPoolSize, options = {}) {
        const calculateMatrixScore = options.calculateMatrixScore || global.calculateMatrixScore;
        const currentAverage = calculateMatrixScore(selectedTags).rawAverage;
        const counts = categoryCardinality(selectedTags);
        const poolCount = selectedTags.filter(tag =>
            tag.category !== 'Genre' && tag.category !== 'Setting'
        ).length;
        // Genre and Setting spend no budget, so they stay addable when the
        // story elements are full (owner ruling 2026-10-01). Setting still
        // holds one, which isCategoryFull enforces.
        const spendsBudget = candidate => candidate.category !== 'Genre' && candidate.category !== 'Setting';
        const eligibleCandidates = candidates.filter(candidate => {
            if (isCategoryFull(candidate.category, counts, options.multiSelectCategories)) return false;
            if (spendsBudget(candidate) && poolCount >= maxPoolSize) return false;
            return true;
        });

        return rankCandidates(eligibleCandidates, selectedTags, minimum, options)
            .map(row => Object.assign({}, row, {
                currentAverage,
                resultingAverage: averageWith(currentAverage, selectedTags.length, row.newPairSum),
                band: bandFor(row.fitAverage, row.worstScore)
            }));
    }

    function buildSwaps(selectedTags, candidates, minimum, options = {}) {
        if (selectedTags.length < 2) return null;

        const calculateMatrixScore = options.calculateMatrixScore || global.calculateMatrixScore;
        const currentAverage = calculateMatrixScore(selectedTags).rawAverage;
        const allRows = [];
        const slots = [];
        const unresolvedClashes = [];

        selectedTags.forEach((tag, index) => {
            const rest = selectedTags.filter((_, position) => position !== index);
            if (rest.length === 0) return;

            const averageWithout = calculateMatrixScore(rest).rawAverage;
            // A slot in an Unsuccessful pair is there to clear the clash, so
            // it does not also have to raise the average (owner ruling
            // 2026-09-30). An element that clashes once can still fit the rest
            // well enough that no swap raises the average, and the slot then
            // stayed silent exactly where Evaluate showed red.
            const own = scoreAgainstSet(tag, rest, options.getRawCompatibilityScore);
            const clash = own.worstScore < CONFLICT_PAIR_THRESHOLD
                ? { against: own.worstAgainst, score: own.worstScore }
                : null;
            const slot = { tag, rest, averageWithout, index, clash };
            slots.push(slot);

            const sameCategory = candidates.filter(candidate =>
                candidate.category === tag.category
            );

            const rowsAtFit = (fit) => rankCandidates(sameCategory, rest, fit, options)
                .map(row => Object.assign({}, row, {
                    slotIndex: index,
                    slotTag: tag,
                    currentAverage,
                    resultingAverage: averageWith(averageWithout, rest.length, row.newPairSum),
                    band: bandFor(row.fitAverage, row.worstScore)
                }))
                // A swap never brings in an Unsuccessful pair: that trades one
                // clash for another, however the average moves.
                .filter(row => row.worstScore >= CONFLICT_PAIR_THRESHOLD)
                // Outside a clash, every row raises the script average, so the
                // fit threshold is a second and much stricter filter on top.
                .filter(row => clash || row.resultingAverage > currentAverage);

            // Widening is per slot. A candidate is scored against the remaining
            // elements, so a weak script -- the one actually worth repairing --
            // is the hardest place to clear the bar, and the slots in trouble
            // are the ones that fall silent. Widening the whole result instead
            // would be suppressed by any one slot that did find rows.
            let rowsForSlot = rowsAtFit(minimum);
            if (rowsForSlot.length === 0 && minimum > 0) {
                rowsForSlot = rowsAtFit(0).map(row => Object.assign({}, row, { belowRequestedFit: true }));
            }

            if (clash && rowsForSlot.length === 0) {
                unresolvedClashes.push({ tag, against: clash.against, score: clash.score });
            }

            allRows.push(...rowsForSlot);
        });

        if (allRows.length === 0 && unresolvedClashes.length === 0) return null;

        const rowsBySlot = {};
        allRows.forEach(row => {
            if (!rowsBySlot[row.slotIndex]) {
                rowsBySlot[row.slotIndex] = {
                    slot: slots[row.slotIndex],
                    rows: []
                };
            }
            rowsBySlot[row.slotIndex].rows.push(row);
        });

        return { rowsBySlot, allRows, currentAverage, unresolvedClashes };
    }

    // Pairwise deliberately ignores the element budget: it is an analysis view,
    // and hiding pairs at the budget removes the comparison exactly when the
    // user is deciding what to trade. The panel disables the Add button instead.
    function buildPairwise(selectedTags, candidates, minimum, options = {}) {
        const displayName = options.displayName || (tag => tag.name || tag.id);
        const getScore = options.getRawCompatibilityScore || global.getRawCompatibilityScore;
        // A full category is not excluded here. Dropping it meant Pairwise could
        // never suggest replacing a Protagonist, Antagonist, Setting or Finale
        // once one was chosen, which is most of the time. The panel labels these
        // Swap rather than Add.
        const eligibleCandidates = candidates;
        const matches = [];

        selectedTags.forEach(selectedTag => {
            eligibleCandidates.forEach(candidate => {
                const score = getScore(selectedTag, candidate);
                if (score < minimum) return;

                matches.push({
                    selectedId: selectedTag.id,
                    selectedName: displayName(selectedTag),
                    selectedCategory: selectedTag.category,
                    candidate,
                    score
                });
            });
        });

        return matches
            .sort((a, b) => b.score - a.score || a.candidate.name.localeCompare(b.candidate.name))
            .slice(0, MAX_PAIRWISE_ROWS);
    }

    global.HACGravesBestMatchesEngine = {
        CONFLICT_PAIR_THRESHOLD,
        STRONG_FIT_THRESHOLD,
        MAX_PAIRWISE_ROWS,
        averageWith,
        bandFor,
        buildAdditions,
        buildPairwise,
        buildSwaps,
        categoryCardinality,
        isCategoryFull,
        pairCount,
        rankCandidates,
        scoreAgainstSet
    };
})(globalThis);
