(function(global) {
    "use strict";

    function hideGravesBestMatches() {
        const panel = document.getElementById('graves-best-matches-panel');
        const list = document.getElementById('gravesBestMatchesList');
        if (panel) panel.classList.add('hidden');
        if (list) list.innerHTML = '';
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

        const categoryFilter = document.getElementById('gravesBestCategoryFilter')?.value || '';
        const minimumScore = parseFloat(document.getElementById('gravesBestScoreFilter')?.value || '4.0');
        const starterOnly = Boolean(document.getElementById('gravesStarterOnlyFilter')?.checked);
        const selectedIds = new Set(selectedTags.map(tag => tag.id));
        const excludedIds = getGeneratorExcludedIds();
        const starterIds = getAllAvailableTagIds('starting');
        const matches = [];

        selectedTags.forEach(selectedTag => {
            Object.values(GAME_DATA.tags).forEach(candidateTag => {
                if (selectedIds.has(candidateTag.id)) return;
                if (excludedIds.has(candidateTag.id)) return;
                if (categoryFilter && candidateTag.category !== categoryFilter) return;
                if (starterOnly && !starterIds.has(candidateTag.id)) return;

                const score = getRawCompatibilityScore(selectedTag, candidateTag);
                if (score < minimumScore) return;

                matches.push({
                    selectedId: selectedTag.id,
                    selectedName: GAME_DATA.tags[selectedTag.id] ? GAME_DATA.tags[selectedTag.id].name : selectedTag.id,
                    selectedCategory: selectedTag.category,
                    matchId: candidateTag.id,
                    matchName: candidateTag.name,
                    matchCategory: candidateTag.category,
                    score
                });
            });
        });

        const deduped = [];
        const seen = new Set();
        matches
            .sort((a, b) => b.score - a.score || a.matchName.localeCompare(b.matchName))
            .forEach(match => {
                const key = `${match.selectedId}:${match.matchId}`;
                if (seen.has(key)) return;
                seen.add(key);
                deduped.push(match);
            });

        renderBestMatches(deduped.slice(0, 30));
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

    function renderBestMatches(matches) {
        const resultsContainer = document.getElementById('results-graves');
        const panel = document.getElementById('graves-best-matches-panel');
        const list = document.getElementById('gravesBestMatchesList');

        if (!resultsContainer || !panel || !list) return;

        resultsContainer.classList.remove('hidden');
        panel.classList.remove('hidden');

        if (matches.length === 0) {
            list.innerHTML = '<div class="empty-state">No matches found for these filters. Try a lower fit or a different category.</div>';
            panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        list.innerHTML = matches.map((match, index) => `
            <div id="graves-best-match-${index + 1}" class="best-match-item ${categoryToElementSlug(match.matchCategory)}" data-role="graves-best-match" data-tag-id="${match.matchId}" data-category="${match.matchCategory}" data-score="${match.score.toFixed(2)}">
                <div class="best-match-pair">
                    <span class="best-match-tag primary ${categoryToElementSlug(match.selectedCategory)}">${match.selectedName}</span>
                    <span class="best-match-arrow">&rarr;</span>
                    <span class="best-match-tag ${categoryToElementSlug(match.matchCategory)}">${match.matchName}</span>
                </div>
                <div class="best-match-meta">
                    <span class="best-match-category">${match.matchCategory}</span>
                    <span class="best-match-score ${match.score >= 4.5 ? 'score-excellent' : 'score-strong'}">${match.score.toFixed(2)}</span>
                    <button id="graves-best-match-add-${index + 1}" class="best-match-add-btn" type="button" data-action="add-graves-best-match" data-tag-id="${match.matchId}" data-category="${match.matchCategory}">Add</button>
                </div>
            </div>
        `).join('');

        list.querySelectorAll('[data-action="add-graves-best-match"]').forEach(button => {
            button.addEventListener('click', () => {
                const tag = GAME_DATA.tags[button.dataset.tagId];
                if (!tag) return;
                const added = addTagToSelectorContext(tag, 'graves');
                if (added) {
                    showFeedbackMessage('gravesFeedbackMessage', `${tag.name} added to the Graves script.`, 'success');
                }
            });
        });

        panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    global.HACGravesBestMatches = {
        hideGravesBestMatches,
        generateBestMatches,
        hideGravesEvaluationResults,
        renderBestMatches
    };
})(globalThis);
