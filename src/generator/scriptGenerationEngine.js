(function(global) {
    "use strict";

    /**
     * Element freshness (docs/GAME_RULES.md section 9).
     *
     * The game marks each story element Fresh, Stale or Rotten by how often the
     * studio used it recently. The player records the state the game shows, one
     * click per change, and every place that shows the element reads the same
     * saved list. Genre and Setting have no freshness.
     *
     * Script Lab is the only reader, and index.html's script list is pinned by
     * tests/domStructure.test.js, so this ships in the generation engine's file.
     */
    const FRESHNESS_STATES = [
        { state: 'fresh', label: 'Fresh', multiplier: 1 },
        { state: 'stale', label: 'Stale', multiplier: 0.5 },
        { state: 'rotten', label: 'Rotten', multiplier: 0 }
    ];
    const FRESHNESS_CATEGORIES = ['Protagonist', 'Antagonist', 'Supporting Character', 'Theme & Event', 'Finale'];

    // Bump the version suffix if the stored shape changes.
    const STORAGE_KEY = 'hac.freshnessStates.v1';

    function hasFreshness(category) {
        return FRESHNESS_CATEGORIES.includes(category);
    }

    function stateInfo(state) {
        return FRESHNESS_STATES.find(entry => entry.state === state) || FRESHNESS_STATES[0];
    }

    function freshnessRank(state) {
        return FRESHNESS_STATES.indexOf(stateInfo(state));
    }

    function nextState(state) {
        return FRESHNESS_STATES[(freshnessRank(state) + 1) % FRESHNESS_STATES.length].state;
    }

    function isKnownState(state) {
        return FRESHNESS_STATES.some(entry => entry.state === state);
    }

    /**
     * States live in memory and are mirrored to storage. Only Stale and Rotten
     * are stored: an element with no entry is Fresh, which is how every game
     * starts. Private windows and blocked site data can make storage throw on
     * access, so every call is guarded and the states still hold for the session.
     */
    function createFreshnessStore(storage, knownTags) {
        let states = {};
        const listeners = [];

        const accepts = id => !knownTags ||
            (Object.prototype.hasOwnProperty.call(knownTags, id) && hasFreshness(knownTags[id] && knownTags[id].category));

        try {
            const parsed = storage ? JSON.parse(storage.getItem(STORAGE_KEY) || '{}') : {};
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                Object.entries(parsed).forEach(([id, state]) => {
                    if (state !== 'fresh' && isKnownState(state) && accepts(id)) states[id] = state;
                });
            }
        } catch (error) {
            states = {};
        }

        function persist() {
            if (!storage) return;
            try {
                if (Object.keys(states).length === 0) {
                    storage.removeItem(STORAGE_KEY);
                } else {
                    storage.setItem(STORAGE_KEY, JSON.stringify(states));
                }
            } catch (error) {
                // Nothing to do; the states simply stay for this session.
            }
        }

        function setState(id, state) {
            if (!accepts(id) || !isKnownState(state)) return;
            if ((states[id] || 'fresh') === state) return;
            if (state === 'fresh') {
                delete states[id];
            } else {
                states[id] = state;
            }
            persist();
            listeners.slice().forEach(listener => listener(id, state));
        }

        return {
            getState: id => states[id] || 'fresh',
            getStates: () => ({ ...states }),
            setState,
            cycle(id) {
                setState(id, nextState(states[id] || 'fresh'));
                return states[id] || 'fresh';
            },
            clearMany(ids) {
                ids.filter(id => states[id]).forEach(id => setState(id, 'fresh'));
            },
            subscribe(listener) {
                listeners.push(listener);
                return () => {
                    const index = listeners.indexOf(listener);
                    if (index !== -1) listeners.splice(index, 1);
                };
            }
        };
    }

    function browserStorage() {
        try {
            return global.localStorage || null;
        } catch (error) {
            return null;
        }
    }

    let defaultStore = null;

    // Built on first use, after GAME_DATA has loaded, so ids from an older game
    // version and anything outside the five story categories are dropped.
    function freshnessStore() {
        if (!defaultStore) {
            const knownTags = typeof GAME_DATA !== 'undefined' ? GAME_DATA.tags : null;
            defaultStore = createFreshnessStore(browserStorage(), knownTags);
        }
        return defaultStore;
    }

    // One Stale element costs the script half its viewers however many there
    // are, and any Rotten one costs all of them: the worst element decides.
    function scriptFreshness(tags, store = freshnessStore()) {
        const worst = (tags || [])
            .filter(tag => tag && hasFreshness(tag.category))
            .reduce((rank, tag) => Math.max(rank, freshnessRank(store.getState(tag.id))), 0);
        return FRESHNESS_STATES[worst];
    }

    // Freshness first, the caller's score order second.
    function rankByFreshness(scripts, compare, stateOf = script => scriptFreshness(script.tags).state) {
        return [...scripts].sort((a, b) =>
            freshnessRank(stateOf(a)) - freshnessRank(stateOf(b)) || compare(a, b));
    }

    // ---- Pills: one button per element, wherever it is shown. -------------

    function tagName(id) {
        const tag = typeof GAME_DATA !== 'undefined' ? GAME_DATA.tags[id] : null;
        return tag ? tag.name : id;
    }

    function pillLabel(id, state) {
        return `${tagName(id)} is ${stateInfo(state).label}. Click to change freshness.`;
    }

    function pillHtml(id) {
        const { state, label } = stateInfo(freshnessStore().getState(id));
        return `<button type="button" class="freshness-pill freshness-${state}" data-role="freshness-pill" data-tag-id="${id}" data-freshness="${state}" aria-label="${pillLabel(id, state)}">${label}</button>`;
    }

    // Updates the pill in place. The label changes through the text node's
    // value rather than textContent: the Age & Gender panel re-renders on any
    // child-list mutation inside the locked elements, and a click should not
    // cost a re-render there.
    function renderPill(pill, id) {
        if (!id) {
            pill.hidden = true;
            delete pill.dataset.tagId;
            return;
        }
        const { state, label } = stateInfo(freshnessStore().getState(id));
        pill.hidden = false;
        pill.dataset.tagId = id;
        pill.dataset.freshness = state;
        pill.className = `freshness-pill freshness-${state}`;
        pill.setAttribute('aria-label', pillLabel(id, state));
        if (pill.firstChild && pill.firstChild.nodeType === 3) {
            pill.firstChild.nodeValue = label;
        } else {
            pill.textContent = label;
        }
    }

    function createPill() {
        const pill = document.createElement('button');
        pill.type = 'button';
        pill.className = 'freshness-pill';
        pill.dataset.role = 'freshness-pill';
        if (typeof document.createTextNode === 'function') pill.appendChild(document.createTextNode(''));
        pill.hidden = true;
        return pill;
    }

    function syncPills(id) {
        document.querySelectorAll(`.freshness-pill[data-tag-id="${id}"]`)
            .forEach(pill => renderPill(pill, id));
    }

    function onPillClick(event) {
        const pill = event.target && event.target.closest
            ? event.target.closest('.freshness-pill[data-tag-id]')
            : null;
        if (!pill) return;
        // A pill sits inside a dropdown row or a result chip; the click is the
        // pill's alone and must not open the card or the dropdown.
        event.preventDefault();
        event.stopPropagation();
        freshnessStore().cycle(pill.dataset.tagId);
    }

    let pillsInstalled = false;
    function installPills() {
        if (pillsInstalled || typeof document === 'undefined' || typeof document.addEventListener !== 'function') return;
        pillsInstalled = true;
        // Capture phase, so no card or row handler sees a pill click first.
        document.addEventListener('click', onPillClick, true);
        freshnessStore().subscribe(id => syncPills(id));
    }

    // ---- Trash elements (GAME_RULES section 11) ----------------------------
    // An informative label shown beside the freshness pill. It has no click
    // action and no score effect; GAME_DATA.tags[id].trash comes from the game
    // file's TRASH rule.
    const TRASH_LABEL = 'Trash element';

    function isTrash(id) {
        const tag = id && typeof GAME_DATA !== 'undefined' ? GAME_DATA.tags[id] : null;
        return Boolean(tag && tag.trash);
    }

    function badgeHtml(id) {
        if (!isTrash(id)) return '';
        return `<span class="trash-badge" data-role="trash-badge" data-tag-id="${id}" title="${tagName(id)} is a trash element"><span class="trash-badge-icon" aria-hidden="true"></span>${TRASH_LABEL}</span>`;
    }

    function createBadge() {
        const badge = document.createElement('span');
        badge.className = 'trash-badge';
        badge.dataset.role = 'trash-badge';
        badge.hidden = true;
        return badge;
    }

    function renderBadge(badge, id) {
        if (!badge) return;
        if (!isTrash(id)) {
            badge.hidden = true;
            delete badge.dataset.tagId;
            return;
        }
        badge.hidden = false;
        badge.dataset.tagId = id;
        badge.title = `${tagName(id)} is a trash element`;
        if (!badge.firstChild) {
            const icon = document.createElement('span');
            icon.className = 'trash-badge-icon';
            icon.setAttribute('aria-hidden', 'true');
            badge.appendChild(icon);
            badge.appendChild(document.createTextNode(TRASH_LABEL));
        }
    }

    global.HACTrashElements = { TRASH_LABEL, isTrash, badgeHtml, createBadge, renderBadge };

    global.HACFreshness = {
        FRESHNESS_STATES,
        FRESHNESS_CATEGORIES,
        STORAGE_KEY,
        hasFreshness,
        stateInfo,
        freshnessRank,
        nextState,
        createFreshnessStore,
        freshnessStore,
        scriptFreshness,
        rankByFreshness,
        pillHtml,
        renderPill,
        createPill,
        syncPills,
        installPills
    };
})(globalThis);

(function(global) {
    "use strict";

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

        if (available.length === 0) return null;
        // Freshest first (GAME_RULES section 9): a Stale element only when no
        // Fresh one is left, a Rotten one only when nothing else is. The fill
        // and the swap search both draw here, so neither brings in a worn-out
        // element while a fresher one fits. Genre and Setting are always Fresh.
        const store = HACFreshness.freshnessStore();
        const freshest = Math.min(...available.map(t => HACFreshness.freshnessRank(store.getState(t.id))));
        const pool = available.filter(t => HACFreshness.freshnessRank(store.getState(t.id)) === freshest);
        const picked = pool[Math.floor(Math.random() * pool.length)];

        return {
            id: picked.id,
            percent: 1.0,
            category: category
        };
    }

    function createScriptId() {
        return Date.now() + Math.random().toString();
    }

    function buildScriptStats(matrix, movieScores) {
        return {
            avgComp: matrix.rawAverage,
            synergySum: matrix.totalScore,
            maxScriptQuality: HACMovieScoreEstimator.getScriptQualityCap(movieScores.tagCap),
            movieScore: Math.max(movieScores.commercial, movieScores.artistic).toFixed(1)
        };
    }

    // One result per element set (owner ruling 2026-10-06, GAME_RULES.md):
    // the same element ids are the same result, whatever the genre
    // percentages. Script Lab and Build for Target both key on this.
    function scriptSignature(tags) {
        return (tags || []).map(tag => tag.id).sort().join('|');
    }

    function buildScriptFromTags(tags, name) {
        const evaluation = calculateScriptEvaluation(tags);

        return {
            tags: tags.map(tag => ({ id: tag.id, category: tag.category, percent: tag.percent })),
            stats: buildScriptStats(evaluation.matrix, evaluation.movieScores),
            scores: {
                commercial: evaluation.movieScores.commercial,
                artistic: evaluation.movieScores.artistic
            },
            name,
            uniqueId: createScriptId()
        };
    }

    function runGenerationAlgorithm(targetComp, targetCount, fixedTags, excludedTags) {
        const excludedIds = new Set(excludedTags.map(t => t.id));

        let currentTags = [...fixedTags];
        const categoriesPresent = new Set(currentTags.map(t => t.category));

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

        if (!categoriesPresent.has("Setting")) {
            const randomSetting = getRandomTagByCategory("Setting", currentTags, excludedIds);
            if (randomSetting) {
                currentTags.push(randomSetting);
                categoriesPresent.add("Setting");
            }
        }

        // The Protagonist is required and reserved whatever the locks hold;
        // prepareGenerationInputs refuses locks that leave it no room.
        HACScriptRules.mandatoryStoryCategories.forEach(cat => {
            if (categoriesPresent.has(cat)) return;
            const randomTag = getRandomTagByCategory(cat, currentTags, excludedIds);
            if (randomTag) {
                currentTags.push(randomTag);
                categoriesPresent.add(cat);
            }
        });

        // Antagonist and Finale are optional normal picks, one each at most,
        // competing with the other story categories (GAME_RULES.md section 1).
        const optionalSingles = HACScriptRules.optionalStoryCategories;
        const fillerCats = ["Supporting Character", "Theme & Event",
            ...optionalSingles.filter(cat => !categoriesPresent.has(cat))];
        while (getScoringElementCount(currentTags) < targetCount) {
            const randCat = fillerCats[Math.floor(Math.random() * fillerCats.length)];
            if (optionalSingles.includes(randCat) && categoriesPresent.has(randCat)) {
                fillerCats.splice(fillerCats.indexOf(randCat), 1);
                if (fillerCats.length === 0) break;
                continue;
            }
            const randomTag = getRandomTagByCategory(randCat, currentTags, excludedIds);
            if (randomTag) {
                currentTags.push(randomTag);
                categoriesPresent.add(randCat);
            } else {
                fillerCats.splice(fillerCats.indexOf(randCat), 1);
                if (fillerCats.length === 0) break;
            }
        }

        let bestSet = [...currentTags];
        let bestStats = calculateMatrixScore(bestSet);

        const iterations = 200;
        for (let i = 0; i < iterations; i++) {
            let candidate = [...bestSet];
            const fixedIds = new Set(fixedTags.map(t => t.id));
            const mutableIndices = candidate.map((t, idx) => ({ t, idx }))
                                            .filter(item => !fixedIds.has(item.t.id) && item.t.category !== 'Genre')
                                            .map(item => item.idx);
            if (mutableIndices.length === 0) break;

            const swapIdx = mutableIndices[Math.floor(Math.random() * mutableIndices.length)];
            const tagToSwap = candidate[swapIdx];
            const newTag = getRandomTagByCategory(tagToSwap.category, candidate, excludedIds);

            if (newTag) {
                candidate[swapIdx] = newTag;
                const newStats = calculateMatrixScore(candidate);
                // The swap draws from the other elements of the category, so it
                // can offer a worn-out one for the only Fresh one. Freshness is
                // compared before compatibility, as the results are ranked.
                const freshnessGap = HACFreshness.freshnessRank(HACFreshness.scriptFreshness(candidate).state) -
                    HACFreshness.freshnessRank(HACFreshness.scriptFreshness(bestSet).state);
                if (freshnessGap < 0 || (freshnessGap === 0 && newStats.rawAverage > bestStats.rawAverage)) {
                    bestSet = candidate;
                    bestStats = newStats;
                }
            }
        }

        const bonuses = calculateTotalBonuses(bestSet);
        const movieScores = calculateMovieScores(bestStats, bonuses, bestSet);

        return {
            tags: bestSet,
            stats: buildScriptStats(bestStats, movieScores),
            scores: {
                commercial: movieScores.commercial,
                artistic: movieScores.artistic
            },
            uniqueId: createScriptId()
        };
    }

    global.HACScriptGenerationEngine = {
        buildScriptFromTags,
        buildScriptStats,
        createScriptId,
        getCompatibleGenres,
        getRandomTagByCategory,
        runGenerationAlgorithm,
        scriptSignature
    };
})(globalThis);
