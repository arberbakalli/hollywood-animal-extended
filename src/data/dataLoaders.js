(function(global) {
    "use strict";

    async function loadExternalData() {
        try {
            // Load only essential data at startup; defer compatibility (2.5MB) and genrePairs
            const [tagRes, weightRes] = await Promise.all([
                fetch('data/TagData.json'),
                fetch('data/TagsAudienceWeights.json')
            ]);
            if (!tagRes.ok || !weightRes.ok) {
                throw new Error(`story element data responded ${tagRes.status} / ${weightRes.status}`);
            }
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
        } catch (e) {
            // There is no local fallback to relax into: data.js ships tags: {}, so
            // swallowing this leaves the app with no story elements at all.
            throw new Error(`Story element data could not be loaded: ${e.message}`, { cause: e });
        }
    }

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

    global.HACDataLoaders = {
        loadExternalData,
        ensureCompatibilityLoaded,
        ensureGenrePairsLoaded
    };
})(globalThis);
