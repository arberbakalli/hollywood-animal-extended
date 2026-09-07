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
        initializeSelectors('synergy');
        initializeSelectors('graves');
        initializeSelectors('generator');
        initializeSelectors('excluded');

        setupGlobalCategorySearch();
        setupDomEventBindings();

        buildSearchIndex();
        setupSearchListeners();
        setupScoreSync();
        setupGeneratorControls();
        setupDistributionLogic();
        setupCollapsibleSections();
        initializeTargetedAdsTab();
        initializeDistributionToggles();
        setGeneratorProfile('custom');

        // Rendered up front so the Save/Load controls are present from the start.
        renderPinnedScripts();

        window.dispatchEvent(new CustomEvent('hollywood:ready'));
    }

    function switchTab(tabName) {
        currentTab = tabName;
        const primaryTab = PRIMARY_TAB_BY_FEATURE[tabName] || tabName;

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
            content.setAttribute('aria-hidden', String(!isActive));
        });
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

        document.querySelectorAll('[data-generator-profile]').forEach(button => {
            button.addEventListener('click', () => setGeneratorProfile(button.dataset.generatorProfile));
        });

        document.querySelectorAll('[data-reset-context]').forEach(button => {
            button.addEventListener('click', () => resetSelectors(button.dataset.resetContext));
        });

        const clickBindings = [
            ['generateScriptsButton', generateScripts],
            ['savePinnedScriptsButton', savePinnedScripts],
            ['loadPinnedScriptsButton', triggerLoadScripts],
            ['calculateSynergyButton', calculateSynergy],
            ['evaluateGravesButton', evaluateColmanGravesScript],
            ['generateBestMatchesButton', generateBestMatches],
            ['unlockBlockedLocksButton', removeBlockedLockedPicks],
            ['gravesExclusionJumpButton', jumpToExclusionEditor],
            ['transferTagsButton', () => transferTagsToAdvertisers('synergy')],
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
        setupDomEventBindings
    };
})(globalThis);
