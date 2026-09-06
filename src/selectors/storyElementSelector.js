(function(global) {
    "use strict";

    const SCRIPT_BUILDER_CONTEXTS = new Set([
        'generator',
        'synergy',
        'graves',
        'advertisers',
        'targeted'
    ]);

    function contextUsesGlobalExclusions(context) {
        return SCRIPT_BUILDER_CONTEXTS.has(context);
    }

    function getExcludedIdsForContext(context) {
        if (!contextUsesGlobalExclusions(context)) return null;
        return getGeneratorExcludedIds();
    }

    function isTagExcludedForContext(tagId, context) {
        return Boolean(getExcludedIdsForContext(context)?.has(tagId));
    }

    function canUseTagInContext(tagId, context) {
        return !isTagExcludedForContext(tagId, context);
    }

    function excludedTagFeedbackMessage(tagId) {
        const tagName = GAME_DATA.tags[tagId] ? GAME_DATA.tags[tagId].name : tagId;
        return `${tagName} is excluded in Script Lab. Remove it from Excluded Elements first.`;
    }

    function showExcludedTagFeedback(tagId, context) {
        showFeedbackMessage(`${context}FeedbackMessage`, excludedTagFeedbackMessage(tagId), 'accent');
    }

    function filterTagsForContext(tags, context) {
        return tags.filter(tag => tag && tag.id && canUseTagInContext(tag.id, context));
    }

    function clearExcludedSelectionsInCategory(category, context, excludedIds = getExcludedIdsForContext(context)) {
        if (!excludedIds || excludedIds.size === 0) return [];

        const categoryContainerId = `inputs-${categoryToElementSlug(category)}-${context}`;
        const categoryContainer = document.getElementById(categoryContainerId);
        if (!categoryContainer) return [];

        const clearedIds = [];
        categoryContainer.querySelectorAll('.tag-selector').forEach(select => {
            if (select.value && excludedIds.has(select.value)) {
                clearedIds.push(select.value);
                select.value = "";
            }
        });
        return clearedIds;
    }

    function restoreSelection(context, savedInputs) {
        if(!savedInputs || savedInputs.length === 0) return;
        savedInputs.forEach(input => {
            if (isTagExcludedForContext(input.id, context)) return;

            const category = input.category;
            const containerId = `inputs-${categoryToElementSlug(category)}-${context}`;
            const container = document.getElementById(containerId);
            if(!container) return;
            const selects = container.querySelectorAll('select');
            let placed = false;
            for(let sel of selects) {
                if(sel.value === "") {
                    sel.value = input.id;
                    placed = true;
                    break;
                }
            }
            if(!placed && MULTI_SELECT_CATEGORIES.includes(category)) {
                addDropdown(category, input.id, context);
                placed = true;
            }
        });
        if(savedInputs.some(i => i.category === 'Genre')) {
            updateGenreControls(context);
            const genreRows = document.querySelectorAll(`#inputs-${categoryToElementSlug('Genre')}-${context} .genre-row`);
            const genres = savedInputs.filter(i => i.category === 'Genre');
            genreRows.forEach((row, idx) => {
                if(genres[idx]) {
                    const val = Math.round(genres[idx].percent * 100);
                    row.querySelector('.percent-input').value = val;
                    row.querySelector('.percent-slider').value = val;
                    updatePercentSliderTrack(row.querySelector('.percent-slider'));
                }
            });
        }
    }

    function initializeSelectors(context) {
        const container = document.getElementById(`selectors-container-${context}`);
        container.innerHTML = '';

        // Every category the data defines, in its canonical order. MULTI_SELECT_CATEGORIES
        // only decides which ones may add extra rows — it must not decide which ones render.
        const sortedCategories = GAME_DATA.categories;

        sortedCategories.forEach(category => {
            const tagsInCategory = Object.values(GAME_DATA.tags).filter(t =>
                t.category === category
            ).sort((a, b) => a.name.localeCompare(b.name));
            if (tagsInCategory.length === 0) return;

            const groupDiv = document.createElement('div');
            groupDiv.className = 'category-group';
            const categorySlug = categoryToElementSlug(category);
            groupDiv.id = `group-${categorySlug}-${context}`;
            groupDiv.dataset.category = category;
            groupDiv.dataset.context = context;

            const header = document.createElement('div');
            header.className = 'category-header';
            const label = document.createElement('div');
            label.className = 'category-label';
            label.innerText = category;
            header.appendChild(label);

            // Add search input for large categories (>5 items) in generator/synergy/excluded contexts
            if (tagsInCategory.length > 5) {
                const searchWrapper = document.createElement('div');
                searchWrapper.className = 'category-search-wrapper';
                searchWrapper.id = `search-${categorySlug}-${context}-wrapper`;
                const searchInput = document.createElement('input');
                searchInput.type = 'text';
                searchInput.className = 'category-search-input';
                searchInput.id = `search-${categorySlug}-${context}-input`;
                searchInput.placeholder = `Search ${category}...`;
                searchInput.dataset.category = category;
                searchInput.dataset.context = context;
                searchWrapper.appendChild(searchInput);
                header.appendChild(searchWrapper);
            }

            // Excluded list is always multi-select for all categories
            if (context === 'excluded' || MULTI_SELECT_CATEGORIES.includes(category)) {
                const addBtn = document.createElement('button');
                addBtn.type = 'button';
                addBtn.className = 'add-btn';
                addBtn.id = `add-${categorySlug}-${context}-button`;
                addBtn.dataset.action = 'add-tag-row';
                addBtn.dataset.category = category;
                addBtn.dataset.context = context;
                addBtn.innerHTML = '+';
                addBtn.addEventListener('click', () => addDropdown(category, null, context));
                header.appendChild(addBtn);
            }
            groupDiv.appendChild(header);

            const inputsContainer = document.createElement('div');
            inputsContainer.className = 'inputs-container';
            inputsContainer.id = `inputs-${categorySlug}-${context}`;
            inputsContainer.dataset.category = category;
            inputsContainer.dataset.context = context;
            groupDiv.appendChild(inputsContainer);

            container.appendChild(groupDiv);
            addDropdown(category, null, context);
        });
    }

    function getSelectedTagsInCategory(category, context) {
        const selected = new Set();
        const containerSelector = `#inputs-${categoryToElementSlug(category)}-${context}`;
        const container = document.querySelector(containerSelector);
        if (!container) return selected;

        container.querySelectorAll('.tag-selector').forEach(select => {
            if (select.value) {
                selected.add(select.value);
            }
        });
        return selected;
    }

    function refreshCategoryDropdowns(category, context) {
        const categoryContainerId = `inputs-${categoryToElementSlug(category)}-${context}`;
        const categoryContainer = document.getElementById(categoryContainerId);
        if (!categoryContainer) return;

        const selects = categoryContainer.querySelectorAll('.tag-selector');

        const excludedIds = getExcludedIdsForContext(context);
        const clearedIds = clearExcludedSelectionsInCategory(category, context, excludedIds);

        // Get all currently selected values in this category
        const selectedValues = new Set();
        selects.forEach(select => {
            if (select.value) {
                selectedValues.add(select.value);
            }
        });

        // Update each dropdown: disable options that are selected elsewhere
        selects.forEach(select => {
            select.querySelectorAll('option:not(:first-child)').forEach(opt => {
                const isSelectedInThisDropdown = (opt.value === select.value);
                const isSelectedElsewhere = selectedValues.has(opt.value) && !isSelectedInThisDropdown;
                const isExcluded = Boolean(excludedIds && excludedIds.has(opt.value));

                opt.disabled = isSelectedElsewhere || isExcluded;
                opt.hidden = isExcluded;
                opt.dataset.excluded = String(isExcluded);
            });
        });

        if (clearedIds.length > 0 && category === 'Genre' && context !== 'excluded') {
            updateGenreControls(context);
        }

        return clearedIds;
    }

    /** Re-applies exclusion availability to every script-building dropdown. */
    function refreshScriptBuilderAvailability() {
        SCRIPT_BUILDER_CONTEXTS.forEach(context => {
            const cleared = MULTI_SELECT_CATEGORIES
                .flatMap(category => refreshCategoryDropdowns(category, context) || []);

            // Excluding a tag drops it from any script already using it. Saying so
            // matters: otherwise a selection the user built just disappears, which
            // reads as the app losing their work rather than obeying their ban.
            if (cleared.length === 0) return;

            const names = [...new Set(cleared)]
                .map(id => (GAME_DATA.tags[id] ? GAME_DATA.tags[id].name : id))
                .join(', ');

            showFeedbackMessage(
                `${context}FeedbackMessage`,
                `Removed from this script because they are now excluded: ${names}.`,
                'accent'
            );
        });
    }

    /** Legacy name kept for script.js wrappers and old tests. */
    function refreshLockedElementAvailability() {
        refreshScriptBuilderAvailability();
    }

    function addDropdown(category, selectedId = null, context = currentTab) {
        if (selectedId && !canUseTagInContext(selectedId, context)) {
            selectedId = null;
        }

        const categorySlug = categoryToElementSlug(category);
        const containerId = `inputs-${categorySlug}-${context}`;
        const container = document.getElementById(containerId);
        if (!container) return;

        // Logic for Single-select categories in 'synergy' or 'generator' (locked) context
        if (context !== 'excluded' && !MULTI_SELECT_CATEGORIES.includes(category) && container.children.length > 0) {
            const select = container.querySelector('select');
            if (selectedId) select.value = selectedId;
            return;
        }

        let tags = Object.values(GAME_DATA.tags).filter(t => t.category === category);

        // In Starting Tags profile for script builders (not excluded), filter to starter whitelist
        if (currentGenProfile === 'starting' && context !== 'excluded') {
            const whitelist = new Set(GAME_DATA.starterWhitelist || []);
            tags = tags.filter(t => whitelist.has(t.id));
        }

        tags = filterTagsForContext(tags, context).sort((a, b) => a.name.localeCompare(b.name));
        const row = document.createElement('div');
        row.className = 'select-row';
        // Numbered within this category+context. A shared counter made row ids shift
        // whenever any other panel added a row, so they could not be relied on.
        const usedIndices = Array.from(container.querySelectorAll('.select-row'))
            .map(existing => Number(existing.id.slice(existing.id.lastIndexOf('-') + 1)))
            .filter(Number.isFinite);
        const rowIndex = usedIndices.length ? Math.max(...usedIndices) + 1 : 1;
        row.id = `tag-selector-row-${context}-${categorySlug}-${rowIndex}`;
        row.dataset.role = 'tag-selector-row';
        row.dataset.category = category;
        row.dataset.context = context;
        if (category === 'Genre' && context !== 'excluded') row.classList.add('genre-row');

        const select = document.createElement('select');
        select.className = 'tag-selector';
        select.id = `${row.id}-select`;
        select.dataset.category = category;
        select.dataset.context = context;
        const defOpt = document.createElement('option');
        defOpt.value = "";
        defOpt.innerText = selectedId ? "-- Select --" : `-- Select ${category} --`;
        select.appendChild(defOpt);

        tags.forEach(tag => {
            const opt = document.createElement('option');
            opt.value = tag.id;
            opt.innerText = tag.name;
            opt.dataset.searchText = tag.name.toLowerCase();
            if (category === 'Genre') {
                opt.className = `genre-${tag.id.toLowerCase()}`;
            } else {
                const categorySlug = category
                    .toLowerCase()
                    .replace(/[&\s]+/g, '-')
                    .replace(/-+$/, '');
                opt.className = categorySlug;
            }
            select.appendChild(opt);
        });

        if (selectedId) select.value = selectedId;
        row.appendChild(select);

        // When selection changes, refresh all dropdowns in this category to enforce deduplication
        select.addEventListener('change', () => {
            if (select.value && isTagExcludedForContext(select.value, context)) {
                showExcludedTagFeedback(select.value, context);
                select.value = "";
            }
            refreshCategoryDropdowns(category, context);
            if (context === 'excluded') updateExcludedCount();
        });
        // Initial refresh to disable already-selected options
        setTimeout(() => refreshCategoryDropdowns(category, context), 0);

        // Add percent slider only for Genre in Synergy/Advertisers (not Excluded or simple Lock)
        if (category === 'Genre' && context !== 'excluded') {
            const percentWrapper = document.createElement('div');
            percentWrapper.className = 'genre-percent-wrapper hidden';
            percentWrapper.id = `${row.id}-genre-percent`;
            const numInput = document.createElement('input');
            numInput.type = 'number';
            numInput.className = 'percent-input';
            numInput.id = `${row.id}-percent-input`;
            numInput.min = 0;
            numInput.max = 100;
            numInput.value = 100;
            const slider = document.createElement('input');
            slider.type = 'range';
            slider.className = 'styled-slider percent-slider';
            slider.id = `${row.id}-percent-slider`;
            slider.min = 0;
            slider.max = 100;
            slider.value = 100;
            const label = document.createElement('span');
            label.id = `${row.id}-percent-unit`;
            label.innerText = '%';
            label.className = 'percent-unit';
            numInput.addEventListener('input', (e) => {
                slider.value = e.target.value;
                updatePercentSliderTrack(slider);
            });
            slider.addEventListener('input', (e) => {
                numInput.value = e.target.value;
                updatePercentSliderTrack(slider);
            });
            updatePercentSliderTrack(slider);
            percentWrapper.appendChild(slider);
            percentWrapper.appendChild(numInput);
            percentWrapper.appendChild(label);
            row.appendChild(percentWrapper);
        }

        if (context === 'excluded' || MULTI_SELECT_CATEGORIES.includes(category)) {
            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'remove-btn';
            removeBtn.id = `${row.id}-remove-button`;
            removeBtn.dataset.action = 'remove-tag-row';
            removeBtn.dataset.category = category;
            removeBtn.dataset.context = context;
            removeBtn.innerHTML = '×';
            removeBtn.addEventListener('click', () => {
                row.remove();
                if (category === 'Genre' && context !== 'excluded') updateGenreControls(context);
                if (context === 'excluded') updateExcludedCount();
            });
            row.appendChild(removeBtn);
        }
        // Add new rows to the TOP (prepend) instead of bottom
        container.insertBefore(row, container.firstChild);
        if (category === 'Genre' && context !== 'excluded') {
            updateGenreControls(context);
        }
    }

    function updateGenreControls(context) {
        const container = document.getElementById(`inputs-${categoryToElementSlug('Genre')}-${context}`);
        if (!container) return;
        const rows = container.querySelectorAll('.genre-row');
        const count = rows.length;
        const evenSplit = Math.floor(100 / count);
        rows.forEach(row => {
            const wrapper = row.querySelector('.genre-percent-wrapper');
            const input = row.querySelector('.percent-input');
            const slider = row.querySelector('.percent-slider');
            if (count > 1) {
                wrapper.classList.remove('hidden');
                if (input.value == 100 && count > 1) {
                    input.value = evenSplit;
                    slider.value = evenSplit;
                }
                updatePercentSliderTrack(slider);
            } else {
                wrapper.classList.add('hidden');
                input.value = 100;
            }
        });
    }

    function selectTagFromSearch(tagObj, context) {
        if (isTagExcludedForContext(tagObj.id, context)) {
            showExcludedTagFeedback(tagObj.id, context);
            return;
        }

        const category = tagObj.category;
        const containerId = `inputs-${categoryToElementSlug(category)}-${context}`;
        const container = document.getElementById(containerId);
        if (!container) return;
        const selects = container.querySelectorAll('select.tag-selector');
        let filled = false;
        for (let select of selects) {
            if (select.value === "") {
                select.value = tagObj.id;
                filled = true;
                break;
            }
        }
        if (!filled) {
            if (MULTI_SELECT_CATEGORIES.includes(category)) {
                addDropdown(category, tagObj.id, context);
            } else {
                if (selects.length > 0) selects[0].value = tagObj.id;
            }
        }
        const group = document.getElementById(`group-${categoryToElementSlug(category)}-${context}`);
        if (group) {
            group.classList.add('is-highlighted');
            setTimeout(() => group.classList.remove('is-highlighted'), 500);
            group.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    function addTagToSelectorContext(tagObj, context) {
        if (isTagExcludedForContext(tagObj.id, context)) {
            showExcludedTagFeedback(tagObj.id, context);
            return false;
        }

        const category = tagObj.category;
        const categorySlug = categoryToElementSlug(category);
        const container = document.getElementById(`inputs-${categorySlug}-${context}`);
        if (!container) return false;

        const selects = Array.from(container.querySelectorAll('select.tag-selector'));
        if (selects.some(select => select.value === tagObj.id)) {
            showFeedbackMessage(`${context}FeedbackMessage`, `${tagObj.name} is already in this script.`, 'accent');
            return false;
        }

        const emptySelect = selects.find(select => select.value === "");
        if (emptySelect) {
            emptySelect.value = tagObj.id;
            refreshCategoryDropdowns(category, context);
            if (category === 'Genre') updateGenreControls(context);
            return true;
        }

        if (MULTI_SELECT_CATEGORIES.includes(category)) {
            addDropdown(category, tagObj.id, context);
            refreshCategoryDropdowns(category, context);
            return true;
        }

        showFeedbackMessage(`${context}FeedbackMessage`, `${category} already has a pick. Reset or change that slot first.`, 'accent');
        return false;
    }

    function collectTagInputs(context) {
        const tagInputs = [];

        const excludedIds = getExcludedIdsForContext(context);
        if (excludedIds) {
            MULTI_SELECT_CATEGORIES.forEach(category => refreshCategoryDropdowns(category, context));
        }

        // BLOCK 1: Handling Genres (usually with percentages)
        const genreContainer = document.getElementById(`inputs-${categoryToElementSlug('Genre')}-${context}`);
        const genreRows = genreContainer ? genreContainer.querySelectorAll('.genre-row') : [];
        let totalGenreInput = 0;
        const genreData = [];
        genreRows.forEach(row => {
            const select = row.querySelector('select');
            const input = row.querySelector('.percent-input');
            if (select.value && !excludedIds?.has(select.value)) {
                let val = parseFloat(input ? input.value : 100);
                if (isNaN(val) || val < 0) val = 0;
                totalGenreInput += val;
                genreData.push({
                    id: select.value,
                    inputVal: val
                });
            }
        });
        if (totalGenreInput === 0 && genreData.length > 0) totalGenreInput = 1;
        genreData.forEach(g => {
            tagInputs.push({
                id: g.id,
                percent: g.inputVal / totalGenreInput,
                category: "Genre"
            });
        });

        // BLOCK 2: Handling Everything Else (and Genres for exclusions)
        const container = document.getElementById(`selectors-container-${context}`);
        container.querySelectorAll('.tag-selector').forEach(sel => {
            // Skip genres here if they were handled in Block 1
            if (sel.dataset.category === "Genre" && context !== 'excluded') return;

            if (sel.value && !excludedIds?.has(sel.value)) {
                tagInputs.push({
                    id: sel.value,
                    percent: 1.0,
                    category: sel.dataset.category
                });
            }
        });
        return tagInputs;
    }

    function resetSelectors(context) {
        // Reset Bans tears down the auto-populated list, so allow it to rebuild.
        if (context === 'excluded') startingProfileExcludedLoaded = false;

        initializeSelectors(context);
        clearFeedbackMessage(`${context}FeedbackMessage`);

        // If resetting Advertisers, move the calculator back to its initial position
        if (context === 'advertisers') {
            const distCard = document.getElementById('dist-wrapper');
            const anchor = document.getElementById('dist-calc-anchor');
            if(distCard && anchor) {
                anchor.appendChild(distCard);
                distCard.classList.remove('distribution-card--in-results');
            }
        }

        if (context === 'generator' || context === 'excluded') {
            document.getElementById(`results-generator`).classList.add('hidden');
        } else {
            document.getElementById(`results-${context}`).classList.add('hidden');
        }

        if (context === 'graves') {
            const bestMatchesPanel = document.getElementById('graves-best-matches-panel');
            if (bestMatchesPanel) bestMatchesPanel.classList.add('hidden');
        }
    }

    function getSelectedTags(context) {
        const container = document.getElementById(`selectors-container-${context}`);
        if (!container) return [];
        return collectTagInputs(context).map(tag => tag.id);
    }

    global.HACStoryElementSelector = {
        restoreSelection,
        initializeSelectors,
        contextUsesGlobalExclusions,
        isTagExcludedForContext,
        canUseTagInContext,
        excludedTagFeedbackMessage,
        filterTagsForContext,
        clearExcludedSelectionsInCategory,
        getSelectedTagsInCategory,
        refreshCategoryDropdowns,
        refreshScriptBuilderAvailability,
        refreshLockedElementAvailability,
        addDropdown,
        updateGenreControls,
        selectTagFromSearch,
        addTagToSelectorContext,
        collectTagInputs,
        resetSelectors,
        getSelectedTags
    };
})(globalThis);
