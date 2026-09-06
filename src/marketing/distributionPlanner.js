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

    function updateDistributionGrid(commercialScore, availableScreenings) {
        const BASE = 1000;
        const W1_MULT = 2;
        const W2_MULT = 1;
        const decay = getDecayRate(commercialScore);
        const openingViewerMultiplier = getDistributionMultiplier();
        const behemothWeekOne = isBehemothActive() ? BEHEMOTH_WEEK_ONE_BOOST : 1;
        // Week 2 is a retention step too, so the slower fall lifts it by the same
        // ratio the rate improved. Later weeks then compound from the lifted value.
        const weekTwoRatio = hasDecayBonus(commercialScore)
            ? easedRetention(BASE_WEEK_TWO_RETENTION) / BASE_WEEK_TWO_RETENTION
            : 1;

        const rawW1 = (commercialScore * W1_MULT * BASE) - availableScreenings;
        const w1 = Math.max(0.0, rawW1);

        const rawW2 = (commercialScore * W2_MULT * BASE) - availableScreenings;
        const w2 = Math.max(0.0, rawW2) * weekTwoRatio;

        let calcValues = [w1, w2];
        let currentDecayBase = w2;

        for (let i = 2; i < 8; i++) {
            currentDecayBase *= decay;
            calcValues.push(currentDecayBase);
        }

        const finalResults = calcValues.map((val, index) => {
            // The opening boost covers weeks 1-4; Behemoth's is week 1 only.
            let boostedValue = index < 4 ? val * openingViewerMultiplier : val;
            if (index === 0) boostedValue *= behemothWeekOne;
            return index < 4 ? Math.ceil(boostedValue) : Math.floor(boostedValue);
        });

        const grid = document.getElementById('dist-results-grid');
        if(!grid) return;

        grid.innerHTML = '';
        finalResults.forEach((val, index) => {
            const weekNum = index + 1;
            const box = document.createElement('div');
            box.className = 'week-box';
            box.id = `dist-week-${weekNum}`;
            box.dataset.week = String(weekNum);
            box.dataset.screenings = String(val);
            // Highlight active weeks
            if (val > 0) box.classList.add('active-week');

            box.innerHTML = `
                <span class="week-label" id="dist-week-${weekNum}-label">Week ${weekNum}</span>
                <span class="week-val ${val > 0 ? 'active' : ''}" id="dist-week-${weekNum}-value">${val.toLocaleString()}</span>
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
        initializeDistributionToggles,
        getDistributionMultiplier,
        isBehemothActive,
        hasDecayBonus,
        getDecayRate,
        easedRetention
    };
})(globalThis);
