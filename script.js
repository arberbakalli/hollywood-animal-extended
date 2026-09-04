const MULTI_SELECT_CATEGORIES = ["Genre", "Supporting Character", "Theme & Event"];
let searchIndex = [];
let currentTab = 'synergy'; 
let generatedScriptsCache = []; // Stores the current batch of 5 scripts
let pinnedScripts = []; // Stores saved scripts

// --- LOCALIZATION VARIABLES ---
let localizationMap = {}; // Stores ID -> "Clean Name"
let currentLanguage = 'English';

// --- NEW: PROFILE STATE ---
let currentGenProfile = 'custom'; // 'custom' or 'starting'
let startingProfileExcludedLoaded = false; // Lazy loading flag
let tagSelectRowCounter = 0;

// --- PERFORMANCE: Deferred data loading ---
let compatibilityLoaded = false;
let genrePairsLoaded = false;

window.addEventListener('load', async function initializeApp() {
    try {
        await changeLanguage('English', false);
        await loadExternalData();
        initializeSelectors('advertisers');
        initializeSelectors('synergy');
        initializeSelectors('graves');

        // Init generator tab selectors (Locked and Excluded)
        initializeSelectors('generator');
        initializeSelectors('excluded');

        // Setup global search filtering (once, for all contexts)
        setupGlobalCategorySearch();
        setupDomEventBindings();

        buildSearchIndex();
        setupSearchListeners();
        setupScoreSync();
        setupGeneratorControls();

        // Setup Distribution Calculator (Immediate Interaction)
        setupDistributionLogic();

        // Initialize Collapsible Sections
        setupCollapsibleSections();

        // Initialize Default Profile
        setGeneratorProfile('custom');

        // RENDER PINNED SECTION IMMEDIATELY (To show Save/Load buttons)
        renderPinnedScripts();

        window.dispatchEvent(new CustomEvent('hollywood:ready'));
        console.log("Initialization Complete.");
    } catch (error) {
        console.error("Failed to load data:", error);
    }
}, { once: true });

/* =========================================================================
   PROFILE MANAGEMENT
   ========================================================================= */

function setGeneratorProfile(profileName) {
    currentGenProfile = profileName;

    // 1. Update Buttons Visual State
    document.getElementById('btn-profile-custom').classList.remove('active');
    document.getElementById('btn-profile-starting').classList.remove('active');
    document.getElementById(`btn-profile-${profileName}`).classList.add('active');

    // 2. Update Description Text
    const descText = document.getElementById('profile-desc-text');
    if (profileName === 'starting') {
        descText.innerHTML = "Only <strong class=\"text-accent\">Starting Tags</strong> are available. Everything else is moved to Excluded.";
    } else {
        descText.innerHTML = "All tags are available. You can manually exclude tags below.";
    }

    // 3. Handle Exclusion Logic
    if (profileName === 'starting') {
        populateExcludedForStartingProfile();
    } else {
        // Custom: Reset exclusions. Clear the lazy-load flag too, otherwise
        // switching back to Starting Tags would find it already "loaded".
        startingProfileExcludedLoaded = false;
        initializeSelectors('excluded');
    }
}

function populateExcludedForStartingProfile() {
    // Lazy loading: Only populate excluded elements once to prevent UI freeze
    if (startingProfileExcludedLoaded) return;

    const buildExcludedList = () => {
        initializeSelectors('excluded');
        const whitelist = new Set(GAME_DATA.starterWhitelist || []);
        const allTags = Object.values(GAME_DATA.tags);
        const container = document.getElementById('selectors-container-excluded');

        container.classList.add('is-batching');
        allTags.forEach(tag => {
            if (!whitelist.has(tag.id)) {
                addDropdown(tag.category, tag.id, 'excluded');
            }
        });
        container.classList.remove('is-batching');
        startingProfileExcludedLoaded = true;
    };

    // Defer the heavy DOM work off the click handler so the button repaints
    // immediately and INP stays low. Deliberately setTimeout, not
    // requestIdleCallback: Chrome suspends idle callbacks in hidden tabs and
    // ignores their timeout there, so clicking Starting Tags and switching tabs
    // would leave the exclusion list silently empty.
    setTimeout(buildExcludedList, 0);
}

function getProfileExcludedIds() {
    if (currentGenProfile !== 'starting') return new Set();

    const whitelist = new Set(GAME_DATA.starterWhitelist || []);
    return new Set(
        Object.values(GAME_DATA.tags)
            .filter(tag => !whitelist.has(tag.id))
            .map(tag => tag.id)
    );
}

function getGeneratorExcludedTags(manualExcludedTags = collectTagInputs('excluded')) {
    const excludedIds = new Set(manualExcludedTags.map(tag => tag.id));
    getProfileExcludedIds().forEach(id => excludedIds.add(id));

    return [...excludedIds].map(id => ({ id }));
}

/* =========================================================================
   EXISTING LOGIC
   ========================================================================= */

async function changeLanguage(langName, shouldRender = true) {
    currentLanguage = langName;
    const fileName = `localization/${langName}.json`;
    try {
        const res = await fetch(fileName);
        if (!res.ok) throw new Error(`Could not load ${fileName}`);
        const locData = await res.json();
        localizationMap = {};
        if (locData.IdMap && locData.locStrings) {
            for (const [tagId, index] of Object.entries(locData.IdMap)) {
                if (locData.locStrings[index]) {
                    localizationMap[tagId] = locData.locStrings[index];
                }
            }
        }
        if (Object.keys(GAME_DATA.tags).length > 0) {
            updateAllTagNames();
            buildSearchIndex();
            if (shouldRender) {
                const savedSynergy = collectTagInputs('synergy');
                const savedAdvertisers = collectTagInputs('advertisers');
                const savedGenerator = collectTagInputs('generator');
                const savedExcluded = collectTagInputs('excluded');

                initializeSelectors('synergy');
                initializeSelectors('advertisers');
                initializeSelectors('generator');
                initializeSelectors('excluded');

                restoreSelection('synergy', savedSynergy);
                restoreSelection('advertisers', savedAdvertisers);
                restoreSelection('generator', savedGenerator);
                restoreSelection('excluded', savedExcluded);

                if(currentGenProfile === 'starting') {
                    populateExcludedForStartingProfile();
                }
            }
        }
    } catch (e) {
        console.error("Localization Error:", e);
    }
}

function updateAllTagNames() {
    for (const tagId in GAME_DATA.tags) {
        GAME_DATA.tags[tagId].name = beautifyTagName(tagId);
    }
}

function toDomId(value) {
    return String(value)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'item';
}

function categoryToElementSlug(category) {
    return toDomId(category);
}

function restoreSelection(context, savedInputs) {
    if(!savedInputs || savedInputs.length === 0) return;
    savedInputs.forEach(input => {
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

function switchTab(tabName) {
    currentTab = tabName;
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    const activeButton = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
    if (activeButton) activeButton.classList.add('active');
    
    document.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));
    document.getElementById(`tab-${tabName}`).classList.remove('hidden');
}

function setupDomEventBindings() {
    const languageSelector = document.getElementById('languageSelector');
    if (languageSelector) {
        languageSelector.addEventListener('change', e => changeLanguage(e.target.value));
    }

    document.querySelectorAll('.tab-btn[data-tab]').forEach(button => {
        button.addEventListener('click', () => switchTab(button.dataset.tab));
    });

    document.querySelectorAll('[data-generator-profile]').forEach(button => {
        button.addEventListener('click', () => setGeneratorProfile(button.dataset.generatorProfile));
    });

    document.querySelectorAll('[data-reset-context]').forEach(button => {
        button.addEventListener('click', () => resetSelectors(button.dataset.resetContext));
    });

    const clickBindings = [
        ['generateScriptsButton', generateScripts],
        ['savePinnedScriptsButton', savePinnedScripts],
        ['loadPinnedScriptsButton', triggerLoadScripts],
        ['calculateSynergyButton', calculateSynergy],
        ['evaluateGravesButton', evaluateColmanGravesScript],
        ['transferTagsButton', transferTagsToAdvertisers],
        ['analyzeMovieButton', analyzeMovie],
    ];

    clickBindings.forEach(([id, handler]) => {
        const element = document.getElementById(id);
        if (element) element.addEventListener('click', handler);
    });

    const loadScriptsInput = document.getElementById('loadScriptsInput');
    if (loadScriptsInput) {
        loadScriptsInput.addEventListener('change', e => handleFileLoad(e.target));
    }
}

function setupScoreSync() {
    // Existing Advertiser Tab Sync
    const pairs = [
        { slider: 'comScoreSlider', input: 'comScoreInput' },
        { slider: 'artScoreSlider', input: 'artScoreInput' }
    ];
    pairs.forEach(pair => {
        const slider = document.getElementById(pair.slider);
        const input = document.getElementById(pair.input);
        slider.addEventListener('input', (e) => {
            input.value = e.target.value;
            updateSliderTrack(slider);
        });
        input.addEventListener('input', (e) => {
            let val = parseFloat(e.target.value);
            if (val > 10) val = 10;
            if (val < 0) val = 0;
            if (!isNaN(val)) {
                slider.value = val;
                updateSliderTrack(slider);
            }
        });
        updateSliderTrack(slider);
    });
}

/**
 * Single source of truth: how many scoring elements (excluding Genre and Setting)
 * a given target Movie Score needs. Read by both the generator and the help text
 * above the slider, so the UI cannot promise a count the generator won't use.
 */
function getRequiredElementCount(targetScore) {
    if (targetScore >= 9) return 9;
    if (targetScore === 8) return 8;  // reaches cap 8
    if (targetScore === 7) return 7;  // reaches cap 8 (safe)
    if (targetScore === 6) return 5;  // reaches cap 6
    return 4;                         // below the slider minimum
}

function setupGeneratorControls() {
    // Generator Tab Sliders + Inputs
    const genCompSlider = document.getElementById('genCompSlider');
    const genCompInput = document.getElementById('genCompInput');
    
    genCompSlider.addEventListener('input', (e) => {
        genCompInput.value = parseFloat(e.target.value).toFixed(1);
        updateSliderTrack(genCompSlider, '#4cd964');
    });
    genCompInput.addEventListener('input', (e) => {
        let val = parseFloat(e.target.value);
        if (val > 5) val = 5;
        if (val < 1) val = 1;
        if (!isNaN(val)) {
            genCompSlider.value = val;
            updateSliderTrack(genCompSlider, '#4cd964');
        }
    });
    updateSliderTrack(genCompSlider, '#4cd964');

    const genScoreSlider = document.getElementById('genScoreSlider');
    const genScoreInput = document.getElementById('genScoreInput');
    const requiredTagsDisplay = document.getElementById('genTagsRequiredDisplay');

    function updateScoreDisplay(val) {
        // Update Help Text for Tag Count
        const requiredTags = getRequiredElementCount(val);

        requiredTagsDisplay.innerText = `Requires ~${requiredTags} Story Elements (excluding Genre & Setting).`;
        updateSliderTrack(genScoreSlider, '#d4af37');
    }

    genScoreSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        genScoreInput.value = val;
        updateScoreDisplay(val);
    });
    genScoreInput.addEventListener('input', (e) => {
        let val = parseInt(e.target.value);
        if(val > 10) val = 10;
        if(val < 6) val = 6;
        if(!isNaN(val)) {
            genScoreSlider.value = val;
            updateScoreDisplay(val);
        }
    });
    // Render the help text once on load, otherwise the placeholder markup in
    // index.html stands until the user first touches the slider.
    updateScoreDisplay(parseInt(genScoreInput.value));
}

function updateSliderTrack(slider, colorOverride = null) {
    const value = (slider.value - slider.min) / (slider.max - slider.min) * 100;
    const isArt = slider.classList.contains('art-slider');
    // Default logic
    let color = isArt ? '#a0a0ff' : '#d4af37'; 
    if (colorOverride) color = colorOverride;
    
    slider.style.setProperty('--slider-fill-color', color);
    slider.style.setProperty('--slider-fill-percent', `${value}%`);
}

function updatePercentSliderTrack(slider) {
    const value = slider.value;
    const color = '#d4af37';
    slider.style.setProperty('--slider-fill-color', color);
    slider.style.setProperty('--slider-fill-percent', `${value}%`);
}

async function loadExternalData() {
    try {
        // Load only essential data at startup; defer compatibility (2.5MB) and genrePairs
        const [tagRes, weightRes] = await Promise.all([
            fetch('data/TagData.json'),
            fetch('data/TagsAudienceWeights.json')
        ]);
        if (!tagRes.ok || !weightRes.ok) return;
        const tagDataRaw = await tagRes.json();
        const weightDataRaw = await weightRes.json();
        for (const [tagId, data] of Object.entries(tagDataRaw)) {
            if (!weightDataRaw[tagId]) continue;
            let category = "Unknown";
            if (data.type === 0) category = "Genre";
            else if (data.type === 1) category = "Setting";
            else if (data.CategoryID) {
                switch (data.CategoryID) {
                    case "Protagonist": category = "Protagonist"; break;
                    case "Antagonist": category = "Antagonist"; break;
                    case "SupportingCharacter": category = "Supporting Character"; break;
                    case "Theme": category = "Theme & Event"; break;
                    case "Finale": category = "Finale"; break;
                    default: category = data.CategoryID;
                }
            } 
            if (tagId.startsWith("EVENTS_")) category = "Theme & Event";
            GAME_DATA.tags[tagId] = {
                id: tagId,
                name: beautifyTagName(tagId),
                category: category,
                art: parseFloat(data.artValue || 0),
                com: parseFloat(data.commercialValue || 0),
                weights: parseWeights(weightDataRaw[tagId].weights)
            };
        }
    } catch(e) {
        console.warn("External JSON load failed, relying on data.js default", e);
    }
}

// Deferred loading: Load compatibility data only when needed (Script Generator, Graves, Synergy)
async function ensureCompatibilityLoaded() {
    if (compatibilityLoaded) return;
    try {
        const res = await fetch('data/TagCompatibilityData.json');
        if (res.ok) GAME_DATA.compatibility = await res.json();
        compatibilityLoaded = true;
    } catch (e) {
        console.warn("Failed to load compatibility data", e);
    }
}

// Deferred loading: Load genre pairs only when needed (Best Advertisers)
async function ensureGenrePairsLoaded() {
    if (genrePairsLoaded) return;
    try {
        const res = await fetch('data/GenrePairs.json');
        if (res.ok) GAME_DATA.genrePairs = await res.json();
        genrePairsLoaded = true;
    } catch (e) {
        console.warn("Failed to load genre pairs", e);
    }
}

function parseWeights(weightObj) {
    let clean = {};
    for (let key in weightObj) {
        clean[key] = parseFloat(weightObj[key]);
    }
    return clean;
}

function beautifyTagName(rawId) {
    if (localizationMap[rawId]) {
        return localizationMap[rawId];
    }
    let name = rawId;
    const prefixes = ["PROTAGONIST_", "ANTAGONIST_", "SUPPORTINGCHARACTER_", "THEME_", "EVENTS_", "FINALE_", "EVENT_"];
    prefixes.forEach(p => {
        if (name.startsWith(p)) name = name.substring(p.length);
    });
    return name.replace(/_/g, ' ')
               .toLowerCase()
               .split(' ')
               .map(word => word.charAt(0).toUpperCase() + word.slice(1))
               .join(' ');
}

function initializeSelectors(context) {
    const container = document.getElementById(`selectors-container-${context}`);
    container.innerHTML = '';

    // Sort categories alphabetically for consistent display
    const sortedCategories = [...GAME_DATA.categories].sort((a, b) => a.localeCompare(b));

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

/**
 * Get all currently selected tag IDs in a category for a given context
 * @param {string} category - Category name
 * @param {string} context - Context ('generator', 'synergy', 'excluded')
 * @returns {Set<string>} Set of selected tag IDs in this category
 */
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

/**
 * Refresh all dropdowns in a category to enforce deduplication
 * Disables already-selected options so they can't be picked again
 */
function refreshCategoryDropdowns(category, context) {
    const categoryContainerId = `inputs-${categoryToElementSlug(category)}-${context}`;
    const categoryContainer = document.getElementById(categoryContainerId);
    if (!categoryContainer) return;

    const selects = categoryContainer.querySelectorAll('.tag-selector');

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

            // Disable if selected in another dropdown, enable otherwise
            opt.disabled = isSelectedElsewhere;
        });
    });
}

// Debounce timer for search performance
const searchDebounceTimers = new Map();

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
                const matches = searchTerm === '' || text.includes(searchTerm);
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

function addDropdown(category, selectedId = null, context = currentTab) {
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

    const tags = Object.values(GAME_DATA.tags).filter(t => t.category === category)
                 .sort((a, b) => a.name.localeCompare(b.name));
    const row = document.createElement('div');
    row.className = 'select-row';
    row.id = `tag-selector-row-${context}-${categorySlug}-${++tagSelectRowCounter}`;
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
        select.appendChild(opt);
    });

    if (selectedId) select.value = selectedId;
    row.appendChild(select);

    // When selection changes, refresh all dropdowns in this category to enforce deduplication
    if (context === 'generator' || context === 'synergy' || context === 'excluded') {
        select.addEventListener('change', () => {
            refreshCategoryDropdowns(category, context);
        });
        // Initial refresh to disable already-selected options
        setTimeout(() => refreshCategoryDropdowns(category, context), 0);
    }

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
        removeBtn.className = 'remove-btn';
        removeBtn.id = `${row.id}-remove-button`;
        removeBtn.dataset.action = 'remove-tag-row';
        removeBtn.dataset.category = category;
        removeBtn.dataset.context = context;
        removeBtn.innerHTML = '×';
        removeBtn.addEventListener('click', () => {
            row.remove();
            if (category === 'Genre' && context !== 'excluded') updateGenreControls(context);
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
            item.name.toLowerCase().includes(query) || 
            item.category.toLowerCase().includes(query)
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

function selectTagFromSearch(tagObj, context) {
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

function collectTagInputs(context) {
    const tagInputs = []; 
    
    // BLOCK 1: Handling Genres (usually with percentages)
    const genreContainer = document.getElementById(`inputs-${categoryToElementSlug('Genre')}-${context}`);
    const genreRows = genreContainer ? genreContainer.querySelectorAll('.genre-row') : [];
    let totalGenreInput = 0;
    const genreData = [];
    genreRows.forEach(row => {
        const select = row.querySelector('select');
        const input = row.querySelector('.percent-input');
        if (select.value) {
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

        if (sel.value) {
            tagInputs.push({
                id: sel.value,
                percent: 1.0, 
                category: sel.dataset.category
            });
        }
    });
    return tagInputs;
}

function showFeedbackMessage(elementId, message, tone = 'danger') {
    const element = document.getElementById(elementId);
    if (!element) return;

    element.textContent = message;
    element.className = `app-feedback app-feedback-${tone}`;
    element.classList.remove('hidden');
}

function clearFeedbackMessage(elementId) {
    const element = document.getElementById(elementId);
    if (!element) return;

    element.textContent = '';
    element.classList.add('hidden');
}

/* =========================================================================
   SCRIPT GENERATOR LOGIC
   ========================================================================= */

async function generateScripts() {
    await ensureCompatibilityLoaded();
    clearFeedbackMessage('generatorFeedbackMessage');

    const targetComp = parseFloat(document.getElementById('genCompInput').value);
    const targetScoreInput = parseInt(document.getElementById('genScoreInput').value);
    
    // Map Movie Score to Required Scoring Elements (Excluding Genre AND Setting)
    const targetCount = getRequiredElementCount(targetScoreInput);

    // Get Fixed Tags
    const fixedTags = collectTagInputs('generator');
    const excludedTags = getGeneratorExcludedTags();
    
    // Validate
    const scoringFixed = fixedTags.filter(t => t.category !== "Genre" && t.category !== "Setting");
    
    if (scoringFixed.length > targetCount) {
        showFeedbackMessage(
            'generatorFeedbackMessage',
            `You locked ${scoringFixed.length} scoring elements, but this Movie Score allows about ${targetCount}. Raise the score target or remove locked elements.`
        );
        return;
    }

    const excludedIds = new Set(excludedTags.map(t => t.id));
    const unavailableFixed = fixedTags.filter(t => excludedIds.has(t.id));
    if (unavailableFixed.length > 0) {
        const unavailableNames = unavailableFixed
            .map(t => (GAME_DATA.tags[t.id] ? GAME_DATA.tags[t.id].name : t.id))
            .join(', ');
        showFeedbackMessage(
            'generatorFeedbackMessage',
            `Locked elements are unavailable or excluded: ${unavailableNames}. Remove them from locked picks or exclusions.`
        );
        return;
    }

    const generatedBatch = [];
    
    // Generate 5 Output Slots
    for(let i=0; i<5; i++) {
        let bestCandidate = null;
        const MAX_ATTEMPTS = 50;
        
        for(let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
            const candidate = runGenerationAlgorithm(targetComp, targetCount, fixedTags, excludedTags);
            
            if (!bestCandidate || candidate.stats.avgComp > bestCandidate.stats.avgComp) {
                bestCandidate = candidate;
            }
            
            if (bestCandidate.stats.avgComp >= targetComp && parseFloat(bestCandidate.stats.movieScore) > 0) {
                break;
            }
        }
        
        generatedBatch.push(bestCandidate);
    }
    
    generatedBatch.sort((a, b) => {
        const scoreA = parseFloat(a.stats.movieScore);
        const scoreB = parseFloat(b.stats.movieScore);
        if (scoreA !== scoreB) return scoreB - scoreA;
        return b.stats.avgComp - a.stats.avgComp;
    });

    generatedScriptsCache = generatedBatch;
    renderGeneratedScripts(generatedBatch);
}

function runGenerationAlgorithm(targetComp, targetCount, fixedTags, excludedTags) {
    const excludedIds = new Set(excludedTags.map(t => t.id));
    
    // 1. Setup Initial Candidate
    let currentTags = [...fixedTags];
    const categoriesPresent = new Set(currentTags.map(t => t.category));
    
    // A. Handle Genres
    const fixedGenres = currentTags.filter(t => t.category === "Genre");
    if (fixedGenres.length === 0) {
        const genre1 = getRandomTagByCategory("Genre", currentTags, excludedIds);
        if (genre1) {
            let partnerId = null;
            if (Math.random() < 0.3) {
                 const partners = getCompatibleGenres(genre1.id, excludedIds);
                 if (partners.length > 0) {
                     partnerId = partners[Math.floor(Math.random() * partners.length)];
                 }
            }
            if (partnerId) {
                genre1.percent = 0.5;
                currentTags.push(genre1);
                currentTags.push({ id: partnerId, percent: 0.5, category: "Genre" });
            } else {
                genre1.percent = 1.0;
                currentTags.push(genre1);
            }
        }
    }

    // B. Handle Mandatory Setting
    if (!categoriesPresent.has("Setting")) {
        const randomSetting = getRandomTagByCategory("Setting", currentTags, excludedIds);
        if(randomSetting) {
            currentTags.push(randomSetting);
            categoriesPresent.add("Setting");
        }
    }

    // C. Fill Mandatory Scoring Categories
    const scoringMandatory = ["Protagonist", "Antagonist", "Finale"];
    scoringMandatory.forEach(cat => {
        if(!categoriesPresent.has(cat) && getScoringElementCount(currentTags) < targetCount) {
            const randomTag = getRandomTagByCategory(cat, currentTags, excludedIds);
            if(randomTag) {
                currentTags.push(randomTag);
                categoriesPresent.add(cat);
            }
        }
    });

    // D. Fill remaining slots
    const fillerCats = ["Supporting Character", "Theme & Event"];
    while(getScoringElementCount(currentTags) < targetCount) {
        const randCat = fillerCats[Math.floor(Math.random() * fillerCats.length)];
        const randomTag = getRandomTagByCategory(randCat, currentTags, excludedIds);
        if(randomTag) currentTags.push(randomTag);
        else break; 
    }
    
    // 2. Optimization Loop
    let bestSet = [...currentTags];
    let bestStats = calculateMatrixScore(bestSet);
    
    const iterations = 200; 
    for(let i=0; i<iterations; i++) {
        let candidate = [...bestSet];
        const fixedIds = new Set(fixedTags.map(t => t.id));
        const mutableIndices = candidate.map((t, idx) => ({t, idx}))
                                        .filter(item => !fixedIds.has(item.t.id) && item.t.category !== 'Genre')
                                        .map(item => item.idx);
        if(mutableIndices.length === 0) break; 
        
        const swapIdx = mutableIndices[Math.floor(Math.random() * mutableIndices.length)];
        const tagToSwap = candidate[swapIdx];
        const newTag = getRandomTagByCategory(tagToSwap.category, candidate, excludedIds); 
        
        if(newTag) {
            candidate[swapIdx] = newTag;
            const newStats = calculateMatrixScore(candidate);
            if(newStats.rawAverage > bestStats.rawAverage) {
                bestSet = candidate;
                bestStats = newStats;
            }
        }
    }
    
    // 3. Calculate Final Stats
    const ngCount = getScoringElementCount(bestSet);
    let tagCap = 6;
    let maxScriptQual = 5;
    
    if(ngCount >= 9) { tagCap = 9; maxScriptQual = 8; }
    else if(ngCount >= 7) { tagCap = 8; maxScriptQual = 7; } 
    else if(ngCount >= 5) { tagCap = 7; maxScriptQual = 6; } 
    else { tagCap = 6; maxScriptQual = 5; }
    
    const bonuses = calculateTotalBonuses(bestSet);
    const MAX_GAME_SCORE = 9.9;
    const rawCom = (bestStats.totalScore + bonuses.com) * MAX_GAME_SCORE;
    const rawArt = (bestStats.totalScore + bonuses.art) * MAX_GAME_SCORE;
    const maxPotential = Math.max(0, Math.max(rawCom, rawArt));
    
    const finalMovieScore = Math.min(tagCap, maxPotential);

    return {
        tags: bestSet,
        stats: {
            avgComp: bestStats.rawAverage,
            synergySum: bestStats.totalScore,
            maxScriptQuality: maxScriptQual,
            movieScore: finalMovieScore.toFixed(1)
        },
        uniqueId: Date.now() + Math.random().toString()
    };
}

function getCompatibleGenres(sourceId, excludedIds) {
    let valid = [];
    if (GAME_DATA.genrePairs[sourceId]) {
        valid.push(...Object.keys(GAME_DATA.genrePairs[sourceId]));
    }
    for (const gKey in GAME_DATA.genrePairs) {
        if (GAME_DATA.genrePairs[gKey] && GAME_DATA.genrePairs[gKey][sourceId]) {
            valid.push(gKey);
        }
    }
    const unique = new Set(valid);
    return [...unique].filter(id => !excludedIds.has(id));
}

function getScoringElementCount(tags) {
    return tags.filter(t => t.category !== "Genre" && t.category !== "Setting").length;
}

function getRandomTagByCategory(category, currentTags, excludedIds) {
    const existingIds = new Set(currentTags.map(t => t.id));
    const allTags = Object.values(GAME_DATA.tags).filter(t => t.category === category);
    const available = allTags.filter(t => !existingIds.has(t.id) && !excludedIds.has(t.id));
    
    if(available.length === 0) return null;
    const picked = available[Math.floor(Math.random() * available.length)];
    
    return {
        id: picked.id,
        percent: 1.0, 
        category: category
    };
}

function renderGeneratedScripts(scripts) {
    const container = document.getElementById('generatorResultsList');
    container.innerHTML = '';
    document.getElementById('results-generator').classList.remove('hidden');

    scripts.forEach((script, index) => {
        // false passed here means it's NOT in the pinned section (no editable name)
        const card = createScriptCardHTML(script, false); 
        container.appendChild(card);
    });
}

function createScriptCardHTML(scriptObj, isPinnedSection) {
    const div = document.createElement('div');
    const cardScope = isPinnedSection ? 'pinned-script' : 'generated-script';
    const scriptDomId = toDomId(scriptObj.uniqueId);
    div.className = 'gen-card';
    div.id = `${cardScope}-card-${scriptDomId}`;
    div.dataset.id = scriptObj.uniqueId;
    div.dataset.scriptId = scriptObj.uniqueId;
    div.dataset.role = `${cardScope}-card`;
    
    const compClass = scriptObj.stats.avgComp >= 4.0 ? 'val-high' : (scriptObj.stats.avgComp >= 3.0 ? 'val-mid' : 'val-low');
    
    // Tag Chips Logic
    let tagsHtml = '';
    const fixedInputs = collectTagInputs('generator');
    const fixedIds = new Set(fixedInputs.map(t => t.id));
    const categoryOrder = [
        "Genre", "Setting", "Protagonist", "Antagonist", "Supporting Character", "Theme & Event", "Finale"
    ];
    const sortedTags = [...scriptObj.tags].sort((a, b) => {
        let idxA = categoryOrder.indexOf(a.category);
        let idxB = categoryOrder.indexOf(b.category);
        if (idxA === -1) idxA = 99;
        if (idxB === -1) idxB = 99;
        return idxA - idxB;
    });

    sortedTags.forEach(t => {
        const tagData = GAME_DATA.tags[t.id];
        const tagName = tagData ? tagData.name : t.id; // Safety fallback
        const isFixed = fixedIds.has(t.id);
        tagsHtml += `<span class="gen-tag-chip ${isFixed ? 'tag-fixed' : ''}">${tagName} <small>${t.category}</small></span>`;
    });

    // Check if truly pinned to set Icon state
    const isActuallyPinned = pinnedScripts.some(s => s.uniqueId === scriptObj.uniqueId);
    const pinClass = isActuallyPinned ? 'pinned' : '';
    const pinTitle = isActuallyPinned ? 'Unpin' : 'Pin to Save';

    // Editable Name Input (Only if in pinned section)
    const nameInputHtml = isPinnedSection 
        ? `<input type="text" class="script-name-input" value="${scriptObj.name || 'Untitled Script'}" 
           id="${cardScope}-name-${scriptDomId}"
           data-role="script-name-input"
           placeholder="Script Name">`
        : '';

    div.innerHTML = `
        <div id="${cardScope}-header-${scriptDomId}" class="gen-header" data-role="script-card-header">
            <div class="gen-left-col">
                ${nameInputHtml}
                <div class="gen-info-row">
                    <div class="gen-badge-group">
                        <span class="gen-badge-label">Avg Comp</span>
                        <span class="gen-badge-val ${compClass}">${scriptObj.stats.avgComp.toFixed(1)}</span>
                    </div>
                    <div class="gen-badge-group">
                        <span class="gen-badge-label">Movie Score</span>
                        <span class="gen-badge-val val-mid">${scriptObj.stats.movieScore}</span>
                    </div>
                    <div class="gen-badge-group">
                        <span class="gen-badge-label">Script Qual</span>
                        <span class="gen-badge-val val-mid">${scriptObj.stats.maxScriptQuality}</span>
                    </div>
                </div>
            </div>
            <button id="${cardScope}-pin-${scriptDomId}" class="pin-btn ${pinClass}" title="${pinTitle}" data-role="script-pin-button">
                ${isActuallyPinned ? '★' : '☆'}
            </button>
        </div>
        <div class="gen-details hidden">
            <div class="gen-tags-grid">
                ${tagsHtml}
            </div>
            <div class="gen-actions">
                <span id="${cardScope}-short-id-${scriptDomId}" class="script-id" data-role="script-short-id">ID: ${scriptObj.uniqueId.substring(scriptObj.uniqueId.length-6)}</span>
                <button id="${cardScope}-transfer-${scriptDomId}" class="transfer-link-btn" data-role="script-transfer-button">
                    Find Best Advertisers &rarr;
                </button>
            </div>
        </div>
    `;
    div.querySelector('.gen-header')?.addEventListener('click', event => {
        if (event.target.closest('button, input')) return;
        toggleScriptCard(event.currentTarget);
    });
    div.querySelector('.pin-btn')?.addEventListener('click', event => togglePin(scriptObj.uniqueId, event));
    div.querySelector('.transfer-link-btn')?.addEventListener('click', () => transferScriptToAdvertisers(scriptObj.uniqueId));
    div.querySelector('.script-name-input')?.addEventListener('keyup', event => updateScriptName(scriptObj.uniqueId, event.target.value));
    div.querySelector('.script-name-input')?.addEventListener('click', event => event.stopPropagation());

    return div;
}

function updateScriptName(uniqueId, newName) {
    const script = pinnedScripts.find(s => s.uniqueId === uniqueId);
    if (script) {
        script.name = newName;
    }
}

function toggleScriptCard(headerEl) {
    const details = headerEl.nextElementSibling;
    details.classList.toggle('hidden');
}

function togglePin(uniqueId, event) {
    event.stopPropagation(); 
    
    // Using string comparison to ensure type safety
    const existingIndex = pinnedScripts.findIndex(s => String(s.uniqueId) === String(uniqueId));
    
    if(existingIndex > -1) {
        // UNPIN: Remove from list
        pinnedScripts.splice(existingIndex, 1);
    } else {
        // PIN: Add to list
        const script = generatedScriptsCache.find(s => String(s.uniqueId) === String(uniqueId));
        if(script) {
            // DEEP COPY to ensure no reference issues with the generator cache
            const newPinned = JSON.parse(JSON.stringify(script));
            
            // Set default name if missing
            if(!newPinned.name) newPinned.name = "Untitled Script";
            
            pinnedScripts.push(newPinned);
        }
    }
    
    // Refresh both views
    renderPinnedScripts();
    renderGeneratedScripts(generatedScriptsCache);
}

function renderPinnedScripts() {
    const container = document.getElementById('pinnedResultsList');
    const wrapper = document.getElementById('pinned-scripts-container');
    
    // Always show the container so Save/Load buttons are accessible
    if(wrapper) wrapper.classList.remove('hidden');
    if(!container) return;

    container.innerHTML = '';
    
    // Show placeholder instead of hiding
    if(pinnedScripts.length === 0) {
        container.innerHTML = '<div class="empty-state pinned-empty">No pinned scripts yet.</div>';
        return;
    }
    
    pinnedScripts.forEach(script => {
        const card = createScriptCardHTML(script, true);
        container.appendChild(card);
    });
}

/* =========================================================================
   SAVE / LOAD SYSTEM
   ========================================================================= */

function savePinnedScripts() {
    if (pinnedScripts.length === 0) {
        alert("No pinned scripts to save.");
        return;
    }
    
    try {
        const dataToSave = JSON.parse(JSON.stringify(pinnedScripts));
        const dataStr = JSON.stringify(dataToSave, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        
        const exportName = `hollywood_animal_scripts_${new Date().toISOString().slice(0,10)}.json`;
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", url);
        downloadAnchorNode.setAttribute("download", exportName);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
        URL.revokeObjectURL(url);
    } catch(e) {
        console.error("Save failed:", e);
        alert("Failed to save scripts. See console for details.");
    }
}

function triggerLoadScripts() {
    const input = document.getElementById('loadScriptsInput');
    if(input) {
        input.value = ''; // Reset to allow re-loading same file
        input.click();
    } else {
        console.error("File input #loadScriptsInput not found in DOM.");
    }
}

function handleFileLoad(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.addEventListener('load', function(e) {
        try {
            const loaded = JSON.parse(e.target.result);
            if(Array.isArray(loaded)) {
                let added = 0;
                // Create a Set of existing IDs to prevent duplicates
                const currentIds = new Set(pinnedScripts.map(s => String(s.uniqueId)));
                
                loaded.forEach(script => {
                    // Basic validation
                    if(script.tags && script.uniqueId) {
                        const sId = String(script.uniqueId);
                        if(!currentIds.has(sId)) {
                            pinnedScripts.push(script);
                            currentIds.add(sId);
                            added++;
                        }
                    }
                });
                
                if(added > 0) {
                    renderPinnedScripts();
                    alert(`Loaded ${added} scripts.`);
                } else {
                    alert("No new unique scripts found in file.");
                }
            } else {
                alert("Invalid file format: JSON is not an array.");
            }
        } catch(err) {
            console.error(err);
            alert("Error parsing JSON file.");
        }
    }, { once: true });
    reader.readAsText(file);
}

function transferScriptToAdvertisers(uniqueId) {
    let script = pinnedScripts.find(s => s.uniqueId === uniqueId);
    if(!script) script = generatedScriptsCache.find(s => s.uniqueId === uniqueId);
    
    if(!script) return;
    
    switchTab('advertisers');
    initializeSelectors('advertisers'); 
    
    script.tags.forEach(t => {
        const category = t.category;
        const containerId = `inputs-${categoryToElementSlug(category)}-advertisers`;
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const existingSelects = container.querySelectorAll('select');
        let placed = false;
        for (let sel of existingSelects) {
            if (sel.value === "") {
                sel.value = t.id;
                placed = true;
                break;
            }
        }
        if (!placed) {
            addDropdown(category, t.id, 'advertisers');
        }
    });
    
    const genres = script.tags.filter(t => t.category === "Genre");
    if(genres.length > 1) {
        updateGenreControls('advertisers');
    }
    
    analyzeMovie();
}


/* =========================================================================
   ANALYSIS / ADVERTISERS / DISTRIBUTION LOGIC
   ========================================================================= */

async function analyzeMovie() {
    await ensureCompatibilityLoaded();
    await ensureGenrePairsLoaded();
    const tagInputs = collectTagInputs('advertisers');
    if(tagInputs.length === 0) {
        alert("Please select at least one tag.");
        return;
    }

    const inputCom = parseFloat(document.getElementById('comScoreInput').value) || 0;
    const inputArt = parseFloat(document.getElementById('artScoreInput').value) || 0;

    let tagAffinity = { "YM": 0, "YF": 0, "TM": 0, "TF": 0, "AM": 0, "AF": 0 };
    tagInputs.forEach(item => {
        const tagData = GAME_DATA.tags[item.id];
        if(!tagData) return;
        const multiplier = item.percent;
        for(let demo in tagAffinity) {
            if(tagData.weights[demo]) {
                tagAffinity[demo] += (tagData.weights[demo] * multiplier);
            }
        }
    });

    let minVal = Number.MAX_VALUE;
    for (let demo in tagAffinity) {
        if (tagAffinity[demo] < minVal) minVal = tagAffinity[demo];
    }
    if (minVal < 1.0) {
        const liftAmount = 1.0 - minVal;
        for (let demo in tagAffinity) {
            tagAffinity[demo] += liftAmount;
        }
    }

    let totalSum = 0;
    for (let demo in tagAffinity) totalSum += tagAffinity[demo];
    const RELEASE_MAGIC_NUMBER = 3.0;
    let baselineScores = {};
    for(let demo in tagAffinity) {
        if (totalSum === 0) {
            baselineScores[demo] = 0; 
        } else {
            let normalized = (tagAffinity[demo] / totalSum) * RELEASE_MAGIC_NUMBER;
            baselineScores[demo] = Math.min(1.0, Math.max(0, normalized));
        }
    }

    const normalizedArt = inputArt / 10.0;
    const normalizedCom = inputCom / 10.0;
    let demoGrades = [];
    
    for(let demo in GAME_DATA.demographics) {
        const d = GAME_DATA.demographics[demo];
        const dropRate = baselineScores[demo]; 

        const skew = normalizedArt - normalizedCom;
        let satArt, satBase, satCom;
        if (skew > 0) { 
            satArt = 1.0;
            satBase = 1.0 - skew;
            satCom = 1.0 - skew;
        } else {
            satCom = 1.0;
            satBase = 1.0 - Math.abs(skew);
            satArt = 1.0 - Math.abs(skew);
        }

        const totalW = d.baseW + d.artW + d.comW;
        const satisfaction = ( (satBase * d.baseW) + (satArt * d.artW) + (satCom * d.comW) ) / totalW;
        const qw = GAME_DATA.constants.KINOMARK.scoreWeights;
        const quality = (dropRate * qw[0]) + (normalizedCom * qw[1]) + (normalizedArt * qw[2]);
        const aw = GAME_DATA.constants.KINOMARK.audienceWeight;
        let finalScore = (satisfaction * aw) + (quality * (1 - aw));
        
        if (dropRate <= 0.1) finalScore = 0;

        demoGrades.push({
            id: demo,
            name: d.name,
            score: dropRate, 
            utility: finalScore 
        });
    }

    const THRESHOLD_GOOD = 0.67;
    const THRESHOLD_BAD = 0.33; 

    const targetAudiences = demoGrades.filter(d => d.score > THRESHOLD_BAD);
    const highInterestIds = demoGrades.filter(d => d.score >= THRESHOLD_GOOD).map(d => d.id);
    const moderateInterestIds = demoGrades.filter(d => d.score > THRESHOLD_BAD && d.score < THRESHOLD_GOOD).map(d => d.id);

    document.getElementById('results-advertisers').classList.remove('hidden');
    const audienceContainer = document.getElementById('targetAudienceDisplay');
    audienceContainer.innerHTML = '';
    
    if (targetAudiences.length > 0) {
        targetAudiences.sort((a, b) => b.score - a.score);
        targetAudiences.forEach(d => {
            const chip = document.createElement('div');
            let tierClass = "pill-moderate";
            if(d.score >= THRESHOLD_GOOD) {
                tierClass = "pill-best";
            }
            chip.className = `audience-pill ${tierClass}`;
            chip.innerHTML = `${d.name}`;
            audienceContainer.appendChild(chip);
        });
    } else {
        audienceContainer.innerHTML = '<div class="empty-state">No audience fits the criteria.</div>';
    }

    const validTargetIds = targetAudiences.map(t => t.id);
    let movieLean = 0; 
    let leanText = "Balanced";
    if (inputArt > inputCom + 0.1) { movieLean = 1; leanText = "Artistic"; } 
    else if (inputCom > inputArt + 0.1) { movieLean = 2; leanText = "Commercial"; }

    // Rank the agencies against the selected elements.
    displayAdvertiserRecommendations(getRecommendations({
        tags: tagInputs.map(t => GAME_DATA.tags[t.id]).filter(Boolean),
        movieLean: movieLean
    }));

    const leanDisplay = document.getElementById('movieLeanDisplay');
    if (leanDisplay) {
        leanDisplay.textContent = leanText;
        leanDisplay.className = 'value';
        if (movieLean === 1) leanDisplay.classList.add('lean-art');
        else if (movieLean === 2) leanDisplay.classList.add('lean-com');
        else leanDisplay.classList.add('lean-balanced');
    }

    // --- HOLIDAY LOGIC ---
    const holidayContainer = document.getElementById('holidayDisplay');
    holidayContainer.innerHTML = '';

    if (validTargetIds.length === 0) {
        holidayContainer.innerHTML = '<div class="empty-state">Identify target audience first.</div>';
    } else {
        let primaryTargets = highInterestIds;
        if (primaryTargets.length === 0) {
            primaryTargets = moderateInterestIds;
        }

        const rankedHolidays = GAME_DATA.holidays.map(h => {
            let totalScore = 0;
            let parts = [];
            primaryTargets.forEach(id => {
                const bonus = h.bonuses[id] || 0;
                if (bonus > 0) {
                    totalScore += bonus;
                    parts.push({
                        val: bonus,
                        text: `${bonus}% Bonus Towards ${GAME_DATA.demographics[id].name}`
                    });
                }
            });
            parts.sort((a, b) => b.val - a.val);
            const contextText = parts.length > 0 ? parts.map(p => p.text).join(', ') : "No significant bonus.";
            return {
                name: h.name,
                totalScore: totalScore,
                contextText: contextText
            };
        });

        const viableHolidays = rankedHolidays.filter(h => h.totalScore > 0).sort((a, b) => b.totalScore - a.totalScore);

        if (viableHolidays.length === 0) {
            holidayContainer.innerHTML = `<div class="holiday-row-empty"><span>No beneficial holidays found for your primary audience.</span></div>`;
        } else {
            const best = viableHolidays[0];
            const bestHeader = document.createElement('div');
            bestHeader.className = 'holiday-section-label';
            bestHeader.innerText = "Best Option";
            holidayContainer.appendChild(bestHeader);

            const bestRow = document.createElement('div');
            bestRow.className = 'holiday-row best';
            bestRow.innerHTML = `
                <div class="hol-left">
                    <span class="hol-name">${best.name}</span>
                    <span class="hol-target">${best.contextText}</span>
                </div>
            `;
            holidayContainer.appendChild(bestRow);

            const alternatives = viableHolidays.slice(1, 4); 
            if(alternatives.length > 0) {
                const altHeader = document.createElement('div');
                altHeader.className = 'holiday-section-label spaced';
                altHeader.innerText = "Alternatives";
                holidayContainer.appendChild(altHeader);

                alternatives.forEach(alt => {
                    const row = document.createElement('div');
                    row.className = 'holiday-row';
                    row.innerHTML = `
                        <div class="hol-left">
                            <span class="hol-name">${alt.name}</span>
                            <span class="hol-target">${alt.contextText}</span>
                        </div>
                    `;
                    holidayContainer.appendChild(row);
                });
            }
        }
    }

    let preDuration = 6;
    let releaseDuration = 4;
    let postDuration = 0;
    let totalWeeks = 10;
    if (inputCom >= 9.0) {
        postDuration = 4;
        totalWeeks = 14;
    }

    document.getElementById('campaignStrategyDisplay').innerHTML = `
        <div class="strategy-row">
            <div class="campaign-block pre">
                <span class="camp-title">Pre-Release</span>
                <span class="camp-value">${preDuration} wks</span>
            </div>
            
            <div class="campaign-block release">
                <span class="camp-title">Release</span>
                <span class="camp-value">${releaseDuration} wks</span>
            </div>

            <div class="campaign-block post ${postDuration > 0 ? '' : 'is-dimmed'}">
                <span class="camp-title">Post-Release</span>
                <span class="camp-value">${postDuration} wks</span>
            </div>
        </div>

        <div class="total-duration-footer">
            Total Duration: <strong class="text-main">${totalWeeks} Weeks</strong>
        </div>
    `;

    // --- DYNAMICALLY MOVE DISTRIBUTION CALCULATOR TO RESULTS ---
    const distCard = document.getElementById('dist-wrapper');
    const resultsContainer = document.getElementById('results-advertisers');
    
    if(distCard && resultsContainer) {
        resultsContainer.appendChild(distCard);
        distCard.classList.add('distribution-card--in-results');
    }

    document.getElementById('results-advertisers').classList.remove('hidden');
    document.getElementById('results-advertisers').scrollIntoView({ behavior: 'smooth' });
}

// --- NEW DISTRIBUTION LOGIC (Setup and Update) ---

function setupDistributionLogic() {
    const comInput = document.getElementById('comScoreInput');
    const comSlider = document.getElementById('comScoreSlider');
    const ownedInput = document.getElementById('ownedScreeningsInput');
    const scoreDisplay = document.getElementById('dist-com-score-display');

    function update() {
        const score = parseFloat(comInput.value) || 0;
        const owned = parseInt(ownedInput.value) || 0;
        
        // Update the display text in the card (if present)
        if(scoreDisplay) scoreDisplay.innerText = score.toFixed(1);
        
        // Update grid
        updateDistributionGrid(score, owned);
    }

    // Attach listeners
    if(comInput) comInput.addEventListener('input', update);
    if(comSlider) comSlider.addEventListener('input', update);
    if(ownedInput) ownedInput.addEventListener('input', update);

    // Initial run
    update();
}

function updateDistributionGrid(commercialScore, availableScreenings) {
    const BASE = 1000;
    const W1_MULT = 2;
    const W2_MULT = 1;
    const DECAY = 0.8;

    const rawW1 = (commercialScore * W1_MULT * BASE) - availableScreenings;
    const w1 = Math.max(0.0, rawW1);

    const rawW2 = (commercialScore * W2_MULT * BASE) - availableScreenings;
    const w2 = Math.max(0.0, rawW2);

    let calcValues = [w1, w2];
    let currentDecayBase = w2;

    for (let i = 2; i < 8; i++) {
        currentDecayBase *= DECAY;
        calcValues.push(currentDecayBase);
    }

    const finalResults = calcValues.map((val, index) => {
        return index < 4 ? Math.ceil(val) : Math.floor(val);
    });

    const grid = document.getElementById('dist-results-grid');
    if(!grid) return;
    
    grid.innerHTML = '';
    finalResults.forEach((val, index) => {
        const weekNum = index + 1;
        const box = document.createElement('div');
        box.className = 'week-box';
        // Highlight active weeks
        if (val > 0) box.classList.add('active-week');
        
        box.innerHTML = `
            <span class="week-label">Week ${weekNum}</span>
            <span class="week-val ${val > 0 ? 'active' : ''}">${val.toLocaleString()}</span>
        `;
        grid.appendChild(box);
    });
}

// --- SYNERGY LOGIC (Unchanged, just kept for context) ---

async function calculateSynergy() {
    await ensureCompatibilityLoaded();
    const selectedTags = collectTagInputs('synergy');
    if (selectedTags.length === 0) {
        alert("Please select at least one tag.");
        return;
    }
    const matrixResult = calculateMatrixScore(selectedTags);
    const bonuses = calculateTotalBonuses(selectedTags);
    renderSynergyResults(matrixResult, bonuses, selectedTags);
}

function calculateMatrixScore(tags) {
    let totalScore = 0;
    let spoilers = [];
    let rawSum = 0;
    let pairCount = 0;
    for (let i = 0; i < tags.length; i++) {
        for (let j = i + 1; j < tags.length; j++) {
            let tA = tags[i];
            let tB = tags[j];
            let rawVal = 3.0;
            if (GAME_DATA.compatibility[tA.id] && GAME_DATA.compatibility[tA.id][tB.id]) {
                rawVal = parseFloat(GAME_DATA.compatibility[tA.id][tB.id]);
            } else if (GAME_DATA.compatibility[tB.id] && GAME_DATA.compatibility[tB.id][tA.id]) {
                rawVal = parseFloat(GAME_DATA.compatibility[tB.id][tA.id]);
            }
            rawSum += rawVal;
            pairCount++;
        }
    }
    let rawAverage = pairCount > 0 ? (rawSum / pairCount) : 3.0; 
    tags.forEach(tagA => {
        let rowSum = 0;
        let rowWeight = 0;
        let worstVal = 6.0; 
        let worstPartner = "";
        tags.forEach(tagB => {
            if (tagA.id === tagB.id) return;
            let rawVal = 3.0;
            if (GAME_DATA.compatibility[tagA.id] && GAME_DATA.compatibility[tagA.id][tagB.id]) {
                rawVal = parseFloat(GAME_DATA.compatibility[tagA.id][tagB.id]);
            } else if (GAME_DATA.compatibility[tagB.id] && GAME_DATA.compatibility[tagB.id][tagA.id]) {
                rawVal = parseFloat(GAME_DATA.compatibility[tagB.id][tagA.id]);
            }
            let score = (rawVal - 3.0) / 2.0;
            let weight = 1.0;
            if (score < 0) {
                if (tagB.category === "Genre") {
                    score *= 20.0 * tagB.percent;
                    weight = 20.0 * tagB.percent;
                } else if (tagB.category === "Setting") {
                    score *= 5.0;
                    weight = 5.0;
                } else {
                    score *= 3.0;
                    weight = 3.0;
                }
            } else {
                if (tagB.category === "Genre") {
                    score *= tagB.percent;
                    weight = tagB.percent;
                }
            }
            rowSum += score;
            rowWeight += weight;
            if (rawVal < worstVal) {
                worstVal = rawVal;
                worstPartner = tagB.id;
            }
        });
        let rowAverage = 0;
        if (rowWeight > 0) rowAverage = rowSum / rowWeight;
        let transformedWorst = (worstVal - 3.0) / 2.0;
        let finalRowScore = rowAverage;
        if (worstVal <= 1.0) {
            let partnerName = worstPartner && GAME_DATA.tags[worstPartner] ? GAME_DATA.tags[worstPartner].name : "another selected tag";
            spoilers.push(`${GAME_DATA.tags[tagA.id].name} conflicts with ${partnerName}`);
            finalRowScore = -1.0; 
        } else if (transformedWorst < rowAverage) {
             finalRowScore = transformedWorst;
        }
        totalScore += finalRowScore * tagA.percent;
    });
    if (totalScore >= 0) totalScore *= 0.9;
    else totalScore *= 1.25;
    return { totalScore, spoilers, rawAverage };
}

function calculateTotalBonuses(tags) {
    let totalArt = 0;
    let totalCom = 0;
    const genrePair = calculateGenrePairScore(tags);
    if (genrePair) {
        totalArt += genrePair.art;
        totalCom += genrePair.com;
    } else {
        const genres = tags.filter(t => t.category === "Genre").sort((a, b) => b.percent - a.percent);
        if (genres.length > 0) {
            const topGenre = GAME_DATA.tags[genres[0].id];
            if (topGenre) {
                totalArt += topGenre.art;
                totalCom += topGenre.com;
            }
        }
    }
    tags.forEach(tag => {
        if (tag.category !== "Genre") {
            const data = GAME_DATA.tags[tag.id];
            if (data) {
                totalArt += data.art;
                totalCom += data.com;
            }
        }
    });
    return { art: totalArt, com: totalCom };
}

function calculateGenrePairScore(tags) {
    const genres = tags.filter(t => t.category === "Genre").sort((a, b) => b.percent - a.percent);
    if (genres.length < 2) return null;
    const g1 = genres[0];
    const g2 = genres[1];
    if ((g1.percent + g2.percent < 0.7) || (g2.percent < 0.35)) {
        return null;
    }
    let pairData = null;
    if (GAME_DATA.genrePairs[g1.id] && GAME_DATA.genrePairs[g1.id][g2.id]) {
        pairData = GAME_DATA.genrePairs[g1.id][g2.id];
    } else if (GAME_DATA.genrePairs[g2.id] && GAME_DATA.genrePairs[g2.id][g1.id]) {
        pairData = GAME_DATA.genrePairs[g2.id][g1.id];
    }
    if (!pairData) return null;
    return {
        com: parseFloat(pairData.Item1),
        art: parseFloat(pairData.Item2),
        names: `${GAME_DATA.tags[g1.id].name} + ${GAME_DATA.tags[g2.id].name}`
    };
}

function formatScore(num) {
    if (Math.abs(num) < 0.005) return "0";
    return (num > 0 ? "+" : "") + num.toFixed(2);
}

function formatSimpleScore(num) {
    if (Math.abs(num) < 0.005) return "0";
    return (num > 0 ? "+" : "") + parseFloat(num.toFixed(2));
}

function setToneClass(element, tone) {
    element.classList.remove('tone-success', 'tone-danger', 'tone-neutral', 'tone-accent', 'tone-art');
    element.classList.add(`tone-${tone}`);
}

function renderSynergyResults(matrix, bonuses, tags) {
    document.getElementById('results-synergy').classList.remove('hidden');
    const avgEl = document.getElementById('synergyAverageDisplay');
    avgEl.innerHTML = `${matrix.rawAverage.toFixed(1)} <span class="sub-value">/ 5.0</span>`;
    if (matrix.rawAverage >= 3.5) setToneClass(avgEl, 'success');
    else if (matrix.rawAverage < 2.5) setToneClass(avgEl, 'danger');
    else setToneClass(avgEl, 'neutral');

    const baseScoreEl = document.getElementById('synergyTotalDisplay');
    baseScoreEl.innerText = formatScore(matrix.totalScore);
    setToneClass(baseScoreEl, matrix.totalScore >= 0 ? 'success' : 'danger');

    const breakdownBase = document.getElementById('breakdownBaseScore');
    breakdownBase.innerText = formatScore(matrix.totalScore);
    setToneClass(breakdownBase, matrix.totalScore >= 0 ? 'success' : 'danger');

    const breakdownCom = document.getElementById('breakdownComBonus');
    const breakdownArt = document.getElementById('breakdownArtBonus');
    breakdownCom.innerText = formatSimpleScore(bonuses.com);
    setToneClass(breakdownCom, bonuses.com > 0 ? 'success' : (bonuses.com < 0 ? 'danger' : 'neutral'));
    breakdownArt.innerText = formatSimpleScore(bonuses.art);
    setToneClass(breakdownArt, bonuses.art > 0 ? 'art' : (bonuses.art < 0 ? 'danger' : 'neutral'));

    // Tag Cap Logic
    let ngCount = 0;
    if (tags) {
        ngCount = getScoringElementCount(tags);
    }
    
    let tagCap = 6;
    if(ngCount >= 9) tagCap = 9;
    else if(ngCount >= 7) tagCap = 8;
    else if(ngCount >= 5) tagCap = 7;

    const MAX_GAME_SCORE = 9.9; 
    const totalComRaw = matrix.totalScore + bonuses.com;
    const totalArtRaw = matrix.totalScore + bonuses.art;
    
    let displayCom = Math.max(0, totalComRaw * MAX_GAME_SCORE);
    let displayArt = Math.max(0, totalArtRaw * MAX_GAME_SCORE);

    displayCom = Math.min(tagCap, displayCom);
    displayArt = Math.min(tagCap, displayArt);

    const totalComEl = document.getElementById('totalComScore');
    const totalArtEl = document.getElementById('totalArtScore');
    
    function formatFinalRating(val) {
        if (val >= 10) return "10.0";
        return val.toFixed(1);
    }

    totalComEl.innerHTML = formatFinalRating(displayCom);
    setToneClass(totalComEl, displayCom > 0 ? 'accent' : 'danger');
    totalArtEl.innerHTML = formatFinalRating(displayArt);
    setToneClass(totalArtEl, displayArt > 0 ? 'art' : 'danger');
    
    let capLabel = document.getElementById('scoreCapLabel');
    if (!capLabel) {
        const rightCol = document.querySelector('#results-synergy .right-col');
        capLabel = document.createElement('div');
        capLabel.id = 'scoreCapLabel';
        capLabel.className = 'score-cap-label';
        rightCol.appendChild(capLabel);
    }
    capLabel.innerHTML = `Max Score Capped at <strong>${tagCap}.0</strong> (${ngCount} Scoring Elements)`;

    const spoilerEl = document.getElementById('spoilerDisplay');
    if (matrix.spoilers.length > 0) {
        let uniqueSpoilers = [...new Set(matrix.spoilers)];
        spoilerEl.innerHTML = uniqueSpoilers.map(s => 
            `<div class="spoiler-row">${s}</div>`
        ).join('');
    } else {
        spoilerEl.innerHTML = '<div class="empty-state">No severe conflicts found.</div>';
    }
    document.getElementById('results-synergy').scrollIntoView({ behavior: 'smooth' });
}

async function evaluateColmanGravesScript() {
    await ensureCompatibilityLoaded();
    clearFeedbackMessage('gravesFeedbackMessage');

    const selectedTags = collectTagInputs('graves');
    if (selectedTags.length < 2) {
        showFeedbackMessage('gravesFeedbackMessage', 'Colman needs at least two story elements to compare.');
        return;
    }

    const matrixResult = calculateMatrixScore(selectedTags);
    const bonuses = calculateTotalBonuses(selectedTags);
    renderColmanGravesResults(matrixResult, bonuses, selectedTags);
}

function getGravesVerdict(rawAverage) {
    if (rawAverage >= 4.0) {
        return {
            label: 'Success',
            tone: 'success',
            text: 'Graves sees a strong, marketable script. The selected elements reinforce each other cleanly.'
        };
    }

    if (rawAverage >= 3.5) {
        return {
            label: 'Common',
            tone: 'accent',
            text: 'Graves sees a viable script. It should work, but it is not a rare high-synergy combination.'
        };
    }

    if (rawAverage < 3.0) {
        return {
            label: 'Failed',
            tone: 'danger',
            text: 'Graves sees a weak fit. The premise may still be interesting, but the game data says these elements fight each other.'
        };
    }

    return {
        label: 'Risky',
        tone: 'neutral',
        text: 'Graves sees an uneven script. A few pairings may carry it, but the whole package is fragile.'
    };
}

function calculateGravesMovieScores(matrix, bonuses, tags) {
    const scoringCount = getScoringElementCount(tags);
    let tagCap = 6;
    if (scoringCount >= 9) tagCap = 9;
    else if (scoringCount >= 7) tagCap = 8;
    else if (scoringCount >= 5) tagCap = 7;

    const maxGameScore = 9.9;
    const commercial = Math.min(tagCap, Math.max(0, (matrix.totalScore + bonuses.com) * maxGameScore));
    const artistic = Math.min(tagCap, Math.max(0, (matrix.totalScore + bonuses.art) * maxGameScore));

    return { commercial, artistic, tagCap, scoringCount };
}

function calculateGravesAudience(tags) {
    const affinity = Object.fromEntries(Object.keys(GAME_DATA.demographics).map(id => [id, 0]));

    tags.forEach(item => {
        const tagData = GAME_DATA.tags[item.id];
        if (!tagData || !tagData.weights) return;

        Object.keys(affinity).forEach(demoId => {
            affinity[demoId] += (tagData.weights[demoId] || 0) * item.percent;
        });
    });

    const maxAffinity = Math.max(1, ...Object.values(affinity));
    return Object.entries(affinity)
        .map(([id, score]) => ({
            id,
            name: GAME_DATA.demographics[id].name,
            score,
            strength: Math.round((score / maxAffinity) * 100)
        }))
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score);
}

function getRawCompatibilityScore(tagA, tagB) {
    if (GAME_DATA.compatibility[tagA.id] && GAME_DATA.compatibility[tagA.id][tagB.id]) {
        return parseFloat(GAME_DATA.compatibility[tagA.id][tagB.id]);
    }

    if (GAME_DATA.compatibility[tagB.id] && GAME_DATA.compatibility[tagB.id][tagA.id]) {
        return parseFloat(GAME_DATA.compatibility[tagB.id][tagA.id]);
    }

    return 3.0;
}

function findGravesConflicts(tags) {
    const conflicts = [];

    for (let i = 0; i < tags.length; i++) {
        for (let j = i + 1; j < tags.length; j++) {
            const rawScore = getRawCompatibilityScore(tags[i], tags[j]);
            if (rawScore < 2.0) {
                const firstName = GAME_DATA.tags[tags[i].id] ? GAME_DATA.tags[tags[i].id].name : tags[i].id;
                const secondName = GAME_DATA.tags[tags[j].id] ? GAME_DATA.tags[tags[j].id].name : tags[j].id;
                conflicts.push({ firstName, secondName, rawScore });
            }
        }
    }

    return conflicts.sort((a, b) => a.rawScore - b.rawScore);
}

function renderColmanGravesResults(matrix, bonuses, tags) {
    const verdict = getGravesVerdict(matrix.rawAverage);
    const movieScores = calculateGravesMovieScores(matrix, bonuses, tags);

    document.getElementById('results-graves').classList.remove('hidden');

    const verdictEl = document.getElementById('gravesVerdictDisplay');
    verdictEl.textContent = verdict.label;
    setToneClass(verdictEl, verdict.tone);

    const averageEl = document.getElementById('gravesAverageDisplay');
    averageEl.innerHTML = `${matrix.rawAverage.toFixed(1)} <span class="sub-value">/ 5.0</span>`;
    setToneClass(averageEl, matrix.rawAverage >= 4.0 ? 'success' : (matrix.rawAverage < 3.0 ? 'danger' : 'accent'));

    const commercialEl = document.getElementById('gravesCommercialScoreDisplay');
    commercialEl.textContent = movieScores.commercial.toFixed(1);
    setToneClass(commercialEl, movieScores.commercial > 0 ? 'accent' : 'danger');

    const artisticEl = document.getElementById('gravesArtisticScoreDisplay');
    artisticEl.textContent = movieScores.artistic.toFixed(1);
    setToneClass(artisticEl, movieScores.artistic > 0 ? 'art' : 'danger');

    document.getElementById('gravesVerdictText').textContent = verdict.text;
    document.getElementById('gravesMethodList').innerHTML = `
        <div class="graves-method-row">
            <span class="graves-method-label">Pair average</span>
            <span class="graves-method-value">${matrix.rawAverage.toFixed(2)}</span>
        </div>
        <div class="graves-method-row">
            <span class="graves-method-label">Script synergy</span>
            <span class="graves-method-value">${formatScore(matrix.totalScore)}</span>
        </div>
        <div class="graves-method-row">
            <span class="graves-method-label">Score cap</span>
            <span class="graves-method-value">${movieScores.tagCap}.0 from ${movieScores.scoringCount} scoring elements</span>
        </div>
    `;

    const audienceContainer = document.getElementById('gravesAudienceDisplay');
    audienceContainer.innerHTML = '';
    const audiences = calculateGravesAudience(tags).slice(0, 6);
    if (audiences.length === 0) {
        audienceContainer.innerHTML = '<div class="empty-state">No clear audience pattern found.</div>';
    } else {
        audiences.forEach(audience => {
            const chip = document.createElement('div');
            chip.id = `graves-audience-${toDomId(audience.id)}`;
            chip.className = `audience-pill ${audience.strength >= 67 ? 'pill-best' : 'pill-moderate'}`;
            chip.dataset.role = 'graves-audience-pill';
            chip.dataset.audienceId = audience.id;
            chip.textContent = `${audience.name} ${audience.strength}%`;
            audienceContainer.appendChild(chip);
        });
    }

    const conflictContainer = document.getElementById('gravesConflictDisplay');
    const conflicts = findGravesConflicts(tags);
    if (conflicts.length === 0) {
        conflictContainer.innerHTML = '<div class="empty-state">No severe Graves conflicts found.</div>';
    } else {
        conflictContainer.innerHTML = conflicts.map((conflict, index) => `
            <div id="graves-conflict-${index + 1}" class="spoiler-row graves-conflict-row">
                ${conflict.firstName} clashes with ${conflict.secondName}
                <span class="graves-raw-score">${conflict.rawScore.toFixed(1)}</span>
            </div>
        `).join('');
    }

    document.getElementById('results-graves').scrollIntoView({ behavior: 'smooth' });
}

function resetSelectors(context) {
    // Reset Bans tears down the auto-populated list, so allow it to rebuild.
    if (context === 'excluded') startingProfileExcludedLoaded = false;

    initializeSelectors(context);

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
}

function transferTagsToAdvertisers() {
    const inputs = collectTagInputs('synergy');
    if (inputs.length === 0) return;
    switchTab('advertisers');
    initializeSelectors('advertisers');
    inputs.forEach(input => {
        const category = input.category;
        const containerId = `inputs-${categoryToElementSlug(category)}-advertisers`;
        const container = document.getElementById(containerId);
        if (!container) return;
        const existingSelects = container.querySelectorAll('select');
        let placed = false;
        for (let sel of existingSelects) {
            if (sel.value === "") {
                sel.value = input.id;
                placed = true;
                break;
            }
        }
        if (!placed) {
            addDropdown(category, input.id, 'advertisers');
        }
    });
    const genreInputs = inputs.filter(i => i.category === 'Genre');
    if (genreInputs.length > 1) {
        updateGenreControls('advertisers');
        const genreRows = document.querySelectorAll(`#inputs-${categoryToElementSlug('Genre')}-advertisers .genre-row`);
        genreRows.forEach((row, index) => {
            if (genreInputs[index]) {
                const percentVal = Math.round(genreInputs[index].percent * 100);
                row.querySelector('.percent-input').value = percentVal;
                row.querySelector('.percent-slider').value = percentVal;
                updatePercentSliderTrack(row.querySelector('.percent-slider'));
            }
        });
    }
    analyzeMovie();
}

/* =========================================================================
   BEST ADVERTISERS RECOMMENDATION ENGINE
   Scores every agency in GAME_DATA.adAgents against the selected story
   elements, using the per-audience weights the game ships in
   TagsAudienceWeights.json.
   ========================================================================= */

/*
 * Grade bands, as [minimum score, letter, css tier].
 *
 * The match score averages the audience weights the game ships, which run
 * roughly -2..5 and cluster low. Measured over 3000 random six-element
 * scripts, the best available agency never exceeded 3.72 and averaged 2.28,
 * so bands anchored at 4.0+ were unreachable — 94% of scripts graded D or F
 * on their best option. These thresholds are percentiles of that measured
 * distribution instead. Re-derive with tools/grade-distribution.mjs if
 * data/TagsAudienceWeights.json ever changes.
 */
const ADVERTISER_GRADE_BANDS = [
    [3.33, 'A+', 'grade-high'],
    [2.83, 'A',  'grade-high'],
    [2.58, 'B+', 'grade-good'],
    [2.33, 'B',  'grade-good'],
    [2.13, 'C+', 'grade-mid'],
    [1.94, 'C',  'grade-mid'],
    [1.50, 'D',  'grade-low'],
    [-Infinity, 'F', 'grade-poor']
];

// An agency is reported as one to avoid rather than an alternative exactly when
// it grades F, so the cutoff can never drift away from the bands above.
const ADVERTISER_WEAK_THRESHOLD = ADVERTISER_GRADE_BANDS.find(band => band[1] === 'D')[0];

/**
 * Average appeal of the selected tags across the audiences an agency reaches.
 * movieLean is the shared 0 = balanced / 1 = artistic / 2 = commercial code.
 */
function calculateAdvertiserMatch(scriptTags, movieLean, agency) {
    if (!scriptTags || scriptTags.length === 0 || !agency || !agency.targets) return 0;

    let totalScore = 0;
    let scoredTags = 0;

    for (const tag of scriptTags) {
        if (!tag || !tag.weights) continue;

        let sum = 0;
        let count = 0;
        for (const audience of agency.targets) {
            const weight = tag.weights[audience];
            if (Number.isFinite(weight)) {
                sum += weight;
                count++;
            }
        }

        if (count > 0) {
            totalScore += sum / count;
            scoredTags++;
        }
    }

    if (scoredTags === 0) return 0;

    let score = totalScore / scoredTags;

    // Universal agencies (type 0) never take a lean adjustment, and a balanced
    // script is not a mismatch — it leaves the specialists untouched too.
    if (agency.type !== 0 && movieLean !== 0) {
        score += (agency.type === movieLean) ? 0.25 : -0.2;
    }

    return Math.min(5, Math.max(0, score));
}

// tier is a CSS class rather than a colour literal, so the markup stays free of
// inline style attributes (see tests/domStructure.test.js).
function predictGradeFromScore(score) {
    const [, grade, tier] = ADVERTISER_GRADE_BANDS.find(([min]) => score >= min);
    return { grade, tier };
}

function generateReasoning(agency, score) {
    const audiences = agency.targets.join(', ');
    if (score >= 4.5) return `Strong appeal across ${audiences}.`;
    if (score >= 4.0) return `Good compatibility across ${audiences}.`;
    if (score >= ADVERTISER_WEAK_THRESHOLD) return `Adequate reach for ${audiences}, but not a standout.`;
    return `Your elements score poorly with ${audiences} — this campaign would underperform.`;
}

/**
 * Ranks every agency. Returns the best fit, the alternatives worth considering,
 * and the ones to avoid, each with the reasoning already attached.
 */
function getRecommendations(scriptConfig) {
    const agencies = GAME_DATA.adAgents || [];
    const tags = (scriptConfig && scriptConfig.tags) || [];

    if (agencies.length === 0 || tags.length === 0) {
        return { topRecommendation: null, alternatives: [], weakMatches: [], allScores: [] };
    }

    const movieLean = (scriptConfig && scriptConfig.movieLean) || 0;

    const ranked = agencies.map(agency => {
        const score = calculateAdvertiserMatch(tags, movieLean, agency);
        const { grade, tier } = predictGradeFromScore(score);
        return { agency, score, grade, tier, reasoning: generateReasoning(agency, score) };
    }).sort((a, b) =>
        b.score - a.score ||
        b.agency.level - a.agency.level ||
        a.agency.name.localeCompare(b.agency.name)
    );

    const rest = ranked.slice(1);
    return {
        topRecommendation: ranked[0],
        alternatives: rest.filter(r => r.score >= ADVERTISER_WEAK_THRESHOLD),
        weakMatches: rest.filter(r => r.score < ADVERTISER_WEAK_THRESHOLD),
        allScores: ranked
    };
}

function renderAdvertiserCard(entry, extraClass) {
    return `
        <div class="advertiser-card ${extraClass}">
            <div class="adv-name">${entry.agency.name}</div>
            <div class="adv-score">
                <span class="score-value ${entry.tier}">${entry.score.toFixed(2)}</span>
                <span class="score-grade">${entry.grade}</span>
            </div>
            <div class="adv-reasoning">${entry.reasoning}</div>
        </div>`;
}

function setupCollapsibleSections() {
    document.querySelectorAll('.collapsible-header').forEach(header => {
        header.addEventListener('click', function(e) {
            // Ignore clicks on buttons (Reset buttons)
            if (e.target.tagName === 'BUTTON') return;

            const targetId = this.getAttribute('data-toggle');
            const content = document.getElementById(targetId);
            const chevron = this.querySelector('.chevron');

            if (content && chevron) {
                content.classList.toggle('hidden');
                chevron.classList.toggle('rotate-90');
            }
        });
    });

    // Update excluded count whenever excluded items change
    updateExcludedCount();
    const excludedContainer = document.getElementById('selectors-container-excluded');
    if (excludedContainer) {
        const observer = new MutationObserver(() => updateExcludedCount());
        observer.observe(excludedContainer, { childList: true, subtree: true });
    }
}

function updateExcludedCount() {
    const excludedContainer = document.getElementById('selectors-container-excluded');
    const badge = document.getElementById('excluded-count');
    if (excludedContainer && badge) {
        const checkedCount = excludedContainer.querySelectorAll('input[type="checkbox"]:checked').length;
        badge.textContent = checkedCount;
    }
}

function displayAdvertiserRecommendations(recommendations) {
    const container = document.getElementById('adAgentDisplay');
    if (!container) return;

    if (!recommendations || !recommendations.topRecommendation) {
        container.innerHTML = '<div class="empty-state padded-empty">Select story elements to get recommendations.</div>';
        return;
    }

    const { topRecommendation, alternatives, weakMatches } = recommendations;
    const sections = [
        `<div class="rec-section">
            <div class="rec-header">Top Pick</div>
            ${renderAdvertiserCard(topRecommendation, 'top')}
        </div>`
    ];

    if (alternatives.length > 0) {
        sections.push(`<div class="rec-section rec-alternatives">
            <div class="rec-header">Alternatives</div>
            ${alternatives.map(a => renderAdvertiserCard(a, 'alt')).join('')}
        </div>`);
    }

    if (weakMatches.length > 0) {
        sections.push(`<div class="rec-section rec-weak">
            <div class="rec-header">Better Avoided</div>
            ${weakMatches.map(w => renderAdvertiserCard(w, 'weak')).join('')}
        </div>`);
    }

    container.innerHTML = `<div class="advertiser-recommendation">${sections.join('')}</div>`;
}
