/**
 * Case-insensitive substring filter for any list of items.
 *
 * Used in two places by ScriptGeneratorUI:
 *   1. Autocomplete: filter all tags while the user types to find one to ban.
 *   2. List filter: filter already-banned tags to find one to remove.
 */
export class ScriptSearch {
    constructor() {
        this._term = '';
    }

    /** Set the current filter term (trimmed, lower-cased internally). */
    setTerm(term) {
        this._term = term.trim().toLowerCase();
    }

    /**
     * Returns the subset of items whose label (from labelFn) includes the term.
     * When term is empty, all items are returned.
     *
     * @template T
     * @param {T[]}           items
     * @param {(item: T) => string} labelFn  Returns the string to match against
     * @returns {T[]}
     */
    filter(items, labelFn = item => String(item)) {
        if (!this._term) return items;
        return items.filter(item =>
            labelFn(item).toLowerCase().includes(this._term)
        );
    }

    get term() {
        return this._term;
    }

    get isActive() {
        return this._term.length > 0;
    }

    clear() {
        this._term = '';
    }
}
