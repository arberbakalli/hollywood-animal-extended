(function(global) {
    "use strict";

    function setupGlobalCategorySearch() {
        // Keyboard shortcuts for search inputs
        document.addEventListener('keydown', function(e) {
            if (!e.target.classList.contains('category-search-input')) return;

            // Escape = clear search
            if (e.key === 'Escape') {
                e.target.value = '';
                e.target.classList.remove('has-matches', 'no-matches');
                e.target.blur();
                // Trigger input event to update filtered view
                e.target.dispatchEvent(new Event('input'));
            }

            // Enter = focus first matching dropdown (to select from filtered results)
            if (e.key === 'Enter') {
                e.preventDefault();
                const category = e.target.dataset.category;
                const context = e.target.dataset.context;
                const containerSelector = `#inputs-${categoryToElementSlug(category)}-${context}`;
                const container = document.querySelector(containerSelector);
                if (container) {
                    const firstVisibleSelect = container.querySelector('.select-row:not(.hidden) .tag-selector');
                    if (firstVisibleSelect) {
                        firstVisibleSelect.focus();
                        firstVisibleSelect.click();  // Open dropdown
                    }
                }
            }
        });

        // Global event delegation for all category search inputs (with debouncing for performance)
        document.addEventListener('input', function(e) {
            if (!e.target.classList.contains('category-search-input')) return;

            const inputId = e.target.dataset.category + '-' + e.target.dataset.context;

            // Clear previous timeout
            if (searchDebounceTimers.has(inputId)) {
                clearTimeout(searchDebounceTimers.get(inputId));
            }

            // Debounce: wait 300ms after user stops typing before filtering
            const debounceTimer = setTimeout(() => {
                performSearchFilter(e.target);
                searchDebounceTimers.delete(inputId);
            }, 300);

            searchDebounceTimers.set(inputId, debounceTimer);
        });
    }

    function canUseSearchResult(item, context) {
        if (!global.HACStoryElementSelector) return true;
        return global.HACStoryElementSelector.canUseTagInContext(item.id, context);
    }

    function performSearchFilter(searchInput) {
        const searchTerm = searchInput.value.toLowerCase().trim();
        const category = searchInput.dataset.category;
        const context = searchInput.dataset.context;

        const containerSelector = `#inputs-${categoryToElementSlug(category)}-${context}`;
        const container = document.querySelector(containerSelector);

        if (!container) return;

        let totalMatches = 0;  // Count visible options for feedback

        // Filter rows and options in all selects in this category
        container.querySelectorAll('.select-row').forEach(row => {
                const select = row.querySelector('.tag-selector');
                if (!select) return;

                // Get the selected option's text
                const selectedOption = select.options[select.selectedIndex];
                const selectedText = selectedOption ? selectedOption.innerText.toLowerCase() : '';

                // Show/hide the entire row based on whether selected value matches search
                if (searchTerm === '') {
                    // No search: show all rows
                    row.classList.remove('hidden');
                } else {
                    // Search active: show only if selected value matches OR if nothing is selected yet
                    const rowMatches = selectedText.includes(searchTerm) || selectedText === '-- select ' + category.toLowerCase() + ' --' || selectedText === '';
                    row.classList.toggle('hidden', !rowMatches);
                }

                // Also filter the dropdown options (for when user clicks to select)
                select.querySelectorAll('option:not(:first-child)').forEach(opt => {
                    const text = opt.innerText.toLowerCase();
                    const isAvailable = canUseSearchResult({ id: opt.value }, context);
                    const matches = isAvailable && (searchTerm === '' || text.includes(searchTerm));
                    opt.hidden = !matches;
                    if (matches && searchTerm !== '') totalMatches++;
                });
            });

        // Visual feedback: highlight search box based on matches
        if (searchTerm === '') {
            searchInput.classList.remove('has-matches', 'no-matches');
        } else if (totalMatches > 0) {
            searchInput.classList.remove('no-matches');
            searchInput.classList.add('has-matches');
        } else {
            searchInput.classList.remove('has-matches');
            searchInput.classList.add('no-matches');
        }
    }

    function buildSearchIndex() {
        searchIndex = Object.values(GAME_DATA.tags).map(tag => {
            return {
                id: tag.id,
                name: tag.name,
                category: tag.category
            };
        });
    }

    function setupSearchListeners() {
        setupSingleSearch('globalSearchAdvertisers', 'searchResultsAdvertisers', 'advertisers');
        setupSingleSearch('globalSearchSynergy', 'searchResultsSynergy', 'synergy');
        setupSingleSearch('globalSearchGraves', 'searchResultsGraves', 'graves');
    }

    function setupSingleSearch(inputId, resultId, context) {
        const input = document.getElementById(inputId);
        const resultsBox = document.getElementById(resultId);
        input.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            resultsBox.innerHTML = '';
            if (query.length < 2) {
                resultsBox.classList.add('hidden');
                return;
            }
            const matches = searchIndex.filter(item =>
                canUseSearchResult(item, context) &&
                (
                    item.name.toLowerCase().includes(query) ||
                    item.category.toLowerCase().includes(query)
                )
            );
            if (matches.length > 0) {
                resultsBox.classList.remove('hidden');
                matches.forEach(match => {
                    const div = document.createElement('div');
                    div.className = 'search-item';
                    div.id = `global-search-result-${context}-${toDomId(match.id)}`;
                    div.dataset.role = 'global-search-result';
                    div.dataset.tagId = match.id;
                    div.dataset.category = match.category;
                    div.dataset.context = context;
                    div.innerHTML = `<strong>${match.name}</strong> <small>${match.category}</small>`;
                    div.addEventListener('click', () => {
                        selectTagFromSearch(match, context);
                        input.value = '';
                        resultsBox.classList.add('hidden');
                    });
                    resultsBox.appendChild(div);
                });
            } else {
                resultsBox.classList.add('hidden');
            }
        });
        document.addEventListener('click', (e) => {
            if (e.target !== input && e.target !== resultsBox) {
                resultsBox.classList.add('hidden');
            }
        });
    }

    global.HACSearchIndex = {
        setupGlobalCategorySearch,
        performSearchFilter,
        buildSearchIndex,
        canUseSearchResult,
        setupSearchListeners,
        setupSingleSearch
    };
})(globalThis);
