(function(global) {
    "use strict";

    let bootRetryBound = false;

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
            await changeLanguage('English', false);
            await loadExternalData();
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
        initializeSelectors('advertisers');
        initializeSelectors('graves');
        initializeSelectors('generator');
        initializeSelectors('excluded');

        setupGlobalCategorySearch();
        setupDomEventBindings();
        setupGlobalElementPoolControl();

        buildSearchIndex();
        setupSearchListeners();
        setupScoreSync();
        setupGeneratorControls();

        // Try to setup distribution, but gracefully handle if elements aren't ready yet
        try {
            setupDistributionLogic();
        } catch (error) {
            console.warn('Distribution logic setup encountered an error:', error.message);
        }

        setupCollapsibleSections();
        initializeTargetedAdsTab();
        initializeDistributionToggles();
        setGeneratorProfile('custom');

        // Read before the restore below populates the DOM.
        const needsStartingTags = !HACExclusionStore.hasSeededStartingTags();

        // After the profile, which rebuilds the excluded list and would wipe a
        // restore that ran before it.
        HACExclusionStore.setupExclusionPersistence();

        // First run only. Clicking this with a restored list present would
        // rebuild the excluded selectors from the whitelist and the store's own
        // MutationObserver would then save that rebuild over the player's bans —
        // which is exactly how a returning player's list was destroyed before.
        if (needsStartingTags) {
            const applyButton = document.getElementById('applyStartingTagsButton');
            if (applyButton) applyButton.click();
            HACExclusionStore.markStartingTagsSeeded();
        }

        // Rendered up front so the Save/Load controls are present from the start.
        renderPinnedScripts();

        window.dispatchEvent(new CustomEvent('hollywood:ready'));
    }

    // The pool slider and the Target Movie Score slider are two views of one
    // choice: a score of N needs N-1 story elements. Score 10 is the exception —
    // 9 elements can reach it if every pick lands, 10 only improves the odds, so
    // the pool may sit at either and both map back to 10.
    //
    // Pure and exported so the mapping can be tested without a DOM. These were
    // previously inlined twice in this file and once in scriptGenerator.js, and
    // the unit tests asserted against a fourth hand-copied duplicate declared in
    // the test file — which meant no assertion here could fail when the product
    // broke.
    const POOL_MIN = 5;
    const POOL_MAX = 10;
    const SCORE_MIN = 6;
    const SCORE_MAX = 10;

    function poolSizeToTargetScore(poolSize) {
        return Math.min(poolSize + 1, SCORE_MAX);
    }

    function targetScoreToPoolSize(score) {
        return score === SCORE_MAX ? SCORE_MAX - 1 : score - 1;
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

        input.addEventListener('input', (e) => {
            let val = parseInt(e.target.value);
            if (val > POOL_MAX) val = POOL_MAX;
            if (val < POOL_MIN) val = POOL_MIN;
            if (!isNaN(val)) {
                slider.value = val;
                syncTargetScoreToPool(val, genScoreSlider, genScoreInput);
                updateElementPoolSliderStyle(slider);
            }
        });

        updateElementPoolSliderStyle(slider);
    }

    function updateElementPoolSliderStyle(slider) {
        const percent = ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
        slider.style.setProperty('--slider-fill-percent', percent + '%');
    }

    function switchTab(tabName) {
        currentTab = tabName;
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
            button.addEventListener('click', () => switchTab(button.dataset.tab));
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
            button.addEventListener('click', () => resetSelectors(button.dataset.resetContext));
        });

        function applyStartingTagsExclusions() {
            const buildExcludedList = () => {
                resetSelectors('excluded');
                const whitelist = new Set(GAME_DATA.starterWhitelist || []);
                const allTags = Object.values(GAME_DATA.tags);
                const container = document.getElementById('selectors-container-excluded');

                if (!container) return;
                container.classList.add('is-batching');
                allTags.forEach(tag => {
                    if (!whitelist.has(tag.id)) {
                        addDropdown(tag.category, tag.id, 'excluded');
                    }
                });
                container.classList.remove('is-batching');
                updateExcludedCount();

                // Refresh all script builder dropdowns to re-filter based on new exclusions
                if (typeof refreshCategoryDropdowns === 'function') {
                    ['generator', 'graves', 'advertisers', 'targeted'].forEach(context => {
                        GAME_DATA.categories.forEach(category => {
                            refreshCategoryDropdowns(category, context);
                        });
                    });
                }
            };

            setTimeout(buildExcludedList, 0);
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
                        if (!Array.isArray(data.exclusions)) {
                            alert('Invalid profile format');
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
            ['unlockBlockedLocksButton', removeBlockedLockedPicks],
            ['gravesExclusionJumpButton', jumpToExclusionEditor],
            ['transferGravesTagsButton', () => transferTagsToAdvertisers('graves')],
            ['analyzeMovieButton', analyzeMovie],
        ];

        clickBindings.forEach(([id, handler]) => {
            const element = document.getElementById(id);
            if (element) element.addEventListener('click', handler);
        });

        const loadScriptsInput = document.getElementById('loadScriptsInput');
        if (loadScriptsInput) {
            loadScriptsInput.addEventListener('change', e => handleFileLoad(e.target));
        }
    }

    global.HACAppShell = {
        initializeApp,
        switchTab,
        setupDomEventBindings,
        poolSizeToTargetScore,
        targetScoreToPoolSize,
        targetScoreTrackPercent,
        poolSizeTrackPercent
    };
})(globalThis);
