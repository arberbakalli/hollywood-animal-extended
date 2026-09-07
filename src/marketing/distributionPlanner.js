(function(global) {
    "use strict";

    const BASE_DECAY = 0.8;
    // Week 2 keeps half of week 1 (W2_MULT / W1_MULT), so it is a retention step
    // like every later week, just with a steeper rate.
    const BASE_WEEK_TWO_RETENTION = 0.5;
    // "Attendance will fall 25% more slowly": the drop shrinks by a quarter, so
    // 20% becomes 15% and 50% becomes 37.5%. One factor keeps every week
    // consistent instead of a separate magic number per step.
    const BEHEMOTH_SLOWER_FALL = 0.75;
    const BEHEMOTH_DECAY_MIN_SCORE = 9;
    const BEHEMOTH_WEEK_ONE_BOOST = 1.25;

    // Rounded because the raw arithmetic yields 0.8500000000000001, and the
    // week grid rounds up, so that dust surfaces as a whole extra screening.
    function easedRetention(baseRetention) {
        return Math.round((1 - (1 - baseRetention) * BEHEMOTH_SLOWER_FALL) * 1e6) / 1e6;
    }

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
    // considered. Every game modifier belongs here: the Behemoth policy text talks
    // about "the number of viewers" and "attendance", and both are demand.
    function weeklyDemand(commercialScore) {
        const config = distributionConfig();
        const decay = getDecayRate(commercialScore);
        const openingViewerMultiplier = getDistributionMultiplier();
        const behemothWeekOne = isBehemothActive() ? BEHEMOTH_WEEK_ONE_BOOST : 1;
        const weekTwoRatio = hasDecayBonus(commercialScore)
            ? easedRetention(BASE_WEEK_TWO_RETENTION) / BASE_WEEK_TWO_RETENTION
            : 1;

        const demand = [
            commercialScore * config.weekOneMultiplier * config.base,
            commercialScore * config.weekTwoMultiplier * config.base * weekTwoRatio
        ];
        for (let i = config.decayFromIndex; i < config.weeks; i++) {
            demand.push(demand[demand.length - 1] * decay);
        }

        return demand.map((value, index) => {
            const inOpeningWindow = index < config.openingWindow;
            let boosted = inOpeningWindow ? value * openingViewerMultiplier : value;
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

    /** Behemoth's slower fall applies only above a commercial rating of 9. */
    function hasDecayBonus(commercialScore) {
        return isBehemothActive() && commercialScore > BEHEMOTH_DECAY_MIN_SCORE;
    }

    function getDecayRate(commercialScore) {
        return hasDecayBonus(commercialScore) ? easedRetention(BASE_DECAY) : BASE_DECAY;
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
        hasDecayBonus,
        getDecayRate,
        easedRetention
    };
})(globalThis);
