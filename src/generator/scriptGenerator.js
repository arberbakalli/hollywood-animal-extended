(function(global) {
    "use strict";

    const OPTIMIZED_RESULT_COUNT = 12;
    const INITIAL_OPTIMIZED_VISIBLE_COUNT = 3;
    // One click makes a list to page through, rather than a new random five
    // per click (owner ruling 2026-09-30).
    const STANDARD_RESULT_COUNT = 15;
    const STANDARD_VISIBLE_COUNT = 5;
    let generatorResultsState = {
        scripts: [],
        visibleCount: 0,
        mode: 'standard'
    };

    function setupScoreSync() {
        // Existing Advertiser Tab Sync
        const pairs = [
            { slider: 'comScoreSlider', input: 'comScoreInput' },
            { slider: 'artScoreSlider', input: 'artScoreInput' }
        ];
        pairs.forEach(pair => {
            const slider = document.getElementById(pair.slider);
            const input = document.getElementById(pair.input);
            slider.addEventListener('input', (e) => {
                input.value = e.target.value;
                updateSliderTrack(slider);
            });
            input.addEventListener('input', (e) => {
                let val = parseFloat(e.target.value);
                if (val > 10) val = 10;
                if (val < 0) val = 0;
                if (!isNaN(val)) {
                    slider.value = val;
                    updateSliderTrack(slider);
                }
            });
            // Leaving the box settles it on the value the planners use, as the
            // pool box does (TC10-000008).
            input.addEventListener('change', (e) => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val) && (val > 10 || val < 0)) {
                    e.target.value = Math.min(10, Math.max(0, val));
                    e.target.dispatchEvent(new Event('input', { bubbles: true }));
                }
            });
            updateSliderTrack(slider);
        });
    }

    // Must agree with HACAppShell.targetScoreToPoolSize (GAME_RULES.md section 1).
    function getRequiredElementCount(targetScore) {
        return Math.min(10, Math.max(5, targetScore));
    }

    function getGenerationElementCount(targetScore) {
        return Math.max(getRequiredElementCount(targetScore), getMaxElementPoolSize());
    }

    function updateRequiredElementDisplay(targetScore) {
        const requiredTags = getRequiredElementCount(targetScore);
        document.getElementById('genTagsRequiredDisplay').innerText =
            `Requires ~${requiredTags} Story Elements (excluding Genre & Setting).`;
    }

    function setupGeneratorControls() {
        // Generator Tab Sliders + Inputs
        const genCompSlider = document.getElementById('genCompSlider');
        const genCompInput = document.getElementById('genCompInput');

        genCompSlider.addEventListener('input', (e) => {
            genCompInput.value = parseFloat(e.target.value).toFixed(1);
            updateSliderTrack(genCompSlider, 'var(--success)');
        });
        genCompInput.addEventListener('input', (e) => {
            let val = parseFloat(e.target.value);
            if (val > 5) val = 5;
            if (val < 1) val = 1;
            if (!isNaN(val)) {
                genCompSlider.value = val;
                updateSliderTrack(genCompSlider, 'var(--success)');
            }
        });
        updateSliderTrack(genCompSlider, 'var(--success)');

        const genScoreSlider = document.getElementById('genScoreSlider');
        const genScoreInput = document.getElementById('genScoreInput');

        function updateScoreDisplay(val) {
            updateRequiredElementDisplay(val);
            updateSliderTrack(genScoreSlider, '#d4af37');
        }

        genScoreSlider.addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            genScoreInput.value = val;
            updateScoreDisplay(val);
        });
        genScoreInput.addEventListener('input', (e) => {
            let val = parseInt(e.target.value);
            if(val > 10) val = 10;
            if(val < 5) val = 5;
            if(!isNaN(val)) {
                genScoreSlider.value = val;
                updateScoreDisplay(val);
            }
        });
        // Render the help text once on load, otherwise the placeholder markup in
        // index.html stands until the user first touches the slider.
        updateScoreDisplay(parseInt(genScoreInput.value));

        setupMovieScoreSliderSync();
        setupFreshness();
    }

    /**
     * Freshness pills (GAME_RULES section 9) read one saved list, so a click on
     * any pill updates every pill for that element, the card status lines and
     * the notice that the suggestions are out of date. Changing a state never
     * regenerates: generation is random, and a refresh would reshuffle the list
     * under the player's cursor.
     */
    function setupFreshness() {
        HACFreshness.installPills();
        HACFreshness.freshnessStore().subscribe(() => {
            document.querySelectorAll('.gen-card').forEach(renderCardFreshness);
            const shown = !document.getElementById('results-generator')?.classList.contains('hidden');
            if (shown && generatorResultsState.scripts.length > 0) {
                document.getElementById('generatorFreshnessNotice')?.classList.remove('hidden');
            }
        });
    }

    function hideFreshnessNotice() {
        document.getElementById('generatorFreshnessNotice')?.classList.add('hidden');
    }

    // A card's freshness is its worst element's, read from its own pills so it
    // follows every click without rebuilding the card.
    function renderCardFreshness(card) {
        const status = card.querySelector('[data-role="script-freshness-status"]');
        if (!status) return;
        const store = HACFreshness.freshnessStore();
        const worst = Array.from(card.querySelectorAll('.freshness-pill[data-tag-id]'))
            .reduce((rank, pill) => Math.max(rank, HACFreshness.freshnessRank(store.getState(pill.dataset.tagId))), 0);
        const { state, label, multiplier } = HACFreshness.FRESHNESS_STATES[worst];

        status.className = `gen-freshness-status freshness-${state}${state === 'fresh' ? ' hidden' : ''}`;
        status.textContent = state === 'fresh' ? '' : `${label} elements · viewer interest ×${multiplier}`;
    }

    // Freshness decides first (GAME_RULES section 9); scoreGap > 0 means the
    // candidate wins on the mode's own score.
    function fresherOrBetter(candidate, best, scoreGap) {
        const gap = HACFreshness.freshnessRank(HACFreshness.scriptFreshness(best.tags).state) -
            HACFreshness.freshnessRank(HACFreshness.scriptFreshness(candidate.tags).state);
        return gap > 0 || (gap === 0 && scoreGap > 0);
    }

    // What Colman Graves needs before it will evaluate a script.
    const REQUIRED_SCRIPT_CATEGORIES = ["Genre", "Setting", "Protagonist"];
    // What every generated script carries; these spend the story-element budget.
    const MANDATORY_STORY_CATEGORIES = ["Protagonist", "Antagonist", "Finale"];

    function formatCategoryList(categories) {
        if (categories.length <= 1) return categories.join('');
        return `${categories.slice(0, -1).join(', ')} and ${categories[categories.length - 1]}`;
    }

    function getMaxElementPoolSize() {
        const input = document.getElementById('globalElementPoolInput');
        if (!input) return 10;
        const slider = document.getElementById('globalElementPoolSlider');
        return HACAppShell.clampPoolSize(input.value, slider ? slider.value : undefined);
    }

    function setupMovieScoreSliderSync() {
        const genScoreSlider = document.getElementById('genScoreSlider');
        const genScoreInput = document.getElementById('genScoreInput');
        const globalPoolSlider = document.getElementById('globalElementPoolSlider');
        const globalPoolInput = document.getElementById('globalElementPoolInput');

        if (!genScoreSlider || !globalPoolSlider) return;

        // Mapping lives in HACAppShell so the pool control and this one cannot
        // drift apart; resolved at call time, so load order does not matter.
        const updatePoolFromScore = (scoreVal) => {
            const mappedPool = HACAppShell.targetScoreToPoolSize(scoreVal);
            globalPoolSlider.value = mappedPool;
            globalPoolInput.value = mappedPool;
            globalPoolSlider.style.setProperty(
                '--slider-fill-percent',
                HACAppShell.poolSizeTrackPercent(mappedPool) + '%'
            );
        };

        genScoreSlider.addEventListener('input', () => {
            const scoreVal = parseInt(genScoreSlider.value);
            updatePoolFromScore(scoreVal);
        });

        genScoreInput.addEventListener('input', () => {
            const scoreVal = parseInt(genScoreInput.value);
            if (scoreVal >= 5 && scoreVal <= 10) {
                updatePoolFromScore(scoreVal);
            }
        });
    }

    function updateElementPoolSliderStyle(slider) {
        const percent = ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
        slider.style.setProperty('--slider-fill-percent', percent + '%');
    }

    async function prepareGenerationInputs() {
        clearFeedbackMessage('generatorFeedbackMessage');
        try {
            await HACDataLoaders.ensureScoringDataLoaded();
        } catch (error) {
            document.getElementById('results-generator')?.classList.add('hidden');
            showFeedbackMessage('generatorFeedbackMessage', `Could not load scoring data. ${error.message}`);
            return null;
        }

        const targetComp = parseFloat(document.getElementById('genCompInput').value);
        const targetScoreInput = parseInt(document.getElementById('genScoreInput').value);

        // Generate the Max Element Pool, never fewer than the target needs
        // (GAME_RULES.md section 1). The two controls are synced, so they differ
        // only at pool 8: its target of 8 needs 7, and 8 was unreachable.
        const targetCount = getGenerationElementCount(targetScoreInput);

        // Get Fixed Tags
        const fixedTags = collectTagInputs('generator');
        const excludedTags = getGeneratorExcludedTags();
        const excludedIds = new Set(excludedTags.map(t => t.id));

        const generatedCategories = [...new Set([...REQUIRED_SCRIPT_CATEGORIES, ...MANDATORY_STORY_CATEGORIES])];
        const missingRequiredCategories = generatedCategories.filter(category =>
            !Object.values(GAME_DATA.tags).some(tag =>
                tag.category === category &&
                !excludedIds.has(tag.id) &&
                !fixedTags.some(fixed => fixed.id === tag.id)
            ) &&
            !fixedTags.some(tag => tag.category === category)
        );

        if (missingRequiredCategories.length > 0) {
            showFeedbackMessage(
                'generatorFeedbackMessage',
                `A script needs at least one available ${missingRequiredCategories.join(', ')}. Remove exclusions or switch availability.`
            );
            return null;
        }

        // Validate
        const scoringFixed = HACGravesAnalysis.storyElementsOf(fixedTags);

        if (scoringFixed.length > targetCount) {
            showFeedbackMessage(
                'generatorFeedbackMessage',
                `You locked ${scoringFixed.length} scoring elements, but this Movie Score allows about ${targetCount}. Raise the score target or remove locked elements.`
            );
            return null;
        }

        // Reserve a slot for each mandatory category the locks do not cover.
        const unlockedMandatory = MANDATORY_STORY_CATEGORIES.filter(category =>
            !fixedTags.some(tag => tag.category === category));
        const freeSlots = targetCount - scoringFixed.length;
        if (unlockedMandatory.length > freeSlots) {
            const surplus = unlockedMandatory.length - freeSlots;
            const missing = formatCategoryList(unlockedMandatory);
            const room = freeSlots === 0
                ? `fill all ${targetCount} slots, leaving no room for the ${missing}`
                : `leave room for ${freeSlots} more, but the ${missing} need ${unlockedMandatory.length}`;
            const remedy = `Remove ${surplus} locked element${surplus === 1 ? '' : 's'}`;
            const canRaiseTarget = getRequiredElementCount(targetScoreInput + 1) > targetCount;
            showFeedbackMessage(
                'generatorFeedbackMessage',
                `Every script needs a Protagonist, an Antagonist and a Finale. Your ${scoringFixed.length} locked story elements ${room}. ${remedy}${canRaiseTarget ? ' or raise the score target' : ''}.`
            );
            return null;
        }

        const unavailableFixed = fixedTags.filter(t => excludedIds.has(t.id));
        if (unavailableFixed.length > 0) {
            const unavailableNames = unavailableFixed
                .map(t => (GAME_DATA.tags[t.id] ? GAME_DATA.tags[t.id].name : t.id))
                .join(', ');
            showFeedbackMessage(
                'generatorFeedbackMessage',
                `Locked elements are unavailable or excluded: ${unavailableNames}.`
            );
            return null;
        }

        const remainingMandatory = MANDATORY_STORY_CATEGORIES.filter(category =>
            !fixedTags.some(tag => tag.category === category)).length;
        const fixedIds = new Set(fixedTags.map(tag => tag.id));
        const availableFillers = Object.values(GAME_DATA.tags).filter(tag =>
            (tag.category === 'Supporting Character' || tag.category === 'Theme & Event') &&
            !excludedIds.has(tag.id) && !fixedIds.has(tag.id)).length;
        if (scoringFixed.length + remainingMandatory + availableFillers < targetCount) {
            showFeedbackMessage('generatorFeedbackMessage',
                `Not enough available story elements to fill ${targetCount} slots. Remove exclusions or lower the score target.`);
            return null;
        }

        return { targetComp, targetCount, fixedTags, excludedTags };
    }

    async function generateScripts() {
        const inputs = await prepareGenerationInputs();
        if (!inputs) {
            // A refusal never leaves the previous results beside its message,
            // as Evaluate already does (audit 2026-09-30).
            document.getElementById('results-generator')?.classList.add('hidden');
            return;
        }

        const { targetComp, targetCount, fixedTags, excludedTags } = inputs;

        const generatedBatch = [];
        // The locks set how fresh a script can be; a slot stops early only once
        // it is that fresh, or a Stale hit on the target would end the search
        // before a Fresh one had a chance.
        const freshnessFloor = HACFreshness.freshnessRank(HACFreshness.scriptFreshness(fixedTags).state);

        for (let i = 0; i < STANDARD_RESULT_COUNT; i++) {
            let bestCandidate = null;
            const MAX_ATTEMPTS = 50;

            for(let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
                const candidate = runGenerationAlgorithm(targetComp, targetCount, fixedTags, excludedTags);

                if (!bestCandidate || fresherOrBetter(candidate, bestCandidate, candidate.stats.avgComp - bestCandidate.stats.avgComp)) {
                    bestCandidate = candidate;
                }

                const asFreshAsLocks = HACFreshness.freshnessRank(HACFreshness.scriptFreshness(bestCandidate.tags).state) <= freshnessFloor;
                if (asFreshAsLocks && bestCandidate.stats.avgComp >= targetComp && parseFloat(bestCandidate.stats.movieScore) > 0) {
                    break;
                }
            }

            generatedBatch.push(bestCandidate);
        }

        const ranked = HACFreshness.rankByFreshness(generatedBatch, (a, b) => {
            const scoreA = parseFloat(a.stats.movieScore);
            const scoreB = parseFloat(b.stats.movieScore);
            if (scoreA !== scoreB) return scoreB - scoreA;
            return b.stats.avgComp - a.stats.avgComp;
        });

        generatedScriptsCache = ranked;
        hideFreshnessNotice();
        renderGeneratedScripts(ranked, { visibleCount: STANDARD_VISIBLE_COUNT, pageSize: STANDARD_VISIBLE_COUNT });
    }

    async function generateBestScoreScripts(scoreKind) {
        const inputs = await prepareGenerationInputs();
        if (!inputs) {
            // A refusal never leaves the previous results beside its message,
            // as Evaluate already does (audit 2026-09-30).
            document.getElementById('results-generator')?.classList.add('hidden');
            return;
        }

        const { targetComp, targetCount, fixedTags, excludedTags } = inputs;
        const generatedBatch = [];

        // Map scoreKind to bonus property: 'artistic' -> 'art', 'commercial' -> 'com'
        const bonusKey = scoreKind === 'artistic' ? 'art' : 'com';

        for (let i = 0; i < OPTIMIZED_RESULT_COUNT; i++) {
            let bestCandidate = null;
            const maxAttempts = 35;

            for (let attempt = 0; attempt < maxAttempts; attempt++) {
                const candidate = runGenerationAlgorithm(targetComp, targetCount, fixedTags, excludedTags);

                // Calculate bonuses for this candidate
                const evaluation = HACScriptEvaluation.calculateScriptEvaluation(candidate.tags);
                const candidateBonus = evaluation.bonuses[bonusKey];

                if (!bestCandidate) {
                    bestCandidate = { ...candidate, _bonus: candidateBonus, _evaluation: evaluation };
                } else {
                    const existingBonus = bestCandidate._bonus;
                    const scoreGap = candidateBonus !== existingBonus
                        ? candidateBonus - existingBonus
                        : candidate.stats.avgComp - bestCandidate.stats.avgComp;
                    if (fresherOrBetter(candidate, bestCandidate, scoreGap)) {
                        bestCandidate = { ...candidate, _bonus: candidateBonus, _evaluation: evaluation };
                    }
                }
            }

            if (bestCandidate) {
                bestCandidate.optimizedFor = scoreKind;
                generatedBatch.push(bestCandidate);
            }
        }

        // Freshness first, then bonus (highest first), then average compatibility
        const ranked = HACFreshness.rankByFreshness(generatedBatch, (a, b) => {
            if (b._bonus !== a._bonus) {
                return b._bonus - a._bonus;
            }
            return b.stats.avgComp - a.stats.avgComp;
        });

        generatedScriptsCache = ranked;
        hideFreshnessNotice();
        renderGeneratedScripts(ranked, {
            mode: scoreKind,
            visibleCount: INITIAL_OPTIMIZED_VISIBLE_COUNT
        });
    }

    function runGenerationAlgorithm(targetComp, targetCount, fixedTags, excludedTags) {
        return HACScriptGenerationEngine.runGenerationAlgorithm(targetComp, targetCount, fixedTags, excludedTags);
    }

    function getCompatibleGenres(sourceId, excludedIds) {
        return HACScriptGenerationEngine.getCompatibleGenres(sourceId, excludedIds);
    }

    function getRandomTagByCategory(category, currentTags, excludedIds) {
        return HACScriptGenerationEngine.getRandomTagByCategory(category, currentTags, excludedIds);
    }

    function renderGeneratedScripts(scripts, options = {}) {
        setGeneratorStaleNotice(false);
        const container = document.getElementById('generatorResultsList');
        container.innerHTML = '';
        document.getElementById('results-generator').classList.remove('hidden');

        generatorResultsState = {
            scripts,
            visibleCount: options.visibleCount || scripts.length,
            pageSize: options.pageSize || INITIAL_OPTIMIZED_VISIBLE_COUNT,
            mode: options.mode || 'standard'
        };

        const visibleScripts = scripts.slice(0, generatorResultsState.visibleCount);
        visibleScripts.forEach((script, index) => {
            // false passed here means it's NOT in the pinned section (no editable name)
            const card = createScriptCardHTML(script, false);
            container.appendChild(card);
        });

        if (generatorResultsState.visibleCount < scripts.length) {
            const button = document.createElement('button');
            button.id = 'showMoreGeneratedScriptsButton';
            button.type = 'button';
            button.className = 'analyze-btn secondary-btn generated-show-more-btn';
            button.dataset.role = 'generated-show-more-button';
            const toShow = Math.min(generatorResultsState.pageSize, scripts.length - generatorResultsState.visibleCount);
            const remainingAfter = scripts.length - (generatorResultsState.visibleCount + toShow);
            button.textContent = `Show ${toShow} More (${remainingAfter} remaining)`;
            button.addEventListener('click', showMoreGeneratedScripts);
            container.appendChild(button);
        }
    }

    // GAME_RULES.md section 5: no context ever holds a banned element. Taking
    // the element out of a generated script would leave a script of the wrong
    // size with the wrong score, so the results are hidden and the player is
    // asked to generate again (audit 2026-09-30). A lifted ban invalidates
    // nothing, and saved Library scripts are the player's own, so neither
    // hides anything.
    function setGeneratorStaleNotice(visible) {
        const notice = document.getElementById('generator-stale-notice');
        if (!notice || !notice.classList) return;
        if (visible) notice.classList.remove('hidden');
        else notice.classList.add('hidden');
    }

    function checkGeneratedAgainstBans() {
        const results = document.getElementById('results-generator');
        if (!results || results.classList.contains('hidden')) return;
        const banned = getGeneratorExcludedIds();
        const holdsBan = (generatorResultsState.scripts || []).some(script =>
            script.tags.some(tag => banned.has(tag.id)));
        if (!holdsBan) return;
        results.classList.add('hidden');
        setGeneratorStaleNotice(true);
    }

    // Redraws the current results without losing the page the user is on.
    // Pinning used to call renderGeneratedScripts with no options, which
    // showed all 15 and removed Show more (audit 2026-09-30).
    function refreshGeneratedScripts() {
        if (!generatorResultsState.scripts.length) return;
        renderGeneratedScripts(generatorResultsState.scripts, {
            mode: generatorResultsState.mode,
            pageSize: generatorResultsState.pageSize,
            visibleCount: generatorResultsState.visibleCount
        });
    }

    function showMoreGeneratedScripts() {
        renderGeneratedScripts(generatorResultsState.scripts, {
            mode: generatorResultsState.mode,
            pageSize: generatorResultsState.pageSize,
            visibleCount: Math.min(generatorResultsState.visibleCount + generatorResultsState.pageSize, generatorResultsState.scripts.length)
        });
    }

    function createScriptId() {
        return HACScriptGenerationEngine.createScriptId();
    }

    function buildScriptStats(matrix, movieScores) {
        return HACScriptGenerationEngine.buildScriptStats(matrix, movieScores);
    }

    function buildScriptFromTags(tags, name) {
        return HACScriptGenerationEngine.buildScriptFromTags(tags, name);
    }

    function createScriptCardHTML(scriptObj, isPinnedSection) {
        const div = document.createElement('div');
        const cardScope = isPinnedSection ? 'pinned-script' : 'generated-script';
        const scriptDomId = toDomId(scriptObj.uniqueId);
        div.className = 'gen-card';
        div.id = `${cardScope}-card-${scriptDomId}`;
        div.dataset.id = scriptObj.uniqueId;
        div.dataset.scriptId = scriptObj.uniqueId;
        div.dataset.role = `${cardScope}-card`;

        const verdictTone = HACGravesAnalysis.getGravesVerdict(scriptObj.stats.avgComp).tone;
        const compClass = { success: 'val-high', accent: 'val-mid', danger: 'val-low' }[verdictTone];

        // Tag Chips Logic
        let tagsHtml = '';
        const fixedInputs = collectTagInputs('generator');
        const fixedIds = new Set(fixedInputs.map(t => t.id));
        const sortedTags = [...scriptObj.tags].sort((a, b) => {
            let idxA = GAME_DATA.categories.indexOf(a.category);
            let idxB = GAME_DATA.categories.indexOf(b.category);
            if (idxA === -1) idxA = 99;
            if (idxB === -1) idxB = 99;
            return idxA - idxB;
        });

        sortedTags.forEach(t => {
            const tagData = GAME_DATA.tags[t.id];
            const tagName = tagData ? tagData.name : t.id; // Safety fallback
            const isFixed = fixedIds.has(t.id);
            const categoryClass = categoryToElementSlug(t.category);
            const tagClass = t.category === 'Genre' ? `genre-${toDomId(t.id)}` : '';
            const freshnessPill = HACFreshness.hasFreshness(t.category) ? HACFreshness.pillHtml(t.id) : '';
            tagsHtml += `<span class="gen-tag-chip ${categoryClass} ${tagClass} ${isFixed ? 'tag-fixed' : ''}">${tagName} <small>${t.category}</small>${freshnessPill}</span>`;
        });

        const isOptimized = scriptObj.optimizedFor === 'artistic' || scriptObj.optimizedFor === 'commercial';
        const primaryLabel = scriptObj.optimizedFor === 'artistic' ? 'Artistic Bonus' : 'Commercial Bonus';
        const secondaryLabel = scriptObj.optimizedFor === 'artistic' ? 'Commercial Bonus' : 'Artistic Bonus';

        // Calculate bonuses from script evaluation
        const evaluation = HACScriptEvaluation.calculateScriptEvaluation(scriptObj.tags);
        const primaryBonus = scriptObj.optimizedFor === 'artistic'
            ? evaluation.bonuses.art
            : evaluation.bonuses.com;
        const secondaryBonus = scriptObj.optimizedFor === 'artistic'
            ? evaluation.bonuses.com
            : evaluation.bonuses.art;

        const scoreBadgesHtml = isOptimized ? `
                        <div class="gen-badge-group gen-badge-group--primary">
                            <span class="gen-badge-label">${primaryLabel}</span>
                            <span class="gen-badge-val val-mid">${primaryBonus.toFixed(2)}</span>
                        </div>
                        <div class="gen-badge-group">
                            <span class="gen-badge-label">${secondaryLabel}</span>
                            <span class="gen-badge-val val-mid">${secondaryBonus.toFixed(2)}</span>
                        </div>
                        <div class="gen-badge-group">
                            <span class="gen-badge-label">Avg Fit</span>
                            <span class="gen-badge-val ${compClass}">${scriptObj.stats.avgComp.toFixed(1)}</span>
                        </div>
                        <div class="gen-badge-group">
                            <span class="gen-badge-label">Synergy</span>
                            <span class="gen-badge-val val-mid">${scriptObj.stats.synergySum.toFixed(2)}</span>
                        </div>
        ` : `
                        <div class="gen-badge-group">
                            <span class="gen-badge-label">Avg Comp</span>
                            <span class="gen-badge-val ${compClass}">${scriptObj.stats.avgComp.toFixed(1)}</span>
                        </div>
                        <div class="gen-badge-group">
                            <span class="gen-badge-label">Movie Score</span>
                            <span class="gen-badge-val val-mid">${scriptObj.stats.movieScore}</span>
                        </div>
                        <div class="gen-badge-group">
                            <span class="gen-badge-label">Script Qual</span>
                            <span class="gen-badge-val val-mid">${scriptObj.stats.maxScriptQuality}</span>
                        </div>
        `;

        // Check if truly pinned to set Icon state
        const isActuallyPinned = pinnedScripts.some(s => s.uniqueId === scriptObj.uniqueId);
        const pinClass = isActuallyPinned ? 'pinned' : '';
        const pinTitle = isActuallyPinned ? 'Unpin' : 'Pin to Save';

        // Editable Name Input (Only if in pinned section). The name is typed by
        // the player or read from a shared file, so it is set as a property
        // below, never interpolated into the markup.
        const nameInputHtml = isPinnedSection
            ? `<input type="text" class="script-name-input"
               id="${cardScope}-name-${scriptDomId}"
               data-role="script-name-input"
               placeholder="Script Name">`
            : '';

        div.innerHTML = `
            <div id="${cardScope}-header-${scriptDomId}" class="gen-header" data-role="script-card-header">
                <div class="gen-left-col">
                    ${nameInputHtml}
                    <div class="gen-info-row">
                        ${scoreBadgesHtml}
                    </div>
                    <div id="${cardScope}-freshness-${scriptDomId}" class="gen-freshness-status hidden" data-role="script-freshness-status"></div>
                </div>
                <button id="${cardScope}-pin-${scriptDomId}" class="pin-btn ${pinClass}" type="button" title="${pinTitle}" data-role="script-pin-button">
                    ${isActuallyPinned ? '★' : '☆'}
                </button>
            </div>
            <div class="gen-details hidden">
                <div class="gen-tags-grid">
                    ${tagsHtml}
                </div>
                <div class="gen-actions">
                    <span id="${cardScope}-short-id-${scriptDomId}" class="script-id" data-role="script-short-id"></span>
                    <button id="${cardScope}-graves-${scriptDomId}" class="transfer-link-btn" type="button" data-role="script-graves-button">
                        Evaluate with Graves &rarr;
                    </button>
                    <button id="${cardScope}-transfer-${scriptDomId}" class="transfer-link-btn" type="button" data-role="script-transfer-button">
                        Analyze Script &rarr;
                    </button>
                </div>
            </div>
        `;
        const nameInput = div.querySelector('.script-name-input');
        if (nameInput) nameInput.value = scriptObj.name || 'Untitled Script';
        // A loaded library file supplies the uniqueId, so it is text, never markup.
        const shortId = div.querySelector('[data-role="script-short-id"]');
        if (shortId) shortId.textContent = `ID: ${scriptObj.uniqueId.substring(scriptObj.uniqueId.length - 6)}`;
        renderCardFreshness(div);

        div.querySelector('.gen-header')?.addEventListener('click', event => {
            if (event.target.closest('button, input')) return;
            toggleScriptCard(event.currentTarget);
        });
        div.querySelector('.pin-btn')?.addEventListener('click', event => togglePin(scriptObj.uniqueId, event));
        div.querySelector('[data-role="script-graves-button"]')?.addEventListener('click', () => transferScriptToContext(scriptObj.uniqueId, 'graves'));
        div.querySelector('[data-role="script-transfer-button"]')?.addEventListener('click', () => transferScriptToContext(scriptObj.uniqueId, 'advertisers'));
        // input, not keyup: a paste, drag-drop or autofill fires no key event,
        // and the name never reached the library file (audit 2026-09-30).
        div.querySelector('.script-name-input')?.addEventListener('input', event => updateScriptName(scriptObj.uniqueId, event.target.value));
        div.querySelector('.script-name-input')?.addEventListener('click', event => event.stopPropagation());

        return div;
    }

    global.HACScriptGenerator = {
        setupScoreSync,
        getRequiredElementCount,
        getGenerationElementCount,
        updateRequiredElementDisplay,
        REQUIRED_SCRIPT_CATEGORIES,
        setupGeneratorControls,
        generateScripts,
        generateBestScoreScripts,
        runGenerationAlgorithm,
        getCompatibleGenres,
        getRandomTagByCategory,
        renderGeneratedScripts,
        refreshGeneratedScripts,
        checkGeneratedAgainstBans,
        showMoreGeneratedScripts,
        createScriptId,
        buildScriptStats,
        buildScriptFromTags,
        createScriptCardHTML,
        getMaxElementPoolSize
    };
})(globalThis);
