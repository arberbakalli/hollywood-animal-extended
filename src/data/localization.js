(function(global) {
    "use strict";

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

    global.HACLocalization = {
        changeLanguage,
        updateAllTagNames,
        parseWeights,
        beautifyTagName
    };
})(globalThis);
