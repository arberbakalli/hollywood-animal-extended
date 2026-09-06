(function(global) {
    "use strict";

    function setGeneratorProfile(profileName) {
        currentGenProfile = profileName;

        // 1. Update Buttons Visual State
        document.getElementById('btn-profile-custom').classList.remove('active');
        document.getElementById('btn-profile-starting').classList.remove('active');
        document.getElementById(`btn-profile-${profileName}`).classList.add('active');

        // 2. Update Description Text
        const descText = document.getElementById('profile-desc-text');
        if (profileName === 'starting') {
            descText.innerHTML = "Only <strong class=\"text-accent\">Starting Tags</strong> are available. Everything else is moved to Excluded.";
        } else {
            descText.innerHTML = "All tags are available. You can manually exclude tags below.";
        }

        // 3. Handle Exclusion Logic
        if (profileName === 'starting') {
            populateExcludedForStartingProfile();
        } else {
            // Custom: Reset exclusions. Clear the lazy-load flag too, otherwise
            // switching back to Starting Tags would find it already "loaded".
            startingProfileExcludedLoaded = false;
            initializeSelectors('excluded');
        }
    }

    function populateExcludedForStartingProfile() {
        // Lazy loading: Only populate excluded elements once to prevent UI freeze
        if (startingProfileExcludedLoaded) {
            updateExcludedCount();
            return;
        }

        const buildExcludedList = () => {
            initializeSelectors('excluded');
            const whitelist = new Set(GAME_DATA.starterWhitelist || []);
            const allTags = Object.values(GAME_DATA.tags);
            const container = document.getElementById('selectors-container-excluded');

            container.classList.add('is-batching');
            allTags.forEach(tag => {
                if (!whitelist.has(tag.id)) {
                    addDropdown(tag.category, tag.id, 'excluded');
                }
            });
            container.classList.remove('is-batching');
            startingProfileExcludedLoaded = true;
            updateExcludedCount();
        };

        // Defer the heavy DOM work off the click handler so the button repaints
        // immediately and INP stays low. Deliberately setTimeout, not
        // requestIdleCallback: Chrome suspends idle callbacks in hidden tabs and
        // ignores their timeout there, so clicking Starting Tags and switching tabs
        // would leave the exclusion list silently empty.
        setTimeout(buildExcludedList, 0);
    }

    function getProfileExcludedIds() {
        if (currentGenProfile !== 'starting') return new Set();

        const whitelist = new Set(GAME_DATA.starterWhitelist || []);
        return new Set(
            Object.values(GAME_DATA.tags)
                .filter(tag => !whitelist.has(tag.id))
                .map(tag => tag.id)
        );
    }

    function getStarterAvailableIds() {
        return new Set(GAME_DATA.starterWhitelist || Object.keys(GAME_DATA.tags));
    }

    function getAllAvailableTagIds(profileName = currentGenProfile) {
        if (profileName === 'starting') return getStarterAvailableIds();
        return new Set(Object.keys(GAME_DATA.tags));
    }

    function getManuallyExcludedIds(context = 'excluded') {
        return new Set(collectTagInputs(context).map(tag => tag.id));
    }

    function getGeneratorExcludedIds(manualExcludedTags = null) {
        const excludedIds = manualExcludedTags
            ? new Set(manualExcludedTags.map(tag => tag.id))
            : getManuallyExcludedIds('excluded');
        getProfileExcludedIds().forEach(id => excludedIds.add(id));
        return excludedIds;
    }

    function getGeneratorExcludedTags(manualExcludedTags = null) {
        return [...getGeneratorExcludedIds(manualExcludedTags)].map(id => ({ id }));
    }

    function updateExcludedCount() {
        const excludedContainer = document.getElementById('selectors-container-excluded');
        const badge = document.getElementById('excluded-count');
        if (excludedContainer && badge) {
            const selectedCount = Array.from(excludedContainer.querySelectorAll('select.tag-selector'))
                .filter(select => Boolean(select.value))
                .length;
            badge.textContent = selectedCount;
        }

        // Graves consumes the same exclusion list, so its notice tracks this.
        if (typeof updateGravesExclusionNotice === 'function') updateGravesExclusionNotice();
    }

    global.HACAvailabilityFilter = {
        setGeneratorProfile,
        populateExcludedForStartingProfile,
        getProfileExcludedIds,
        getStarterAvailableIds,
        getAllAvailableTagIds,
        getManuallyExcludedIds,
        getGeneratorExcludedIds,
        getGeneratorExcludedTags,
        updateExcludedCount
    };
})(globalThis);
