(function(global) {
    "use strict";

    /**
     * findTargetedCombinations reads `if (advertisers) ... else if (audiences)`,
     * so an advertiser overrides the audience rather than narrowing with it.
     * Measured: selecting both returns results identical to the advertiser
     * alone. The checkboxes stayed live and gave no sign of it, so a user could
     * pick an audience, pick an advertiser, and silently lose the first choice.
     * This surfaces the existing behaviour rather than changing it.
     */
    function syncAudienceAvailability() {
        const advertiserChosen = !!document.querySelector('.targeted-advertiser-checkbox:checked');

        document.querySelectorAll('.targeted-audience-checkbox').forEach(checkbox => {
            checkbox.disabled = advertiserChosen;
            checkbox.closest('.targeted-checkbox-item')?.classList
                .toggle('is-overridden', advertiserChosen);
        });

        document.getElementById('targeted-audience-override-note')
            ?.classList.toggle('hidden', !advertiserChosen);
    }

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

        document.querySelectorAll('.targeted-advertiser-checkbox')
            .forEach(checkbox => checkbox.addEventListener('change', syncAudienceAvailability));
        syncAudienceAvailability();

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
        // Reset clears the advertisers, so the audiences become live again.
        syncAudienceAvailability();
    }

    async function findTargetedCombinations() {
        await ensureCompatibilityLoaded();
        clearFeedbackMessage('targetedFeedbackMessage');

        const selectedAudiences = Array.from(document.querySelectorAll('.targeted-audience-checkbox:checked')).map(cb => cb.value);
        const selectedAdvertisers = Array.from(document.querySelectorAll('.targeted-advertiser-checkbox:checked')).map(cb => cb.value);
        const selectedTags = collectTagInputs('targeted');

        const maxElements = getTargetedElementBudget();
        const storyElementTags = scoringElementsOf(selectedTags);

        if (!window.__targetedBudgetBypassed && storyElementTags.length > maxElements) {
            showFeedbackMessage('targetedFeedbackMessage', `Max Element Pool is set to ${maxElements}, but you selected ${storyElementTags.length}. Raise it in the header or remove a tag (Genre and Setting do not count).`, 'accent');
            return;
        }

        // Determine target agencies
        let targetAgencies = [];
        if (selectedAdvertisers.length > 0) {
            targetAgencies = GAME_DATA.adAgents.filter(a => selectedAdvertisers.includes(a.id));
        } else if (selectedAudiences.length > 0) {
            // Find agencies that reach the selected audiences
            targetAgencies = GAME_DATA.adAgents.filter(agency =>
                selectedAudiences.some(aud => agency.targets.includes(aud))
            );
        } else {
            // No filter: show combinations ranked by overall quality against all agencies
            targetAgencies = GAME_DATA.adAgents;
        }

        if (targetAgencies.length === 0) {
            showFeedbackMessage('targetedFeedbackMessage', 'No agencies available. Please select different audiences or advertisers.', 'accent');
            return;
        }

        // Find combinations that score A+ for target agencies
        const combinations = await searchForTargetCombinations(targetAgencies, selectedTags, selectedAudiences, 20, maxElements);

        displayTargetedResults(combinations, targetAgencies, selectedAudiences);
    }

    // Genre and Setting are structural picks every script carries, so they never
    // spend the Max Element Pool budget.
    function scoringElementsOf(tags) {
        return HACGravesAnalysis.storyElementsOf(tags);
    }

    /**
     * Build for Target reads the global Max Element Pool, like every other
     * generator. It used to read a #targetedElementsSlider of its own, which no
     * longer exists in the markup: the lookup fell through to the NaN branch and
     * returned 10 whatever the header was set to, so the control silently did
     * nothing here.
     */
    function getTargetedElementBudget() {
        return typeof HACScriptGenerator !== 'undefined' && HACScriptGenerator.getMaxElementPoolSize
            ? HACScriptGenerator.getMaxElementPoolSize()
            : 10;
    }

    async function searchForTargetCombinations(targetAgencies, constraintTags = [], constraintAudiences = [], maxResults = 20, storyElementBudget = 10) {
        await ensureCompatibilityLoaded();

        const excludedIds = getGeneratorExcludedIds();
        const allTags = Object.values(GAME_DATA.tags).filter(t => t && t.id && (window.__exclusionFilterBypassed || !excludedIds.has(t.id)));
        const lockedTags = resolveTargetedTagInputs(constraintTags);
        const combinations = generateTargetedCombinations(allTags, lockedTags, targetAgencies, storyElementBudget, maxResults * 4);
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

    // How many of a category a script may hold is the engine's isCategoryFull:
    // Genre, Supporting Character and Theme & Event repeat, everything else
    // holds one. Build for Target used to keep its own table that capped Genre
    // at 1, so it could never honour a two-genre mix, let alone a wider split.
    function categoryIsFull(category, counts) {
        return HACGravesBestMatchesEngine.isCategoryFull(category, counts, MULTI_SELECT_CATEGORIES);
    }

    // Every script the game accepts carries at least one of each of these.
    // Seeding them first is what makes a suggested combination something the
    // player can actually build, rather than a pile of high-scoring themes.
    const TARGETED_MANDATORY_CATEGORIES = ['Genre', 'Setting', 'Protagonist', 'Antagonist', 'Finale'];

    function isStoryElement(tag) {
        return HACGravesAnalysis.isStoryElement(tag);
    }

    function countByCategory(tags) {
        return tags.reduce((counts, tag) => {
            counts[tag.category] = (counts[tag.category] || 0) + 1;
            return counts;
        }, {});
    }

    /**
     * Walks the advertiser-ranked list from `offset` and fills `storyElementSlots`
     * story elements around the mandatory picks.
     *
     * The budget counts story elements only. Genre and Setting sit outside it, so
     * the combination is as wide as it needs to be rather than a fixed
     * budget + 2: a script with three genres still carries the full budget of
     * story elements instead of trading four of them away for the extra genres.
     *
     * Genre is uncapped, so two guards matter here. A mandatory category is
     * seeded only when the locked picks have not already supplied it, and the
     * free fill takes story elements alone — otherwise an uncapped Genre would
     * let the generator invent genres the player never asked for.
     */
    function fillWithinCategoryLimits(ranked, offset, storyElementSlots, seedCounts) {
        const counts = Object.assign({}, seedCounts);
        const taken = new Set();
        const picked = [];
        let storyElements = 0;

        const canTake = tag => !taken.has(tag.id)
            && !categoryIsFull(tag.category, counts)
            && (!isStoryElement(tag) || storyElements < storyElementSlots);

        const take = tag => {
            taken.add(tag.id);
            counts[tag.category] = (counts[tag.category] || 0) + 1;
            if (isStoryElement(tag)) storyElements += 1;
            picked.push(tag);
        };

        TARGETED_MANDATORY_CATEGORIES.forEach(category => {
            if ((counts[category] || 0) > 0) return;
            const pool = ranked.filter(tag => tag.category === category && canTake(tag));
            if (pool.length > 0) take(pool[offset % pool.length]);
        });

        for (let step = 0; step < ranked.length && storyElements < storyElementSlots; step++) {
            const tag = ranked[(offset + step) % ranked.length];
            if (isStoryElement(tag) && canTake(tag)) take(tag);
        }

        return picked;
    }

    function generateTargetedCombinations(allTags, lockedTags, targetAgencies, storyElementBudget = 5, limit = 80) {
        const lockedIds = new Set(lockedTags.map(tag => tag.id));
        // The budget is spent on story elements. Locked genres and settings do
        // not consume it, so they widen the combination rather than shrink it.
        const slotsToFill = Math.max(0, storyElementBudget - lockedTags.filter(isStoryElement).length);

        if (slotsToFill === 0) return [lockedTags.slice()];

        const ranked = allTags
            .filter(tag => !lockedIds.has(tag.id))
            .map(tag => ({ tag, score: scoreTagForTargetAgencies(tag, targetAgencies) }))
            .sort((a, b) =>
                b.score - a.score ||
                a.tag.category.localeCompare(b.tag.category) ||
                a.tag.name.localeCompare(b.tag.name)
            )
            .map(entry => entry.tag);

        if (ranked.length === 0) return [];

        const lockedCounts = countByCategory(lockedTags);
        const combos = [];
        const seen = new Set();

        for (let offset = 0; offset < ranked.length && combos.length < limit; offset++) {
            const fillTags = fillWithinCategoryLimits(ranked, offset, slotsToFill, lockedCounts);
            if (fillTags.filter(isStoryElement).length !== slotsToFill) continue;

            const signature = fillTags.map(tag => tag.id).sort().join('|');
            if (seen.has(signature)) continue;
            seen.add(signature);

            combos.push([...lockedTags, ...fillTags]);
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
                        <div class="targeted-tag-chip ${categoryToElementSlug(tag.category)} ${tag.category === 'Genre' ? `genre-${toDomId(tag.id)}` : ''}">
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
        syncAudienceAvailability,
        findTargetedCombinations,
        searchForTargetCombinations,
        scoringElementsOf,
        getTargetedElementBudget,
        resolveTargetedTagInputs,
        withCompatibilityWeights,
        scoreTagForTargetAgencies,
        generateTargetedCombinations,
        generateTargetingReasoning,
        compatibilityTone,
        displayTargetedResults
    };
})(globalThis);
