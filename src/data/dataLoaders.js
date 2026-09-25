(function(global) {
    "use strict";

    const HOLIDAY_AUDIENCES = ['TM', 'TF', 'YM', 'YF', 'AM', 'AF'];
    const HOLIDAY_TIERS = [
        { key: '0', name: 'base' },
        { key: '1', name: 'artistic' },
        { key: '2', name: 'commercial' }
    ];
    const HOLIDAY_NAMES = {
        VALENTINE: "Valentine's Day",
        INDEPENDENCE_DAY: 'Independence Day',
        THANKSGIVING: 'Thanksgiving',
        HALLOWEEN: 'Halloween',
        MEMORIAL_DAY: 'Memorial Day',
        CHRISTMAS: 'Christmas'
    };
    const HOLIDAY_ORDER = [
        'VALENTINE',
        'HALLOWEEN',
        'THANKSGIVING',
        'INDEPENDENCE_DAY',
        'MEMORIAL_DAY',
        'CHRISTMAS'
    ];

    async function loadExternalData() {
        try {
            // Load only essential data at startup; defer compatibility (2.5MB) and genrePairs
            const [tagRes, weightRes, holidayRes] = await Promise.all([
                fetch('data/TagData.json'),
                fetch('data/TagsAudienceWeights.json'),
                fetch('data/Holidays.json')
            ]);
            if (!tagRes.ok || !weightRes.ok || !holidayRes.ok) {
                throw new Error(`story element data responded ${tagRes.status} / ${weightRes.status} / ${holidayRes.status}`);
            }
            const tagDataRaw = await tagRes.json();
            const weightDataRaw = await weightRes.json();
            const holidayDataRaw = await holidayRes.json();

            GAME_DATA.holidays = normalizeHolidays(holidayDataRaw);

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

    function normalizeHolidays(source) {
        if (!source || typeof source !== 'object') return [];

        return Object.entries(source)
            .sort(([a], [b]) => holidaySortIndex(a) - holidaySortIndex(b))
            .map(([id, holiday]) => normalizeHoliday(id, holiday));
    }

    function holidaySortIndex(id) {
        const index = HOLIDAY_ORDER.indexOf(id);
        return index === -1 ? HOLIDAY_ORDER.length : index;
    }

    function normalizeHoliday(id, holiday) {
        const audienceBonuses = holiday.audienceBonuses || {};
        const bonuses = {};
        const tierBonuses = {};
        const bonusRanges = {};

        HOLIDAY_AUDIENCES.forEach(audience => {
            const values = HOLIDAY_TIERS.map(tier => {
                const raw = audienceBonuses[`${audience}|${tier.key}`];
                return raw === undefined ? 0 : parseFloat(raw) * 100;
            });
            const byTier = Object.fromEntries(HOLIDAY_TIERS.map((tier, index) => [
                tier.name,
                roundPercent(values[index])
            ]));
            const average = values.reduce((sum, value) => sum + value, 0) / values.length;

            bonuses[audience] = roundPercent(average);
            tierBonuses[audience] = byTier;
            bonusRanges[audience] = {
                min: roundPercent(Math.min(...values)),
                max: roundPercent(Math.max(...values))
            };
        });

        return {
            id,
            sourceId: id,
            name: HOLIDAY_NAMES[id] || beautifyTagName(id),
            dateType: holiday.dateType,
            day: holiday.day,
            month: holiday.month,
            dayOfWeek: holiday.dayOfWeek,
            bonuses,
            tierBonuses,
            bonusRanges
        };
    }

    function roundPercent(value) {
        return Math.round(value * 10) / 10;
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
        normalizeHolidays,
        ensureCompatibilityLoaded,
        ensureGenrePairsLoaded
    };
})(globalThis);
