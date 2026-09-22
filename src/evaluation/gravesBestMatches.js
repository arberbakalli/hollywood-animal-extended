(function(global) {
    "use strict";

    // Pagination: show 10 rows initially, then offer "Show more" to load next batch.
    const ROWS_PER_PAGE = 10;
    const ROWS_INCREMENT = 10;

    const Engine = global.HACGravesBestMatchesEngine;
    let bestMatchMode = 'additions';
    let lastSelectedTags = [];
    let visibleRowCount = ROWS_PER_PAGE;
    let totalRowCount = 0;

    function hideGravesBestMatches() {
        const panel = document.getElementById('graves-best-matches-panel');
        const list = document.getElementById('gravesBestMatchesList');
        if (panel) panel.classList.add('hidden');
        if (list) list.innerHTML = '';
    }

    function hideGravesEvaluationResults() {
        const resultsContainer = document.getElementById('results-graves');
        // Every panel Evaluate Script owns. Generate Best Matches reveals the
        // shared results container, so anything missing from this list shows up
        // holding either a placeholder or the previous run's numbers.
        const evaluationPanels = [
            'graves-summary-row',
            'graves-reading-panel',
            'graves-detail-row',
            'graves-pairs-panel',
            'graves-breakdown-panel'
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

    function displayName(tagLike) {
        const known = GAME_DATA.tags[tagLike.id];
        return known ? known.name : tagLike.id;
    }

    function minimumFit() {
        return parseFloat(document.getElementById('gravesBestScoreFilter')?.value || '4.0');
    }

    /**
     * Exclusions are one shared list owned by Script Lab, and they silently
     * filter these suggestions. Without this notice a user can wonder why an
     * obvious tag never appears.
     */
    function updateGravesExclusionNotice() {
        const notice = document.getElementById('graves-exclusion-notice');
        const summary = document.getElementById('gravesExclusionSummary');
        if (!notice || !summary) return;

        const profileIds = getProfileExcludedIds();
        const startingOnly = profileIds.size > 0;
        // The Starting Tags profile fills the excluded list itself, so count only
        // what the user excluded on top of it rather than reporting both twice.
        const manualCount = [...getManuallyExcludedIds('excluded')]
            .filter(id => !profileIds.has(id)).length;

        if (!manualCount && !startingOnly) {
            notice.classList.add('hidden');
            return;
        }

        const reasons = [];
        if (startingOnly) reasons.push('the Starting Tags profile');
        if (manualCount) reasons.push(`${manualCount} excluded element${manualCount === 1 ? '' : 's'}`);

        summary.textContent = `Script Lab is hiding suggestions: ${reasons.join(' and ')}.`;
        notice.classList.remove('hidden');
    }

    function jumpToExclusionEditor() {
        switchTab('generator');

        const toggle = document.getElementById('toggleExcludedElementsButton');
        const content = document.getElementById('excluded-content');
        if (toggle && content && content.classList.contains('hidden')) toggle.click();

        document.getElementById('generator-excluded-header')
            ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function collectCandidates(selectedTags) {
        const selectedIds = new Set(selectedTags.map(tag => tag.id));
        // Graves evaluates ANY script. Use only manual exclusions from Script Lab.
        const excludedIds = new Set(collectTagInputs('excluded').map(tag => tag.id));
        const categoryFilter = document.getElementById('gravesBestCategoryFilter')?.value || '';

        const allTags = Object.values(GAME_DATA.tags);
        const candidates = allTags.filter(tag => {
            if (!tag || !tag.id) return false;
            if (selectedIds.has(tag.id)) return false;
            if (excludedIds.has(tag.id)) return false;
            if (categoryFilter && tag.category !== categoryFilter) return false;
            return true;
        });

        return candidates;
    }

    function engineOptions() {
        return {
            calculateMatrixScore,
            displayName,
            getRawCompatibilityScore,
            multiSelectCategories: MULTI_SELECT_CATEGORIES
        };
    }

    function maxElementPool() {
        return typeof HACScriptGenerator !== 'undefined' && HACScriptGenerator.getMaxElementPoolSize
            ? HACScriptGenerator.getMaxElementPoolSize()
            : 10;
    }

    function atElementBudget(selectedTags) {
        const budgeted = selectedTags.filter(tag =>
            tag.category !== 'Genre' && tag.category !== 'Setting'
        ).length;
        return budgeted >= maxElementPool();
    }

    function elementBudgetMessage() {
        return `This script already uses all ${maxElementPool()} story elements it is allowed. `
            + 'Raise Max Element Pool in the header to make room, or use Swap Suggestions '
            + 'to trade an element instead. Genre and Setting do not count toward the budget.';
    }

    function buildAdditions(selectedTags) {
        return Engine.buildAdditions(
            selectedTags,
            collectCandidates(selectedTags),
            minimumFit(),
            maxElementPool(),
            engineOptions()
        );
    }

    // A swap only ever replaces a slot with a candidate of the same category, so
    // it cannot change how many story elements the script carries. The element
    // budget is deliberately not consulted here.
    function buildSwaps(selectedTags) {
        return Engine.buildSwaps(
            selectedTags,
            collectCandidates(selectedTags),
            minimumFit(),
            engineOptions()
        );
    }

    function buildPairwise(selectedTags) {
        return Engine.buildPairwise(
            selectedTags,
            collectCandidates(selectedTags),
            minimumFit(),
            engineOptions()
        );
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
        if (row.worstScore >= Engine.CONFLICT_PAIR_THRESHOLD) return '';
        return `<span class="best-match-warning">clashes with ${displayName(row.worstAgainst)} (${row.worstScore.toFixed(1)})</span>`;
    }

    /**
     * Add or Swap follows one rule: a category that is already full can only be
     * traded into. That rule lives in the engine's isCategoryFull (Genre caps at
     * 2, multi-select categories are uncapped, everything else holds one), and
     * this defers to it rather than keeping a second copy in the panel.
     */
    function buttonLabelFor(category, selectedCount) {
        return Engine.isCategoryFull(category, { [category]: selectedCount }, MULTI_SELECT_CATEGORIES)
            ? 'Swap'
            : 'Add';
    }

    function addButtonMarkup(candidate, index, selectedTags = lastSelectedTags) {
        const categorySlug = categoryToElementSlug(candidate.category);
        const categoryRows = document.querySelectorAll(`#inputs-${categorySlug}-graves [data-role="tag-selector-row"]`);
        const selectedCount = Array.from(categoryRows).filter(row => {
            const select = row.querySelector('select.tag-selector');
            return select && select.value && select.value !== '';
        }).length;

        const label = buttonLabelFor(candidate.category, selectedCount);
        const action = label === 'Swap' ? 'swap-graves-best-match' : 'add-graves-best-match';

        // Only a genuine Add grows the pool. A Swap trades within a category,
        // and Genre and Setting are context rather than budgeted elements.
        const growsPool = label === 'Add'
            && candidate.category !== 'Genre'
            && candidate.category !== 'Setting';
        const blocked = growsPool && atElementBudget(selectedTags);
        const blockedAttrs = blocked
            ? ` disabled aria-disabled="true" title="This script already uses all ${maxElementPool()} story elements it is allowed. Raise Max Element Pool, or swap an element instead."`
            : '';

        return `<button id="graves-best-match-add-${index + 1}" class="best-match-add-btn best-match-${label.toLowerCase()}-btn" type="button" data-action="${action}" data-tag-id="${candidate.id}" data-category="${candidate.category}"${blockedAttrs}>${label}</button>`;
    }

    function tagClass(tag) {
        const categoryClass = categoryToElementSlug(tag.category);
        const genreClass = tag.category === 'Genre' ? `genre-${toDomId(tag.id)}` : '';
        return `${categoryClass} ${genreClass}`.trim();
    }

    function rowMarkup(row, index, forceSwap = false) {
        return `
            <div id="graves-best-match-${index + 1}" class="best-match-item best-match-${row.band} ${tagClass(row.candidate)}" data-role="graves-best-match" data-tag-id="${row.candidate.id}" data-category="${row.candidate.category}" data-score="${row.fitAverage.toFixed(2)}" data-band="${row.band}">
                <div class="best-match-pair">
                    <span class="best-match-tag ${tagClass(row.candidate)}">${row.candidate.name}</span>
                    ${warningMarkup(row)}
                </div>
                <div class="best-match-meta">
                    <span class="best-match-category">${row.candidate.category}</span>
                    ${deltaMarkup(row.currentAverage, row.resultingAverage)}
                    ${forceSwap ? `<button id="graves-best-match-add-${index + 1}" class="best-match-add-btn best-match-swap-btn" type="button" data-action="swap-graves-best-match" data-tag-id="${row.candidate.id}" data-category="${row.candidate.category}">Swap</button>` : addButtonMarkup(row.candidate, index)}
                </div>
            </div>`;
    }

    const BAND_LABELS = {
        successful: 'Successful combinations',
        common: 'Common combinations',
        unsuccessful: 'Unsuccessful combinations'
    };

    const BAND_ORDER = ['successful', 'common', 'unsuccessful'];

    // The page fills in band order, so the strongest candidates always occupy the
    // first page and a conflicted one can never push a clean one onto page two.
    function paginateRows(rows, rowLimit) {
        const visible = [];
        BAND_ORDER.forEach(band => {
            rows.filter(row => row.band === band).forEach(row => {
                if (visible.length < rowLimit) visible.push(row);
            });
        });
        return visible;
    }

    function groupedMarkup(rows, rowLimit = visibleRowCount, forceSwap = false) {
        totalRowCount = rows.length;
        const visible = paginateRows(rows, rowLimit);

        let index = 0;
        return BAND_ORDER.map(band => {
            const banded = visible.filter(row => row.band === band);
            if (banded.length === 0) return '';

            const body = banded.map(row => rowMarkup(row, index++, forceSwap)).join('');
            return `<div class="best-match-band best-match-band-${band}">
                <h4 class="best-match-band-title">${BAND_LABELS[band]}</h4>
                ${body}
            </div>`;
        }).join('');
    }

    function emptyMarkup(message) {
        return `<div class="empty-state">${message}</div>`;
    }

    function showMoreButton() {
        return visibleRowCount < totalRowCount
            ? `<div class="best-match-show-more-wrapper">
                   <button id="graves-show-more-btn" class="best-match-show-more-btn">
                       Show more suggestions (${totalRowCount - visibleRowCount} more available)
                   </button>
               </div>`
            : '';
    }

    function expandMatches() {
        visibleRowCount += ROWS_INCREMENT;
        renderBestMatches();
    }

    // At the element budget no fit threshold and no category will ever yield a
    // row, so the generic advice sends the user round in circles. Name the
    // blocker that actually applies.
    function additionsEmptyReason(selectedTags) {
        if (atElementBudget(selectedTags)) return elementBudgetMessage();
        return 'No additions available. Try a different script or adjust categories.';
    }

    const FIT_VALUES = ['0', '3.0', '3.5', '4.0', '4.5', '5.0'];

    /**
     * Runs a search and, if the user's Minimum Fit yields nothing, walks the
     * threshold down until it does. Reporting an empty result that the filter
     * itself caused reads as "there is nothing", which is a different and much
     * more discouraging claim.
     *
     * Swap Suggestions needs this at least as much as Best Additions: a swap
     * candidate is scored against the remaining elements, so a weak script --
     * exactly the one worth repairing -- is the hardest place to clear the bar.
     *
     * When widening finds nothing either, the control goes back to where the
     * user left it, so the next search does not silently run under a threshold
     * nobody picked.
     */
    function widenFitUntilFound(build, isEmpty) {
        let result = build();
        if (!isEmpty(result)) return result;

        const fitSelect = document.getElementById('gravesBestScoreFilter');
        const originalFit = fitSelect?.value || '4.0';
        const startIndex = FIT_VALUES.indexOf(originalFit);
        if (!fitSelect || startIndex <= 0) return result;

        for (let i = startIndex - 1; i >= 0; i--) {
            fitSelect.value = FIT_VALUES[i];
            result = build();
            if (!isEmpty(result)) return result;
        }

        fitSelect.value = originalFit;
        return result;
    }

    function renderAdditions(list, selectedTags) {
        const rows = widenFitUntilFound(
            () => buildAdditions(selectedTags),
            found => found.length === 0
        );

        if (rows.length === 0) {
            list.innerHTML = emptyMarkup(additionsEmptyReason(selectedTags));
            return;
        }
        const markup = groupedMarkup(rows, visibleRowCount);
        list.innerHTML = markup + showMoreButton();
        bindShowMoreButton(list);
    }

    function renderSwaps(list, selectedTags) {
        // No widening here: the engine widens per slot, because one slot having
        // rows would otherwise suppress widening for every other slot.
        const result = buildSwaps(selectedTags);

        if (!result) {
            // Matches buildSwaps' own guard, which counts every selected tag:
            // Genre and Setting occupy slots and are swappable like any other.
            const msg = selectedTags.length < 2
                ? 'Select at least 2 elements so Graves has a pair to compare.'
                : 'No replacement raises the script average, at any fit threshold.';
            list.innerHTML = emptyMarkup(msg);
            return;
        }

        if (result.allRows.length === 0) {
            list.innerHTML = emptyMarkup('No replacement scores better than what you already have.');
            return;
        }

        // Display swaps organized by element
        const slotMarkup = Object.entries(result.rowsBySlot).map(([slotIndex, { slot, rows }]) => {
            const slotName = displayName(slot.tag);
            const slotMarkup = groupedMarkup(rows, visibleRowCount, true);
            return `
                <div class="best-match-slot-group">
                    <div class="best-match-slot-note">
                        <strong>${slotName}</strong> (${slot.tag.category}). Replacing it with any of these raises the script average.
                        ${rows.length && rows.every(row => row.belowRequestedFit)
                            ? `<em class="best-match-slot-widened">Nothing here clears your ${minimumFit().toFixed(1)} minimum fit, so these are the best improvements below it.</em>`
                            : ''}
                    </div>
                    ${slotMarkup}
                </div>
            `;
        }).join('');

        totalRowCount = result.allRows.length;
        list.innerHTML = slotMarkup + showMoreButton();
        bindShowMoreButton(list);
    }

    function renderPairwise(list, selectedTags) {
        const matches = buildPairwise(selectedTags);

        if (matches.length === 0) {
            list.innerHTML = emptyMarkup('No matches found for these filters. Try a lower fit or a different category.');
            return;
        }

        totalRowCount = matches.length;
        const limited = matches.slice(0, visibleRowCount);
        list.innerHTML = limited.map((match, index) => `
            <div id="graves-best-match-${index + 1}" class="best-match-item best-match-${Engine.bandFor(match.score, match.score)} ${tagClass(match.candidate)}" data-role="graves-best-match" data-tag-id="${match.candidate.id}" data-category="${match.candidate.category}" data-score="${match.score.toFixed(2)}" data-band="${Engine.bandFor(match.score, match.score)}">
                <div class="best-match-pair">
                    <span class="best-match-pair-label ${categoryToElementSlug(match.selectedCategory)}">${match.selectedCategory}</span>
                    <span class="best-match-tag primary ${categoryToElementSlug(match.selectedCategory)}">${match.selectedName}</span>
                    <span class="best-match-arrow">&rarr;</span>
                    <span class="best-match-tag ${tagClass(match.candidate)}">${match.candidate.name}</span>
                </div>
                <div class="best-match-meta">
                    <span class="best-match-category">${match.candidate.category}</span>
                    <span class="best-match-score ${match.score >= 4.5 ? 'score-excellent' : 'score-strong'}">${match.score.toFixed(2)}</span>
                    ${addButtonMarkup(match.candidate, index)}
                </div>
            </div>
        `).join('') + showMoreButton();
        bindShowMoreButton(list);
    }

    function bindShowMoreButton(list) {
        if (!list || typeof list.querySelector !== 'function') return;
        const btn = list.querySelector('#graves-show-more-btn');
        if (btn) {
            btn.addEventListener('click', expandMatches);
        }
    }

    function bindAddButtons(list) {
        // Handle Add action
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

        // Handle Swap action
        list.querySelectorAll('[data-action="swap-graves-best-match"]').forEach(button => {
            button.addEventListener('click', () => {
                const tag = GAME_DATA.tags[button.dataset.tagId];
                const category = button.dataset.category;
                if (!tag || !category) return;

                // Find and remove existing tag in this category
                const categorySlug = categoryToElementSlug(category);
                const categoryRows = document.querySelectorAll(`#inputs-${categorySlug}-graves [data-role="tag-selector-row"]`);
                let swapped = false;

                categoryRows.forEach(row => {
                    const select = row.querySelector('select.tag-selector');
                    if (select && select.value && select.value !== '') {
                        select.value = '';
                        select.dispatchEvent(new Event('change', { bubbles: true }));
                        swapped = true;
                    }
                });

                // Add the new tag
                if (swapped) {
                    const added = addTagToSelectorContext(tag, 'graves');
                    if (added) {
                        showFeedbackMessage('gravesFeedbackMessage', `${tag.name} swapped in the Graves script.`, 'success');
                        lastSelectedTags = collectTagInputs('graves');
                        renderBestMatches();
                    }
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
            showFeedbackMessage('gravesFeedbackMessage', 'Select at least one element to find strong matches.', 'accent');
            return;
        }

        if (selectedTags.length > 10) {
            showFeedbackMessage('gravesFeedbackMessage', `Colman suggests matches for up to 10 story elements at once. You selected ${selectedTags.length}.`, 'accent');
            return;
        }

        visibleRowCount = ROWS_PER_PAGE;
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
        setBestMatchMode,
        updateGravesExclusionNotice,
        jumpToExclusionEditor,
        paginateRows,
        addButtonMarkup,
        buttonLabelFor,
        atElementBudget,
        BAND_ORDER,
        ROWS_PER_PAGE,
        ROWS_INCREMENT
    };
})(globalThis);
