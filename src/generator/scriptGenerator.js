(function(global) {
    "use strict";

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
            updateSliderTrack(slider);
        });
    }

    function getRequiredElementCount(targetScore) {
        if (targetScore >= 9) return 9;
        if (targetScore === 8) return 8;  // reaches cap 8
        if (targetScore === 7) return 7;  // reaches cap 8 (safe)
        if (targetScore === 6) return 5;  // reaches cap 6
        return 4;                         // below the slider minimum
    }

    function setupGeneratorControls() {
        // Generator Tab Sliders + Inputs
        const genCompSlider = document.getElementById('genCompSlider');
        const genCompInput = document.getElementById('genCompInput');

        genCompSlider.addEventListener('input', (e) => {
            genCompInput.value = parseFloat(e.target.value).toFixed(1);
            updateSliderTrack(genCompSlider, '#4cd964');
        });
        genCompInput.addEventListener('input', (e) => {
            let val = parseFloat(e.target.value);
            if (val > 5) val = 5;
            if (val < 1) val = 1;
            if (!isNaN(val)) {
                genCompSlider.value = val;
                updateSliderTrack(genCompSlider, '#4cd964');
            }
        });
        updateSliderTrack(genCompSlider, '#4cd964');

        const genScoreSlider = document.getElementById('genScoreSlider');
        const genScoreInput = document.getElementById('genScoreInput');
        const requiredTagsDisplay = document.getElementById('genTagsRequiredDisplay');

        function updateScoreDisplay(val) {
            // Update Help Text for Tag Count
            const requiredTags = getRequiredElementCount(val);

            requiredTagsDisplay.innerText = `Requires ~${requiredTags} Story Elements (excluding Genre & Setting).`;
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
            if(val < 6) val = 6;
            if(!isNaN(val)) {
                genScoreSlider.value = val;
                updateScoreDisplay(val);
            }
        });
        // Render the help text once on load, otherwise the placeholder markup in
        // index.html stands until the user first touches the slider.
        updateScoreDisplay(parseInt(genScoreInput.value));
    }

    async function generateScripts() {
        await ensureCompatibilityLoaded();
        clearFeedbackMessage('generatorFeedbackMessage');

        const targetComp = parseFloat(document.getElementById('genCompInput').value);
        const targetScoreInput = parseInt(document.getElementById('genScoreInput').value);

        // Map Movie Score to Required Scoring Elements (Excluding Genre AND Setting)
        const targetCount = getRequiredElementCount(targetScoreInput);

        // Get Fixed Tags
        const fixedTags = collectTagInputs('generator');
        const excludedTags = getGeneratorExcludedTags();

        // Validate
        const scoringFixed = fixedTags.filter(t => t.category !== "Genre" && t.category !== "Setting");

        if (scoringFixed.length > targetCount) {
            showFeedbackMessage(
                'generatorFeedbackMessage',
                `You locked ${scoringFixed.length} scoring elements, but this Movie Score allows about ${targetCount}. Raise the score target or remove locked elements.`
            );
            return;
        }

        const excludedIds = new Set(excludedTags.map(t => t.id));
        const unavailableFixed = fixedTags.filter(t => excludedIds.has(t.id));
        if (unavailableFixed.length > 0) {
            const unavailableNames = unavailableFixed
                .map(t => (GAME_DATA.tags[t.id] ? GAME_DATA.tags[t.id].name : t.id))
                .join(', ');
            showFeedbackMessage(
                'generatorFeedbackMessage',
                `Locked elements are unavailable or excluded: ${unavailableNames}. Remove them from locked picks or exclusions.`
            );
            return;
        }

        const generatedBatch = [];

        // Generate 5 Output Slots
        for(let i=0; i<5; i++) {
            let bestCandidate = null;
            const MAX_ATTEMPTS = 50;

            for(let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
                const candidate = runGenerationAlgorithm(targetComp, targetCount, fixedTags, excludedTags);

                if (!bestCandidate || candidate.stats.avgComp > bestCandidate.stats.avgComp) {
                    bestCandidate = candidate;
                }

                if (bestCandidate.stats.avgComp >= targetComp && parseFloat(bestCandidate.stats.movieScore) > 0) {
                    break;
                }
            }

            generatedBatch.push(bestCandidate);
        }

        generatedBatch.sort((a, b) => {
            const scoreA = parseFloat(a.stats.movieScore);
            const scoreB = parseFloat(b.stats.movieScore);
            if (scoreA !== scoreB) return scoreB - scoreA;
            return b.stats.avgComp - a.stats.avgComp;
        });

        generatedScriptsCache = generatedBatch;
        renderGeneratedScripts(generatedBatch);
    }

    function runGenerationAlgorithm(targetComp, targetCount, fixedTags, excludedTags) {
        const excludedIds = new Set(excludedTags.map(t => t.id));

        // 1. Setup Initial Candidate
        let currentTags = [...fixedTags];
        const categoriesPresent = new Set(currentTags.map(t => t.category));

        // A. Handle Genres
        const fixedGenres = currentTags.filter(t => t.category === "Genre");
        if (fixedGenres.length === 0) {
            const genre1 = getRandomTagByCategory("Genre", currentTags, excludedIds);
            if (genre1) {
                let partnerId = null;
                if (Math.random() < 0.3) {
                     const partners = getCompatibleGenres(genre1.id, excludedIds);
                     if (partners.length > 0) {
                         partnerId = partners[Math.floor(Math.random() * partners.length)];
                     }
                }
                if (partnerId) {
                    genre1.percent = 0.5;
                    currentTags.push(genre1);
                    currentTags.push({ id: partnerId, percent: 0.5, category: "Genre" });
                } else {
                    genre1.percent = 1.0;
                    currentTags.push(genre1);
                }
            }
        }

        // B. Handle Mandatory Setting
        if (!categoriesPresent.has("Setting")) {
            const randomSetting = getRandomTagByCategory("Setting", currentTags, excludedIds);
            if(randomSetting) {
                currentTags.push(randomSetting);
                categoriesPresent.add("Setting");
            }
        }

        // C. Fill Mandatory Scoring Categories
        const scoringMandatory = ["Protagonist", "Antagonist", "Finale"];
        scoringMandatory.forEach(cat => {
            if(!categoriesPresent.has(cat) && getScoringElementCount(currentTags) < targetCount) {
                const randomTag = getRandomTagByCategory(cat, currentTags, excludedIds);
                if(randomTag) {
                    currentTags.push(randomTag);
                    categoriesPresent.add(cat);
                }
            }
        });

        // D. Fill remaining slots
        const fillerCats = ["Supporting Character", "Theme & Event"];
        while(getScoringElementCount(currentTags) < targetCount) {
            const randCat = fillerCats[Math.floor(Math.random() * fillerCats.length)];
            const randomTag = getRandomTagByCategory(randCat, currentTags, excludedIds);
            if(randomTag) currentTags.push(randomTag);
            else break;
        }

        // 2. Optimization Loop
        let bestSet = [...currentTags];
        let bestStats = calculateMatrixScore(bestSet);

        const iterations = 200;
        for(let i=0; i<iterations; i++) {
            let candidate = [...bestSet];
            const fixedIds = new Set(fixedTags.map(t => t.id));
            const mutableIndices = candidate.map((t, idx) => ({t, idx}))
                                            .filter(item => !fixedIds.has(item.t.id) && item.t.category !== 'Genre')
                                            .map(item => item.idx);
            if(mutableIndices.length === 0) break;

            const swapIdx = mutableIndices[Math.floor(Math.random() * mutableIndices.length)];
            const tagToSwap = candidate[swapIdx];
            const newTag = getRandomTagByCategory(tagToSwap.category, candidate, excludedIds);

            if(newTag) {
                candidate[swapIdx] = newTag;
                const newStats = calculateMatrixScore(candidate);
                if(newStats.rawAverage > bestStats.rawAverage) {
                    bestSet = candidate;
                    bestStats = newStats;
                }
            }
        }

        // 3. Calculate Final Stats
        const bonuses = calculateTotalBonuses(bestSet);
        const movieScores = calculateMovieScores(bestStats, bonuses, bestSet);

        return {
            tags: bestSet,
            stats: buildScriptStats(bestStats, movieScores),
            uniqueId: createScriptId()
        };
    }

    function getCompatibleGenres(sourceId, excludedIds) {
        let valid = [];
        if (GAME_DATA.genrePairs[sourceId]) {
            valid.push(...Object.keys(GAME_DATA.genrePairs[sourceId]));
        }
        for (const gKey in GAME_DATA.genrePairs) {
            if (GAME_DATA.genrePairs[gKey] && GAME_DATA.genrePairs[gKey][sourceId]) {
                valid.push(gKey);
            }
        }
        const unique = new Set(valid);
        return [...unique].filter(id => !excludedIds.has(id));
    }

    function getRandomTagByCategory(category, currentTags, excludedIds) {
        const existingIds = new Set(currentTags.map(t => t.id));
        const allTags = Object.values(GAME_DATA.tags).filter(t => t.category === category);
        const available = allTags.filter(t => !existingIds.has(t.id) && !excludedIds.has(t.id));

        if(available.length === 0) return null;
        const picked = available[Math.floor(Math.random() * available.length)];

        return {
            id: picked.id,
            percent: 1.0,
            category: category
        };
    }

    function renderGeneratedScripts(scripts) {
        const container = document.getElementById('generatorResultsList');
        container.innerHTML = '';
        document.getElementById('results-generator').classList.remove('hidden');

        scripts.forEach((script, index) => {
            // false passed here means it's NOT in the pinned section (no editable name)
            const card = createScriptCardHTML(script, false);
            container.appendChild(card);
        });
    }

    function createScriptId() {
        return Date.now() + Math.random().toString();
    }

    function buildScriptStats(matrix, movieScores) {
        return {
            avgComp: matrix.rawAverage,
            synergySum: matrix.totalScore,
            maxScriptQuality: movieScores.tagCap - 1,
            movieScore: Math.max(movieScores.commercial, movieScores.artistic).toFixed(1)
        };
    }

    function buildScriptFromTags(tags, name) {
        const evaluation = calculateScriptEvaluation(tags);

        return {
            tags: tags.map(tag => ({ id: tag.id, category: tag.category, percent: tag.percent })),
            stats: buildScriptStats(evaluation.matrix, evaluation.movieScores),
            name,
            uniqueId: createScriptId()
        };
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

        const compClass = scriptObj.stats.avgComp >= 4.0 ? 'val-high' : (scriptObj.stats.avgComp >= 3.0 ? 'val-mid' : 'val-low');

        // Tag Chips Logic
        let tagsHtml = '';
        const fixedInputs = collectTagInputs('generator');
        const fixedIds = new Set(fixedInputs.map(t => t.id));
        const categoryOrder = [
            "Genre", "Setting", "Antagonist", "Protagonist", "Supporting Character", "Theme & Event", "Finale"
        ];
        const sortedTags = [...scriptObj.tags].sort((a, b) => {
            let idxA = categoryOrder.indexOf(a.category);
            let idxB = categoryOrder.indexOf(b.category);
            if (idxA === -1) idxA = 99;
            if (idxB === -1) idxB = 99;
            return idxA - idxB;
        });

        sortedTags.forEach(t => {
            const tagData = GAME_DATA.tags[t.id];
            const tagName = tagData ? tagData.name : t.id; // Safety fallback
            const isFixed = fixedIds.has(t.id);
            tagsHtml += `<span class="gen-tag-chip ${isFixed ? 'tag-fixed' : ''}">${tagName} <small>${t.category}</small></span>`;
        });

        // Check if truly pinned to set Icon state
        const isActuallyPinned = pinnedScripts.some(s => s.uniqueId === scriptObj.uniqueId);
        const pinClass = isActuallyPinned ? 'pinned' : '';
        const pinTitle = isActuallyPinned ? 'Unpin' : 'Pin to Save';

        // Editable Name Input (Only if in pinned section)
        const nameInputHtml = isPinnedSection
            ? `<input type="text" class="script-name-input" value="${scriptObj.name || 'Untitled Script'}"
               id="${cardScope}-name-${scriptDomId}"
               data-role="script-name-input"
               placeholder="Script Name">`
            : '';

        div.innerHTML = `
            <div id="${cardScope}-header-${scriptDomId}" class="gen-header" data-role="script-card-header">
                <div class="gen-left-col">
                    ${nameInputHtml}
                    <div class="gen-info-row">
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
                    </div>
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
                    <span id="${cardScope}-short-id-${scriptDomId}" class="script-id" data-role="script-short-id">ID: ${scriptObj.uniqueId.substring(scriptObj.uniqueId.length-6)}</span>
                    <button id="${cardScope}-transfer-${scriptDomId}" class="transfer-link-btn" type="button" data-role="script-transfer-button">
                        Find Best Advertisers &rarr;
                    </button>
                </div>
            </div>
        `;
        div.querySelector('.gen-header')?.addEventListener('click', event => {
            if (event.target.closest('button, input')) return;
            toggleScriptCard(event.currentTarget);
        });
        div.querySelector('.pin-btn')?.addEventListener('click', event => togglePin(scriptObj.uniqueId, event));
        div.querySelector('.transfer-link-btn')?.addEventListener('click', () => transferScriptToAdvertisers(scriptObj.uniqueId));
        div.querySelector('.script-name-input')?.addEventListener('keyup', event => updateScriptName(scriptObj.uniqueId, event.target.value));
        div.querySelector('.script-name-input')?.addEventListener('click', event => event.stopPropagation());

        return div;
    }

    global.HACScriptGenerator = {
        setupScoreSync,
        getRequiredElementCount,
        setupGeneratorControls,
        generateScripts,
        runGenerationAlgorithm,
        getCompatibleGenres,
        getRandomTagByCategory,
        renderGeneratedScripts,
        createScriptId,
        buildScriptStats,
        buildScriptFromTags,
        createScriptCardHTML
    };
})(globalThis);
