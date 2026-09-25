(function(global) {
    "use strict";


    function contextUsesGlobalExclusions(context) {
        return HACSelectorExclusions.contextUsesGlobalExclusions(context);
    }

    function getExcludedIdsForContext(context) {
        return HACSelectorExclusions.getExcludedIdsForContext(context);
    }

    function isTagExcludedForContext(tagId, context) {
        return HACSelectorExclusions.isTagExcludedForContext(tagId, context);
    }

    function canUseTagInContext(tagId, context) {
        return HACSelectorExclusions.canUseTagInContext(tagId, context);
    }

    function excludedTagFeedbackMessage(tagId) {
        return HACSelectorExclusions.excludedTagFeedbackMessage(tagId);
    }

    function showExcludedTagFeedback(tagId, context) {
        showFeedbackMessage(`${context}FeedbackMessage`, excludedTagFeedbackMessage(tagId), 'accent');
    }

    function filterTagsForContext(tags, context) {
        return HACSelectorExclusions.filterTagsForContext(tags, context);
    }

    function clearExcludedSelectionsInCategory(category, context, excludedIds = getExcludedIdsForContext(context)) {
        return HACSelectorExclusions.clearExcludedSelectionsInCategory(category, context, excludedIds);
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
            // The ban list carries no cardinality limit — a player may ban every
            // Setting in the game — so the excluded context always gets a fresh
            // row. Applying the script builder's single-select rule here silently
            // dropped every ban past the first in Setting, Protagonist,
            // Antagonist and Finale, and the observer then saved that short list
            // back over the stored one.
            if(!placed && (context === 'excluded' || MULTI_SELECT_CATEGORIES.includes(category))) {
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

            // Add search input for large categories (>5 items) in script-building contexts.
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

    // Called whenever a ban is added or lifted. Single-select categories --
    // Setting, Protagonist, Antagonist, Finale -- had no other path to a redraw,
    // so a banned Setting kept appearing in Script Lab until an unrelated
    // interaction happened to refresh it.
    function propagateExclusionChange(category) {
        HACSelectorExclusions.exclusionConsumerContexts().forEach(consumer =>
            refreshCategoryDropdowns(category, consumer));
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

        // When an exclusion is removed, un-excluded tags may not exist in the options
        // (they were filtered out when the dropdown was created). Add them back if they're now usable.
        const allCategoryTags = Object.values(GAME_DATA.tags)
            .filter(t => t.category === category)
            .sort((a, b) => a.name.localeCompare(b.name));

        selects.forEach(select => {
            const existingIds = new Set(Array.from(select.querySelectorAll('option:not(:first-child)')).map(opt => opt.value));

            // Add options for any usable tags that are missing
            allCategoryTags.forEach(tag => {
                if (!existingIds.has(tag.id) && canUseTagInContext(tag.id, context)) {
                    const opt = document.createElement('option');
                    opt.value = tag.id;
                    opt.innerText = tag.name;
                    opt.dataset.searchText = tag.name.toLowerCase();
                    select.appendChild(opt);
                }
            });
        });

        // Update each dropdown: disable options that are selected elsewhere or excluded
        selects.forEach(select => {
            select.querySelectorAll('option:not(:first-child)').forEach(opt => {
                const isSelectedInThisDropdown = (opt.value === select.value);
                const isSelectedElsewhere = selectedValues.has(opt.value) && !isSelectedInThisDropdown;
                const isExcluded = Boolean(excludedIds && excludedIds.has(opt.value));

                opt.disabled = isSelectedElsewhere || isExcluded;
                opt.hidden = isExcluded;
                opt.dataset.selectedElsewhere = String(isSelectedElsewhere);
                opt.dataset.excluded = String(isExcluded);
            });
        });

        if (clearedIds.length > 0 && category === 'Genre' && context !== 'excluded') {
            updateGenreControls(context);
        }

        return clearedIds;
    }

    function selectedTagsForVisualHints(context) {
        const container = document.getElementById(`selectors-container-${context}`);
        if (!container) return [];

        return Array.from(container.querySelectorAll('select.tag-selector'))
            .filter(select => select.value)
            .map(select => {
                const known = GAME_DATA.tags[select.value];
                return known || {
                    id: select.value,
                    name: select.value,
                    category: select.dataset.category
                };
            });
    }

    function markSelectorVisualHints(context) {
        const container = document.getElementById(`selectors-container-${context}`);
        if (!container) return;

        const selectedTags = selectedTagsForVisualHints(context);
        const canScore = selectedTags.length > 0 &&
            typeof HACCompatibilityEngine?.getRawCompatibilityScore === 'function';

        container.querySelectorAll('.select-row').forEach(row => {
            const select = row.querySelector('select.tag-selector');
            if (!select) return;

            const hasSelection = Boolean(select.value);
            row.classList.toggle('has-selected-tag', hasSelection);
            select.classList.toggle('has-selected-tag', hasSelection);

            select.querySelectorAll('option').forEach(option => {
                option.classList.remove('strong-fit-option');
                delete option.dataset.synergy;

                if (!canScore || !option.value || option.value === select.value) return;

                const optionTag = GAME_DATA.tags[option.value];
                if (!optionTag) return;

                const isStrongFit = selectedTags.some(selectedTag =>
                    selectedTag.id !== optionTag.id &&
                    HACCompatibilityEngine.getRawCompatibilityScore(optionTag, selectedTag, GAME_DATA) >= 4
                );

                if (isStrongFit) {
                    option.dataset.synergy = 'high';
                    option.classList.add('strong-fit-option');
                }
            });
        });
    }

    function refreshSelectorVisualHints(context) {
        markSelectorVisualHints(context);
    }

    /**
     * Every category the selectors can render, taken from the data rather than
     * a second hand-kept list. This used to iterate MULTI_SELECT_CATEGORIES,
     * which silently skipped Setting, Protagonist, Antagonist and Finale: a ban
     * lifted on a Setting left the old list in place until some unrelated click
     * happened to redraw that one category.
     */
    function allSelectorCategories() {
        return [...new Set(Object.values(GAME_DATA.tags || {}).map(tag => tag.category))];
    }

    /** Re-applies exclusion availability to every script-building dropdown. */
    function refreshScriptBuilderAvailability() {
        HACSelectorExclusions.scriptBuilderContexts().forEach(context => {
            const cleared = allSelectorCategories()
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

        // Logic for single-select categories in script-building contexts.
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
                opt.className = `genre-${toDomId(tag.id)}`;
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

        // Set genre color immediately if this is a genre select with a value
        const genreColorMap = {
            'action': '#804830',
            'adventure': '#486030',
            'comedy': '#305860',
            'detective': '#583050',
            'drama': '#303860',
            'historical': '#906038',
            'horror': '#604038',
            'romance': '#508058',
            'science-fiction': '#404860',
            'slapstick-comedy': '#485030',
            'thriller': '#784030'
        };

        function updateGenreColor() {
            if (category === 'Genre') {
                if (select.value) {
                    const selectedTag = GAME_DATA.tags[select.value];
                    if (selectedTag && selectedTag.id) {
                        const genreId = HACDomIds.toDomId(selectedTag.id);
                        const genreColor = genreColorMap[genreId];
                        if (genreColor) {
                            select.style.setProperty('color', genreColor, 'important');
                        }
                    }
                } else {
                    // Clear color when no selection
                    select.style.removeProperty('color');
                }
            }
        }
        updateGenreColor();

        // When selection changes, refresh all dropdowns in this category to enforce deduplication
        select.addEventListener('change', () => {
            if (select.value && isTagExcludedForContext(select.value, context)) {
                showExcludedTagFeedback(select.value, context);
                select.value = "";
            }
            refreshCategoryDropdowns(category, context);
            refreshSelectorVisualHints(context);
            updateGenreColor();

            if (context === 'excluded') {
                updateExcludedCount();
                propagateExclusionChange(category);
            }
        });
        // Initial refresh to disable already-selected options
        setTimeout(() => {
            refreshCategoryDropdowns(category, context);
            refreshSelectorVisualHints(context);
        }, 0);

        // Add percent slider only for Genre in script builders (not Excluded).
        if (category === 'Genre' && context !== 'excluded') {
            const percentWrapper = document.createElement('div');
            percentWrapper.className = 'genre-percent-wrapper hidden';
            percentWrapper.id = `${row.id}-genre-percent`;
            const numInput = document.createElement('input');
            numInput.type = 'number';
            numInput.className = 'percent-input';
            numInput.id = `${row.id}-percent-input`;
            numInput.min = HACGenreMix.GENRE_PERCENT_MIN;
            numInput.max = 100;
            numInput.step = HACGenreMix.GENRE_PERCENT_STEP;
            numInput.value = 100;
            const slider = document.createElement('input');
            slider.type = 'range';
            slider.className = 'styled-slider percent-slider';
            slider.id = `${row.id}-percent-slider`;
            slider.min = HACGenreMix.GENRE_PERCENT_MIN;
            slider.max = 100;
            slider.step = HACGenreMix.GENRE_PERCENT_STEP;
            slider.value = 100;
            const label = document.createElement('span');
            label.id = `${row.id}-percent-unit`;
            label.innerText = '%';
            label.className = 'percent-unit';
            // 'change' rather than 'input' on the number field, so rebalancing
            // does not fire on every keystroke while a two-digit value is typed.
            numInput.addEventListener('change', (e) => {
                HACGenreMix.applyGenrePercent(context, row, parseFloat(e.target.value));
            });
            slider.addEventListener('input', (e) => {
                HACGenreMix.applyGenrePercent(context, row, parseFloat(e.target.value));
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
                refreshCategoryDropdowns(category, context);
                refreshSelectorVisualHints(context);
                if (category === 'Genre' && context !== 'excluded') updateGenreControls(context);
                if (context === 'excluded') {
                    updateExcludedCount();
                    propagateExclusionChange(category);
                }
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
        HACGenreMix.updateGenreControls(context);
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
        refreshCategoryDropdowns(category, context);
        refreshSelectorVisualHints(context);
        if (category === 'Genre') updateGenreControls(context);
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
            refreshSelectorVisualHints(context);
            if (category === 'Genre') updateGenreControls(context);
            return true;
        }

        if (MULTI_SELECT_CATEGORIES.includes(category)) {
            addDropdown(category, tagObj.id, context);
            refreshCategoryDropdowns(category, context);
            refreshSelectorVisualHints(context);
            return true;
        }

        showFeedbackMessage(`${context}FeedbackMessage`, `${category} already has a pick. Reset or change that slot first.`, 'accent');
        return false;
    }

    function collectTagInputs(context) {
        const tagInputs = [];

        const excludedIds = getExcludedIdsForContext(context);
        if (excludedIds) {
            GAME_DATA.categories.forEach(category => refreshCategoryDropdowns(category, context));
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

        // Resetting the bans only rebuilds the excluded list's own dropdowns.
        // Without this the script builders keep hiding tags that are no longer
        // banned, until an unrelated interaction redraws one category.
        if (context === 'excluded') refreshScriptBuilderAvailability();

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
            document.getElementById(`results-generator`)?.classList.add('hidden');
        } else if (context !== 'targeted') {
            document.getElementById(`results-${context}`)?.classList.add('hidden');
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
        markSelectorVisualHints,
        refreshSelectorVisualHints,
        propagateExclusionChange,
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
