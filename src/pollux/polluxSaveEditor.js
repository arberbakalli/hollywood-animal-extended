(function(global) {
    "use strict";

    const CATEGORIES = ['BEST_SCRIPT', 'BEST_DIRECTING', 'BEST_MALE_ROLE', 'BEST_FEMALE_ROLE', 'BEST_CINEMATOGRAPHY', 'BEST_MOVIE'];
    const CATEGORY_LABELS = {
        BEST_SCRIPT: 'Best Script', BEST_DIRECTING: 'Best Directing', BEST_MALE_ROLE: 'Best Male Role',
        BEST_FEMALE_ROLE: 'Best Female Role', BEST_CINEMATOGRAPHY: 'Best Cinematography', BEST_MOVIE: 'Best Movie'
    };
    const BUCKETS = ['prevYearsPolluxPretenders', 'thisYearsPolluxPretenders'];
    // timePassed counts days from the game's start date; checked against six real saves.
    const GAME_START_UTC = Date.UTC(1929, 0, 1);
    const DAY_MS = 86400000;
    const BOM = '﻿';

    class PolluxSaveError extends Error {}

    function parseSave(text) {
        if (typeof text !== 'string' || !text.trim()) throw new PolluxSaveError('The file is empty.');
        const hadBom = text.charCodeAt(0) === 0xFEFF;
        let root;
        try {
            root = JSON.parse(hadBom ? text.slice(1) : text);
        } catch {
            throw new PolluxSaveError('This file is not valid JSON. Choose the .json file from your Saves folder, not the .png or _map file.');
        }
        const state = root && root.stateJson;
        if (!state || typeof state !== 'object' || !Array.isArray(state.movies)) {
            throw new PolluxSaveError('This JSON is not a Hollywood Animal save: stateJson.movies is missing.');
        }
        if (!BUCKETS.some(key => state[key] && typeof state[key] === 'object')) {
            throw new PolluxSaveError('This save has no Pollux nominee data yet.');
        }
        return { root, state, hadBom };
    }

    function gameYear(state) {
        const days = parseInt(String(state.timePassed || ''), 10);
        if (!Number.isFinite(days)) return null;
        return new Date(GAME_START_UTC + days * DAY_MS).getUTCFullYear();
    }

    function movieTitle(movie) {
        return (movie && (movie.name || movie.Name)) || null;
    }

    function ceremonyYearOf(state, bucketKey) {
        const year = gameYear(state);
        if (year !== null) return bucketKey === 'prevYearsPolluxPretenders' ? year : year + 1;
        // No clock: the prev bucket belongs to the latest ceremony once its winners are recorded.
        const years = Object.keys(state.polluxHistory || {}).map(Number).filter(Number.isFinite);
        if (!years.length) return null;
        const latest = Math.max(...years);
        const bucketIds = new Set(Object.values(state.prevYearsPolluxPretenders || {}).flat().map(c => c && c.movieId));
        const winners = Object.values((state.polluxHistory[latest] || {}).winners || {});
        const prevYear = winners.length && winners.every(w => bucketIds.has(w.movieId)) ? latest : latest + 1;
        return bucketKey === 'prevYearsPolluxPretenders' ? prevYear : prevYear + 1;
    }

    function sameCandidate(a, b) {
        return !!a && !!b && a.movieId === b.movieId && a.category === b.category
            && a.profession === b.profession && (a.roleTagId ?? null) === (b.roleTagId ?? null)
            && JSON.stringify(a.talentIds || []) === JSON.stringify(b.talentIds || []);
    }

    function describeBuckets(state) {
        const owned = new Map(state.movies.map(movie => [movie.id, movie]));
        return BUCKETS.filter(key => state[key] && typeof state[key] === 'object').map(key => {
            const ceremonyYear = ceremonyYearOf(state, key);
            const record = ceremonyYear !== null ? (state.polluxHistory || {})[ceremonyYear] : null;
            const held = !!(record && record.winners);
            const categories = CATEGORIES.map(category => {
                const list = Array.isArray(state[key][category]) ? state[key][category] : [];
                const nominees = held ? ((record.nominees || {})[category] || []).map(entry => entry && entry.Value) : [];
                const currentWinner = held ? (record.winners || {})[category] || null : null;
                const candidates = list.map((candidate, index) => ({
                    index,
                    movieId: candidate.movieId,
                    title: movieTitle(owned.get(candidate.movieId)) || `Movie ${candidate.movieId}`,
                    owned: owned.has(candidate.movieId),
                    talentIds: candidate.talentIds || [],
                    roleTagId: candidate.roleTagId ?? null,
                    forceWinning: candidate.forceWinning === true,
                    recordedNominee: nominees.some(nominee => sameCandidate(nominee, candidate)),
                    currentWinner: sameCandidate(currentWinner, candidate)
                }));
                return { category, label: CATEGORY_LABELS[category], candidates, playerCandidates: candidates.filter(c => c.owned) };
            });
            return { key, ceremonyYear, held, categories };
        });
    }

    function defaultPicks(bucket) {
        const picks = {};
        bucket.categories.forEach(({ category, playerCandidates }) => {
            const preferred = playerCandidates.find(c => c.currentWinner)
                || playerCandidates.find(c => c.recordedNominee) || playerCandidates[0];
            if (preferred) picks[category] = preferred.index;
        });
        return picks;
    }

    function withoutAward(list, year, category) {
        return (Array.isArray(list) ? list : []).filter(entry => !(entry && entry.year === year && entry.category === category));
    }

    function hasAward(list, year, category) {
        return (Array.isArray(list) ? list : []).some(entry => entry && entry.year === year && entry.category === category);
    }

    function applyWinners(state, bucketKey, picks, { forceAllOwned = false } = {}) {
        const bucket = describeBuckets(state).find(b => b.key === bucketKey);
        if (!bucket) throw new PolluxSaveError('That nominee list is not in this save.');
        const allMovies = new Map([...(state.competitorMovies || []), ...state.movies].map(movie => [movie.id, movie]));
        const owned = new Set(state.movies.map(movie => movie.id));
        const people = new Map((state.characters || []).map(person => [person.id, person]));
        const summary = { ceremonyYear: bucket.ceremonyYear, held: bucket.held, forced: 0, winners: [], historyUpdated: false };

        Object.entries(picks || {}).forEach(([category, index]) => {
            if (!CATEGORIES.includes(category)) throw new PolluxSaveError(`Unknown award category ${category}.`);
            const list = state[bucketKey][category] || [];
            const candidate = list[index];
            if (!candidate || !owned.has(candidate.movieId)) {
                throw new PolluxSaveError(`The pick for ${CATEGORY_LABELS[category]} is not one of your films.`);
            }
            const described = bucket.categories.find(c => c.category === category).candidates[index];
            if (bucket.held && !described.recordedNominee) {
                throw new PolluxSaveError(`The pick for ${CATEGORY_LABELS[category]} is not one of the three nominees recorded for the ${bucket.ceremonyYear} ceremony.`);
            }

            list.forEach(entry => {
                const force = entry === candidate || (forceAllOwned && owned.has(entry.movieId));
                if (force && entry.forceWinning !== true) { entry.forceWinning = true; summary.forced++; }
            });
            summary.winners.push({ category, movieId: candidate.movieId, title: movieTitle(allMovies.get(candidate.movieId)) || `Movie ${candidate.movieId}` });

            // Before the ceremony the game reads forceWinning itself; writing history would record a ceremony that has not run.
            if (!bucket.held) return;
            const year = bucket.ceremonyYear;
            const record = state.polluxHistory[year];
            const previous = record.winners[category];
            const code = candidate.category;
            if (previous && !sameCandidate(previous, candidate)) {
                const loser = allMovies.get(previous.movieId);
                if (loser && previous.movieId !== candidate.movieId) {
                    loser.polluxes = withoutAward(loser.polluxes, year, code);
                    if (!hasAward(loser.nominations, year, code)) {
                        loser.nominations = [...(loser.nominations || []), { year, movId: loser.id, category: code }];
                    }
                }
                // Talents carry the award too; real saves record no talent nominations.
                (previous.talentIds || []).filter(id => !(candidate.talentIds || []).includes(id)).forEach(id => {
                    const person = people.get(id);
                    if (person) person.polluxes = withoutAward(person.polluxes, year, code);
                });
            }
            (candidate.talentIds || []).forEach(id => {
                const person = people.get(id);
                if (person && !hasAward(person.polluxes, year, code)) {
                    person.polluxes = [...(person.polluxes || []), { year, movId: candidate.movieId, category: code }];
                }
            });
            record.winners[category] = { ...candidate, forceWinning: true };
            const winner = allMovies.get(candidate.movieId);
            if (winner) {
                winner.nominations = withoutAward(winner.nominations, year, code);
                if (!hasAward(winner.polluxes, year, code)) {
                    winner.polluxes = [...(winner.polluxes || []), { year, movId: winner.id, category: code }];
                }
            }
            summary.historyUpdated = true;
        });
        return summary;
    }

    function serializeSave(root, hadBom) {
        return (hadBom ? BOM : '') + JSON.stringify(root);
    }

    function fixedFileName(name) {
        const base = String(name || 'save.json').replace(/\.json$/i, '');
        return `${base}.pollux-fixed.json`;
    }

    global.HACPolluxSaveEditor = {
        CATEGORIES,
        CATEGORY_LABELS,
        PolluxSaveError,
        parseSave,
        gameYear,
        describeBuckets,
        defaultPicks,
        applyWinners,
        serializeSave,
        fixedFileName
    };
})(globalThis);
