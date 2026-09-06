(function(global) {
    "use strict";

    async function initializeTargetedAdsTab() {
        // Initialize audience checkboxes
        const audienceContainer = document.getElementById('targeted-audience-checkboxes');
        if (audienceContainer) {
            const demosHtml = Object.entries(GAME_DATA.demographics)
                .map(([id, demo]) => `
                    <label class="checkbox-item targeted-checkbox-item" id="targeted-audience-${toDomId(id)}-item">
                        <input type="checkbox" value="${id}" class="targeted-audience-checkbox" id="targeted-audience-${toDomId(id)}">
                        <span>${demo.name}</span>
                    </label>
                `).join('');
            audienceContainer.innerHTML = demosHtml;
        }

        // Initialize advertiser checkboxes
        const advertiserContainer = document.getElementById('targeted-advertiser-checkboxes');
        if (advertiserContainer) {
            const agenciesHtml = GAME_DATA.adAgents
                .map(agency => `
                    <label class="checkbox-item targeted-checkbox-item" id="targeted-advertiser-${toDomId(agency.id)}-item">
                        <input type="checkbox" value="${agency.id}" class="targeted-advertiser-checkbox" id="targeted-advertiser-${toDomId(agency.id)}">
                        <span>${agency.name}</span>
                    </label>
                `).join('');
            advertiserContainer.innerHTML = agenciesHtml;
        }

        // Initialize tag selectors for Targeted Ads
        initializeSelectors('targeted');

        // Attach event listeners
        document.getElementById('findCombinationsButton')?.addEventListener('click', findTargetedCombinations);
        document.getElementById('resetTargetedButton')?.addEventListener('click', resetTargetedTab);
    }

    function resetTargetedTab() {
        document.querySelectorAll('.targeted-audience-checkbox, .targeted-advertiser-checkbox').forEach(cb => cb.checked = false);
        document.getElementById('selectors-container-targeted').innerHTML = '';
        initializeSelectors('targeted');
        document.getElementById('targeted-results-panel').classList.add('hidden');
        document.getElementById('targetedResultsList').innerHTML = '';
        clearFeedbackMessage('targetedFeedbackMessage');
    }

    async function findTargetedCombinations() {
        await ensureCompatibilityLoaded();
        clearFeedbackMessage('targetedFeedbackMessage');

        const selectedAudiences = Array.from(document.querySelectorAll('.targeted-audience-checkbox:checked')).map(cb => cb.value);
        const selectedAdvertisers = Array.from(document.querySelectorAll('.targeted-advertiser-checkbox:checked')).map(cb => cb.value);
        const selectedTags = collectTagInputs('targeted');

        if (selectedAudiences.length === 0 && selectedAdvertisers.length === 0) {
            showFeedbackMessage('targetedFeedbackMessage', 'Please select at least one audience or advertiser.', 'accent');
            return;
        }

        if (selectedTags.length > 6) {
            showFeedbackMessage('targetedFeedbackMessage', `Pick 6 or fewer optional tags. You selected ${selectedTags.length}.`, 'accent');
            return;
        }

        // Determine target agencies
        let targetAgencies = [];
        if (selectedAdvertisers.length > 0) {
            targetAgencies = GAME_DATA.adAgents.filter(a => selectedAdvertisers.includes(a.id));
        } else {
            // Find agencies that reach the selected audiences
            targetAgencies = GAME_DATA.adAgents.filter(agency =>
                selectedAudiences.some(aud => agency.targets.includes(aud))
            );
        }

        if (targetAgencies.length === 0) {
            showFeedbackMessage('targetedFeedbackMessage', 'No agencies reach the selected audiences.', 'accent');
            return;
        }

        // Find combinations that score A+ for target agencies
        const combinations = await searchForTargetCombinations(targetAgencies, selectedTags, selectedAudiences);

        displayTargetedResults(combinations, targetAgencies, selectedAudiences);
    }

    async function searchForTargetCombinations(targetAgencies, constraintTags = [], constraintAudiences = [], maxResults = 20) {
        await ensureCompatibilityLoaded();

        const excludedIds = getGeneratorExcludedIds();
        const allTags = Object.values(GAME_DATA.tags).filter(t => t && t.id && !excludedIds.has(t.id));
        const lockedTags = resolveTargetedTagInputs(constraintTags);
        const combinations = generateTargetedCombinations(allTags, lockedTags, targetAgencies, 6, maxResults * 4);
        const scoredCombinations = [];

        for (const combo of combinations) {
            const scores = targetAgencies.map(agency => {
                const score = calculateAdvertiserMatch(combo, 0, agency);
                return { agency, score };
            });

            const avgScore = scores.reduce((sum, s) => sum + s.score, 0) / scores.length;
            const grade = predictGradeFromScore(avgScore);

            scoredCombinations.push({
                tags: combo.map(t => ({ id: t.id, name: t.name, category: t.category })),
                avgScore,
                grade: grade.grade,
                tier: grade.tier,
                compatibility: calculateMatrixScore(withCompatibilityWeights(combo)).rawAverage,
                agencyScores: scores,
                reasoning: generateTargetingReasoning(combo, scores, constraintAudiences)
            });
        }

        return scoredCombinations
            .sort((a, b) => b.avgScore - a.avgScore || a.tags[0].name.localeCompare(b.tags[0].name))
            .slice(0, maxResults);
    }

    function resolveTargetedTagInputs(tagInputs) {
        const seen = new Set();
        const excludedIds = getGeneratorExcludedIds();
        return tagInputs
            .map(input => GAME_DATA.tags[input.id])
            .filter(tag => {
                if (!tag || seen.has(tag.id) || excludedIds.has(tag.id)) return false;
                seen.add(tag.id);
                return true;
            });
    }

    function withCompatibilityWeights(tags) {
        const genreCount = tags.filter(tag => tag.category === 'Genre').length;
        return tags.map(tag => ({
            ...tag,
            percent: tag.category === 'Genre' ? 1 / genreCount : 1.0
        }));
    }

    function scoreTagForTargetAgencies(tag, targetAgencies) {
        if (!tag || !targetAgencies || targetAgencies.length === 0) return 0;

        const total = targetAgencies.reduce((sum, agency) => {
            return sum + calculateAdvertiserMatch([tag], 0, agency);
        }, 0);

        return total / targetAgencies.length;
    }

    function generateTargetedCombinations(allTags, lockedTags, targetAgencies, size = 6, limit = 80) {
        const lockedIds = new Set(lockedTags.map(tag => tag.id));
        const slotsToFill = Math.max(0, size - lockedTags.length);

        if (slotsToFill === 0) return [lockedTags.slice(0, size)];

        const rankedCandidates = allTags
            .filter(tag => !lockedIds.has(tag.id))
            .map(tag => ({ tag, score: scoreTagForTargetAgencies(tag, targetAgencies) }))
            .sort((a, b) =>
                b.score - a.score ||
                a.tag.category.localeCompare(b.tag.category) ||
                a.tag.name.localeCompare(b.tag.name)
            );

        const combos = [];
        const maxStart = Math.max(1, rankedCandidates.length - slotsToFill + 1);

        for (let start = 0; start < maxStart && combos.length < limit; start++) {
            const fillTags = rankedCandidates
                .slice(start, start + slotsToFill)
                .map(entry => entry.tag);

            if (fillTags.length === slotsToFill) {
                combos.push([...lockedTags, ...fillTags]);
            }
        }

        return combos;
    }

    function generateTargetingReasoning(tags, agencyScores, constraintAudiences) {
        const topAgencies = [...agencyScores].sort((a, b) => b.score - a.score).slice(0, 2);
        const tagNames = tags.map(t => t.name).join(', ');
        return `Strongest with ${topAgencies.map(a => a.agency.name).join(' and ')}. Tags: ${tagNames}`;
    }

    function compatibilityTone(rawAverage) {
        if (rawAverage >= 3.5) return 'tone-success';
        if (rawAverage < 2.5) return 'tone-danger';
        return 'tone-neutral';
    }

    function displayTargetedResults(combinations, targetAgencies, selectedAudiences) {
        const panel = document.getElementById('targeted-results-panel');
        const list = document.getElementById('targetedResultsList');

        if (combinations.length === 0) {
            list.innerHTML = '<div class="empty-state padded-empty">No combinations found. Try different audiences or fewer constraints.</div>';
            panel.classList.remove('hidden');
            return;
        }

        const html = combinations.map((combo, i) => `
            <div class="combination-card targeted-combination-card">
                <div class="targeted-combination-header">
                    <div class="targeted-combination-rank">#${i + 1}</div>
                    <div class="targeted-combination-score">
                        <span class="targeted-score-label">Advertiser fit</span>
                        <span class="targeted-score-value">${combo.avgScore.toFixed(2)}</span>
                        <span class="targeted-score-grade">${combo.grade}</span>
                    </div>
                    <div class="targeted-combination-compat ${compatibilityTone(combo.compatibility)}">
                        <span class="targeted-score-label">Story fit</span>
                        <span class="targeted-compat-value">${combo.compatibility.toFixed(1)} <span class="sub-value">/ 5.0</span></span>
                    </div>
                </div>
                <div class="targeted-tag-list">
                    ${combo.tags.map(tag => `
                        <div class="targeted-tag-chip ${categoryToElementSlug(tag.category)}">
                            ${tag.name}
                        </div>
                    `).join('')}
                </div>
                <div class="targeted-reasoning">
                    ${combo.reasoning}
                </div>
            </div>
        `).join('');

        list.innerHTML = html;
        panel.classList.remove('hidden');
    }

    global.HACTargetedAds = {
        initializeTargetedAdsTab,
        resetTargetedTab,
        findTargetedCombinations,
        searchForTargetCombinations,
        resolveTargetedTagInputs,
        withCompatibilityWeights,
        scoreTagForTargetAgencies,
        generateTargetedCombinations,
        generateTargetingReasoning,
        compatibilityTone,
        displayTargetedResults
    };
})(globalThis);
