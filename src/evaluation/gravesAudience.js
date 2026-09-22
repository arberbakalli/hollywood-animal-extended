(function(global) {
    "use strict";

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
        if (rawAverage >= 4.0) {
            return {
                label: 'Success',
                tone: 'success',
                text: 'Graves sees a strong, marketable script. The selected elements reinforce each other cleanly.'
            };
        }

        if (rawAverage >= 3.5) {
            return {
                label: 'Common',
                tone: 'accent',
                text: 'Graves sees a viable script. It should work, but it is not a rare high-synergy combination.'
            };
        }

        if (rawAverage < 3.0) {
            return {
                label: 'Failed',
                tone: 'danger',
                text: 'Graves sees a weak fit. The premise may still be interesting, but the game data says these elements fight each other.'
            };
        }

        return {
            label: 'Risky',
            tone: 'neutral',
            text: 'Graves sees an uneven script. A few pairings may carry it, but the whole package is fragile.'
        };
    }

    function calculateGravesAudience(tags) {
        const affinity = Object.fromEntries(Object.keys(GAME_DATA.demographics).map(id => [id, 0]));

        tags.forEach(item => {
            const tagData = GAME_DATA.tags[item.id];
            if (!tagData || !tagData.weights) return;

            Object.keys(affinity).forEach(demoId => {
                affinity[demoId] += (tagData.weights[demoId] || 0) * item.percent;
            });
        });

        const maxAffinity = Math.max(1, ...Object.values(affinity));
        return Object.entries(affinity)
            .map(([id, score]) => ({
                id,
                name: GAME_DATA.demographics[id].name,
                score,
                strength: Math.round((score / maxAffinity) * 100)
            }))
            .filter(item => item.score > 0)
            .sort((a, b) => b.score - a.score);
    }

    const GRAVES_DANGER_LINE = 2.0;
    const GRAVES_SEVERE_BELOW = 1.0;
    const GRAVES_SERIOUS_BELOW = 1.5;

    // A script with one marginal clash and a structurally broken one both used to
    // render as an undifferentiated list. Grading the pairs is what lets the panel
    // say how much trouble the player is actually in.
    function gravesConflictSeverity(rawScore) {
        if (rawScore >= GRAVES_DANGER_LINE) return 'none';
        if (rawScore < GRAVES_SEVERE_BELOW) return 'severe';
        if (rawScore < GRAVES_SERIOUS_BELOW) return 'serious';
        return 'mild';
    }

    function summarizeGravesConflicts(conflicts) {
        const empty = {
            total: 0, severe: 0, serious: 0, mild: 0,
            worst: null, tone: 'none', headline: ''
        };
        if (!conflicts || conflicts.length === 0) return empty;

        const counts = conflicts.reduce((acc, conflict) => {
            const band = gravesConflictSeverity(conflict.rawScore);
            if (acc[band] !== undefined) acc[band] += 1;
            return acc;
        }, { severe: 0, serious: 0, mild: 0 });

        const worst = conflicts.reduce((lowest, conflict) =>
            conflict.rawScore < lowest.rawScore ? conflict : lowest);
        const tone = gravesConflictSeverity(worst.rawScore);

        const noun = conflicts.length === 1 ? 'pair' : 'pairs';
        const headline = `${conflicts.length} ${noun} below the danger line — worst is ${tone}`;

        return { total: conflicts.length, ...counts, worst, tone, headline };
    }

    function findGravesConflicts(tags) {
        const conflicts = [];

        const describe = tag => {
            const known = GAME_DATA.tags[tag.id];
            return {
                name: known ? known.name : tag.id,
                category: known ? known.category : ''
            };
        };

        for (let i = 0; i < tags.length; i++) {
            for (let j = i + 1; j < tags.length; j++) {
                const rawScore = getRawCompatibilityScore(tags[i], tags[j]);
                if (rawScore < GRAVES_DANGER_LINE) {
                    const first = describe(tags[i]);
                    const second = describe(tags[j]);
                    conflicts.push({
                        firstName: first.name,
                        secondName: second.name,
                        firstCategory: first.category,
                        secondCategory: second.category,
                        severity: gravesConflictSeverity(rawScore),
                        rawScore
                    });
                }
            }
        }

        return conflicts.sort((a, b) => a.rawScore - b.rawScore);
    }

    function findGravesPairsByBand(tags) {
        const STRONG_FIT_THRESHOLD = 4.0;
        const pairs = [];

        const describe = tag => {
            const known = GAME_DATA.tags[tag.id];
            return {
                name: known ? known.name : tag.id,
                category: known ? known.category : ''
            };
        };

        for (let i = 0; i < tags.length; i++) {
            for (let j = i + 1; j < tags.length; j++) {
                const rawScore = getRawCompatibilityScore(tags[i], tags[j]);
                const first = describe(tags[i]);
                const second = describe(tags[j]);

                let band = 'common';
                if (rawScore < 2.0) band = 'unsuccessful';
                else if (rawScore >= STRONG_FIT_THRESHOLD) band = 'successful';

                pairs.push({
                    firstName: first.name,
                    secondName: second.name,
                    firstCategory: first.category,
                    secondCategory: second.category,
                    rawScore,
                    band
                });
            }
        }

        // Group by band
        const grouped = {
            successful: pairs.filter(p => p.band === 'successful').sort((a, b) => b.rawScore - a.rawScore),
            common: pairs.filter(p => p.band === 'common').sort((a, b) => b.rawScore - a.rawScore),
            unsuccessful: pairs.filter(p => p.band === 'unsuccessful').sort((a, b) => a.rawScore - b.rawScore)
        };

        return grouped;
    }

    function formatFinalRating(value) {
        if (value >= 10) return "10.0";
        return formatMovieScore(value);
    }

    function renderColmanGravesResults(evaluation) {
        const { matrix, bonuses, movieScores, tags } = evaluation;
        const verdict = getGravesVerdict(matrix.rawAverage);
        evaluation.pairsByBand = findGravesPairsByBand(tags);

        document.getElementById('results-graves').classList.remove('hidden');
        ['graves-summary-row', 'graves-reading-panel', 'graves-breakdown-panel', 'graves-detail-row'].forEach(panelId => {
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

                const pairRows = pairs.map((pair, index) => `
                    <div id="graves-pair-${band}-${index + 1}" class="graves-pair-row">
                        <span class="graves-pair-names">
                            <span class="graves-pair-name">${pair.firstName}</span>
                            <span class="graves-pair-separator">&times;</span>
                            <span class="graves-pair-name">${pair.secondName}</span>
                        </span>
                        <span class="graves-pair-categories">${pair.firstCategory} &times; ${pair.secondCategory}</span>
                        <span class="graves-pair-score">${pair.rawScore.toFixed(2)}</span>
                    </div>
                `).join('');

                return `
                    <div class="graves-pairs-band graves-pairs-band-${band}">
                        <h4 class="graves-pairs-band-title">${BAND_LABELS[band]}</h4>
                        ${pairRows}
                    </div>
                `;
            }).join('');

            pairsContainer.innerHTML = bandMarkup || '<div class="empty-state">No pairs to display.</div>';
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
