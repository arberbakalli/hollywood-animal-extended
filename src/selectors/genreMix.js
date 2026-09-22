(function(global) {
    "use strict";

    const GENRE_PERCENT_STEP = 5;
    const GENRE_PERCENT_MIN = 5;

    function snapGenrePercent(value) {
        return Math.round(value / GENRE_PERCENT_STEP) * GENRE_PERCENT_STEP;
    }

    // Split `total` across `weights` in whole steps, never below the minimum,
    // summing to exactly `total`.
    function splitGenrePercent(total, weights) {
        const count = weights.length;
        if (count === 0) return [];
        const weightSum = weights.reduce((sum, weight) => sum + weight, 0);
        const raw = weights.map(weight =>
            weightSum > 0 ? (weight / weightSum) * total : total / count);
        const shares = raw.map(value =>
            Math.max(GENRE_PERCENT_MIN, Math.floor(value / GENRE_PERCENT_STEP) * GENRE_PERCENT_STEP));
        const remainders = raw.map((value, index) => value - shares[index]);
        let assigned = shares.reduce((sum, share) => sum + share, 0);

        while (assigned < total) {
            let best = 0;
            for (let i = 1; i < count; i++) if (remainders[i] > remainders[best]) best = i;
            shares[best] += GENRE_PERCENT_STEP;
            remainders[best] -= GENRE_PERCENT_STEP;
            assigned += GENRE_PERCENT_STEP;
        }
        while (assigned > total) {
            let best = -1;
            for (let i = 0; i < count; i++) {
                if (shares[i] - GENRE_PERCENT_STEP < GENRE_PERCENT_MIN) continue;
                if (best === -1 || shares[i] > shares[best]) best = i;
            }
            if (best === -1) break;
            shares[best] -= GENRE_PERCENT_STEP;
            assigned -= GENRE_PERCENT_STEP;
        }
        return shares;
    }

    function genreRows(context) {
        const container = document.getElementById(`inputs-${categoryToElementSlug('Genre')}-${context}`);
        return container ? Array.from(container.querySelectorAll('.genre-row')) : [];
    }

    function readGenrePercent(row) {
        const value = parseFloat(row.querySelector('.percent-input')?.value);
        return Number.isFinite(value) ? value : GENRE_PERCENT_MIN;
    }

    function writeGenrePercent(row, value) {
        const input = row.querySelector('.percent-input');
        const slider = row.querySelector('.percent-slider');
        if (!input || !slider) return;
        input.value = value;
        slider.value = value;
        updatePercentSliderTrack(slider);
    }

    function applyGenrePercent(context, changedRow, requestedValue) {
        const others = genreRows(context).filter(row => row !== changedRow);
        if (others.length === 0) {
            writeGenrePercent(changedRow, 100);
            return;
        }
        const ceiling = 100 - GENRE_PERCENT_MIN * others.length;
        const value = Math.min(ceiling,
            Math.max(GENRE_PERCENT_MIN, snapGenrePercent(requestedValue)));
        writeGenrePercent(changedRow, value);
        splitGenrePercent(100 - value, others.map(readGenrePercent))
            .forEach((share, index) => writeGenrePercent(others[index], share));
    }

    function updateGenreControls(context) {
        const rows = genreRows(context);
        if (rows.length === 0) return;

        if (rows.length === 1) {
            rows[0].querySelector('.genre-percent-wrapper')?.classList.add('hidden');
            writeGenrePercent(rows[0], 100);
            return;
        }

        const shares = splitGenrePercent(100, rows.map(() => 1));
        rows.forEach((row, index) => {
            row.querySelector('.genre-percent-wrapper')?.classList.remove('hidden');
            writeGenrePercent(row, shares[index]);
        });
    }

    global.HACGenreMix = {
        GENRE_PERCENT_MIN,
        GENRE_PERCENT_STEP,
        applyGenrePercent,
        splitGenrePercent,
        updateGenreControls,
        writeGenrePercent
    };
})(globalThis);
