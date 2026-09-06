// Shared classic-script state. Keep var bindings global so legacy tests and feature modules
// can migrate one slice at a time without changing runtime behavior.
var MULTI_SELECT_CATEGORIES = ["Supporting Character", "Theme & Event"];
var searchIndex = [];
// Per-input debounce handles for the category search boxes. Lost in the module
// split: searchIndex.js kept using it after the declaration stayed behind, so
// every keystroke threw and no filtering ran.
var searchDebounceTimers = new Map();
var currentTab = 'synergy';
var PRIMARY_TAB_BY_FEATURE = {
    generator: 'generator',
    synergy: 'synergy',
    graves: 'synergy',
    advertisers: 'advertisers',
    targeted: 'advertisers'
};
var generatedScriptsCache = [];
var pinnedScripts = [];
var localizationMap = {};
var currentLanguage = 'English';
var currentGenProfile = 'custom';
var startingProfileExcludedLoaded = false;
var compatibilityLoaded = false;
var genrePairsLoaded = false;
