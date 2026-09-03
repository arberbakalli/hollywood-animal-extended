/**
 * Encapsulates the tag pool and all query/filter operations on it.
 *
 * Extracts the following functions from script.js:
 *   - getRandomTagByCategory()   → getRandomByCategory()
 *   - getCompatibleGenres()      → getCompatibleGenres()
 *   - getScoringElementCount()   → ActionManager.countScoringElements()
 *
 * Behaviour is identical to the originals; logic is unchanged.
 */
export class ActionManager {
    /**
     * @param {Record<string, object>} tags  GAME_DATA.tags after loadExternalData()
     */
    constructor(tags) {
        this._tags = tags;
    }

    /** All tags for a given category, sorted alphabetically by name. */
    getByCategory(category) {
        return Object.values(this._tags)
            .filter(t => t.category === category)
            .sort((a, b) => a.name.localeCompare(b.name));
    }

    /** Tag by ID, or null if not found. */
    getById(id) {
        return this._tags[id] ?? null;
    }

    /** All tag IDs. */
    get allIds() {
        return Object.keys(this._tags);
    }

    /**
     * Picks a random tag of the given category that is neither already selected
     * nor explicitly excluded. Returns a lightweight tag-input object, or null
     * if no candidates remain.
     *
     * Matches script.js getRandomTagByCategory() exactly.
     *
     * @param {string}  category
     * @param {Set<string>} existingIds  IDs already in the current script
     * @param {Set<string>} excludedIds  IDs the user has banned
     */
    getRandomByCategory(category, existingIds = new Set(), excludedIds = new Set()) {
        const available = this.getByCategory(category)
            .filter(t => !existingIds.has(t.id) && !excludedIds.has(t.id));

        if (available.length === 0) return null;

        const picked = available[Math.floor(Math.random() * available.length)];
        return { id: picked.id, percent: 1.0, category };
    }

    /**
     * Returns genre IDs that form a valid pair with sourceId, according to
     * the genrePairs lookup table. Excludes any IDs in excludedIds.
     *
     * Matches script.js getCompatibleGenres() exactly.
     *
     * @param {string}           sourceId
     * @param {object}           genrePairs  GAME_DATA.genrePairs
     * @param {Set<string>}      excludedIds
     */
    getCompatibleGenres(sourceId, genrePairs, excludedIds = new Set()) {
        const valid = new Set();

        if (genrePairs[sourceId]) {
            Object.keys(genrePairs[sourceId]).forEach(id => valid.add(id));
        }
        for (const gKey in genrePairs) {
            if (genrePairs[gKey]?.[sourceId]) valid.add(gKey);
        }

        return [...valid].filter(id => !excludedIds.has(id));
    }

    /**
     * Counts scoring elements (anything that is not Genre or Setting).
     *
     * Matches script.js getScoringElementCount() exactly.
     * Static because it operates on an array, not the tag pool.
     *
     * @param {{ category: string }[]} tags
     */
    static countScoringElements(tags) {
        return tags.filter(t => t.category !== 'Genre' && t.category !== 'Setting').length;
    }
}
