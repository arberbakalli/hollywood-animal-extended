(function(global) {
    "use strict";

    const BASE_DECAY = 0.8;
    const BEHEMOTH_DECAY = 0.85;
    const BEHEMOTH_DECAY_MIN_SCORE = 9;
    const BEHEMOTH_WEEK_ONE_BOOST = 1.25;
    const BOUTIQUE_DECAY_MIN_SCORE = 9;

    // Behemoth and Boutique each slow the weekly fall by a quarter of the base
    // 20%, on different gates: commercial rating for Behemoth, artistic rating
    // for Boutique. A studio can hold both, so a film clearing 9 on both axes
    // carries both modifiers. Stacking is additive on the fall (20% -> 15% ->
    // 10%), not compounding, which is the repository owner's reading; the game
    // text states the effect but not how two of them combine. Listed as exact
    // rates rather than computed, so the arithmetic cannot drift in floating
    // point.
    const DECAY_BY_ACTIVE_MODIFIERS = [BASE_DECAY, BEHEMOTH_DECAY, 0.9];

    function setupDistributionLogic() {
        const comInput = document.getElementById('comScoreInput');
        const comSlider = document.getElementById('comScoreSlider');
        const ownedInput = document.getElementById('ownedScreeningsInput');

        // Attach listeners
        if(comInput) comInput.addEventListener('input', recalculateDistribution);
        if(comSlider) comSlider.addEventListener('input', recalculateDistribution);
        if(ownedInput) ownedInput.addEventListener('input', recalculateDistribution);
        // Boutique gates on the artistic rating, so the grid has to react to it.
        ['artScoreInput', 'artScoreSlider']
            .map(id => document.getElementById(id))
            .filter(Boolean)
            .forEach(el => el.addEventListener('input', recalculateDistribution));

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
        updateStudioPolicyStatus();
    }

    // Each policy owns two independent gates, so the status line has to say which
    // half is live: Behemoth's boost rides on the budget the toggle stands for,
    // its slower decay on commercial > 9. Boutique only ever carries slower decay,
    // gated on artistic > 9. Pure so the wording can be pinned without a DOM.
    function describeStudioPolicies({ behemoth, boutique, commercialScore, artisticScore } = {}) {
        const parts = [];

        if (behemoth) {
            parts.push(commercialScore > BEHEMOTH_DECAY_MIN_SCORE
                ? 'Behemoth: +25% Boost + Slower Decay Active'
                : 'Behemoth: +25% Boost Active (Slower decay at commercial 9+)');
        }

        if (boutique) {
            parts.push(artisticScore > BOUTIQUE_DECAY_MIN_SCORE
                ? 'Boutique: Slower Decay Active'
                : 'Boutique: Slower Decay at artistic 9+');
        }

        return parts.join(' | ');
    }

    function updateStudioPolicyStatus() {
        const statusEl = document.getElementById('studio-policy-status');
        const artScoreText = document.getElementById('dist-artistic-score-text');
        const artScoreDisplay = document.getElementById('dist-art-score-display');
        const comScoreText = document.getElementById('dist-com-score-text');

        if (!statusEl) return;

        const commercialScore = parseFloat(document.getElementById('comScoreInput')?.value) || 0;
        const artisticScore = getArtisticScore();
        const boutique = isBoutiqueActive();
        const behemoth = isBehemothActive();

        const status = describeStudioPolicies({
            behemoth,
            boutique,
            commercialScore,
            artisticScore
        });

        if (artScoreDisplay) artScoreDisplay.innerText = artisticScore.toFixed(1);
        // Each score line follows the policy it belongs to: artistic to Boutique,
        // commercial to Behemoth. Commercial score still drives demand while
        // Behemoth is off; this line is about the policy's own gate, not the
        // baseline, and the grid shows the baseline either way.
        artScoreText?.classList.toggle('hidden', !boutique);
        comScoreText?.classList.toggle('hidden', !behemoth);

        statusEl.innerHTML = status;
        statusEl.classList.toggle('hidden', !status);
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
    // 80% of the previous week (or slower, if a studio policy qualifies).
    //
    // Pure: every modifier arrives as an argument, so the curve can be tested
    // without a DOM. weeklyDemand() below supplies the live UI state.
    function weeklyDemandFor(commercialScore, options = {}) {
        const config = distributionConfig();
        const behemoth = Boolean(options.behemoth);
        const boutique = Boolean(options.boutique);
        const artisticScore = options.artisticScore || 0;
        const openingMultiplier = options.openingMultiplier || 1;
        const holidayBonusPercent = options.holidayBonusPercent || 0;

        const decay = resolveDecayRate(commercialScore, artisticScore, behemoth, boutique);
        // Behemoth applies 25% boost to all weeks. Holiday bonus applies to week 1 only.
        const behemothMultiplier = behemoth ? BEHEMOTH_WEEK_ONE_BOOST : 1;
        const holidayBoost = 1 + holidayBonusPercent / 100;

        const demand = [
            commercialScore * config.weekOneMultiplier * config.base,
            commercialScore * config.weekTwoMultiplier * config.base
        ];
        for (let i = config.decayFromIndex; i < config.weeks; i++) {
            demand.push(demand[demand.length - 1] * decay);
        }

        return demand.map((value, index) => {
            const inOpeningWindow = index < config.openingWindow;
            let boosted = value * behemothMultiplier;
            boosted = inOpeningWindow ? boosted * openingMultiplier : boosted;
            if (index === 0) boosted *= holidayBoost;
            return inOpeningWindow ? Math.ceil(boosted) : Math.floor(boosted);
        });
    }

    function weeklyDemand(commercialScore) {
        return weeklyDemandFor(commercialScore, {
            behemoth: isBehemothActive(),
            boutique: isBoutiqueActive(),
            artisticScore: getArtisticScore(),
            openingMultiplier: getDistributionMultiplier(),
            holidayBonusPercent: getHolidayBonusPercent()
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
                <span class="week-val ${week.demand > 0 ? 'active' : ''}" id="dist-week-${week.week}-value" data-demand="${week.demand}">${week.demand.toLocaleString()}</span>
                <span class="week-split ${needsRent ? 'rent' : 'spare'}" id="dist-week-${week.week}-split">${splitLabel}</span>
            `;
            grid.appendChild(box);
        });
    }

    function initializeDistributionToggles() {
        ['strikingImageToggle', 'artisticAbilityToggle', 'behemothToggle', 'boutiqueToggle']
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

    // The chosen release window, set from the Holiday Release panel. Null means
    // no holiday was picked, which is the ordinary case.
    let holidayRelease = null;

    function setHolidayRelease(holiday) {
        holidayRelease = holiday;
        recalculateDistribution();
    }

    function clearHolidayRelease() {
        holidayRelease = null;
        recalculateDistribution();
    }

    function getHolidayRelease() {
        return holidayRelease;
    }

    function getHolidayBonusPercent() {
        return holidayRelease ? holidayRelease.bonusPercent : 0;
    }

    function isBoutiqueActive() {
        return Boolean(document.getElementById('boutiqueToggle')?.checked);
    }

    function getArtisticScore() {
        return parseFloat(document.getElementById('artScoreInput')?.value) || 0;
    }

    // Both policies are quoted verbatim in the game's own string table:
    //   localization/English.json:12479  Behemoth — "Attendance of films with a
    //     commercial rating above 9 will fall 25% more slowly."
    //   localization/English.json:12490  Boutique — "Attendance for films with an
    //     artistic rating above 9 will fall 25% more slowly."
    // Both gates are strictly above 9, matching "above" in those strings.
    function resolveDecayRate(commercialScore, artisticScore, behemothActive, boutiqueActive) {
        const modifiers =
            (behemothActive && commercialScore > BEHEMOTH_DECAY_MIN_SCORE ? 1 : 0) +
            (boutiqueActive && artisticScore > BOUTIQUE_DECAY_MIN_SCORE ? 1 : 0);

        return DECAY_BY_ACTIVE_MODIFIERS[Math.min(modifiers, DECAY_BY_ACTIVE_MODIFIERS.length - 1)];
    }

    function getDecayRate(commercialScore, artisticScore = getArtisticScore()) {
        return resolveDecayRate(commercialScore, artisticScore, isBehemothActive(), isBoutiqueActive());
    }

    global.HACDistributionPlanner = {
        setupDistributionLogic,
        recalculateDistribution,
        updateDistributionGrid,
        weeklyDemand,
        weeklyDemandFor,
        weeklyDistribution,
        setHolidayRelease,
        clearHolidayRelease,
        getHolidayRelease,
        getHolidayBonusPercent,
        distributionConfig,
        describeStudioPolicies,
        updateStudioPolicyStatus,
        initializeDistributionToggles,
        getDistributionMultiplier,
        isBehemothActive,
        isBoutiqueActive,
        getArtisticScore,
        resolveDecayRate,
        getDecayRate
    };
})(globalThis);
