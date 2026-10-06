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

// Element Preservation (GAME_RULES section 9). The weights are the calculator's
// advice, not a game rule, and the page shows them.
export const PRESERVATION_CATEGORIES = ['Protagonist', 'Antagonist', 'Supporting Character', 'Theme & Event', 'Finale'];
const AGE_BUCKETS = { Protagonist: 'protagonists', Antagonist: 'antagonists', 'Supporting Character': 'supportingCharacters' };
const MULTI_SLOT = new Set(['Supporting Character', 'Theme & Event']);
const AGE_RATING = { Good: 1, Neutral: 0.5, Bad: 0 };

export const PRESERVATION_PRESETS = {
    balanced: { name: 'Balanced', weights: { reach: 3, safety: 2, slots: 2, age: 2, cast: 1, bonus: 1, genre: 3 } },
    power: { name: 'Power scorer', weights: { reach: 4, safety: 1, slots: 1, age: 0, cast: 0, bonus: 2, genre: 3 } },
    career: { name: 'Career stable', weights: { reach: 2, safety: 2, slots: 1, age: 4, cast: 2, bonus: 0.5, genre: 3 } }
};

export const PRESERVATION_PARTS = {
    reach: 'Pair reach', safety: 'Few conflicts', slots: 'Slots per script', age: 'Age durability',
    cast: 'Cast flexibility', bonus: 'Direct score bonus', genre: 'Genre fit'
};

function ageDurability(tag, ageData) {
    const bucket = AGE_BUCKETS[tag.category];
    if (!bucket) return { value: 1, label: 'Not an actor role', known: true };
    const ratings = ageData?.[bucket]?.[tag.id]?.ratings;
    if (!ratings) return { value: null, label: 'No age data', known: false };
    const [young, mid, old] = ['YOUNG', 'MID', 'OLD'].map(group => AGE_RATING[ratings[group]] ?? 0.5);
    const label = young + mid + old === 3 ? 'All ages'
        : old === 0 ? 'Weak late-career'
            : young === 1 && mid < 1 && old < 1 ? 'Young-only'
                : [young, mid, old].includes(0) ? 'Mixed by age' : 'Most ages';
    return { value: (young + mid + old) / 3, label, known: true };
}

function castFlexibility(tag) {
    if (!AGE_BUCKETS[tag.category]) return { value: 1, label: 'Any cast' };
    if (tag.gender === 'M') return { value: 0, label: 'Male only' };
    if (tag.gender === 'F') return { value: 0, label: 'Female only' };
    return { value: 1, label: tag.gender === 'U' ? 'Any gender' : 'Group role' };
}

const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;

function preservationReasons(row, weights) {
    const phrases = {
        reach: () => `Pairs well with ${plural(row.strongLinks, 'element')}`,
        safety: () => (row.conflicts ? `Only ${plural(row.conflicts, 'conflict')}` : 'No conflicts'),
        slots: () => 'A script can use several',
        age: () => (row.age.known ? `Age: ${row.age.label}` : null),
        cast: () => row.cast.label,
        bonus: () => `Direct bonus ${row.bonus > 0 ? '+' : ''}${row.bonus.toFixed(2)}`,
        genre: () => `Fits ${row.genreScores.map(item => item.genre.name).join(' + ')}`
    };
    return Object.keys(weights)
        .filter(key => weights[key] > 0 && row.parts[key] >= 0.75)
        .sort((a, b) => weights[b] * row.parts[b] - weights[a] * row.parts[a])
        .map(key => phrases[key]()).filter(Boolean).slice(0, 2);
}

function preservationCaveats(row) {
    const caveats = [];
    if (!MULTI_SLOT.has(row.tag.category)) caveats.push('One per script');
    if (!row.age.known) caveats.push('No age data');
    else if (AGE_BUCKETS[row.tag.category] && row.age.value < 0.75) caveats.push('Actor-age sensitive');
    if (row.cast.value === 0) caveats.push(row.cast.label);
    if (row.conflicts) caveats.push(`Clashes with ${plural(row.conflicts, 'element')}`);
    row.genreScores.filter(item => item.score < 2).forEach(item => caveats.push(`Poor fit with ${item.genre.name}`));
    if (row.bonus < 0) caveats.push('Lowers scores directly');
    return caveats;
}

export function rankPreservation(tags, { scorePair, ageData, excludedIds = new Set(), genreIds = [], preset = 'balanced' } = {}) {
    const strategy = PRESERVATION_PRESETS[preset];
    if (!strategy) throw new Error(`Unknown strategy: ${preset}.`);
    if (genreIds.length > 2) throw new Error('Choose at most two genres.');
    const genres = tags.filter(tag => tag.category === 'Genre');
    const picked = genreIds.map(id => {
        const genre = genres.find(item => item.id === id);
        if (!genre) throw new Error('Choose a known genre.');
        return genre;
    });
    const listedGenres = genres.filter(genre => !excludedIds.has(genre.id));
    const candidates = tags.filter(tag => PRESERVATION_CATEGORIES.includes(tag.category) && !excludedIds.has(tag.id));
    const fitOf = tag => (picked.length ? picked.reduce((sum, genre) => sum + scorePair(genre, tag), 0) / picked.length : null);
    const pool = picked.length ? candidates.filter(tag => fitOf(tag) >= 4) : candidates;

    const base = candidates.map(tag => {
        const partners = pool.filter(partner => partner.id !== tag.id).map(partner => scorePair(tag, partner));
        return {
            tag,
            strongLinks: partners.filter(score => score >= 4).length,
            conflicts: partners.filter(score => score < 2).length,
            genreFit: fitOf(tag),
            genreScores: picked.map(genre => ({ genre, score: scorePair(genre, tag) })),
            bestGenres: listedGenres.map(genre => ({ genre, score: scorePair(genre, tag) }))
                .filter(item => item.score >= 4)
                .sort((a, b) => b.score - a.score || a.genre.name.localeCompare(b.genre.name))
                .slice(0, 3).map(item => item.genre.name),
            age: ageDurability(tag, ageData),
            cast: castFlexibility(tag),
            bonus: (Number(tag.com) || 0) + (Number(tag.art) || 0)
        };
    });
    const rated = base.filter(row => AGE_BUCKETS[row.tag.category] && row.age.known).map(row => row.age.value);
    const ageNeutral = rated.length ? rated.reduce((sum, value) => sum + value, 0) / rated.length : 0.5;
    const maxStrong = Math.max(0, ...base.map(row => row.strongLinks));
    const maxConflicts = Math.max(0, ...base.map(row => row.conflicts));
    const minBonus = Math.min(...base.map(row => row.bonus));
    const maxBonus = Math.max(...base.map(row => row.bonus));
    const weights = { ...strategy.weights };
    if (!picked.length) delete weights.genre;
    const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);

    const rows = base.map(row => {
        const parts = {
            reach: maxStrong ? row.strongLinks / maxStrong : 0,
            safety: maxConflicts ? 1 - row.conflicts / maxConflicts : 1,
            slots: MULTI_SLOT.has(row.tag.category) ? 1 : 0.5,
            age: row.age.value ?? ageNeutral,
            cast: row.cast.value,
            bonus: maxBonus > minBonus ? (row.bonus - minBonus) / (maxBonus - minBonus) : 0.5
        };
        if (picked.length) parts.genre = (row.genreFit - 1) / 4;
        const score = Object.entries(weights).reduce((sum, [key, weight]) => sum + weight * parts[key], 0) / totalWeight * 100;
        return { ...row, parts, score };
    }).sort((a, b) => b.score - a.score || a.tag.name.localeCompare(b.tag.name))
        .map((row, index) => ({ ...row, rank: index + 1, top: index < 5,
            reasons: preservationReasons(row, weights), caveats: preservationCaveats(row) }));
    const bestByCategory = PRESERVATION_CATEGORIES.map(category => rows.find(row => row.tag.category === category)).filter(Boolean);
    return { rows, top: rows.slice(0, 5), bestByCategory, poolSize: pool.length, genres: picked, ageNeutral, weights, preset: strategy.name };
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
