export const LAB_STORAGE_KEY = 'hac.testing-features.releases.v1';

export function finiteNumber(value, label, min = 0, max = Infinity) {
    if (value === '' || value === null || value === undefined || !Number.isFinite(Number(value))) throw new Error(`${label} needs a number.`);
    const number = Number(value);
    if (number < min || number > max) throw new Error(`${label} must be between ${min} and ${max}.`);
    return number;
}

export function releaseCurve(weeklyDemandFor, commercialScore, options, factoryPercent) {
    const baseline = weeklyDemandFor(commercialScore, options);
    const percent = finiteNumber(factoryPercent, 'Factory boost', 0, 100);
    return baseline.map((demand, index) => ({ week: index + 1, baseline: demand,
        scenario: index === 0 ? Math.ceil(demand * (100 + percent) / 100) : demand }));
}

export function calibrateAttendance(screenings, attendancePercent, predictedDemand) {
    const capacity = finiteNumber(screenings, 'Screenings', 1);
    const occupancy = finiteNumber(attendancePercent, 'Attendance', 0, 100);
    const prediction = finiteNumber(predictedDemand, 'Predicted screening demand');
    const occupiedEquivalent = capacity * occupancy / 100;
    return { occupiedEquivalent, gap: prediction - occupiedEquivalent,
        ratio: occupiedEquivalent > 0 ? prediction / occupiedEquivalent : null };
}

export function campaignCoverage(agencies, selectedIds, wantedAudiences) {
    const selected = agencies.filter(agency => selectedIds.includes(agency.id));
    const covered = new Set(selected.flatMap(agency => agency.targets));
    return { selected, covered: [...covered], missing: wantedAudiences.filter(audience => !covered.has(audience)),
        spillover: [...covered].filter(audience => !wantedAudiences.includes(audience)) };
}

export function rankGenreElements(tags, selectedGenreId, scorePair, excludedIds = new Set(), category = '', rankBy = 'pairs', query = '') {
    const genres = tags.filter(tag => tag.category === 'Genre' && (!excludedIds.has(tag.id) || tag.id === selectedGenreId));
    const selectedIndex = genres.findIndex(tag => tag.id === selectedGenreId);
    if (selectedIndex < 0) throw new Error('Choose a genre.');
    const available = tags.filter(tag => tag.category !== 'Genre' && tag.category !== 'Setting' && !excludedIds.has(tag.id))
        .map(tag => {
            const scores = genres.map(genre => scorePair(genre, tag));
            return { tag, score: scores[selectedIndex],
                strongAcrossGenres: scores.filter(score => score >= 4).length,
                unsuccessfulAcrossGenres: scores.filter(score => score < 2).length };
        });
    const fittingPool = available.filter(row => row.score >= 4);
    const rows = available.filter(row => (!category || row.tag.category === category)
        && row.tag.name.toLowerCase().includes(query.trim().toLowerCase())).map(row => {
        const scores = fittingPool.filter(partner => partner.tag.id !== row.tag.id)
            .map(partner => scorePair(row.tag, partner.tag));
        return { ...row, strongPairs: scores.filter(score => score >= 4).length,
            unsuccessfulPairs: scores.filter(score => score < 2).length };
    });
    rows.sort((a, b) => {
        const priority = rankBy === 'cross'
            ? b.strongAcrossGenres - a.strongAcrossGenres || b.score - a.score
            : rankBy === 'pairs'
                ? Number(b.score >= 4) - Number(a.score >= 4) || b.strongPairs - a.strongPairs
                    || a.unsuccessfulPairs - b.unsuccessfulPairs || b.score - a.score
                : b.score - a.score || b.strongPairs - a.strongPairs;
        return priority || a.tag.name.localeCompare(b.tag.name);
    });
    return { rows, genreCount: genres.length, genrePoolSize: fittingPool.length,
        successful: rows.filter(row => row.score >= 4).length,
        unsuccessful: rows.filter(row => row.score < 2).length };
}

export const AWARD_TARGETS = {
    boxOffice: { name: 'Box Office Success', metric: 'Box office receipts', guidance: 'Compare audience reach, campaign costs and observed attendance. A high advertiser grade alone does not establish profit.' },
    critics: { name: 'Critical Acclaim', metric: 'Critics ratings', guidance: 'Explore artistic rating and creative choices. The award cutoff and exact critics formula are not yet confirmed.' },
    fans: { name: 'Fan Favorites', metric: 'Kinomark rating', guidance: 'Explore commercial rating and audience satisfaction. The exact award cutoff is not yet confirmed.' }
};

export function recentElementUse(releases, referenceDate, windowDays = 500) {
    const reference = Date.parse(`${referenceDate}T00:00:00Z`);
    if (!Number.isFinite(reference)) throw new Error('Choose an in-game date.');
    const result = new Map();
    releases.forEach(release => {
        const age = (reference - Date.parse(`${release.date}T00:00:00Z`)) / 86400000;
        if (age < 0 || age > windowDays) return;
        release.tags.forEach(id => result.set(id, (result.get(id) || 0) + 1));
    });
    return result;
}

export function validateRelease(release, tagIds) {
    if (!release || typeof release.title !== 'string' || !release.title.trim()) throw new Error('Enter a film title.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(release.date || '') || !Number.isFinite(Date.parse(`${release.date}T00:00:00Z`))) throw new Error('Choose a valid release date.');
    if (new Date(`${release.date}T00:00:00Z`).toISOString().slice(0, 10) !== release.date) throw new Error('Choose a valid release date.');
    if (!Array.isArray(release.tags) || !release.tags.length || release.tags.some(id => !tagIds.has(id))) throw new Error('Choose at least one known element.');
    if (new Set(release.tags).size !== release.tags.length) throw new Error('A film cannot repeat an element.');
    return { title: release.title.trim(), date: release.date, tags: [...release.tags] };
}

export function unlockInfo(id, starterIds, condition, recipe) {
    if (starterIds.includes(id)) return { kind: 'starter', text: 'Available at the start of a new game.' };
    const source = condition || '';
    if (source === 'DATE:>=1929' || source === 'DATE:>=01-01-1929') {
        return { kind: 'starter', text: 'Available at the start of a new game.' };
    }
    const fullDate = /^DATE:(>=|>)(\d{2})-(\d{2})-(\d{4})$/.exec(source);
    if (fullDate) {
        const [, operator, day, month, year] = fullDate;
        if (Number(year) > 2100 || operator === '>') return { kind: 'unknown', text: 'Unlock timing unclear in game data.' };
        return { kind: 'date', text: `Unlocks on or after ${year}-${month}-${day}.` };
    }
    const yearOnly = /^DATE:(>=|>)(\d{4})$/.exec(source);
    if (yearOnly) {
        const [, operator, year] = yearOnly;
        if (operator === '>' || Number(year) > 2100) return { kind: 'unknown', text: 'Unlock timing unclear in game data.' };
        return { kind: 'date', text: `Unlocks in or after ${year}.` };
    }
    const recipeCondition = /^(RECIPE|RECIPE_START|RECIPE_TRASH):(.+)$/.exec(source);
    if (recipeCondition) {
        const [, recipeType, ingredients] = recipeCondition;
        const labels = {
            RECIPE: 'Unlocked through a story recipe.',
            RECIPE_START: 'Available through a starting recipe.',
            RECIPE_TRASH: 'Unlocked through the Trash King policy recipe.'
        };
        return { kind: recipeType === 'RECIPE_TRASH' ? 'trash-recipe' : 'recipe',
            recipeType, text: labels[recipeType], requirements: recipe?.sourceTagIds?.length ? recipe.sourceTagIds : ingredients.split(':') };
    }
    return { kind: 'unknown', text: 'Unlock timing unclear in game data.' };
}
