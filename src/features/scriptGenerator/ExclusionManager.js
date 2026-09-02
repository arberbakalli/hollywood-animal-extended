/**
 * Manages the set of banned tag IDs for the Script Generator.
 *
 * Replaces the dropdown-based exclusion list in script.js with a set-based
 * approach that prevents duplicates. A single tag can only be banned once.
 */
export class ExclusionManager {
    constructor() {
        this._excluded = new Set();
        this._onChange = null;
    }

    /** Register a callback that fires whenever the exclusion set changes. */
    setOnChange(fn) {
        this._onChange = fn;
    }

    /**
     * Adds a tag ID to the exclusion set.
     * @returns {boolean} true if the tag was added, false if already present.
     */
    add(id) {
        if (this._excluded.has(id)) return false;
        this._excluded.add(id);
        this._notify();
        return true;
    }

    /**
     * Removes a tag ID from the exclusion set.
     * @returns {boolean} true if removed, false if it wasn't present.
     */
    remove(id) {
        const removed = this._excluded.delete(id);
        if (removed) this._notify();
        return removed;
    }

    /**
     * Adds multiple IDs at once (bulk operation, fires one notification).
     * @returns {number} count of IDs actually added (duplicates skipped).
     */
    addMany(ids) {
        let added = 0;
        ids.forEach(id => {
            if (!this._excluded.has(id)) {
                this._excluded.add(id);
                added++;
            }
        });
        if (added > 0) this._notify();
        return added;
    }

    /**
     * Replaces the entire exclusion set (used by the Starting Profile).
     * Fires one notification regardless of diff size.
     */
    replaceAll(ids) {
        this._excluded.clear();
        ids.forEach(id => this._excluded.add(id));
        this._notify();
    }

    /** Removes all exclusions. */
    clear() {
        if (this._excluded.size === 0) return;
        this._excluded.clear();
        this._notify();
    }

    has(id) {
        return this._excluded.has(id);
    }

    /** Returns excluded IDs as a plain array. */
    getAll() {
        return [...this._excluded];
    }

    get size() {
        return this._excluded.size;
    }

    _notify() {
        this._onChange?.(this.getAll());
    }
}
