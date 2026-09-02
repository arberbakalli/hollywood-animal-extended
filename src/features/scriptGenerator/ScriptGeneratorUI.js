import { ScriptSearch } from './ScriptSearch.js';

/**
 * Renders the Excluded Elements section of the Script Generator tab.
 *
 * Replaces the dropdown-per-category approach in initializeSelectors('excluded')
 * with a search-to-ban interface and a deduplicated removal list.
 *
 * UX:
 *   [ Search to ban a tag...  ]  [N banned]
 *   [ Filter banned tags...   ]  (shown once > 4 are banned)
 *   ┌──────────────────────────────────────┐
 *   │ Action  Genre          [×]           │
 *   │ Cowboy  Protagonist    [×]           │
 *   └──────────────────────────────────────┘
 */
export class ScriptGeneratorUI {
    /**
     * @param {string}   containerId       Element to render the UI into
     * @param {import('./ExclusionManager.js').ExclusionManager} manager
     * @param {(id: string) => string} getTagName     Display name for a tag ID
     * @param {() => {id: string, name: string, category: string}[]} getAllTags
     */
    constructor(containerId, manager, getTagName, getAllTags) {
        this._container = document.getElementById(containerId);
        this._manager = manager;
        this._getTagName = getTagName;
        this._getAllTags = getAllTags;
        this._listFilter = new ScriptSearch();
    }

    mount() {
        if (!this._container) return;

        this._container.innerHTML = `
            <div class="excl-search-row">
                <div class="excl-search-wrap">
                    <input type="text" id="ban-search-input" class="excl-search-input"
                        placeholder="Search to ban a tag..." autocomplete="off">
                    <div id="ban-search-results" class="search-results hidden"></div>
                </div>
                <span class="excl-badge" id="excl-badge"></span>
            </div>
            <div class="excl-filter-row" id="excl-filter-row" style="display:none;">
                <input type="text" id="excl-filter-input" class="excl-filter-input"
                    placeholder="Filter banned tags...">
            </div>
            <div id="excl-list"></div>
        `;

        this._setupBanSearch();
        this._setupListFilter();
        this._manager.setOnChange(() => this.render());
        this.render();
    }

    // ── Ban-search (add to exclusions) ───────────────────────────────────────

    _setupBanSearch() {
        const input = document.getElementById('ban-search-input');
        const results = document.getElementById('ban-search-results');

        input.addEventListener('input', () => {
            const q = input.value.trim().toLowerCase();
            results.innerHTML = '';

            if (q.length < 2) { results.classList.add('hidden'); return; }

            const matches = this._getAllTags()
                .filter(t =>
                    !this._manager.has(t.id) &&
                    (t.name.toLowerCase().includes(q) || t.category.toLowerCase().includes(q))
                )
                .slice(0, 10);

            if (!matches.length) { results.classList.add('hidden'); return; }

            results.classList.remove('hidden');
            matches.forEach(tag => {
                const div = document.createElement('div');
                div.className = 'search-item';
                div.innerHTML = `<strong>${tag.name}</strong> <small>${tag.category}</small>`;
                div.onclick = () => {
                    this._manager.add(tag.id);
                    input.value = '';
                    results.classList.add('hidden');
                };
                results.appendChild(div);
            });
        });

        document.addEventListener('click', e => {
            if (e.target !== input) results.classList.add('hidden');
        });
    }

    // ── List filter (narrow already-banned tags) ──────────────────────────────

    _setupListFilter() {
        document.getElementById('excl-filter-input')
            ?.addEventListener('input', e => {
                this._listFilter.setTerm(e.target.value);
                this.render();
            });
    }

    // ── Render ────────────────────────────────────────────────────────────────

    render() {
        const all = this._manager.getAll();
        const badge = document.getElementById('excl-badge');
        const filterRow = document.getElementById('excl-filter-row');
        const list = document.getElementById('excl-list');
        if (!list) return;

        if (badge) badge.textContent = all.length ? `${all.length} banned` : '';
        if (filterRow) filterRow.style.display = all.length > 4 ? 'flex' : 'none';

        const visible = this._listFilter.filter(
            all,
            id => `${this._getTagName(id)} ${this._getCategoryLabel(id)}`
        );

        list.innerHTML = '';

        if (all.length === 0) {
            list.innerHTML = '<div class="excl-empty">No tags banned yet. Search above to add one.</div>';
            return;
        }

        if (visible.length === 0) {
            list.innerHTML = `<div class="excl-empty">No matches for &ldquo;${this._listFilter.term}&rdquo;.</div>`;
            return;
        }

        const fragment = document.createDocumentFragment();
        visible.forEach(id => {
            const row = document.createElement('div');
            row.className = 'select-row excl-row';
            row.innerHTML = `
                <span class="excl-tag-name">${this._getTagName(id)}</span>
                <small class="excl-tag-cat">${this._getCategoryLabel(id)}</small>
                <button class="remove-btn" title="Remove ban">×</button>
            `;
            row.querySelector('.remove-btn').onclick = () => this._manager.remove(id);
            fragment.appendChild(row);
        });
        list.appendChild(fragment);
    }

    _getCategoryLabel(id) {
        return this._getAllTags().find(t => t.id === id)?.category ?? '';
    }

    // ── Public helpers called from script.js ──────────────────────────────────

    /** Full reset: clear manager + filter input. */
    reset() {
        this._manager.clear();
        this._listFilter.clear();
        const fi = document.getElementById('excl-filter-input');
        if (fi) fi.value = '';
        const bi = document.getElementById('ban-search-input');
        if (bi) bi.value = '';
    }
}
