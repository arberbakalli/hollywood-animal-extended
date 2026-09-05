(function(global) {
    "use strict";

    async function evaluateColmanGravesScript() {
        await ensureCompatibilityLoaded();
        clearFeedbackMessage('gravesFeedbackMessage');
        hideGravesBestMatches();

        const selectedTags = collectTagInputs('graves');
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

    function findGravesConflicts(tags) {
        const conflicts = [];

        for (let i = 0; i < tags.length; i++) {
            for (let j = i + 1; j < tags.length; j++) {
                const rawScore = getRawCompatibilityScore(tags[i], tags[j]);
                if (rawScore < 2.0) {
                    const firstName = GAME_DATA.tags[tags[i].id] ? GAME_DATA.tags[tags[i].id].name : tags[i].id;
                    const secondName = GAME_DATA.tags[tags[j].id] ? GAME_DATA.tags[tags[j].id].name : tags[j].id;
                    conflicts.push({ firstName, secondName, rawScore });
                }
            }
        }

        return conflicts.sort((a, b) => a.rawScore - b.rawScore);
    }

    function renderColmanGravesResults(evaluation) {
        const { matrix, movieScores } = evaluation;
        const verdict = getGravesVerdict(matrix.rawAverage);

        document.getElementById('results-graves').classList.remove('hidden');
        ['graves-summary-row', 'graves-reading-panel', 'graves-detail-row'].forEach(panelId => {
            const panel = document.getElementById(panelId);
            if (panel) panel.classList.remove('hidden');
        });

        const verdictEl = document.getElementById('gravesVerdictDisplay');
        verdictEl.textContent = verdict.label;
        setToneClass(verdictEl, verdict.tone);

        const averageEl = document.getElementById('gravesAverageDisplay');
        averageEl.innerHTML = `${matrix.rawAverage.toFixed(1)} <span class="sub-value">/ 5.0</span>`;
        setToneClass(averageEl, matrix.rawAverage >= 4.0 ? 'success' : (matrix.rawAverage < 3.0 ? 'danger' : 'accent'));

        const commercialEl = document.getElementById('gravesCommercialScoreDisplay');
        commercialEl.textContent = movieScores.commercial.toFixed(1);
        setToneClass(commercialEl, movieScores.commercial > 0 ? 'accent' : 'danger');

        const artisticEl = document.getElementById('gravesArtisticScoreDisplay');
        artisticEl.textContent = movieScores.artistic.toFixed(1);
        setToneClass(artisticEl, movieScores.artistic > 0 ? 'art' : 'danger');

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

        const conflictContainer = document.getElementById('gravesConflictDisplay');
        const conflicts = evaluation.conflicts;
        if (conflicts.length === 0) {
            conflictContainer.innerHTML = '<div class="empty-state">No severe Graves conflicts found.</div>';
        } else {
            conflictContainer.innerHTML = conflicts.map((conflict, index) => `
                <div id="graves-conflict-${index + 1}" class="spoiler-row graves-conflict-row">
                    ${conflict.firstName} clashes with ${conflict.secondName}
                    <span class="graves-raw-score">${conflict.rawScore.toFixed(1)}</span>
                </div>
            `).join('');
        }

        document.getElementById('results-graves').scrollIntoView({ behavior: 'smooth' });
    }

    global.HACGravesAudience = {
        evaluateColmanGravesScript,
        getGravesVerdict,
        calculateGravesAudience,
        findGravesConflicts,
        renderColmanGravesResults
    };
})(globalThis);
