(function(global) {
    "use strict";

    async function initializeApp() {
        try {
            await changeLanguage('English', false);
            await loadExternalData();
            initializeSelectors('advertisers');
            initializeSelectors('synergy');
            initializeSelectors('graves');

            // Init generator tab selectors (Locked and Excluded)
            initializeSelectors('generator');
            initializeSelectors('excluded');

            // Setup global search filtering (once, for all contexts)
            setupGlobalCategorySearch();
            setupDomEventBindings();

            buildSearchIndex();
            setupSearchListeners();
            setupScoreSync();
            setupGeneratorControls();

            // Setup Distribution Calculator (Immediate Interaction)
            setupDistributionLogic();

            // Initialize Collapsible Sections
            setupCollapsibleSections();

            // Initialize Targeted Ads Tab
            initializeTargetedAdsTab();

            // Initialize Distribution Toggles (Striking Image, etc.)
            initializeDistributionToggles();

            // Initialize Default Profile
            setGeneratorProfile('custom');

            // RENDER PINNED SECTION IMMEDIATELY (To show Save/Load buttons)
            renderPinnedScripts();

            window.dispatchEvent(new CustomEvent('hollywood:ready'));
            console.log("Initialization Complete.");
        } catch (error) {
            console.error("Failed to load data:", error);
        }

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
            ['gravesExclusionJumpButton', jumpToExclusionEditor],
            ['transferTagsButton', transferTagsToAdvertisers],
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
