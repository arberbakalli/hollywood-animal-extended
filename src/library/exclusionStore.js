(function(global) {
    "use strict";

    // The exclusion list is the pool every generator draws from, so rebuilding it
    // by hand each session is the most expensive thing the app asks of a player.
    // Persist it per browser; bump the version suffix if the stored shape changes.
    const STORAGE_KEY = 'hac.excludedTags.v1';

    function storage() {
        // Private windows, blocked site data and file origins can make this throw
        // on access rather than return null, so it is guarded at the edge.
        try {
            return global.localStorage || null;
        } catch (error) {
            return null;
        }
    }

    // Stored entries are trimmed to the two fields restoreSelection needs.
    function serializeExclusions(tags) {
        return tags
            .filter(tag => tag && tag.id && tag.category)
            .map(tag => ({ id: tag.id, category: tag.category }));
    }

    function parseStoredExclusions(raw, knownTags) {
        let parsed;
        try {
            parsed = JSON.parse(raw);
        } catch (error) {
            return [];
        }

        if (!Array.isArray(parsed)) return [];

        return parsed.filter(entry =>
            entry &&
            typeof entry.id === 'string' &&
            typeof entry.category === 'string' &&
            (!knownTags || Object.prototype.hasOwnProperty.call(knownTags, entry.id))
        );
    }

    function saveExclusions() {
        const store = storage();
        if (!store) return false;

        try {
            store.setItem(STORAGE_KEY, JSON.stringify(serializeExclusions(collectTagInputs('excluded'))));
            return true;
        } catch (error) {
            return false;
        }
    }

    function loadExclusions() {
        const store = storage();
        if (!store) return [];

        try {
            const raw = store.getItem(STORAGE_KEY);
            return raw ? parseStoredExclusions(raw, GAME_DATA.tags) : [];
        } catch (error) {
            return [];
        }
    }

    function clearStoredExclusions() {
        const store = storage();
        if (!store) return;
        try {
            store.removeItem(STORAGE_KEY);
        } catch (error) {
            // Nothing to do; the list simply stays for this session.
        }
    }

    function restoreStoredExclusions() {
        const saved = loadExclusions();
        if (saved.length === 0) return 0;

        restoreSelection('excluded', saved);
        updateExcludedCount();
        return saved.length;
    }

    // One save per turn of the event loop: the Starting Tags profile inserts ~194
    // rows in a single pass and each would otherwise serialise the whole list.
    let pendingSave = null;
    function scheduleSave() {
        if (pendingSave !== null) return;
        pendingSave = setTimeout(() => {
            pendingSave = null;
            saveExclusions();
        }, 0);
    }

    // MUST run after setGeneratorProfile(), which rebuilds the excluded selectors
    // from scratch and would wipe anything restored before it — and the rebuild's
    // own mutations would then save that empty list back over the stored one.
    function setupExclusionPersistence() {
        const container = document.getElementById('selectors-container-excluded');
        if (!container) return;

        restoreStoredExclusions();

        container.addEventListener('change', scheduleSave);
        new MutationObserver(scheduleSave).observe(container, { childList: true, subtree: true });
    }

    global.HACExclusionStore = {
        STORAGE_KEY,
        serializeExclusions,
        parseStoredExclusions,
        saveExclusions,
        loadExclusions,
        clearStoredExclusions,
        restoreStoredExclusions,
        setupExclusionPersistence
    };
})(globalThis);
