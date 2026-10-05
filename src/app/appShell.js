(function(global) {
    "use strict";

    let bootRetryBound = false;
    let scoreSyncInitialized = false;
    const initializedTabs = new Set(['generator', 'excluded']);

    // Bound outside the start-up sequence: the retry control has to work precisely
    // when that sequence has failed.
    function bindBootRetry() {
        if (bootRetryBound) return;
        const button = document.getElementById('retryBootButton');
        if (!button) return;
        button.addEventListener('click', () => initializeApp());
        bootRetryBound = true;
    }

    function setBootError(message) {
        const detail = document.getElementById('app-boot-error-detail');
        if (detail) detail.innerText = message;

        const banner = document.getElementById('app-boot-error');
        if (!banner) return;
        banner.hidden = message === '';
        banner.classList.toggle('hidden', message === '');
    }

    function failBoot(error) {
        console.error('Failed to start:', error);
        setBootError(error.message || 'The data files could not be reached.');
        window.dispatchEvent(new CustomEvent('hollywood:failed', { detail: { error } }));
    }

    async function initializeApp() {
        bindBootRetry();
        setBootError('');

        // Only this stretch reaches the network, so it is the only part that can
        // fail in a way the user can act on.
        try {
            performance.mark('startup:localization:start');
            await changeLanguage('English', false);
            performance.mark('startup:localization:end');
            performance.measure('startup:localization', 'startup:localization:start', 'startup:localization:end');

            performance.mark('startup:essential-data:start');
            await loadExternalData();
            performance.mark('startup:essential-data:end');
            performance.measure('startup:essential-data', 'startup:essential-data:start', 'startup:essential-data:end');
            performance.mark('data:loaded');
        } catch (error) {
            failBoot(error);
            return;
        }

        // data.js ships tags: {}, so a load that returns nothing leaves every panel
        // an empty shell. Say so rather than rendering one.
        if (Object.keys(GAME_DATA.tags).length === 0) {
            failBoot(new Error('No story elements were returned, so nothing can be selected.'));
            return;
        }

        // Everything below builds the interface from data already in memory. A throw
        // here is a bug worth surfacing, not a condition to swallow — the old
        // catch-all turned any of it into a silently half-rendered page.

        // Graves selector IDs are part of the ready-state DOM contract even
        // though its interactions and analysis listeners remain tab-lazy.
        [
            ['generator', false],
            ['excluded', false],
            ['graves', true]
        ].forEach(([context, deferOptions]) => {
            const startMark = `startup:selectors:${context}:start`;
            const endMark = `startup:selectors:${context}:end`;
            performance.mark(startMark);
            initializeSelectors(context, deferOptions);
            performance.mark(endMark);
            performance.measure(`startup:selectors:${context}`, startMark, endMark);
        });
        performance.mark('selectors:initialized');

        setupGlobalCategorySearch();
        setupDomEventBindings();
        setupGlobalElementPoolControl();

        buildSearchIndex();
        setupGeneratorControls();
        if (global.HACAnalysisAgeRoleBreakdown && global.HACAnalysisAgeRoleBreakdown.setupAgeRoleBreakdownListeners) {
            global.HACAnalysisAgeRoleBreakdown.setupAgeRoleBreakdownListeners();
        }

        setupCollapsibleSections();
        if (global.HACPolluxSaveEditorView) global.HACPolluxSaveEditorView.setupPolluxSaveEditor();
        initializeSelectors('excluded');

        // Read before the restore below populates the DOM. A saved list without
        // the marker predates the marker: it is the player's, not a first run.
        const hasSavedList = HACExclusionStore.hasSavedExclusions();
        const needsStartingTags = !HACExclusionStore.hasSeededStartingTags() && !hasSavedList;

        // After the excluded list is built, since building it would wipe a
        // restore that ran before it.
        HACExclusionStore.setupExclusionPersistence();

        // First run only. Clicking this with a restored list present would
        // rebuild the excluded selectors from the whitelist and the store's own
        // MutationObserver would then save that rebuild over the player's bans —
        // which is exactly how a returning player's list was destroyed before.
        if (needsStartingTags) {
            const applyButton = document.getElementById('applyStartingTagsButton');
            if (applyButton) {
                performance.mark('startup:first-run-exclusions:start');
                applyButton.click();
                performance.mark('startup:first-run-exclusions:end');
                performance.measure(
                    'startup:first-run-exclusions',
                    'startup:first-run-exclusions:start',
                    'startup:first-run-exclusions:end'
                );
            }
            HACExclusionStore.markStartingTagsSeeded();
        } else if (hasSavedList) {
            HACExclusionStore.markStartingTagsSeeded();
        }

        // Rendered up front so the Save/Load controls are present from the start.
        renderPinnedScripts();

        performance.mark('app:ready');
        const marks = performance.getEntriesByType('mark').map(m => ({ name: m.name, time: m.startTime }));
        const measures = performance.getEntriesByType('measure').map(m => ({ name: m.name, duration: m.duration, start: m.startTime }));
        window.dispatchEvent(new CustomEvent('hollywood:ready', {
            detail: { marks, measures, navigationStart: performance.timing.navigationStart || performance.now() - performance.timeOrigin }
        }));
    }

    // The pool slider and the Target Movie Score slider are two views of one
    // choice, one to one from 5 to 10 (GAME_RULES.md §1, owner 2026-09-30).
    //
    // Pure and exported so the mapping can be tested without a DOM.
    const POOL_MIN = 5;
    const POOL_MAX = 10;
    const SCORE_MIN = 5;
    const SCORE_MAX = 10;

    // The one clamp for Max Element Pool (GAME_RULES.md §2). An unreadable value
    // falls back to `fallback` (the slider, which only ever holds a valid size).
    function clampPoolSize(value, fallback = POOL_MIN) {
        let size = parseInt(value, 10);
        if (Number.isNaN(size)) size = parseInt(fallback, 10);
        if (Number.isNaN(size)) size = POOL_MIN;
        return Math.min(POOL_MAX, Math.max(POOL_MIN, size));
    }

    // One to one, 5 to 10 (owner ruling 2026-09-30, GAME_RULES.md section 1):
    // the pool is the story-element count and the target follows it.
    function poolSizeToTargetScore(poolSize) {
        return Math.min(SCORE_MAX, Math.max(SCORE_MIN, poolSize));
    }

    function targetScoreToPoolSize(score) {
        return Math.min(POOL_MAX, Math.max(POOL_MIN, score));
    }

    function targetScoreTrackPercent(score) {
        return ((score - SCORE_MIN) / (SCORE_MAX - SCORE_MIN)) * 100;
    }

    function poolSizeTrackPercent(poolSize) {
        return ((poolSize - POOL_MIN) / (POOL_MAX - POOL_MIN)) * 100;
    }

    // Both pool controls drive the score the same way; only the source differs.
    function syncTargetScoreToPool(poolVal, genScoreSlider, genScoreInput) {
        if (!genScoreSlider || !genScoreInput) return;
        const mappedScore = poolSizeToTargetScore(poolVal);
        genScoreSlider.value = mappedScore;
        genScoreInput.value = mappedScore;
        // Refresh help without firing input events that would remap pool 8 to 7.
        global.HACScriptGenerator.updateRequiredElementDisplay(mappedScore);
        genScoreSlider.style.setProperty('--slider-fill-color', '#d4af37');
        genScoreSlider.style.setProperty('--slider-fill-percent', targetScoreTrackPercent(mappedScore) + '%');
    }

    function setupGlobalElementPoolControl() {
        const slider = document.getElementById('globalElementPoolSlider');
        const input = document.getElementById('globalElementPoolInput');
        const genScoreSlider = document.getElementById('genScoreSlider');
        const genScoreInput = document.getElementById('genScoreInput');

        if (!slider || !input) return;

        slider.addEventListener('input', (e) => {
            const poolVal = parseInt(e.target.value);
            input.value = poolVal;
            syncTargetScoreToPool(poolVal, genScoreSlider, genScoreInput);
            updateElementPoolSliderStyle(slider);
        });

        // Mid-typing ("1" on the way to "10") the box is left alone; only the
        // slider follows. Leaving the box writes back the size actually in use.
        input.addEventListener('input', (e) => {
            if (Number.isNaN(parseInt(e.target.value, 10))) return;
            const val = clampPoolSize(e.target.value);
            slider.value = val;
            syncTargetScoreToPool(val, genScoreSlider, genScoreInput);
            updateElementPoolSliderStyle(slider);
        });

        input.addEventListener('change', () => {
            const val = clampPoolSize(input.value, slider.value);
            input.value = val;
            slider.value = val;
            syncTargetScoreToPool(val, genScoreSlider, genScoreInput);
            updateElementPoolSliderStyle(slider);
        });

        updateElementPoolSliderStyle(slider);
    }

    function updateElementPoolSliderStyle(slider) {
        const percent = ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
        slider.style.setProperty('--slider-fill-percent', percent + '%');
    }

    function initializeTabContext(tabName) {
        // Lazy-initialize deferred tab setup when user switches to that tab
        if (tabName === 'graves' || tabName === 'advertisers' || tabName === 'targeted') {
            // Initialize DOM selectors for graves and advertisers if needed
            const gravesSelectors = document.getElementById('selectors-container-graves');
            const advertiserSelectors = document.getElementById('selectors-container-advertisers');
            if (tabName === 'graves' && !gravesSelectors.querySelector('.category-group')) {
                initializeSelectors('graves', true);
            }
            if ((tabName === 'advertisers' || tabName === 'targeted') && !advertiserSelectors.querySelector('.category-group')) {
                initializeSelectors('advertisers', true);
            }
            if (tabName === 'graves') {
                HACStoryElementSelector.populateContextOptions('graves');
            }
            if (tabName === 'advertisers' || tabName === 'targeted') {
                HACStoryElementSelector.populateContextOptions('advertisers');
            }

            // Setup search and score listeners for evaluation features
            if (tabName === 'graves') {
                setupSearchListeners();
            }

            if (!scoreSyncInitialized) {
                setupScoreSync();
                scoreSyncInitialized = true;
            }

            // Setup distribution logic and toggles for marketing features
            if (tabName === 'advertisers' || tabName === 'targeted') {
                try {
                    setupDistributionLogic();
                } catch (error) {
                    console.warn('Distribution logic setup encountered an error:', error.message);
                }
                initializeDistributionToggles();
                initializeTargetedAdsTab();
            }
        }
    }

    function switchTab(tabName) {
        currentTab = tabName;

        // Lazy-initialize tab if not yet initialized
        if (!initializedTabs.has(tabName)) {
            initializeTabContext(tabName);
            initializedTabs.add(tabName);
        }

        const primaryTab = PRIMARY_TAB_BY_FEATURE[tabName] || tabName;
        const activeElement = document.activeElement;
        const nextPrimaryButton = document.querySelector(`.tab-btn[data-tab="${primaryTab}"]`);
        const focusWillBeHidden = activeElement && Array.from(document.querySelectorAll('.tab-content'))
            .some(content => content.id !== `tab-${tabName}` && content.contains(activeElement));

        if (focusWillBeHidden) {
            if (nextPrimaryButton) nextPrimaryButton.focus({ preventScroll: true });
            else activeElement.blur();
        }

        document.querySelectorAll('.tab-btn[data-tab]').forEach(button => {
            const isActive = button.dataset.tab === primaryTab;
            button.classList.toggle('active', isActive);
            button.setAttribute('aria-pressed', String(isActive));
            button.tabIndex = 0;
        });

        document.querySelectorAll('[data-feature-tab]').forEach(button => {
            const isActive = button.dataset.featureTab === tabName;
            button.classList.toggle('active', isActive);
            button.setAttribute('aria-pressed', String(isActive));
        });

        document.querySelectorAll('.tab-content').forEach(content => {
            const isActive = content.id === `tab-${tabName}`;
            content.classList.toggle('hidden', !isActive);
            content.hidden = !isActive;
            content.inert = !isActive;
            content.setAttribute('aria-hidden', String(!isActive));
        });

        // When returning to the Build tab, update the exclusion badge in case
        // dropdowns changed while the tab was hidden.
        if (tabName === 'build' && typeof updateExcludedCount === 'function') {
            updateExcludedCount();
        }
    }

    function setupDomEventBindings() {
        const languageSelector = document.getElementById('languageSelector');
        if (languageSelector) {
            languageSelector.addEventListener('change', e => changeLanguage(e.target.value));
        }

        document.querySelectorAll('.tab-btn[data-tab]').forEach(button => {
            button.addEventListener('click', function() {
                const tab = this.dataset.tab;
                // Special handling for Marketing tab: cycle through feature tabs on repeated clicks
                if (tab === 'advertisers' && (currentTab === 'advertisers' || currentTab === 'targeted')) {
                    const nextTab = currentTab === 'targeted' ? 'advertisers' : 'targeted';
                    switchTab(nextTab);
                } else {
                    switchTab(tab);
                }
            });
        });

        document.querySelectorAll('[data-feature-tab]').forEach(button => {
            button.addEventListener('click', () => switchTab(button.dataset.featureTab));
        });

        document.querySelectorAll('[data-save-script]').forEach(button => {
            button.addEventListener('click', () => saveScriptFromContext(button.dataset.saveScript));
        });

        document.querySelectorAll('[data-best-match-mode]').forEach(button => {
            button.addEventListener('click', () => setBestMatchMode(button.dataset.bestMatchMode));
        });

        document.querySelectorAll('[data-reset-context]').forEach(button => {
            button.addEventListener('click', () => {
                const context = button.dataset.resetContext;
                resetSelectors(context);
                if (context === 'excluded') HACExclusionStore.saveExclusions();
            });
        });

        function applyStartingTagsExclusions() {
            resetSelectors('excluded');
            const whitelist = new Set(GAME_DATA.starterWhitelist || []);
            const allTags = Object.values(GAME_DATA.tags);
            const container = document.getElementById('selectors-container-excluded');

            if (!container) return;
            container.classList.add('is-batching');
            try {
                allTags.forEach(tag => {
                    if (!whitelist.has(tag.id)) {
                        addDropdown(tag.category, tag.id, 'excluded');
                    }
                });
            } finally {
                container.classList.remove('is-batching');
            }

            updateExcludedCount();
            if (typeof global.HACExclusionStore?.saveExclusions === 'function') {
                global.HACExclusionStore.saveExclusions();
            }

            // Refresh all script builder dropdowns to re-filter based on new exclusions
            if (typeof refreshCategoryDropdowns === 'function') {
                ['generator', 'graves', 'advertisers', 'targeted'].forEach(context => {
                    GAME_DATA.categories.forEach(category => {
                        refreshCategoryDropdowns(category, context);
                    });
                });
            }
        }

        function saveExclusionProfile() {
            const exclusions = collectTagInputs('excluded');
            const data = {
                version: 1,
                timestamp: new Date().toISOString(),
                exclusions: exclusions.map(tag => ({ id: tag.id, category: tag.category }))
            };
            const json = JSON.stringify(data, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `hollywood-exclusions-${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
        }

        function loadExclusionProfile() {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'application/json';
            input.addEventListener('change', e => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = event => {
                    try {
                        const data = JSON.parse(event.target.result);
                        // Checked in full before the reset below: a reset
                        // followed by a failure would leave the list empty,
                        // and the store would save that over the player's bans.
                        const isKnownEntry = entry => entry
                            && typeof entry.id === 'string'
                            && Object.prototype.hasOwnProperty.call(GAME_DATA.tags, entry.id)
                            && GAME_DATA.tags[entry.id].category === entry.category;
                        if (!data || !Array.isArray(data.exclusions) || !data.exclusions.every(isKnownEntry)) {
                            alert('Invalid profile format. Your current bans are unchanged.');
                            return;
                        }
                        resetSelectors('excluded');
                        data.exclusions.forEach(({ id, category }) => {
                            addDropdown(category, id, 'excluded');
                        });
                        updateExcludedCount();
                    } catch (error) {
                        alert('Failed to load profile: ' + error.message);
                    }
                };
                reader.readAsText(file);
            });
            input.click();
        }

        const clickBindings = [
            ['applyStartingTagsButton', applyStartingTagsExclusions],
            ['saveExclusionProfileButton', saveExclusionProfile],
            ['loadExclusionProfileButton', loadExclusionProfile],
            ['generateScriptsButton', generateScripts],
            ['savePinnedScriptsButton', savePinnedScripts],
            ['loadPinnedScriptsButton', triggerLoadScripts],
            ['evaluateGravesButton', evaluateColmanGravesScript],
            ['generateBestMatchesButton', generateBestMatches],
            ['generateBestArtisticScriptsButton', () => generateBestScoreScripts('artistic')],
            ['generateBestCommercialScriptsButton', () => generateBestScoreScripts('commercial')],
            ['gravesExclusionJumpButton', jumpToExclusionEditor],
            ['transferGravesTagsButton', () => transferTagsToAdvertisers('graves')],
            ['analyzeMovieButton', analyzeMovie],
            ['transferToGeneratorButton', () => global.HACMarketingPlanner?.transferToGenerator?.()],
        ];

        clickBindings.forEach(([id, handler]) => {
            const element = document.getElementById(id);
            if (element) element.addEventListener('click', handler);
        });

        global.HACGravesAudience?.watchGravesBuilder?.();

        const loadScriptsInput = document.getElementById('loadScriptsInput');
        if (loadScriptsInput) {
            loadScriptsInput.addEventListener('change', e => handleFileLoad(e.target));
        }
    }

    global.HACAppShell = {
        initializeApp,
        switchTab,
        setupDomEventBindings,
        clampPoolSize,
        poolSizeToTargetScore,
        targetScoreToPoolSize,
        targetScoreTrackPercent,
        poolSizeTrackPercent
    };
})(globalThis);
