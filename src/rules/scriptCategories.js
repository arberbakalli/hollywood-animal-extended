(function(global, root) {
    "use strict";

    // One runtime source for script shape. Consumers must not add category lists.
    const rules = Object.freeze({
        requiredCategories: Object.freeze(['Genre', 'Setting', 'Protagonist']),
        mandatoryStoryCategories: Object.freeze(['Protagonist']),
        optionalStoryCategories: Object.freeze(['Antagonist', 'Finale'])
    });
    global.HACScriptRules = rules;
    root.HACScriptRules = rules;
})(typeof window !== 'undefined' ? window : globalThis, globalThis);
