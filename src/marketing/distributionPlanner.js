(function(global) {
    "use strict";

    const BASE_DECAY = 0.8;
    const BEHEMOTH_DECAY = 0.85;
    const BEHEMOTH_DECAY_MIN_SCORE = 9;
    const BEHEMOTH_WEEK_ONE_BOOST = 1.25;

    function setupDistributionLogic() {
        const comInput = document.getElementById('comScoreInput');
        const comSlider = document.getElementById('comScoreSlider');
        const ownedInput = document.getElementById('ownedScreeningsInput');

        // Attach listeners
        if(comInput) comInput.addEventListener('input', recalculateDistribution);
        if(comSlider) comSlider.addEventListener('input', recalculateDistribution);
        if(ownedInput) ownedInput.addEventListener('input', recalculateDistribution);

        // Initial run
        recalculateDistribution();
    }

    function recalculateDistribution() {
        const comInput = document.getElementById('comScoreInput');
        const ownedInput = document.getElementById('ownedScreeningsInput');
        const scoreDisplay = document.getElementById('dist-com-score-display');

        const score = parseFloat(comInput?.value) || 0;
        const owned = parseInt(ownedInput?.value, 10) || 0;

        if(scoreDisplay) scoreDisplay.innerText = score.toFixed(1);
        updateDistributionGrid(score, owned);
    }

    // The publish window. The game commits a film for four weeks with an optional
    // four-week extension, and both the opening-viewer boost and the round-up rule
    // track that window, which is why one bound serves both.
    function distributionConfig() {
        const config = GAME_DATA.constants.DISTRIBUTION;
        return {
            base: config.multipliers.BASE,
            weekOneMultiplier: config.multipliers.WEEK_ONE,
            weekTwoMultiplier: config.multipliers.WEEK_TWO,
            weeks: config.weeklyCalculation.NUMBER_OF_WEEKS,
            // Weeks 1 and 2 are seeded from the score; every later week decays from
            // its predecessor. This is the index of the first decayed week, so it
            // must equal the number of seeded weeks below.
            decayFromIndex: config.weeklyCalculation.REDUCTION_START_INDEX,
            openingWindow: config.rounding.ROUND_UP_UNTIL_INDEX
        };
    }

    // Audience demand per week, in screenings, before any theatre capacity is
    // considered. The extracted game-file grid uses Commercial only: week 1 is
    // score * 2 * 1000, week 2 is score * 1 * 1000, then each later week keeps
    // 80% of the previous week (or 85% if Behemoth policy active and score > 9).
    function weeklyDemand(commercialScore) {
        const config = distributionConfig();
        const decay = getDecayRate(commercialScore);
        const openingViewerMultiplier = getDistributionMultiplier();
        const behemothWeekOne = isBehemothActive() ? BEHEMOTH_WEEK_ONE_BOOST : 1;

        const demand = [
            commercialScore * config.weekOneMultiplier * config.base,
            commercialScore * config.weekTwoMultiplier * config.base
        ];
        for (let i = config.decayFromIndex; i < config.weeks; i++) {
            demand.push(demand[demand.length - 1] * decay);
        }

        return demand.map((value, index) => {
            const inOpeningWindow = index < config.openingWindow;
            let boosted = inOpeningWindow ? value * openingViewerMultiplier : value;
            // Behemoth adds 25% to week 1 only
            if (index === 0) boosted *= behemothWeekOne;
            return inOpeningWindow ? Math.ceil(boosted) : Math.floor(boosted);
        });
    }

    // Splits each week's demand between the theatres the player owns and the
    // screenings they would have to rent. Renting is treated as unlimited, so
    // demand is always met and the only question is the split.
    //
    // Capacity is subtracted once, here, after every modifier has been applied to
    // demand. Subtracting it earlier and then decaying or boosting the remainder
    // compounds the capacity too, which is what this function replaced.
    function weeklyDistribution(commercialScore, availableScreenings) {
        const owned = Math.max(0, availableScreenings);
        return weeklyDemand(commercialScore).map((demand, index) => ({
            week: index + 1,
            demand,
            fromOwned: Math.min(demand, owned),
            rented: Math.max(0, demand - owned),
            ownedSpare: Math.max(0, owned - demand)
        }));
    }

    function updateDistributionGrid(commercialScore, availableScreenings) {
        const grid = document.getElementById('dist-results-grid');
        if (!grid) return;

        grid.innerHTML = '';

        weeklyDistribution(commercialScore, availableScreenings).forEach(week => {
            const needsRent = week.rented > 0;
            const box = document.createElement('div');
            box.className = `week-box ${needsRent ? 'needs-rent' : 'has-spare'}`;
            box.id = `dist-week-${week.week}`;
            box.dataset.week = String(week.week);
            box.dataset.demand = String(week.demand);
            box.dataset.fromOwned = String(week.fromOwned);
            box.dataset.rented = String(week.rented);
            box.dataset.ownedSpare = String(week.ownedSpare);
            if (week.demand > 0) box.classList.add('active-week');

            const splitLabel = needsRent
                ? `rent ${week.rented.toLocaleString()}`
                : `${week.ownedSpare.toLocaleString()} spare`;

            box.innerHTML = `
                <span class="week-label" id="dist-week-${week.week}-label">Week ${week.week}</span>
                <span class="week-val ${week.demand > 0 ? 'active' : ''}" id="dist-week-${week.week}-value">${week.demand.toLocaleString()}</span>
                <span class="week-split ${needsRent ? 'rent' : 'spare'}" id="dist-week-${week.week}-split">${splitLabel}</span>
            `;
            grid.appendChild(box);
        });
    }

    function initializeDistributionToggles() {
        ['strikingImageToggle', 'artisticAbilityToggle', 'behemothToggle']
            .map(id => document.getElementById(id))
            .filter(Boolean)
            .forEach(toggle => toggle.addEventListener('change', recalculateDistribution));
    }

    function getDistributionMultiplier() {
        const strikingImageToggle = document.getElementById('strikingImageToggle');
        const artisticAbilityToggle = document.getElementById('artisticAbilityToggle');
        const hasOpeningViewerBoost = Boolean(strikingImageToggle?.checked || artisticAbilityToggle?.checked);

        return hasOpeningViewerBoost ? 2 : 1;
    }

    function isBehemothActive() {
        return Boolean(document.getElementById('behemothToggle')?.checked);
    }

    // Behemoth slows attendance decay by 1.25x (15% drop instead of 20%), but only
    // above a commercial rating of 9. Base decay is 0.8 (20% weekly drop); Behemoth
    // decay is 0.85 (15% weekly drop) when score > 9.
    // NOTE: Behemoth values are from community interpretation, not verified game-file
    // extraction. Use with caution. See Lesson 7 in LESSONS_LEARNED.md.
    function getDecayRate(commercialScore) {
        const qualifies = isBehemothActive() && commercialScore > BEHEMOTH_DECAY_MIN_SCORE;
        return qualifies ? BEHEMOTH_DECAY : BASE_DECAY;
    }

    global.HACDistributionPlanner = {
        setupDistributionLogic,
        recalculateDistribution,
        updateDistributionGrid,
        weeklyDemand,
        weeklyDistribution,
        distributionConfig,
        initializeDistributionToggles,
        getDistributionMultiplier,
        isBehemothActive,
        getDecayRate
    };
})(globalThis);
