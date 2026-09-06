(function(global) {
    "use strict";

    // Same bar findGravesConflicts uses, so "conflict" means one thing app-wide.
    const CONFLICT_PAIR_THRESHOLD = 2.0;
    // Same bar getGravesVerdict calls Success.
    const STRONG_FIT_THRESHOLD = 4.0;
    // Capped per band, not across the whole list. A conflicting candidate always
    // sorts below clean ones, so a global cap would truncate away the very
    // warnings a user needs before picking one.
    const MAX_ROWS_PER_BAND = 10;
    const MAX_ROWS = 30;

    let bestMatchMode = 'additions';
    let lastSelectedTags = [];

    function hideGravesBestMatches() {
        const panel = document.getElementById('graves-best-matches-panel');
        const list = document.getElementById('gravesBestMatchesList');
        if (panel) panel.classList.add('hidden');
        if (list) list.innerHTML = '';
    }

    function hideGravesEvaluationResults() {
        const resultsContainer = document.getElementById('results-graves');
        const evaluationPanels = [
            'graves-summary-row',
            'graves-reading-panel',
            'graves-detail-row'
        ];

        evaluationPanels.forEach(panelId => {
            const panel = document.getElementById(panelId);
            if (panel) panel.classList.add('hidden');
        });

        if (resultsContainer) resultsContainer.classList.add('hidden');
    }

    /* ---------------------------------------------------------------------
       Scoring
       --------------------------------------------------------------------- */

    function pairCount(size) {
        return (size * (size - 1)) / 2;
    }

    /**
     * Scores a candidate against every member of the current set.
     *
     * Only the pairs the candidate introduces are read. The set's own pairs are
     * identical for every candidate, so ranking on this average produces the same
     * order as rescoring the whole matrix, at O(n) instead of O(n^2).
     */
    function scoreAgainstSet(candidate, set) {
        let sum = 0;
        let worstScore = Infinity;
        let worstAgainst = null;

        set.forEach(member => {
            const score = getRawCompatibilityScore(candidate, member);
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

    /** Resulting script average after folding newPairSum into a known base. */
    function averageWith(baseAverage, baseSize, newPairSum) {
        const basePairs = pairCount(baseSize);
        return (baseAverage * basePairs + newPairSum) / (basePairs + baseSize);
    }

    function bandFor(fitAverage, worstScore) {
        if (worstScore < CONFLICT_PAIR_THRESHOLD) return 'unsuccessful';
        if (fitAverage >= STRONG_FIT_THRESHOLD) return 'successful';
        return 'common';
    }

    function displayName(tagLike) {
        const known = GAME_DATA.tags[tagLike.id];
        return known ? known.name : tagLike.id;
    }

    function minimumFit() {
        return parseFloat(document.getElementById('gravesBestScoreFilter')?.value || '4.0');
    }

    function collectCandidates(selectedTags) {
        const selectedIds = new Set(selectedTags.map(tag => tag.id));
        const excludedIds = getGeneratorExcludedIds();
        const starterIds = getAllAvailableTagIds('starting');
        const categoryFilter = document.getElementById('gravesBestCategoryFilter')?.value || '';
        const starterOnly = Boolean(document.getElementById('gravesStarterOnlyFilter')?.checked);

        return Object.values(GAME_DATA.tags).filter(tag => {
            if (!tag || !tag.id) return false;
            if (selectedIds.has(tag.id)) return false;
            if (excludedIds.has(tag.id)) return false;
            if (categoryFilter && tag.category !== categoryFilter) return false;
            if (starterOnly && !starterIds.has(tag.id)) return false;
            return true;
        });
    }

    function rankCandidates(candidates, set, minimum) {
        return candidates
            .map(candidate => ({ candidate, ...scoreAgainstSet(candidate, set) }))
            .filter(row => row.fitAverage >= minimum)
            .sort((a, b) =>
                b.fitAverage - a.fitAverage ||
                a.candidate.name.localeCompare(b.candidate.name)
            );
    }

    function buildAdditions(selectedTags) {
        const currentAverage = calculateMatrixScore(selectedTags).rawAverage;

        return rankCandidates(collectCandidates(selectedTags), selectedTags, minimumFit())
            .map(row => Object.assign({}, row, {
                currentAverage,
                resultingAverage: averageWith(currentAverage, selectedTags.length, row.newPairSum),
                band: bandFor(row.fitAverage, row.worstScore)
            }));
    }

    /** The element whose removal lifts the script average the most. */
    function weakestSlot(selectedTags) {
        let weakest = null;

        selectedTags.forEach((tag, index) => {
            const rest = selectedTags.filter((_, position) => position !== index);
            if (rest.length === 0) return;

            const averageWithout = calculateMatrixScore(rest).rawAverage;
            if (!weakest || averageWithout > weakest.averageWithout) {
                weakest = { tag, rest, averageWithout };
            }
        });

        return weakest;
    }

    function buildSwaps(selectedTags) {
        if (selectedTags.length < 2) return null;

        const slot = weakestSlot(selectedTags);
        if (!slot) return null;

        const currentAverage = calculateMatrixScore(selectedTags).rawAverage;

        const rows = rankCandidates(collectCandidates(selectedTags), slot.rest, minimumFit())
            .map(row => Object.assign({}, row, {
                currentAverage,
                resultingAverage: averageWith(slot.averageWithout, slot.rest.length, row.newPairSum),
                band: bandFor(row.fitAverage, row.worstScore)
            }))
            .filter(row => row.resultingAverage > currentAverage);

        return { slot, rows, currentAverage };
    }

    function buildPairwise(selectedTags) {
        const candidates = collectCandidates(selectedTags);
        const minimum = minimumFit();
        const matches = [];

        selectedTags.forEach(selectedTag => {
            candidates.forEach(candidate => {
                const score = getRawCompatibilityScore(selectedTag, candidate);
                if (score < minimum) return;

                matches.push({
                    selectedName: displayName(selectedTag),
                    selectedCategory: selectedTag.category,
                    candidate,
                    score
                });
            });
        });

        return matches
            .sort((a, b) => b.score - a.score || a.candidate.name.localeCompare(b.candidate.name))
            .slice(0, MAX_ROWS);
    }

    /* ---------------------------------------------------------------------
       Rendering
       --------------------------------------------------------------------- */

    function deltaMarkup(currentAverage, resultingAverage) {
        const delta = resultingAverage - currentAverage;
        const tone = delta > 0 ? 'up' : (delta < 0 ? 'down' : 'flat');
        const sign = delta > 0 ? '+' : '';

        return `<span class="best-match-delta">
            <span class="best-match-from">${currentAverage.toFixed(1)}</span>
            <span class="best-match-arrow">&rarr;</span>
            <span class="best-match-to ${tone}">${resultingAverage.toFixed(1)}</span>
            <span class="best-match-change ${tone}">${sign}${delta.toFixed(2)}</span>
        </span>`;
    }

    function warningMarkup(row) {
        if (row.worstScore >= CONFLICT_PAIR_THRESHOLD) return '';
        return `<span class="best-match-warning">clashes with ${displayName(row.worstAgainst)} (${row.worstScore.toFixed(1)})</span>`;
    }

    function addButtonMarkup(candidate, index) {
        return `<button id="graves-best-match-add-${index + 1}" class="best-match-add-btn" type="button" data-action="add-graves-best-match" data-tag-id="${candidate.id}" data-category="${candidate.category}">Add</button>`;
    }

    function rowMarkup(row, index) {
        return `
            <div id="graves-best-match-${index + 1}" class="best-match-item best-match-${row.band} ${categoryToElementSlug(row.candidate.category)}" data-role="graves-best-match" data-tag-id="${row.candidate.id}" data-category="${row.candidate.category}" data-score="${row.fitAverage.toFixed(2)}" data-band="${row.band}">
                <div class="best-match-pair">
                    <span class="best-match-tag ${categoryToElementSlug(row.candidate.category)}">${row.candidate.name}</span>
                    ${warningMarkup(row)}
                </div>
                <div class="best-match-meta">
                    <span class="best-match-category">${row.candidate.category}</span>
                    ${deltaMarkup(row.currentAverage, row.resultingAverage)}
                    ${addButtonMarkup(row.candidate, index)}
                </div>
            </div>`;
    }

    const BAND_LABELS = {
        successful: 'Successful combinations',
        common: 'Common combinations',
        unsuccessful: 'Unsuccessful combinations'
    };

    function groupedMarkup(rows) {
        let index = 0;
        return ['successful', 'common', 'unsuccessful'].map(band => {
            const banded = rows.filter(row => row.band === band).slice(0, MAX_ROWS_PER_BAND);
            if (banded.length === 0) return '';

            const body = banded.map(row => rowMarkup(row, index++)).join('');
            return `<div class="best-match-band best-match-band-${band}">
                <h4 class="best-match-band-title">${BAND_LABELS[band]}</h4>
                ${body}
            </div>`;
        }).join('');
    }

    function emptyMarkup(message) {
        return `<div class="empty-state">${message}</div>`;
    }

    function renderAdditions(list, selectedTags) {
        const rows = buildAdditions(selectedTags);
        list.innerHTML = rows.length
            ? groupedMarkup(rows)
            : emptyMarkup('No additions clear the minimum fit. Try a lower fit or a different category.');
    }

    function renderSwaps(list, selectedTags) {
        const result = buildSwaps(selectedTags);

        if (!result) {
            list.innerHTML = emptyMarkup('Select at least 2 elements to see swap suggestions.');
            return;
        }

        if (result.rows.length === 0) {
            list.innerHTML = emptyMarkup('No replacement scores better than what you already have.');
            return;
        }

        const slotName = displayName(result.slot.tag);
        list.innerHTML = `
            <div class="best-match-slot-note">
                Weakest element: <strong>${slotName}</strong>. Replacing it with any of these raises the script average.
            </div>
            ${groupedMarkup(result.rows)}`;
    }

    function renderPairwise(list, selectedTags) {
        const matches = buildPairwise(selectedTags);

        if (matches.length === 0) {
            list.innerHTML = emptyMarkup('No matches found for these filters. Try a lower fit or a different category.');
            return;
        }

        list.innerHTML = matches.map((match, index) => `
            <div id="graves-best-match-${index + 1}" class="best-match-item ${categoryToElementSlug(match.candidate.category)}" data-role="graves-best-match" data-tag-id="${match.candidate.id}" data-category="${match.candidate.category}" data-score="${match.score.toFixed(2)}">
                <div class="best-match-pair">
                    <span class="best-match-tag primary ${categoryToElementSlug(match.selectedCategory)}">${match.selectedName}</span>
                    <span class="best-match-arrow">&rarr;</span>
                    <span class="best-match-tag ${categoryToElementSlug(match.candidate.category)}">${match.candidate.name}</span>
                </div>
                <div class="best-match-meta">
                    <span class="best-match-category">${match.candidate.category}</span>
                    <span class="best-match-score ${match.score >= 4.5 ? 'score-excellent' : 'score-strong'}">${match.score.toFixed(2)}</span>
                    ${addButtonMarkup(match.candidate, index)}
                </div>
            </div>
        `).join('');
    }

    function bindAddButtons(list) {
        list.querySelectorAll('[data-action="add-graves-best-match"]').forEach(button => {
            button.addEventListener('click', () => {
                const tag = GAME_DATA.tags[button.dataset.tagId];
                if (!tag) return;
                const added = addTagToSelectorContext(tag, 'graves');
                if (added) {
                    showFeedbackMessage('gravesFeedbackMessage', `${tag.name} added to the Graves script.`, 'success');
                    lastSelectedTags = collectTagInputs('graves');
                    renderBestMatches();
                }
            });
        });
    }

    function syncModeButtons() {
        document.querySelectorAll('[data-best-match-mode]').forEach(button => {
            const isActive = button.dataset.bestMatchMode === bestMatchMode;
            button.classList.toggle('active', isActive);
            button.setAttribute('aria-pressed', String(isActive));
        });
    }

    function renderBestMatches() {
        const resultsContainer = document.getElementById('results-graves');
        const panel = document.getElementById('graves-best-matches-panel');
        const list = document.getElementById('gravesBestMatchesList');

        if (!resultsContainer || !panel || !list) return;

        resultsContainer.classList.remove('hidden');
        panel.classList.remove('hidden');
        syncModeButtons();

        if (lastSelectedTags.length === 0) {
            list.innerHTML = emptyMarkup('Select at least one element to find strong matches.');
            return;
        }

        if (bestMatchMode === 'swaps') renderSwaps(list, lastSelectedTags);
        else if (bestMatchMode === 'pairwise') renderPairwise(list, lastSelectedTags);
        else renderAdditions(list, lastSelectedTags);

        bindAddButtons(list);
    }

    function setBestMatchMode(mode) {
        bestMatchMode = mode;
        if (lastSelectedTags.length === 0) {
            syncModeButtons();
            return;
        }
        renderBestMatches();
    }

    async function generateBestMatches() {
        await ensureCompatibilityLoaded();
        clearFeedbackMessage('gravesFeedbackMessage');
        hideGravesEvaluationResults();

        const selectedTags = collectTagInputs('graves');
        if (selectedTags.length === 0) {
            showFeedbackMessage('gravesFeedbackMessage', 'Select at least one element to find strong matches.');
            return;
        }

        lastSelectedTags = selectedTags;
        renderBestMatches();
        document.getElementById('graves-best-matches-panel')
            ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    global.HACGravesBestMatches = {
        hideGravesBestMatches,
        generateBestMatches,
        hideGravesEvaluationResults,
        renderBestMatches,
        setBestMatchMode
    };
})(globalThis);
