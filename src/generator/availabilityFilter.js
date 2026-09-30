(function(global) {
    "use strict";

    function getManuallyExcludedIds(context = 'excluded') {
        return new Set(collectTagInputs(context).map(tag => tag.id));
    }

    function getGeneratorExcludedIds(manualExcludedTags = null) {
        // The exclusion list is the single source of truth. Applying Starting Tags
        // writes every non-starter element into it.
        return manualExcludedTags
            ? new Set(manualExcludedTags.map(tag => tag.id))
            : getManuallyExcludedIds('excluded');
    }

    function getGeneratorExcludedTags(manualExcludedTags = null) {
        return [...getGeneratorExcludedIds(manualExcludedTags)].map(id => ({ id }));
    }

    function updateExcludedCount() {
        const excludedContainer = document.getElementById('selectors-container-excluded');
        const badge = document.getElementById('excluded-count');

        // A mutation observer calls this on every insertion, and Apply Starting Tags
        // inserts 193 rows in one pass. Skip until the batch closes; that path
        // calls this once itself afterwards.
        if (excludedContainer && excludedContainer.classList.contains('is-batching')) return;

        if (excludedContainer && badge) {
            const selectedCount = Array.from(excludedContainer.querySelectorAll('select.tag-selector'))
                .filter(select => Boolean(select.value))
                .length;
            badge.textContent = selectedCount;
        }

        // Locked picks and the Graves notice both read this list, so both follow it.
        if (typeof refreshLockedElementAvailability === 'function') refreshLockedElementAvailability();
        if (typeof updateGravesExclusionNotice === 'function') updateGravesExclusionNotice();
    }

    global.HACAvailabilityFilter = {
        getManuallyExcludedIds,
        getGeneratorExcludedIds,
        getGeneratorExcludedTags,
        updateExcludedCount
    };
})(globalThis);
