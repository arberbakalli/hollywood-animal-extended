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
            const selector = (typeof window !== 'undefined' ? window : global).HACStoryElementSelector;
            if (!selector || typeof selector.collectTagInputs !== 'function') {
                return false;
            }
            const tags = selector.collectTagInputs('excluded');
            const serialized = serializeExclusions(tags);
            store.setItem(STORAGE_KEY, JSON.stringify(serialized));
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

    // Starting Tags seed the ban list once, on a player's genuine first run.
    // The marker is deliberately NOT "is the stored list empty": a player who
    // resets every ban has an empty list on purpose and must not have the 194
    // starter bans pushed back over it on their next visit.
    const SEEDED_KEY = 'hac.startingTagsSeeded.v1';

    function hasSeededStartingTags() {
        const store = storage();
        if (!store) return true; // No storage means no way to remember; do not seed.
        try {
            return store.getItem(SEEDED_KEY) === 'true';
        } catch (error) {
            return true;
        }
    }

    function markStartingTagsSeeded() {
        const store = storage();
        if (!store) return;
        try {
            store.setItem(SEEDED_KEY, 'true');
        } catch (error) {
            // Seeding simply repeats next time; better than failing the boot.
        }
    }

    function restoreStoredExclusions() {
        const saved = loadExclusions();
        if (saved.length === 0) return 0;

        const selector = (typeof window !== 'undefined' ? window : global).HACStoryElementSelector;
        if (selector && typeof selector.restoreSelection === 'function') {
            selector.restoreSelection('excluded', saved);
        }
        if (typeof updateExcludedCount === 'function') {
            updateExcludedCount();
        }
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
            if (typeof updateExcludedCount === 'function') {
                updateExcludedCount();
            }
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
        SEEDED_KEY,
        hasSeededStartingTags,
        markStartingTagsSeeded,
        serializeExclusions,
        parseStoredExclusions,
        saveExclusions,
        loadExclusions,
        clearStoredExclusions,
        restoreStoredExclusions,
        setupExclusionPersistence
    };
})(globalThis);
