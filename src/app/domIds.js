(function(global) {
    "use strict";

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

    global.HACDomIds = {
        toDomId,
        categoryToElementSlug
    };
})(globalThis);
