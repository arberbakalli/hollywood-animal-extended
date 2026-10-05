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

export function uniqueScripts(candidates) {
    if (!Array.isArray(candidates)) throw new Error('Candidates must be a JSON array of scripts.');
    const seen = new Set();
    const unique = [];
    candidates.forEach((tags, index) => {
        if (!Array.isArray(tags) || !tags.length || tags.some(id => typeof id !== 'string' || !id)) throw new Error(`Script ${index + 1} needs a nonempty array of element IDs.`);
        if (new Set(tags).size !== tags.length) throw new Error(`Script ${index + 1} contains a repeated element.`);
        const signature = JSON.stringify([...tags].sort());
        if (!seen.has(signature)) { seen.add(signature); unique.push([...tags]); }
    });
    return { scripts: unique, removed: candidates.length - unique.length };
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

export function unlockInfo(id, starterIds, condition) {
    if (starterIds.includes(id)) return { kind: 'starter', text: 'Available at the start of a new game.' };
    const date = /^DATE:>=(\d{2})-(\d{2})-(\d{4})$/.exec(condition || '');
    if (date) return { kind: 'date', text: `Unlocks on or after ${date[3]}-${date[2]}-${date[1]}.` };
    if (condition?.startsWith('RECIPE:')) return { kind: 'recipe', requirements: condition.slice(7).split(':') };
    return { kind: 'unknown', text: 'Not in the starting pool. Unlock condition has not been recovered from the game files.' };
}
