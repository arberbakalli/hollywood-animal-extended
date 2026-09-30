(function(global) {
    "use strict";

    const SCRIPT_BUILDER_CONTEXTS = [
        'generator',
        'graves',
        'advertisers',
        'targeted'
    ];

    const EXCLUSION_CONSUMER_CONTEXTS = [...SCRIPT_BUILDER_CONTEXTS];

    function scriptBuilderContexts() {
        return [...SCRIPT_BUILDER_CONTEXTS];
    }

    function exclusionConsumerContexts() {
        return [...EXCLUSION_CONSUMER_CONTEXTS];
    }

    function contextUsesGlobalExclusions(context) {
        return SCRIPT_BUILDER_CONTEXTS.includes(context);
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

    global.HACSelectorExclusions = {
        canUseTagInContext,
        clearExcludedSelectionsInCategory,
        contextUsesGlobalExclusions,
        excludedTagFeedbackMessage,
        exclusionConsumerContexts,
        filterTagsForContext,
        getExcludedIdsForContext,
        isTagExcludedForContext,
        scriptBuilderContexts
    };
})(globalThis);
