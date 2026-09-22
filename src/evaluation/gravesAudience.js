(function(global) {
    "use strict";

    const BAND_STATE_KEY = 'graves-band-state';

    /**
     * localStorage can hold whatever a previous version, another tab or a stray
     * write left behind, and parsing it unguarded threw on anything malformed.
     *
     * The failure was quiet rather than loud. evaluateColmanGravesScript is
     * async, so the rejection was swallowed by the promise and nothing appeared
     * in the UI; the panels are unhidden earlier in the render, so they looked
     * populated while everything after this point silently never ran — the band
     * collapse handlers, and the Conflicts list, which then sat showing its
     * static placeholder as though the script had no conflicts at all.
     */
    function readBandState() {
        try {
            const parsed = JSON.parse(localStorage.getItem(BAND_STATE_KEY));
            return parsed && typeof parsed === 'object' ? parsed : {};
        } catch (error) {
            return {};
        }
    }

    function writeBandState(state) {
        try {
            localStorage.setItem(BAND_STATE_KEY, JSON.stringify(state));
        } catch (error) {
            // Private browsing and quota limits are not worth losing a render over.
        }
    }

    async function evaluateColmanGravesScript() {
        await ensureCompatibilityLoaded();
        clearFeedbackMessage('gravesFeedbackMessage');
        hideGravesBestMatches();
        // Clear any previous verdict up front, so a rejected script never leaves
        // the last script's results sitting next to the error message.
        hideGravesEvaluationResults();

        const selectedTags = collectTagInputs('graves');
        const missingRequiredCategories = getRequiredScriptCategories().filter(category =>
            !selectedTags.some(tag => tag.category === category)
        );

        if (missingRequiredCategories.length > 0) {
            showFeedbackMessage('gravesFeedbackMessage', `A script needs at least one ${missingRequiredCategories.join(', ')}.`, 'accent');
            return;
        }

        if (selectedTags.length < 5) {
            showFeedbackMessage('gravesFeedbackMessage', `Colman needs at least 5 story elements for a real script evaluation. You selected ${selectedTags.length}.`, 'accent');
            return;
        }

        if (selectedTags.length > 10) {
            showFeedbackMessage('gravesFeedbackMessage', `Colman evaluates up to 10 story elements at once. You selected ${selectedTags.length}.`, 'accent');
            return;
        }

        renderColmanGravesResults(calculateScriptEvaluation(selectedTags));
    }

    function getGravesVerdict(rawAverage) {
        return HACGravesAnalysis.getGravesVerdict(rawAverage);
    }

    function calculateGravesAudience(tags) {
        return HACGravesAnalysis.calculateGravesAudience(tags);
    }

    function gravesConflictSeverity(rawScore) {
        return HACGravesAnalysis.gravesConflictSeverity(rawScore);
    }

    function summarizeGravesConflicts(conflicts) {
        return HACGravesAnalysis.summarizeGravesConflicts(conflicts);
    }

    function findGravesConflicts(tags) {
        return HACGravesAnalysis.findGravesConflicts(tags);
    }

    function findGravesPairsByBand(tags) {
        return HACGravesAnalysis.findGravesPairsByBand(tags);
    }

    function formatFinalRating(value) {
        return HACGravesAnalysis.formatFinalRating(value);
    }

    function renderColmanGravesResults(evaluation) {
        const { matrix, bonuses, movieScores, tags } = evaluation;
        const verdict = getGravesVerdict(matrix.rawAverage);
        evaluation.pairsByBand = findGravesPairsByBand(tags);

        document.getElementById('results-graves').classList.remove('hidden');
        // Must stay in step with hideGravesEvaluationResults: a panel hidden
        // there and not revealed here disappears for good once Generate Best
        // Matches has run.
        ['graves-summary-row', 'graves-reading-panel', 'graves-breakdown-panel', 'graves-detail-row', 'graves-pairs-panel'].forEach(panelId => {
            const panel = document.getElementById(panelId);
            if (panel) panel.classList.remove('hidden');
        });

        const verdictEl = document.getElementById('gravesVerdictDisplay');
        verdictEl.textContent = verdict.label;
        setToneClass(verdictEl, verdict.tone);

        const averageEl = document.getElementById('gravesAverageDisplay');
        averageEl.innerHTML = `${matrix.rawAverage.toFixed(1)} <span class="sub-value">/ 5.0</span>`;
        setToneClass(averageEl, matrix.rawAverage >= 4.0 ? 'success' : (matrix.rawAverage < 3.0 ? 'danger' : 'accent'));

        const breakdownBase = document.getElementById('gravesBreakdownBaseScore');
        breakdownBase.innerText = formatScore(matrix.totalScore);
        setToneClass(breakdownBase, matrix.totalScore >= 0 ? 'success' : 'danger');

        const breakdownCom = document.getElementById('gravesBreakdownComBonus');
        breakdownCom.innerText = formatSimpleScore(bonuses.com);
        setToneClass(breakdownCom, bonuses.com > 0 ? 'success' : (bonuses.com < 0 ? 'danger' : 'neutral'));

        const breakdownArt = document.getElementById('gravesBreakdownArtBonus');
        breakdownArt.innerText = formatSimpleScore(bonuses.art);
        setToneClass(breakdownArt, bonuses.art > 0 ? 'art' : (bonuses.art < 0 ? 'danger' : 'neutral'));

        const totalComEl = document.getElementById('gravesTotalComScore');
        totalComEl.innerText = formatFinalRating(movieScores.commercial);
        setToneClass(totalComEl, movieScores.commercial > 0 ? 'accent' : 'danger');

        const totalArtEl = document.getElementById('gravesTotalArtScore');
        totalArtEl.innerText = formatFinalRating(movieScores.artistic);
        setToneClass(totalArtEl, movieScores.artistic > 0 ? 'art' : 'danger');

        document.getElementById('gravesScoreCapLabel').innerHTML =
            `Max Score Capped at <strong>${movieScores.tagCap}.0</strong> (${movieScores.scoringCount} Scoring Elements)`;

        document.getElementById('gravesVerdictText').textContent = verdict.text;
        document.getElementById('gravesMethodList').innerHTML = `
            <div class="graves-method-row">
                <span class="graves-method-label">Pair average</span>
                <span class="graves-method-value">${matrix.rawAverage.toFixed(2)}</span>
            </div>
            <div class="graves-method-row">
                <span class="graves-method-label">Script synergy</span>
                <span class="graves-method-value">${formatScore(matrix.totalScore)}</span>
            </div>
            <div class="graves-method-row">
                <span class="graves-method-label">Score cap</span>
                <span class="graves-method-value">${movieScores.tagCap}.0 from ${movieScores.scoringCount} scoring elements</span>
            </div>
        `;

        const audienceContainer = document.getElementById('gravesAudienceDisplay');
        audienceContainer.innerHTML = '';
        const audiences = evaluation.audience.slice(0, 6);
        if (audiences.length === 0) {
            audienceContainer.innerHTML = '<div class="empty-state">No clear audience pattern found.</div>';
        } else {
            audiences.forEach(audience => {
                const chip = document.createElement('div');
                chip.id = `graves-audience-${toDomId(audience.id)}`;
                chip.className = `audience-pill ${audience.strength >= 67 ? 'pill-best' : 'pill-moderate'}`;
                chip.dataset.role = 'graves-audience-pill';
                chip.dataset.audienceId = audience.id;
                chip.textContent = `${audience.name} ${audience.strength}%`;
                audienceContainer.appendChild(chip);
            });
        }

        // Render pairs grouped by band (successful, common, unsuccessful)
        const pairsContainer = document.getElementById('gravesPairsDisplay');
        if (pairsContainer) {
            const pairsByBand = evaluation.pairsByBand || {};
            const BAND_LABELS = {
                successful: 'Successful combinations',
                common: 'Common combinations',
                unsuccessful: 'Unsuccessful combinations'
            };
            const BAND_ORDER = ['successful', 'common', 'unsuccessful'];

            const bandMarkup = BAND_ORDER.map(band => {
                const pairs = pairsByBand[band] || [];
                if (pairs.length === 0) return '';

                const pairRows = pairs.map((pair, index) => {
                    const categorySlug = categoryToElementSlug(pair.secondCategory);
                    return `
                    <div id="graves-pair-${band}-${index + 1}" class="graves-pair-row ${categorySlug}">
                        <span class="graves-pair-names">
                            <span class="graves-pair-name">${pair.firstName}</span>
                            <span class="graves-pair-separator">&times;</span>
                            <span class="graves-pair-name">${pair.secondName}</span>
                        </span>
                        <div class="graves-pair-footer">
                            <span class="graves-pair-categories">${pair.firstCategory} &times; ${pair.secondCategory}</span>
                            <span class="graves-pair-score">${pair.rawScore.toFixed(2)}</span>
                        </div>
                    </div>
                `}).join('');

                return `
                    <div class="graves-pairs-band graves-pairs-band-${band}">
                        <h4 class="graves-pairs-band-title" data-band="${band}" role="button" aria-expanded="true" aria-label="Toggle ${BAND_LABELS[band]} pairs (${pairs.length})">
                            <span class="graves-pairs-band-toggle" aria-hidden="true"></span>
                            ${BAND_LABELS[band]} <small>(${pairs.length})</small>
                        </h4>
                        ${pairRows}
                    </div>
                `;
            }).join('');

            pairsContainer.innerHTML = bandMarkup || '<div class="empty-state">No element pairings found. All combinations are working well together.</div>';

            // Restore band collapse state from localStorage
            const collapsedBands = readBandState();

            pairsContainer.querySelectorAll('.graves-pairs-band').forEach(band => {
                const bandName = band.querySelector('[data-band]')?.dataset.band;
                if (bandName && collapsedBands[bandName]) {
                    band.classList.add('collapsed');
                    const title = band.querySelector('.graves-pairs-band-title');
                    if (title) title.setAttribute('aria-expanded', 'false');
                }
            });

            // Add click handlers for band collapsing with state persistence
            pairsContainer.querySelectorAll('.graves-pairs-band-title').forEach(title => {
                title.addEventListener('click', function() {
                    const band = this.closest('.graves-pairs-band');
                    const bandName = this.dataset.band;
                    band.classList.toggle('collapsed');
                    const isCollapsed = band.classList.contains('collapsed');
                    this.setAttribute('aria-expanded', !isCollapsed);

                    // Save band state to localStorage
                    const bandState = readBandState();
                    if (isCollapsed) {
                        bandState[bandName] = true;
                    } else {
                        delete bandState[bandName];
                    }
                    writeBandState(bandState);
                });
            });
        }

        const conflictContainer = document.getElementById('gravesConflictDisplay');
        const conflicts = evaluation.conflicts;
        const conflictPanel = document.getElementById('graves-conflicts-panel');
        const summary = summarizeGravesConflicts(conflicts);

        // The severity banner only earns its space when something is actually
        // wrong; a clean script gets the plain empty state it always had.
        if (conflictPanel) {
            conflictPanel.classList.toggle('has-conflicts', summary.total > 0);
            conflictPanel.dataset.conflictTone = summary.tone;
            conflictPanel.dataset.conflictCount = String(summary.total);
        }

        if (conflicts.length === 0) {
            conflictContainer.innerHTML = '<div class="empty-state">No severe Graves conflicts found.</div>';
        } else {
            const tally = [
                summary.severe ? `${summary.severe} severe` : '',
                summary.serious ? `${summary.serious} serious` : '',
                summary.mild ? `${summary.mild} mild` : ''
            ].filter(Boolean).join(' · ');

            const banner = `
                <div id="graves-conflict-summary" class="graves-conflict-summary tone-${summary.tone}">
                    <span class="graves-conflict-headline">${summary.headline}</span>
                    <span class="graves-conflict-tally">${tally}</span>
                </div>
            `;

            const rows = conflicts.map((conflict, index) => `
                <div id="graves-conflict-${index + 1}" class="spoiler-row graves-conflict-row severity-${conflict.severity}" data-severity="${conflict.severity}">
                    <span class="graves-conflict-pair">
                        ${conflict.firstName} clashes with ${conflict.secondName}
                        <span class="graves-conflict-categories">${conflict.firstCategory} &times; ${conflict.secondCategory}</span>
                    </span>
                    <span class="graves-raw-score">${conflict.rawScore.toFixed(1)}</span>
                </div>
            `).join('');

            conflictContainer.innerHTML = banner + rows;
        }

        document.getElementById('results-graves').scrollIntoView({ behavior: 'smooth' });
    }

    global.HACGravesAudience = {
        evaluateColmanGravesScript,
        getGravesVerdict,
        calculateGravesAudience,
        findGravesConflicts,
        findGravesPairsByBand,
        gravesConflictSeverity,
        summarizeGravesConflicts,
        renderColmanGravesResults
    };
})(globalThis);
